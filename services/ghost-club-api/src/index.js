/* Cloudflare Worker + D1 API for opt-in copa.life Ghost Clubs. */
const MAX_BODY_BYTES=64*1024;
const DEFAULT_ORIGINS=["https://copa.life","https://www.copa.life","https://localhost","capacitor://localhost"];
const METHODS="GET, POST, DELETE, OPTIONS";
const CONSENT_VERSION="ghost-terms-v1";
const LEADERBOARD_CONSENT_VERSION="leaderboard-terms-v1";
const REPORT_REASONS=new Set(["hate","sexual","political","person","trademark","impersonation","other"]);
const ANALYTICS_EVENTS=new Set(["session_started","country_selected","formation_selected","chairman_selected","style_selected","draft_started","xi_completed","match_completed","round_completed","reward_selected","card_acquired","run_finished","ghost_encountered","ghost_opt_in","meta_unlocked","profile_open_error","final_sim_completed","group_draw_started","group_draw_completed","group_draw_skipped","tournament_match_resolved"]);
const ANALYTICS_PLATFORMS=new Set(["web","android","ios"]);
const ANALYTICS_COUNTRIES=new Set(["","TR","IT","ENG","ES","DE","JP"]);
const ANALYTICS_OUTCOMES=new Set(["","win","draw","loss","sacked"]);
const ANALYTICS_DETAILS=new Set(["","load_failed","missing_model","retry_failed"]);
const ANALYTICS_POWER_GAPS=new Set(["","away_12_plus","away_4_11","even","home_4_11","home_12_plus"]);
const ANALYTICS_END_TYPES=new Set(["","regulation","golden_goal","penalties"]);
const ANALYTICS_TACTICS=new Set(["","balanced","more","push","calm","hold"]);
const ANALYTICS_CHAIRMEN=new Set(["","babacan","leydi","pinti","sansasyoncu","torpilci","cilgin"]);
const ANALYTICS_FORMATIONS=new Set(["","4-4-2","4-3-3","4-2-3-1","3-5-2","5-3-2","3-4-3","4-5-1","4-3-2-1","4-1-4-1","3-4-1-2"]);
const ANALYTICS_STYLES=new Set(["","gegen","kontra","tiki","uzun","blok"]);
const ANALYTICS_REWARDS=new Set(["","cash","loan","swap","care"]);
const ANALYTICS_CARD_KINDS=new Set(["","power","final","risk","instant","contract","other"]);
const ANALYTICS_ECONOMY_BANDS=new Set(["","debt_20_plus","debt_10_19","debt_1_9","cash_0_9","cash_10_plus"]);
const ANALYTICS_TOURNAMENT_STAGES=new Set(["","group","quarterfinal","semifinal","final"]);
const ANALYTICS_DRAW_MODES=new Set(["","manual","fast","complete"]);
const ANALYTICS_QUALIFICATION_STATES=new Set(["","yes","no","pending"]);
const GHOST_POSITIONS=new Set(["GK","LB","CB","RB","WB","DM","CM","LM","RM","AM","LW","RW","ST"]);
const GHOST_FORMATIONS=Object.freeze({
  "4-4-2":["GK","LB","CB","CB","RB","LM","CM","CM","RM","ST","ST"],
  "4-3-3":["GK","LB","CB","CB","RB","CM","CM","CM","LW","ST","RW"],
  "4-2-3-1":["GK","LB","CB","CB","RB","DM","DM","LW","AM","RW","ST"],
  "3-5-2":["GK","CB","CB","CB","WB","CM","CM","CM","WB","ST","ST"],
  "5-3-2":["GK","WB","CB","CB","CB","WB","CM","CM","CM","ST","ST"],
  "3-4-3":["GK","CB","CB","CB","LM","CM","CM","RM","LW","ST","RW"],
  "4-5-1":["GK","LB","CB","CB","RB","LM","CM","CM","CM","RM","ST"],
  "4-3-2-1":["GK","LB","CB","CB","RB","CM","CM","CM","LW","RW","ST"],
  "4-1-4-1":["GK","LB","CB","CB","RB","DM","LM","CM","CM","RM","ST"],
  "3-4-1-2":["GK","CB","CB","CB","LM","CM","CM","RM","AM","ST","ST"]
});
const GHOST_CARD_IDS=new Set(["taraftar","genc","ch_momentum","kontra","buyuk_mac","yildiz","otobus","kaleci_kalesi","mac_sozu","anadolu","altyapi_plani","tecrubeli_omurga","yerli_blok","kaptanin_karari","kanat_akini","cift_forvet","derbi","final_provasi","son_dans","taksit_transfer","son_kredi","kara_borsa","sahte_evrak","deplasman_kafilesi","kumarbaz","gecici_prim","kisa_kamp","doping","kriz","kurban_belli","primler_yatinca","vur_igneyi","bu_adam","gec_gec","nasip_kismet","yildiz_krizi","kasiga_para"]);

const clean=value=>String(value==null?"":value).replace(/[<>]/g,"").replace(/\s+/g," ").trim().slice(0,400);
const range=(value,min,max)=>Math.max(min,Math.min(max,Number(value)||0));
const object=value=>!!value&&typeof value==="object"&&!Array.isArray(value);
const allowedOrigins=env=>new Set(String(env.ALLOWED_ORIGINS||DEFAULT_ORIGINS.join(",")).split(",").map(value=>value.trim()).filter(Boolean));
const originAllowed=(request,env)=>{const origin=request.headers.get("origin");return !origin||allowedOrigins(env).has(origin);};
const headers=(request,env)=>{
  const origin=request.headers.get("origin"),result={"access-control-allow-methods":METHODS,"access-control-allow-headers":"content-type, x-copa-client, x-copa-consent-version, x-copa-leaderboard-consent-version, x-copa-delete-token","cache-control":"no-store","content-type":"application/json; charset=utf-8","vary":"origin"};
  if(origin&&allowedOrigins(env).has(origin))result["access-control-allow-origin"]=origin;
  return result;
};
const json=(request,env,body,status=200)=>new Response(JSON.stringify(body),{status,headers:headers(request,env)});
const clientKey=request=>{const value=String(request.headers.get("x-copa-client")||"");return /^GCL-[A-Z0-9]{8,40}$/.test(value)?value:"GCL-ANONYMOUS";};
const deleteToken=request=>{const value=String(request.headers.get("x-copa-delete-token")||"");return /^GDT-[A-Z0-9]{16,80}$/.test(value)?value:"";};
const requestKey=request=>{const ip=clean(request.headers.get("cf-connecting-ip")||"");return ip?`ip:${ip}`:`client:${clientKey(request)}`;};

