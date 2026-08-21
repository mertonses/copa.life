import {DurableObject} from "cloudflare:workers";
import {
  ARENA_EMOTES,ARENA_RULES_VERSION,CHAIRMEN,DRAFT_SLOTS,LEGACY_DRAFT_LINES,FORMATIONS,LIVE_SEGMENTS,PENALTY_ZONES,PHASE_SECONDS,STYLES,TACTICS,TRAINING,
  allowsRegulationDraw,chooseMatchCandidate,createDraftOffers,createDraftPlan,createLegacyDraftOffers,createMarketOffers,divisionFor,hashSeed,initialPlayerState,minimumFutureDraftCost,publicState,
  resolveParticipation,
  normalizeMatchPlan,resolveLiveSegment,resolvePenalty,resolvePenaltyKick,resolveWindow,rewardFor,seasonKey,teamSnapshot,usesFullXI,validateSetup
} from "./rules.js";
import {ARENA_PLAYER_CATALOG_VERSION,ARENA_PLAYER_SOURCES} from "./playerCatalog.js";
import {botDecisionDelay,botWaitMs,createBotIdentity} from "./botIdentity.js";
import {TOURNAMENT_LIFETIME_MS,TOURNAMENT_LOBBY_MS,addTournamentParticipant,createTournamentState,roundPairs,tournamentPublicState,validTournamentSize} from "./tournament.js";
import {clubName} from "./namePolicy.js";

const MAX_BODY_BYTES=16*1024;
const ORIGINS=["https://copa.life","https://www.copa.life","https://localhost","http://localhost","capacitor://localhost"];
const METHODS="GET, POST, PUT, DELETE, OPTIONS";
const MODES=new Set(["ranked","practice"]);
const REGIONS=new Set(["weur","eeur","me","apac","global"]);
const ARENA_TOKEN=/^CAR-[A-Z0-9]{24,96}$/;
const CLIENT_ID=/^GCL-[A-Z0-9]{8,40}$/;
const TICKET=/^AT-[A-Z0-9]{32,80}$/;
const ROOM_ID=/^AR-[A-Z0-9]{16,40}$/;
const CUSTOM_CODE=/^[A-HJ-NP-Z2-9]{6}$/;
const TOURNAMENT_CODE=CUSTOM_CODE;
const ACTION_ID=/^AA-[A-Za-z0-9_-]{8,80}$/;
const ARENA_EVENTS=new Set(["arena_opened","arena_queue_joined","arena_matched","arena_phase_completed","arena_match_completed","arena_reconnected","arena_reconnect_started","arena_network_quality","arena_practice_started","arena_practice_completed","arena_tournament_created","arena_tournament_joined","arena_tournament_completed","arena_cosmetic_equipped","arena_system_opponent_shown","arena_error"]);
const COSMETIC_REWARDS=Object.freeze([
  {at:4,id:"arena_crest_foundry",type:"crest"},
  {at:8,id:"arena_kit_nocturne",type:"kit"},
  {at:12,id:"arena_frame_floodlights",type:"frame"},
  {at:18,id:"arena_stadium_night",type:"stadium"},
  {at:25,id:"arena_crest_crown",type:"crest"},
  {at:35,id:"arena_kit_aurora",type:"kit"},
  {at:48,id:"arena_frame_elite",type:"frame"},
  {at:65,id:"arena_stadium_final",type:"stadium"}
]);
const COSMETIC_TYPES=new Set(["kit","crest","frame","stadium"]);
const RECONNECT_GRACE_MS=20_000;
const RECONNECT_GRACE_CAP_MS=40_000;

const clean=(value,max=80)=>String(value==null?"":value).replace(/[<>\u0000-\u001f\u007f]/g,"").replace(/\s+/g," ").trim().slice(0,max);
const clamp=(value,min,max)=>Math.max(min,Math.min(max,Number(value)||0));
const allowedOrigins=env=>new Set(String(env.ALLOWED_ORIGINS||ORIGINS.join(",")).split(",").map(item=>item.trim()).filter(Boolean));
const localOrigin=origin=>/^(?:https?|capacitor):\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?$/.test(origin);
const originAllowed=(request,env)=>{const origin=request.headers.get("origin");return !origin||allowedOrigins(env).has(origin)||localOrigin(origin);};
const responseHeaders=(request,env)=>{
  const headers={"access-control-allow-methods":METHODS,"access-control-allow-headers":"content-type, x-copa-client, x-copa-arena-token","cache-control":"no-store","content-type":"application/json; charset=utf-8","vary":"origin","x-content-type-options":"nosniff"};
  const origin=request.headers.get("origin");if(origin&&(allowedOrigins(env).has(origin)||localOrigin(origin)))headers["access-control-allow-origin"]=origin;
  return headers;
};
const json=(request,env,body,status=200)=>new Response(JSON.stringify(body),{status,headers:responseHeaders(request,env)});
const randomId=(prefix,bytes=16)=>{const data=new Uint8Array(bytes);crypto.getRandomValues(data);return prefix+Array.from(data,value=>value.toString(16).padStart(2,"0")).join("").toUpperCase();};
const randomCustomCode=()=>{const alphabet="ABCDEFGHJKLMNPQRSTUVWXYZ23456789",data=new Uint8Array(6);crypto.getRandomValues(data);return Array.from(data,value=>alphabet[value%alphabet.length]).join("");};
const customMatchId=code=>`AR-CUSTOM${code}0000`;
const tournamentId=code=>`ATN-${code}`;
const nowIso=()=>new Date().toISOString();
const futureIso=ms=>new Date(Date.now()+ms).toISOString();
const jsonArray=value=>{try{const parsed=JSON.parse(value||"[]");return Array.isArray(parsed)?parsed:[];}catch(_){return[];}};
const jsonObject=value=>{try{const parsed=JSON.parse(value||"{}");return parsed&&typeof parsed==="object"&&!Array.isArray(parsed)?parsed:{};}catch(_){return{};}};
const tokenFrom=request=>{const token=String(request.headers.get("x-copa-arena-token")||"");return ARENA_TOKEN.test(token)?token:"";};
const clientFrom=request=>{const client=String(request.headers.get("x-copa-client")||"");return CLIENT_ID.test(client)?client:"";};
const timingSafe=(a,b)=>{
  const one=new TextEncoder().encode(String(a)),two=new TextEncoder().encode(String(b));if(one.length!==two.length)return false;
  return crypto.subtle.timingSafeEqual(one,two);
};
async function sha(value){
  const bytes=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(String(value)));
  return Array.from(new Uint8Array(bytes),item=>item.toString(16).padStart(2,"0")).join("");
}
async function identity(request,env){
  const token=tokenFrom(request),client=clientFrom(request);
  if(!token||!client)return null;
  const tokenHash=await sha("arena-auth:"+token);
  if(env&&env.DB){
    const session=await env.DB.prepare("SELECT owner_hash FROM arena_auth_sessions WHERE token_hash=? AND expires_at>?").bind(tokenHash,nowIso()).first();
    if(session&&session.owner_hash)return {owner:session.owner_hash,client:await sha("arena-client:"+client),authenticated:true};
  }
  return {owner:await sha("arena-owner:"+token),client:await sha("arena-client:"+client),authenticated:false};
}
async function body(request,limit=MAX_BODY_BYTES){
  const length=Number(request.headers.get("content-length")||0);if(length>limit)throw new Error("payload_too_large");
  if(!request.body)return JSON.parse("");
  const reader=request.body.getReader(),decoder=new TextDecoder();let size=0,text="";
  try{
    while(true){
      const {done,value}=await reader.read();if(done)break;
      size+=value.byteLength;
      if(size>limit){await reader.cancel("payload_too_large");throw new Error("payload_too_large");}
      text+=decoder.decode(value,{stream:true});
    }
    text+=decoder.decode();
  }finally{reader.releaseLock();}
  return JSON.parse(text);
}
function profile(row){
  if(!row)return null;
  const rating=Number(row.rating)||1000;
  return {
    publicId:row.public_id,
    clubName:row.club_name,
    rating,
    division:divisionFor(rating),
    seasonKey:row.season_key,
    seasonPoints:Number(row.season_points)||0,
    wins:Number(row.wins)||0,
    draws:Number(row.draws)||0,
    losses:Number(row.losses)||0,
    streak:Number(row.streak)||0,
    tokenProgress:Number(row.token_progress)||0,
    cosmetics:jsonArray(row.cosmetics),
    equippedCosmetics:jsonObject(row.equipped_cosmetics)
  };
}
async function ensureProfile(env,owner,name){
  const current=await env.DB.prepare("SELECT * FROM arena_profiles WHERE owner_hash=?").bind(owner).first();
  if(current){
    const currentSeason=seasonKey();
    if(current.season_key!==currentSeason){
      const resetRating=Math.round((Number(current.rating||1000)+1000)/2);
      await env.DB.prepare("UPDATE arena_profiles SET season_key=?,season_points=0,token_progress=0,rating=?,streak=0,updated_at=? WHERE owner_hash=?").bind(currentSeason,resetRating,nowIso(),owner).run();
      current.season_key=currentSeason;current.season_points=0;current.token_progress=0;current.rating=resetRating;current.streak=0;
    }
    if(name&&name!==current.club_name){await env.DB.prepare("UPDATE arena_profiles SET club_name=?,updated_at=? WHERE owner_hash=?").bind(name,nowIso(),owner).run();current.club_name=name;}
    return current;
  }
  const created=nowIso(),publicId=randomId("AC-",8),safeName=name||`Copa ${publicId.slice(-4)}`;
  await env.DB.prepare("INSERT INTO arena_profiles(owner_hash,public_id,club_name,rating,season_key,season_points,wins,draws,losses,streak,token_progress,cosmetics,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)")
    .bind(owner,publicId,safeName,1000,seasonKey(),0,0,0,0,0,0,"[]",created,created).run();
  return await env.DB.prepare("SELECT * FROM arena_profiles WHERE owner_hash=?").bind(owner).first();
}
async function consumeTicket(env,ticket){
  const hash=await sha("ticket:"+ticket),when=nowIso();
  const row=await env.DB.prepare("SELECT * FROM arena_tickets WHERE ticket_hash=? AND consumed_at IS NULL AND expires_at>?").bind(hash,when).first();
  if(!row)return null;
  const update=await env.DB.prepare("UPDATE arena_tickets SET consumed_at=? WHERE ticket_hash=? AND consumed_at IS NULL").bind(when,hash).run();
  return Number(update.meta&&update.meta.changes)===1?row:null;
}
async function recentOpponents(env,owner,limit=3){
  const rows=await env.DB.prepare(
    "SELECT home_owner,away_owner FROM arena_matches WHERE home_owner=? OR away_owner=? ORDER BY finished_at DESC LIMIT ?"
  ).bind(owner,owner,limit).all();
  return (rows.results||[]).map(row=>row.home_owner===owner?row.away_owner:row.home_owner).filter(Boolean);
}
async function rateLimit(env,request,name,limit=20){
  const binding=name==="session"?(env.ARENA_SESSION_LIMITER||env.ARENA_LIMITER):env.ARENA_LIMITER;if(!binding)return true;
  const id=await identity(request,env);const key=id?`${name}:${id.owner}`:`${name}:anonymous`;
  const outcome=await binding.limit({key});return !!outcome.success;
}
function metric(env,event,detail="",value=0){
  if(!env.ARENA_ANALYTICS)return;
  try{env.ARENA_ANALYTICS.writeDataPoint({blobs:[event,detail,ARENA_RULES_VERSION],doubles:[1,Number(value)||0]});}catch(_){}
}
function operational(env,event,detail,value=0,error=null){
  metric(env,event,detail,value);
  console.error(JSON.stringify({message:event,detail,value:Number(value)||0,rulesVersion:ARENA_RULES_VERSION,error:error?String(error):undefined,at:nowIso()}));
}
async function grantCosmetics(env,owner){
  const row=await env.DB.prepare("SELECT token_progress,cosmetics,season_key FROM arena_profiles WHERE owner_hash=?").bind(owner).first();
  if(!row)return [];
  const owned=new Set(jsonArray(row.cosmetics)),granted=[];
  for(const reward of COSMETIC_REWARDS){
    if(Number(row.token_progress)<reward.at||owned.has(reward.id))continue;
    owned.add(reward.id);granted.push(reward.id);
  }
  if(!granted.length)return [];
  const when=nowIso(),statements=[
    env.DB.prepare("UPDATE arena_profiles SET cosmetics=?,updated_at=? WHERE owner_hash=?").bind(JSON.stringify([...owned]),when,owner)
  ];
  for(const rewardId of granted)statements.push(env.DB.prepare("INSERT OR IGNORE INTO arena_cosmetic_unlocks(owner_hash,reward_id,season_key,unlocked_at) VALUES(?,?,?,?)").bind(owner,rewardId,row.season_key,when));
  await env.DB.batch(statements);return granted;
}

