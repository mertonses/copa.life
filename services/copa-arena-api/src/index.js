import {DurableObject} from "cloudflare:workers";
import {
  ARENA_RULES_VERSION,CHAIRMEN,DRAFT_SLOTS,LEGACY_DRAFT_LINES,FORMATIONS,PHASE_SECONDS,STYLES,TACTICS,TRAINING,
  createDraftOffers,createLegacyDraftOffers,createMarketOffers,divisionFor,hashSeed,initialPlayerState,publicState,
  resolveParticipation,
  resolvePenalty,resolveWindow,rewardFor,seasonKey,teamSnapshot,usesFullXI,validateSetup
} from "./rules.js";

const MAX_BODY_BYTES=16*1024;
const ORIGINS=["https://copa.life","https://www.copa.life","https://localhost","capacitor://localhost"];
const METHODS="GET, POST, DELETE, OPTIONS";
const MODES=new Set(["ranked"]);
const REGIONS=new Set(["weur","eeur","me","apac","global"]);
const ARENA_TOKEN=/^CAR-[A-Z0-9]{24,96}$/;
const CLIENT_ID=/^GCL-[A-Z0-9]{8,40}$/;
const TICKET=/^AT-[A-Z0-9]{32,80}$/;
const ROOM_ID=/^AR-[A-Z0-9]{16,40}$/;
const ACTION_ID=/^AA-[A-Za-z0-9_-]{8,80}$/;
const ARENA_EVENTS=new Set(["arena_opened","arena_queue_joined","arena_matched","arena_phase_completed","arena_match_completed","arena_reconnected","arena_error"]);
const COSMETIC_REWARDS=Object.freeze([
  {at:5,id:"arena_badge_rookie"},
  {at:12,id:"arena_frame_floodlights"},
  {at:20,id:"arena_kit_nocturne"},
  {at:35,id:"arena_title_unbroken"}
]);

