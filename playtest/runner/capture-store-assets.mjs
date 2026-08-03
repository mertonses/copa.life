import {spawn} from "node:child_process";
import {createHash} from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {chromium} from "playwright";

const RUNNER=path.dirname(fileURLToPath(import.meta.url));
const ROOT=path.resolve(RUNNER,"../..");
const STORE=path.join(ROOT,"store/android");
const GRAPHICS=path.join(STORE,"graphics");
const LOCALIZED=path.join(GRAPHICS,"localized");
const KEY_ART=path.join(STORE,"source","feature-background-dual-mode-v3.png");
const DEFAULT_PHONE=path.join(GRAPHICS,"phone");
const DEFAULT_TABLET=path.join(GRAPHICS,"tablet");
const BASE="http://127.0.0.1:5500";
const GAME=`${BASE}/dist-android/index.html?autotest=1&store=dual-mode&mode-gate-qa=1`;
const DISABLE_MOTION="*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}";
const FEATURE_ONLY=process.argv.includes("--feature-only");

const LOCALES=[
  {code:"tr-TR",lang:"tr",browserLocale:"tr-TR",headline:"İKİ MOD. TEK FUTBOL HİKÂYESİ.",subline:"Life'ta kulübünü kur. Arena'da dünyaya meydan oku.",league:"Lig yıldızları"},
  {code:"en-US",lang:"en",browserLocale:"en-US",headline:"TWO MODES. ONE FOOTBALL STORY.",subline:"Build your club in Life. Challenge the world in Arena.",league:"League stars"},
  {code:"es-ES",lang:"es",browserLocale:"es-ES",headline:"DOS MODOS. UNA HISTORIA DE FÚTBOL.",subline:"Crea tu club en Life. Desafía al mundo en Arena.",league:"Estrellas de liga"},
  {code:"de-DE",lang:"de",browserLocale:"de-DE",headline:"ZWEI MODI. EINE FUSSBALLGESCHICHTE.",subline:"Baue deinen Club in Life. Fordere die Welt in Arena heraus.",league:"Ligastars"},
  {code:"it-IT",lang:"it",browserLocale:"it-IT",headline:"DUE MODALITÀ. UNA STORIA DI CALCIO.",subline:"Crea il club in Life. Sfida il mondo in Arena.",league:"Stelle dei campionati"},
];

const SCREENSHOTS=[
  "01-two-modes.jpg",
  "02-life-stars-tr-eng.jpg",
  "03-life-stars-es-de.jpg",
  "04-life-stars-it-jp.jpg",
  "05-life-cup-journey.jpg",
  "06-arena-season-road.jpg",
  "07-arena-live-pvp.jpg",
  "08-arena-private-tournaments.jpg",
];

const LEAGUE_PAIRS=[
  {codes:["TR","ENG"],file:SCREENSHOTS[1]},
  {codes:["ES","DE"],file:SCREENSHOTS[2]},
  {codes:["IT","JP"],file:SCREENSHOTS[3]},
];