class PayloadTooLargeError extends Error{constructor(){super("payload_too_large");this.name="PayloadTooLargeError";}}
async function readJsonLimited(request,limit=MAX_BODY_BYTES){
  const declared=Number(request.headers.get("content-length")||0);if(declared>limit)throw new PayloadTooLargeError();if(!request.body)throw new SyntaxError("empty_body");
  const reader=request.body.getReader(),decoder=new TextDecoder();let total=0,text="";
  try{while(true){const {done,value}=await reader.read();if(done)break;total+=value.byteLength;if(total>limit){await reader.cancel();throw new PayloadTooLargeError();}text+=decoder.decode(value,{stream:true});}text+=decoder.decode();}finally{reader.releaseLock();}
  return JSON.parse(text);
}

function normalizeAnalyticsEvent(value){
  if(!object(value)||![1,2,3,4].includes(Number(value.schema_version)))return null;
  const schemaVersion=Number(value.schema_version);
  const event=String(value.event||"");if(!ANALYTICS_EVENTS.has(event))return null;
  if(event==="final_sim_completed"&&schemaVersion<2)return null;
  const platform=String(value.platform||"");if(!ANALYTICS_PLATFORMS.has(platform))return null;
  const locale=String(value.locale||"").toLowerCase();if(!/^[a-z]{2}(?:-[a-z]{2})?$/.test(locale))return null;
  const gameCountry=String(value.game_country||"").toUpperCase();if(!ANALYTICS_COUNTRIES.has(gameCountry))return null;
  const outcome=String(value.outcome||"");if(!ANALYTICS_OUTCOMES.has(outcome))return null;
  const detail=String(value.detail||"");if(!ANALYTICS_DETAILS.has(detail))return null;
  const round=Math.max(0,Math.min(6,Math.round(Number(value.round)||0)));
  const pagePath=String(value.page_path||"/");if(!/^\/[A-Za-z0-9._/-]{0,63}$/.test(pagePath))return null;
  const appVersion=String(value.app_version||"");if(appVersion&&!/^[A-Za-z0-9._-]{1,64}$/.test(appVersion))return null;
  if(schemaVersion===1)return {event,platform,locale,gameCountry,outcome,detail,round,pagePath,appVersion};
  const modelVersion=String(value.model_version||"");if(modelVersion&&!/^copa-final-core-v[0-9]{1,3}$/.test(modelVersion))return null;
  const powerGap=String(value.power_gap||"");if(!ANALYTICS_POWER_GAPS.has(powerGap))return null;
  const endType=String(value.end_type||"");if(!ANALYTICS_END_TYPES.has(endType))return null;
  const tactic=String(value.tactic||"");if(!ANALYTICS_TACTICS.has(tactic))return null;
  if(event==="final_sim_completed"&&(!modelVersion||!powerGap||!endType||!tactic))return null;
  if(schemaVersion===2)return {event,platform,locale,gameCountry,outcome,detail,round,pagePath,appVersion,schemaVersion,modelVersion,powerGap,endType,tactic};
  const chairman=String(value.chairman||"");if(!ANALYTICS_CHAIRMEN.has(chairman))return null;
  const formation=String(value.formation||"");if(!ANALYTICS_FORMATIONS.has(formation))return null;
  const style=String(value.style||"");if(!ANALYTICS_STYLES.has(style))return null;
  const reward=String(value.reward||"");if(!ANALYTICS_REWARDS.has(reward))return null;
  const cardKind=String(value.card_kind||"");if(!ANALYTICS_CARD_KINDS.has(cardKind))return null;
  const economyBand=String(value.economy_band||"");if(!ANALYTICS_ECONOMY_BANDS.has(economyBand))return null;
  if(schemaVersion===3)return {event,platform,locale,gameCountry,outcome,detail,round,pagePath,appVersion,schemaVersion,modelVersion,powerGap,endType,tactic,chairman,formation,style,reward,cardKind,economyBand};
  const tournamentStage=String(value.tournament_stage||"");if(!ANALYTICS_TOURNAMENT_STAGES.has(tournamentStage))return null;
  const drawMode=String(value.draw_mode||"");if(!ANALYTICS_DRAW_MODES.has(drawMode))return null;
  const qualification=String(value.qualification||"");if(!ANALYTICS_QUALIFICATION_STATES.has(qualification))return null;
  const groupMatchday=Math.max(0,Math.min(3,Math.round(Number(value.group_matchday)||0)));
  return {event,platform,locale,gameCountry,outcome,detail,round,pagePath,appVersion,schemaVersion,modelVersion,powerGap,endType,tactic,chairman,formation,style,reward,cardKind,economyBand,tournamentStage,drawMode,qualification,groupMatchday};
}

async function handleAnalytics(request,env){
  if(env.PRODUCT_ANALYTICS_LIMITER){const outcome=await env.PRODUCT_ANALYTICS_LIMITER.limit({key:requestKey(request)});if(!outcome.success)return json(request,env,{error:"rate_limited"},429);}
  let body;try{body=await readJsonLimited(request,4096);}catch(error){if(error instanceof PayloadTooLargeError)return json(request,env,{error:"payload_too_large"},413);return json(request,env,{error:"invalid_json"},400);}
  const event=normalizeAnalyticsEvent(body);if(!event)return json(request,env,{error:"invalid_analytics_event"},422);
  if(!env.PRODUCT_ANALYTICS)return json(request,env,{error:"analytics_unavailable"},503);
  /* copa_life_product_events: blob1..20 below; double1=count, double2=round,
     double3=schema version, double4=group matchday. No user/session index is written. */
  env.PRODUCT_ANALYTICS.writeDataPoint({
    blobs:[
      event.event,event.platform,event.locale,event.gameCountry,event.outcome,event.detail,event.pagePath,event.appVersion,
      event.modelVersion||"",event.powerGap||"",event.endType||"",event.tactic||"",String(event.schemaVersion||1),
      event.chairman||"",event.formation||"",event.style||"",event.reward||"",event.cardKind||"",event.economyBand||"",
      [event.tournamentStage||"",event.drawMode||"",event.qualification||""].join("|")
    ],
    doubles:[1,event.round,event.schemaVersion||1,event.groupMatchday||0]
  });
  const responseHeaders=headers(request,env);delete responseHeaders["content-type"];
  return new Response(null,{status:204,headers:responseHeaders});
}

