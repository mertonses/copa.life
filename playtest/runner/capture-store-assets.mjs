import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const RUNNER=path.dirname(fileURLToPath(import.meta.url));
const ROOT=path.resolve(RUNNER,"../..");
const STORE=path.join(ROOT,"store/android");
const GRAPHICS=path.join(STORE,"graphics");
const LOCALIZED=path.join(GRAPHICS,"localized");
const FEATURE_BACKGROUND=path.join(STORE,"source","feature-background-v3.png");
const DEFAULT_PHONE=path.join(GRAPHICS,"phone");
const DEFAULT_TABLET=path.join(GRAPHICS,"tablet");
const BASE="http://127.0.0.1:5500";
const GAME=`${BASE}/dist-android/index.html?autotest=1`;
const DISABLE_MOTION="*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}";
const FEATURE_ONLY=process.argv.includes("--feature-only");

const LOCALES=[
  {code:"tr-TR",lang:"tr",browserLocale:"tr-TR",country:"TR",club:"COPA XI",slogan:"KADRONU KUR. KUPAYA YÜRÜ.",subline:"Her koşuda yeni kararlar, yeni bir futbol hikâyesi."},
  {code:"en-US",lang:"en",browserLocale:"en-US",country:"ENG",club:"COPA XI",slogan:"BUILD YOUR SQUAD. CHASE THE CUP.",subline:"New choices. A new football story in every run."},
  {code:"es-ES",lang:"es",browserLocale:"es-ES",country:"ES",club:"COPA XI",slogan:"CREA TU EQUIPO. VE POR LA COPA.",subline:"Nuevas decisiones. Una nueva historia en cada partida."},
  {code:"de-DE",lang:"de",browserLocale:"de-DE",country:"DE",club:"COPA XI",slogan:"BAU DEIN TEAM. HOL DIR DEN POKAL.",subline:"Neue Entscheidungen. Eine neue Fußballgeschichte pro Run."},
  {code:"it-IT",lang:"it",browserLocale:"it-IT",country:"IT",club:"COPA XI",slogan:"CREA LA ROSA. PUNTA ALLA COPPA.",subline:"Nuove scelte. Una nuova storia di calcio a ogni partita."},
];

const SCREENSHOTS=[
  "01-run-setup.jpg",
  "02-player-draft.jpg",
  "03-group-draw.jpg",
  "04-match-hub.jpg",
  "05-player-profile.jpg",
];

if(!FEATURE_ONLY){
  for(const target of [LOCALIZED,DEFAULT_PHONE,DEFAULT_TABLET])fs.rmSync(target,{recursive:true,force:true});
  for(const target of [LOCALIZED,DEFAULT_PHONE,DEFAULT_TABLET])fs.mkdirSync(target,{recursive:true});
}

async function serverReady(){
  try{const response=await fetch(`${BASE}/dist-android/index.html`);return response.ok;}catch{return false;}
}