export class ArenaMatchmaker extends DurableObject{
  constructor(ctx,env){
    super(ctx,env);
    this.ctx.blockConcurrencyWhile(async()=>{
      this.ctx.storage.sql.exec("CREATE TABLE IF NOT EXISTS queue(owner TEXT PRIMARY KEY, socket_id TEXT NOT NULL, club_name TEXT NOT NULL, rating INTEGER NOT NULL, joined_at INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'queued');CREATE TABLE IF NOT EXISTS queue_recent(owner TEXT PRIMARY KEY,recent_json TEXT NOT NULL)");
    });
  }
  async fetch(request){
    if(request.headers.get("upgrade")!=="websocket")return new Response("Upgrade Required",{status:426});
    const owner=request.headers.get("x-arena-owner")||"";
    let club="";try{club=clean(decodeURIComponent(request.headers.get("x-arena-club")||""),29);}catch(_){}
    const rating=Math.round(clamp(request.headers.get("x-arena-rating"),700,1900));
    let recent=[];try{recent=JSON.parse(decodeURIComponent(request.headers.get("x-arena-recent")||"[]"));}catch(_){}
    recent=Array.isArray(recent)?recent.filter(item=>typeof item==="string").slice(0,3):[];
    if(!owner||!club)return new Response("Unauthorized",{status:401});
    const existing=this.ctx.getWebSockets(`owner:${owner}`);for(const socket of existing)try{socket.close(4001,"replaced");}catch(_){}
    const [client,server]=Object.values(new WebSocketPair()),socketId=randomId("S-",8),joinedAt=Date.now();
    server.serializeAttachment({owner,socketId,clubName:club,rating,joinedAt});
    this.ctx.acceptWebSocket(server,[`owner:${owner}`]);
    this.ctx.storage.sql.exec("INSERT OR REPLACE INTO queue(owner,socket_id,club_name,rating,joined_at,status) VALUES(?,?,?,?,?,'queued')",owner,socketId,club,rating,joinedAt);
    this.ctx.storage.sql.exec("INSERT OR REPLACE INTO queue_recent(owner,recent_json) VALUES(?,?)",owner,JSON.stringify(recent));
    server.send(JSON.stringify({type:"queued",joinedAt,rating}));
    await this.pair();
    await this.ctx.storage.setAlarm(Date.now()+10_000);
    return new Response(null,{status:101,webSocket:client});
  }
  sockets(){
    const map=new Map();
    for(const socket of this.ctx.getWebSockets()){
      const attachment=socket.deserializeAttachment();if(attachment&&attachment.socketId)map.set(attachment.socketId,socket);
    }
    return map;
  }
  async pair(){
    const rows=this.ctx.storage.sql.exec("SELECT * FROM queue WHERE status='queued' ORDER BY joined_at ASC").toArray();
    const sockets=this.sockets(),used=new Set();
    const recentByOwner=Object.fromEntries(this.ctx.storage.sql.exec("SELECT owner,recent_json FROM queue_recent").toArray().map(row=>{
      let recent=[];try{recent=JSON.parse(row.recent_json);}catch(_){}
      return [row.owner,Array.isArray(recent)?recent:[]];
    }));
    for(const home of rows){
      if(used.has(home.owner)||!sockets.has(home.socket_id))continue;
      const waited=Math.max(0,Date.now()-Number(home.joined_at));
      const range=100+Math.floor(waited/15_000)*75;
      const candidates=rows.filter(row=>row.owner!==home.owner&&!used.has(row.owner)&&sockets.has(row.socket_id)&&Math.abs(Number(row.rating)-Number(home.rating))<=range);
      const away=chooseMatchCandidate(home,candidates,recentByOwner);
      if(!away){
        if(waited>=botWaitMs(home.owner))await this.pairWithBot(home,sockets.get(home.socket_id));
        continue;
      }
      used.add(home.owner);used.add(away.owner);
      this.ctx.storage.sql.exec("UPDATE queue SET status='matching' WHERE owner IN (?,?)",home.owner,away.owner);
      const matchId=randomId("AR-",12),seed=randomId("",16);
      let committed=false;
      try{
        const room=this.env.ARENA_ROOM.getByName(matchId);
        const access=await room.init(matchId,[
          {owner:home.owner,clubName:home.club_name,rating:Number(home.rating)},
          {owner:away.owner,clubName:away.club_name,rating:Number(away.rating)}
        ],seed);
        await this.env.DB.batch([
          this.env.DB.prepare("UPDATE arena_presence SET status='match',match_id=?,expires_at=?,updated_at=? WHERE owner_hash=?").bind(matchId,futureIso(45*60_000),nowIso(),home.owner),
          this.env.DB.prepare("UPDATE arena_presence SET status='match',match_id=?,expires_at=?,updated_at=? WHERE owner_hash=?").bind(matchId,futureIso(45*60_000),nowIso(),away.owner)
        ]);
        this.ctx.storage.sql.exec("DELETE FROM queue WHERE owner IN (?,?)",home.owner,away.owner);
        this.ctx.storage.sql.exec("DELETE FROM queue_recent WHERE owner IN (?,?)",home.owner,away.owner);
        committed=true;
        for(const row of [home,away]){
          try{sockets.get(row.socket_id).send(JSON.stringify({type:"matched",matchId,roomToken:access[row.owner]}));}
          catch(error){operational(this.env,"arena_match_delivery_failed",matchId,1,error);}
        }
      }catch(error){
        if(!committed){
          this.ctx.storage.sql.exec("UPDATE queue SET status='queued' WHERE owner IN (?,?)",home.owner,away.owner);
          for(const row of [home,away])try{sockets.get(row.socket_id).send(JSON.stringify({type:"error",code:"match_creation_failed"}));}catch(_){}
        }
        console.error("arena_pair_failed",error);
      }
    }
  }
  async pairWithBot(home,socket){
    if(!socket)return false;
    const seed=randomId("",16),bot=createBotIdentity(`${home.owner}|${home.joined_at}|${seed}`,Number(home.rating));
    const matchId=randomId("AR-",12);
    this.ctx.storage.sql.exec("UPDATE queue SET status='matching' WHERE owner=?",home.owner);
    try{
      const room=this.env.ARENA_ROOM.getByName(matchId);
      const access=await room.init(matchId,[
        {owner:home.owner,clubName:home.club_name,rating:Number(home.rating)},
        {owner:bot.owner,clubName:bot.clubName,rating:bot.rating}
      ],seed,{mode:"ranked",botIndex:1,botProfile:bot.personality});
      await this.env.DB.prepare("UPDATE arena_presence SET status='match',match_id=?,expires_at=?,updated_at=? WHERE owner_hash=?")
        .bind(matchId,futureIso(45*60_000),nowIso(),home.owner).run();
      this.ctx.storage.sql.exec("DELETE FROM queue WHERE owner=?",home.owner);
      this.ctx.storage.sql.exec("DELETE FROM queue_recent WHERE owner=?",home.owner);
      socket.send(JSON.stringify({type:"matched",matchId,roomToken:access[home.owner]}));
      metric(this.env,"arena_bot_match","low_population",Math.round((Date.now()-Number(home.joined_at))/1000));
      return true;
    }catch(error){
      this.ctx.storage.sql.exec("UPDATE queue SET status='queued' WHERE owner=?",home.owner);
      try{socket.send(JSON.stringify({type:"error",code:"match_creation_failed"}));}catch(_){}
      console.error("arena_bot_pair_failed",error);return false;
    }
  }
  async alarm(){
    const sockets=this.sockets();
    const rows=this.ctx.storage.sql.exec("SELECT owner,socket_id FROM queue").toArray();
    for(const row of rows)if(!sockets.has(row.socket_id)){
      this.ctx.storage.sql.exec("DELETE FROM queue WHERE owner=?",row.owner);
      this.ctx.storage.sql.exec("DELETE FROM queue_recent WHERE owner=?",row.owner);
      await this.env.DB.prepare("DELETE FROM arena_presence WHERE owner_hash=? AND status='queue'").bind(row.owner).run();
    }
    await this.pair();
    if(this.ctx.storage.sql.exec("SELECT COUNT(*) AS count FROM queue").one().count>0)await this.ctx.storage.setAlarm(Date.now()+10_000);
  }
  async webSocketMessage(socket,message){
    const attachment=socket.deserializeAttachment();
    if(typeof message!=="string"||message.length>1024){socket.close(1009,"invalid");return;}
    let data;try{data=JSON.parse(message);}catch(_){socket.send(JSON.stringify({type:"error",code:"invalid_json"}));return;}
    if(data.type==="ping")socket.send(JSON.stringify({type:"pong",at:Date.now()}));
    if(data.type==="cancel"){
      this.ctx.storage.sql.exec("DELETE FROM queue WHERE owner=? AND socket_id=?",attachment.owner,attachment.socketId);
      this.ctx.storage.sql.exec("DELETE FROM queue_recent WHERE owner=?",attachment.owner);
      await this.env.DB.prepare("DELETE FROM arena_presence WHERE owner_hash=? AND status='queue'").bind(attachment.owner).run();
      socket.send(JSON.stringify({type:"cancelled"}));socket.close(1000,"cancelled");
    }
  }
  async webSocketClose(socket){
    const attachment=socket.deserializeAttachment();
    if(attachment){
      this.ctx.storage.sql.exec("DELETE FROM queue WHERE owner=? AND socket_id=?",attachment.owner,attachment.socketId);
      this.ctx.storage.sql.exec("DELETE FROM queue_recent WHERE owner=?",attachment.owner);
      await this.env.DB.prepare("DELETE FROM arena_presence WHERE owner_hash=? AND status='queue'").bind(attachment.owner).run();
    }
  }
}

export class ArenaTournament extends DurableObject{
  constructor(ctx,env){
    super(ctx,env);this.state=null;
    this.ctx.blockConcurrencyWhile(async()=>{
      this.ctx.storage.sql.exec("CREATE TABLE IF NOT EXISTS tournament_state(id INTEGER PRIMARY KEY CHECK(id=1),json TEXT NOT NULL,updated_at INTEGER NOT NULL)");
      const row=this.ctx.storage.sql.exec("SELECT json FROM tournament_state WHERE id=1").toArray()[0];
      if(row)this.state=JSON.parse(row.json);
    });
  }
  persist(){
    this.ctx.storage.sql.exec("INSERT INTO tournament_state(id,json,updated_at) VALUES(1,?,?) ON CONFLICT(id) DO UPDATE SET json=excluded.json,updated_at=excluded.updated_at",JSON.stringify(this.state),Date.now());
  }
  async init(code,size,host){
    if(!TOURNAMENT_CODE.test(code)||!validTournamentSize(size))return {ok:false,reason:"invalid_tournament"};
    if(this.state&&this.state.status!=="cancelled"&&Date.now()<Number(this.state.hardExpiresAt||0))return {ok:false,reason:"room_exists"};
    this.state=createTournamentState(code,size,host);this.persist();
    await this.ctx.storage.setAlarm(this.state.expiresAt);
    return {ok:true,tournament:tournamentPublicState(this.state,host.owner)};
  }
  async status(owner){
    if(!this.state)return {ok:false,reason:"room_not_found"};
    if(Date.now()>=Number(this.state.hardExpiresAt||0))return {ok:false,reason:"room_expired"};
    const tournament=tournamentPublicState(this.state,owner);
    return tournament?{ok:true,tournament}:{ok:false,reason:"not_participant"};
  }
  async join(player){
    if(!this.state)return {ok:false,reason:"room_not_found"};
    const existing=tournamentPublicState(this.state,player.owner);
    if(existing)return {ok:true,tournament:existing};
    const joined=addTournamentParticipant(this.state,player);
    if(!joined.ok)return joined;
    this.persist();
    if(joined.full)await this.startRound(this.state.participants.map(item=>item.owner));
    else await this.ctx.storage.setAlarm(this.state.expiresAt);
    return {ok:true,tournament:tournamentPublicState(this.state,player.owner)};
  }
  player(owner){return this.state&&this.state.participants.find(item=>item.owner===owner);}
  async startRound(owners){
    if(!this.state||this.state.advancing||this.state.status==="completed"||this.state.status==="cancelled")return;
    const pairs=roundPairs(owners),roundNumber=Number(this.state.round||0)+1;
    this.state.advancing=true;this.persist();
    try{
      const matches=[];
      for(let slot=0;slot<pairs.length;slot++){
        const pair=pairs[slot],players=pair.map(owner=>{
          const item=this.player(owner);return {owner:item.owner,clubName:item.clubName,rating:Number(item.rating)};
        });
        const matchId=randomId("AR-",12),room=this.env.ARENA_ROOM.getByName(matchId);
        const access=await room.init(matchId,players,randomId("",16),{mode:"tournament",tournament:{code:this.state.code,round:roundNumber,slot}});
        matches.push({matchId,status:"ready",players:pair,winnerOwner:null,score:null});
        for(const owner of pair)this.state.assignments[owner]={matchId,roomToken:access[owner],round:roundNumber,status:"ready"};
      }
      this.state.rounds.push({number:roundNumber,matches});
      this.state.round=roundNumber;this.state.status="running";this.state.advancing=false;this.state.expiresAt=this.state.hardExpiresAt;this.persist();
      const expiresAt=new Date(Number(this.state.hardExpiresAt)).toISOString(),updatedAt=nowIso();
      await this.env.DB.batch(owners.map(owner=>this.env.DB.prepare("INSERT OR REPLACE INTO arena_presence(owner_hash,status,match_id,expires_at,updated_at) VALUES(?,'match',?,?,?)").bind(owner,this.state.assignments[owner].matchId,expiresAt,updatedAt)));
      await this.ctx.storage.setAlarm(this.state.hardExpiresAt);
    }catch(error){
      this.state.advancing=false;this.persist();operational(this.env,"arena_tournament_round_failed",this.state.code,1,error);throw error;
    }
  }
  async reportResult(matchId,winnerOwner,score){
    if(!this.state||this.state.status!=="running")return {ok:false,reason:"tournament_inactive"};
    const round=this.state.rounds.find(item=>item.matches.some(match=>match.matchId===matchId));
    const match=round&&round.matches.find(item=>item.matchId===matchId);
    if(!match)return {ok:false,reason:"match_not_found"};
    if(match.status==="completed")return {ok:true,duplicate:true};
    if(!match.players.includes(winnerOwner))return {ok:false,reason:"invalid_winner"};
    const loserOwner=match.players.find(owner=>owner!==winnerOwner),loser=this.player(loserOwner);
    match.status="completed";match.winnerOwner=winnerOwner;match.score=Array.isArray(score)?score.map(Number):null;
    delete this.state.assignments[match.players[0]];delete this.state.assignments[match.players[1]];
    if(loser){loser.eliminated=true;loser.place=round.matches.length===1?2:round.matches.length*2;}
    this.persist();
    await this.env.DB.prepare("DELETE FROM arena_presence WHERE owner_hash=? AND match_id=?").bind(loserOwner,matchId).run();
    await this.env.DB.prepare("INSERT OR REPLACE INTO arena_presence(owner_hash,status,match_id,expires_at,updated_at) VALUES(?,'tournament',?,?,?)")
      .bind(winnerOwner,tournamentId(this.state.code),new Date(Number(this.state.hardExpiresAt)).toISOString(),nowIso()).run();
    if(round.matches.every(item=>item.status==="completed")){
      const winners=round.matches.map(item=>item.winnerOwner);
      if(winners.length===1){
        this.state.status="completed";this.state.champion=winners[0];const champion=this.player(winners[0]);if(champion)champion.place=1;
        this.state.expiresAt=Date.now()+30*60_000;this.persist();
        await this.env.DB.prepare("DELETE FROM arena_presence WHERE owner_hash=?").bind(winners[0]).run();
        metric(this.env,"arena_tournament_completed",String(this.state.size),1);
      }else await this.startRound(winners);
    }
    return {ok:true};
  }
  async cancel(owner){
    if(!this.state)return {ok:false,reason:"room_not_found"};
    if(this.state.hostOwner!==owner)return {ok:false,reason:"not_host"};
    if(this.state.status!=="waiting")return {ok:false,reason:"tournament_started"};
    this.state.status="cancelled";this.persist();await this.cleanupPresence();return {ok:true};
  }
  async cleanupPresence(){
    if(!this.state||!this.state.participants.length)return;
    await this.env.DB.batch(this.state.participants.map(item=>this.env.DB.prepare("DELETE FROM arena_presence WHERE owner_hash=?").bind(item.owner)));
  }
  async alarm(){
    if(!this.state||["completed","cancelled"].includes(this.state.status))return;
    const expired=this.state.status==="waiting"?Date.now()>=Number(this.state.expiresAt):Date.now()>=Number(this.state.hardExpiresAt);
    if(expired){this.state.status="cancelled";this.persist();await this.cleanupPresence();return;}
    await this.ctx.storage.setAlarm(this.state.status==="waiting"?this.state.expiresAt:this.state.hardExpiresAt);
  }
}

