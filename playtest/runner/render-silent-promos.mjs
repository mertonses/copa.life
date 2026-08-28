import { spawn } from "node:child_process";
import { once } from "node:events";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const RUNNER=path.dirname(fileURLToPath(import.meta.url));
const ROOT=path.resolve(RUNNER,"../..");
const OUTPUT=path.join(ROOT,"marketing","promo-2026");
const UI=path.join(ROOT,"outputs","ui-visuals");
const CLUBS=path.join(ROOT,"assets","clubs");
const require=createRequire(import.meta.url);
const ffmpegPath=require("../../node_modules/ffmpeg-static");
const FPS=30;
const HOOK_VARIANT=(process.env.COPA_PROMO_HOOK||"A").toUpperCase();

const SHOTS={
  // Use the real star-market screen here so the player beat lands on named stars,
  // ratings, transfer prices and club badges instead of a generic UI frame.
  draft:path.join(ROOT,"store","android","graphics","localized","tr-TR","phone","02-life-stars-tr-eng.jpg"),
  squad:path.join(ROOT,"store","android","graphics","localized","tr-TR","phone","05-life-cup-journey.jpg"),
  arena:path.join(ROOT,"store","android","graphics","localized","tr-TR","phone","08-arena-private-tournaments.jpg"),
  season:path.join(ROOT,"store","android","graphics","localized","tr-TR","phone","06-arena-season-road.jpg"),
};

const STARS=[
  {name:"Victor Osimhen",club:"Galatasaray",league:"Türkiye",power:"94",logo:"Galatasaray.png"},
  {name:"Erling Haaland",club:"Manchester City",league:"İngiltere",power:"94",logo:"Manchester City.png"},
  {name:"Lamine Yamal",club:"Barcelona",league:"İspanya",power:"95",logo:"Barcelona.png"},
  {name:"Harry Kane",club:"Bayern Munich",league:"Almanya",power:"93",logo:"Bayern Munich.png"},
  {name:"Lautaro Martínez",club:"Inter",league:"İtalya",power:"92",logo:"Inter.png"},
  {name:"Erison",club:"Kawasaki Frontale",league:"Japonya",power:"82",logo:""},
];

function esc(value){return String(value).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));}
function dataUrl(file){
  const ext=path.extname(file).toLowerCase();
  const mime=ext===".png"?"image/png":ext===".jpg"||ext===".jpeg"?"image/jpeg":"application/octet-stream";
  return `data:${mime};base64,${fs.readFileSync(file).toString("base64")}`;
}
function image(file){return dataUrl(file);}
function starMarkup(star,english=false){
  const logo=star.logo?`<img class="club-logo" src="${image(path.join(CLUBS,star.logo))}" alt="">`:"<span class=club-dot>◆</span>";
  const league=english?({"Türkiye":"Turkey","İngiltere":"England","İspanya":"Spain","Almanya":"Germany","İtalya":"Italy","Japonya":"Japan"}[star.league]||star.league):star.league;
  return `<div class="star-card"><div class="star-power">${esc(star.power)}</div><div class="star-copy"><strong>${esc(star.name)}</strong><span>${logo}${esc(star.club)}</span><small>${esc(league)} · ${english?"LEAGUE STAR":"LİG YILDIZI"}</small></div></div>`;
}
function clubChip(name,logo){
  const icon=logo?`<img src="${image(path.join(CLUBS,logo))}" alt="">`:"<i>◆</i>";
  return `<span class="club-chip">${icon}${esc(name)}</span>`;
}