function escapeHtml(value){
  return String(value).replace(/[&<>"']/g,character=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[character]);
}

function copyDirectory(source,target){
  fs.mkdirSync(target,{recursive:true});
  for(const file of fs.readdirSync(source))fs.copyFileSync(path.join(source,file),path.join(target,file));
}

async function preparePage(context){
  const page=await context.newPage();
  await page.goto(GAME,{waitUntil:"domcontentloaded"});
  await page.locator("#loader").waitFor({state:"hidden"});
  await page.addStyleTag({content:DISABLE_MOTION});
  await page.evaluate(()=>window.scrollTo(0,0));
  return page;
}

async function captureFlow(browser,locale,{tablet=false}={}){
  const output=path.join(LOCALIZED,locale.code,tablet?"tablet":"phone");
  fs.mkdirSync(output,{recursive:true});
  const context=await browser.newContext(tablet?{
    viewport:{width:1280,height:720},deviceScaleFactor:1.5,hasTouch:true,locale:locale.browserLocale,colorScheme:"dark",
  }:{
    viewport:{width:432,height:768},deviceScaleFactor:2.5,isMobile:true,hasTouch:true,locale:locale.browserLocale,colorScheme:"dark",
  });
  await context.addInitScript(lang=>{
    localStorage.setItem("copa.language",lang);
    localStorage.setItem("copa_theme","dark");
    localStorage.setItem("copa.guide.context.v2",JSON.stringify({setup:1,draft:1,hub:1,bench:1,injury:1,table:1}));
    localStorage.setItem("copa_online_features_onboarding_v1",JSON.stringify({version:"online-features-v1",terms:true,matching:false,sharing:false,leaderboard:false,action:"store_capture"}));
    localStorage.removeItem("copa_run_state_v1");
  },locale.lang);
  try{
    const page=await preparePage(context);
    await page.screenshot({path:path.join(output,SCREENSHOTS[0]),type:"jpeg",quality:94});

    await page.evaluate(async({country,seed})=>{
      if(globalThis.CopaMobileShell?.newRun)globalThis.CopaMobileShell.newRun();
      const originalRandom=Math.random;
      const countryIndex=globalThis.eval(`COUNTRY_CODES.indexOf(${JSON.stringify(country)})`);
      const countryCount=globalThis.eval("COUNTRY_CODES.length");
      Math.random=()=>Math.max(0,countryIndex+.01)/countryCount;
      try{await globalThis.quickStart();}finally{Math.random=originalRandom;}
      if(globalThis._countryDraftPromise)await globalThis._countryDraftPromise;
      globalThis.eval(`document.getElementById("seedInput").value=${JSON.stringify(seed)};makeSeed(${JSON.stringify(seed)});`);
      globalThis.roll();
    },{country:locale.country,seed:`COPA-STORE-${locale.code}-2026`});
    await page.locator("#optstage").waitFor({state:"visible"});
    const firstRollCoach=page.locator("#modal:not(.hidden) .btn-primary");
    if(await firstRollCoach.count()&&await firstRollCoach.first().isVisible())await firstRollCoach.first().click();
    await page.evaluate(()=>globalThis.eval("currentOpts.forEach((candidate,index)=>{candidate.hidden=false;if(index===0){candidate.bargain=true;candidate.discountPct=25;candidate.oldPrice=Math.max(candidate.price+2,Math.ceil(candidate.price/0.75));}});renderOpts();"));
    await page.evaluate(()=>{
      const draft=document.querySelector("#draft"),gallery=document.querySelector(".draft-candidate-gallery");
      if(gallery)gallery.scrollLeft=0;
      if(draft)window.scrollTo(0,draft.getBoundingClientRect().top+window.scrollY);
    });
    await page.screenshot({path:path.join(output,SCREENSHOTS[1]),type:"jpeg",quality:94});

    await page.evaluate(()=>globalThis.quickAll());
    await page.locator("#postClubName").waitFor({state:"visible"});
    await page.locator("#postClubName").fill(locale.club);
    await page.evaluate(()=>globalThis.pcGo());
    await page.locator("#tournamentDraw").waitFor({state:"visible"});
    await page.evaluate(()=>globalThis.fastTournamentDraw());
    await page.screenshot({path:path.join(output,SCREENSHOTS[2]),type:"jpeg",quality:94});
    await page.evaluate(()=>globalThis.finishTournamentDraw());
    await page.locator("#hub").waitFor({state:"visible"});
    await page.evaluate(()=>{
      const hub=document.querySelector("#hub");
      if(hub)window.scrollTo(0,hub.getBoundingClientRect().top+window.scrollY);
    });
    await page.screenshot({path:path.join(output,SCREENSHOTS[3]),type:"jpeg",quality:94});

    await page.evaluate(()=>{
      const player=globalThis.picksBySlot.find(Boolean);
      globalThis.PlayerProfiles.open(player,document.querySelector("#hubPitch")||document.body,"keyboard");
    });
    await page.locator(".player-profile-layer").waitFor({state:"visible"});
    await page.evaluate(()=>document.querySelector(".player-profile-content")?.scrollTo(0,0));
    await page.screenshot({path:path.join(output,SCREENSHOTS[4]),type:"jpeg",quality:94});
  }finally{
    await context.close();
  }
}

async function renderFeatureGraphic(browser,locale){
  const output=path.join(LOCALIZED,locale.code,"feature-graphic.jpg");
  fs.mkdirSync(path.dirname(output),{recursive:true});
  const context=await browser.newContext({viewport:{width:1024,height:500},deviceScaleFactor:1,colorScheme:"dark"});
  try{
    const page=await context.newPage();
    const background=`data:image/png;base64,${fs.readFileSync(FEATURE_BACKGROUND).toString("base64")}`;
    const [headlineLead,...headlineRest]=locale.slogan.split(". ");
    const headlineTail=headlineRest.join(". ");
    await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>
      *{box-sizing:border-box}html,body{width:1024px;height:500px;margin:0;overflow:hidden;background:#101d28}
      body{font-family:Inter,"Segoe UI",Arial,sans-serif;color:#f3f5f4}
      .art{position:relative;width:100%;height:100%;overflow:hidden;background:#0a1118 url('${background}') center/cover no-repeat}
      .art::before{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(10,17,24,.68),rgba(10,17,24,.12) 62%,rgba(10,17,24,.04))}
      .copy{position:absolute;z-index:3;left:64px;top:58px;width:535px}
      .logo{display:flex;align-items:baseline;font-size:68px;font-weight:950;line-height:.9;letter-spacing:-4.5px}.logo span{color:#f3f5f4}.logo b{color:#f24a28}.logo em{font-style:normal;color:#aab2b3}
      .eyebrow{display:flex;align-items:center;gap:10px;margin-top:46px;color:#aab2b3;font-size:12px;font-weight:850;letter-spacing:2.8px;text-transform:uppercase}.eyebrow::before{content:"";width:30px;height:3px;border-radius:99px;background:#f24a28}
      h1{max-width:530px;margin:15px 0 13px;color:#f3f5f4;font-size:39px;line-height:1.02;letter-spacing:-1.1px;text-transform:uppercase}h1 strong{color:#f24a28;font-weight:900}
      p{max-width:480px;margin:0;color:#aab2b3;font-size:17px;font-weight:650;line-height:1.35}
      .rail{position:absolute;z-index:2;left:64px;bottom:45px;display:flex;align-items:center;gap:8px}.rail i{display:block;width:34px;height:5px;border-radius:8px;background:#3a4750}.rail i:first-child{width:72px;background:#f24a28}.rail i:last-child{background:#4e9b65}
      .board{display:none}
      .board::before{content:"";position:absolute;inset:16px;border:1px solid rgba(243,245,244,.25);border-radius:9px;background:linear-gradient(90deg,transparent 49.7%,rgba(243,245,244,.18) 50%,transparent 50.3%)}
      .circle{position:absolute;left:50%;top:50%;width:104px;height:104px;border:1px solid rgba(243,245,244,.26);border-radius:50%;transform:translate(-50%,-50%)}
      .box{position:absolute;left:50%;width:142px;height:58px;border:1px solid rgba(243,245,244,.22);transform:translateX(-50%)}.box.top{top:16px;border-top:0}.box.bottom{bottom:16px;border-bottom:0}
      .token{position:absolute;width:62px;height:58px;padding-top:7px;border:1px solid #3a4750;border-radius:11px;background:#0f1a22;box-shadow:0 8px 16px rgba(0,0,0,.42);text-align:center;transform:rotate(-2deg)}
      .token b{display:block;color:#f3f5f4;font-size:25px;line-height:1}.token small{display:block;margin-top:5px;color:#aab2b3;font-size:8px;font-weight:900;letter-spacing:1.2px}.token.hot{border-color:rgba(242,74,40,.7)}.token.hot b{color:#f24a28}.token.good{border-color:rgba(78,155,101,.8)}.token.good b{color:#79c890}
      .t1{left:149px;top:42px}.t2{left:70px;top:132px}.t3{right:70px;top:132px}.t4{left:149px;top:190px}.t5{left:67px;bottom:58px}.t6{right:67px;bottom:58px}
      .marker{position:absolute;right:18px;top:173px;width:9px;height:74px;border-radius:9px;background:#f24a28;box-shadow:0 0 24px rgba(242,74,40,.45)}
    </style></head><body><main class="art"><section class="copy"><div class="logo"><span>copa</span><b>.</b><em>life</em></div><div class="eyebrow">roguelite football manager</div><h1>${escapeHtml(headlineLead)}${headlineTail?`. <strong>${escapeHtml(headlineTail)}</strong>`:""}</h1><p>${escapeHtml(locale.subline)}</p></section><div class="rail"><i></i><i></i><i></i></div></main></body></html>`,{waitUntil:"load"});
    await page.screenshot({path:output,type:"jpeg",quality:96});
  }finally{
    await context.close();
  }
}

async function renderSocialGraphic(browser){
  const output=path.join(ROOT,"assets","social-v2.jpg");
  const context=await browser.newContext({viewport:{width:1200,height:630},deviceScaleFactor:1,colorScheme:"dark"});
  try{
    const page=await context.newPage();
    const background=`data:image/png;base64,${fs.readFileSync(FEATURE_BACKGROUND).toString("base64")}`;
    await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>
      *{box-sizing:border-box}html,body{width:1200px;height:630px;margin:0;overflow:hidden;background:#0a1118}
      body{font-family:Inter,"Segoe UI",Arial,sans-serif;color:#f3f5f4}
      main{position:relative;width:100%;height:100%;overflow:hidden;background:#0a1118 url('${background}') center/cover no-repeat}
      main::before{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(10,17,24,.86),rgba(10,17,24,.3) 61%,rgba(10,17,24,.08))}
      section{position:absolute;z-index:2;left:72px;top:82px;width:610px}
      .logo{font-size:88px;font-weight:950;line-height:.88;letter-spacing:-6px}.logo span{color:#f3f5f4}.logo b{color:#f24a28}.logo em{color:#aab2b3;font-style:normal}
      .eyebrow{display:flex;align-items:center;gap:12px;margin-top:64px;color:#c1c9ca;font-size:15px;font-weight:900;letter-spacing:3px;text-transform:uppercase}.eyebrow::before{content:"";width:42px;height:4px;border-radius:9px;background:#f24a28}
      h1{max-width:600px;margin:19px 0 17px;font-size:53px;line-height:1.02;letter-spacing:-1.8px;text-transform:uppercase}h1 strong{color:#f24a28}
      p{max-width:560px;margin:0;color:#c1c9ca;font-size:21px;font-weight:650;line-height:1.35}
      .rail{display:flex;gap:9px;margin-top:35px}.rail i{display:block;width:38px;height:6px;border-radius:8px;background:#3a4750}.rail i:first-child{width:84px;background:#f24a28}.rail i:last-child{background:#4e9b65}
    </style></head><body><main><section><div class="logo"><span>copa</span><b>.</b><em>life</em></div><div class="eyebrow">roguelite football manager</div><h1>KADRONU KUR. <strong>KUPAYA YÜRÜ.</strong></h1><p>Her koşuda yeni kararlar, yeni bir futbol hikâyesi.</p><div class="rail"><i></i><i></i><i></i></div></section></main></body></html>`,{waitUntil:"load"});
    await page.screenshot({path:output,type:"jpeg",quality:96});
  }finally{
    await context.close();
  }
}

let server=null;
if(!FEATURE_ONLY&&!(await serverReady())){
  server=spawn(process.execPath,[path.join(RUNNER,"static-server.mjs")],{cwd:ROOT,stdio:"ignore",windowsHide:true});
  for(let attempt=0;attempt<50&&!await serverReady();attempt++)await new Promise(resolve=>setTimeout(resolve,100));
  if(!(await serverReady()))throw new Error("Static store-asset server did not start");
}

const browser=await chromium.launch({headless:true});
try{
  await renderSocialGraphic(browser);
  if(FEATURE_ONLY){
    for(const locale of LOCALES){
      console.log(`Rendering ${locale.code} feature graphic...`);
      await renderFeatureGraphic(browser,locale);
    }
    fs.copyFileSync(path.join(LOCALIZED,"tr-TR","feature-graphic.jpg"),path.join(GRAPHICS,"feature-graphic.jpg"));

    const manifestPath=path.join(STORE,"asset-manifest.json");
    if(fs.existsSync(manifestPath)){
      const manifest=JSON.parse(fs.readFileSync(manifestPath,"utf8"));
      const featureFiles=["graphics/feature-graphic.jpg",...LOCALES.map(locale=>`graphics/localized/${locale.code}/feature-graphic.jpg`)];
      for(const relative of featureFiles){
        const data=fs.readFileSync(path.join(STORE,relative));
        const metadata={file:relative,width:1024,height:500,mime:"image/jpeg",bytes:data.length,sha256:createHash("sha256").update(data).digest("hex")};
        const entry=manifest.assets.find(asset=>asset.file===relative);
        if(entry)Object.assign(entry,metadata);else manifest.assets.push(metadata);
      }
      manifest.generatedAt=new Date().toISOString();
      fs.writeFileSync(manifestPath,`${JSON.stringify(manifest,null,2)}\n`);
    }
    console.log(`Feature graphics rendered across ${LOCALES.length} locales`);
  }else{
  for(const locale of LOCALES){
    console.log(`Capturing ${locale.code} store assets...`);
    await captureFlow(browser,locale);
    await captureFlow(browser,locale,{tablet:true});
    await renderFeatureGraphic(browser,locale);
  }

  const defaultLocale=path.join(LOCALIZED,"tr-TR");
  copyDirectory(path.join(defaultLocale,"phone"),DEFAULT_PHONE);
  copyDirectory(path.join(defaultLocale,"tablet"),DEFAULT_TABLET);
  fs.copyFileSync(path.join(defaultLocale,"feature-graphic.jpg"),path.join(GRAPHICS,"feature-graphic.jpg"));
  fs.copyFileSync(path.join(ROOT,"web-app-icon-512.png"),path.join(GRAPHICS,"app-icon-512.png"));

  const assetFiles=["graphics/app-icon-512.png","graphics/feature-graphic.jpg"];
  for(const folder of ["phone","tablet"]){
    for(const file of SCREENSHOTS)assetFiles.push(`graphics/${folder}/${file}`);
  }
  for(const locale of LOCALES){
    assetFiles.push(`graphics/localized/${locale.code}/feature-graphic.jpg`);
    for(const folder of ["phone","tablet"]){
      for(const file of SCREENSHOTS)assetFiles.push(`graphics/localized/${locale.code}/${folder}/${file}`);
    }
  }
  const assets=assetFiles.map(relative=>{
    const absolute=path.join(STORE,relative),data=fs.readFileSync(absolute);
    const isIcon=relative.endsWith("app-icon-512.png"),isFeature=relative.endsWith("feature-graphic.jpg"),isTablet=relative.includes("/tablet/");
    return {file:relative,width:isIcon?512:isFeature?1024:isTablet?1920:1080,height:isIcon?512:isFeature?500:isTablet?1080:1920,mime:isIcon?"image/png":"image/jpeg",bytes:data.length,sha256:createHash("sha256").update(data).digest("hex")};
  });
  const sourceBuild=JSON.parse(fs.readFileSync(path.join(ROOT,"dist-android/platform-build.json"),"utf8"));
  fs.writeFileSync(path.join(STORE,"asset-manifest.json"),`${JSON.stringify({generatedAt:new Date().toISOString(),sourceBuild,locales:LOCALES.map(locale=>locale.code),assets},null,2)}\n`);
  console.log(`Store assets captured: ${assets.length} files across ${LOCALES.length} locales`);
  }
}finally{
  await browser.close();
  if(server)server.kill();
}