export class ArenaRoom extends DurableObject{
  constructor(ctx,env){
    super(ctx,env);
    this.state=null;
    this.ctx.blockConcurrencyWhile(async()=>{
      this.ctx.storage.sql.exec("CREATE TABLE IF NOT EXISTS room_state(id INTEGER PRIMARY KEY CHECK(id=1),json TEXT NOT NULL,updated_at INTEGER NOT NULL);CREATE TABLE IF NOT EXISTS accepted_actions(owner TEXT NOT NULL,action_id TEXT NOT NULL,created_at INTEGER NOT NULL,PRIMARY KEY(owner,action_id));CREATE TABLE IF NOT EXISTS custom_lobby(id INTEGER PRIMARY KEY CHECK(id=1),code TEXT NOT NULL,host_json TEXT NOT NULL,guest_json TEXT,status TEXT NOT NULL,expires_at INTEGER NOT NULL,updated_at INTEGER NOT NULL)");
      const row=this.ctx.storage.sql.exec("SELECT json FROM room_state WHERE id=1").toArray()[0];
      if(row)this.state=JSON.parse(row.json);
    });
  }
  persist(){
    this.ctx.storage.sql.exec("INSERT INTO room_state(id,json,updated_at) VALUES(1,?,?) ON CONFLICT(id) DO UPDATE SET json=excluded.json,updated_at=excluded.updated_at",JSON.stringify(this.state),Date.now());
  }
  async createCustom(matchId,code,host){
    if(this.state||!CUSTOM_CODE.test(code))return {ok:false,reason:"room_exists"};
    const current=this.ctx.storage.sql.exec("SELECT status,expires_at FROM custom_lobby WHERE id=1").toArray()[0];
    if(current&&Number(current.expires_at)>Date.now()&&current.status!=="cancelled")return {ok:false,reason:"room_exists"};
    const expiresAt=Date.now()+15*60_000;
    this.ctx.storage.sql.exec("INSERT INTO custom_lobby(id,code,host_json,guest_json,status,expires_at,updated_at) VALUES(1,?,?,NULL,'waiting',?,?) ON CONFLICT(id) DO UPDATE SET code=excluded.code,host_json=excluded.host_json,guest_json=NULL,status='waiting',expires_at=excluded.expires_at,updated_at=excluded.updated_at",code,JSON.stringify(host),expiresAt,Date.now());
    return {ok:true,matchId,code,status:"waiting",expiresAt:new Date(expiresAt).toISOString()};
  }
  async customStatus(owner){
    if(this.state){
      const roomToken=this.accessFor(owner);
      return roomToken?{ok:true,matchId:this.state.matchId,code:this.state.customCode,status:"matched",roomToken}:{ok:false,reason:"not_participant"};
    }
    const lobby=this.ctx.storage.sql.exec("SELECT * FROM custom_lobby WHERE id=1").toArray()[0];
    if(!lobby)return {ok:false,reason:"room_not_found"};
    const host=JSON.parse(lobby.host_json),guest=lobby.guest_json?JSON.parse(lobby.guest_json):null;
    if(host.owner!==owner&&(!guest||guest.owner!==owner))return {ok:false,reason:"not_participant"};
    if(Number(lobby.expires_at)<=Date.now())return {ok:false,reason:"room_expired"};
    return {ok:true,matchId:customMatchId(lobby.code),code:lobby.code,status:lobby.status,expiresAt:new Date(Number(lobby.expires_at)).toISOString()};
  }
  async joinCustom(matchId,code,guest){
    if(this.state){const roomToken=this.accessFor(guest.owner);return roomToken?{ok:true,matchId,code,status:"matched",roomToken}:{ok:false,reason:"room_full"};}
    const lobby=this.ctx.storage.sql.exec("SELECT * FROM custom_lobby WHERE id=1").toArray()[0];
    if(!lobby||lobby.code!==code)return {ok:false,reason:"room_not_found"};
    if(Number(lobby.expires_at)<=Date.now())return {ok:false,reason:"room_expired"};
    const host=JSON.parse(lobby.host_json);
    if(host.owner===guest.owner)return {ok:false,reason:"cannot_join_own_room"};
    if(lobby.status!=="waiting")return {ok:false,reason:"room_full"};
    const access=await this.init(matchId,[host,guest],randomId("",16),{mode:"custom"});
    this.state.customCode=code;this.persist();
    this.ctx.storage.sql.exec("UPDATE custom_lobby SET guest_json=?,status='matched',updated_at=? WHERE id=1",JSON.stringify(guest),Date.now());
    return {ok:true,matchId,code,status:"matched",roomToken:access[guest.owner]};
  }
  async cancelCustom(owner){
    if(this.state)return {ok:false,reason:"room_started"};
    const lobby=this.ctx.storage.sql.exec("SELECT host_json FROM custom_lobby WHERE id=1").toArray()[0];
    if(!lobby)return {ok:false,reason:"room_not_found"};
    const host=JSON.parse(lobby.host_json);if(host.owner!==owner)return {ok:false,reason:"not_host"};
    this.ctx.storage.sql.exec("DELETE FROM custom_lobby WHERE id=1");
    return {ok:true};
  }
  async init(matchId,players,seed,options={}){
    if(this.state){
      if(this.state.matchId!==matchId)throw new Error("room_already_initialized");
      return this.state.access;
    }
    const access=Object.fromEntries(players.map(player=>[player.owner,randomId("RT-",24)]));
    const draftPlan=createDraftPlan(seed,ARENA_RULES_VERSION,ARENA_PLAYER_CATALOG_VERSION);
    this.state={
      matchId,seed,access,rulesVersion:ARENA_RULES_VERSION,mode:["practice","custom","tournament"].includes(options.mode)?options.mode:"ranked",tournament:options.tournament||null,botIndex:Number.isInteger(options.botIndex)?Number(options.botIndex):-1,botProfile:options.botProfile||null,botDueAt:0,botRematchDueAt:0,phase:"lobby",deadline:Date.now()+PHASE_SECONDS.lobby*1000,
      players:players.map(initialPlayerState),draftStep:0,window:0,liveStage:"decision",matchMinute:0,windowResult:null,windowHistory:[],offers:null,score:[0,0],events:[],penalty:null,result:null,rematch:null,rematchUsed:!!options.rematchUsed,rematchOf:options.rematchOf||null,emotes:[null,null],emoteCooldowns:[0,0],emoteSequence:0,completed:false,resultRecorded:false,
      catalogVersion:ARENA_PLAYER_CATALOG_VERSION,playerSources:ARENA_PLAYER_SOURCES,draftPlan,
      participationPolicy:"meaningful-participation-v2",reconnectGraceUsed:[0,0],reconnectGraceUntil:[0,0],createdAt:Date.now()
    };
    if(this.state.botIndex>=0)this.state.players[this.state.botIndex].connected=true;
    this.scheduleBotDecision();this.persist();await this.armAlarm();
    return access;
  }
  accessFor(owner){
    if(!this.state||!Object.hasOwn(this.state.access,owner))return "";
    return this.state.access[owner];
  }
  async fetch(request){
    if(!this.state)return new Response("Not Found",{status:404});
    if(request.headers.get("upgrade")!=="websocket")return Response.json({phase:this.state.phase});
    const token=request.headers.get("x-arena-room-token")||"";
    const owner=Object.keys(this.state.access).find(key=>timingSafe(this.state.access[key],token))||"";
    if(!owner)return new Response("Unauthorized",{status:401});
    await this.recoverExpired();
    for(const socket of this.ctx.getWebSockets(`owner:${owner}`))try{socket.close(4001,"reconnected");}catch(_){}
    const [client,server]=Object.values(new WebSocketPair()),index=this.state.players.findIndex(player=>player.owner===owner);
    server.serializeAttachment({owner,index,connectedAt:Date.now(),messages:0,windowStartedAt:Date.now()});
    this.ctx.acceptWebSocket(server,[`owner:${owner}`]);
    this.state.players[index].connected=true;this.state.players[index].lastSeenAt=Date.now();
    if(Array.isArray(this.state.reconnectGraceUntil))this.state.reconnectGraceUntil[index]=0;
    this.persist();
    server.send(JSON.stringify({type:"state",state:publicState(this.state,owner)}));this.broadcastPresence();
    return new Response(null,{status:101,webSocket:client});
  }
  broadcastPresence(){this.broadcast();}
  broadcast(){
    for(const socket of this.ctx.getWebSockets()){
      const attachment=socket.deserializeAttachment();
      if(!attachment||!attachment.owner)continue;
      try{socket.send(JSON.stringify({type:"state",state:publicState(this.state,attachment.owner)}));}catch(_){}
    }
  }
  isCurrentRules(){
    return ["arena-rules-v4","arena-rules-v5","arena-rules-v6",ARENA_RULES_VERSION].includes(this.state.rulesVersion);
  }
  usesFullXI(){
    return usesFullXI(this.state.rulesVersion);
  }
  draftSlots(){
    return this.usesFullXI()?DRAFT_SLOTS:LEGACY_DRAFT_LINES.map(line=>({slot:line,line}));
  }
  draftOffers(line,step,side,slot){
    if(["arena-rules-v7","arena-rules-v8","arena-rules-v9","arena-rules-v10","arena-rules-v11"].includes(this.state.rulesVersion)&&this.state.draftPlan){
      return this.state.draftPlan[step][side].map(offer=>({...offer}));
    }
    return this.isCurrentRules()
      ?createDraftOffers(this.state.seed,line,step,side,slot,this.state.rulesVersion)
      :createLegacyDraftOffers(this.state.seed,line,step,side,slot);
  }
  draftChoiceBudget(player,side){
    if(this.state.rulesVersion!==ARENA_RULES_VERSION)return this.remainingBudget(player);
    return this.remainingBudget(player)-minimumFutureDraftCost(
      this.state.seed,side,this.state.draftStep,this.state.rulesVersion,this.state.draftPlan
    );
  }
  draftRoundOffers(step){
    const slot=this.draftSlots()[step];
    return this.state.players.map((player,side)=>{
      const choiceBudget=this.remainingBudget(player)-minimumFutureDraftCost(
        this.state.seed,side,step,this.state.rulesVersion,this.state.draftPlan
      );
      return this.draftOffers(slot.line,step,side,slot.slot).map(offer=>({
        ...offer,affordable:offer.cost<=choiceBudget
      }));
    });
  }
  marketRoundOffers(){
    return this.state.players.map((player,side)=>createMarketOffers(this.state.seed,side).map(offer=>{
      const preview=teamSnapshot({...player,market:{id:offer.id}},this.state.rulesVersion);
      return {...offer,affordable:offer.cost<=this.remainingBudget(player),projected:preview?{
        power:preview.power,chemistry:preview.chemistry,budget:preview.budget
      }:null};
    }));
  }
  defaultAction(index){
    const player=this.state.players[index];
    if(this.state.phase==="lobby")player.ready=true;
    else if(this.state.phase==="setup")player.setup={formation:"4-4-2",style:"balanced",chairman:"babacan"};
    else if(this.state.phase==="draft"){
      const offers=this.state.offers[index],affordable=offers.filter(item=>item.cost<=this.draftChoiceBudget(player,index));
      const choice=affordable.sort((a,b)=>
        (b.power+b.chemistry*1.5-b.cost)-(a.power+a.chemistry*1.5-a.cost)
      )[0];
      if(!choice)throw new Error("arena_draft_budget_invariant");
      player.draft.push(choice);
    }else if(this.state.phase==="market")player.market={id:"none"};
    else if(this.state.phase==="training")player.training={focus:"recovery",scenario:"adaptive"};
    else if(this.state.phase==="live"&&(this.state.liveStage||"decision")==="decision")player.tactics.push("balanced");
    else if(this.state.phase==="penalty"&&this.state.penalty&&this.state.penalty.stage==="choice"&&!this.state.penalty.choices[index]){
      this.state.penalty.choices[index]=PENALTY_ZONES[hashSeed(`${this.state.seed}|penalty-default|${this.state.penalty.kick}|${index}`)%PENALTY_ZONES.length];
    }
  }
  botRoll(label){
    return (hashSeed(`${this.state.seed}|bot|${this.state.botProfile&&this.state.botProfile.seed||this.state.botIndex}|${label}`)%10_000)/10_000;
  }
  botPick(items,label,score){
    if(!items.length)return null;
    return [...items].map((item,index)=>({item,value:Number(score(item,index))||0,jitter:this.botRoll(`${label}|${item.id||item}|${index}`)}))
      .sort((a,b)=>(b.value+b.jitter*4)-(a.value+a.jitter*4))[0].item;
  }
  botAction(index){
    const player=this.state.players[index],profile=this.state.botProfile||{risk:.5,thrift:.5,flair:.5,press:.5,patience:.5};
    if(this.state.phase==="lobby")player.ready=true;
    else if(this.state.phase==="setup"){
      const formations=Object.keys(FORMATIONS),styles=Object.keys(STYLES);
      player.setup={
        formation:formations[Math.floor(this.botRoll("formation")*formations.length)%formations.length],
        style:styles[Math.floor(this.botRoll("style")*styles.length)%styles.length],
        chairman:"babacan"
      };
    }else if(this.state.phase==="draft"){
      const offers=this.state.offers[index]||[],affordable=offers.filter(item=>item.cost<=this.draftChoiceBudget(player,index));
      const choice=this.botPick(affordable,`draft-${this.state.draftStep}`,item=>
        item.power*0.72+item.chemistry*(1.2+profile.flair)+Math.max(0,this.remainingBudget(player)-item.cost)*profile.thrift*.22-item.cost*(.18+profile.thrift*.28)
      );
      if(!choice)throw new Error("arena_bot_draft_budget_invariant");
      player.draft.push(choice);
    }else if(this.state.phase==="market"){
      const offers=(this.state.offers[index]||[]).filter(item=>item.cost<=this.remainingBudget(player));
      const choice=this.botPick(offers,`market-${this.state.draftStep}`,item=>{
        const preview=teamSnapshot({...player,market:{id:item.id}},this.state.rulesVersion);
        return (preview&&preview.power||0)*(1-profile.thrift*.28)+(preview&&preview.chemistry||0)*profile.flair-item.cost*profile.thrift*1.8;
      });
      player.market={id:choice&&choice.id||"none"};
    }else if(this.state.phase==="training"){
      const focuses=["finishing","shape","chemistry","recovery"],scenarios=["adaptive","protect","brave"];
      const focus=profile.risk>.72?"finishing":profile.flair>.68?"chemistry":profile.patience>.64?"shape":focuses[Math.floor(this.botRoll("focus")*focuses.length)];
      const scenario=profile.risk>.66?"brave":profile.patience>.7?"protect":scenarios[Math.floor(this.botRoll("scenario")*scenarios.length)];
      player.training={focus,scenario};
    }else if(this.state.phase==="live"&&(this.state.liveStage||"decision")==="decision"){
      const margin=this.state.score[index]-this.state.score[index===0?1:0];
      const weights=margin<0?["press","control","balanced","counter"]:margin>0?["counter","balanced","control","press"]:["balanced","press","counter","control"];
      const offset=Math.floor(this.botRoll(`tactic-${this.state.window}`)*weights.length);
      player.tactics.push(weights[(offset+Math.round(profile.risk*2))%weights.length]);
    }else if(this.state.phase==="penalty"&&this.state.penalty&&this.state.penalty.stage==="choice"&&!this.state.penalty.choices[index]){
      const zones=[...PENALTY_ZONES],choice=zones[Math.floor(this.botRoll(`penalty-${this.state.penalty.kick}`)*zones.length)%zones.length];
      this.state.penalty.choices[index]=choice;
    }
    player.manualDecisions=(Number(player.manualDecisions)||0)+1;
    if(this.state.phase==="live")player.manualTactics=(Number(player.manualTactics)||0)+1;
    this.state.botDueAt=0;
  }
  botPending(){
    const index=this.state.botIndex;if(index<0)return false;
    const player=this.state.players[index];
    return (this.state.phase==="lobby"&&!player.ready)||
      (this.state.phase==="setup"&&!player.setup)||
      (this.state.phase==="draft"&&player.draft.length<=this.state.draftStep)||
      (this.state.phase==="market"&&!player.market)||
      (this.state.phase==="training"&&!player.training)||
      (this.state.phase==="live"&&(this.state.liveStage||"decision")==="decision"&&player.tactics.length<=this.state.window)||
      (this.state.phase==="penalty"&&this.state.penalty&&this.state.penalty.stage==="choice"&&!this.state.penalty.choices[index]);
  }
  scheduleBotDecision(){
    if(!this.botPending()){this.state.botDueAt=0;return;}
    const step=this.state.phase==="draft"?this.state.draftStep:this.state.phase==="live"?this.state.window:this.state.penalty&&this.state.penalty.kick||0;
    this.state.botDueAt=Date.now()+botDecisionDelay(this.state.seed,this.state.phase,step);
  }
  armAlarm(){
    const candidates=[Number(this.state.deadline)||0,Number(this.state.botDueAt)||0,Number(this.state.botRematchDueAt)||0,...(this.state.reconnectGraceUntil||[])].filter(value=>value>Date.now());
    return this.ctx.storage.setAlarm(candidates.length?Math.min(...candidates):Date.now()+1000);
  }
  remainingBudget(player){
    const chair=CHAIRMEN[player.setup&&player.setup.chairman]||CHAIRMEN.babacan;
    return (this.usesFullXI()?44:20)+chair.budget-player.draft.reduce((sum,item)=>sum+Number(item.cost||0),0);
  }
  bothDone(){
    const [home,away]=this.state.players;
    if(this.state.phase==="lobby")return home.ready&&away.ready;
    if(this.state.phase==="setup")return !!home.setup&&!!away.setup;
    if(this.state.phase==="draft")return home.draft.length>this.state.draftStep&&away.draft.length>this.state.draftStep;
    if(this.state.phase==="market")return !!home.market&&!!away.market;
    if(this.state.phase==="training")return !!home.training&&!!away.training;
    if(this.state.phase==="live")return (this.state.liveStage||"decision")==="decision"&&home.tactics.length>this.state.window&&away.tactics.length>this.state.window;
    if(this.state.phase==="penalty")return this.state.penalty&&this.state.penalty.stage==="choice"&&this.state.penalty.choices.every(Boolean);
    return false;
  }
  setDeadline(){
    const seconds=this.state.phase==="live"&&this.state.liveStage==="reveal"
      ?PHASE_SECONDS.liveReveal
      :this.state.phase==="penalty"&&this.state.penalty&&this.state.penalty.stage==="reveal"
      ?PHASE_SECONDS.penaltyReveal
      :(PHASE_SECONDS[this.state.phase]||30);
    this.state.deadline=Date.now()+seconds*1000;
  }
  async advance(){
    if(!this.bothDone())return;
    if(this.state.phase==="lobby")this.state.phase="setup";
    else if(this.state.phase==="setup"){
      this.state.phase="draft";this.state.draftStep=0;
      this.state.offers=this.draftRoundOffers(0);
    }else if(this.state.phase==="draft"){
      const slots=this.draftSlots();
      if(this.state.draftStep<slots.length-1){
        this.state.draftStep++;
        this.state.offers=this.draftRoundOffers(this.state.draftStep);
      }else{
        this.state.phase="market";
        this.state.offers=this.marketRoundOffers();
      }
    }else if(this.state.phase==="market"){this.state.phase="training";this.state.offers=null;}
    else if(this.state.phase==="training"){
      this.state.phase="live";this.state.window=0;this.state.liveStage="decision";this.state.matchMinute=0;this.state.windowResult=null;this.state.windowHistory=[];this.state.offers=null;
    }
    else if(this.state.phase==="live"){
      const home=teamSnapshot(this.state.players[0],this.state.rulesVersion),away=teamSnapshot(this.state.players[1],this.state.rulesVersion);
      const outcome=this.state.rulesVersion===ARENA_RULES_VERSION
        ?resolveLiveSegment({seed:this.state.seed,segment:this.state.window,score:this.state.score,home,away,homeTactic:this.state.players[0].tactics[this.state.window],awayTactic:this.state.players[1].tactics[this.state.window]})
        :resolveWindow({seed:this.state.seed,window:this.state.window,home,away,homeTactic:this.state.players[0].tactics[this.state.window],awayTactic:this.state.players[1].tactics[this.state.window]});
      this.state.score[0]+=outcome.homeGoals;this.state.score[1]+=outcome.awayGoals;
      this.state.events.push(...outcome.events);
      if(!Array.isArray(this.state.windowHistory))this.state.windowHistory=[];
      this.state.windowHistory.push({...outcome,scoreAfter:[...this.state.score]});
      this.state.liveStage="reveal";this.state.matchMinute=outcome.endMinute;this.state.windowResult=outcome;
    }else if(this.state.phase==="penalty"){
      const penalty=this.state.penalty,shooter=penalty.turn,keeper=shooter===0?1:0;
      const teams=this.state.players.map(player=>teamSnapshot(player,this.state.rulesVersion));
      const result=resolvePenaltyKick({
        seed:this.state.seed,kick:penalty.kick,
        shooterZone:penalty.choices[shooter],keeperZone:penalty.choices[keeper],
        shooterPower:teams[shooter].attack+(teams[shooter].card==="captain"?2:0),
        keeperPower:teams[keeper].defense+(teams[keeper].card==="captain"?2:0)
      });
      penalty.kicks[shooter]++;
      if(result.goal)penalty.score[shooter]++;
      penalty.history.push({...result,kick:penalty.kick,round:penalty.round,shooter});
      penalty.stage="reveal";
    }
    this.setDeadline();this.scheduleBotDecision();this.persist();await this.armAlarm();this.broadcast();
  }
  startPenalties(){
    const firstShooter=hashSeed(`${this.state.seed}|penalty-first`)%2;
    this.state.phase="penalty";
    this.state.penalty={stage:"choice",kick:0,round:1,turn:firstShooter,firstShooter,score:[0,0],kicks:[0,0],choices:[null,null],history:[],suddenDeath:false};
    this.setDeadline();this.scheduleBotDecision();this.persist();
    return this.armAlarm().then(()=>this.broadcast());
  }
  penaltyComplete(){
    const penalty=this.state.penalty,[homeKicks,awayKicks]=penalty.kicks,[home,away]=penalty.score;
    const homeRemaining=Math.max(0,5-homeKicks),awayRemaining=Math.max(0,5-awayKicks);
    if(home>away+awayRemaining||away>home+homeRemaining)return true;
    return homeKicks>=5&&awayKicks>=5&&homeKicks===awayKicks&&home!==away;
  }
  async finish(home,away,penaltyOverride=null){
    let penalty=penaltyOverride;
    if(!penalty&&this.state.score[0]===this.state.score[1]&&!allowsRegulationDraw(this.state.rulesVersion)&&this.state.rulesVersion!==ARENA_RULES_VERSION){
      penalty=resolvePenalty(this.state.seed,home.power,away.power);
    }
    const homeWon=penalty?penalty[0]>penalty[1]:this.state.score[0]>this.state.score[1];
    const draw=!penalty&&this.state.score[0]===this.state.score[1];
    const simulatedOutcomes=draw?["draw","draw"]:(homeWon?["win","loss"]:["loss","win"]);
    const forcedForfeitIndex=this.state.players.findIndex(player=>player.forcedForfeit);
    const participation=this.state.forcedVoid
      ?{eligible:[false,false],outcomes:["draw","draw"],forfeitIndex:null,voided:true}
      :forcedForfeitIndex>=0
      ?{
        eligible:this.state.players.map((_,index)=>index!==forcedForfeitIndex),
        outcomes:forcedForfeitIndex===0?["loss","win"]:["win","loss"],
        forfeitIndex:forcedForfeitIndex,
        voided:false
      }
      :this.state.mode==="practice"
      ?{eligible:[true,true],outcomes:simulatedOutcomes,forfeitIndex:null,voided:false}
      :this.state.participationPolicy
      ?resolveParticipation(this.state.players,simulatedOutcomes,this.state.participationPolicy)
      :{eligible:[true,true],outcomes:simulatedOutcomes,forfeitIndex:null,voided:false};
    const outcomes=participation.outcomes;
    if(participation.voided){this.state.score=[0,0];penalty=null;}
    else if(participation.forfeitIndex!==null){
      this.state.score=participation.forfeitIndex===0?[0,3]:[3,0];
      penalty=null;
    }
    this.state.phase="result";this.state.completed=true;
    this.state.result={
      score:this.state.score,penalty,outcomes,teams:[home,away],
      regulationDraw:!!penalty&&this.state.score[0]===this.state.score[1],
      participation:participation.eligible,forfeitIndex:participation.forfeitIndex,voided:participation.voided,
      forfeitReason:participation.forfeitIndex===null?null:this.state.players[participation.forfeitIndex].forfeitReason||"participation",
      practiceExit:!!this.state.practiceExit,
      rulesVersion:this.state.rulesVersion,catalogVersion:this.state.catalogVersion||null,playerSources:this.state.playerSources||null,
      finishedAt:Date.now()
    };
    this.state.rematch={
      available:this.state.mode==="ranked"&&!this.state.rematchUsed&&!participation.voided&&participation.forfeitIndex===null,
      requests:[false,false],
      launched:false
    };
    this.state.deadline=Date.now()+PHASE_SECONDS.result*1000;this.persist();
    const recorded=await this.recordResult(outcomes);
    if(!recorded)this.state.deadline=Date.now()+10_000;
    await this.ctx.storage.setAlarm(this.state.deadline);this.broadcast();
  }
  async recordResult(outcomes){
    const match=this.state,created=nowIso(),season=seasonKey();
    if(match.mode==="tournament"){
      try{
        const current=await Promise.all(match.players.map(player=>ensureProfile(this.env,player.owner,"")));
        match.result.profiles=current.map(profile);
        match.result.rewards=match.players.map(player=>({ratingBefore:Number(player.rating)||1000,ratingDelta:0,seasonPoints:0,tokenProgress:0}));
        let winnerIndex=outcomes.findIndex(outcome=>outcome==="win");
        if(winnerIndex<0){winnerIndex=hashSeed(`${match.seed}|tournament-tiebreak`)%2;match.result.tournamentTiebreak=true;}
        const tournament=this.env.ARENA_TOURNAMENT.getByName(tournamentId(match.tournament.code));
        const reported=await tournament.reportResult(match.matchId,match.players[winnerIndex].owner,match.score);
        if(!reported.ok&&!reported.duplicate)throw new Error(reported.reason||"tournament_report_failed");
        this.state.resultRecorded=true;this.persist();metric(this.env,"arena_tournament_match_completed",String(match.tournament.round),1);return true;
      }catch(error){operational(this.env,"arena_tournament_finalize_failed",match.matchId,1,error);return false;}
    }
    if(match.mode==="custom"){
      try{
        const current=await Promise.all(match.players.map(player=>ensureProfile(this.env,player.owner,"")));
        match.result.profiles=current.map(profile);
        match.result.rewards=match.players.map(player=>({ratingBefore:Number(player.rating)||1000,ratingDelta:0,seasonPoints:0,tokenProgress:0}));
        await this.env.DB.prepare("DELETE FROM arena_presence WHERE owner_hash IN (?,?) AND match_id=?").bind(match.players[0].owner,match.players[1].owner,match.matchId).run();
        this.state.resultRecorded=true;this.persist();metric(this.env,"custom_room_completed",outcomes.join("-"),match.score[0]+match.score[1]);return true;
      }catch(error){operational(this.env,"arena_custom_finalize_failed",match.matchId,1,error);return false;}
    }
    if(match.mode==="practice"){
      try{
        const humanIndex=match.botIndex===0?1:0,human=match.players[humanIndex];
        const current=profile(await ensureProfile(this.env,human.owner,""));
        match.result.profiles=match.players.map((player,index)=>index===humanIndex?current:{clubName:player.clubName,rating:player.rating,division:divisionFor(player.rating)});
        match.result.rewards=match.players.map(player=>({ratingBefore:Number(player.rating)||1000,ratingDelta:0,seasonPoints:0,tokenProgress:0}));
        await this.env.DB.prepare("DELETE FROM arena_presence WHERE owner_hash=? AND match_id=?").bind(human.owner,match.matchId).run();
        this.state.resultRecorded=true;this.persist();metric(this.env,"practice_completed",outcomes[humanIndex],match.score[0]+match.score[1]);return true;
      }catch(error){operational(this.env,"arena_practice_finalize_failed",match.matchId,1,error);return false;}
    }
    if(match.botIndex>=0)return this.recordRankedBotResult(outcomes,created,season);
    const existing=await this.env.DB.prepare("SELECT match_id FROM arena_matches WHERE match_id=?").bind(match.matchId).first();
    if(existing){
      return this.finalizeRecordedResult(outcomes,false);
    }
    const currentProfiles=await Promise.all(match.players.map(player=>ensureProfile(this.env,player.owner,"")));
    const rulesVersion=match.rulesVersion||(match.participationPolicy?ARENA_RULES_VERSION:"arena-rules-v1");
    const statements=[
      this.env.DB.prepare("INSERT OR IGNORE INTO arena_matches(match_id,rules_version,catalog_version,source_provenance_json,season_key,home_owner,away_owner,home_score,away_score,result_json,created_at,finished_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)")
        .bind(match.matchId,rulesVersion,match.catalogVersion||null,JSON.stringify(match.playerSources||null),season,match.players[0].owner,match.players[1].owner,match.score[0],match.score[1],JSON.stringify(match.result),new Date(match.createdAt).toISOString(),created)
    ];
    for(let index=0;index<2&&!match.result.voided;index++){
      const player=match.players[index],rating=Number(currentProfiles[index].rating),opponentRating=Number(currentProfiles[index===0?1:0].rating),reward=rewardFor(outcomes[index],rating,opponentRating);
      const settlementToken=randomId("AS-",16);
      if(match.result.forfeitIndex===index){reward.seasonPoints=0;reward.tokenProgress=0;}
      statements.push(this.env.DB.prepare("INSERT OR IGNORE INTO arena_match_players(match_id,owner_hash,outcome,rating_before,rating_delta,season_points,token_progress,created_at,settlement_token) VALUES(?,?,?,?,?,?,?,?,?)")
        .bind(match.matchId,player.owner,outcomes[index],rating,reward.ratingDelta,reward.seasonPoints,reward.tokenProgress,created,settlementToken));
      const win=outcomes[index]==="win"?1:0,draw=outcomes[index]==="draw"?1:0,loss=outcomes[index]==="loss"?1:0,streak=win?1:0;
      statements.push(this.env.DB.prepare("UPDATE arena_profiles SET rating=MAX(700,MIN(1900,rating+?)),season_key=?,season_points=season_points+?,wins=wins+?,draws=draws+?,losses=losses+?,streak=CASE WHEN ?=1 THEN MAX(1,streak+1) ELSE 0 END,token_progress=token_progress+?,updated_at=? WHERE owner_hash=? AND EXISTS (SELECT 1 FROM arena_match_players WHERE match_id=? AND owner_hash=? AND settlement_token=?)")
        .bind(reward.ratingDelta,season,reward.seasonPoints,win,draw,loss,streak,reward.tokenProgress,created,player.owner,match.matchId,player.owner,settlementToken));
    }
    try{
      await this.env.DB.batch(statements);
      return this.finalizeRecordedResult(outcomes,true);
    }catch(error){operational(this.env,"arena_result_write_failed",match.matchId,1,error);return false;}
  }
  async recordRankedBotResult(outcomes,created,season){
    const match=this.state,botIndex=match.botIndex,humanIndex=botIndex===0?1:0;
    const human=match.players[humanIndex],bot=match.players[botIndex];
    try{
      const current=await ensureProfile(this.env,human.owner,""),rating=Number(current.rating),reward=rewardFor(outcomes[humanIndex],rating,Number(bot.rating));
      const settlementToken=randomId("AS-",16),rulesVersion=match.rulesVersion||ARENA_RULES_VERSION;
      if(match.result.forfeitIndex===humanIndex){reward.seasonPoints=0;reward.tokenProgress=0;}
      const statements=[
        this.env.DB.prepare("INSERT OR IGNORE INTO arena_matches(match_id,rules_version,catalog_version,source_provenance_json,season_key,home_owner,away_owner,home_score,away_score,result_json,created_at,finished_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)")
          .bind(match.matchId,rulesVersion,match.catalogVersion||null,JSON.stringify(match.playerSources||null),season,match.players[0].owner,match.players[1].owner,match.score[0],match.score[1],JSON.stringify(match.result),new Date(match.createdAt).toISOString(),created)
      ];
      if(!match.result.voided){
        statements.push(this.env.DB.prepare("INSERT OR IGNORE INTO arena_match_players(match_id,owner_hash,outcome,rating_before,rating_delta,season_points,token_progress,created_at,settlement_token) VALUES(?,?,?,?,?,?,?,?,?)")
          .bind(match.matchId,human.owner,outcomes[humanIndex],rating,reward.ratingDelta,reward.seasonPoints,reward.tokenProgress,created,settlementToken));
        const win=outcomes[humanIndex]==="win"?1:0,draw=outcomes[humanIndex]==="draw"?1:0,loss=outcomes[humanIndex]==="loss"?1:0;
        statements.push(this.env.DB.prepare("UPDATE arena_profiles SET rating=MAX(700,MIN(1900,rating+?)),season_key=?,season_points=season_points+?,wins=wins+?,draws=draws+?,losses=losses+?,streak=CASE WHEN ?=1 THEN MAX(1,streak+1) ELSE 0 END,token_progress=token_progress+?,updated_at=? WHERE owner_hash=? AND EXISTS (SELECT 1 FROM arena_match_players WHERE match_id=? AND owner_hash=? AND settlement_token=?)")
          .bind(reward.ratingDelta,season,reward.seasonPoints,win,draw,loss,win,reward.tokenProgress,created,human.owner,match.matchId,human.owner,settlementToken));
      }
      await this.env.DB.batch(statements);
      await grantCosmetics(this.env,human.owner);
      await this.env.DB.prepare("DELETE FROM arena_presence WHERE owner_hash=? AND match_id=?").bind(human.owner,match.matchId).run();
      const settled=profile(await ensureProfile(this.env,human.owner,""));
      const botProfile={clubName:bot.clubName,rating:bot.rating,division:divisionFor(bot.rating),seasonPoints:0,wins:0,draws:0,losses:0,tokenProgress:0,cosmetics:[]};
      match.result.profiles=match.players.map((_,index)=>index===humanIndex?settled:botProfile);
      match.result.rewards=match.players.map((_,index)=>index===humanIndex?{ratingBefore:rating,...reward}:{ratingBefore:Number(bot.rating),ratingDelta:0,seasonPoints:0,tokenProgress:0});
      match.resultRecorded=true;this.persist();metric(this.env,"match_completed_bot",outcomes[humanIndex],match.score[0]+match.score[1]);return true;
    }catch(error){operational(this.env,"arena_bot_result_write_failed",match.matchId,1,error);return false;}
  }
  async finalizeRecordedResult(outcomes,writeMetric){
    const match=this.state;
    try{
      for(const player of match.players)await grantCosmetics(this.env,player.owner);
      await this.env.DB.prepare("DELETE FROM arena_presence WHERE owner_hash IN (?,?) AND match_id=?").bind(match.players[0].owner,match.players[1].owner,match.matchId).run();
      await this.attachResultProfiles();
      this.state.resultRecorded=true;this.persist();
      if(writeMetric)metric(this.env,"match_completed",match.result.voided?"void":outcomes.join("-"),match.score[0]+match.score[1]);
      return true;
    }catch(error){operational(this.env,"arena_result_finalize_failed",match.matchId,1,error);return false;}
  }
  async attachResultProfiles(){
    const profiles=await Promise.all(this.state.players.map(player=>ensureProfile(this.env,player.owner,"")));
    const rows=await this.env.DB.prepare("SELECT owner_hash,rating_before,rating_delta,season_points,token_progress FROM arena_match_players WHERE match_id=?").bind(this.state.matchId).all();
    const rewards=new Map((rows.results||[]).map(row=>[row.owner_hash,{
      ratingBefore:Number(row.rating_before),ratingDelta:Number(row.rating_delta),
      seasonPoints:Number(row.season_points),tokenProgress:Number(row.token_progress)
    }]));
    this.state.result.profiles=profiles.map(profile);
    this.state.result.rewards=this.state.players.map(player=>rewards.get(player.owner)||{ratingBefore:Number(profiles[this.state.players.indexOf(player)].rating),ratingDelta:0,seasonPoints:0,tokenProgress:0});
  }
  acceptAction(owner,actionId){
    if(!ACTION_ID.test(String(actionId||"")))return false;
    const existing=this.ctx.storage.sql.exec("SELECT 1 AS present FROM accepted_actions WHERE owner=? AND action_id=? LIMIT 1",owner,actionId).toArray()[0];
    if(existing)return false;
    this.ctx.storage.sql.exec("INSERT OR IGNORE INTO accepted_actions(owner,action_id,created_at) VALUES(?,?,?)",owner,actionId,Date.now());
    return true;
  }
  async action(owner,data){
    const index=this.state.players.findIndex(player=>player.owner===owner);if(index<0)return "unauthorized";
    const player=this.state.players[index];
    if(data.type==="rematch"&&this.state.phase==="result"){
      if(!this.state.resultRecorded||!this.state.rematch||!this.state.rematch.available||this.state.rematch.launched)return "rematch_unavailable";
      if(this.state.rematch.requests[index])return "already_submitted";
      this.state.rematch.requests[index]=true;this.persist();this.broadcast();
      if(this.state.botIndex>=0&&index!==this.state.botIndex&&!this.state.rematch.requests[this.state.botIndex]){
        this.state.botRematchDueAt=Date.now()+botDecisionDelay(this.state.seed,"result",1);this.persist();await this.armAlarm();
      }else if(this.state.rematch.requests.every(Boolean))await this.startRematch();
      return "ok";
    }
    if(data.type==="forfeit"){
      if(this.state.phase==="result")return "forfeit_unavailable";
      if(this.state.mode==="practice"){
        this.state.practiceExit=true;
        this.state.forcedVoid=true;
        const teams=this.state.players.map(candidate=>teamSnapshot(candidate,this.state.rulesVersion));
        await this.finish(teams[0],teams[1]);
        return "ok";
      }
      if(!["ranked","custom","tournament"].includes(this.state.mode))return "forfeit_unavailable";
      player.forcedForfeit=true;player.forfeitReason="surrender";
      const teams=this.state.players.map(candidate=>teamSnapshot(candidate,this.state.rulesVersion));
      await this.finish(teams[0],teams[1]);
      return "ok";
    }
    if(data.type==="emote"){
      if(this.state.mode==="practice"||!["setup","draft","market","training","live","penalty"].includes(this.state.phase))return "emote_unavailable";
      if(!ARENA_EMOTES.includes(data.emote))return "unavailable_choice";
      const now=Date.now(),cooldowns=this.state.emoteCooldowns||(this.state.emoteCooldowns=[0,0]);
      if(now-Number(cooldowns[index]||0)<4000)return "emote_rate_limited";
      cooldowns[index]=now;
      if(!Array.isArray(this.state.emotes))this.state.emotes=[null,null];
      this.state.emoteSequence=Number(this.state.emoteSequence||0)+1;
      this.state.emotes[index]={id:data.emote,sequence:this.state.emoteSequence,at:now};
      this.persist();this.broadcast();return "ok";
    }
    const gameplayAction=["ready","setup","draft","market","training","tactic","penalty"].includes(data.type);
    if(data.type==="ready"&&this.state.phase==="lobby"){
      if(player.ready)return "already_submitted";
      player.ready=true;
    }
    else if(data.type==="setup"&&this.state.phase==="setup"){
      if(player.setup)return "already_submitted";
      const choice={...data.choice,chairman:"babacan"};
      if(!validateSetup(choice,this.state.rulesVersion))return "unavailable_choice";
      player.setup=choice;
    }
    else if(data.type==="draft"&&this.state.phase==="draft"){
      if(player.draft.length>this.state.draftStep)return "already_submitted";
      const offer=this.state.offers[index].find(item=>item.id===data.choice);
      if(!offer||offer.cost>this.draftChoiceBudget(player,index))return "unavailable_choice";
      if(offer.sourceId&&this.state.players.some(candidate=>candidate.draft.some(pick=>pick.sourceId===offer.sourceId)))return "unavailable_choice";
      player.draft.push(offer);
    }else if(data.type==="market"&&this.state.phase==="market"){
      if(player.market)return "already_submitted";
      const offer=this.state.offers[index].find(item=>item.id===data.choice);
      if(!offer||offer.cost>this.remainingBudget(player))return "unavailable_choice";
      player.market={id:offer.id};
    }else if(data.type==="training"&&this.state.phase==="training"&&normalizeMatchPlan(data.choice)){
      if(player.training)return "already_submitted";
      player.training=normalizeMatchPlan(data.choice);
    }
    else if(data.type==="tactic"&&this.state.phase==="live"&&(this.state.liveStage||"decision")==="decision"&&TACTICS.includes(data.choice)){
      if(player.tactics.length>this.state.window)return "already_submitted";
      player.tactics.push(data.choice);
    }
    else if(data.type==="penalty"&&this.state.phase==="penalty"&&this.state.penalty&&this.state.penalty.stage==="choice"&&PENALTY_ZONES.includes(data.choice)){
      if(this.state.penalty.choices[index])return "already_submitted";
      this.state.penalty.choices[index]=data.choice;
    }
    else return "wrong_phase";
    if(gameplayAction){
      player.manualDecisions=(Number(player.manualDecisions)||0)+1;
      player.missedDecisions=0;
    }
    if(data.type==="tactic")player.manualTactics=(Number(player.manualTactics)||0)+1;
    if(gameplayAction&&this.state.botIndex>=0&&index!==this.state.botIndex&&!this.state.botDueAt)this.scheduleBotDecision();
    this.persist();await this.advance();if(!this.bothDone()){await this.armAlarm();this.broadcast();}return "ok";
  }
  async startRematch(){
    if(!this.state.rematch||this.state.rematch.launched)return;
    this.state.rematch.launched=true;this.persist();this.broadcast();
    const matchId=randomId("AR-",12),seed=randomId("",16);
    const players=this.state.players.map((player,index)=>({
      owner:player.owner,
      clubName:player.clubName,
      rating:Number(this.state.result&&this.state.result.profiles&&this.state.result.profiles[index]&&this.state.result.profiles[index].rating)||Number(player.rating)
    }));
    const room=this.env.ARENA_ROOM.getByName(matchId);
    const access=await room.init(matchId,players,seed,{rematchOf:this.state.matchId,rematchUsed:true,mode:this.state.mode,botIndex:this.state.botIndex,botProfile:this.state.botProfile});
    const expires=futureIso(45*60_000),updated=nowIso();
    const presencePlayers=players.filter((_,index)=>index!==this.state.botIndex);
    if(presencePlayers.length)await this.env.DB.batch(presencePlayers.map(player=>this.env.DB.prepare("INSERT OR REPLACE INTO arena_presence(owner_hash,status,match_id,expires_at,updated_at) VALUES(?,'match',?,?,?)").bind(player.owner,matchId,expires,updated)));
    for(const socket of this.ctx.getWebSockets()){
      const attachment=socket.deserializeAttachment();if(!attachment||!access[attachment.owner])continue;
      try{socket.send(JSON.stringify({type:"rematch",matchId,roomToken:access[attachment.owner]}));}catch(error){operational(this.env,"arena_rematch_delivery_failed",matchId,1,error);}
    }
    metric(this.env,"arena_rematch_started","ranked",1);
  }
  async recoverExpired(){
    if(!this.state||this.state.phase==="result"||Date.now()<Number(this.state.deadline||0))return false;
    await this.alarm();
    return true;
  }
  async alarm(){
    if(!this.state)return;
    const alarmDelay=Math.max(0,Date.now()-Number(this.state.deadline||Date.now()));
    if(alarmDelay>5000)operational(this.env,"arena_alarm_delay",this.state.matchId,alarmDelay);
    if(this.state.phase==="result"){
      if(this.state.botIndex>=0&&this.state.rematch&&this.state.botRematchDueAt&&Date.now()>=this.state.botRematchDueAt){
        this.state.botRematchDueAt=0;this.state.rematch.requests[this.state.botIndex]=true;this.persist();this.broadcast();
        if(this.state.rematch.requests.every(Boolean)){await this.startRematch();return;}
      }
      if(!this.state.resultRecorded){
        const recorded=await this.recordResult(this.state.result.outcomes);
        if(!recorded){this.state.deadline=Date.now()+10_000;this.persist();await this.armAlarm();return;}
        this.state.deadline=Date.now()+PHASE_SECONDS.result*1000;this.persist();await this.armAlarm();
      }
      if(Date.now()>=this.state.deadline)for(const socket of this.ctx.getWebSockets())try{socket.close(1000,"complete");}catch(_){}
      else await this.armAlarm();
      return;
    }
    if(this.state.botIndex>=0&&this.state.botDueAt&&Date.now()>=this.state.botDueAt&&this.botPending()){
      this.botAction(this.state.botIndex);this.persist();await this.advance();
      if(!this.bothDone()){await this.armAlarm();this.broadcast();}
      return;
    }
    if(Date.now()<this.state.deadline){await this.armAlarm();return;}
    if(this.state.phase==="live"&&this.state.liveStage==="reveal"){
      const lastWindow=this.state.rulesVersion===ARENA_RULES_VERSION?LIVE_SEGMENTS.length-1:2;
      if(this.state.window<lastWindow){
        this.state.window++;this.state.liveStage="decision";this.state.windowResult=null;this.setDeadline();this.scheduleBotDecision();
        this.persist();await this.armAlarm();this.broadcast();
      }else{
        const home=teamSnapshot(this.state.players[0],this.state.rulesVersion),away=teamSnapshot(this.state.players[1],this.state.rulesVersion);
        if(this.state.score[0]===this.state.score[1]&&!allowsRegulationDraw(this.state.rulesVersion))await this.startPenalties();
        else await this.finish(home,away);
      }
      return;
    }
    if(this.state.phase==="penalty"&&this.state.penalty&&this.state.penalty.stage==="reveal"){
      const penalty=this.state.penalty;
      if(this.penaltyComplete()||penalty.kick>=29){
        if(penalty.score[0]===penalty.score[1]){
          const winner=hashSeed(`${this.state.seed}|penalty-cap`)%2;
          penalty.kicks[winner]++;
          penalty.score[winner]++;
          penalty.suddenDeath=true;
          penalty.history.push({kick:penalty.kick+1,round:Math.max(...penalty.kicks),shooter:winner,goal:true,outcome:"goal",decider:"safety_cap"});
        }
        const teams=this.state.players.map(player=>teamSnapshot(player,this.state.rulesVersion));
        await this.finish(teams[0],teams[1],[...penalty.score]);
      }else{
        penalty.kick++;
        penalty.turn=penalty.turn===0?1:0;
        penalty.round=Math.max(penalty.kicks[0],penalty.kicks[1])+1;
        penalty.suddenDeath=penalty.kicks[0]>=5&&penalty.kicks[1]>=5&&penalty.score[0]===penalty.score[1];
        penalty.stage="choice";penalty.choices=[null,null];
        this.setDeadline();this.scheduleBotDecision();this.persist();await this.armAlarm();this.broadcast();
      }
      return;
    }
    const timedOut=[];
    for(let index=0;index<2;index++){
      const player=this.state.players[index];
      const incomplete=
        (this.state.phase==="lobby"&&!player.ready)||
        (this.state.phase==="setup"&&!player.setup)||
        (this.state.phase==="draft"&&player.draft.length<=this.state.draftStep)||
        (this.state.phase==="market"&&!player.market)||
        (this.state.phase==="training"&&!player.training)||
        (this.state.phase==="live"&&player.tactics.length<=this.state.window)||
        (this.state.phase==="penalty"&&this.state.penalty&&this.state.penalty.stage==="choice"&&!this.state.penalty.choices[index]);
      if(incomplete){
        const competitive=["ranked","custom","tournament"].includes(this.state.mode);
        if(competitive&&index!==this.state.botIndex){
          player.missedDecisions=(Number(player.missedDecisions)||0)+1;
          if(player.missedDecisions>=3)timedOut.push(index);
        }
        if(!competitive||player.missedDecisions<3||index===this.state.botIndex)this.defaultAction(index);
      }
    }
    if(timedOut.length){
      if(timedOut.length===1){
        const index=timedOut[0];this.state.players[index].forcedForfeit=true;this.state.players[index].forfeitReason="inactivity";
      }else this.state.forcedVoid=true;
      const teams=this.state.players.map(player=>teamSnapshot(player,this.state.rulesVersion));
      await this.finish(teams[0],teams[1]);return;
    }
    this.persist();await this.advance();
  }
  async webSocketMessage(socket,message){
    const attachment=socket.deserializeAttachment();if(!attachment)return;
    const now=Date.now();
    if(now-attachment.windowStartedAt>10_000){attachment.windowStartedAt=now;attachment.messages=0;}
    attachment.messages++;socket.serializeAttachment(attachment);
    if(attachment.messages>30){socket.send(JSON.stringify({type:"error",code:"rate_limited"}));return;}
    if(typeof message!=="string"||message.length>4096){socket.close(1009,"invalid");return;}
    let data;try{data=JSON.parse(message);}catch(_){socket.send(JSON.stringify({type:"error",code:"invalid_json"}));return;}
    if(data.type==="ping"||data.type==="sync")await this.recoverExpired();
    if(data.type==="ping"){socket.send(JSON.stringify({type:"pong",at:Date.now()}));return;}
    if(data.type==="sync"){socket.send(JSON.stringify({type:"state",state:publicState(this.state,attachment.owner)}));return;}
    await this.recoverExpired();
    if(!this.acceptAction(attachment.owner,data.actionId)){socket.send(JSON.stringify({type:"ack",actionId:data.actionId,duplicate:true}));return;}
    const status=await this.action(attachment.owner,data);
    socket.send(JSON.stringify({type:"ack",actionId:data.actionId,status}));
  }
  async webSocketClose(socket){
    const attachment=socket.deserializeAttachment();if(!attachment||!this.state)return;
    const replacement=this.ctx.getWebSockets(`owner:${attachment.owner}`).some(candidate=>candidate!==socket&&candidate.readyState===1);
    if(replacement)return;
    const player=this.state.players.find(item=>item.owner===attachment.owner);
    if(player){
      const now=Date.now(),index=this.state.players.indexOf(player);player.connected=false;player.lastSeenAt=now;player.disconnects=(Number(player.disconnects)||0)+1;
      if(this.state.phase!=="result"&&this.state.mode!=="practice"&&index!==this.state.botIndex&&Number(this.state.deadline)>now){
        if(!Array.isArray(this.state.reconnectGraceUsed))this.state.reconnectGraceUsed=[0,0];
        if(!Array.isArray(this.state.reconnectGraceUntil))this.state.reconnectGraceUntil=[0,0];
        const remaining=Math.max(0,RECONNECT_GRACE_CAP_MS-Number(this.state.reconnectGraceUsed[index]||0));
        const granted=Math.min(RECONNECT_GRACE_MS,remaining);
        if(granted>0){
          this.state.reconnectGraceUsed[index]=Number(this.state.reconnectGraceUsed[index]||0)+granted;
          this.state.reconnectGraceUntil[index]=now+granted;this.state.deadline+=granted;
          metric(this.env,"arena_disconnect_grace",this.state.mode,granted);
        }
      }
      this.persist();await this.armAlarm();this.broadcastPresence();
    }
  }
}