const brand=`<div class="brand"><span>copa.</span><b>life</b></div>`;
const androidMark=`<svg viewBox="0 0 28 28" aria-hidden="true"><path d="M8 8.5h12a2 2 0 0 1 2 2v9.5a2 2 0 0 1-2 2h-1v3h-3v-3h-4v3H9v-3H8a2 2 0 0 1-2-2v-9.5a2 2 0 0 1 2-2Z"/><path d="M8.2 8.4A5.9 5.9 0 0 1 14 3.5a5.9 5.9 0 0 1 5.8 4.9Z"/><path d="m10 4-2-3m10 3 2-3" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><circle cx="11" cy="6.5" r=".8" fill="#09131d"/><circle cx="17" cy="6.5" r=".8" fill="#09131d"/></svg>`;
function html(width,height,kind,locale="tr-TR"){
  const english=locale==="en-US";
  const portrait=kind==="reels";
  const shots=english?{
    ...SHOTS,
    draft:path.join(ROOT,"store","android","graphics","localized","en-US","phone","02-life-stars-tr-eng.jpg"),
    squad:path.join(ROOT,"store","android","graphics","localized","en-US","phone","05-life-cup-journey.jpg"),
    season:path.join(ROOT,"store","android","graphics","localized","en-US","phone","06-arena-season-road.jpg"),
    arena:path.join(ROOT,"store","android","graphics","localized","en-US","phone","08-arena-private-tournaments.jpg"),
  }:SHOTS;
  const heroStars=STARS.map(star=>starMarkup(star,english)).join("");
  const hookStars=STARS.slice(0,3).map(star=>starMarkup(star,english)).join("");
  const hookVisual=portrait?`<div class="hook-device"><img src="${image(shots.draft)}" alt=""></div><div class="hook-stars">${hookStars}</div><div class="hook-chip hook-dice"><b>⚄</b><span>${english?"DRAFT":"KADRO SEÇİMİ"}</span></div><div class="hook-chip hook-budget"><b>€</b><span>${english?"MANAGE BUDGET":"BÜTÇENİ YÖNET"}</span></div>`:"";
  const captions=portrait?(english?[
    [0.36,1.416,"BUILD YOUR SQUAD!"],[1.68,2.616,"PICK YOUR STARS!"],[3.024,5.184,"MANAGE YOUR BUDGET. CHASE THE CUP!"],
    [8.544,9.816,"MAKE LIVE DECISIONS."],[10.104,11.064,"BEAT YOUR RIVALS!"],[14.256,14.904,"COPA LIFE"],
    [15.144,16.632,"ON ANDROID & THE WEB"],[16.872,17.376,"PLAY NOW!"],
  ]:[
    [0.36,1.272,"TAKIMINI KUR!"],[1.392,2.52,"YILDIZLARINI SEÇ!"],[2.664,4.344,"BÜTÇEYİ YÖNET. KUPAYA YÜRÜ!"],
    [8.52,9.792,"CANLI KARARLAR VER."],[10.008,11.16,"RAKİBİNİ ALT ET!"],[14.064,14.712,"COPA LIFE"],
    [14.808,16.632,"ANDROID'DE VE WEB'DE"],[16.704,17.40,"HEMEN OYNA!"],
  ]):[];
  const leagueRail=[
    clubChip("Galatasaray","Galatasaray.png"),clubChip("Manchester City","Manchester City.png"),
    clubChip("Barcelona","Barcelona.png"),clubChip("Bayern Munich","Bayern Munich.png"),
    clubChip("Inter","Inter.png"),clubChip("Kawasaki Frontale","")
  ].join("");
  const scenes=portrait?(english?[
    {start:0,end:3,cls:"hook",copy:HOOK_VARIANT==="B"?`${brand}<h1>OSIMHEN OR HAALAND?<br><b>YOUR CALL.</b></h1><p>Pick your star. Build your squad.</p>`:`${brand}<h1>ONE SQUAD.<br><b>THOUSANDS OF DECISIONS.</b></h1><p>Build your power. Manage your budget. Decide on the pitch.</p>`},
    {start:3,end:8.5,cls:"stars",copy:`<div class="kicker">LEAGUE STARS</div><h2>Pick a star.<br><b>Build your team.</b></h2><div class="stars-grid">${heroStars}</div>`},
    {start:8.5,end:10,cls:"build",copy:`<div class="kicker">CUP JOURNEY</div><h2>Clear the groups.<br><b>Reach the final.</b></h2><p>Every round brings a new opponent and a new decision.</p>`},
    {start:10,end:14,cls:"arena",copy:`<div class="kicker gold">PRIVATE TOURNAMENTS</div><h2>Make the call.<br><b>Beat your rivals.</b></h2><p>Create a room and challenge your friends.</p>`},
    {start:14,end:18,cls:"outro",copy:`${brand}<h2>BUILD.<br>PLAY.<br><b>RISE.</b></h2><div class="cta">PLAY NOW</div><div class="platforms">${androidMark}<span>ON ANDROID &amp; WEB</span></div>`},
  ]:[
    {start:0,end:3,cls:"hook",copy:HOOK_VARIANT==="B"?`${brand}<h1>OSIMHEN Mİ, HAALAND MI?<br><b>SEÇİM SENİN.</b></h1><p>Yıldızını seç. Kadronu kur.</p>`:`${brand}<h1>BİR KADRO.<br><b>BİNLERCE KARAR.</b></h1><p>Gücünü kur. Bütçeni yönet. Sahada karar ver.</p>`},
    {start:3,end:8.5,cls:"stars",copy:`<div class="kicker">LİG YILDIZLARI</div><h2>Yıldızını seç.<br><b>Takımını kur.</b></h2><div class="stars-grid">${heroStars}</div>`},
    {start:8.5,end:10,cls:"build",copy:`<div class="kicker">KUPA YOLU</div><h2>Grupları geç.<br><b>Finale ulaş.</b></h2><p>Her tur yeni bir rakip ve yeni bir karar getirir.</p>`},
    {start:10,end:14,cls:"arena",copy:`<div class="kicker gold">ÖZEL TURNUVALAR</div><h2>Karar ver.<br><b>Rakibini alt et.</b></h2><p>Odanı kur, arkadaşlarına meydan oku.</p>`},
    {start:14,end:18,cls:"outro",copy:`${brand}<h2>KUR.<br>OYNA.<br><b>YÜKSEL.</b></h2><div class="cta">HEMEN OYNA</div><div class="platforms">${androidMark}<span>ANDROID'DE VE WEB'DE</span></div>`},
  ]):(english?[
    {start:0,end:2.55,cls:"hook",copy:`${brand}<h1>ROLL THE DICE.<br><b>BUILD YOUR SQUAD.</b></h1><p>Write your own football story.</p><div class="rule"></div>`},
    {start:2.55,end:7.6,cls:"stars",copy:`<div class="kicker">LEAGUE STARS</div><h2>Six leagues.<br><b>One squad battle.</b></h2><div class="league-rail">${leagueRail}</div><div class="stars-grid">${heroStars}</div>`},
    {start:7.6,end:11.7,cls:"build",copy:`<div class="kicker">SQUAD BUILDING</div><h2>Choose more than<br><b>just power.</b></h2><p>Bring transfer fees, position fit, budget and team strength into one decision.</p>`},
    {start:11.7,end:14.2,cls:"cup",copy:`<div class="kicker gold">CUP JOURNEY</div><h2>Clear the groups.<br><b>Reach the final.</b></h2><p>Every round brings a new opponent, a new risk, a new story.</p>`},
    {start:14.2,end:17.6,cls:"arena",copy:`<div class="kicker gold">COPA ARENA</div><h2>Beat a live opponent<br><b>with your decisions.</b></h2><p>Change your tactics while the match is live. Compete on equal terms.</p>`},
    {start:17.6,end:24,cls:"outro",copy:`${brand}<h2>STEP ONTO THE PITCH.<br><b>WRITE YOUR STORY.</b></h2><p>Build in Life. Challenge in Arena.</p><div class="cta">PLAY NOW</div><div class="platforms">${androidMark}<span>ON ANDROID &amp; WEB</span></div>`},
  ]:[
    {start:0,end:2.55,cls:"hook",copy:`${brand}<h1>ZAR AT.<br><b>KADRONU KUR.</b></h1><p>Kendi futbol hikâyeni yaz.</p><div class="rule"></div>`},
    {start:2.55,end:7.6,cls:"stars",copy:`<div class="kicker">LİG YILDIZLARI</div><h2>Altı lig.<br><b>Tek kadro savaşı.</b></h2><div class="league-rail">${leagueRail}</div><div class="stars-grid">${heroStars}</div>`},
    {start:7.6,end:11.7,cls:"build",copy:`<div class="kicker">KADRO KURULUMU</div><h2>Gücünü değil,<br><b>dengeyi de seç.</b></h2><p>Bonservis, mevki uyumu, bütçe ve takım gücü tek kararda buluşur.</p>`},
    {start:11.7,end:14.2,cls:"cup",copy:`<div class="kicker gold">KUPA YOLU</div><h2>Grupları geç.<br><b>Finale ulaş.</b></h2><p>Her turda yeni rakip, yeni risk, yeni bir hikâye.</p>`},
    {start:14.2,end:17.6,cls:"arena",copy:`<div class="kicker gold">COPA ARENA</div><h2>Canlı rakibini<br><b>kararlarınla alt et.</b></h2><p>Maç oynanırken taktiğini değiştir. Aynı şartlarda yarış.</p>`},
    {start:17.6,end:24,cls:"outro",copy:`${brand}<h2>SAHAYA ÇIK.<br><b>HİKÂYENİ YAZ.</b></h2><p>Life'ta kur. Arena'da meydan oku.</p><div class="cta">HEMEN OYNA</div><div class="platforms">${androidMark}<span>ANDROID'DE VE WEB'DE</span></div>`},
  ]);
  const sceneMarkup=scenes.map((scene,index)=>{
    let media="";
    if(scene.cls==="hook")media=hookVisual;
    if(scene.cls==="stars")media=`<div class="device device-draft"><img src="${image(shots.draft)}" alt=""></div>`;
    if(scene.cls==="build")media=`<div class="device device-squad"><img src="${image(shots.squad)}" alt=""></div>`;
    if(scene.cls==="cup")media=`<div class="device device-season"><img src="${image(shots.season)}" alt=""></div>`;
    if(scene.cls==="arena")media=`<div class="device device-arena"><img src="${image(shots.arena)}" alt=""></div>`;
    return `<section class="scene ${scene.cls}" data-start="${scene.start}" data-end="${scene.end}" data-index="${index}"><div class="scene-copy">${scene.copy}</div>${media}</section>`;
  }).join("");
  const captionMarkup=portrait?`<div class="caption-box" id="captionBox"><span></span></div>`:"";
  return `<!doctype html><html><head><meta charset=utf-8><style>
  *{box-sizing:border-box}html,body{margin:0;width:${width}px;height:${height}px;overflow:hidden;background:#09131d;color:#f4f5f3;font-family:Inter,"Segoe UI",Arial,sans-serif}body{position:relative}main{position:relative;width:100%;height:100%;overflow:hidden;background:radial-gradient(circle at 78% 18%,rgba(242,74,40,.15),transparent 30%),linear-gradient(135deg,#09131d,#102532 58%,#071017)}main:before{content:"";position:absolute;inset:-20%;opacity:.18;background-image:linear-gradient(rgba(159,183,188,.18) 1px,transparent 1px),linear-gradient(90deg,rgba(159,183,188,.18) 1px,transparent 1px);background-size:${portrait?"54px":"88px"} ${portrait?"54px":"88px"};transform:rotate(-7deg)}
  .brand{font-size:${portrait?"58px":"76px"};font-weight:950;letter-spacing:-5px;line-height:.9}.brand span{color:#f4f5f3}.brand b{color:#f24a28}.brand em{display:block;font-size:${portrait?"15px":"20px"};letter-spacing:6px;color:#d5a51f;font-style:normal;margin:14px 0 0 5px}.scene{position:absolute;inset:0;opacity:0;will-change:opacity,transform}.scene-copy{position:absolute;z-index:5}.kicker{color:#f24a28;font-size:${portrait?"19px":"24px"};font-weight:900;letter-spacing:${portrait?"4px":"6px"};margin-bottom:22px}.kicker.gold{color:#d9a723}.scene h1,.scene h2{margin:0;text-transform:uppercase;letter-spacing:-3px;line-height:.96}.scene h1{font-size:${portrait?"55px":"78px"}}.scene h2{font-size:${portrait?"47px":"70px"}}.scene h1 b,.scene h2 b{color:#f24a28}.scene p{color:#abb6b8;font-size:${portrait?"20px":"27px"};line-height:1.35;font-weight:650;margin:24px 0 0;max-width:${portrait?"760px":"840px"}}.rule{width:190px;height:8px;background:#f24a28;border-radius:8px;margin-top:40px}.cta{display:inline-flex;margin-top:38px;padding:18px 34px;border-radius:12px;background:#f24a28;color:#101820;font-size:20px;font-weight:950;letter-spacing:2px;box-shadow:0 10px 0 #a83220}.hook .scene-copy{left:${portrait?"58px":"108px"};top:${portrait?"170px":"260px"}}.stars .scene-copy,.build .scene-copy,.cup .scene-copy,.arena .scene-copy{left:${portrait?"52px":"105px"};top:${portrait?"105px":"170px"};width:${portrait?"900px":"830px"}}.outro .scene-copy{inset:0;display:flex;align-items:center;justify-content:center;flex-direction:column;text-align:center}.outro p{max-width:none}.outro .brand{margin-bottom:70px}
  .platforms{display:flex;align-items:center;gap:10px;margin-top:24px;color:#f4f5f3;font-size:${portrait?"17px":"20px"};font-weight:900;letter-spacing:3px}.platforms svg{width:27px;height:27px;color:#3ddc84;fill:#3ddc84;flex:0 0 auto}
  .device{position:absolute;z-index:3;border:3px solid rgba(204,221,219,.52);background:#0c1720;box-shadow:0 35px 90px rgba(0,0,0,.56);overflow:hidden}.device img{display:block;width:100%;height:100%;object-fit:cover;object-position:top}.device-draft,.device-squad{right:${portrait?"-150px":"130px"};top:${portrait?"570px":"88px"};width:${portrait?"780px":"560px"};height:${portrait?"1050px":"920px"};border-radius:${portrait?"34px":"28px"};transform:rotate(${portrait?"-2":"4"}deg)}.device-squad{object-position:top;filter:saturate(1.05)}.device-season,.device-arena{right:${portrait?"-135px":"90px"};top:${portrait?"430px":"90px"};width:${portrait?"770px":"560px"};height:${portrait?"1000px":"910px"};border-radius:${portrait?"34px":"28px"};transform:rotate(${portrait?"2":"-3"}deg)}
  .stars-grid{position:absolute;left:0;top:${portrait?"420px":"300px"};display:grid;grid-template-columns:repeat(${portrait?"2":"2"},${portrait?"365px":"330px"});gap:12px;width:${portrait?"760px":"690px"};z-index:8}.star-card{display:flex;align-items:center;gap:10px;padding:12px 14px;border:1px solid rgba(243,245,244,.3);border-left:4px solid #4e9b65;border-radius:10px;background:rgba(8,18,27,.9);box-shadow:0 10px 28px rgba(0,0,0,.25)}.star-power{font-size:${portrait?"30px":"28px"};font-weight:950;color:#79c890}.star-copy{display:flex;flex-direction:column;min-width:0}.star-copy strong{font-size:${portrait?"17px":"15px"};white-space:nowrap}.star-copy span{display:flex;align-items:center;gap:5px;color:#f4f5f3;font-size:${portrait?"13px":"12px"};font-weight:800;margin-top:3px}.star-copy small{color:#aab5b6;font-size:10px;letter-spacing:1px;margin-top:2px}.club-logo{width:18px;height:18px;object-fit:contain}.club-dot{color:#d9a723}.league-rail{position:absolute;left:0;top:175px;display:flex;gap:8px;flex-wrap:wrap;width:760px;z-index:8}.club-chip{display:inline-flex;align-items:center;gap:7px;padding:9px 12px;border:1px solid rgba(217,167,35,.68);border-radius:999px;background:rgba(8,18,27,.84);color:#f4f5f3;font-size:12px;font-weight:900;letter-spacing:.3px}.club-chip img{width:18px;height:18px;object-fit:contain}.club-chip i{color:#d9a723;font-style:normal}.stars .device{opacity:.92}.build .device,.cup .device,.arena .device{opacity:.95}.cup .scene-copy{top:225px}.arena .scene-copy{top:175px}
  .hook-device{position:absolute;right:-135px;top:700px;width:850px;height:1110px;border:3px solid rgba(204,221,219,.34);border-radius:38px;overflow:hidden;transform:rotate(-5deg);opacity:.46;box-shadow:0 35px 90px rgba(0,0,0,.72)}.hook-device:after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(7,16,23,.02),rgba(7,16,23,.6))}.hook-device img{width:100%;height:100%;object-fit:cover;object-position:top}.hook-stars{position:absolute;left:64px;right:55px;top:690px;height:600px;z-index:8}.hook-stars .star-card{position:absolute;width:445px;padding:18px 20px;border-left-width:7px;background:linear-gradient(110deg,rgba(8,18,27,.98),rgba(18,43,54,.95));box-shadow:0 24px 60px rgba(0,0,0,.5)}.hook-stars .star-card:nth-child(1){left:0;top:65px;transform:rotate(-3deg)}.hook-stars .star-card:nth-child(2){right:0;top:205px;transform:rotate(3deg)}.hook-stars .star-card:nth-child(3){left:70px;top:355px;transform:rotate(-1deg)}.hook-stars .star-power{font-size:42px}.hook-stars .star-copy strong{font-size:22px}.hook-stars .star-copy span{font-size:16px}.hook-stars .star-copy small{font-size:12px}.hook-stars .club-logo{width:23px;height:23px}.hook-chip{position:absolute;z-index:9;display:flex;align-items:center;gap:12px;padding:12px 17px;border:1px solid rgba(217,167,35,.75);border-radius:999px;background:rgba(8,18,27,.94);font-size:14px;font-weight:950;letter-spacing:1.5px;box-shadow:0 14px 32px rgba(0,0,0,.4)}.hook-chip b{display:grid;place-items:center;width:29px;height:29px;border-radius:50%;background:#f24a28;color:#fff;font-size:19px}.hook-dice{left:68px;top:640px}.hook-budget{right:54px;top:1265px}.hook-budget b{background:#d9a723;color:#09131d}
  .caption-box{position:absolute;z-index:30;left:50%;bottom:205px;width:900px;text-align:center;opacity:0;transform:translate(-50%,18px) scale(.96);will-change:opacity,transform}.caption-box span{display:inline-block;max-width:900px;padding:16px 24px 17px;border:1px solid rgba(243,245,244,.22);border-radius:14px;background:rgba(7,16,23,.88);box-shadow:0 16px 42px rgba(0,0,0,.48);color:#f4f5f3;font-size:28px;font-weight:950;line-height:1.08;letter-spacing:.4px;text-transform:uppercase}.caption-box span b{color:#f24a28}
  @media(max-width:1200px){.device-draft,.device-squad{right:-120px}.device-season,.device-arena{right:-100px}}
  </style></head><body><main>${sceneMarkup}${captionMarkup}</main><script>const scenes=[...document.querySelectorAll('.scene')],captions=${JSON.stringify(captions)},captionBox=document.querySelector('#captionBox');const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));const smooth=v=>{v=clamp(v);return v*v*(3-2*v)};window.renderFrame=ms=>{const t=ms/1000;scenes.forEach(s=>{const a=+s.dataset.start,b=+s.dataset.end,fade=.38;const enter=smooth((t-a)/fade),leave=smooth((b-t)/fade);s.style.opacity=String(Math.min(enter,leave));s.style.transform='translate3d('+((1-enter)*70-(1-leave)*45)+'px,0,0) scale('+(1+clamp((t-a)/(b-a))*.018)+')';});if(captionBox){const cue=captions.find(c=>t>=c[0]&&t<c[1]);if(cue){const edge=Math.min(clamp((t-cue[0])/.14),clamp((cue[1]-t)/.14));captionBox.firstElementChild.textContent=cue[2];captionBox.style.opacity=String(edge);captionBox.style.transform='translate(-50%,'+(18-edge*18)+'px) scale('+(0.96+edge*.04)+')';}else captionBox.style.opacity='0';}};window.renderFrame(0)</script></body></html>`;
}