const validClubName=value=>{
  const raw=String(value==null?"":value);if(/[\p{Cc}\p{Cf}\p{Cs}\p{Co}\p{Zl}\p{Zp}]/u.test(raw))return false;
  const name=raw.normalize("NFKC").replace(/\u2019/g,"'").replace(/[ ]+/g," ").trim();if(Array.from(name).length<2||Array.from(name).length>29)return false;
  if(/[\p{Cc}\p{Cf}\p{Cs}\p{Co}\p{Zl}\p{Zp}\p{M}]/u.test(name))return false;
  if(!/^[\p{Script=Latin}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}\p{N} .&'\-\u30fb]+$/u.test(name))return false;
  const alnum=/[\p{Script=Latin}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}\p{N}]/u,chars=Array.from(name);return alnum.test(chars[0])&&alnum.test(chars[chars.length-1])&&chars.filter(char=>alnum.test(char)).length>=2;
};
function moderationText(value){return String(value||"").normalize("NFKD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("en-US").replace(/[013457@$]/g,char=>({0:"o",1:"i",3:"e",4:"a",5:"s",7:"t","@":"a","$":"s"})[char]||char).replace(/[^a-z0-9\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]+/gu," ").trim();}
function moderateClubName(value){
  if(!validClubName(value))return {status:"blocked",reason:"invalid_name"};
  const text=moderationText(value),compact=text.replace(/\s+/g,"");
  const prohibited=[/\b(?:hitler|nazi|isis|kkk)\b/,/\b(?:porn|porno|sex|seks|xxx|hentai)\b/,/\b(?:kill all|oldurun|nefret)\b/,/\b(?:official|resmi|gercek hesap|real account)\b/];
  const reserved=["galatasaray","fenerbahce","besiktas","trabzonspor","realmadrid","barcelona","manchesterunited","manchestercity","liverpool","arsenal","chelsea","juventus","intermilan","acmilan","bayernmunich","borussiadortmund","uefa","fifa","google","apple","openai"];
  if(prohibited.some(pattern=>pattern.test(text)))return {status:"blocked",reason:"prohibited_content"};
  if(reserved.some(term=>compact===term||compact.startsWith(term+"fc")||compact.endsWith(term)))return {status:"review",reason:"brand_or_impersonation"};
  const review=[/\b(?:president|prime minister|cumhurbaskani|basbakan|party|partisi|senator|minister|bakan)\b/,/\b(?:inc|corp|ltd|company|sirketi)\b/];
  return review.some(pattern=>pattern.test(text))?{status:"review",reason:"identity_or_political"}:{status:"eligible",reason:""};
}

const validPlayer=player=>object(player)&&typeof player.name==="string"&&player.name.trim().length>0&&player.name.length<=72&&GHOST_POSITIONS.has(player.pos)&&Number.isInteger(Number(player.power))&&Number(player.power)>=35&&Number(player.power)<=99;
const positionKey=players=>players.map(player=>player.pos).sort().join("|");
const playerKey=player=>[player.name,player.pos,Number(player.power)].join("|");
function validHistory(snapshot){
  if(!Array.isArray(snapshot.match_history)||snapshot.match_history.length!==6)return false;
  const reached=Number(snapshot.reached_round),result=object(snapshot.result)?snapshot.result:{};
  if(typeof result.won!=="boolean"||typeof result.end_type!=="string"||result.end_type.length>24||typeof result.score!=="string"||result.score.length>32)return false;
  const groupFormat=object(snapshot.tournament)&&snapshot.tournament.format==="groups16_v1";
  let played=0;
  for(let index=0;index<snapshot.match_history.length;index++){
    const match=snapshot.match_history[index];
    if(!object(match)||typeof match.opponent!=="string"||match.opponent.length>72||!["","W","L","D"].includes(String(match.result||"")))return false;
    if(!Number.isInteger(Number(match.gf))||Number(match.gf)<0||Number(match.gf)>20||!Number.isInteger(Number(match.ga))||Number(match.ga)<0||Number(match.ga)>20)return false;
    if(match.penalty!=null&&(!Array.isArray(match.penalty)||match.penalty.length!==2||match.penalty.some(value=>!Number.isInteger(Number(value))||Number(value)<0||Number(value)>20)||Number(match.penalty[0])===Number(match.penalty[1])))return false;
    if(match.result)played++;
    if(!groupFormat&&index<reached-1&&match.result!=="W")return false;
    if(index>=reached&&match.result)return false;
  }
  if(groupFormat){
    const tournament=snapshot.tournament,group=object(tournament.group)?tournament.group:{};
    if(played!==reached||reached<3||!["A","B","C","D"].includes(group.id)||!Number.isInteger(Number(group.rank))||group.rank<1||group.rank>4||!Number.isInteger(Number(group.points))||group.points<0||group.points>9||!Number.isInteger(Number(group.gd))||group.gd<-60||group.gd>60||typeof group.qualified!=="boolean")return false;
    for(let index=0;index<reached;index++){
      const match=snapshot.match_history[index],expectedStage=index<3?"group":index===3?"quarterfinal":index===4?"semifinal":"final";
      if(match.stage!==expectedStage)return false;
      if(index<3){if(match.penalty||match.result==="W"&&Number(match.gf)<=Number(match.ga)||match.result==="D"&&Number(match.gf)!==Number(match.ga)||match.result==="L"&&Number(match.gf)>=Number(match.ga))return false;}
      else{
        if(match.result==="D"||Number(match.gf)===Number(match.ga)&&!match.penalty)return false;
        const playerWon=Number(match.gf)>Number(match.ga)||Number(match.gf)===Number(match.ga)&&Number(match.penalty[0])>Number(match.penalty[1]);
        if(match.result!==(playerWon?"W":"L"))return false;
      }
    }
    const groupMatches=snapshot.match_history.slice(0,3),expectedPoints=groupMatches.reduce((sum,match)=>sum+(match.result==="W"?3:match.result==="D"?1:0),0),expectedGd=groupMatches.reduce((sum,match)=>sum+Number(match.gf)-Number(match.ga),0);
    if(group.points!==expectedPoints||group.gd!==expectedGd||group.qualified!==(group.rank<=2))return false;
    if(result.end_type==="sacked")return !result.won;
    if(result.end_type==="group_eliminated")return !result.won&&reached===3&&!group.qualified&&group.rank>=3;
    if(!group.qualified||group.rank>2)return false;
    for(let index=3;index<reached-1;index++)if(snapshot.match_history[index].result!=="W")return false;
    const terminal=snapshot.match_history[reached-1];
    return result.won?reached===6&&terminal.result==="W":reached>=4&&terminal.result==="L";
  }
  const terminal=snapshot.match_history[reached-1];
  if(result.end_type==="sacked")return !result.won;
  if(!terminal||!["W","L"].includes(terminal.result))return false;
  return result.won?reached===6&&terminal.result==="W":terminal.result==="L";
}
function valid(snapshot,{requirePublicId=false}={}){
  if(!object(snapshot)||snapshot.schema_version!==1)return false;if(typeof snapshot.game_version!=="string"||!snapshot.game_version||snapshot.game_version.length>32)return false;if(typeof snapshot.data_version!=="string"||!snapshot.data_version||snapshot.data_version.length>32)return false;
  if(typeof snapshot.simulation_version!=="string"||!/^copa-final-core-v[0-9]{1,3}$/.test(snapshot.simulation_version))return false;if(typeof snapshot.card_schema_version!=="string"||!snapshot.card_schema_version||snapshot.card_schema_version.length>32)return false;
  if(requirePublicId&&!/^G-[A-Z0-9]{8,32}$/.test(String(snapshot.public_ghost_id||"")))return false;if(!Array.isArray(snapshot.starting_xi)||snapshot.starting_xi.length!==11||snapshot.starting_xi.some(player=>!validPlayer(player)))return false;
  if(!GHOST_FORMATIONS[snapshot.formation]||positionKey(snapshot.starting_xi)!==GHOST_FORMATIONS[snapshot.formation].slice().sort().join("|"))return false;
  if(new Set(snapshot.starting_xi.map(playerKey)).size!==11)return false;
  if(snapshot.squad!=null&&(!Array.isArray(snapshot.squad)||snapshot.squad.length<11||snapshot.squad.length>18||snapshot.squad.some(player=>!validPlayer(player))||snapshot.starting_xi.some((player,index)=>playerKey(player)!==playerKey(snapshot.squad[index]))))return false;if(snapshot.bench!=null&&(!Array.isArray(snapshot.bench)||snapshot.bench.length>7||snapshot.bench.some(player=>!validPlayer(player))))return false;
  if(!Number.isFinite(Number(snapshot.squad_power))||snapshot.squad_power<35||snapshot.squad_power>115)return false;if(!Number.isFinite(Number(snapshot.cash))||snapshot.cash<-100||snapshot.cash>250)return false;if(!Number.isInteger(Number(snapshot.reached_round))||snapshot.reached_round<1||snapshot.reached_round>6)return false;
  if(!Array.isArray(snapshot.active_cards)||snapshot.active_cards.length>35||snapshot.active_cards.some(card=>!object(card)||!GHOST_CARD_IDS.has(card.id)||(card.tier!=="COMMON"&&card.tier!=="DARK"))||new Set(snapshot.active_cards.map(card=>card.id)).size!==snapshot.active_cards.length)return false;
  const average=Math.round(snapshot.starting_xi.reduce((sum,player)=>sum+Number(player.power),0)/11),maxPower=Math.min(115,average+20+Math.min(40,snapshot.active_cards.length*10));
  if(Number(snapshot.squad_power)<average-25||Number(snapshot.squad_power)>maxPower)return false;
  if(!object(snapshot.club)||!ANALYTICS_COUNTRIES.has(String(snapshot.club.country||""))||!object(snapshot.chairman)||!ANALYTICS_CHAIRMEN.has(String(snapshot.chairman.id||"")))return false;
  return validHistory(snapshot)&&validClubName(snapshot.club.name);
}
const publicId=()=>"G-"+crypto.randomUUID().replace(/-/g,"").slice(0,16).toUpperCase();
async function hashText(value){const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(String(value)));return Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,"0")).join("");}
async function integrityFor(snapshot){const canonical=Object.assign({},snapshot);delete canonical.integrity;return"sha256:"+await hashText(JSON.stringify(canonical));}
async function clientHash(request){return hashText("client:"+clientKey(request));}
async function ownerHash(request){const token=deleteToken(request);return token?hashText("owner:"+token):"";}
async function clientState(env,hash){return await env.GHOSTS.prepare("SELECT status, violation_count FROM ghost_clients WHERE client_hash=?").bind(hash).first();}
function registerClientStatement(env,hash,violation=false){const now=new Date().toISOString();return env.GHOSTS.prepare("INSERT INTO ghost_clients (client_hash, status, violation_count, created_at, updated_at, last_violation_at) VALUES (?, 'active', ?, ?, ?, ?) ON CONFLICT(client_hash) DO UPDATE SET violation_count=violation_count+excluded.violation_count, status=CASE WHEN violation_count+excluded.violation_count>=3 THEN 'blocked' ELSE status END, updated_at=excluded.updated_at, last_violation_at=CASE WHEN excluded.violation_count>0 THEN excluded.last_violation_at ELSE last_violation_at END").bind(hash,violation?1:0,now,now,violation?now:null);}
async function registerClient(env,hash,violation=false){await registerClientStatement(env,hash,violation).run();}