async function verifyGoogleCredential(credential,env){
  if(env.GOOGLE_TEST_MODE==="true"&&credential==="test-google-credential"){
    return {sub:"arena-visual-qa",email:"qa@copa.life",email_verified:true,name:"Arena QA"};
  }
  if(typeof credential!=="string"||credential.length<100||credential.length>8192)throw new Error("invalid_google_credential");
  const response=await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);
  if(!response.ok)throw new Error("invalid_google_credential");
  const claims=await response.json();
  const allowed=String(env.GOOGLE_CLIENT_IDS||"").split(",").map(value=>value.trim()).filter(Boolean);
  if(!allowed.length||!allowed.includes(String(claims.aud||"")))throw new Error("google_audience_mismatch");
  if(!["accounts.google.com","https://accounts.google.com"].includes(String(claims.iss||"")))throw new Error("google_issuer_mismatch");
  if(String(claims.email_verified)!=="true"||!claims.sub)throw new Error("google_email_unverified");
  if(Number(claims.exp||0)*1000<=Date.now())throw new Error("google_credential_expired");
  return claims;
}
async function handleGoogleAuth(request,env){
  if(!await rateLimit(env,request,"session",8))return json(request,env,{error:"rate_limited"},429);
  let data;try{data=await body(request,10*1024);}catch(error){return json(request,env,{error:error.message==="payload_too_large"?"payload_too_large":"invalid_json"},400);}
  let claims;try{claims=await verifyGoogleCredential(data.credential,env);}catch(error){return json(request,env,{error:error.message||"google_sign_in_failed"},401);}
  const googleSubHash=await sha("google-sub:"+claims.sub);
  const owner=await sha("arena-google-owner:"+claims.sub);
  const bearer=randomId("CAR-",32),tokenHash=await sha("arena-auth:"+bearer),expiresAt=futureIso(30*24*60*60_000),created=nowIso();
  await env.DB.batch([
    env.DB.prepare("INSERT INTO arena_google_accounts(owner_hash,google_sub_hash,email,display_name,created_at,updated_at) VALUES(?,?,?,?,?,?) ON CONFLICT(owner_hash) DO UPDATE SET email=excluded.email,display_name=excluded.display_name,updated_at=excluded.updated_at")
      .bind(owner,googleSubHash,clean(claims.email,254),clean(claims.name,80),created,created),
    env.DB.prepare("INSERT INTO arena_auth_sessions(token_hash,owner_hash,expires_at,created_at) VALUES(?,?,?,?)").bind(tokenHash,owner,expiresAt,created)
  ]);
  metric(env,"arena_google_signed_in","google",1);
  return json(request,env,{token:bearer,expiresAt,user:{name:clean(claims.name,80),email:clean(claims.email,254)}},201);
}