const clean=(value,max=80)=>String(value==null?"":value).replace(/[<>\u0000-\u001f\u007f]/g,"").replace(/\s+/g," ").trim().slice(0,max);
const clamp=(value,min,max)=>Math.max(min,Math.min(max,Number(value)||0));
const allowedOrigins=env=>new Set(String(env.ALLOWED_ORIGINS||ORIGINS.join(",")).split(",").map(item=>item.trim()).filter(Boolean));
const originAllowed=(request,env)=>{const origin=request.headers.get("origin");return !origin||allowedOrigins(env).has(origin);};
const responseHeaders=(request,env)=>{
  const headers={"access-control-allow-methods":METHODS,"access-control-allow-headers":"content-type, x-copa-client, x-copa-arena-token","cache-control":"no-store","content-type":"application/json; charset=utf-8","vary":"origin","x-content-type-options":"nosniff"};
  const origin=request.headers.get("origin");if(origin&&allowedOrigins(env).has(origin))headers["access-control-allow-origin"]=origin;
  return headers;
};
const json=(request,env,body,status=200)=>new Response(JSON.stringify(body),{status,headers:responseHeaders(request,env)});
const randomId=(prefix,bytes=16)=>{const data=new Uint8Array(bytes);crypto.getRandomValues(data);return prefix+Array.from(data,value=>value.toString(16).padStart(2,"0")).join("").toUpperCase();};
const nowIso=()=>new Date().toISOString();
const futureIso=ms=>new Date(Date.now()+ms).toISOString();
const tokenFrom=request=>{const token=String(request.headers.get("x-copa-arena-token")||"");return ARENA_TOKEN.test(token)?token:"";};
const clientFrom=request=>{const client=String(request.headers.get("x-copa-client")||"");return CLIENT_ID.test(client)?client:"";};
const timingSafe=(a,b)=>{
  const one=new TextEncoder().encode(String(a)),two=new TextEncoder().encode(String(b));if(one.length!==two.length)return false;
  let diff=0;for(let index=0;index<one.length;index++)diff|=one[index]^two[index];return diff===0;
};
async function sha(value){
  const bytes=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(String(value)));
  return Array.from(new Uint8Array(bytes),item=>item.toString(16).padStart(2,"0")).join("");
}
async function identity(request){
  const token=tokenFrom(request),client=clientFrom(request);
  if(!token||!client)return null;
  return {owner:await sha("arena-owner:"+token),client:await sha("arena-client:"+client)};
}
async function body(request,limit=MAX_BODY_BYTES){
  const length=Number(request.headers.get("content-length")||0);if(length>limit)throw new Error("payload_too_large");
  const text=await request.text();if(new TextEncoder().encode(text).byteLength>limit)throw new Error("payload_too_large");
  return JSON.parse(text);
}
function clubName(value){
  const raw=String(value==null?"":value);
  if(/[<>\u0000-\u001f\u007f]/.test(raw))return "";
  const name=clean(raw,29).normalize("NFKC");
  if(Array.from(name).length<2||!/^[\p{L}\p{N} .&'-]+$/u.test(name))return "";
  const normalized=name.toLocaleLowerCase("en-US").replace(/[^a-z0-9çğıöşü]+/g,"");
  if(/(?:hitler|nazi|porno|seks|terror|official|resmi)/.test(normalized))return "";
  return name;
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
    cosmetics:JSON.parse(row.cosmetics||"[]")
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
async function rateLimit(env,request,name,limit=20){
  const binding=env.ARENA_LIMITER;if(!binding)return true;
  const id=await identity(request);const key=id?`${name}:${id.owner}`:`${name}:anonymous`;
  const outcome=await binding.limit({key});return !!outcome.success;
}
function metric(env,event,detail="",value=0){
  if(!env.ARENA_ANALYTICS)return;
  try{env.ARENA_ANALYTICS.writeDataPoint({blobs:[event,detail,ARENA_RULES_VERSION],doubles:[1,Number(value)||0]});}catch(_){}
}
async function grantCosmetics(env,owner){
  const row=await env.DB.prepare("SELECT token_progress,cosmetics,season_key FROM arena_profiles WHERE owner_hash=?").bind(owner).first();
  if(!row)return [];
  const owned=new Set(JSON.parse(row.cosmetics||"[]")),granted=[];
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
      this.ctx.storage.sql.exec("CREATE TABLE IF NOT EXISTS queue(owner TEXT PRIMARY KEY, socket_id TEXT NOT NULL, club_name TEXT NOT NULL, rating INTEGER NOT NULL, joined_at INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'queued')");
    });
  }
  async fetch(request){
    if(request.headers.get("upgrade")!=="websocket")return new Response("Upgrade Required",{status:426});
    const owner=request.headers.get("x-arena-owner")||"";
    let club="";try{club=clean(decodeURIComponent(request.headers.get("x-arena-club")||""),29);}catch(_){}
    const rating=Math.round(clamp(request.headers.get("x-arena-rating"),700,1900));
    if(!owner||!club)return new Response("Unauthorized",{status:401});
    const existing=this.ctx.getWebSockets(`owner:${owner}`);for(const socket of existing)try{socket.close(4001,"replaced");}catch(_){}
    const [client,server]=Object.values(new WebSocketPair()),socketId=randomId("S-",8),joinedAt=Date.now();
    server.serializeAttachment({owner,socketId,clubName:club,rating,joinedAt});
    this.ctx.acceptWebSocket(server,[`owner:${owner}`]);
    this.ctx.storage.sql.exec("INSERT OR REPLACE INTO queue(owner,socket_id,club_name,rating,joined_at,status) VALUES(?,?,?,?,?,'queued')",owner,socketId,club,rating,joinedAt);
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
    if(rows.length<2)return;
    const sockets=this.sockets(),used=new Set();
    for(const home of rows){
      if(used.has(home.owner)||!sockets.has(home.socket_id))continue;
      const waited=Math.max(0,Date.now()-Number(home.joined_at));
      const range=100+Math.floor(waited/15_000)*75;
      const away=rows.filter(row=>row.owner!==home.owner&&!used.has(row.owner)&&sockets.has(row.socket_id)&&Math.abs(Number(row.rating)-Number(home.rating))<=range).sort((a,b)=>Math.abs(Number(a.rating)-Number(home.rating))-Math.abs(Number(b.rating)-Number(home.rating)))[0];
      if(!away)continue;
      used.add(home.owner);used.add(away.owner);
      this.ctx.storage.sql.exec("UPDATE queue SET status='matching' WHERE owner IN (?,?)",home.owner,away.owner);
      const matchId=randomId("AR-",12),seed=randomId("",16);
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
        sockets.get(home.socket_id).send(JSON.stringify({type:"matched",matchId,roomToken:access[home.owner]}));
        sockets.get(away.socket_id).send(JSON.stringify({type:"matched",matchId,roomToken:access[away.owner]}));
        this.ctx.storage.sql.exec("DELETE FROM queue WHERE owner IN (?,?)",home.owner,away.owner);
      }catch(error){
        this.ctx.storage.sql.exec("UPDATE queue SET status='queued' WHERE owner IN (?,?)",home.owner,away.owner);
        for(const row of [home,away])try{sockets.get(row.socket_id).send(JSON.stringify({type:"error",code:"match_creation_failed"}));}catch(_){}
        console.error("arena_pair_failed",error);
      }
    }
  }
  async alarm(){
    const sockets=this.sockets();
    const rows=this.ctx.storage.sql.exec("SELECT owner,socket_id FROM queue").toArray();
    for(const row of rows)if(!sockets.has(row.socket_id)){
      this.ctx.storage.sql.exec("DELETE FROM queue WHERE owner=?",row.owner);
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
      await this.env.DB.prepare("DELETE FROM arena_presence WHERE owner_hash=? AND status='queue'").bind(attachment.owner).run();
      socket.send(JSON.stringify({type:"cancelled"}));socket.close(1000,"cancelled");
    }
  }
  async webSocketClose(socket){
    const attachment=socket.deserializeAttachment();
    if(attachment){
      this.ctx.storage.sql.exec("DELETE FROM queue WHERE owner=? AND socket_id=?",attachment.owner,attachment.socketId);
      await this.env.DB.prepare("DELETE FROM arena_presence WHERE owner_hash=? AND status='queue'").bind(attachment.owner).run();
    }
  }
}