async function handlePost(request,env){
  if(env.GHOST_WRITE_LIMITER){const outcome=await env.GHOST_WRITE_LIMITER.limit({key:requestKey(request)});if(!outcome.success)return json(request,env,{error:"rate_limited"},429);}
  if(request.headers.get("x-copa-consent-version")!==CONSENT_VERSION)return json(request,env,{error:"consent_required",consent_version:CONSENT_VERSION},428);
  const token=deleteToken(request);if(!token)return json(request,env,{error:"deletion_token_required"},428);
  const [owner,client]=await Promise.all([hashText("owner:"+token),clientHash(request)]),state=await clientState(env,client);if(state&&state.status==="blocked")return json(request,env,{error:"client_blocked"},403);
  let snapshot;try{snapshot=await readJsonLimited(request);}catch(error){if(error instanceof PayloadTooLargeError)return json(request,env,{error:"payload_too_large"},413);return json(request,env,{error:"invalid_json"},400);}
  if(!valid(snapshot))return json(request,env,{error:"invalid_ghost"},422);
  const moderation=moderateClubName(snapshot.club&&snapshot.club.name);if(moderation.status==="blocked"){await registerClient(env,client,true);return json(request,env,{error:"club_name_blocked",reason:moderation.reason},422);}
  const now=new Date().toISOString(),eligibleUntil=new Date(Date.now()+45*24*60*60*1000).toISOString(),stored=Object.assign({},snapshot,{public_ghost_id:publicId(),created_at:now,eligible_until:eligibleUntil});stored.integrity=await integrityFor(stored);
  await env.GHOSTS.batch([
    registerClientStatement(env,client,false),
    env.GHOSTS.prepare("INSERT INTO ghost_runs (public_id, game_version, data_version, reached_round, squad_power, country, created_at, eligible_until, snapshot, integrity, status, owner_hash, client_hash, consent_version, moderation_reason) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(stored.public_ghost_id,stored.game_version,stored.data_version,Math.round(range(stored.reached_round,1,6)),Math.round(range(stored.squad_power,35,115)),clean(stored.club&&stored.club.country),now,eligibleUntil,JSON.stringify(stored),stored.integrity,moderation.status,owner,client,CONSENT_VERSION,moderation.reason||null)
  ]);
  return json(request,env,{ok:true,id:stored.public_ghost_id,integrity:stored.integrity,status:moderation.status,eligible_until:eligibleUntil},201);
}

async function handleMatch(request,env,url){
  if(env.GHOST_READ_LIMITER){const outcome=await env.GHOST_READ_LIMITER.limit({key:requestKey(request)});if(!outcome.success)return json(request,env,{error:"rate_limited"},429);}
  const power=Math.round(range(url.searchParams.get("power"),35,115)),round=Math.round(range(url.searchParams.get("round"),1,6)),simulationVersion=clean(url.searchParams.get("simulation_version")),cardSchemaVersion=clean(url.searchParams.get("card_schema_version"));
  if(!/^copa-final-core-v[0-9]{1,3}$/.test(simulationVersion)||!cardSchemaVersion)return json(request,env,{ghost:null},400);
  const rows=await env.GHOSTS.prepare("SELECT public_id, snapshot FROM ghost_runs WHERE status='eligible' AND eligible_until > ? AND json_extract(snapshot,'$.simulation_version')=? AND json_extract(snapshot,'$.card_schema_version')=? AND reached_round BETWEEN ? AND ? AND squad_power BETWEEN ? AND ? ORDER BY ABS(squad_power-?) ASC, created_at DESC LIMIT 60").bind(new Date().toISOString(),simulationVersion,cardSchemaVersion,Math.max(1,round-1),Math.min(6,round+1),Math.max(35,power-8),Math.min(115,power+8),power).all();
  const excluded=new Set((url.searchParams.get("exclude")||"").split(",").filter(id=>/^G-[A-Z0-9]{8,32}$/.test(id)).slice(0,64));
  const candidates=(rows.results||[]).flatMap(row=>{
    if(excluded.has(row.public_id))return [];
    try{const ghost=JSON.parse(row.snapshot);return valid(ghost,{requirePublicId:true})&&ghost.simulation_version===simulationVersion&&ghost.card_schema_version===cardSchemaVersion?[ghost]:[];}catch(_){return[];}
  });
  if(!candidates.length)return json(request,env,{ghost:null});
  const bytes=new Uint32Array(1);crypto.getRandomValues(bytes);return json(request,env,{ghost:candidates[bytes[0]%candidates.length]});
}

const seasonKey=(date=new Date())=>date.toISOString().slice(0,7);
const publicClubId=()=>"C-"+crypto.randomUUID().replace(/-/g,"").slice(0,16).toUpperCase();
function careerLevel(reputation){
  const value=Math.max(0,Math.round(Number(reputation)||0));
  let level=1;
  while(level<1000){
    const n=level,nextThreshold=n*80+n*(n-1)*10;
    if(value<nextThreshold)break;
    level++;
  }
  return level;
}
function detectSchemaVersion(tables){
  if(!tables||Number(tables.ghost_runs)!==1)return 0;
  if(Number(tables.ghost_reports)!==1||Number(tables.ghost_clients)!==1)return 1;
  if(Number(tables.club_profiles)!==1||Number(tables.career_runs)!==1)return 2;
  return 3;
}
function normalizeCareerRun(value){
  if(!object(value)||Number(value.schema_version)!==1||value.cheat_run===true)return null;
  const runId=String(value.run_id||"").toLowerCase();
  if(!/^run-[a-z0-9]{4,40}$/.test(runId))return null;
  const club=object(value.club)?value.club:{},country=String(club.country||"").toUpperCase();
  if(!validClubName(club.name)||!ANALYTICS_COUNTRIES.has(country)||!country)return null;
  const reached=Math.round(Number(value.reached_round)||0),result=object(value.result)?value.result:{};
  const history=Array.isArray(value.match_history)?value.match_history:[];
  const historySnapshot={reached_round:reached,result,match_history:history,tournament:value.tournament};
  if(!validHistory(historySnapshot))return null;
  const played=history.filter(match=>match&&["W","L","D"].includes(String(match.result||""))).length;
  const wins=history.filter(match=>match&&match.result==="W").length;
  const draws=history.filter(match=>match&&match.result==="D").length;
  if(played<1||played>6||wins+draws>played)return null;
  const champion=!!result.won&&reached===6;
  return {runId,clubName:String(club.name).trim(),country,reached,result,history,played,wins,draws,champion};
}
function publicProfile(row,rank=0){
  if(!row)return null;
  return {
    rank:Number(rank||row.rank)||0,
    public_club_id:row.public_club_id,
    club_name:row.club_name,
    country:row.country,
    career_level:careerLevel(Number(row.lifetime_reputation)||0),
    lifetime_reputation:Number(row.lifetime_reputation)||0,
    season_score:Number(row.season_score)||0,
    total_runs:Number(row.total_runs)||0,
    total_champions:Number(row.total_champions)||0,
    total_finals:Number(row.total_finals)||0
  };
}
function publicRanking(rows){
  let rank=0,lastScore=null;
  return (rows||[]).map(row=>{
    const score=Number(row.season_score)||0;
    if(lastScore===null||score!==lastScore){rank++;lastScore=score;}
    return publicProfile(row,rank);
  });
}
async function handleLeaderboardPost(request,env){
  if(env.GHOST_WRITE_LIMITER){const outcome=await env.GHOST_WRITE_LIMITER.limit({key:requestKey(request)});if(!outcome.success)return json(request,env,{error:"rate_limited"},429);}
  if(request.headers.get("x-copa-leaderboard-consent-version")!==LEADERBOARD_CONSENT_VERSION)return json(request,env,{error:"consent_required",consent_version:LEADERBOARD_CONSENT_VERSION},428);
  const owner=await ownerHash(request);if(!owner)return json(request,env,{error:"deletion_token_required"},428);
  let body;try{body=await readJsonLimited(request,16384);}catch(error){if(error instanceof PayloadTooLargeError)return json(request,env,{error:"payload_too_large"},413);return json(request,env,{error:"invalid_json"},400);}
  const run=normalizeCareerRun(body);if(!run)return json(request,env,{error:"invalid_career_run"},422);
  const moderation=moderateClubName(run.clubName);if(moderation.status==="blocked")return json(request,env,{error:"club_name_blocked",reason:moderation.reason},422);
  const now=new Date().toISOString(),season=seasonKey(new Date());
  const baseReputation=10+run.played*6+run.wins*4+run.draws*2+(run.champion?25:0);
  const inserted=await env.GHOSTS.prepare("INSERT OR IGNORE INTO career_runs (owner_hash,run_id,season_key,reputation,reached_round,wins,champion,created_at) VALUES (?,?,?,?,?,?,?,?)").bind(owner,run.runId,season,baseReputation,run.reached,run.wins,run.champion?1:0,now).run();
  if(!(Number(inserted.meta&&inserted.meta.changes)||0)){
    const duplicate=await env.GHOSTS.prepare("SELECT * FROM club_profiles WHERE owner_hash=?").bind(owner).first();
    return json(request,env,{ok:true,duplicate:true,season,profile:publicProfile(duplicate)},200);
  }
  const profileAndBest=await env.GHOSTS.batch([env.GHOSTS.prepare(`INSERT INTO club_profiles
    (owner_hash,public_club_id,club_name,country,status,best_round,lifetime_reputation,career_level,total_runs,total_champions,total_finals,season_key,season_score,created_at,updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(owner_hash) DO NOTHING`).bind(
      owner,publicClubId(),run.clubName,run.country,moderation.status,0,0,1,0,0,0,season,0,now,now
    ),env.GHOSTS.prepare(`UPDATE club_profiles SET
    club_name=?,country=?,status=?,best_round=?,lifetime_reputation=lifetime_reputation+?,
    total_runs=total_runs+1,total_champions=total_champions+?,total_finals=total_finals+?,
    season_key=?,updated_at=?
    WHERE owner_hash=? AND best_round<?`).bind(
      run.clubName,run.country,moderation.status,run.reached,baseReputation+10,
      run.champion?1:0,run.reached>=6?1:0,season,now,owner,run.reached
    )]);
  const personalBest=profileAndBest[1];
  const earnedPersonalBest=(Number(personalBest.meta&&personalBest.meta.changes)||0)>0;
  const reputation=baseReputation+(earnedPersonalBest?10:0);
  const updateAndLifetime=await env.GHOSTS.batch(earnedPersonalBest?[
    env.GHOSTS.prepare("UPDATE career_runs SET reputation=? WHERE owner_hash=? AND run_id=?").bind(reputation,owner,run.runId),
    env.GHOSTS.prepare("SELECT lifetime_reputation FROM club_profiles WHERE owner_hash=?").bind(owner)
  ]:[
    env.GHOSTS.prepare(`UPDATE club_profiles SET
      club_name=?,country=?,status=?,best_round=MAX(best_round,?),lifetime_reputation=lifetime_reputation+?,
      total_runs=total_runs+1,total_champions=total_champions+?,total_finals=total_finals+?,
      season_key=?,updated_at=?
      WHERE owner_hash=?`).bind(
        run.clubName,run.country,moderation.status,run.reached,baseReputation,
        run.champion?1:0,run.reached>=6?1:0,season,now,owner
      ),
    env.GHOSTS.prepare("SELECT lifetime_reputation FROM club_profiles WHERE owner_hash=?").bind(owner)
  ]);
  const updated=updateAndLifetime[1]&&updateAndLifetime[1].results&&updateAndLifetime[1].results[0];
  const lifetime=Number(updated&&updated.lifetime_reputation)||reputation;
  const profile=await env.GHOSTS.prepare(`UPDATE club_profiles SET
    career_level=MAX(career_level,?),
    season_key=?,
    season_score=(
      SELECT COALESCE(SUM(reputation),0) FROM (
        SELECT reputation FROM career_runs
        WHERE owner_hash=? AND season_key=?
        ORDER BY reputation DESC,created_at ASC
        LIMIT 10
      )
    ),
    updated_at=?
    WHERE owner_hash=?
    RETURNING *`).bind(careerLevel(lifetime),season,owner,season,now,owner).first();
  return json(request,env,{ok:true,duplicate:false,season,reputation,profile:publicProfile(profile)},201);
}
async function handleLeaderboardGet(request,env,url,me=false){
  if(env.GHOST_READ_LIMITER){const outcome=await env.GHOST_READ_LIMITER.limit({key:requestKey(request)});if(!outcome.success)return json(request,env,{error:"rate_limited"},429);}
  const season=seasonKey(new Date()),limit=Math.max(10,Math.min(100,Math.round(Number(url.searchParams.get("limit"))||100)));
  const rankingSql=`WITH ranked AS (
    SELECT *,DENSE_RANK() OVER (ORDER BY season_score DESC) AS rank
    FROM club_profiles WHERE status='eligible' AND season_key=? AND season_score>0
  )`;
  if(me){
    const owner=await ownerHash(request);if(!owner)return json(request,env,{error:"deletion_token_required"},428);
    const results=await env.GHOSTS.batch([
      env.GHOSTS.prepare("SELECT * FROM club_profiles WHERE owner_hash=?").bind(owner),
      env.GHOSTS.prepare(`${rankingSql},
        mine AS (SELECT rank FROM ranked WHERE owner_hash=?)
        SELECT ranked.* FROM ranked,mine
        WHERE ranked.rank BETWEEN MAX(1,mine.rank-2) AND mine.rank+2
        ORDER BY ranked.rank,ranked.public_club_id`).bind(season,owner)
    ]);
    const stored=results[0]&&results[0].results&&results[0].results[0];
    if(!stored)return json(request,env,{season,profile:null,nearby:[]});
    const nearbyRows=results[1]&&Array.isArray(results[1].results)?results[1].results:[],mine=nearbyRows.find(row=>row.owner_hash===owner);
    if(!mine)return json(request,env,{season,profile:publicProfile({...stored,rank:0,season_score:stored.season_key===season?stored.season_score:0}),nearby:[]});
    return json(request,env,{season,profile:publicProfile(mine),nearby:nearbyRows.map(row=>publicProfile(row))});
  }
  const rows=await env.GHOSTS.prepare("SELECT * FROM club_profiles WHERE status='eligible' AND season_key=? AND season_score>0 ORDER BY season_score DESC LIMIT ?").bind(season,limit).all();
  return json(request,env,{season,clubs:publicRanking(rows.results)});
}
async function handleLeaderboardDelete(request,env){
  const owner=await ownerHash(request);if(!owner)return json(request,env,{error:"deletion_token_required"},428);
  const results=await env.GHOSTS.batch([
    env.GHOSTS.prepare("DELETE FROM career_runs WHERE owner_hash=?").bind(owner),
    env.GHOSTS.prepare("DELETE FROM club_profiles WHERE owner_hash=?").bind(owner)
  ]);
  return json(request,env,{ok:true,deleted:results.reduce((sum,result)=>sum+(Number(result.meta&&result.meta.changes)||0),0)});
}

async function handleReport(request,env,publicIdValue){
  if(!/^G-[A-Z0-9]{8,32}$/.test(publicIdValue))return json(request,env,{error:"invalid_ghost_id"},400);
  if(env.GHOST_REPORT_LIMITER){const outcome=await env.GHOST_REPORT_LIMITER.limit({key:requestKey(request)});if(!outcome.success)return json(request,env,{error:"rate_limited"},429);}
  if(clientKey(request)==="GCL-ANONYMOUS")return json(request,env,{error:"client_required"},428);
  let body;try{body=await readJsonLimited(request,4096);}catch(_){return json(request,env,{error:"invalid_json"},400);}
  const reason=String(body&&body.reason||"").toLowerCase(),details=clean(body&&body.details||"");if(!REPORT_REASONS.has(reason))return json(request,env,{error:"invalid_report_reason"},422);
  const [client,reporter]=await Promise.all([clientHash(request),hashText("reporter:"+requestKey(request))]),row=await env.GHOSTS.prepare("SELECT public_id, client_hash, status FROM ghost_runs WHERE public_id=?").bind(publicIdValue).first();if(!row)return json(request,env,{error:"not_found"},404);
  if(row.client_hash&&row.client_hash===client)return json(request,env,{error:"self_report_not_allowed"},409);
  const now=new Date().toISOString(),reportId="R-"+crypto.randomUUID().replace(/-/g,"").slice(0,20).toUpperCase(),results=await env.GHOSTS.batch([
    env.GHOSTS.prepare("INSERT OR IGNORE INTO ghost_reports (report_id, public_id, reporter_hash, reason, details, created_at) VALUES (?, ?, ?, ?, ?, ?)").bind(reportId,publicIdValue,reporter,reason,details,now),
    env.GHOSTS.prepare("SELECT COUNT(*) AS total FROM ghost_reports WHERE public_id=?").bind(publicIdValue),
    env.GHOSTS.prepare("UPDATE ghost_runs SET status=CASE WHEN (SELECT COUNT(*) FROM ghost_reports WHERE public_id=?)>=3 THEN 'review' ELSE 'eligible' END, reviewed_at=NULL WHERE public_id=? AND status!='blocked'").bind(publicIdValue,publicIdValue)
  ]);
  const countRow=results[1]&&results[1].results&&results[1].results[0],count=Number(countRow&&countRow.total)||0,nextStatus=count>=3?"review":"eligible";
  return json(request,env,{ok:true,status:nextStatus,report_count:count},201);
}

async function handleDelete(request,env,publicIdValue=""){
  const owner=await ownerHash(request);if(!owner)return json(request,env,{error:"deletion_token_required"},428);
  const statement=publicIdValue?env.GHOSTS.prepare("DELETE FROM ghost_runs WHERE public_id=? AND owner_hash=?").bind(publicIdValue,owner):env.GHOSTS.prepare("DELETE FROM ghost_runs WHERE owner_hash=?").bind(owner),result=await statement.run();let deleted=Number(result.meta&&result.meta.changes)||0;
  if(!publicIdValue){const leaderboard=await env.GHOSTS.batch([env.GHOSTS.prepare("DELETE FROM career_runs WHERE owner_hash=?").bind(owner),env.GHOSTS.prepare("DELETE FROM club_profiles WHERE owner_hash=?").bind(owner)]);deleted+=leaderboard.reduce((sum,item)=>sum+(Number(item.meta&&item.meta.changes)||0),0);}
  return json(request,env,{ok:true,deleted},deleted||!publicIdValue?200:404);
}
async function purgeExpired(env,now=new Date()){const cutoff=now.toISOString(),reportCutoff=new Date(now.getTime()-90*24*60*60*1000).toISOString(),activeSeason=seasonKey(now),results=await env.GHOSTS.batch([env.GHOSTS.prepare("DELETE FROM ghost_runs WHERE eligible_until <= ?").bind(cutoff),env.GHOSTS.prepare("DELETE FROM ghost_reports WHERE created_at <= ? OR public_id NOT IN (SELECT public_id FROM ghost_runs)").bind(reportCutoff),env.GHOSTS.prepare("DELETE FROM career_runs WHERE season_key <> ?").bind(activeSeason)]),expired=results[0],career=results[2];console.log(JSON.stringify({event:"retention_purge",ghosts_deleted:Number(expired.meta&&expired.meta.changes)||0,career_runs_deleted:Number(career.meta&&career.meta.changes)||0,at:cutoff}));return Number(expired.meta&&expired.meta.changes)||0;}

function routeBucket(pathname){
  if(pathname==="/v1/health")return "health";
  if(pathname==="/v1/analytics/events")return "analytics_events";
  if(pathname==="/v1/ghosts")return "ghost_write";
  if(pathname==="/v1/ghosts/match")return "ghost_match";
  if(pathname==="/v1/leaderboard/runs")return "leaderboard_write";
  if(pathname==="/v1/leaderboard"||pathname==="/v1/leaderboard/me")return "leaderboard_read";
  if(pathname==="/v1/me/leaderboard")return "leaderboard_delete";
  if(/^\/v1\/ghosts\/G-[A-Z0-9]{8,32}\/report$/.test(pathname))return "ghost_report";
  if(/^\/v1\/ghosts\/G-[A-Z0-9]{8,32}$/.test(pathname))return "ghost_delete";
  if(pathname==="/v1/me/ghosts")return "ghost_delete_all";
  return "not_found";
}

function recordWorkerMetric(env,request,url,response,startedAt){
  if(!env.WORKER_ANALYTICS)return;
  const method=["GET","POST","DELETE","OPTIONS"].includes(request.method)?request.method:"OTHER";
  const status=Math.max(100,Math.min(599,Number(response&&response.status)||500));
  const statusClass=`${Math.floor(status/100)}xx`;
  const latencyMs=Math.max(0,Date.now()-startedAt);
  /* copa_life_worker_health: blob1=route bucket, blob2=method, blob3=status class; double1=count, double2=latency_ms, double3=status. */
  try{env.WORKER_ANALYTICS.writeDataPoint({blobs:[routeBucket(url.pathname),method,statusClass],doubles:[1,latencyMs,status]});}
  catch(error){console.error(JSON.stringify({event:"worker_metric_error",route:routeBucket(url.pathname),message:error instanceof Error?error.message:String(error)}));}
}

async function routeRequest(request,env,url){
  if(!originAllowed(request,env))return json(request,env,{error:"origin_not_allowed"},403);
  if(request.method==="OPTIONS")return new Response(null,{status:204,headers:headers(request,env)});
  if(request.method==="GET"&&url.pathname==="/v1/health"){
    const tables=await env.GHOSTS.prepare(`SELECT
      SUM(CASE WHEN name='ghost_runs' THEN 1 ELSE 0 END) AS ghost_runs,
      SUM(CASE WHEN name='ghost_reports' THEN 1 ELSE 0 END) AS ghost_reports,
      SUM(CASE WHEN name='ghost_clients' THEN 1 ELSE 0 END) AS ghost_clients,
      SUM(CASE WHEN name='club_profiles' THEN 1 ELSE 0 END) AS club_profiles,
      SUM(CASE WHEN name='career_runs' THEN 1 ELSE 0 END) AS career_runs
      FROM sqlite_master WHERE type='table'`).first();
    const schemaVersion=detectSchemaVersion(tables),ok=schemaVersion===3;
    return json(request,env,{ok,service:"ghost-club-api",schema_version:schemaVersion,consent_version:CONSENT_VERSION,leaderboard_consent_version:LEADERBOARD_CONSENT_VERSION},ok?200:503);
  }
  if(request.method==="POST"&&url.pathname==="/v1/analytics/events")return await handleAnalytics(request,env);
  if(request.method==="POST"&&url.pathname==="/v1/ghosts")return await handlePost(request,env);
  if(request.method==="GET"&&url.pathname==="/v1/ghosts/match")return await handleMatch(request,env,url);
  if(request.method==="POST"&&url.pathname==="/v1/leaderboard/runs")return await handleLeaderboardPost(request,env);
  if(request.method==="GET"&&url.pathname==="/v1/leaderboard")return await handleLeaderboardGet(request,env,url,false);
  if(request.method==="GET"&&url.pathname==="/v1/leaderboard/me")return await handleLeaderboardGet(request,env,url,true);
  if(request.method==="DELETE"&&url.pathname==="/v1/me/leaderboard")return await handleLeaderboardDelete(request,env);
  const reportMatch=url.pathname.match(/^\/v1\/ghosts\/(G-[A-Z0-9]{8,32})\/report$/);if(request.method==="POST"&&reportMatch)return await handleReport(request,env,reportMatch[1]);
  const deleteMatch=url.pathname.match(/^\/v1\/ghosts\/(G-[A-Z0-9]{8,32})$/);if(request.method==="DELETE"&&deleteMatch)return await handleDelete(request,env,deleteMatch[1]);
  if(request.method==="DELETE"&&url.pathname==="/v1/me/ghosts")return await handleDelete(request,env);
  return json(request,env,{error:"not_found"},404);
}

export default {
  async fetch(request,env){const startedAt=Date.now(),url=new URL(request.url);let response;try{response=await routeRequest(request,env,url);}catch(error){console.error(JSON.stringify({event:"ghost_api_error",path:routeBucket(url.pathname),message:error instanceof Error?error.message:String(error)}));response=json(request,env,{error:"internal_error"},500);}recordWorkerMetric(env,request,url,response,startedAt);return response;},
  async scheduled(controller,env){await purgeExpired(env,new Date(controller.scheduledTime));}
};

export {MAX_BODY_BYTES,CONSENT_VERSION,LEADERBOARD_CONSENT_VERSION,PayloadTooLargeError,readJsonLimited,requestKey,valid,validHistory,validClubName,moderateClubName,normalizeAnalyticsEvent,normalizeCareerRun,detectSchemaVersion,integrityFor,purgeExpired,routeBucket};
