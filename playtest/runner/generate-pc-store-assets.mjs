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
const DEFAULT=path.join(GRAPHICS,"play-games-pc");
const SOURCE=path.join(STORE,"source/feature-background-dual-mode-v3.png");
const LOCALES=["tr-TR","en-US","es-ES","de-DE","it-IT"];
const SCREENSHOTS=["01-two-modes.jpg","02-life-stars-tr-eng.jpg","03-life-stars-es-de.jpg","04-life-stars-it-jp.jpg","05-life-cup-journey.jpg","06-arena-season-road.jpg","07-arena-live-pvp.jpg","08-arena-private-tournaments.jpg"];

function prepareDirectory(directory){
  fs.rmSync(directory,{recursive:true,force:true});
  fs.mkdirSync(directory,{recursive:true});
}
function copyScreenshots(locale,target){
  const source=path.join(LOCALIZED,locale,"tablet");
  for(const file of SCREENSHOTS)fs.copyFileSync(path.join(source,file),path.join(target,file));
}

const backgroundData=`data:image/png;base64,${fs.readFileSync(SOURCE).toString("base64")}`;
const browser=await chromium.launch({headless:true});
try{
  const context=await browser.newContext({viewport:{width:1920,height:1080},deviceScaleFactor:1});
  const page=await context.newPage();
  await page.setContent(`<!doctype html><style>*{box-sizing:border-box}html,body{margin:0;width:1920px;height:1080px;overflow:hidden;background:#101d28}.cover{width:100%;height:100%;background-image:linear-gradient(90deg,rgba(8,17,22,.18),transparent 40%,rgba(8,17,22,.08)),url(${backgroundData});background-size:cover;background-position:center}</style><div class="cover"></div>`);
  const featureBuffer=await page.screenshot({type:"jpeg",quality:95});

  await page.setViewportSize({width:600,height:400});
  await page.setContent(`<!doctype html><style>*{box-sizing:border-box}html,body{margin:0;width:600px;height:400px;overflow:hidden;background:transparent;display:grid;place-items:center}.logo{display:flex;flex-direction:column;align-items:center;padding:30px;font-family:Inter,"Segoe UI",Arial,sans-serif;font-weight:950;line-height:1;filter:drop-shadow(0 7px 10px rgba(0,0,0,.28))}.main{font-size:98px;letter-spacing:-7px}.copa,.life{color:#f3f5f4}.dot{color:#f24a28}.arena{margin-top:24px;color:#d6a21f;font-size:33px;letter-spacing:2px}</style><div class="logo"><div class="main"><span class="copa">copa</span><span class="dot">.</span><span class="life">life</span></div><small class="arena">× COPA ARENA</small></div>`);
  const logoBuffer=await page.screenshot({type:"png",omitBackground:true});
  await context.close();

  for(const locale of LOCALES){
    const target=path.join(LOCALIZED,locale,"play-games-pc");prepareDirectory(target);
    fs.writeFileSync(path.join(target,"logo-600x400.png"),logoBuffer);
    fs.writeFileSync(path.join(target,"feature-1920x1080.jpg"),featureBuffer);
    copyScreenshots(locale,target);
  }
  prepareDirectory(DEFAULT);
  for(const file of fs.readdirSync(path.join(LOCALIZED,"en-US","play-games-pc")))fs.copyFileSync(path.join(LOCALIZED,"en-US","play-games-pc",file),path.join(DEFAULT,file));

  const manifestPath=path.join(STORE,"asset-manifest.json");
  const manifest=JSON.parse(fs.readFileSync(manifestPath,"utf8"));
  manifest.assets=(manifest.assets||[]).filter(asset=>!asset.file.includes("/play-games-pc/"));
  for(const root of ["graphics/play-games-pc",...LOCALES.map(locale=>`graphics/localized/${locale}/play-games-pc`)]){
    for(const file of fs.readdirSync(path.join(STORE,root)).sort()){
      const relative=`${root}/${file}`,data=fs.readFileSync(path.join(STORE,relative));
      const logo=file.endsWith(".png");
      manifest.assets.push({file:relative,width:logo?600:1920,height:logo?400:1080,mime:logo?"image/png":"image/jpeg",bytes:data.length,sha256:createHash("sha256").update(data).digest("hex")});
    }
  }
  manifest.generatedAt=new Date().toISOString();
  fs.writeFileSync(manifestPath,`${JSON.stringify(manifest,null,2)}\n`);
  console.log(`Google Play Games on PC assets generated for ${LOCALES.length} locales.`);
}finally{await browser.close();}