const PROFILE={publicId:"AC-STORE",clubName:"COPA XI",rating:1388,division:"altin",seasonKey:"2026-Q3",seasonPoints:420,wins:31,draws:8,losses:12,streak:4,tokenProgress:24,cosmetics:["arena_badge_rookie","arena_frame_floodlights","arena_kit_touchline","arena_crest_compass"],equippedCosmetics:{frame:"arena_frame_floodlights"}};
const SELF={owner:"self",clubName:"COPA XI",rating:1388,ready:true,setup:{formation:"4-3-3",style:"control",chairman:"babacan"},draft:[],market:null,training:null,tactics:["balanced","press"],connected:true};
const OPPONENT={clubName:"NORTH STAR FC",rating:1401,ready:true,connected:true,setup:{formation:"4-2-3-1",style:"counter",chairman:"patron"},draftCount:11,draft:[],market:null,training:null,tactics:["counter","control"],tacticLocked:false};
const LIVE_ROOM={protocol:1,rulesVersion:"arena-rules-v11",catalogVersion:"store-catalog",mode:"ranked",matchId:"AR-STORE2026",deadline:Date.now()+24000,selfIndex:0,phase:"live",draftStep:0,window:2,liveStage:"decision",matchMinute:45,score:[1,1],events:[{minute:14,type:"goal",side:"home"},{minute:38,type:"goal",side:"away"}],windowHistory:[{window:0,startMinute:0,endMinute:20,homeGoals:1,awayGoals:0,homeXg:.72,awayXg:.31,tactics:["balanced","counter"],advantage:"neutral",events:[{minute:14,type:"goal",side:"home"}],scoreAfter:[1,0]},{window:1,startMinute:20,endMinute:45,homeGoals:0,awayGoals:1,homeXg:.51,awayXg:.68,tactics:["press","control"],advantage:"away",events:[{minute:38,type:"goal",side:"away"}],scoreAfter:[1,1]}],windowResult:null,liveSegments:[{startMinute:0,endMinute:20,prompt:"opening"},{startMinute:20,endMinute:45,prompt:"control"},{startMinute:45,endMinute:70,prompt:"response"},{startMinute:70,endMinute:90,prompt:"finish"}],penalty:null,result:null,emotes:{self:null,opponent:{id:"gg",sequence:1,at:Date.now()}},self:SELF,opponent:OPPONENT,offers:null,draftStatus:{count:11,total:11,budget:8,power:82,recommendedReserve:0},team:{budget:8,power:82,chemistry:4},opponentTeam:{budget:7,power:84,chemistry:3}};

async function serverReady(){try{return (await fetch(`${BASE}/dist-android/index.html`)).ok;}catch{return false;}}
const esc=value=>String(value).replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[char]);
function copyDirectory(source,target){fs.mkdirSync(target,{recursive:true});for(const file of fs.readdirSync(source))fs.copyFileSync(path.join(source,file),path.join(target,file));}

async function preparePage(context,{landing=false}={}){
  const page=await context.newPage();
  await page.goto(GAME,{waitUntil:"domcontentloaded"});
  await page.locator("#loader").waitFor({state:"hidden"});
  await page.addStyleTag({content:DISABLE_MOTION});
  if(landing)await page.evaluate(()=>globalThis.CopaModeGate?.show?.());
  await page.evaluate(()=>window.scrollTo(0,0));
  return page;
}

async function screenshot(page,file){
  await page.evaluate(()=>window.scrollTo(0,0));
  await page.screenshot({path:file,type:"jpeg",quality:94});
}

async function addLeagueRibbon(page,locale,codes){
  await page.evaluate(({label,codes})=>{
    document.querySelector("#storeLeagueRibbon")?.remove();
    const names=codes.map(code=>globalThis.countryDisplayName(code,globalThis.LANG));
    const ribbon=document.createElement("div");ribbon.id="storeLeagueRibbon";
    ribbon.style.cssText="position:fixed;z-index:9999;top:max(10px,env(safe-area-inset-top));left:50%;transform:translateX(-50%);display:flex;align-items:center;gap:8px;padding:8px 13px;border:1px solid rgba(242,74,40,.75);border-radius:999px;background:rgba(10,17,24,.94);box-shadow:0 8px 26px rgba(0,0,0,.42);font:800 11px/1.1 Inter,Segoe UI,sans-serif;letter-spacing:.7px;color:#f3f5f4;text-transform:uppercase;white-space:nowrap";
    ribbon.innerHTML=`<span style="color:#f24a28">${label}</span><b>${names.join(" × ")}</b>`;
    document.body.append(ribbon);
  },{label:locale.league,codes});
}