export class ArenaRoom extends DurableObject{
  constructor(ctx,env){
    super(ctx,env);
    this.state=null;
    this.ctx.blockConcurrencyWhile(async()=>{
      this.ctx.storage.sql.exec("CREATE TABLE IF NOT EXISTS room_state(id INTEGER PRIMARY KEY CHECK(id=1),json TEXT NOT NULL,updated_at INTEGER NOT NULL);CREATE TABLE IF NOT EXISTS accepted_actions(owner TEXT NOT NULL,action_id TEXT NOT NULL,created_at INTEGER NOT NULL,PRIMARY KEY(owner,action_id))");
      const row=this.ctx.storage.sql.exec("SELECT json FROM room_state WHERE id=1").toArray()[0];
      if(row)this.state=JSON.parse(row.json);
    });
  }
  persist(){
    this.ctx.storage.sql.exec("INSERT INTO room_state(id,json,updated_at) VALUES(1,?,?) ON CONFLICT(id) DO UPDATE SET json=excluded.json,updated_at=excluded.updated_at",JSON.stringify(this.state),Date.now());
  }
  async init(matchId,players,seed){
    if(this.state){
      if(this.state.matchId!==matchId)throw new Error("room_already_initialized");
      return this.state.access;
    }
    const access=Object.fromEntries(players.map(player=>[player.owner,randomId("RT-",24)]));
    this.state={
      matchId,seed,access,rulesVersion:ARENA_RULES_VERSION,phase:"lobby",deadline:Date.now()+PHASE_SECONDS.lobby*1000,
      players:players.map(initialPlayerState),draftStep:0,window:0,liveStage:"decision",matchMinute:0,windowResult:null,offers:null,score:[0,0],events:[],result:null,completed:false,resultRecorded:false,
      participationPolicy:"minimum-manual-v1",createdAt:Date.now()
    };
    this.persist();await this.ctx.storage.setAlarm(this.state.deadline);
    return access;
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
    this.state.players[index].connected=true;this.state.players[index].lastSeenAt=Date.now();this.persist();
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
    return this.state.rulesVersion==="arena-rules-v4"||this.state.rulesVersion===ARENA_RULES_VERSION;
  }
  usesFullXI(){
    return usesFullXI(this.state.rulesVersion);
  }
  draftSlots(){
    return this.usesFullXI()?DRAFT_SLOTS:LEGACY_DRAFT_LINES.map(line=>({slot:line,line}));
  }
  draftOffers(line,step,side,slot){
    return this.isCurrentRules()
      ?createDraftOffers(this.state.seed,line,step,side,slot)
      :createLegacyDraftOffers(this.state.seed,line,step,side,slot);
  }
  defaultAction(index){
    const player=this.state.players[index];
    if(this.state.phase==="lobby")player.ready=true;
    else if(this.state.phase==="setup")player.setup={formation:"4-4-2",style:"balanced",chairman:"babacan"};
    else if(this.state.phase==="draft"){
      const offers=this.state.offers[index],affordable=offers.filter(item=>item.cost<=this.remainingBudget(player));
      player.draft.push(affordable.sort((a,b)=>b.power-a.power)[0]||offers.sort((a,b)=>a.cost-b.cost)[0]);
    }else if(this.state.phase==="market")player.market={id:"none"};
    else if(this.state.phase==="training")player.training="recovery";
    else if(this.state.phase==="live"&&(this.state.liveStage||"decision")==="decision")player.tactics.push("balanced");
  }
  remainingBudget(player){
    const chair=CHAIRMEN[player.setup&&player.setup.chairman]||CHAIRMEN.patron;
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
    return false;
  }
  setDeadline(){
    const seconds=this.state.phase==="live"&&this.state.liveStage==="reveal"?PHASE_SECONDS.liveReveal:(PHASE_SECONDS[this.state.phase]||30);
    this.state.deadline=Date.now()+seconds*1000;
  }
  async advance(){
    if(!this.bothDone())return;
    if(this.state.phase==="lobby")this.state.phase="setup";
    else if(this.state.phase==="setup"){
      this.state.phase="draft";this.state.draftStep=0;
      const first=this.draftSlots()[0];
      this.state.offers=this.state.players.map((_,index)=>this.draftOffers(first.line,0,index,first.slot));
    }else if(this.state.phase==="draft"){
      const slots=this.draftSlots();
      if(this.state.draftStep<slots.length-1){
        this.state.draftStep++;
        const next=slots[this.state.draftStep];
        this.state.offers=this.state.players.map((_,index)=>this.draftOffers(next.line,this.state.draftStep,index,next.slot));
      }else{
        this.state.phase="market";
        this.state.offers=this.state.players.map((_,index)=>createMarketOffers(this.state.seed,index));
      }
    }else if(this.state.phase==="market"){this.state.phase="training";this.state.offers=null;}
    else if(this.state.phase==="training"){
      this.state.phase="live";this.state.window=0;this.state.liveStage="decision";this.state.matchMinute=0;this.state.windowResult=null;this.state.offers=null;
    }
    else if(this.state.phase==="live"){
      const home=teamSnapshot(this.state.players[0],this.state.rulesVersion),away=teamSnapshot(this.state.players[1],this.state.rulesVersion);
      const outcome=resolveWindow({seed:this.state.seed,window:this.state.window,home,away,homeTactic:this.state.players[0].tactics[this.state.window],awayTactic:this.state.players[1].tactics[this.state.window]});
      this.state.score[0]+=outcome.homeGoals;this.state.score[1]+=outcome.awayGoals;
      this.state.events.push(...outcome.events);
      this.state.liveStage="reveal";this.state.matchMinute=outcome.endMinute;this.state.windowResult=outcome;
    }
    this.setDeadline();this.persist();await this.ctx.storage.setAlarm(this.state.deadline);this.broadcast();
  }
  async finish(home,away){
    let penalty=null;
    if(this.state.score[0]===this.state.score[1]){
      penalty=resolvePenalty(this.state.seed,home.power,away.power);
    }
    const homeWon=penalty?penalty[0]>penalty[1]:this.state.score[0]>this.state.score[1];
    const draw=!penalty&&this.state.score[0]===this.state.score[1];
    const simulatedOutcomes=draw?["draw","draw"]:(homeWon?["win","loss"]:["loss","win"]);
    const participation=this.state.participationPolicy
      ?resolveParticipation(this.state.players,simulatedOutcomes)
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
      participation:participation.eligible,forfeitIndex:participation.forfeitIndex,voided:participation.voided,
      finishedAt:Date.now()
    };
    this.state.deadline=Date.now()+PHASE_SECONDS.result*1000;this.persist();
    const recorded=await this.recordResult(outcomes);
    if(!recorded)this.state.deadline=Date.now()+10_000;
    await this.ctx.storage.setAlarm(this.state.deadline);this.broadcast();
  }
  async recordResult(outcomes){
    const match=this.state,created=nowIso(),season=seasonKey();
    const existing=await this.env.DB.prepare("SELECT match_id FROM arena_matches WHERE match_id=?").bind(match.matchId).first();
    if(existing){
      await this.attachResultProfiles();
      this.state.resultRecorded=true;this.persist();return true;
    }
    const currentProfiles=await Promise.all(match.players.map(player=>ensureProfile(this.env,player.owner,"")));
    const rulesVersion=match.rulesVersion||(match.participationPolicy?ARENA_RULES_VERSION:"arena-rules-v1");
    const statements=[
      this.env.DB.prepare("INSERT OR IGNORE INTO arena_matches(match_id,rules_version,season_key,home_owner,away_owner,home_score,away_score,result_json,created_at,finished_at) VALUES(?,?,?,?,?,?,?,?,?,?)")
        .bind(match.matchId,rulesVersion,season,match.players[0].owner,match.players[1].owner,match.score[0],match.score[1],JSON.stringify(match.result),new Date(match.createdAt).toISOString(),created)
    ];
    for(let index=0;index<2&&!match.result.voided;index++){
      const player=match.players[index],rating=Number(currentProfiles[index].rating),opponentRating=Number(currentProfiles[index===0?1:0].rating),reward=rewardFor(outcomes[index],rating,opponentRating);
      if(match.result.forfeitIndex===index){reward.seasonPoints=0;reward.tokenProgress=0;}
      statements.push(this.env.DB.prepare("INSERT OR IGNORE INTO arena_match_players(match_id,owner_hash,outcome,rating_before,rating_delta,season_points,token_progress,created_at) VALUES(?,?,?,?,?,?,?,?)")
        .bind(match.matchId,player.owner,outcomes[index],rating,reward.ratingDelta,reward.seasonPoints,reward.tokenProgress,created));
      const win=outcomes[index]==="win"?1:0,draw=outcomes[index]==="draw"?1:0,loss=outcomes[index]==="loss"?1:0,streak=win?1:0;
      statements.push(this.env.DB.prepare("UPDATE arena_profiles SET rating=MAX(700,MIN(1900,rating+?)),season_key=?,season_points=season_points+?,wins=wins+?,draws=draws+?,losses=losses+?,streak=CASE WHEN ?=1 THEN MAX(1,streak+1) ELSE 0 END,token_progress=token_progress+?,updated_at=? WHERE owner_hash=?")
        .bind(reward.ratingDelta,season,reward.seasonPoints,win,draw,loss,streak,reward.tokenProgress,created,player.owner));
    }
    try{
      await this.env.DB.batch(statements);
      for(const player of match.players)await grantCosmetics(this.env,player.owner);
      await this.env.DB.prepare("DELETE FROM arena_presence WHERE owner_hash IN (?,?) AND match_id=?").bind(match.players[0].owner,match.players[1].owner,match.matchId).run();
      await this.attachResultProfiles();
      this.state.resultRecorded=true;this.persist();
      metric(this.env,"match_completed",match.result.voided?"void":outcomes.join("-"),match.score[0]+match.score[1]);
      return true;
    }catch(error){console.error("arena_result_write_failed",match.matchId,error);return false;}
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
    if(data.type==="ready"&&this.state.phase==="lobby"){
      if(player.ready)return "already_submitted";
      player.ready=true;
    }
    else if(data.type==="setup"&&this.state.phase==="setup"){
      if(player.setup)return "already_submitted";
      const choice={...data.choice,chairman:"babacan"};
      if(!validateSetup(choice))return "unavailable_choice";
      player.setup=choice;
    }
    else if(data.type==="draft"&&this.state.phase==="draft"){
      if(player.draft.length>this.state.draftStep)return "already_submitted";
      const offer=this.state.offers[index].find(item=>item.id===data.choice);
      if(!offer||offer.cost>this.remainingBudget(player))return "unavailable_choice";
      player.draft.push(offer);
    }else if(data.type==="market"&&this.state.phase==="market"){
      if(player.market)return "already_submitted";
      const offer=this.state.offers[index].find(item=>item.id===data.choice);
      if(!offer||offer.cost>this.remainingBudget(player))return "unavailable_choice";
      player.market={id:offer.id};
    }else if(data.type==="training"&&this.state.phase==="training"&&TRAINING.includes(data.choice)){
      if(player.training)return "already_submitted";
      player.training=data.choice;
    }
    else if(data.type==="tactic"&&this.state.phase==="live"&&(this.state.liveStage||"decision")==="decision"&&TACTICS.includes(data.choice)){
      if(player.tactics.length>this.state.window)return "already_submitted";
      player.tactics.push(data.choice);
    }
    else return "wrong_phase";
    if(data.type!=="ready")player.manualDecisions=(Number(player.manualDecisions)||0)+1;
    this.persist();await this.advance();if(!this.bothDone())this.broadcast();return "ok";
  }
  async recoverExpired(){
    if(!this.state||this.state.phase==="result"||Date.now()<Number(this.state.deadline||0))return false;
    await this.alarm();
    return true;
  }
  async alarm(){
    if(!this.state)return;
    if(this.state.phase==="result"){
      if(!this.state.resultRecorded){
        const recorded=await this.recordResult(this.state.result.outcomes);
        if(!recorded){this.state.deadline=Date.now()+10_000;this.persist();await this.ctx.storage.setAlarm(this.state.deadline);return;}
        this.state.deadline=Date.now()+PHASE_SECONDS.result*1000;this.persist();await this.ctx.storage.setAlarm(this.state.deadline);
      }
      if(Date.now()>=this.state.deadline)for(const socket of this.ctx.getWebSockets())try{socket.close(1000,"complete");}catch(_){}
      return;
    }
    if(Date.now()<this.state.deadline){await this.ctx.storage.setAlarm(this.state.deadline);return;}
    if(this.state.phase==="live"&&this.state.liveStage==="reveal"){
      if(this.state.window<2){
        this.state.window++;this.state.liveStage="decision";this.state.windowResult=null;this.setDeadline();
        this.persist();await this.ctx.storage.setAlarm(this.state.deadline);this.broadcast();
      }else{
        const home=teamSnapshot(this.state.players[0],this.state.rulesVersion),away=teamSnapshot(this.state.players[1],this.state.rulesVersion);
        await this.finish(home,away);
      }
      return;
    }
    for(let index=0;index<2;index++){
      const player=this.state.players[index];
      const incomplete=
        (this.state.phase==="lobby"&&!player.ready)||
        (this.state.phase==="setup"&&!player.setup)||
        (this.state.phase==="draft"&&player.draft.length<=this.state.draftStep)||
        (this.state.phase==="market"&&!player.market)||
        (this.state.phase==="training"&&!player.training)||
        (this.state.phase==="live"&&player.tactics.length<=this.state.window);
      if(incomplete)this.defaultAction(index);
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
    const player=this.state.players.find(item=>item.owner===attachment.owner);
    if(player){player.connected=false;player.lastSeenAt=Date.now();this.persist();this.broadcastPresence();}
  }
}

