/* Cloudflare Worker + D1 API for opt-in copa.life Ghost Clubs. */
const MAX_BODY_BYTES=64*1024;
const DEFAULT_ORIGINS=["https://copa.life","https://www.copa.life","https://localhost","capacitor://localhost"];
const METHODS="GET, POST, DELETE, OPTIONS";
const CONSENT_VERSION="ghost-terms-v1";
const REPORT_REASONS=new Set(["hate","sexual","political","person","trademark","impersonation","other"]);
const ANALYTICS_EVENTS=new Set(["session_started","country_selected","draft_started","xi_completed","round_completed","run_finished","ghost_opt_in","profile_open_error","final_sim_completed"]);
const ANALYTICS_PLATFORMS=new Set(["web","android","ios"]);
const ANALYTICS_COUNTRIES=new Set(["","TR","IT","ENG","ES","DE","JP"]);
const ANALYTICS_OUTCOMES=new Set(["","win","loss","sacked"]);
const ANALYTICS_DETAILS=new Set(["","load_failed","missing_model","retry_failed"]);
const ANALYTICS_POWER_GAPS=new Set(["","away_12_plus","away_4_11","even","home_4_11","home_12_plus"]);
const ANALYTICS_END_TYPES=new Set(["","regulation","golden_goal","penalties"]);
const ANALYTICS_TACTICS=new Set(["","balanced","more","push","calm","hold"]);

const clean=value=>String(value==null?"":value).replace(/[<>]/g,"").replace(/\s+/g," ").trim().slice(0,400);
const range=(value,min,max)=>Math.max(min,Math.min(max,Number(value)||0));
const object=value=>!!value&&typeof value==="object"&&!Array.isArray(value);
const allowedOrigins=env=>new Set(String(env.ALLOWED_ORIGINS||DEFAULT_ORIGINS.join(",")).split(",").map(value=>value.trim()).filter(Boolean));
const originAllowed=(request,env)=>{const origin=request.headers.get("origin");return !origin||allowedOrigins(env).has(origin);};
const headers=(request,env)=>{
  const origin=request.headers.get("origin"),result={"access-control-allow-methods":METHODS,"access-control-allow-headers":"content-type, x-copa-client, x-copa-consent-version, x-copa-delete-token","cache-control":"no-store","content-type":"application/json; charset=utf-8","vary":"origin"};
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
  if(!object(value)||![1,2].includes(Number(value.schema_version)))return null;
  const schemaVersion=Number(value.schema_version);
  const event=String(value.event||"");if(!ANALYTICS_EVENTS.has(event))return null;
  if(event==="final_sim_completed"&&schemaVersion!==2)return null;
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
  return {event,platform,locale,gameCountry,outcome,detail,round,pagePath,appVersion,schemaVersion,modelVersion,powerGap,endType,tactic};
}