async function captureDraft(context,locale,pair,output){
  const page=await preparePage(context);
  await page.evaluate(async codes=>{
    for(const code of codes)if(code!=="TR")await globalThis.CopaLazy.ensureCountryPlayers(code);
    globalThis.pickCountry(codes[0]);
    globalThis.eval('formName="4-3-3";slots=FORMATIONS[formName];style="gegen";talkHistory=[];');
    await globalThis.beginDraft();
    globalThis.eval('window._draftPositionFilter="FWD";');
    await globalThis.roll();
    globalThis.eval(`{
      const codes=${JSON.stringify(codes)};
      const pools=codes.map(code=>countryGameData(code)[0]);
      const best=pools.flatMap((pool,leagueIndex)=>pool.filter(p=>["FWD","WNG"].includes(p[2])).map(p=>({p,leagueIndex}))).sort((a,b)=>b.p[1]-a.p[1]);
      const chosen=[];
      for(const leagueIndex of [0,1]){const hit=best.find(item=>item.leagueIndex===leagueIndex&&!chosen.some(other=>other.p[0]===item.p[0]));if(hit)chosen.push(hit);}
      for(const item of best)if(chosen.length<3&&!chosen.some(other=>other.p[0]===item.p[0]))chosen.push(item);
      currentOpts=chosen.slice(0,3).map(({p})=>mkOpt(p[0],p[1],p[2],slots[currentSlot][0],false,p[3],p[4],p[5],p[6],p[7],p[8],p[9]));
      currentOpts.forEach((candidate,index)=>{candidate.hidden=false;if(index===1){candidate.bargain=true;candidate.discountPct=18;candidate.oldPrice=Math.max(candidate.price+2,Math.ceil(candidate.price/.82));}});
      renderOpts();
    }`);
  },pair.codes);
  await page.locator("#optstage").waitFor({state:"visible"});
  await addLeagueRibbon(page,locale,pair.codes);
  const starNames=await page.evaluate(codes=>globalThis.eval(`{
    const storeCodes=${JSON.stringify(codes)};
    const pools=storeCodes.map(code=>countryGameData(code)[0]);
    const ranked=pools.flatMap((pool,leagueIndex)=>pool.filter(p=>p[2]!=="GK").map(p=>({p,leagueIndex}))).sort((a,b)=>b.p[1]-a.p[1]);
    const chosen=[];
    for(const leagueIndex of [0,1]){const hit=ranked.find(item=>item.leagueIndex===leagueIndex&&!chosen.some(other=>other.p[0]===item.p[0]));if(hit)chosen.push(hit);}
    for(const item of ranked)if(chosen.length<3&&!chosen.some(other=>other.p[0]===item.p[0]))chosen.push(item);
    currentOpts=chosen.slice(0,3).map(({p})=>mkOpt(p[0],p[1],p[2],p[7]||slots[currentSlot][0],false,p[3],p[4],p[5],p[6],p[7],p[8],p[9]));
    currentOpts.forEach((candidate,index)=>{candidate.hidden=false;candidate.bargain=index===1;if(index===1){candidate.discountPct=18;candidate.oldPrice=Math.max(candidate.price+2,Math.ceil(candidate.price/.82));}});
    renderOpts();
    currentOpts.map(candidate=>candidate.name+" "+candidate.ov);
  }`),pair.codes);
  console.log(`  ${locale.code} ${pair.codes.join("+")}: ${starNames.join(", ")}`);
  await page.evaluate(()=>{const draft=document.querySelector("#draft"),gallery=document.querySelector(".draft-candidate-gallery");if(gallery)gallery.scrollLeft=0;if(draft)window.scrollTo(0,draft.getBoundingClientRect().top+scrollY);});
  await screenshot(page,path.join(output,pair.file));
  await page.close();
}

async function captureLifeJourney(context,locale,output){
  const page=await preparePage(context);
  await page.evaluate(async()=>{globalThis.pickCountry("TR");globalThis.eval('formName="4-3-3";slots=FORMATIONS[formName];style="gegen";talkHistory=[];');await globalThis.beginDraft();await globalThis.quickAll();});
  await page.locator("#postClubName").waitFor({state:"visible"});
  await page.locator("#postClubName").fill("COPA XI");
  await page.evaluate(()=>globalThis.pcGo());
  await page.locator("#tournamentDraw").waitFor({state:"visible"});
  await page.evaluate(()=>globalThis.fastTournamentDraw());
  await screenshot(page,path.join(output,SCREENSHOTS[4]));
  await page.close();
}

async function openArena(context){
  const page=await preparePage(context,{landing:true});
  await page.evaluate(()=>globalThis.CopaLazy.openArena());
  await page.locator(".arena-portal").waitFor({state:"visible"});
  return page;
}

