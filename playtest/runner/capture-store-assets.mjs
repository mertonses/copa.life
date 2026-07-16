import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const RUNNER=path.dirname(fileURLToPath(import.meta.url));
const ROOT=path.resolve(RUNNER,"../..");
const STORE=path.join(ROOT,"store/android");
const PHONE=path.join(STORE,"graphics/phone");
const TABLET=path.join(STORE,"graphics/tablet");
const GRAPHICS=path.join(STORE,"graphics");
const BASE="http://127.0.0.1:5500";
const GAME=`${BASE}/dist-android/index.html?autotest=1`;

fs.rmSync(PHONE,{recursive:true,force:true});
fs.rmSync(TABLET,{recursive:true,force:true});
fs.mkdirSync(PHONE,{recursive:true});
fs.mkdirSync(TABLET,{recursive:true});
fs.mkdirSync(GRAPHICS,{recursive:true});

async function serverReady(){
  try{const response=await fetch(`${BASE}/dist-android/index.html`);return response.ok;}catch{return false;}
}

let server=null;
if(!(await serverReady())){
  server=spawn(process.execPath,[path.join(RUNNER,"static-server.mjs")],{cwd:ROOT,stdio:"ignore",windowsHide:true});
  for(let attempt=0;attempt<50&&!await serverReady();attempt++)await new Promise(resolve=>setTimeout(resolve,100));
  if(!(await serverReady()))throw new Error("Static store-asset server did not start");
}

const browser=await chromium.launch({headless:true});
try{
  const context=await browser.newContext({
    viewport:{width:432,height:768},
    deviceScaleFactor:2.5,
    isMobile:true,
    hasTouch:true,
    locale:"tr-TR",
    colorScheme:"light",
  });
  const page=await context.newPage();
  await page.goto(GAME,{waitUntil:"domcontentloaded"});
  await page.locator("#loader").waitFor({state:"hidden"});
  await page.addStyleTag({content:"*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}"});
  await page.evaluate(()=>window.scrollTo(0,0));
  await page.screenshot({path:path.join(PHONE,"01-her-kosuda-yeni-kadro.jpg"),type:"jpeg",quality:94});

  await page.evaluate(()=>{
    globalThis.eval('pickCountry("TR");formName="4-3-3";slots=FORMATIONS[formName];style="gegen";document.getElementById("seedInput").value="COPA-STORE-2026";beginDraft();');
    globalThis.roll();
  });
  await page.locator("#optstage").waitFor({state:"visible"});
  await page.evaluate(()=>document.querySelector("#draft")?.scrollIntoView({block:"start"}));
  await page.screenshot({path:path.join(PHONE,"02-zar-at-oyuncunu-sec.jpg"),type:"jpeg",quality:94});

  await page.evaluate(()=>globalThis.quickAll());
  await page.locator("#postClubName").waitFor({state:"visible"});
  await page.locator("#postClubName").fill("COPA XI");
  await page.evaluate(()=>globalThis.pcGo());
  await page.locator("#hub").waitFor({state:"visible"});
  await page.evaluate(()=>document.querySelector("#hub")?.scrollIntoView({block:"start"}));
  await page.screenshot({path:path.join(PHONE,"03-taktigini-kur.jpg"),type:"jpeg",quality:94});

  await page.evaluate(()=>{
    const player=globalThis.picksBySlot.find(Boolean);
    globalThis.PlayerProfiles.open(player,document.querySelector("#hubPitch")||document.body,"keyboard");
  });
  await page.locator(".player-profile-layer").waitFor({state:"visible"});
  await page.evaluate(()=>document.querySelector(".player-profile-content")?.scrollTo(0,0));
  await page.screenshot({path:path.join(PHONE,"04-copa-oyuncu-profili.jpg"),type:"jpeg",quality:94});
  await context.close();

  const tabletContext=await browser.newContext({
    viewport:{width:1280,height:720},
    deviceScaleFactor:1.5,
    hasTouch:true,
    locale:"tr-TR",
    colorScheme:"light",
  });
  const tabletPage=await tabletContext.newPage();
  await tabletPage.goto(GAME,{waitUntil:"domcontentloaded"});
  await tabletPage.locator("#loader").waitFor({state:"hidden"});
  await tabletPage.addStyleTag({content:"*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}"});
  await tabletPage.evaluate(()=>window.scrollTo(0,0));
  await tabletPage.screenshot({path:path.join(TABLET,"01-her-kosuda-yeni-kadro.jpg"),type:"jpeg",quality:94});
  await tabletPage.evaluate(()=>{
    globalThis.eval('pickCountry("TR");formName="4-3-3";slots=FORMATIONS[formName];style="gegen";document.getElementById("seedInput").value="COPA-STORE-2026";beginDraft();');
    globalThis.roll();
  });
  await tabletPage.locator("#optstage").waitFor({state:"visible"});
  await tabletPage.evaluate(()=>document.querySelector("#draft")?.scrollIntoView({block:"start"}));
  await tabletPage.screenshot({path:path.join(TABLET,"02-zar-at-oyuncunu-sec.jpg"),type:"jpeg",quality:94});
  await tabletPage.evaluate(()=>globalThis.quickAll());
  await tabletPage.locator("#postClubName").waitFor({state:"visible"});
  await tabletPage.locator("#postClubName").fill("COPA XI");
  await tabletPage.evaluate(()=>globalThis.pcGo());
  await tabletPage.locator("#hub").waitFor({state:"visible"});
  await tabletPage.evaluate(()=>document.querySelector("#hub")?.scrollIntoView({block:"start"}));
  await tabletPage.screenshot({path:path.join(TABLET,"03-taktigini-kur.jpg"),type:"jpeg",quality:94});
  await tabletPage.evaluate(()=>globalThis.openScout());
  await tabletPage.locator("#modal").waitFor({state:"visible"});
  await tabletPage.screenshot({path:path.join(TABLET,"04-rakibini-analiz-et.jpg"),type:"jpeg",quality:94});
  await tabletContext.close();

  const featureContext=await browser.newContext({viewport:{width:1024,height:500},deviceScaleFactor:1,colorScheme:"dark"});
  const featurePage=await featureContext.newPage();
  await featurePage.goto(`${BASE}/store/android/source/feature-graphic.svg`,{waitUntil:"load"});
  await featurePage.screenshot({path:path.join(GRAPHICS,"feature-graphic.jpg"),type:"jpeg",quality:96});
  await featureContext.close();

  fs.copyFileSync(path.join(ROOT,"web-app-icon-512.png"),path.join(GRAPHICS,"app-icon-512.png"));
  const assets=[
    ["graphics/app-icon-512.png",512,512,"image/png"],
    ["graphics/feature-graphic.jpg",1024,500,"image/jpeg"],
    ...fs.readdirSync(PHONE).filter(file=>file.endsWith(".jpg")).sort().map(file=>[`graphics/phone/${file}`,1080,1920,"image/jpeg"]),
    ...fs.readdirSync(TABLET).filter(file=>file.endsWith(".jpg")).sort().map(file=>[`graphics/tablet/${file}`,1920,1080,"image/jpeg"]),
  ].map(([relative,width,height,mime])=>{
    const data=fs.readFileSync(path.join(STORE,relative));
    return {file:relative,width,height,mime,bytes:data.length,sha256:createHash("sha256").update(data).digest("hex")};
  });
  fs.writeFileSync(path.join(STORE,"asset-manifest.json"),`${JSON.stringify({assets},null,2)}\n`);
  console.log(`Store assets captured: ${assets.length} files`);
}finally{
  await browser.close();
  if(server)server.kill();
}
