/* Cloudflare Worker + D1 API for copa.life Ghost Clubs. */
// The client sends no account or personal data; public CORS keeps the static
// GitHub Pages build and a custom domain on the same API without a proxy.
const HEADERS={"access-control-allow-origin":"*","access-control-allow-methods":"GET, POST, OPTIONS","access-control-allow-headers":"content-type"};
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{...HEADERS,"content-type":"application/json; charset=utf-8","cache-control":"no-store"}});
const clean=value=>String(value==null?"":value).replace(/[<>]/g,"").replace(/\s+/g," ").trim().slice(0,72);
const range=(value,min,max)=>Math.max(min,Math.min(max,Number(value)||0));
function valid(snapshot){
  if(!snapshot||snapshot.schema_version!==1)return false;
  if(typeof snapshot.game_version!=="string"||typeof snapshot.data_version!=="string")return false;
  if(!/^G-[A-Z0-9]{4,12}$/.test(String(snapshot.public_ghost_id||"")))return false;
  if(!Array.isArray(snapshot.starting_xi)||snapshot.starting_xi.length<10||snapshot.starting_xi.length>11)return false;
  if(!Number.isFinite(Number(snapshot.squad_power))||snapshot.squad_power<35||snapshot.squad_power>115)return false;
  if(!Number.isFinite(Number(snapshot.cash))||snapshot.cash<-100||snapshot.cash>250)return false;
  if(!Array.isArray(snapshot.active_cards)||snapshot.active_cards.some(card=>card&&card.tier!=="COMMON"&&card.tier!=="DARK"))return false;
  return true;
}
export default {
  async fetch(request,env){
    if(request.method==="OPTIONS")return new Response(null,{status:204,headers:HEADERS});
    const url=new URL(request.url);
    if(request.method==="POST"&&url.pathname==="/v1/ghosts"){
      let snapshot;try{snapshot=await request.json();}catch(_){return json({error:"invalid_json"},400);}
      if(!valid(snapshot))return json({error:"invalid_ghost"},422);
      const now=new Date().toISOString();
      const eligibleUntil=new Date(Date.now()+45*24*60*60*1000).toISOString();
      await env.GHOSTS.prepare("INSERT INTO ghost_runs (public_id, game_version, data_version, reached_round, squad_power, country, created_at, eligible_until, snapshot, integrity, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'eligible') ON CONFLICT(public_id) DO UPDATE SET snapshot=excluded.snapshot, eligible_until=excluded.eligible_until, status='eligible'")
        .bind(snapshot.public_ghost_id,snapshot.game_version,snapshot.data_version,Math.round(range(snapshot.reached_round,1,6)),Math.round(range(snapshot.squad_power,35,115)),clean(snapshot.club&&snapshot.club.country),now,eligibleUntil,JSON.stringify(snapshot),clean(snapshot.integrity)).run();
      return json({ok:true,id:snapshot.public_ghost_id},201);
    }
    if(request.method==="GET"&&url.pathname==="/v1/ghosts/match"){
      const power=Math.round(range(url.searchParams.get("power"),35,115));
      const round=Math.round(range(url.searchParams.get("round"),1,6));
      const gameVersion=clean(url.searchParams.get("game_version"));
      const dataVersion=clean(url.searchParams.get("data_version"));
      if(!gameVersion||!dataVersion)return json({ghost:null},400);
      const rows=await env.GHOSTS.prepare("SELECT public_id, snapshot FROM ghost_runs WHERE status='eligible' AND eligible_until > ? AND game_version=? AND data_version=? AND reached_round BETWEEN ? AND ? AND squad_power BETWEEN ? AND ? ORDER BY ABS(squad_power-?) ASC, created_at DESC LIMIT 30")
        .bind(new Date().toISOString(),gameVersion,dataVersion,Math.max(1,round-1),Math.min(6,round+1),Math.max(35,power-13),Math.min(115,power+13),power).all();
      const excluded=new Set((url.searchParams.get("exclude")||"").split(",").filter(Boolean));
      const candidates=(rows.results||[]).filter(row=>!excluded.has(row.public_id));
      if(!candidates.length)return json({ghost:null});
      const chosen=candidates[Math.floor(Math.random()*candidates.length)];
      let ghost;try{ghost=JSON.parse(chosen.snapshot);}catch(_){ghost=null;}
      return json({ghost:valid(ghost)?ghost:null});
    }
    return json({error:"not_found"},404);
  }
};