async function captureArena(context,output){
  const page=await openArena(context);
  await screenshot(page,path.join(output,SCREENSHOTS[5]));
  await page.evaluate(room=>{const arena=globalThis.CopaArena;arena.state.screen="room";arena.state.room=room;arena.refresh();},LIVE_ROOM);
  await page.locator(".arena-live").waitFor({state:"visible"});
  await screenshot(page,path.join(output,SCREENSHOTS[6]));
  const tournament={code:"COPA48",size:8,status:"active",joined:8,host:true,eliminated:false,champion:false,participants:["COPA XI","NORTH STAR FC","BOSPHORUS FK","TOKYO WINGS","MADRID 1902","BERLIN UNITED","MILANO CALCIO","LONDON ATHLETIC"].map((clubName,index)=>({slot:index+1,clubName})),rounds:[{number:1,matches:[{status:"completed",winnerSlot:1,players:[{slot:1,clubName:"COPA XI"},{slot:2,clubName:"NORTH STAR FC"}]},{status:"completed",winnerSlot:3,players:[{slot:3,clubName:"BOSPHORUS FK"},{slot:4,clubName:"TOKYO WINGS"}]},{status:"active",winnerSlot:null,players:[{slot:5,clubName:"MADRID 1902"},{slot:6,clubName:"BERLIN UNITED"}]},{status:"waiting",winnerSlot:null,players:[{slot:7,clubName:"MILANO CALCIO"},{slot:8,clubName:"LONDON ATHLETIC"}]}]},{number:2,matches:[{status:"waiting",winnerSlot:null,players:[{slot:1,clubName:"COPA XI"},{slot:3,clubName:"BOSPHORUS FK"}]}]}]};
  await page.evaluate(item=>{const arena=globalThis.CopaArena;arena.state.screen="tournament";arena.state.tournament=item;arena.refresh();},tournament);
  await page.locator(".arena-tournament-room").waitFor({state:"visible"});
  await screenshot(page,path.join(output,SCREENSHOTS[7]));
  await page.close();
}

async function captureFlow(browser,locale,{tablet=false}={}){
  const output=path.join(LOCALIZED,locale.code,tablet?"tablet":"phone");fs.mkdirSync(output,{recursive:true});
  const context=await browser.newContext(tablet?{viewport:{width:1280,height:720},deviceScaleFactor:1.5,hasTouch:true,locale:locale.browserLocale,colorScheme:"dark"}:{viewport:{width:432,height:768},deviceScaleFactor:2.5,isMobile:true,hasTouch:true,locale:locale.browserLocale,colorScheme:"dark"});
  await context.addInitScript(({lang,profile})=>{
    localStorage.setItem("copa.language",lang);localStorage.setItem("copa_theme","dark");localStorage.setItem("copa_arena_terms_v1","arena-terms-v1");localStorage.setItem("copa_arena_club_v1",profile.clubName);localStorage.setItem("copa_arena_token_v1","CAR-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA");localStorage.setItem("copa_arena_google_user_v1",JSON.stringify({name:"Arena Store",email:"store@copa.life"}));localStorage.setItem("copa_ghost_client_id_v1","GCL-AAAAAAAAAAAA");localStorage.setItem("copa.guide.context.v2",JSON.stringify({setup:1,draft:1,hub:1,bench:1,injury:1,table:1}));sessionStorage.setItem("copa_mobile_resume_notice","1");for(const key of ["copa_run_state_v1","copa_arena_room_v1","copa_arena_custom_room_v1","copa_arena_tournament_v1"])localStorage.removeItem(key);
    const original=globalThis.fetch.bind(globalThis);globalThis.fetch=(input,init)=>{const url=String(typeof input==="string"?input:input?.url||"");if(!url.includes("/v1/arena/"))return original(input,init);if(url.includes("/profile"))return Promise.resolve(new Response(JSON.stringify({profile}),{status:200,headers:{"content-type":"application/json"}}));if(url.includes("/history"))return Promise.resolve(new Response(JSON.stringify({matches:[]}),{status:200,headers:{"content-type":"application/json"}}));if(url.includes("/leaderboard"))return Promise.resolve(new Response(JSON.stringify({season:"2026-Q3",entries:[{...profile,rank:7}]}),{status:200,headers:{"content-type":"application/json"}}));if(url.includes("/events"))return Promise.resolve(new Response(null,{status:204}));return Promise.resolve(new Response(JSON.stringify({error:"store_capture"}),{status:503,headers:{"content-type":"application/json"}}));};
  },{lang:locale.lang,profile:PROFILE});
  try{
    const landing=await preparePage(context,{landing:true});await screenshot(landing,path.join(output,SCREENSHOTS[0]));await landing.close();
    for(const pair of LEAGUE_PAIRS)await captureDraft(context,locale,pair,output);
    await captureLifeJourney(context,locale,output);
    await captureArena(context,output);
  }finally{await context.close();}
}