async function handleSession(request,env){
  if(!await rateLimit(env,request,"session",8))return json(request,env,{error:"rate_limited"},429);
  const id=await identity(request);if(!id)return json(request,env,{error:"identity_required"},428);
  let data;try{data=await body(request,4096);}catch(error){return json(request,env,{error:error.message==="payload_too_large"?"payload_too_large":"invalid_json"},error.message==="payload_too_large"?413:400);}
  const name=clubName(data.clubName);if(!name)return json(request,env,{error:"invalid_club_name"},422);
  const mode=String(data.mode||"ranked"),region=REGIONS.has(data.region)?data.region:"global";
  if(!MODES.has(mode))return json(request,env,{error:"invalid_mode"},422);
  const row=await ensureProfile(env,id.owner,name);
  await env.DB.prepare("DELETE FROM arena_presence WHERE owner_hash=? AND expires_at<?").bind(id.owner,nowIso()).run();
  const recoverable=await env.DB.prepare("SELECT ticket_hash FROM arena_tickets WHERE owner_hash=? AND consumed_at IS NULL AND expires_at>? LIMIT 1").bind(id.owner,nowIso()).first();
  if(recoverable){
    await env.DB.batch([
      env.DB.prepare("DELETE FROM arena_tickets WHERE owner_hash=? AND consumed_at IS NULL").bind(id.owner),
      env.DB.prepare("DELETE FROM arena_presence WHERE owner_hash=? AND status='queue'").bind(id.owner)
    ]);
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
  const id=await identity(request);if(!id)return json(request,env,{error:"identity_required"},428);
  return json(request,env,{profile:profile(await ensureProfile(env,id.owner,""))});
}
async function handleLeaderboard(request,env,url){
  const season=seasonKey(),requested=Number(url.searchParams.get("limit")),limit=Number.isFinite(requested)&&requested>0?Math.round(clamp(requested,1,50)):25;
  const rows=await env.DB.prepare("SELECT public_id,club_name,rating,season_key,season_points,wins,draws,losses,streak,token_progress,cosmetics FROM arena_profiles WHERE season_key=? ORDER BY rating DESC,season_points DESC,wins DESC LIMIT ?").bind(season,limit).all();
  return json(request,env,{season,entries:(rows.results||[]).map((row,index)=>({...profile(row),rank:index+1}))});
}
async function handleHistory(request,env){
  const id=await identity(request);if(!id)return json(request,env,{error:"identity_required"},428);
  const rows=await env.DB.prepare("SELECT mp.match_id,mp.outcome,mp.rating_before,mp.rating_delta,mp.season_points,mp.token_progress,mp.created_at,m.home_score,m.away_score,m.home_owner FROM arena_match_players mp JOIN arena_matches m ON m.match_id=mp.match_id WHERE mp.owner_hash=? ORDER BY mp.created_at DESC LIMIT 12").bind(id.owner).all();
  return json(request,env,{matches:(rows.results||[]).map(row=>({
    matchId:row.match_id,outcome:row.outcome,ratingBefore:Number(row.rating_before),ratingDelta:Number(row.rating_delta),
    seasonPoints:Number(row.season_points),tokenProgress:Number(row.token_progress),createdAt:row.created_at,
    score:row.home_owner===id.owner?[Number(row.home_score),Number(row.away_score)]:[Number(row.away_score),Number(row.home_score)]
  }))});
}
async function handleDeleteProfile(request,env){
  const id=await identity(request);if(!id)return json(request,env,{error:"identity_required"},428);
  const deletedOwner=`deleted:${randomId("",12)}`;
  await env.DB.batch([
    env.DB.prepare("UPDATE arena_matches SET home_owner=? WHERE home_owner=?").bind(deletedOwner,id.owner),
    env.DB.prepare("UPDATE arena_matches SET away_owner=? WHERE away_owner=?").bind(deletedOwner,id.owner),
    env.DB.prepare("DELETE FROM arena_match_players WHERE owner_hash=?").bind(id.owner),
    env.DB.prepare("DELETE FROM arena_cosmetic_unlocks WHERE owner_hash=?").bind(id.owner),
    env.DB.prepare("DELETE FROM arena_tickets WHERE owner_hash=?").bind(id.owner),
    env.DB.prepare("DELETE FROM arena_presence WHERE owner_hash=?").bind(id.owner),
    env.DB.prepare("DELETE FROM arena_profiles WHERE owner_hash=?").bind(id.owner)
  ]);
  metric(env,"arena_profile_deleted","self_service",1);
  const headers=responseHeaders(request,env);delete headers["content-type"];
  return new Response(null,{status:204,headers});
}
async function handleEvent(request,env){
  if(!await rateLimit(env,request,"event",30))return json(request,env,{error:"rate_limited"},429);
  const id=await identity(request);if(!id)return json(request,env,{error:"identity_required"},428);
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
  const headers=new Headers(request.headers);headers.set("x-arena-owner",ticket.owner_hash);headers.set("x-arena-club",encodeURIComponent(ticket.club_name));headers.set("x-arena-rating",String(ticket.rating));
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
  if(request.method==="POST"&&url.pathname==="/v1/arena/session")return handleSession(request,env);
  if(request.method==="GET"&&url.pathname==="/v1/arena/profile")return handleProfile(request,env);
  if(request.method==="DELETE"&&url.pathname==="/v1/arena/profile")return handleDeleteProfile(request,env);
  if(request.method==="GET"&&url.pathname==="/v1/arena/leaderboard")return handleLeaderboard(request,env,url);
  if(request.method==="GET"&&url.pathname==="/v1/arena/history")return handleHistory(request,env);
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
      env.DB.prepare("DELETE FROM arena_presence WHERE expires_at<?").bind(nowIso())
    ]);
  }
};

export {clubName,identity,profile,route};