async function handleSession(request,env){
  if(!await rateLimit(env,request,"session",8))return json(request,env,{error:"rate_limited"},429);
  const id=await identity(request,env);if(!id)return json(request,env,{error:"identity_required"},428);
  let data;try{data=await body(request,4096);}catch(error){return json(request,env,{error:error.message==="payload_too_large"?"payload_too_large":"invalid_json"},error.message==="payload_too_large"?413:400);}
  const name=clubName(data.clubName);if(!name)return json(request,env,{error:"invalid_club_name"},422);
  const mode=String(data.mode||"ranked"),region=REGIONS.has(data.region)?data.region:"global";
  if(!MODES.has(mode))return json(request,env,{error:"invalid_mode"},422);
  const row=await ensureProfile(env,id.owner,name);
  await env.DB.prepare("DELETE FROM arena_presence WHERE owner_hash=? AND expires_at<?").bind(id.owner,nowIso()).run();
  const activeMatch=await env.DB.prepare("SELECT match_id FROM arena_presence WHERE owner_hash=? AND status='match' AND expires_at>? LIMIT 1").bind(id.owner,nowIso()).first();
  if(activeMatch&&ROOM_ID.test(String(activeMatch.match_id||""))){
    const room=env.ARENA_ROOM.getByName(activeMatch.match_id),roomToken=await room.accessFor(id.owner);
    if(roomToken){
      await env.DB.prepare("DELETE FROM arena_tickets WHERE owner_hash=? AND consumed_at IS NULL").bind(id.owner).run();
      return json(request,env,{recoverMatch:{matchId:activeMatch.match_id,roomToken},profile:profile(row)},200);
    }
    await env.DB.prepare("DELETE FROM arena_presence WHERE owner_hash=? AND match_id=?").bind(id.owner,activeMatch.match_id).run();
  }
  const recoverable=await env.DB.prepare("SELECT ticket_hash FROM arena_tickets WHERE owner_hash=? AND consumed_at IS NULL AND expires_at>? LIMIT 1").bind(id.owner,nowIso()).first();
  if(recoverable){
    await env.DB.batch([
      env.DB.prepare("DELETE FROM arena_tickets WHERE owner_hash=? AND consumed_at IS NULL").bind(id.owner),
      env.DB.prepare("DELETE FROM arena_presence WHERE owner_hash=? AND status='queue'").bind(id.owner)
    ]);
  }
  if(mode==="practice"){
    const matchId=randomId("AR-",12),seed=randomId("",16),botOwner=`practice-bot:${matchId}`;
    const room=env.ARENA_ROOM.getByName(matchId);
    const access=await room.init(matchId,[
      {owner:id.owner,clubName:row.club_name,rating:Number(row.rating)},
      {owner:botOwner,clubName:"ARENA TRAINING XI",rating:Number(row.rating)}
    ],seed,{mode:"practice",botIndex:1});
    await env.DB.prepare("INSERT OR REPLACE INTO arena_presence(owner_hash,status,match_id,expires_at,updated_at) VALUES(?,'match',?,?,?)")
      .bind(id.owner,matchId,futureIso(45*60_000),nowIso()).run();
    metric(env,"practice_started",region,row.rating);
    return json(request,env,{directMatch:{matchId,roomToken:access[id.owner]},profile:profile(row),mode:"practice"},201);
  }
  const ticket=randomId("AT-",24),ticketHash=await sha("ticket:"+ticket),expires=futureIso(5*60_000),presenceExpires=futureIso(10*60_000);
  const acquired=await env.DB.prepare("INSERT OR IGNORE INTO arena_presence(owner_hash,status,match_id,expires_at,updated_at) VALUES(?,'queue',NULL,?,?)").bind(id.owner,presenceExpires,nowIso()).run();
  if(Number(acquired.meta&&acquired.meta.changes)!==1)return json(request,env,{error:"arena_session_active"},409);
  await env.DB.prepare("INSERT INTO arena_tickets(ticket_hash,owner_hash,client_hash,mode,region,club_name,rating,expires_at,created_at) VALUES(?,?,?,?,?,?,?,?,?)")
    .bind(ticketHash,id.owner,id.client,mode,region,row.club_name,row.rating,expires,nowIso()).run();
  metric(env,"queue_ticket",region,row.rating);
  return json(request,env,{ticket,expiresAt:expires,profile:profile(row)},201);
}
async function handleProfile(request,env){
  const id=await identity(request,env);if(!id)return json(request,env,{error:"identity_required"},428);
  return json(request,env,{profile:profile(await ensureProfile(env,id.owner,"")),cosmeticCatalog:COSMETIC_REWARDS});
}
async function handleEquipCosmetic(request,env){
  const id=await identity(request,env);if(!id)return json(request,env,{error:"identity_required"},428);
  let data;try{data=await body(request,2048);}catch(_){return json(request,env,{error:"invalid_json"},400);}
  const type=String(data.type||""),rewardId=String(data.id||"");
  if(!COSMETIC_TYPES.has(type))return json(request,env,{error:"invalid_cosmetic_type"},422);
  const row=await ensureProfile(env,id.owner,""),owned=new Set(jsonArray(row.cosmetics)),equipped=jsonObject(row.equipped_cosmetics);
  if(rewardId){
    const item=COSMETIC_REWARDS.find(reward=>reward.id===rewardId&&reward.type===type);
    if(!item||!owned.has(rewardId))return json(request,env,{error:"cosmetic_locked"},403);
    equipped[type]=rewardId;
  }else delete equipped[type];
  await env.DB.prepare("UPDATE arena_profiles SET equipped_cosmetics=?,updated_at=? WHERE owner_hash=?").bind(JSON.stringify(equipped),nowIso(),id.owner).run();
  metric(env,"arena_cosmetic_equipped",type,rewardId?1:0);
  return json(request,env,{profile:profile(await ensureProfile(env,id.owner,"")),cosmeticCatalog:COSMETIC_REWARDS});
}
async function handleLeaderboard(request,env,url){
  const season=seasonKey(),requested=Number(url.searchParams.get("limit")),limit=Number.isFinite(requested)&&requested>0?Math.round(clamp(requested,1,50)):25;
  const rows=await env.DB.prepare("SELECT public_id,club_name,rating,season_key,season_points,wins,draws,losses,streak,token_progress,cosmetics FROM arena_profiles WHERE season_key=? AND (wins+draws+losses)>0 ORDER BY rating DESC,season_points DESC,wins DESC LIMIT ?").bind(season,limit).all();
  return json(request,env,{season,entries:(rows.results||[]).map((row,index)=>({...profile(row),rank:index+1}))});
}
async function handleHistory(request,env){
  const id=await identity(request,env);if(!id)return json(request,env,{error:"identity_required"},428);
  const rows=await env.DB.prepare("SELECT mp.match_id,mp.outcome,mp.rating_before,mp.rating_delta,mp.season_points,mp.token_progress,mp.created_at,m.home_score,m.away_score,m.home_owner FROM arena_match_players mp JOIN arena_matches m ON m.match_id=mp.match_id WHERE mp.owner_hash=? ORDER BY mp.created_at DESC LIMIT 12").bind(id.owner).all();
  return json(request,env,{matches:(rows.results||[]).map(row=>({
    matchId:row.match_id,outcome:row.outcome,ratingBefore:Number(row.rating_before),ratingDelta:Number(row.rating_delta),
    seasonPoints:Number(row.season_points),tokenProgress:Number(row.token_progress),createdAt:row.created_at,
    score:row.home_owner===id.owner?[Number(row.home_score),Number(row.away_score)]:[Number(row.away_score),Number(row.home_score)]
  }))});
}
async function handleCreateTournament(request,env){
  if(!await rateLimit(env,request,"session",8))return json(request,env,{error:"rate_limited"},429);
  const id=await identity(request,env);if(!id)return json(request,env,{error:"identity_required"},428);
  let data;try{data=await body(request,4096);}catch(_){return json(request,env,{error:"invalid_json"},400);}
  const name=clubName(data.clubName),size=Number(data.size);if(!name)return json(request,env,{error:"invalid_club_name"},422);
  if(!validTournamentSize(size))return json(request,env,{error:"invalid_tournament_size"},422);
  const profileRow=await ensureProfile(env,id.owner,name);
  await env.DB.prepare("DELETE FROM arena_presence WHERE owner_hash=? AND expires_at<?").bind(id.owner,nowIso()).run();
  const active=await env.DB.prepare("SELECT match_id FROM arena_presence WHERE owner_hash=? AND expires_at>? LIMIT 1").bind(id.owner,nowIso()).first();
  if(active)return json(request,env,{error:"arena_session_active"},409);
  for(let attempt=0;attempt<5;attempt++){
    const code=randomCustomCode(),stub=env.ARENA_TOURNAMENT.getByName(tournamentId(code));
    const created=await stub.init(code,size,{owner:id.owner,clubName:profileRow.club_name,rating:Number(profileRow.rating)});
    if(!created.ok)continue;
    const inserted=await env.DB.prepare("INSERT OR IGNORE INTO arena_presence(owner_hash,status,match_id,expires_at,updated_at) VALUES(?,'tournament',?,?,?)")
      .bind(id.owner,tournamentId(code),new Date(Date.now()+TOURNAMENT_LOBBY_MS).toISOString(),nowIso()).run();
    if(Number(inserted.meta&&inserted.meta.changes)!==1){await stub.cancel(id.owner);return json(request,env,{error:"arena_session_active"},409);}
    metric(env,"arena_tournament_created",String(size),1);return json(request,env,{tournament:created.tournament},201);
  }
  return json(request,env,{error:"room_code_unavailable"},503);
}
async function handleTournamentStatus(request,env,code){
  const id=await identity(request,env);if(!id)return json(request,env,{error:"identity_required"},428);
  const status=await env.ARENA_TOURNAMENT.getByName(tournamentId(code)).status(id.owner);
  if(!status.ok){
    if(status.reason==="room_expired")await env.DB.prepare("DELETE FROM arena_presence WHERE owner_hash=? AND match_id=?").bind(id.owner,tournamentId(code)).run();
    return json(request,env,{error:status.reason},status.reason==="not_participant"?403:404);
  }
  return json(request,env,{tournament:status.tournament,directMatch:status.tournament.directMatch});
}
async function handleJoinTournament(request,env,code){
  if(!await rateLimit(env,request,"session",8))return json(request,env,{error:"rate_limited"},429);
  const id=await identity(request,env);if(!id)return json(request,env,{error:"identity_required"},428);
  let data={};try{data=await body(request,4096);}catch(_){return json(request,env,{error:"invalid_json"},400);}
  const requestedName=data.clubName?clubName(data.clubName):"";if(data.clubName&&!requestedName)return json(request,env,{error:"invalid_club_name"},422);
  const profileRow=await ensureProfile(env,id.owner,requestedName),idForTournament=tournamentId(code);
  await env.DB.prepare("DELETE FROM arena_presence WHERE owner_hash=? AND expires_at<?").bind(id.owner,nowIso()).run();
  const active=await env.DB.prepare("SELECT match_id FROM arena_presence WHERE owner_hash=? AND expires_at>? LIMIT 1").bind(id.owner,nowIso()).first();
  if(active&&active.match_id!==idForTournament)return json(request,env,{error:"arena_session_active"},409);
  const stub=env.ARENA_TOURNAMENT.getByName(idForTournament);
  const joined=await stub.join({owner:id.owner,clubName:profileRow.club_name,rating:Number(profileRow.rating)});
  if(!joined.ok)return json(request,env,{error:joined.reason},joined.reason==="room_full"||joined.reason==="tournament_started"?409:404);
  if(joined.tournament.status==="waiting")await env.DB.prepare("INSERT OR REPLACE INTO arena_presence(owner_hash,status,match_id,expires_at,updated_at) VALUES(?,'tournament',?,?,?)")
    .bind(id.owner,idForTournament,new Date(Date.now()+TOURNAMENT_LOBBY_MS).toISOString(),nowIso()).run();
  metric(env,"arena_tournament_joined",String(joined.tournament.size),joined.tournament.joined);
  return json(request,env,{tournament:joined.tournament,directMatch:joined.tournament.directMatch},200);
}
async function handleCancelTournament(request,env,code){
  const id=await identity(request,env);if(!id)return json(request,env,{error:"identity_required"},428);
  const cancelled=await env.ARENA_TOURNAMENT.getByName(tournamentId(code)).cancel(id.owner);
  if(!cancelled.ok)return json(request,env,{error:cancelled.reason},cancelled.reason==="not_host"?403:409);
  return new Response(null,{status:204,headers:responseHeaders(request,env)});
}
async function handleCreateCustomRoom(request,env){
  if(!await rateLimit(env,request,"session",8))return json(request,env,{error:"rate_limited"},429);
  const id=await identity(request,env);if(!id)return json(request,env,{error:"identity_required"},428);
  let data;try{data=await body(request,4096);}catch(_){return json(request,env,{error:"invalid_json"},400);}
  const name=clubName(data.clubName);if(!name)return json(request,env,{error:"invalid_club_name"},422);
  const profileRow=await ensureProfile(env,id.owner,name);
  await env.DB.prepare("DELETE FROM arena_presence WHERE owner_hash=? AND expires_at<?").bind(id.owner,nowIso()).run();
  const active=await env.DB.prepare("SELECT match_id FROM arena_presence WHERE owner_hash=? AND expires_at>? LIMIT 1").bind(id.owner,nowIso()).first();
  if(active)return json(request,env,{error:"arena_session_active"},409);
  for(let attempt=0;attempt<5;attempt++){
    const code=randomCustomCode(),matchId=customMatchId(code),room=env.ARENA_ROOM.getByName(matchId);
    const created=await room.createCustom(matchId,code,{owner:id.owner,clubName:profileRow.club_name,rating:Number(profileRow.rating)});
    if(!created.ok)continue;
    const inserted=await env.DB.prepare("INSERT OR IGNORE INTO arena_presence(owner_hash,status,match_id,expires_at,updated_at) VALUES(?,'custom',?,?,?)").bind(id.owner,matchId,created.expiresAt,nowIso()).run();
    if(Number(inserted.meta&&inserted.meta.changes)!==1){await room.cancelCustom(id.owner);return json(request,env,{error:"arena_session_active"},409);}
    metric(env,"custom_room_created","private",1);
    return json(request,env,{room:{code,status:"waiting",expiresAt:created.expiresAt}},201);
  }
  return json(request,env,{error:"room_code_unavailable"},503);
}
async function handleCustomRoomStatus(request,env,code){
  const id=await identity(request,env);if(!id)return json(request,env,{error:"identity_required"},428);
  const room=env.ARENA_ROOM.getByName(customMatchId(code)),status=await room.customStatus(id.owner);
  if(!status.ok){
    if(status.reason==="room_expired")await env.DB.prepare("DELETE FROM arena_presence WHERE owner_hash=? AND match_id=?").bind(id.owner,customMatchId(code)).run();
    return json(request,env,{error:status.reason},status.reason==="not_participant"?403:404);
  }
  return json(request,env,{room:{code:status.code,status:status.status,expiresAt:status.expiresAt},directMatch:status.roomToken?{matchId:status.matchId,roomToken:status.roomToken}:null});
}
async function handleJoinCustomRoom(request,env,code){
  if(!await rateLimit(env,request,"session",8))return json(request,env,{error:"rate_limited"},429);
  const id=await identity(request,env);if(!id)return json(request,env,{error:"identity_required"},428);
  let data={};try{data=await body(request,4096);}catch(_){return json(request,env,{error:"invalid_json"},400);}
  const requestedName=data.clubName?clubName(data.clubName):"";if(data.clubName&&!requestedName)return json(request,env,{error:"invalid_club_name"},422);
  const profileRow=await ensureProfile(env,id.owner,requestedName);
  await env.DB.prepare("DELETE FROM arena_presence WHERE owner_hash=? AND expires_at<?").bind(id.owner,nowIso()).run();
  const active=await env.DB.prepare("SELECT match_id FROM arena_presence WHERE owner_hash=? AND expires_at>? LIMIT 1").bind(id.owner,nowIso()).first();
  const matchId=customMatchId(code);
  if(active&&active.match_id!==matchId)return json(request,env,{error:"arena_session_active"},409);
  const room=env.ARENA_ROOM.getByName(matchId),joined=await room.joinCustom(matchId,code,{owner:id.owner,clubName:profileRow.club_name,rating:Number(profileRow.rating)});
  if(!joined.ok)return json(request,env,{error:joined.reason},["cannot_join_own_room","room_full"].includes(joined.reason)?409:404);
  const hostStatus=await room.customStatus(id.owner);
  await env.DB.batch([
    env.DB.prepare("UPDATE arena_presence SET status='match',expires_at=?,updated_at=? WHERE match_id=?").bind(futureIso(45*60_000),nowIso(),matchId),
    env.DB.prepare("INSERT OR REPLACE INTO arena_presence(owner_hash,status,match_id,expires_at,updated_at) VALUES(?,'match',?,?,?)").bind(id.owner,matchId,futureIso(45*60_000),nowIso())
  ]);
  metric(env,"custom_room_joined","private",1);
  return json(request,env,{room:{code,status:"matched"},directMatch:{matchId,roomToken:joined.roomToken},hostReady:!!hostStatus.ok},200);
}
async function handleCancelCustomRoom(request,env,code){
  const id=await identity(request,env);if(!id)return json(request,env,{error:"identity_required"},428);
  const matchId=customMatchId(code),room=env.ARENA_ROOM.getByName(matchId),cancelled=await room.cancelCustom(id.owner);
  if(!cancelled.ok)return json(request,env,{error:cancelled.reason},cancelled.reason==="not_host"?403:409);
  await env.DB.prepare("DELETE FROM arena_presence WHERE owner_hash=? AND match_id=?").bind(id.owner,matchId).run();
  return new Response(null,{status:204,headers:responseHeaders(request,env)});
}
async function handleDeleteProfile(request,env){
  const id=await identity(request,env);if(!id)return json(request,env,{error:"identity_required"},428);
  const deletedOwner=`deleted:${randomId("",12)}`;
  await env.DB.batch([
    env.DB.prepare("UPDATE arena_matches SET home_owner=? WHERE home_owner=?").bind(deletedOwner,id.owner),
    env.DB.prepare("UPDATE arena_matches SET away_owner=? WHERE away_owner=?").bind(deletedOwner,id.owner),
    env.DB.prepare("DELETE FROM arena_match_players WHERE owner_hash=?").bind(id.owner),
    env.DB.prepare("DELETE FROM arena_cosmetic_unlocks WHERE owner_hash=?").bind(id.owner),
    env.DB.prepare("DELETE FROM arena_tickets WHERE owner_hash=?").bind(id.owner),
    env.DB.prepare("DELETE FROM arena_presence WHERE owner_hash=?").bind(id.owner),
    env.DB.prepare("DELETE FROM arena_auth_sessions WHERE owner_hash=?").bind(id.owner),
    env.DB.prepare("DELETE FROM arena_google_accounts WHERE owner_hash=?").bind(id.owner),
    env.DB.prepare("DELETE FROM arena_profiles WHERE owner_hash=?").bind(id.owner)
  ]);
  metric(env,"arena_profile_deleted","self_service",1);
  const headers=responseHeaders(request,env);delete headers["content-type"];
  return new Response(null,{status:204,headers});
}
async function handleEvent(request,env){
  if(!await rateLimit(env,request,"event",30))return json(request,env,{error:"rate_limited"},429);
  const id=await identity(request,env);if(!id)return json(request,env,{error:"identity_required"},428);
  let data;try{data=await body(request,2048);}catch(_){return json(request,env,{error:"invalid_json"},400);}
  const event=String(data.event||""),detail=clean(data.detail,48),value=Math.round(clamp(data.value,-10000,10000));
  if(!ARENA_EVENTS.has(event))return json(request,env,{error:"invalid_event"},422);
  metric(env,event,detail,value);
  const headers=responseHeaders(request,env);delete headers["content-type"];return new Response(null,{status:204,headers});
}
async function handleQueueSocket(request,env,url){
  const raw=String(url.searchParams.get("ticket")||"");if(!TICKET.test(raw))return new Response("Unauthorized",{status:401});
  const ticket=await consumeTicket(env,raw);if(!ticket)return new Response("Ticket expired",{status:401});
  const queueName=`${ticket.mode}:${ticket.region}`;
  const stub=env.ARENA_MATCHMAKER.getByName(queueName);
  let recent=[];try{recent=await recentOpponents(env,ticket.owner_hash);}catch(error){
    console.error(JSON.stringify({message:"arena_recent_opponents_failed",owner:ticket.owner_hash,error:String(error)}));
  }
  const headers=new Headers(request.headers);headers.set("x-arena-owner",ticket.owner_hash);headers.set("x-arena-club",encodeURIComponent(ticket.club_name));headers.set("x-arena-rating",String(ticket.rating));headers.set("x-arena-recent",encodeURIComponent(JSON.stringify(recent)));
  const forwarded=new Request(request,{headers});
  try{
    const response=await stub.fetch(forwarded);
    if(response.status!==101)await env.DB.prepare("DELETE FROM arena_presence WHERE owner_hash=? AND status='queue'").bind(ticket.owner_hash).run();
    return response;
  }catch(error){
    await env.DB.prepare("DELETE FROM arena_presence WHERE owner_hash=? AND status='queue'").bind(ticket.owner_hash).run();
    throw error;
  }
}
async function handleRoomSocket(request,env,url,matchId){
  if(!ROOM_ID.test(matchId))return new Response("Not Found",{status:404});
  const token=String(url.searchParams.get("token")||"");if(!/^RT-[A-Z0-9]{48}$/.test(token))return new Response("Unauthorized",{status:401});
  const headers=new Headers(request.headers);headers.set("x-arena-room-token",token);
  return env.ARENA_ROOM.getByName(matchId).fetch(new Request(request,{headers}));
}
async function route(request,env){
  const url=new URL(request.url);
  if(request.method==="OPTIONS")return new Response(null,{status:204,headers:responseHeaders(request,env)});
  if(!originAllowed(request,env))return json(request,env,{error:"origin_not_allowed"},403);
  if(request.method==="GET"&&url.pathname==="/v1/arena/health"){
    try{await env.DB.prepare("SELECT 1").first();return json(request,env,{ok:true,service:"copa-arena-api",rulesVersion:ARENA_RULES_VERSION});}
    catch(_){return json(request,env,{ok:false,error:"database_unavailable"},503);}
  }
  if(request.method==="POST"&&url.pathname==="/v1/arena/auth/google")return handleGoogleAuth(request,env);
  if(request.method==="POST"&&url.pathname==="/v1/arena/session")return handleSession(request,env);
  if(request.method==="GET"&&url.pathname==="/v1/arena/profile")return handleProfile(request,env);
  if(request.method==="PUT"&&url.pathname==="/v1/arena/profile/cosmetics")return handleEquipCosmetic(request,env);
  if(request.method==="DELETE"&&url.pathname==="/v1/arena/profile")return handleDeleteProfile(request,env);
  if(request.method==="GET"&&url.pathname==="/v1/arena/leaderboard")return handleLeaderboard(request,env,url);
  if(request.method==="GET"&&url.pathname==="/v1/arena/history")return handleHistory(request,env);
  if(request.method==="POST"&&url.pathname==="/v1/arena/tournaments")return handleCreateTournament(request,env);
  const tournament=url.pathname.match(/^\/v1\/arena\/tournaments\/([A-HJ-NP-Z2-9]{6})$/);
  if(request.method==="GET"&&tournament)return handleTournamentStatus(request,env,tournament[1]);
  if(request.method==="POST"&&tournament)return handleJoinTournament(request,env,tournament[1]);
  if(request.method==="DELETE"&&tournament)return handleCancelTournament(request,env,tournament[1]);
  if(request.method==="POST"&&url.pathname==="/v1/arena/custom-rooms")return handleCreateCustomRoom(request,env);
  const custom=url.pathname.match(/^\/v1\/arena\/custom-rooms\/([A-HJ-NP-Z2-9]{6})$/);
  if(request.method==="GET"&&custom)return handleCustomRoomStatus(request,env,custom[1]);
  if(request.method==="POST"&&custom)return handleJoinCustomRoom(request,env,custom[1]);
  if(request.method==="DELETE"&&custom)return handleCancelCustomRoom(request,env,custom[1]);
  if(request.method==="POST"&&url.pathname==="/v1/arena/events")return handleEvent(request,env);
  if(request.method==="GET"&&url.pathname==="/v1/arena/connect"&&request.headers.get("upgrade")==="websocket")return handleQueueSocket(request,env,url);
  const room=url.pathname.match(/^\/v1\/arena\/rooms\/(AR-[A-Z0-9]{16,40})\/connect$/);
  if(request.method==="GET"&&room&&request.headers.get("upgrade")==="websocket")return handleRoomSocket(request,env,url,room[1]);
  return json(request,env,{error:"not_found"},404);
}

export default {
  async fetch(request,env){
    try{return await route(request,env);}
    catch(error){console.error("arena_api_error",error);return json(request,env,{error:"internal_error"},500);}
  },
  async scheduled(_,env){
    const cutoff=new Date(Date.now()-24*60*60*1000).toISOString();
    await env.DB.batch([
      env.DB.prepare("DELETE FROM arena_tickets WHERE expires_at<?").bind(nowIso()),
      env.DB.prepare("DELETE FROM arena_tickets WHERE consumed_at IS NOT NULL AND consumed_at<?").bind(cutoff),
      env.DB.prepare("DELETE FROM arena_presence WHERE expires_at<?").bind(nowIso()),
      env.DB.prepare("DELETE FROM arena_auth_sessions WHERE expires_at<?").bind(nowIso())
    ]);
  }
};

export {clubName,identity,profile,route};