async function renderFeatureGraphic(browser,locale){
  const output=path.join(LOCALIZED,locale.code,"feature-graphic.jpg");fs.mkdirSync(path.dirname(output),{recursive:true});
  const context=await browser.newContext({viewport:{width:1024,height:500},deviceScaleFactor:1,colorScheme:"dark"});
  try{
    const page=await context.newPage(),background=`data:image/png;base64,${fs.readFileSync(KEY_ART).toString("base64")}`;
    await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>*{box-sizing:border-box}html,body{width:1024px;height:500px;margin:0;overflow:hidden;background:#0a1118}body{font-family:Inter,"Segoe UI",Arial,sans-serif;color:#f3f5f4}.art{position:relative;width:100%;height:100%;background:url('${background}') center/cover no-repeat}.art:after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(10,17,24,.74),rgba(10,17,24,.16) 65%,rgba(10,17,24,.05))}.copy{position:absolute;z-index:2;left:58px;top:52px;width:590px}.brand{font-size:43px;font-weight:950;letter-spacing:-2px}.brand b{color:#f24a28}.brand em{font-style:normal;color:#d6a21f}.brand i{font-style:normal;color:#6b7b82;margin:0 13px}.tag{margin-top:38px;color:#f24a28;font-size:12px;font-weight:900;letter-spacing:2.8px;text-transform:uppercase}h1{margin:12px 0 13px;font-size:38px;line-height:1.02;letter-spacing:-1.2px;text-transform:uppercase}p{max-width:520px;margin:0;color:#c1c9ca;font-size:17px;font-weight:650;line-height:1.35}.rail{display:flex;gap:8px;margin-top:33px}.rail span{width:34px;height:5px;border-radius:8px;background:#3a4750}.rail span:first-child{width:72px;background:#f24a28}.rail span:last-child{background:#4e9b65}</style></head><body><main class="art"><section class="copy"><div class="brand">copa<b>.</b>life<i>×</i>copa <em>ARENA</em></div><div class="tag">football manager × live competition</div><h1>${esc(locale.headline)}</h1><p>${esc(locale.subline)}</p><div class="rail"><span></span><span></span><span></span></div></section></main></body></html>`,{waitUntil:"load"});
    await page.screenshot({path:output,type:"jpeg",quality:96});
  }finally{await context.close();}
}

async function renderSocialGraphic(browser){
  const context=await browser.newContext({viewport:{width:1200,height:630},deviceScaleFactor:1,colorScheme:"dark"});
  try{const page=await context.newPage(),background=`data:image/png;base64,${fs.readFileSync(KEY_ART).toString("base64")}`;await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>*{box-sizing:border-box}html,body{width:1200px;height:630px;margin:0;overflow:hidden;background:#0a1118}body{font-family:Inter,"Segoe UI",Arial,sans-serif;color:#f3f5f4}main{position:relative;width:100%;height:100%;background:url('${background}') center/cover no-repeat}main:after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(10,17,24,.83),rgba(10,17,24,.12))}section{position:absolute;z-index:2;left:72px;top:82px;width:710px}.brand{font-size:66px;font-weight:950;letter-spacing:-3px}.brand b{color:#f24a28}.brand em{color:#d6a21f;font-style:normal}.brand i{font-style:normal;color:#68757c;margin:0 18px}h1{margin:86px 0 18px;font-size:58px;line-height:1;text-transform:uppercase}p{font-size:23px;color:#c1c9ca;font-weight:650}</style></head><body><main><section><div class="brand">copa<b>.</b>life<i>×</i>copa <em>ARENA</em></div><h1>İKİ MOD. TEK FUTBOL HİKÂYESİ.</h1><p>Life'ta kulübünü kur. Arena'da dünyaya meydan oku.</p></section></main></body></html>`,{waitUntil:"load"});await page.screenshot({path:path.join(ROOT,"assets","social-v2.jpg"),type:"jpeg",quality:96});}finally{await context.close();}
}

if(!FEATURE_ONLY){for(const target of [LOCALIZED,DEFAULT_PHONE,DEFAULT_TABLET])fs.rmSync(target,{recursive:true,force:true});for(const target of [LOCALIZED,DEFAULT_PHONE,DEFAULT_TABLET])fs.mkdirSync(target,{recursive:true});}
let server=null;if(!FEATURE_ONLY&&!(await serverReady())){server=spawn(process.execPath,[path.join(RUNNER,"static-server.mjs")],{cwd:ROOT,stdio:"ignore",windowsHide:true});for(let attempt=0;attempt<70&&!await serverReady();attempt++)await new Promise(resolve=>setTimeout(resolve,100));if(!(await serverReady()))throw new Error("Static store-asset server did not start");}
const browser=await chromium.launch({headless:true});
try{
  await renderSocialGraphic(browser);
  for(const locale of LOCALES){console.log(`${FEATURE_ONLY?"Rendering":"Capturing"} ${locale.code} dual-mode store assets...`);if(!FEATURE_ONLY){await captureFlow(browser,locale);await captureFlow(browser,locale,{tablet:true});}await renderFeatureGraphic(browser,locale);}
  fs.copyFileSync(path.join(LOCALIZED,"tr-TR","feature-graphic.jpg"),path.join(GRAPHICS,"feature-graphic.jpg"));
  if(!FEATURE_ONLY){copyDirectory(path.join(LOCALIZED,"tr-TR","phone"),DEFAULT_PHONE);copyDirectory(path.join(LOCALIZED,"tr-TR","tablet"),DEFAULT_TABLET);fs.copyFileSync(path.join(ROOT,"web-app-icon-512.png"),path.join(GRAPHICS,"app-icon-512.png"));const assetFiles=["graphics/app-icon-512.png","graphics/feature-graphic.jpg"];for(const folder of ["phone","tablet"])for(const file of SCREENSHOTS)assetFiles.push(`graphics/${folder}/${file}`);for(const locale of LOCALES){assetFiles.push(`graphics/localized/${locale.code}/feature-graphic.jpg`);for(const folder of ["phone","tablet"])for(const file of SCREENSHOTS)assetFiles.push(`graphics/localized/${locale.code}/${folder}/${file}`);}const assets=assetFiles.map(relative=>{const absolute=path.join(STORE,relative),data=fs.readFileSync(absolute),isIcon=relative.endsWith("app-icon-512.png"),isFeature=relative.endsWith("feature-graphic.jpg"),isTablet=relative.includes("/tablet/");return{file:relative,width:isIcon?512:isFeature?1024:isTablet?1920:1080,height:isIcon?512:isFeature?500:isTablet?1080:1920,mime:isIcon?"image/png":"image/jpeg",bytes:data.length,sha256:createHash("sha256").update(data).digest("hex")};});const sourceBuild=JSON.parse(fs.readFileSync(path.join(ROOT,"dist-android/platform-build.json"),"utf8"));fs.writeFileSync(path.join(STORE,"asset-manifest.json"),`${JSON.stringify({generatedAt:new Date().toISOString(),sourceBuild,locales:LOCALES.map(locale=>locale.code),screenshots:SCREENSHOTS,assets},null,2)}\n`);console.log(`Store assets captured: ${assets.length} files across ${LOCALES.length} locales`);}
}finally{await browser.close();if(server)server.kill();}