async function handleAnalytics(request,env){
  if(env.PRODUCT_ANALYTICS_LIMITER){const outcome=await env.PRODUCT_ANALYTICS_LIMITER.limit({key:requestKey(request)});if(!outcome.success)return json(request,env,{error:"rate_limited"},429);}
  let body;try{body=await readJsonLimited(request,4096);}catch(error){if(error instanceof PayloadTooLargeError)return json(request,env,{error:"payload_too_large"},413);return json(request,env,{error:"invalid_json"},400);}
  const event=normalizeAnalyticsEvent(body);if(!event)return json(request,env,{error:"invalid_analytics_event"},422);
  if(!env.PRODUCT_ANALYTICS)return json(request,env,{error:"analytics_unavailable"},503);
  /* copa_life_product_events: blob1..13 below; double1=count, double2=round,
     double3=schema version. No user/session index is written. */
  env.PRODUCT_ANALYTICS.writeDataPoint({
    blobs:[
      event.event,event.platform,event.locale,event.gameCountry,event.outcome,event.detail,event.pagePath,event.appVersion,
      event.modelVersion||"",event.powerGap||"",event.endType||"",event.tactic||"",String(event.schemaVersion||1)
    ],
    doubles:[1,event.round,event.schemaVersion||1]
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

const validPlayer=player=>object(player)&&typeof player.name==="string"&&player.name.trim().length>0&&player.name.length<=72&&typeof player.pos==="string"&&player.pos.length<=12&&Number(player.power)>=35&&Number(player.power)<=115;
function valid(snapshot,{requirePublicId=false}={}){
  if(!object(snapshot)||snapshot.schema_version!==1)return false;if(typeof snapshot.game_version!=="string"||!snapshot.game_version||snapshot.game_version.length>32)return false;if(typeof snapshot.data_version!=="string"||!snapshot.data_version||snapshot.data_version.length>32)return false;
  if(requirePublicId&&!/^G-[A-Z0-9]{8,32}$/.test(String(snapshot.public_ghost_id||"")))return false;if(!Array.isArray(snapshot.starting_xi)||snapshot.starting_xi.length!==11||snapshot.starting_xi.some(player=>!validPlayer(player)))return false;
  if(snapshot.squad!=null&&(!Array.isArray(snapshot.squad)||snapshot.squad.length<11||snapshot.squad.length>18||snapshot.squad.some(player=>!validPlayer(player))))return false;if(snapshot.bench!=null&&(!Array.isArray(snapshot.bench)||snapshot.bench.length>7||snapshot.bench.some(player=>!validPlayer(player))))return false;
  if(!Number.isFinite(Number(snapshot.squad_power))||snapshot.squad_power<35||snapshot.squad_power>115)return false;if(!Number.isFinite(Number(snapshot.cash))||snapshot.cash<-100||snapshot.cash>250)return false;if(!Number.isInteger(Number(snapshot.reached_round))||snapshot.reached_round<1||snapshot.reached_round>6)return false;
  if(!Array.isArray(snapshot.active_cards)||snapshot.active_cards.length>35||snapshot.active_cards.some(card=>!object(card)||(card.tier!=="COMMON"&&card.tier!=="DARK")))return false;if(snapshot.fixture_summary!=null&&(!Array.isArray(snapshot.fixture_summary)||snapshot.fixture_summary.length>6))return false;
  return validClubName(snapshot.club&&snapshot.club.name);
}
const publicId=()=>"G-"+crypto.randomUUID().replace(/-/g,"").slice(0,16).toUpperCase();
async function hashText(value){const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(String(value)));return Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,"0")).join("");}
async function integrityFor(snapshot){const canonical=Object.assign({},snapshot);delete canonical.integrity;return"sha256:"+await hashText(JSON.stringify(canonical));}
async function clientHash(request){return hashText("client:"+clientKey(request));}
async function ownerHash(request){const token=deleteToken(request);return token?hashText("owner:"+token):"";}
async function clientState(env,hash){return await env.GHOSTS.prepare("SELECT status, violation_count FROM ghost_clients WHERE client_hash=?").bind(hash).first();}
async function registerClient(env,hash,violation=false){const now=new Date().toISOString();await env.GHOSTS.prepare("INSERT INTO ghost_clients (client_hash, status, violation_count, created_at, updated_at, last_violation_at) VALUES (?, 'active', ?, ?, ?, ?) ON CONFLICT(client_hash) DO UPDATE SET violation_count=violation_count+excluded.violation_count, status=CASE WHEN violation_count+excluded.violation_count>=3 THEN 'blocked' ELSE status END, updated_at=excluded.updated_at, last_violation_at=CASE WHEN excluded.violation_count>0 THEN excluded.last_violation_at ELSE last_violation_at END").bind(hash,violation?1:0,now,now,violation?now:null).run();}