async function render(browser,{kind,width,height,duration,file,locale="tr-TR"}){
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,colorScheme:"dark"});
  const page=await context.newPage();
  await page.setContent(html(width,height,kind,locale),{waitUntil:"load"});
  await page.evaluate(()=>document.fonts.ready);
  const output=path.join(OUTPUT,file);
  const poster=path.join(OUTPUT,file.replace(/\.mp4$/i,"-poster.jpg"));
  const encoder=spawn(ffmpegPath,["-y","-f","image2pipe","-vcodec","mjpeg","-framerate",String(FPS),"-i","-","-c:v","libx264","-preset","medium","-crf","17","-pix_fmt","yuv420p","-r",String(FPS),"-an","-movflags","+faststart",output],{stdio:["pipe","ignore","pipe"]});
  let error="";encoder.stderr.on("data",chunk=>error+=chunk.toString());
  try{
    for(let frame=0;frame<duration*FPS;frame++){
      await page.evaluate(ms=>window.renderFrame(ms),frame/FPS*1000);
      const jpg=await page.screenshot({type:"jpeg",quality:94});
      if(frame===Math.round(FPS*1.1))fs.writeFileSync(poster,jpg);
      if(!encoder.stdin.write(jpg))await once(encoder.stdin,"drain");
    }
    encoder.stdin.end();
    const [code]=await once(encoder,"close");
    if(code!==0)throw new Error(error.slice(-3000));
    console.log(`Rendered ${path.relative(ROOT,output)} ${(fs.statSync(output).size/1024/1024).toFixed(1)} MB`);
  }finally{await context.close();if(encoder.exitCode===null)encoder.kill();}
}

fs.mkdirSync(OUTPUT,{recursive:true});
const browser=await chromium.launch({headless:true});
try{
  const only=process.env.COPA_PROMO_ONLY||"";
  if(!only||only==="store-tr")await render(browser,{kind:"store",width:1920,height:1080,duration:24,file:"copa-life-store-trailer-rhythm-silent-tr-TR.mp4"});
  if(!only||only==="reels-tr")await render(browser,{kind:"reels",width:1080,height:1920,duration:18,file:process.env.COPA_PROMO_FILE||"copa-life-reels-rhythm-silent-tr-TR.mp4"});
  if(!only||only==="store-en")await render(browser,{kind:"store",width:1920,height:1080,duration:24,locale:"en-US",file:"copa-life-store-trailer-rhythm-silent-en-US.mp4"});
  if(!only||only==="reels-en")await render(browser,{kind:"reels",width:1080,height:1920,duration:18,locale:"en-US",file:process.env.COPA_PROMO_FILE||"copa-life-reels-rhythm-silent-en-US.mp4"});
}finally{await browser.close();}
