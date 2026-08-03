import { spawn } from "node:child_process";
import { once } from "node:events";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const RUNNER=path.dirname(fileURLToPath(import.meta.url));
const ROOT=path.resolve(RUNNER,"../..");
const STORE=path.join(ROOT,"store/android");
const OUTPUT=path.join(STORE,"video");
const KEY_ART=path.join(STORE,"source","feature-background-dual-mode-v3.png");
const WIDTH=1920;
const HEIGHT=1080;
const FPS=15;
const DURATION=26;
const TOTAL_FRAMES=FPS*DURATION;
const require=createRequire(import.meta.url);
const ffmpegPath=require("../../node_modules/ffmpeg-static");
const ONLY_LOCALE=process.argv.find(argument=>argument.startsWith("--locale="))?.split("=")[1]||"";

const LOCALES=[
  {
    code:"tr-TR",
    intro:"İKİ MOD. TEK FUTBOL HİKÂYESİ.",
    outro:"LIFE'TA KUR. ARENA'DA MEYDAN OKU.",
    footer:"Kupanı kovala. Canlı rakiplere meydan oku.",
    slides:[
      ["MODUNU SEÇ","Tek oyunculu Life veya canlı Copa Arena."],
      ["TÜRKİYE × İNGİLTERE","Lig yıldızlarıyla kadronu kur."],
      ["İSPANYA × ALMANYA","Gücü, fiyatı ve mevki uyumunu dengele."],
      ["İTALYA × JAPONYA","Her lig, her koşu, yeni bir kadro."],
      ["KUPAYA YÜRÜ","Grupları geç, elemelere ve finale çık."],
      ["SEZON YOLUNU İLERLET","Rating kazan, kozmetiklerini aç."],
      ["CANLI TAKTİK SAVAŞI","Dört pencerede rakibinin kararına cevap ver."],
      ["ARKADAŞLARINLA OYNA","Özel oda veya 4/8 kulüplü turnuva kur."],
    ],
  },
  {
    code:"en-US",
    intro:"TWO MODES. ONE FOOTBALL STORY.",
    outro:"BUILD IN LIFE. CHALLENGE IN ARENA.",
    footer:"Chase the cup. Challenge live opponents.",
    slides:[
      ["CHOOSE YOUR MODE","Single-player Life or live Copa Arena."],
      ["TÜRKİYE × ENGLAND","Draft league stars for your squad."],
      ["SPAIN × GERMANY","Balance power, price and position fit."],
      ["ITALY × JAPAN","Every league. Every run. A new squad."],
      ["CHASE THE CUP","Escape the group and reach the final."],
      ["CLIMB THE SEASON ROAD","Earn rating and unlock cosmetics."],
      ["LIVE TACTICAL BATTLES","Answer your opponent across four windows."],
      ["PLAY WITH FRIENDS","Create a private room or 4/8-club tournament."],
    ],
  },
  {
    code:"es-ES",
    intro:"DOS MODOS. UNA HISTORIA DE FÚTBOL.",
    outro:"CREA EN LIFE. DESAFÍA EN ARENA.",
    footer:"Ve por la copa. Desafía a rivales en vivo.",
    slides:[
      ["ELIGE TU MODO","Life en solitario o Copa Arena en vivo."],
      ["TURQUÍA × INGLATERRA","Crea tu plantilla con estrellas."],
      ["ESPAÑA × ALEMANIA","Equilibra nivel, precio y posición."],
      ["ITALIA × JAPÓN","Cada liga y partida trae una nueva plantilla."],
      ["VE POR LA COPA","Supera el grupo y alcanza la final."],
      ["AVANZA EN LA TEMPORADA","Gana rating y desbloquea cosméticos."],
      ["BATALLAS TÁCTICAS EN VIVO","Responde al rival en cuatro ventanas."],
      ["JUEGA CON AMIGOS","Crea una sala o torneo para 4/8 clubes."],
    ],
  },
  {
    code:"de-DE",
    intro:"ZWEI MODI. EINE FUSSBALLGESCHICHTE.",
    outro:"BAUE IN LIFE. FORDERE IN ARENA HERAUS.",
    footer:"Jage den Pokal. Fordere Live-Gegner heraus.",
    slides:[
      ["WÄHLE DEINEN MODUS","Life im Einzelspiel oder Copa Arena live."],
      ["TÜRKEI × ENGLAND","Drafte Ligastars für deinen Kader."],
      ["SPANIEN × DEUTSCHLAND","Balanciere Stärke, Preis und Position."],
      ["ITALIEN × JAPAN","Jede Liga und jeder Run bringt ein neues Team."],
      ["JAGE DEN POKAL","Überstehe die Gruppe und erreiche das Finale."],
      ["STEIGE IM SAISONWEG AUF","Gewinne Rating und schalte Kosmetik frei."],
      ["LIVE-TAKTIKDUELLE","Antworte dem Gegner in vier Fenstern."],
      ["SPIELE MIT FREUNDEN","Erstelle Raum oder Turnier für 4/8 Clubs."],
    ],
  },
  {
    code:"it-IT",
    intro:"DUE MODALITÀ. UNA STORIA DI CALCIO.",
    outro:"CREA IN LIFE. SFIDA IN ARENA.",
    footer:"Punta alla coppa. Sfida avversari dal vivo.",
    slides:[
      ["SCEGLI LA MODALITÀ","Life in singolo o Copa Arena live."],
      ["TURCHIA × INGHILTERRA","Crea la rosa con le stelle dei campionati."],
      ["SPAGNA × GERMANIA","Bilancia forza, prezzo e ruolo."],
      ["ITALIA × GIAPPONE","Ogni campionato e partita crea una nuova rosa."],
      ["PUNTA ALLA COPPA","Supera i gironi e raggiungi la finale."],
      ["AVANZA NELLA STAGIONE","Ottieni rating e sblocca cosmetici."],
      ["SFIDE TATTICHE LIVE","Rispondi al rivale in quattro finestre."],
      ["GIOCA CON GLI AMICI","Crea una stanza o torneo per 4/8 club."],
    ],
  },
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

function dataUrl(file){
  return `data:image/jpeg;base64,${fs.readFileSync(file).toString("base64")}`;
}

function escapeHtml(value){
  return String(value).replace(/[&<>"']/g,character=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[character]);
}

function sceneMarkup(locale,images){
  const intro=`<section class="scene intro" data-start="0" data-end="1.5">
    <div class="formation" aria-hidden="true"><i class="p p1">88</i><i class="p p2">82</i><i class="p p3">75</i><i class="p p4">85</i><i class="p p5">80</i></div>
    <div class="intro-copy"><div class="logo"><span>copa</span><b>.</b><em>life × ARENA</em></div><h1>${escapeHtml(locale.intro)}</h1><p>${escapeHtml(locale.footer)}</p></div>
  </section>`;
  const slides=locale.slides.map(([title,subtitle],index)=>`<section class="scene game" data-start="${1.5+index*2.75}" data-end="${1.5+(index+1)*2.75}">
    <div class="blur" style="background-image:url('${images[index]}')"></div><div class="shade"></div>
    <div class="slide-copy"><div class="count">0${index+1} / 08</div><h2>${escapeHtml(title)}</h2><p>${escapeHtml(subtitle)}</p><div class="accent"></div></div>
    <div class="phone"><img src="${images[index]}" alt=""></div>
  </section>`).join("");
  const outro=`<section class="scene outro" data-start="23.5" data-end="26">
    <div class="outro-mark"><span>copa</span><b>.</b><em>life × ARENA</em></div><h2>${escapeHtml(locale.outro)}</h2><p>${escapeHtml(locale.footer)}</p><div class="outro-rule"></div>
  </section>`;
  return `${intro}${slides}${outro}`;
}

function documentHtml(locale,images,keyArt){
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    *{box-sizing:border-box}html,body{width:${WIDTH}px;height:${HEIGHT}px;margin:0;overflow:hidden;background:#0a1118}body{font-family:Inter,"Segoe UI",Arial,sans-serif;color:#f3f5f4}
    main{position:relative;width:100%;height:100%;overflow:hidden;background:linear-gradient(90deg,rgba(10,17,24,.74),rgba(10,17,24,.14)),url('${keyArt}') center/cover no-repeat,#0a1118}
    main::before{content:"";position:absolute;inset:-90px;opacity:.3;background-image:linear-gradient(rgba(104,117,124,.14) 1px,transparent 1px),linear-gradient(90deg,rgba(104,117,124,.14) 1px,transparent 1px);background-size:72px 72px;transform:rotate(-4deg)}
    main::after{content:"";position:absolute;right:-150px;top:-320px;width:650px;height:560px;border:64px solid rgba(242,74,40,.18);transform:rotate(29deg)}
    .scene{position:absolute;inset:0;opacity:0;overflow:hidden;will-change:opacity,transform}
    .brand-corner{position:absolute;z-index:20;left:72px;top:54px;color:#aab2b3;font-weight:900;font-size:27px;letter-spacing:-1px}.brand-corner b{color:#f24a28}.brand-corner span{color:#f3f5f4}
    .intro-copy{position:absolute;z-index:4;left:125px;top:250px;width:1120px}.logo,.outro-mark{font-size:104px;font-weight:950;line-height:.88;letter-spacing:-6px}.logo span,.outro-mark span{color:#f3f5f4}.logo b,.outro-mark b{color:#f24a28}.logo em,.outro-mark em{font-style:normal;color:#d6a21f}
    .intro h1{width:1070px;margin:78px 0 18px;font-size:61px;line-height:1.02;letter-spacing:-2px;text-transform:uppercase}.intro p,.outro p{margin:0;color:#aab2b3;font-size:26px;font-weight:650}
    .formation{position:absolute;right:80px;top:100px;width:580px;height:880px;border:2px solid rgba(243,245,244,.25);border-radius:36px;background:linear-gradient(160deg,rgba(39,52,60,.94),rgba(23,36,45,.94));box-shadow:0 42px 100px rgba(0,0,0,.42);transform:rotate(4deg)}.formation::before{content:"";position:absolute;inset:32px;border:2px solid rgba(243,245,244,.18);border-radius:18px;background:linear-gradient(90deg,transparent 49.8%,rgba(243,245,244,.17) 50%,transparent 50.2%)}.formation::after{content:"";position:absolute;left:50%;top:50%;width:190px;height:190px;border:2px solid rgba(243,245,244,.18);border-radius:50%;transform:translate(-50%,-50%)}
    .p{position:absolute;z-index:2;width:104px;height:94px;padding-top:24px;border:2px solid #3a4750;border-radius:18px;background:#0f1a22;box-shadow:0 16px 30px rgba(0,0,0,.4);color:#f3f5f4;font-size:39px;font-style:normal;font-weight:900;text-align:center}.p1{left:238px;top:88px;color:#f24a28;border-color:#f24a28}.p2{left:105px;top:290px;color:#79c890;border-color:#4e9b65}.p3{right:105px;top:290px}.p4{left:238px;top:448px;color:#f24a28;border-color:#f24a28}.p5{left:238px;bottom:84px;color:#79c890;border-color:#4e9b65}
    .blur{position:absolute;inset:-100px;background-position:center;background-size:cover;filter:blur(42px) saturate(.72);opacity:.28;transform:scale(1.18)}.shade{position:absolute;inset:0;background:linear-gradient(90deg,rgba(10,17,24,.97) 0%,rgba(16,29,40,.88) 45%,rgba(10,17,24,.42) 100%)}
    .slide-copy{position:absolute;z-index:5;left:125px;top:300px;width:850px}.count{color:#f24a28;font-size:20px;font-weight:900;letter-spacing:4px}.slide-copy h2{margin:26px 0 22px;font-size:70px;line-height:1.02;letter-spacing:-2.5px;text-transform:uppercase}.slide-copy p{max-width:760px;margin:0;color:#aab2b3;font-size:29px;font-weight:650;line-height:1.35}.accent{width:118px;height:8px;margin-top:40px;border-radius:10px;background:#f24a28;box-shadow:145px 0 #3a4750,205px 0 #4e9b65}
    .phone{position:absolute;z-index:4;right:185px;top:78px;width:520px;height:925px;border:3px solid #68757c;border-radius:42px;background:#101d28;box-shadow:0 36px 90px rgba(0,0,0,.55);overflow:hidden;transform-origin:center}.phone::before{content:"";position:absolute;z-index:2;left:50%;top:13px;width:100px;height:12px;border-radius:99px;background:#0a1118;transform:translateX(-50%)}.phone img{display:block;width:100%;height:auto}
    .outro{display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center}.outro-mark{font-size:116px}.outro h2{max-width:1450px;margin:88px 0 24px;font-size:76px;line-height:1;text-transform:uppercase}.outro-rule{width:180px;height:9px;margin-top:48px;border-radius:12px;background:#f24a28;box-shadow:210px 0 #4e9b65,-210px 0 #3a4750}
  </style></head><body><main><div class="brand-corner"><span>copa</span><b>.</b>life × ARENA</div>${sceneMarkup(locale,images)}</main><script>
    const scenes=[...document.querySelectorAll('.scene')];
    const clamp=(value,min=0,max=1)=>Math.max(min,Math.min(max,value));
    const smooth=value=>{value=clamp(value);return value*value*(3-2*value)};
    window.renderFrame=(timeMs)=>{
      const t=timeMs/1000;
      scenes.forEach(scene=>{
        const start=Number(scene.dataset.start),end=Number(scene.dataset.end),fade=.28;
        const enter=smooth((t-start)/fade),leave=smooth((end-t)/fade),opacity=Math.min(enter,leave);
        const progress=clamp((t-start)/(end-start));
        scene.style.opacity=String(opacity);
        scene.style.transform='translate3d('+((1-enter)*95-(1-leave)*55)+'px,0,0) scale('+(1+progress*.018)+')';
        const phone=scene.querySelector('.phone');
        if(phone)phone.style.transform='translate3d(0,'+(22-progress*46)+'px,0) rotate('+((progress-.5)*1.2)+'deg) scale('+(.985+progress*.025)+')';
        const formation=scene.querySelector('.formation');
        if(formation)formation.style.transform='translate3d(0,'+(18-progress*36)+'px,0) rotate('+(4-progress*1.2)+'deg)';
      });
    };
    window.renderFrame(0);
  </script></body></html>`;
}

async function renderLocale(browser,locale){
  const phoneDir=path.join(STORE,"graphics","localized",locale.code,"phone");
  const images=SCREENSHOTS.map(file=>dataUrl(path.join(phoneDir,file)));
  const keyArt=`data:image/png;base64,${fs.readFileSync(KEY_ART).toString("base64")}`;
  const context=await browser.newContext({viewport:{width:WIDTH,height:HEIGHT},deviceScaleFactor:1,colorScheme:"dark"});
  const output=path.join(OUTPUT,`copa-dual-mode-promo-${locale.code}.mp4`);
  const poster=path.join(OUTPUT,`copa-dual-mode-promo-${locale.code}-poster.jpg`);
  const encoder=spawn(ffmpegPath,[
    "-y","-f","image2pipe","-vcodec","mjpeg","-framerate",String(FPS),"-i","-",
    "-f","lavfi","-i",`anullsrc=channel_layout=stereo:sample_rate=48000:d=${DURATION}`,
    "-c:v","libx264","-preset","medium","-crf","18","-pix_fmt","yuv420p","-r",String(FPS),
    "-c:a","aac","-b:a","128k","-shortest","-movflags","+faststart",output,
  ],{stdio:["pipe","ignore","pipe"]});
  let encoderError="";
  encoder.stderr.on("data",chunk=>{encoderError+=chunk.toString();});
  try{
    const page=await context.newPage();
    await page.setContent(documentHtml(locale,images,keyArt),{waitUntil:"load"});
    await page.evaluate(()=>document.fonts.ready);
    for(let frame=0;frame<TOTAL_FRAMES;frame++){
      await page.evaluate(time=>window.renderFrame(time),frame/FPS*1000);
      const jpeg=await page.screenshot({type:"jpeg",quality:91});
      if(frame===Math.round(FPS*1.4))fs.writeFileSync(poster,jpeg);
      if(!encoder.stdin.write(jpeg))await once(encoder.stdin,"drain");
      if(frame>0&&frame%(FPS*5)===0)console.log(`  ${locale.code}: ${Math.round(frame/FPS)} / ${DURATION} s`);
    }
    encoder.stdin.end();
    const [exitCode]=await once(encoder,"close");
    if(exitCode!==0)throw new Error(`FFmpeg failed for ${locale.code}:\n${encoderError.slice(-3000)}`);
  }finally{
    await context.close();
    if(!encoder.killed&&encoder.exitCode===null)encoder.kill();
  }
  console.log(`Rendered ${path.relative(ROOT,output)} (${(fs.statSync(output).size/1024/1024).toFixed(1)} MB)`);
}

fs.mkdirSync(OUTPUT,{recursive:true});
for(const file of fs.readdirSync(OUTPUT))if(/^copa-(life|dual-mode)-promo-.*\.(mp4|jpg)$/i.test(file)&&(!ONLY_LOCALE||file.includes(ONLY_LOCALE)))fs.rmSync(path.join(OUTPUT,file));
const browser=await chromium.launch({headless:true});
try{
  const selected=ONLY_LOCALE?LOCALES.filter(locale=>locale.code===ONLY_LOCALE):LOCALES;
  if(!selected.length)throw new Error(`Unknown locale: ${ONLY_LOCALE}`);
  for(const locale of selected)await renderLocale(browser,locale);
}finally{
  await browser.close();
}
