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
const DEFAULT_PHONE=path.join(GRAPHICS,"phone");
const DEFAULT_TABLET=path.join(GRAPHICS,"tablet");
const BASE="http://127.0.0.1:5500";
const GAME=`${BASE}/dist-android/index.html?autotest=1`;
const DISABLE_MOTION="*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}";

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

for(const target of [LOCALIZED,DEFAULT_PHONE,DEFAULT_TABLET])fs.rmSync(target,{recursive:true,force:true});
for(const target of [LOCALIZED,DEFAULT_PHONE,DEFAULT_TABLET])fs.mkdirSync(target,{recursive:true});

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
    localStorage.removeItem("copa_run_state_v1");
  },locale.lang);
  try{
    const page=await preparePage(context);
    await page.screenshot({path:path.join(output,SCREENSHOTS[0]),type:"jpeg",quality:94});

    await page.evaluate(async({country,seed})=>{
      const script=`pickCountry(${JSON.stringify(country)});formName="4-3-3";slots=FORMATIONS[formName];style="gegen";document.getElementById("seedInput").value=${JSON.stringify(seed)};beginDraft();`;
      globalThis.eval(script);
      if(globalThis._countryDraftPromise)await globalThis._countryDraftPromise;
      globalThis.roll();
    },{country:locale.country,seed:`COPA-STORE-${locale.code}-2026`});
    await page.locator("#optstage").waitFor({state:"visible"});
    await page.evaluate(()=>document.querySelector("#draft")?.scrollIntoView({block:"start"}));
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
    await page.evaluate(()=>document.querySelector("#hub")?.scrollIntoView({block:"start"}));
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
    await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>
      *{box-sizing:border-box}html,body{width:1024px;height:500px;margin:0;overflow:hidden;background:#123c31}
      body{font-family:Inter,"Segoe UI",Arial,sans-serif;color:#f5efe4}
      .art{position:relative;width:100%;height:100%;overflow:hidden;background:url('${BASE}/store/android/source/feature-background-v2.png') center/cover no-repeat}
      .art::after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(4,27,23,.9) 0%,rgba(4,27,23,.68) 38%,rgba(4,27,23,.08) 68%)}
      .copy{position:absolute;z-index:1;left:72px;top:115px;width:510px;text-shadow:0 2px 18px rgba(0,0,0,.38)}
      .logo{font-size:72px;font-weight:900;line-height:.9;letter-spacing:-4px}.logo b{color:#55c684}.logo i{font-style:normal;color:#f5efe4}
      h1{max-width:500px;margin:39px 0 14px;color:#68d391;font-size:27px;line-height:1.08;letter-spacing:1.2px}
      p{max-width:450px;margin:0;color:#efe6d6;font-size:18px;font-weight:600;line-height:1.35}
      .rule{width:72px;height:5px;margin-top:26px;border-radius:99px;background:#ef6847}
    </style></head><body><main class="art"><section class="copy"><div class="logo"><i>copa</i><b>.</b><i>life</i></div><h1>${escapeHtml(locale.slogan)}</h1><p>${escapeHtml(locale.subline)}</p><div class="rule"></div></section></main></body></html>`,{waitUntil:"load"});
    await page.screenshot({path:output,type:"jpeg",quality:96});
  }finally{
    await context.close();
  }
}

let server=null;
if(!(await serverReady())){
  server=spawn(process.execPath,[path.join(RUNNER,"static-server.mjs")],{cwd:ROOT,stdio:"ignore",windowsHide:true});
  for(let attempt=0;attempt<50&&!await serverReady();attempt++)await new Promise(resolve=>setTimeout(resolve,100));
  if(!(await serverReady()))throw new Error("Static store-asset server did not start");
}

const browser=await chromium.launch({headless:true});
try{
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
}finally{
  await browser.close();
  if(server)server.kill();
}