async function handlePost(request,env){
  if(env.GHOST_WRITE_LIMITER){const outcome=await env.GHOST_WRITE_LIMITER.limit({key:requestKey(request)});if(!outcome.success)return json(request,env,{error:"rate_limited"},429);}
  if(request.headers.get("x-copa-consent-version")!==CONSENT_VERSION)return json(request,env,{error:"consent_required",consent_version:CONSENT_VERSION},428);
  const owner=await ownerHash(request);if(!owner)return json(request,env,{error:"deletion_token_required"},428);
  const client=await clientHash(request),state=await clientState(env,client);if(state&&state.status==="blocked")return json(request,env,{error:"client_blocked"},403);
  let snapshot;try{snapshot=await readJsonLimited(request);}catch(error){if(error instanceof PayloadTooLargeError)return json(request,env,{error:"payload_too_large"},413);return json(request,env,{error:"invalid_json"},400);}
  if(!valid(snapshot))return json(request,env,{error:"invalid_ghost"},422);
  const moderation=moderateClubName(snapshot.club&&snapshot.club.name);if(moderation.status==="blocked"){await registerClient(env,client,true);return json(request,env,{error:"club_name_blocked",reason:moderation.reason},422);}
  await registerClient(env,client,false);
  const now=new Date().toISOString(),eligibleUntil=new Date(Date.now()+45*24*60*60*1000).toISOString(),stored=Object.assign({},snapshot,{public_ghost_id:publicId()});stored.integrity=await integrityFor(stored);
  await env.GHOSTS.prepare("INSERT INTO ghost_runs (public_id, game_version, data_version, reached_round, squad_power, country, created_at, eligible_until, snapshot, integrity, status, owner_hash, client_hash, consent_version, moderation_reason) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(stored.public_ghost_id,stored.game_version,stored.data_version,Math.round(range(stored.reached_round,1,6)),Math.round(range(stored.squad_power,35,115)),clean(stored.club&&stored.club.country),now,eligibleUntil,JSON.stringify(stored),stored.integrity,moderation.status,owner,client,CONSENT_VERSION,moderation.reason||null).run();
  return json(request,env,{ok:true,id:stored.public_ghost_id,integrity:stored.integrity,status:moderation.status,eligible_until:eligibleUntil},201);
}

async function handleMatch(request,env,url){
  if(env.GHOST_READ_LIMITER){const outcome=await env.GHOST_READ_LIMITER.limit({key:requestKey(request)});if(!outcome.success)return json(request,env,{error:"rate_limited"},429);}
  const power=Math.round(range(url.searchParams.get("power"),35,115)),round=Math.round(range(url.searchParams.get("round"),1,6)),gameVersion=clean(url.searchParams.get("game_version")),dataVersion=clean(url.searchParams.get("data_version"));if(!gameVersion||!dataVersion)return json(request,env,{ghost:null},400);
  const rows=await env.GHOSTS.prepare("SELECT public_id, snapshot FROM ghost_runs WHERE status='eligible' AND eligible_until > ? AND game_version=? AND data_version=? AND reached_round BETWEEN ? AND ? AND squad_power BETWEEN ? AND ? ORDER BY ABS(squad_power-?) ASC, created_at DESC LIMIT 30").bind(new Date().toISOString(),gameVersion,dataVersion,Math.max(1,round-1),Math.min(6,round+1),Math.max(35,power-13),Math.min(115,power+13),power).all();
  const excluded=new Set((url.searchParams.get("exclude")||"").split(",").filter(id=>/^G-[A-Z0-9]{8,32}$/.test(id)).slice(0,64)),candidates=(rows.results||[]).filter(row=>!excluded.has(row.public_id));if(!candidates.length)return json(request,env,{ghost:null});
  const bytes=new Uint32Array(1);crypto.getRandomValues(bytes);const chosen=candidates[bytes[0]%candidates.length];let ghost;try{ghost=JSON.parse(chosen.snapshot);}catch(_){ghost=null;}return json(request,env,{ghost:valid(ghost,{requirePublicId:true})?ghost:null});
}

async function handleReport(request,env,publicIdValue){
  if(!/^G-[A-Z0-9]{8,32}$/.test(publicIdValue))return json(request,env,{error:"invalid_ghost_id"},400);
  let body;try{body=await readJsonLimited(request,4096);}catch(_){return json(request,env,{error:"invalid_json"},400);}
  const reason=String(body&&body.reason||"").toLowerCase(),details=clean(body&&body.details||"");if(!REPORT_REASONS.has(reason))return json(request,env,{error:"invalid_report_reason"},422);
  const reporter=await clientHash(request),row=await env.GHOSTS.prepare("SELECT public_id, client_hash FROM ghost_runs WHERE public_id=?").bind(publicIdValue).first();if(!row)return json(request,env,{error:"not_found"},404);
  const now=new Date().toISOString(),reportId="R-"+crypto.randomUUID().replace(/-/g,"").slice(0,20).toUpperCase();await env.GHOSTS.prepare("INSERT OR IGNORE INTO ghost_reports (report_id, public_id, reporter_hash, reason, details, created_at) VALUES (?, ?, ?, ?, ?, ?)").bind(reportId,publicIdValue,reporter,reason,details,now).run();
  const countRow=await env.GHOSTS.prepare("SELECT COUNT(*) AS total FROM ghost_reports WHERE public_id=?").bind(publicIdValue).first(),count=Number(countRow&&countRow.total)||0,nextStatus=count>=3?"blocked":"review";await env.GHOSTS.prepare("UPDATE ghost_runs SET status=?, reviewed_at=NULL WHERE public_id=? AND status!='blocked'").bind(nextStatus,publicIdValue).run();if(nextStatus==="blocked"&&row.client_hash)await registerClient(env,row.client_hash,true);
  return json(request,env,{ok:true,status:nextStatus,report_count:count},201);
}

async function handleDelete(request,env,publicIdValue=""){
  const owner=await ownerHash(request);if(!owner)return json(request,env,{error:"deletion_token_required"},428);
  const statement=publicIdValue?env.GHOSTS.prepare("DELETE FROM ghost_runs WHERE public_id=? AND owner_hash=?").bind(publicIdValue,owner):env.GHOSTS.prepare("DELETE FROM ghost_runs WHERE owner_hash=?").bind(owner),result=await statement.run(),deleted=Number(result.meta&&result.meta.changes)||0;
  return json(request,env,{ok:true,deleted},deleted||!publicIdValue?200:404);
}
async function purgeExpired(env,now=new Date()){const cutoff=now.toISOString(),reportCutoff=new Date(now.getTime()-90*24*60*60*1000).toISOString();const expired=await env.GHOSTS.prepare("DELETE FROM ghost_runs WHERE eligible_until <= ?").bind(cutoff).run();await env.GHOSTS.prepare("DELETE FROM ghost_reports WHERE created_at <= ? OR public_id NOT IN (SELECT public_id FROM ghost_runs)").bind(reportCutoff).run();console.log(JSON.stringify({event:"ghost_retention_purge",deleted:Number(expired.meta&&expired.meta.changes)||0,at:cutoff}));return Number(expired.meta&&expired.meta.changes)||0;}

function routeBucket(pathname){
  if(pathname==="/v1/health")return "health";
  if(pathname==="/v1/analytics/events")return "analytics_events";
  if(pathname==="/v1/ghosts")return "ghost_write";
  if(pathname==="/v1/ghosts/match")return "ghost_match";
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
  if(request.method==="GET"&&url.pathname==="/v1/health"){const db=await env.GHOSTS.prepare("SELECT 1 AS ok").first();return json(request,env,{ok:!!(db&&db.ok===1),service:"ghost-club-api",schema_version:2,consent_version:CONSENT_VERSION},db&&db.ok===1?200:503);}
  if(request.method==="POST"&&url.pathname==="/v1/analytics/events")return await handleAnalytics(request,env);
  if(request.method==="POST"&&url.pathname==="/v1/ghosts")return await handlePost(request,env);
  if(request.method==="GET"&&url.pathname==="/v1/ghosts/match")return await handleMatch(request,env,url);
  const reportMatch=url.pathname.match(/^\/v1\/ghosts\/(G-[A-Z0-9]{8,32})\/report$/);if(request.method==="POST"&&reportMatch)return await handleReport(request,env,reportMatch[1]);
  const deleteMatch=url.pathname.match(/^\/v1\/ghosts\/(G-[A-Z0-9]{8,32})$/);if(request.method==="DELETE"&&deleteMatch)return await handleDelete(request,env,deleteMatch[1]);
  if(request.method==="DELETE"&&url.pathname==="/v1/me/ghosts")return await handleDelete(request,env);
  return json(request,env,{error:"not_found"},404);
}

export default {
  async fetch(request,env){const startedAt=Date.now(),url=new URL(request.url);let response;try{response=await routeRequest(request,env,url);}catch(error){console.error(JSON.stringify({event:"ghost_api_error",path:routeBucket(url.pathname),message:error instanceof Error?error.message:String(error)}));response=json(request,env,{error:"internal_error"},500);}recordWorkerMetric(env,request,url,response,startedAt);return response;},
  async scheduled(controller,env){await purgeExpired(env,new Date(controller.scheduledTime));}
};

export {MAX_BODY_BYTES,CONSENT_VERSION,PayloadTooLargeError,readJsonLimited,requestKey,valid,validClubName,moderateClubName,normalizeAnalyticsEvent,integrityFor,purgeExpired,routeBucket};
