/* finalSim.js — PDF-spec football simulation engine
   Three-layer: Simulation / Tactical Choreography / Visual Playback
   Fixed timestep 1/30s · Seeded RNG · Ball state machine · Slot system */

/* sim and _simPaused declared in index.html */
/* 1x target: every final sim starts calm; speed changes are match-local. */
var speedMul = 12;

const UI_COLORS = {
  pitchLight: "#429A73",
  pitchDark:  "#3B8B68",
  pitchLine:  "rgba(255,255,255,0.75)",
  pitchLineSub: "rgba(255,255,255,0.5)",
  teamHome:   "#2563eb",
  teamAway:   "#dc2626",
  teamHomeInj:"#f97316",
  teamAwayInj:"#fb7185",
  gkHome:     "#ca8a04",
  gkAway:     "#c2410c",
  ballHi:     "#ffffff",
  ballBase:   "#bbbbbb",
};

function setSpeed(s) {
  speedMul = s;
  try { localStorage.setItem("copa_spd", s); } catch (e) {}
  document.querySelectorAll(".spd").forEach(b => b.classList.toggle("on", parseFloat(b.dataset.s) === s));
}
function simPause() { if (sim && sim.pause) sim.pause(); }
function simSkip()  { if (sim && sim.skip)  sim.skip();  }

/* ── Seeded RNG (legacy export + class) ── */
function seededRand(seed) {
  let s = (seed ^ 0x9e3779b9) >>> 0;
  return function() { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}
class _RNG {
  constructor(seed) { this.s = (seed ^ 0x9e3779b9) >>> 0; }
  next()  { this.s ^= this.s << 13; this.s ^= this.s >>> 17; this.s ^= this.s << 5; this.s >>>= 0; return this.s / 4294967296; }
  rng(lo,hi) { return lo + this.next() * (hi - lo); }
  int(n)  { return Math.floor(this.next() * n); }
  pick(a) { return a[this.int(a.length)]; }
  bool(p) { return this.next() < p; }
}

/* ── Legacy helpers (used by game logic) ── */
function winProb(a, b) { return 0.5 + 0.45 * Math.tanh((a - b) / 28); }
function getPhase(clock) {
  if (clock < 20) return { id:'early', scoreRate:0.68, eventRate:0.66 };
  if (clock < 65) return { id:'mid',   scoreRate:0.96, eventRate:0.86 };
  if (clock < 90) return { id:'late',  scoreRate:1.18, eventRate:1.05 };
                  return { id:'et',    scoreRate:0.78, eventRate:0.68 };
}
function clockDisp(clock, extraTime, FULL) {
  const c = Math.floor(clock);
  if (extraTime) {
    if (c <= FULL+15) return Math.min(105, 91+(c-Math.floor(FULL)));
    return Math.min(120, 106+(c-Math.floor(FULL+15)));
  }
  if (c > 90) return "90+"+(c-90);
  return Math.max(1, c);
}
function _cardBonusFinal() {
  if (typeof cards==="undefined"||typeof cardEff!=="function") return 0;
  const ps=(typeof picksBySlot!=="undefined"?picksBySlot:[]).filter(Boolean);
  let b=0; cards.forEach(k=>{ try{const v=cardEff(k,ps,6);if(v>0)b+=v*0.14;}catch(e){} }); return b;
}
const _COMM = {
  goal_tr:["Goooool!","Net buluyor!","İnanılmaz!","Harika gol!","Şampiyonluk golü!","Geçilmez!","Muazzam!","Ağlar havalanıyor!","Kaleci çaresiz!","Sanat eseri!","Fırsat değerlendirdi!","Kusursuz bitiriş!","Kupa golü bu!","Ne gol bu be!","Tribünler çılgına döndü!"],
  goal_en:["Goooal!","In the net!","Incredible!","What a goal!","Cup-winning strike!","Unstoppable!","Magnificent!","Net bulging!","Keeper had no chance!","A work of art!","Clinical finish!","Perfect execution!","That's a cup goal!","What a strike!","The crowd goes wild!"],
  save_tr:["Kaleci kurtardı!","Müthiş refleks!","Az kalsın!","Direğe çarptı!","İnanılmaz kurtarış!","Kaleci devin gibi!","Uzanıp kurtardı!","Son anda!","Olağanüstü!","Kapıyı kapattı!"],
  save_en:["Keeper saves!","Great reflex!","So close!","Off the post!","Incredible save!","Keeper stood tall!","Fingertip save!","Last ditch!","Outstanding!","Shut the door!"],
  chance_tr:["Büyük fırsat!","Tehlikeli atak!","Neredeyse gol!","İnanılmaz kaçırdı!","Açık kale kaçtı!","Nasıl atmadı!","Kaleyi gördü ama!","Bir metre sağdan!","Ayağından gitmedi!","Kombinasyon vardı!"],
  chance_en:["Big chance!","Dangerous attack!","Almost a goal!","Incredible miss!","Open goal missed!","How did that miss!","Had the goal at his mercy!","Just wide!","Couldn't control it!","Great combination!"],
  wide_tr:["Yandan dışarı!","Iskaladı!","Az kaldı!","Kaleyi bulamadı!","Yan direkten döndü!","Çok sert vurdu!","Kaleye yakın ama!"],
  wide_en:["Wide of the goal!","Missed it!","So close!","Couldn't find the frame!","Off the side post!","Too much power!","Close but not close enough!"],
  corner_tr:["Köşe vuruşu!","Set topu fırsatı!","Köşe — büyük fırsat!","Tehlikeli köşe!","Ortalama geliyor!"],
  corner_en:["Corner kick!","Set piece opportunity!","Corner — big chance!","Dangerous corner!","Ball coming in!"],
  freekick_tr:["Serbest vuruş!","Taktik faul!","Set topu!","Mükemmel açı!","Duran top durumu!","Tehlikeli pozisyon!"],
  freekick_en:["Free kick!","Tactical foul!","Set piece!","Perfect angle!","Dangerous set piece!","Great position!"],
  press_tr:["⬆️ Yüksek baskı etkisi!","🔥 Üst sahada kapan!","⚡ Hızlı top kazanımı!","💪 Baskı çalışıyor!","🎯 Tuzak kuruldu!"],
  press_en:["⬆️ High press working!","🔥 Trap in upper third!","⚡ Quick ball recovery!","💪 The press is on!","🎯 Trap sprung!"],
  tempo_tr:["⏬ Tempo düşüyor","🧘 Kontrollü oyun","💧 Sakin sakin","⏳ Top dolaşıyor","🔄 Çeviriyor çeviriyor"],
  tempo_en:["⏬ Slowing the tempo","🧘 Controlled football","💧 Nice and calm","⏳ Keeping the ball","🔄 Recycling possession"],
  protect_tr:["🛡️ Savunma duvarı","⏱️ Zaman yönetimi","🔒 Kilit vuruldu","🏰 Kale kapalı","🤝 Sıkı blok"],
  protect_en:["🛡️ Defensive wall","⏱️ Time management","🔒 Locked down","🏰 Gate is shut","🤝 Compact shape"],
  surge_tr:["💥 Yükleniyoruz!","⚡ Tam gaz!","🌊 Baskı arttı!","🔥 Gol arıyoruz!","⚡ Hücum dalgası!"],
  surge_en:["💥 Surging now!","⚡ Full throttle!","🌊 Pressure building!","🔥 Hunting the goal!","⚡ Attack wave!"],
  tackle_tr:["💥 Sert müdahale!","🦵 Top çalındı!","⚡ Kesintisiz savunma!","🛡️ Harika müdahale!","💢 Top kaptı!"],
  tackle_en:["💥 Strong tackle!","🦵 Ball stolen!","⚡ Tenacious defending!","🛡️ Great challenge!","💢 Dispossessed!"],
  counter_tr:["🏃 Kontra atak!","⚡ Hızlı geçiş!","🔥 Hız farkı var!","💨 Savunmayı geçti!","🏹 Sürat koşusu!"],
  counter_en:["🏃 Counter attack!","⚡ Quick transition!","🔥 Pace differential!","💨 Beat the defence!","🏹 Sprint on!"],
  combo_tr:["🎵 Harika kombinasyon!","🎯 Üç-dört pas birden!","✨ Tek dokunuşlarla!","🎪 Şık oyun!","🌀 Geçiş oyunu mükemmel!"],
  combo_en:["🎵 Great combination!","🎯 Three-four touch play!","✨ One-twos everywhere!","🎪 Slick football!","🌀 Passing brilliance!"],
  through_tr:["🔑 Arkasına düştü!","🎯 Arkaya pas!","⚡ Savunmayı çaktırmadan!","🏃 Arayı açtı!","💫 Nefis açık!"],
  through_en:["🔑 In behind!","🎯 Through ball!","⚡ Split the defence!","🏃 Made the run!","💫 Beautiful ball!"],
};
function _pickComm(pool, rng) { return pool[Math.floor(rng()*pool.length)]; }

function _pickerA(rng) {
  if (typeof picksBySlot==="undefined") return "?";
  const cands=picksBySlot.filter(p=>p&&p.pos&&!["GK","CB","LB","RB","WB"].includes(p.pos));
  if (!cands.length) { const all=picksBySlot.filter(Boolean); return all.length?all[Math.floor(rng()*all.length)].name.split(" ").pop():"?"; }
  return cands[Math.floor(rng()*cands.length)].name.split(" ").pop();
}
function _pickerB(rng) {
  if (typeof oppLineup!=="undefined"&&oppLineup.length) { const pool=oppLineup.slice(0,9).filter(Boolean); if(pool.length)return pool[Math.floor(rng()*pool.length)].name.split(" ").pop(); }
  return (typeof opponent!=="undefined"&&opponent)?(opponent.name||"Opponent"):"Opponent";
}
function _assistA(scorer, rng) {
  if (typeof picksBySlot==="undefined") return "";
  const cands=picksBySlot.filter(p=>p&&p.name.split(" ").pop()!==scorer);
  if (!cands.length) return "";
  return cands[Math.floor(rng()*cands.length)].name.split(" ").pop();
}

/* ── Legacy headless sim (used by other game flows) ── */
function simulateMatch(myPow, oppPow, rng) {
  const isTR=(typeof LANG!=="undefined"?LANG:"tr")==="tr";
  let clock=0,momentum=50,gameOver=false,extraTime=false,halfDone=false,etHalf=false;
  const score={A:0,B:0},stats={shots:{A:0,B:0},saves:{A:0,B:0},corners:{A:0,B:0}};
  const events=[],stoppage=Math.floor(rng()*4)+2,FULL=90+stoppage;
  function ep(side){const cb=_cardBonusFinal();return side==="A"?myPow+cb+(momentum-50)*0.07:oppPow-(momentum-50)*0.07;}
  function nextGap(phase){return -Math.log(Math.max(0.001,rng()))*3.5/phase.eventRate;}
  function chooseSide(){const pA=Math.max(0.30,Math.min(0.70,0.30+momentum*0.004));return rng()<pA?"A":"B";}
  function evPos(side,type){
    if(type==="corner") return{x:rng()<0.5?0.01:0.99,y:side==="A"?0.87+rng()*0.08:0.05+rng()*0.08};
    const wr=rng();const x=wr<0.11?rng()*0.14:wr<0.22?0.86+rng()*0.14:0.18+rng()*0.64;
    const y=side==="A"?0.58+rng()*0.36:0.06+rng()*0.36;return{x,y};
  }
  function resolveShot(side,zone){
    const att=ep(side),def=ep(side==="A"?"B":"A");
    const base={close:0.36,box:0.19,long:0.07}[zone]||0.07;
    const powFactor=Math.tanh((att-def)/30)*0.18;
    const trail=(score[side]<score[side==="A"?"B":"A"])?0.06:0;
    const phase=getPhase(clock);
    const prob=Math.min(0.54,Math.max(0.04,(base+powFactor+trail)*phase.scoreRate));
    return rng()<prob;
  }
  function updateMom(delta){momentum+=delta;momentum+=(50-momentum)*0.09;momentum=Math.max(0,Math.min(100,momentum));}
  const scorersA=[];let keyMoment="",penaltyNote="";
  clock=nextGap(getPhase(0))*0.5;
  let limit=FULL,etLimit=FULL+30;
  while(!gameOver){
    const phase=getPhase(clock);
    if(clock>=limit&&!extraTime){
      if(score.A===score.B){
        extraTime=true;limit=FULL+30;
        events.push({minute:Math.floor(clock),type:"et_start",side:null,pos:{x:0.5,y:0.5},
          label:isTR?"Altın Gol başlıyor":"Golden goal begins",comm:"⏱ "+(isTR?"Altın gol: ilk gol kazanır.":"Golden goal: next goal wins.")});
        clock+=0.5;continue;
      } else{gameOver=true;break;}
    }
    if(extraTime&&clock>=FULL+30){
      if(score.A===score.B){
        const boost=(typeof hasCard==="function"&&hasCard("sogukkanli_penaltici"))?0.08:0;
        const diff=(myPow-oppPow)/200;
        const pA=Math.max(0.42,Math.min(0.93,0.75+diff+boost)),pB=Math.max(0.42,Math.min(0.93,0.75-diff));
        let kA=0,kB=0;const penResults=[];
        for(let i=0;i<5;i++){const a=rng()<pA,b=rng()<pB;if(a)kA++;if(b)kB++;penResults.push({a,b,kA,kB});}
        let wonA=kA>kB;
        if(kA===kB){const a=rng()<pA,b=rng()<pB;if(a&&!b){wonA=true;kA++;}else if(b&&!a){wonA=false;kB++;}else{wonA=rng()<0.5;if(wonA)kA++;else kB++;}penResults.push({a:wonA,b:!wonA,kA,kB,sd:true});}
        if(wonA)score.A++;else score.B++;
        penaltyNote=wonA?(isTR?"penaltılarda kazandın":"won on penalties"):(isTR?"penaltılarda kaybettin":"lost on penalties");
        events.push({minute:Math.floor(clock),type:"penalty",side:wonA?"A":"B",pos:{x:0.5,y:wonA?0.88:0.12},label:penaltyNote,comm:"🎯 "+penaltyNote,penResults,kA,kB,wonA});
        if(!keyMoment)keyMoment=penaltyNote;gameOver=true;break;
      } else{gameOver=true;break;}
    }
    if(!halfDone&&clock>=45){halfDone=true;events.push({minute:45,type:"halftime",side:null,pos:{x:0.5,y:0.5},label:isTR?"Devre arası":"Half time",comm:"🔔 "+(isTR?"DEVRE ARASI":"HALF TIME")+" · "+score.A+"–"+score.B});}
    if(extraTime&&!etHalf&&clock>=FULL+15){etHalf=true;events.push({minute:Math.floor(FULL+15),type:"et_half",side:null,pos:{x:0.5,y:0.5},label:isTR?"Altın Gol arası":"Golden goal break",comm:"🔔 "+(isTR?"Altın Gol arası":"Golden goal break")+" · "+score.A+"–"+score.B});}
    const side=chooseSide();const roll=rng();
    if(roll<0.38){
      const zr=rng();const zone=zr<0.15?"close":zr<0.55?"box":"long";const isGoal=resolveShot(side,zone);stats.shots[side]++;
      if(isGoal){
        score[side]++;const scorer=side==="A"?_pickerA(rng):_pickerB(rng);const assist=side==="A"?_assistA(scorer,rng):"";
        if(side==="A")scorersA.push(scorer);
        const min=Math.min(extraTime?120:90,Math.floor(clock));
        const label=(isTR?"Goool! ":"Goal! ")+scorer+" "+score.A+"–"+score.B;
        const comm="⚽ <b>"+min+"'</b> <b>"+scorer+"</b>"+(assist?" <small>"+(isTR?"Asist":"Assist")+" "+assist+"</small>":"")+" — "+score.A+"–"+score.B;
        if(!keyMoment)keyMoment=scorer+" "+min+"'";
        events.push({minute:min,type:"goal",side,pos:evPos(side,"goal"),scorer,assist,label,comm});updateMom(side==="A"?22:-22);
        if(extraTime){gameOver=true;break;}
      } else{
        const isSave=rng()<0.55;
        if(isSave){stats.saves[side==="A"?"B":"A"]++;const comm="🧤 "+_pickComm(isTR?_COMM.save_tr:_COMM.save_en,rng);events.push({minute:Math.floor(clock),type:"save",side:side==="A"?"B":"A",pos:evPos(side,"save"),label:isTR?"Kaleci kurtardı":"Keeper save",comm});updateMom(side==="A"?-6:6);}
        else{const comm=_pickComm(isTR?_COMM.wide_tr:_COMM.wide_en,rng);events.push({minute:Math.floor(clock),type:"shot_wide",side,pos:evPos(side,"shot_wide"),label:isTR?"Iskaladı":"Wide",comm});updateMom(side==="A"?-3:3);}
      }
    } else if(roll<0.53){stats.corners[side]++;const cComm=(side==="A"?"⛳ ":"⚑ ")+_pickComm(isTR?_COMM.corner_tr:_COMM.corner_en,rng);events.push({minute:Math.floor(clock),type:"corner",side,pos:evPos(side,"corner"),label:isTR?"Köşe vuruşu":"Corner kick",comm:cComm});updateMom(side==="A"?4:-4);}
    else if(roll<0.66){const comm=_pickComm(isTR?_COMM.chance_tr:_COMM.chance_en,rng);events.push({minute:Math.floor(clock),type:"chance",side,pos:evPos(side,"chance"),label:isTR?"Büyük fırsat!":"Big chance!",comm});updateMom(side==="A"?3:-3);}
    else if(roll<0.74){const fouler=side==="A"?_pickerB(rng):_pickerA(rng);const isRed=rng()<0.001;const isYellow=!isRed&&rng()<0.12;const comm=isRed?("🟥 "+fouler+" — "+(isTR?"KIRMIZI KART! Oyundan ihraç!":"RED CARD! Sent off!")):isYellow?"🟨 "+fouler+" — "+(isTR?"Sarı kart!":"Yellow card!"):"⚠️ "+fouler+" — "+(isTR?"Faul!":"Foul!");const evType=isRed?"red_card":isYellow?"yellow":"foul";if(isRed&&side==="A"&&typeof window!=="undefined"){window._matchRedCard=true;window._redCardPlayerName=fouler;}events.push({minute:Math.floor(clock),type:evType,side:side==="A"?"B":"A",pos:evPos(side,"chance"),label:isRed?(isTR?"Kırmızı kart":"Red card"):isYellow?(isTR?"Sarı kart":"Yellow card"):(isTR?"Faul":"Foul"),comm});updateMom(side==="A"?-2:2);}
    else if(roll<0.80){const fkComm="🎯 "+_pickComm(isTR?_COMM.freekick_tr:_COMM.freekick_en,rng);events.push({minute:Math.floor(clock),type:"freekick",side,pos:evPos(side,"chance"),label:isTR?"Serbest vuruş":"Free kick",comm:fkComm});updateMom(side==="A"?2:-2);}
    else{const comm=isTR?["📣 Tribünler ayakta!","🌊 Baskı devam ediyor!","💨 Tempo yükseliyor!","🔔 Kritik anlar!","⚡ Her iki takım baskılıyor!"][Math.floor(rng()*5)]:["📣 Crowd on their feet!","🌊 Pressure building!","💨 The pace is high!","🔔 Critical moments!","⚡ Both teams pressing!"][Math.floor(rng()*5)];events.push({minute:Math.floor(clock),type:"atmosphere",side,pos:{x:0.5,y:0.5},label:isTR?"Atmosfer":"Atmosphere",comm});updateMom(0);}
    clock+=nextGap(phase);
  }
  let motm="?";
  if(scorersA.length){const freq={};scorersA.forEach(n=>freq[n]=(freq[n]||0)+1);let best=scorersA[0],bc=0;Object.keys(freq).forEach(n=>{if(freq[n]>bc){bc=freq[n];best=n;}});motm=best;}
  else if(typeof picksBySlot!=="undefined"){const out=picksBySlot.filter(p=>p&&p.pos!=="GK");const p=out.length?out[Math.floor(Math.random()*out.length)]:picksBySlot.filter(Boolean)[0];if(p)motm=p.name.split(" ").pop();}
  return{events,score,won:score.A>score.B,motm,keyMoment,penaltyNote,stats,fullTime:FULL};
}
function runMatchHeadless(myPow,oppPow,seed){const rng=seededRand(seed||(Math.random()*1e9|0));return simulateMatch(myPow,oppPow,rng);}

/* ── drawHeatmap ── */
function drawHeatmap(ctx,W,H,heatGrid,HGW,HGH){
  ctx.fillStyle=UI_COLORS.pitchLight;ctx.fillRect(0,0,W,H);
  for(let i=0;i<9;i++){if(i%2===0){ctx.fillStyle="rgba(0,0,0,0.04)";ctx.fillRect(0,i*H/9,W,H/9);}}
  const _GL=(W-W*0.27)/2,_GR=_GL+W*0.27;
  ctx.strokeStyle="rgba(255,255,255,0.55)";ctx.lineWidth=1.5;ctx.strokeRect(W*0.03,H*0.03,W*0.94,H*0.94);
  ctx.beginPath();ctx.moveTo(W*0.03,H/2);ctx.lineTo(W*0.97,H/2);ctx.stroke();
  ctx.beginPath();ctx.arc(W/2,H/2,W*0.1,0,Math.PI*2);ctx.stroke();
  ctx.strokeStyle="rgba(255,255,255,0.75)";ctx.lineWidth=2;
  ctx.beginPath();ctx.moveTo(_GL,H*0.03);ctx.lineTo(_GR,H*0.03);ctx.stroke();
  ctx.beginPath();ctx.moveTo(_GL,H*0.97);ctx.lineTo(_GR,H*0.97);ctx.stroke();
  const sm=new Float32Array(HGW*HGH);const kn=[0.0625,0.125,0.0625,0.125,0.25,0.125,0.0625,0.125,0.0625];
  for(let r=0;r<HGH;r++)for(let c=0;c<HGW;c++){let v=0,w=0;for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++){const rr=r+dr,cc=c+dc;if(rr>=0&&rr<HGH&&cc>=0&&cc<HGW){const ki=(dr+1)*3+(dc+1);v+=heatGrid[rr*HGW+cc]*kn[ki];w+=kn[ki];}}sm[r*HGW+c]=v/w;}
  const mx=Math.max(1,...Array.from(sm));const cw=W/HGW,ch=H/HGH;
  for(let r=0;r<HGH;r++)for(let c=0;c<HGW;c++){const v=sm[r*HGW+c]/mx;if(v<0.04)continue;const hue=v<0.3?220-v/0.3*80:v<0.6?140-(v-0.3)/0.3*100:v<0.85?40-(v-0.6)/0.25*40:0;const sat=v<0.15?70:85;const lit=v<0.2?55:48-v*4;const alpha=Math.min(0.85,v<0.15?v/0.15*0.3:0.3+v*0.55);ctx.fillStyle=`hsla(${hue},${sat}%,${lit}%,${alpha})`;ctx.fillRect(c*cw,r*ch,cw,ch);}
  const isTR=(typeof LANG!=="undefined"?LANG:"tr")==="tr";const lbl="🔥 "+(isTR?"ISI HARİTASI":"HEAT MAP");
  ctx.font="bold 8px 'Inter',sans-serif";const lblW=ctx.measureText(lbl).width+16;ctx.fillStyle="rgba(0,0,0,0.58)";ctx.fillRect((W-lblW)/2,H-22,lblW,17);ctx.fillStyle="#fff";ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText(lbl,W/2,H-13);
}

/* ═══════════════════════════════════════════════════════
   PDF-SPEC ENGINE START
═══════════════════════════════════════════════════════ */

const _PW=105, _PH=68; // pitch virtual units
const _FIXED_STEP=1/30;

/* Ball states */
const _BS={OWNED:0,PASSING:1,LOOSE:2,SHOOTING:3,CROSSING:4,OUT_OF_PLAY:5};

/* ── Ball ── */
class _Ball {
  constructor(){
    this.x=52.5;this.y=34;this.vx=0;this.vy=0;
    this.state=_BS.LOOSE;this.owner=null;
    this.height=0;this.vz=0;
    this.trail=[];
    this._target=null;this._shooter=null;this._passTarget=null;this._lastTeam=0;
    this._deliveryType=null;
    this._shotResult=null;
  }
  _markTrail(){
    const last=this.trail[this.trail.length-1];
    if(!last||Math.hypot(last.x-this.x,last.y-this.y)>0.45){
      this.trail.push({x:this.x,y:this.y,h:this.height});
      if(this.trail.length>18)this.trail.shift();
    }
  }
  setOwner(p){
    if(p&&p.sentOff){this.release();return;}
    if(this.owner)this.owner.hasBall=false;
    this.owner=p;this.state=_BS.OWNED;this.vx=0;this.vy=0;
    if(p){p.hasBall=true;this.x=p.x;this.y=p.y;this._lastTeam=p.teamId;this._markTrail();}
  }
  release(){if(this.owner){this.owner.hasBall=false;this.owner=null;}this.state=_BS.LOOSE;}
  passTo(tx,ty,spd){
    if(this.owner){this.owner.hasBall=false;this.owner=null;}
    this._deliveryType=null;
    const dx=tx-this.x,dy=ty-this.y,d=Math.hypot(dx,dy);if(d<0.3){this.state=_BS.LOOSE;return;}
    this.vx=dx/d*spd;this.vy=dy/d*spd;this.state=_BS.PASSING;this.owner=null;this._target={x:tx,y:ty};
  }
  shoot(tx,ty){
    if(this.owner){this.owner.hasBall=false;this.owner=null;}
    const dx=tx-this.x,dy=ty-this.y,d=Math.hypot(dx,dy);if(d<0.3)return;
    const spd=18;this.vx=dx/d*spd;this.vy=dy/d*spd;this.state=_BS.SHOOTING;this.owner=null;
    this.height=0.4;this.vz=2.5;this._target={x:tx,y:ty};
  }
  cross(tx,ty){this.passTo(tx,ty,13);this.state=_BS.CROSSING;this._deliveryType='CROSS';this.height=1.5;this.vz=0.8;}
  update(dt){
    if(this.state===_BS.OWNED){if(this.owner){this.x=this.owner.x;this.y=this.owner.y;this._markTrail();}return;}
    if(this.state===_BS.OUT_OF_PLAY)return;
    this._markTrail();
    this.x+=this.vx*dt;this.y+=this.vy*dt;
    const f=Math.pow(0.96,dt*60);this.vx*=f;this.vy*=f;
    if(this.height>0){this.vz-=14*dt;this.height+=this.vz*dt;if(this.height<=0){this.height=0;this.vz*=-0.3;if(Math.abs(this.vz)<0.4)this.vz=0;}}
    const sp2=this.vx*this.vx+this.vy*this.vy;
    if(sp2<1&&this.state!==_BS.LOOSE&&this.state!==_BS.OUT_OF_PLAY)this.state=_BS.LOOSE;
  }
}

/* ── Player ── */
class _Player {
  constructor(id,teamId,role,hx,hy,stats){
    this.id=id;this.teamId=teamId;this.role=role;
    this.x=hx;this.y=hy;this.hx=hx;this.hy=hy;
    this.targetX=hx;this.targetY=hy;this.vx=0;this.vy=0;
    this.hasBall=false;this.roleCommitUntil=0;
    this.facingX=0;this.facingY=teamId===0?1:-1;
    this.passing=stats.passing||60;this.vision=stats.vision||60;
    this.decisions=stats.decisions||60;this.dribbling=stats.dribbling||60;
    this.shooting=stats.shooting||60;this.defending=stats.defending||60;
    this.positioning=stats.positioning||60;this.anticipation=stats.anticipation||60;
    this.pace=stats.pace||65;this.goalkeeping=stats.goalkeeping||20;
    this.maxSpeed=2.65+this.pace*0.026;
    this.name=stats.name||'?';this.number=stats.number||id;this.injured=!!stats.injured;
    this.yellowCards=0;this.sentOff=false;
  }
  setTarget(x,y){
    const dx=x-this.targetX,dy=y-this.targetY;
    if(dx*dx+dy*dy>0.36){this.targetX=x;this.targetY=y;}
  }
  update(dt,t){
    if(this.sentOff){this.hasBall=false;this.vx=0;this.vy=0;return;}
    if(this.hasBall){
      // carrier moves toward target at reduced pace (dribbling)
      const dx=this.targetX-this.x,dy=this.targetY-this.y,d2=dx*dx+dy*dy;
      if(d2>1){const d=Math.sqrt(d2),spd=this.maxSpeed*0.58;this.vx+=(dx/d*spd-this.vx)*Math.min(1,6*dt);this.vy+=(dy/d*spd-this.vy)*Math.min(1,6*dt);const cs=Math.hypot(this.vx,this.vy);if(cs>spd){this.vx*=spd/cs;this.vy*=spd/cs;}this.x+=this.vx*dt;this.y+=this.vy*dt;this.x=Math.max(0.5,Math.min(_PW-0.5,this.x));this.y=Math.max(0.5,Math.min(_PH-0.5,this.y));}else{this.vx*=0.7;this.vy*=0.7;}return;
    }
    const dx=this.targetX-this.x,dy=this.targetY-this.y,d2=dx*dx+dy*dy;
    if(d2<0.09){this.vx*=0.6;this.vy*=0.6;return;}
    const d=Math.sqrt(d2),sl=5;
    const spd=d2<sl*sl?this.maxSpeed*(d/sl):this.maxSpeed;
    const nx=dx/d,ny=dy/d,a=10;
    this.vx+=(nx*spd-this.vx)*Math.min(1,a*dt);
    this.vy+=(ny*spd-this.vy)*Math.min(1,a*dt);
    const cs=Math.hypot(this.vx,this.vy);if(cs>this.maxSpeed){const r=this.maxSpeed/cs;this.vx*=r;this.vy*=r;}
    this.x+=this.vx*dt;this.y+=this.vy*dt;
    this.x=Math.max(0.5,Math.min(_PW-0.5,this.x));this.y=Math.max(0.5,Math.min(_PH-0.5,this.y));
    if(d>1){this.facingX=nx;this.facingY=ny;}
  }
  dist(ox,oy){return Math.hypot(this.x-ox,this.y-oy);}
  distSq(ox,oy){const dx=this.x-ox,dy=this.y-oy;return dx*dx+dy*dy;}
}

/* ── in penalty box ── */
function _inBox(x,y,defTeam){
  const nx=x/_PW,ny=y/_PH;
  if(defTeam===0)return ny<0.17&&nx>0.17&&nx<0.83;
  return ny>0.83&&nx>0.17&&nx<0.83;
}

function _attackSign(teamId){return teamId===0?1:-1;}
function _goalY(teamId){return teamId===0?_PH:0;}
function _clampPitchX(x){return Math.max(2,Math.min(_PW-2,x));}
function _clampPitchY(y){return Math.max(2,Math.min(_PH-2,y));}
function _isWideLeft(x){return x<_PW*0.24;}
function _isWideRight(x){return x>_PW*0.76;}
function _teamSecondLine(teamId,opponents){
  const ys=opponents.filter(p=>p.role!=='GK'&&!p.sentOff).map(p=>p.y).sort((a,b)=>a-b);
  if(ys.length<2)return teamId===0?_PH-9:9;
  return teamId===0?ys[ys.length-2]:ys[1];
}
function _isOffsideCandidate(teamId,carrier,receiver,opponents){
  if(!receiver||receiver.role==='GK')return false;
  const sig=_attackSign(teamId);
  const line=_teamSecondLine(teamId,opponents);
  const beyondBall=sig>0?receiver.y>carrier.y+1:receiver.y<carrier.y-1;
  const beyondLine=sig>0?receiver.y>line+0.8:receiver.y<line-0.8;
  const attackingHalf=sig>0?receiver.y>_PH*0.5:receiver.y<_PH*0.5;
  return beyondBall&&beyondLine&&attackingHalf;
}
function _nearestPlayers(list,x,y,count,skip){
  return list.filter(p=>p!==skip&&!p.sentOff).map(p=>({p,d:p.dist(x,y)})).sort((a,b)=>a.d-b.d).slice(0,count).map(o=>o.p);
}
function _sequenceLabel(seq,isTR){
  if(!seq)return "";
  const tr={BUILD_CENTER:"merkez kurulum",WIDE_LEFT:"sol kanat",WIDE_RIGHT:"sağ kanat",LONG_BALL:"uzun top",RECYCLE:"geriye dön",COUNTER:"hızlı geçiş",CUTBACK:"cutback"};
  const en={BUILD_CENTER:"central build-up",WIDE_LEFT:"left overload",WIDE_RIGHT:"right overload",LONG_BALL:"long ball",RECYCLE:"recycle",COUNTER:"transition",CUTBACK:"cutback"};
  return (isTR?tr:en)[seq.type]||seq.type;
}

/* ── GK system ── */
function _updateGK(gk,ball,dt){
  if(!gk)return;
  const tid=gk.teamId;
  const goalX=_PW/2;
  const lineY=tid===0?3.5:64.5;
  const goalY=tid===0?0:_PH;
  if(ball.state===_BS.SHOOTING||ball.state===_BS.CROSSING){
    const cx=Math.max(goalX-10,Math.min(goalX+10,ball.x));
    const cy=tid===0?Math.max(lineY-2,Math.min(lineY+4,ball.y-3)):Math.min(lineY+2,Math.max(lineY-4,ball.y+3));
    gk.setTarget(cx,cy);
  } else if(ball.owner&&ball.owner.teamId!==tid){
    const rx=goalX+(ball.x-goalX)*0.22;
    const ry=tid===0?Math.min(lineY+5,goalY+(ball.y-goalY)*0.35):Math.max(lineY-5,goalY+(ball.y-goalY)*0.35);
    gk.setTarget(rx,ry);
  } else{
    const rx=Math.max(goalX-4,Math.min(goalX+4,ball.x*0.2+goalX*0.8));
    gk.setTarget(rx,lineY);
  }
}

/* ── Tactical positioning ── */
function _tacticalTargets(players,ball,opponents,teamId,hasBall,shout,matchTime,rng,sequence){
  const tid=teamId;
  const goalY=tid===0?_PH:0;
  const bx=ball.x,by=ball.y;
  const sig=_attackSign(tid);
  const seq=sequence&&sequence.team===tid?sequence:null;
  const ownReds=players.filter(p=>p.sentOff).length;
  const oppReds=opponents.filter(p=>p.sentOff).length;
  const press=shout==='push'&&ownReds===0;
  const redAttackDrag=ownReds>0?Math.min(0.78,1-ownReds*0.18):1;
  const redCompact=ownReds>0?Math.min(0.20,ownReds*0.09):0;
  const redWidthBoost=oppReds>0?1+Math.min(0.26,oppReds*0.13):1;
  const attackY=tid===0?Math.min(55,by+15):Math.max(13,by-15);
  const defY=tid===0?Math.min(by-5,30):Math.max(by+5,38);
  const line=_teamSecondLine(tid,opponents);
  const defRoles=!hasBall?_nearestPlayers(players.filter(p=>p.role!=='GK'&&!p.sentOff),bx,by,3,null):[];

  players.forEach(p=>{
    if(p.sentOff)return;
    if(p.hasBall||p.role==='GK')return;
    if(p.roleCommitUntil>matchTime)return;
    let tx=p.hx,ty=p.hy;
    if(hasBall){
      const wideSide=seq&&seq.type==='WIDE_LEFT'?-1:seq&&seq.type==='WIDE_RIGHT'?1:0;
      const wideMode=seq&&seq.mode?seq.mode:"";
      switch(p.role){
        case'CB':
          tx=Math.max(15,Math.min(_PW-15,bx*0.18+_PW/2*0.82));
          ty=tid===0?Math.min(33,p.hy+14*redAttackDrag):Math.max(35,p.hy-14*redAttackDrag);
          break;
        case'LB':
          tx=wideSide<0?Math.max(4,_PW*(wideMode==='underlap'?0.22:0.07)):Math.max(7,_PW*0.16);
          ty=tid===0?Math.min(attackY+(wideSide<0?15*redWidthBoost:0),p.hy+26*redAttackDrag):Math.max(_PH-attackY-(wideSide<0?15*redWidthBoost:0),p.hy-26*redAttackDrag);
          break;
        case'RB':
          tx=wideSide>0?Math.min(_PW-4,_PW*(wideMode==='underlap'?0.78:0.93)):Math.min(_PW-7,_PW*0.84);
          ty=tid===0?Math.min(attackY+(wideSide>0?15*redWidthBoost:0),p.hy+26*redAttackDrag):Math.max(_PH-attackY-(wideSide>0?15*redWidthBoost:0),p.hy-26*redAttackDrag);
          break;
        case'DM':
          tx=_PW/2+(bx-_PW/2)*0.28;
          ty=tid===0?Math.min(34,by-7):Math.max(34,by+7);
          break;
        case'CM':
          tx=Math.max(12,Math.min(_PW-12,bx+(p.hx-_PW/2)*0.45+(wideSide*(wideMode==='underlap'?11:6))));
          ty=tid===0?Math.min(by+7,52):Math.max(by-7,16);
          if(seq&&seq.type==='BUILD_CENTER')tx+=p.id%2?5:-5;
          break;
        case'AM':
          tx=Math.max(14,Math.min(_PW-14,bx+(p.hx-_PW/2)*0.35));
          ty=tid===0?Math.min(goalY-8,by+11):Math.max(goalY+8,by-11);
          break;
        case'LW':
          tx=seq&&seq.type==='WIDE_LEFT'?_PW*(wideMode==='underlap'?0.24:0.10):Math.max(6,_PW*0.16);
          ty=tid===0?Math.min(goalY-5,by+(wideMode==='cutback'?13:10)*redAttackDrag):Math.max(goalY+5,by-(wideMode==='cutback'?13:10)*redAttackDrag);
          break;
        case'RW':
          tx=seq&&seq.type==='WIDE_RIGHT'?_PW*(wideMode==='underlap'?0.76:0.90):Math.min(_PW-6,_PW*0.84);
          ty=tid===0?Math.min(goalY-5,by+(wideMode==='cutback'?13:10)*redAttackDrag):Math.max(goalY+5,by-(wideMode==='cutback'?13:10)*redAttackDrag);
          break;
        case'ST':
          tx=Math.max(15,Math.min(_PW-15,bx*0.38+_PW/2*0.62+rng.rng(-4,4)));
          ty=tid===0?Math.min(goalY-4,Math.min(line-1,by+13*redAttackDrag)):Math.max(goalY+4,Math.max(line+1,by-13*redAttackDrag));
          if(seq&&seq.type==='LONG_BALL')ty=_clampPitchY(ty+sig*5);
          break;
      }
    } else {
      const pball=ball.owner&&!ball.owner.sentOff?ball.owner:opponents.find(p=>p.hasBall&&!p.sentOff);
      if(press&&pball){
        tx=pball.x+rng.rng(-8,8);ty=tid===0?Math.min(pball.y+6,_PH*0.9):Math.max(pball.y-6,_PH*0.1);
      } else {
        switch(p.role){
          case'CB':
            tx=Math.max(18,Math.min(_PW-18,bx*(0.32-redCompact)+_PW/2*(0.68+redCompact)));
            ty=tid===0?Math.min(defY+(ownReds?3:0),p.hy):Math.max(_PH-defY-(ownReds?3:0),p.hy);
            break;
          case'LB':
            tx=Math.max(6,bx<_PW/2?_PW*(0.10+redCompact):_PW*(ownReds?0.27:0.20));
            ty=tid===0?Math.min(defY+5,p.hy):Math.max(_PH-defY-5,p.hy);
            break;
          case'RB':
            tx=Math.min(_PW-6,bx>_PW/2?_PW*(0.90-redCompact):_PW*(ownReds?0.73:0.80));
            ty=tid===0?Math.min(defY+5,p.hy):Math.max(_PH-defY-5,p.hy);
            break;
          case'DM':case'CM':
            tx=Math.max(10,Math.min(_PW-10,bx*0.58+_PW/2*0.42));
            ty=tid===0?Math.min(defY+13,p.hy+10):Math.max(_PH-defY-13,p.hy-10);
            break;
          case'AM':case'LW':case'RW':case'ST':
            tx=Math.max(10,Math.min(_PW-10,bx*0.38+p.hx*0.62));
            ty=tid===0?Math.max(12,p.hy-12):Math.min(_PH-12,p.hy+12);
            break;
        }
        if(p===defRoles[0]&&pball){tx=pball.x;ty=pball.y;}
        else if(p===defRoles[1]&&pball){tx=(pball.x+_PW/2)*0.5;ty=pball.y+sig*5;}
        else if(p===defRoles[2]&&pball){tx=bx+(bx-_PW/2)*0.18;ty=by+sig*8;}
      }
    }
    tx=_clampPitchX(tx);ty=_clampPitchY(ty);
    p.setTarget(tx,ty);
    p.roleCommitUntil=matchTime+rng.rng(0.5,1.4);
  });
}

/* ── Decision ── */
function _decide(carrier,ball,teammates,opponents,score,matchTime,totalSec,shape,rng,shotCd,sequence){
  const tid=carrier.teamId;
  const goalX=_PW/2,goalY=tid===0?_PH:0;
  const dGoal=carrier.dist(goalX,goalY);
  const inOppBox=_inBox(carrier.x,carrier.y,tid===0?1:0);
  const myS=score[tid],oppS=score[1-tid];
  const tLeft=totalSec-matchTime;
  const losing=myS<oppS,desperate=losing&&tLeft<240;
  const shout=shape?shape.shout:null;
  const seq=sequence&&sequence.team===tid?sequence:null;
  const seqType=seq?seq.type:"BUILD_CENTER";
  const seqMode=seq?seq.mode:"support";
  const sig=_attackSign(tid);

  // Nearest opponent pressure
  let pressDist=99;for(const o of opponents){if(o.role!=='GK'&&!o.sentOff){const d=carrier.dist(o.x,o.y);if(d<pressDist)pressDist=d;}}
  const pressured=pressDist<3.5;

  const acts=[];

  // SHOOT — box only; must beat pass/carry; blocked during shot cooldown
  const inShotLane=dGoal<28&&carrier.x>_PW*0.20&&carrier.x<_PW*0.80;
  const lateShot=matchTime>totalSec*0.62&&dGoal<31&&(carrier.role==='ST'||carrier.role==='AM'||carrier.role==='LW'||carrier.role==='RW');
  if((inOppBox||inShotLane||lateShot)&&!(shotCd>0)){
    const shootQ=carrier.shooting/100;
    const strikerRole=carrier.role==='ST'||carrier.role==='AM'||carrier.role==='LW'||carrier.role==='RW';
    let sc=shootQ*0.62+(strikerRole?0.16:0)+(desperate?0.22:0)+(inOppBox?0.20:-0.06);
    if(seqType==='BUILD_CENTER'&&dGoal<25)sc+=0.08;
    if(seqType==='COUNTER'||seqType==='LONG_BALL')sc+=0.07;
    acts.push({type:'SHOOT',score:sc});
  }
  // PASS — rewarded for forward progress only
  const rcvrs=teammates.filter(t=>!t.hasBall&&t.role!=='GK'&&!t.sentOff);
  let _bestPasser=null,_bsc=-99,_throughBall=null;
  if(rcvrs.length){
    for(const r of rcvrs){
      const d=carrier.dist(r.x,r.y);
      const fwd=tid===0?(r.y-carrier.y):(carrier.y-r.y);
      const offside=_isOffsideCandidate(tid,carrier,r,opponents);
      const sameWide=(seqType==='WIDE_LEFT'&&r.x<_PW*0.35)||(seqType==='WIDE_RIGHT'&&r.x>_PW*0.65);
      const wideReceiver=sameWide&&(r.role==='LW'||r.role==='RW'||r.role==='LB'||r.role==='RB');
      const overlapReceiver=(seqMode==='overlap'||seqMode==='underlap')&&sameWide&&(r.role==='LB'||r.role==='RB');
      const support=r.y*sig<carrier.y*sig+5;
      let sc2=0.40+Math.max(0,fwd)/_PH*0.55+(r.role==='ST'?0.12:r.role==='AM'?0.07:0)-(d>32?0.10:0)+(pressured?0.28:0);
      if(seqType==='BUILD_CENTER'&&(r.role==='CM'||r.role==='DM'||r.role==='AM'))sc2+=0.18;
      if((seqType==='WIDE_LEFT'||seqType==='WIDE_RIGHT')&&sameWide)sc2+=0.34;
      if(wideReceiver)sc2+=0.28;
      if(overlapReceiver)sc2+=0.30;
      if((seqType==='WIDE_LEFT'||seqType==='WIDE_RIGHT')&&(r.role==='CM'||r.role==='AM')&&seqMode==='cutback')sc2+=0.22;
      if(seqType==='RECYCLE'&&support)sc2+=0.28;
      if(seqType==='COUNTER'&&fwd>8)sc2+=0.20;
      if(seqType==='LONG_BALL'&&r.role==='ST'&&fwd>10)sc2+=0.30;
      if(offside)sc2-=0.75;
      if(sc2>_bsc){_bsc=sc2;const pt=d<12?'SHORT_PASS':d<25?'DRIVEN_PASS':'LONG_PASS';_bestPasser={player:r,type:pt,score:_bsc};}
      // through ball — ST running in behind
      if(r.role==='ST'&&fwd>10&&d<30&&!pressured&&!offside){
        const tbSc=0.45+(carrier.vision/100)*0.25+(carrier.passing/100)*0.15+(seqType==='COUNTER'||seqType==='LONG_BALL'?0.18:0);
        if(!_throughBall||tbSc>_throughBall.score)_throughBall={player:r,type:'THROUGH_BALL',score:tbSc};
      }
    }
    if(_bestPasser)acts.push({type:_bestPasser.type,score:_bestPasser.score,receiver:_bestPasser.player});
    if(_throughBall)acts.push({type:'THROUGH_BALL',score:_throughBall.score,receiver:_throughBall.player});
  }
  // CARRY — advance toward goal; competitive with pass
  const carrierWide=carrier.role==='LW'||carrier.role==='RW'||carrier.role==='LB'||carrier.role==='RB'||carrier.x<_PW*0.24||carrier.x>_PW*0.76;
  const wideCarryBonus=(seqType==='WIDE_LEFT'||seqType==='WIDE_RIGHT')&&carrierWide?0.18:0;
  acts.push({type:'CARRY',score:0.42+(carrier.dribbling/100)*0.20-(pressured?0.26:0)-(inOppBox?0.06:0)+(dGoal>25?0.05:0)+wideCarryBonus});
  // CROSS
  const wx=carrier.x/_PW;
  if((wx<0.24||wx>0.76)&&dGoal<50){
    const cutbackZone=(tid===0?carrier.y>_PH*0.68:carrier.y<_PH*0.32);
    const wideSeq=seqType==='WIDE_LEFT'||seqType==='WIDE_RIGHT';
    const cutbackIntent=cutbackZone||(wideSeq&&seqMode==='cutback');
    acts.push({type:cutbackIntent?'CUTBACK':'CROSS',score:0.48+(carrier.passing/100)*0.30+(wideSeq?0.30:0)+(cutbackIntent?0.18:0)});
  }
  // BACK PASS
  if(pressured&&!desperate){const bp=rcvrs.filter(r=>(tid===0?r.y<carrier.y+4:r.y>carrier.y-4)&&carrier.dist(r.x,r.y)<18);if(bp.length)acts.push({type:'BACK_PASS',score:0.45,receiver:bp[0]});}
  // CLEAR
  if((carrier.role==='GK'||carrier.role==='CB')&&pressured)acts.push({type:'CLEAR',score:0.6});

  // Shout modifiers
  acts.forEach(a=>{
    if(shout==='more'&&(a.type==='SHOOT'||a.type==='CARRY'))a.score+=0.15;
    if(shout==='hold'&&a.type==='BACK_PASS')a.score+=0.2;
    if(shout==='hold'&&(a.type==='SHOOT'||a.type==='CARRY'))a.score-=0.1;
    if(shout==='push'&&(a.type==='SHOOT'||a.type==='CROSS'))a.score+=0.1;
    if(shout==='calm'&&(a.type==='BACK_PASS'||a.type==='SHORT_PASS'))a.score+=0.18;
    if(shout==='calm'&&(a.type==='SHOOT'||a.type==='LONG_PASS'))a.score-=0.15;
    if(seqType==='WIDE_LEFT'||seqType==='WIDE_RIGHT'){if(a.type==='CROSS'||a.type==='CUTBACK')a.score+=0.12;if(a.type==='LONG_PASS')a.score-=0.10;}
    if(seqType==='LONG_BALL'){if(a.type==='LONG_PASS'||a.type==='THROUGH_BALL')a.score+=0.18;if(a.type==='SHORT_PASS')a.score-=0.08;}
    if(seqType==='RECYCLE'){if(a.type==='BACK_PASS'||a.type==='SHORT_PASS')a.score+=0.18;if(a.type==='SHOOT')a.score-=0.12;}
    // noise
    a.score+=(rng.next()-0.5)*(1-carrier.decisions/100)*0.2;
  });
  acts.sort((a,b)=>b.score-a.score);
  return acts[0]||{type:'CARRY'};
}

/* ── Shot resolution ── */
function _resolveShot(shooter,gk,rng){
  const dGoal=shooter?shooter.dist(_PW/2,shooter.teamId===0?_PH:0):25;
  const shootQ=shooter?(shooter.shooting*0.5+shooter.decisions*0.3+shooter.vision*0.2)/100:0.5;
  const distF=Math.max(0,1-dGoal/30);
  const shotP=Math.min(0.50,Math.max(0.05,shootQ*0.35+distF*0.25));
  if(!rng.bool(shotP))return rng.bool(0.55)?'WIDE':'KEEPER_CLAIM';
  const gkQ=gk?(gk.goalkeeping*0.65+gk.anticipation*0.2+gk.pace*0.15)/100:0.55;
  const gkDist=gk?gk.dist(shooter?shooter.x:_PW/2,gk.teamId===0?0:_PH):99;
  const saveP=Math.min(0.88,gkQ*0.80+(gkDist<8?0.12:0));
  if(rng.bool(saveP))return 'KEEPER_SAVE';
  if(rng.bool(0.10))return 'POST';
  return 'GOAL';
}

/* ── Effects pool ── */
function _mkPool(n){
  const pool=[];
  for(let i=0;i<n;i++)pool.push({active:false,type:'',x:0,y:0,ex:0,ey:0,color:'#fff',t:0,dur:0.5});
  return {
    spawn(type,x,y,ex,ey,color,dur){const e=pool.find(e=>!e.active);if(e){e.active=true;e.type=type;e.x=x;e.y=y;e.ex=ex;e.ey=ey;e.color=color||'#fff';e.t=0;e.dur=dur||0.5;}},
    update(dt){pool.forEach(e=>{if(e.active){e.t+=dt;if(e.t>=e.dur)e.active=false;}});},
    all(){return pool.filter(e=>e.active);}
  };
}

/* ── Audio (Web Audio synth) ── */
function _mkAudio(){
  let AC=null,mg=null,cg=null,fg=null;
  function boot(){
    if(AC)return true;
    try{AC=new(window.AudioContext||window.webkitAudioContext)();mg=AC.createGain();mg.gain.value=0.32;mg.connect(AC.destination);cg=AC.createGain();cg.gain.value=0.3;cg.connect(mg);fg=AC.createGain();fg.gain.value=0.7;fg.connect(mg);return true;}catch(e){return false;}
  }
  function beep(freq,dur,type,gain){if(!boot())return;try{const o=AC.createOscillator(),g=AC.createGain();o.connect(g);g.connect(fg);o.type=type||'sine';o.frequency.value=freq;g.gain.setValueAtTime(gain||0.14,AC.currentTime);g.gain.exponentialRampToValueAtTime(0.001,AC.currentTime+dur);o.start();o.stop(AC.currentTime+dur);}catch(e){}}
  function noise(dur,gain,freq){if(!boot())return;try{const buf=AC.createBuffer(1,AC.sampleRate*dur,AC.sampleRate);const d=buf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*0.25;const s=AC.createBufferSource(),g=AC.createGain(),f=AC.createBiquadFilter();f.type='bandpass';f.frequency.value=freq||250;s.buffer=buf;s.connect(f);f.connect(g);g.connect(cg);g.gain.setValueAtTime(gain||0.08,AC.currentTime);g.gain.exponentialRampToValueAtTime(0.001,AC.currentTime+dur);s.start();s.stop(AC.currentTime+dur);}catch(e){}}
  return{
    shortPass(){beep(820,0.04,'square',0.07);},
    drivenPass(){beep(580,0.07,'square',0.11);},
    shot(){beep(170,0.2,'sawtooth',0.22);noise(0.18,0.14,180);},
    save(){beep(380,0.14,'square',0.17);noise(0.12,0.1,220);},
    goal(){beep(900,0.14,'sine',0.28);setTimeout(()=>beep(1120,0.18,'sine',0.28),110);setTimeout(()=>beep(1340,0.28,'sine',0.32),260);noise(0.9,0.38,120);},
    whistle(){beep(2100,0.45,'sine',0.18);setTimeout(()=>beep(2500,0.3,'sine',0.14),280);},
    tackle(){beep(190,0.09,'sawtooth',0.13);noise(0.07,0.09,300);},
    post(){beep(340,0.28,'sine',0.18);},
    crowd(danger){if(cg&&AC)cg.gain.setTargetAtTime(0.15+danger*0.55,AC.currentTime,0.6);},
    stop(){try{if(AC){AC.close();AC=null;}}catch(e){}}
  };
}

/* ── Renderer ── */
function _mkRenderer(canvas,W,H){
  const ctx=canvas.getContext('2d');
  if(ctx){ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';}
  let flashA=0,flashC=[255,255,255],burstTxt='',burstA=0,burstTmr=0,possDisp=50;
  function toS(px,py){return{x:px/_PW*W,y:py/_PH*H};}
  function rrect(x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.arcTo(x+w,y,x+w,y+r,r);ctx.lineTo(x+w,y+h-r);ctx.arcTo(x+w,y+h,x+w-r,y+h,r);ctx.lineTo(x+r,y+h);ctx.arcTo(x,y+h,x,y+h-r,r);ctx.lineTo(x,y+r);ctx.arcTo(x,y,x+r,y,r);ctx.closePath();}
  function nearestOpponent(owner,players){
    if(!owner)return null;
    let best=null,bd=9999;
    for(const p of players){
      if(!p||p.sentOff||p.teamId===owner.teamId||p.role==='GK')continue;
      const d=p.distSq(owner.x,owner.y);
      if(d<bd){bd=d;best=p;}
    }
    return best;
  }
  function markerRing(sc,r,color,alpha,dashed){
    ctx.save();
    ctx.globalAlpha=alpha;
    ctx.strokeStyle=color;
    ctx.lineWidth=2;
    if(dashed)ctx.setLineDash([4,4]);
    ctx.beginPath();ctx.arc(sc.x,sc.y,r,0,Math.PI*2);ctx.stroke();
    ctx.restore();
  }
  function arrowHead(x1,y1,x2,y2,color,alpha){
    const a=Math.atan2(y2-y1,x2-x1);
    ctx.save();
    ctx.globalAlpha=alpha;
    ctx.strokeStyle=color;
    ctx.fillStyle=color;
    ctx.lineWidth=1.5;
    ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x2,y2);
    ctx.lineTo(x2-Math.cos(a-0.55)*6,y2-Math.sin(a-0.55)*6);
    ctx.lineTo(x2-Math.cos(a+0.55)*6,y2-Math.sin(a+0.55)*6);
    ctx.closePath();ctx.fill();
    ctx.restore();
  }
  return{
    drawPitch(){
      for(let i=0;i<9;i++){ctx.fillStyle=i%2?UI_COLORS.pitchDark:UI_COLORS.pitchLight;ctx.fillRect(0,i*H/9,W,H/9);}
      const m={l:W*0.03,r:W*0.97,t:H*0.03,b:H*0.97};
      ctx.strokeStyle='rgba(255,255,255,0.75)';ctx.lineWidth=1.5;ctx.strokeRect(m.l,m.t,m.r-m.l,m.b-m.t);
      ctx.beginPath();ctx.moveTo(m.l,H/2);ctx.lineTo(m.r,H/2);ctx.stroke();
      ctx.beginPath();ctx.arc(W/2,H/2,W*0.1,0,Math.PI*2);ctx.stroke();
      ctx.fillStyle='rgba(255,255,255,0.4)';ctx.beginPath();ctx.arc(W/2,H/2,2.5,0,Math.PI*2);ctx.fill();
      const pal=W*0.27,par=W*0.73,path=H*0.22;
      ctx.strokeStyle='rgba(255,255,255,0.5)';ctx.lineWidth=1;
      ctx.strokeRect(pal,m.t,par-pal,path);ctx.strokeRect(pal,m.b-path,par-pal,path);
      const gw=W*0.12,gl=(W-gw)/2;
      ctx.strokeStyle='rgba(255,255,255,0.85)';ctx.lineWidth=2;
      ctx.strokeRect(gl,m.t-H*0.025,gw,H*0.025);ctx.strokeRect(gl,m.b,gw,H*0.025);
      ctx.fillStyle='rgba(255,255,255,0.45)';
      ctx.beginPath();ctx.arc(W/2,H*0.155,2.5,0,Math.PI*2);ctx.fill();
      ctx.beginPath();ctx.arc(W/2,H*0.845,2.5,0,Math.PI*2);ctx.fill();
      // corner arcs
      ctx.strokeStyle='rgba(255,255,255,0.28)';ctx.lineWidth=1;const cr=W*0.022;
      [[m.l,m.t,0,Math.PI*0.5],[m.r,m.t,Math.PI*0.5,Math.PI],[m.l,m.b,Math.PI*1.5,Math.PI*2],[m.r,m.b,Math.PI,Math.PI*1.5]].forEach(([cx,cy,a1,a2])=>{ctx.beginPath();ctx.arc(cx,cy,cr,a1,a2);ctx.stroke();});
      // goal nets
      ctx.strokeStyle='rgba(255,255,255,0.15)';ctx.lineWidth=0.6;
      for(let i=1;i<4;i++){const nx=gl+i*gw/4;ctx.beginPath();ctx.moveTo(nx,m.t-H*0.025);ctx.lineTo(nx,m.t);ctx.stroke();ctx.beginPath();ctx.moveTo(nx,m.b);ctx.lineTo(nx,m.b+H*0.025);ctx.stroke();}
      ctx.beginPath();ctx.moveTo(gl,m.t-H*0.012);ctx.lineTo(gl+gw,m.t-H*0.012);ctx.stroke();
      ctx.beginPath();ctx.moveTo(gl,m.b+H*0.012);ctx.lineTo(gl+gw,m.b+H*0.012);ctx.stroke();
      // defense line guides
      ctx.setLineDash([3,5]);ctx.strokeStyle='rgba(59,130,246,0.2)';ctx.lineWidth=1;
      ctx.beginPath();ctx.moveTo(W*0.05,H*0.35);ctx.lineTo(W*0.95,H*0.35);ctx.stroke();
      ctx.strokeStyle='rgba(239,68,68,0.2)';
      ctx.beginPath();ctx.moveTo(W*0.05,H*0.65);ctx.lineTo(W*0.95,H*0.65);ctx.stroke();
      ctx.setLineDash([]);
    },
    drawPlayers(players,ball){
      const PR=Math.max(7,Math.round(W*0.013));
      const owner=ball&&ball.owner?ball.owner:null;
      const receiver=ball&&ball._passTarget?ball._passTarget:null;
      const presser=nearestOpponent(owner,players);
      for(const p of players){
        if(p.sentOff)continue;
        const sc=toS(p.x,p.y);
        if(owner===p)markerRing(sc,PR+6,'#4ade80',0.92,false);
        else if(receiver===p)markerRing(sc,PR+5,'#e6eeef',0.72,true);
        else if(presser===p)markerRing(sc,PR+5,'#f59e0b',0.72,false);
        // shadow
        ctx.beginPath();ctx.ellipse(sc.x+1.5,sc.y+2.5,PR*0.9,PR*0.45,0,0,Math.PI*2);ctx.fillStyle='rgba(0,0,0,0.2)';ctx.fill();
        // body
        let col;
        if(p.role==='GK')col=p.teamId===0?UI_COLORS.gkHome:UI_COLORS.gkAway;
        else col=p.teamId===0?(p.injured?UI_COLORS.teamHomeInj:UI_COLORS.teamHome):(p.injured?UI_COLORS.teamAwayInj:UI_COLORS.teamAway);
        ctx.beginPath();ctx.arc(sc.x,sc.y,PR,0,Math.PI*2);ctx.fillStyle=col;ctx.fill();
        ctx.strokeStyle='rgba(255,255,255,0.88)';ctx.lineWidth=1.5;ctx.stroke();
        if(p.role==='GK'){ctx.beginPath();ctx.arc(sc.x,sc.y,PR+2.5,0,Math.PI*2);ctx.strokeStyle='#fbbf24';ctx.lineWidth=1.8;ctx.stroke();}
        const fx=p.facingX||0,fy=p.facingY||(p.teamId===0?1:-1);
        if(W>300&&(Math.abs(fx)+Math.abs(fy)>0.1)){
          const tx=sc.x+fx*(PR+8),ty=sc.y+fy*(PR+8);
          arrowHead(sc.x+fx*PR*0.35,sc.y+fy*PR*0.35,tx,ty,p.teamId===0?'rgba(147,197,253,.9)':'rgba(252,165,165,.9)',0.82);
        }
        // number
        if(W>260){const fs=Math.max(6,Math.round(W*0.012));ctx.font=`bold ${fs}px monospace`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#fff';ctx.fillText(p.number,sc.x,sc.y);}
        // name
        if(W>340){const nm=p.name.split(' ').pop().slice(0,5);const fs2=Math.max(5,Math.round(W*0.01));ctx.font=`${fs2}px sans-serif`;ctx.textAlign='center';ctx.textBaseline='top';const tw=ctx.measureText(nm).width+4;ctx.fillStyle='rgba(0,0,0,0.5)';ctx.fillRect(sc.x-tw/2,sc.y+PR+2,tw,fs2+2);ctx.fillStyle=p.teamId===0?'#93c5fd':'#fca5a5';ctx.fillText(nm,sc.x,sc.y+PR+3);}
      }
    },
    drawBall(ball){
      const sc=toS(ball.x,ball.y);const BR=Math.max(4,Math.round(W*0.009));
      const ballY=sc.y-ball.height*5;
      if(ball.trail&&ball.trail.length>2){
        ctx.save();
        for(let i=1;i<ball.trail.length;i++){
          const a=i/ball.trail.length;
          const p1=toS(ball.trail[i-1].x,ball.trail[i-1].y),p2=toS(ball.trail[i].x,ball.trail[i].y);
          ctx.globalAlpha=0.06+a*0.24;
          ctx.strokeStyle=ball.state===_BS.SHOOTING?'#fbbf24':'#e6eeef';
          ctx.lineWidth=Math.max(1,BR*(0.35+a*0.45));
          ctx.beginPath();ctx.moveTo(p1.x,p1.y-(ball.trail[i-1].h||0)*5);ctx.lineTo(p2.x,p2.y-(ball.trail[i].h||0)*5);ctx.stroke();
        }
        ctx.restore();
      }
      const sdy=sc.y+BR*0.4+ball.height*5*0.15;
      ctx.beginPath();ctx.ellipse(sc.x+1,sdy,BR*(1+ball.height*0.08),BR*0.4,0,0,Math.PI*2);ctx.fillStyle=`rgba(0,0,0,${0.22-ball.height*0.03})`;ctx.fill();
      const g=ctx.createRadialGradient(sc.x-BR*0.3,ballY-BR*0.3,BR*0.08,sc.x,ballY,BR);g.addColorStop(0,'#fff');g.addColorStop(1,'#bbb');
      ctx.beginPath();ctx.arc(sc.x,ballY,BR,0,Math.PI*2);ctx.fillStyle=g;ctx.fill();ctx.strokeStyle='#555';ctx.lineWidth=0.7;ctx.stroke();
      ctx.strokeStyle='rgba(0,0,0,0.25)';ctx.lineWidth=0.6;
      ctx.beginPath();ctx.moveTo(sc.x-BR*0.4,ballY-BR*0.5);ctx.lineTo(sc.x+BR*0.4,ballY+BR*0.5);ctx.stroke();
      ctx.beginPath();ctx.moveTo(sc.x+BR*0.4,ballY-BR*0.5);ctx.lineTo(sc.x-BR*0.4,ballY+BR*0.5);ctx.stroke();
      if(ball.state===_BS.LOOSE){ctx.beginPath();ctx.arc(sc.x,sc.y,BR+5,0,Math.PI*2);ctx.strokeStyle='rgba(251,191,36,0.55)';ctx.lineWidth=1.5;ctx.stroke();}
    },
    drawEffects(effects){
      for(const e of effects){if(!e.active)continue;const t=e.t/e.dur;ctx.globalAlpha=Math.max(0,1-t);const s1=toS(e.x,e.y),s2=toS(e.ex,e.ey);
        if(e.type==='PASS'){ctx.strokeStyle=e.color;ctx.lineWidth=1.5;ctx.setLineDash([4,4]);ctx.beginPath();ctx.moveTo(s1.x,s1.y);ctx.lineTo(s2.x,s2.y);ctx.stroke();ctx.setLineDash([]);}
        else if(e.type==='RUN'){
          const mx=(s1.x+s2.x)/2, my=(s1.y+s2.y)/2 - Math.max(10,W*0.025);
          ctx.strokeStyle=e.color;ctx.lineWidth=2;ctx.setLineDash([8,6]);
          ctx.beginPath();ctx.moveTo(s1.x,s1.y);ctx.quadraticCurveTo(mx,my,s2.x,s2.y);ctx.stroke();ctx.setLineDash([]);
          arrowHead(mx,my,s2.x,s2.y,e.color,0.9);
        }
        else if(e.type==='SHOT'){ctx.strokeStyle=e.color;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(s1.x,s1.y);ctx.lineTo(s2.x,s2.y);ctx.stroke();}
        else if(e.type==='GOAL'){const r=18+t*45;ctx.beginPath();ctx.arc(s1.x,s1.y,r,0,Math.PI*2);ctx.strokeStyle=e.color;ctx.lineWidth=3-t*2;ctx.stroke();}
        else if(e.type==='TACKLE'||e.type==='RECEIVE'){const r=7+t*12;ctx.beginPath();ctx.arc(s1.x,s1.y,r,0,Math.PI*2);ctx.strokeStyle=e.color;ctx.lineWidth=1.5;ctx.stroke();}
        ctx.globalAlpha=1;}
    },
    drawHUD(mom,score,clockMin,teamAName,teamBName,shoutMode,isTR){
      possDisp+=(mom-possDisp)*0.04;const pF=Math.max(0.03,Math.min(0.97,possDisp/100));
      const mW=W*0.72,mH=10,mX=(W-mW)/2,mY=H-16;
      ctx.fillStyle='rgba(0,0,0,0.48)';rrect(mX,mY,mW,mH,4);ctx.fill();
      ctx.fillStyle='#2563eb';rrect(mX,mY,mW*pF,mH,4);ctx.fill();
      ctx.fillStyle='#dc2626';rrect(mX+mW*pF,mY,mW*(1-pF),mH,4);ctx.fill();
      const plFS=Math.max(8,Math.round(W*0.019));ctx.font=`bold ${plFS}px monospace`;ctx.fillStyle='rgba(255,255,255,0.9)';
      ctx.textAlign='left';ctx.textBaseline='bottom';ctx.fillText(Math.round(pF*100)+'%',mX+4,mY-3);
      ctx.textAlign='right';ctx.fillText(Math.round((1-pF)*100)+'%',mX+mW-4,mY-3);
      ctx.textAlign='center';ctx.fillStyle='rgba(255,255,255,0.38)';ctx.font=`${Math.max(7,Math.round(W*0.013))}px monospace`;ctx.fillText('MOM',W/2,mY-3);
      if(shoutMode){const sl={more:isTR?'YÜKLEN':'SURGE',push:isTR?'ÖNDE BAS':'PRESS',calm:'TEMPO↓',hold:isTR?'KORU':'HOLD'};const sc2={more:'#ef4444',push:'#4ade80',calm:'#60a5fa',hold:'#c084fc'};const sl2=sl[shoutMode]||shoutMode.toUpperCase();const c=sc2[shoutMode]||'#fff';const sFS=Math.max(7,Math.round(W*0.015));ctx.font=`bold ${sFS}px monospace`;const sw=ctx.measureText(sl2).width+12;const sx=W-sw-6;ctx.fillStyle='rgba(0,0,0,0.7)';rrect(sx,6,sw,16,3);ctx.fill();ctx.strokeStyle=c+'88';ctx.lineWidth=1;rrect(sx,6,sw,16,3);ctx.stroke();ctx.fillStyle=c;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(sl2,sx+sw/2,14);}
      if(burstA>0&&burstTxt){const bFS=Math.round(W*0.05),bY=H*0.14;ctx.globalAlpha=Math.min(1,burstA);ctx.font=`bold ${bFS}px var(--disp,sans-serif)`;const bW=Math.min(W*0.88,ctx.measureText(burstTxt).width+32);ctx.fillStyle='rgba(0,0,0,0.65)';rrect((W-bW)/2,bY-bFS*0.65-6,bW,bFS+14,6);ctx.fill();ctx.strokeStyle='rgba(255,215,0,0.7)';ctx.lineWidth=1.5;rrect((W-bW)/2,bY-bFS*0.65-6,bW,bFS+14,6);ctx.stroke();ctx.fillStyle='#fff';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(burstTxt,W/2,bY);ctx.globalAlpha=1;}
      if(flashA>0){ctx.fillStyle=`rgba(${flashC.join(',')},${flashA*0.28})`;ctx.fillRect(0,0,W,H);}
    },
    decay(dt){if(flashA>0)flashA=Math.max(0,flashA-dt*2.5);if(burstTmr>0){burstTmr-=dt;if(burstTmr<=0)burstA=Math.max(0,burstA-dt*1.8);}else if(burstA>0)burstA=Math.max(0,burstA-dt*2.2);},
    goalFlash(tid){flashC=tid===0?[74,222,128]:[249,115,22];flashA=1;},
    burst(txt){burstTxt=txt;burstA=1;burstTmr=1.4;},
    clear(){ctx.clearRect(0,0,W,H);}
  };
}

/* ═══════════════════════════════════════════════════════
   buildSim — main entry point
═══════════════════════════════════════════════════════ */
function buildSim(myPow, oppPow) {
  const isTR=(typeof LANG!=="undefined"?LANG:"tr")==="tr";
  const myName=(typeof teamName!=="undefined"&&teamName)?teamName:"US";
  const oppName=(typeof opponent!=="undefined"&&opponent&&opponent.name)?opponent.name:"RAKİP";

  /* canvas setup */
  const cvEl=document.getElementById("cv");
  const W=Math.max(300,Math.min(800,(document.getElementById("sim")&&document.getElementById("sim").clientWidth)||560));
  const H=Math.round(W*0.565);
  const dpr=Math.min(2,window.devicePixelRatio||1);
  const canvas=document.createElement("canvas");
  canvas.width=W*dpr;canvas.height=H*dpr;
  canvas.style.cssText="display:block;width:100%;border-radius:6px";
  cvEl.innerHTML="";cvEl.style.cssText="position:relative;border-radius:6px;overflow:hidden;background:#3a7a2e";
  cvEl.appendChild(canvas);
  const rawCtx=canvas.getContext("2d");rawCtx.scale(dpr,dpr);

  /* RNG */
  const seedBase=typeof seedNum!=="undefined"?seedNum:(Date.now()&0xffffff);
  const _r=typeof round!=="undefined"?round:1;
  const rng=new _RNG(((seedBase*1000003)^(_r*2654435761))>>>0||1);

  /* build players from game data */
  const _fmA=(typeof slots!=="undefined")?slots:(typeof FORMATIONS!=="undefined"?FORMATIONS["4-4-2"]:[]);
  const _fmB=(typeof FORMATIONS!=="undefined")?(FORMATIONS["4-3-3"]||FORMATIONS["4-4-2"]):_fmA;
  const _namesA=(typeof picksBySlot!=="undefined")?picksBySlot.map(p=>p?p.name:"?"):[];
  const _namesB=(typeof oppLineup!=="undefined"&&oppLineup.length)?oppLineup.map(o=>o.name):Array(11).fill("?");
  const _injA=(typeof picksBySlot!=="undefined")?picksBySlot.map(p=>p&&p.injured):[];

  // Power → stat offset
  const powOffA=Math.max(-15,Math.min(20,(myPow-65)*0.6));
  const powOffB=Math.max(-15,Math.min(20,(oppPow-65)*0.6));

  const ROLE_MAP=['GK','CB','LB','RB','DM','CM','CM','LW','RW','ST','ST'];
  function mkStats(i,off,names,inj){
    const nm=names[i]||'?';
    // derive stats from overall if available
    let ov=65+off;
    if(typeof picksBySlot!=="undefined"&&picksBySlot[i]&&picksBySlot[i].ov)ov=picksBySlot[i].ov+off;
    const role=ROLE_MAP[i]||'CM';
    const base={passing:ov,vision:ov,decisions:ov,dribbling:ov,shooting:role==='ST'?ov+8:role==='AM'?ov+4:ov-5,defending:role==='CB'||role==='DM'?ov+8:ov-5,positioning:ov,anticipation:ov,pace:role==='LW'||role==='RW'||role==='ST'?ov+6:ov,goalkeeping:role==='GK'?ov+15:20,name:nm,number:i+1,injured:!!(inj&&inj[i])};
    return base;
  }
  function mkStatsB(i,off,names){
    const nm=names[i]||'?';let ov=65+off;const role=ROLE_MAP[i]||'CM';
    return{passing:ov,vision:ov,decisions:ov,dribbling:ov,shooting:role==='ST'?ov+8:ov-5,defending:role==='CB'||role==='DM'?ov+8:ov-5,positioning:ov,anticipation:ov,pace:role==='LW'||role==='RW'||role==='ST'?ov+6:ov,goalkeeping:role==='GK'?ov+15:20,name:nm,number:i+1};
  }

  function mkTeamA(fm,names,inj){
    return fm.slice(0,11).map((s,i)=>{
      const hx=s[1]/100*_PW,hy=(1-s[2]/100)*_PH;
      const role=ROLE_MAP[i]||'CM';
      return new _Player(i,0,role,hx,hy,mkStats(i,powOffA,names,inj));
    });
  }
  function mkTeamB(fm,names){
    return fm.slice(0,11).map((s,i)=>{
      const hx=(1-s[1]/100)*_PW,hy=s[2]/100*_PH;
      const role=ROLE_MAP[i]||'CM';
      return new _Player(i,1,role,hx,hy,mkStatsB(i,powOffB,names));
    });
  }

  const teamA=mkTeamA(_fmA,_namesA,_injA);
  const teamB=mkTeamB(_fmB,_namesB);

  /* ensure enough players if formation is short */
  while(teamA.length<11){const i=teamA.length;teamA.push(new _Player(i,0,'CM',_PW/2+rng.rng(-10,10),_PH*0.5,mkStats(i,powOffA,_namesA,_injA)));}
  while(teamB.length<11){const i=teamB.length;teamB.push(new _Player(i,1,'CM',_PW/2+rng.rng(-10,10),_PH*0.5,mkStatsB(i,powOffB,_namesB)));}

  const ball=new _Ball();
  const renderer=_mkRenderer(canvas,W,H);
  const audio=_mkAudio();
  const effects=_mkPool(40);

  /* match state */
  const score=[0,0];
  const stats={shots:[0,0],saves:[0,0],corners:[0,0],yellows:[0,0],reds:[0,0],possession:[0,0],danger:[0,0],blocked:[0,0]};
  const goalEvents=[];
  let matchTime=0;
  const stoppage=Math.floor(rng.rng(2,6));
  const fullTimeSec=(90+stoppage)*60;
  let gameEnded=false,animId=null;
  let momDisplay=50,shoutMode=null;
  const liveScore=[0,0];
  let lastCarrier=null,lastAssist=null;
  let lastDangerTime=-999;
  let lastForcedAttackTime=-999;

  const shapeCfg={shout:null};
  const tacticalSeq={team:0,type:'BUILD_CENTER',mode:'support',beat:0,until:0,lastCarrierId:-1};

  function chooseSequence(carrier){
    if(!carrier)return tacticalSeq;
    const tid=carrier.teamId;
    const ownHalf=tid===0?carrier.y<_PH*0.44:carrier.y>_PH*0.56;
    const finalThird=tid===0?carrier.y>_PH*0.66:carrier.y<_PH*0.34;
    const midThird=!ownHalf&&!finalThird;
    const losing=score[tid]<score[1-tid];
    const hasWingCard=typeof hasCard==='function'&&hasCard('kanat_akini');
    const hasCounterCard=typeof hasCard==='function'&&hasCard('kontra');
    const ownReds=(tid===0?teamA:teamB).filter(p=>p.sentOff).length;
    const oppReds=(tid===0?teamB:teamA).filter(p=>p.sentOff).length;
    const goldenActive=typeof goldenGoalMode!=="undefined"&&goldenGoalMode;
    const wideBias=Math.max(0.22,(hasWingCard?0.68:0.54)+(finalThird?0.10:0)+(midThird?0.06:0)+(goldenActive?0.08:0)+(oppReds?0.12:0)-(ownReds?0.12:0));
    const canWide=(tid===0?teamA:teamB).some(p=>!p.sentOff&&(p.role==='LW'||p.role==='RW'||p.role==='LB'||p.role==='RB'));
    let type='BUILD_CENTER';
    let mode='support';
    if(carrier.role==='GK')type=rng.bool(0.58)?'RECYCLE':'LONG_BALL';
    else if((carrier.role==='CB'||carrier.role==='DM')&&ownHalf&&(losing||rng.bool(0.24)))type='LONG_BALL';
    else if((carrier.role==='LW'||carrier.role==='LB'||_isWideLeft(carrier.x))&&(finalThird||midThird))type='WIDE_LEFT';
    else if((carrier.role==='RW'||carrier.role==='RB'||_isWideRight(carrier.x))&&(finalThird||midThird))type='WIDE_RIGHT';
    else if(canWide&&rng.bool(wideBias)){
      const leftReady=(tid===0?teamA:teamB).some(p=>!p.sentOff&&(p.role==='LW'||p.role==='LB')&&p.x<_PW*0.46);
      const rightReady=(tid===0?teamA:teamB).some(p=>!p.sentOff&&(p.role==='RW'||p.role==='RB')&&p.x>_PW*0.54);
      type=leftReady&&!rightReady?'WIDE_LEFT':rightReady&&!leftReady?'WIDE_RIGHT':(rng.bool(0.5)?'WIDE_LEFT':'WIDE_RIGHT');
    }
    else if(hasCounterCard&&rng.bool(goldenActive?0.24:0.18))type='COUNTER';
    else if(rng.bool(0.16))type='RECYCLE';
    if(type==='WIDE_LEFT'||type==='WIDE_RIGHT')mode=rng.pick(['overlap','overlap','underlap','cutback']);
    else if(type==='LONG_BALL')mode='run_first';
    else if(type==='BUILD_CENTER')mode='triangle';
    tacticalSeq.team=tid;tacticalSeq.type=type;tacticalSeq.mode=mode;tacticalSeq.beat=0;tacticalSeq.until=matchTime+rng.rng(8,15);tacticalSeq.lastCarrierId=carrier.id;
    return tacticalSeq;
  }
  function currentSequence(carrier){
    if(!carrier)return tacticalSeq;
    if(tacticalSeq.team!==carrier.teamId||matchTime>tacticalSeq.until||tacticalSeq.beat>5)chooseSequence(carrier);
    return tacticalSeq;
  }
  function sequenceBeat(action,carrier){
    if(!carrier)return;
    if(tacticalSeq.team!==carrier.teamId)return;
    if(action&&action.type!=='CARRY')tacticalSeq.beat++;
    tacticalSeq.lastCarrierId=carrier.id;
    if(action&&(action.type==='CUTBACK'||action.type==='SHOOT'||action.type==='CLEAR'))tacticalSeq.until=0;
  }

  /* heatmap */
  const HGW=20,HGH=15;
  const heatGrid=new Float32Array(HGW*HGH);
  function addHeat(x,y,w){
    const hx=Math.max(0,Math.min(HGW-1,Math.floor((x/_PW)*HGW)));
    const hy=Math.max(0,Math.min(HGH-1,Math.floor((y/_PH)*HGH)));
    heatGrid[hy*HGW+hx]+=w||0.5;
  }

  /* DOM helpers */
  function _dom(id,v){const e=document.getElementById(id);if(e)e.textContent=v;}
  function _html(id,v){const e=document.getElementById(id);if(e)e.innerHTML=v;}
  function _addRow(side,html){const el=document.getElementById("simGoals");if(!el)return;const d=document.createElement("div");d.className=(side===0?"home":"away")+" goal";d.innerHTML=html;el.prepend(d);while(el.children.length>10)el.removeChild(el.lastChild);}
  function _sendOffPlayer(p,reason){
    if(!p||p.sentOff)return;
    p.sentOff=true;p.hasBall=false;p.vx=0;p.vy=0;p.targetX=p.x;p.targetY=p.y;
    if(ball.owner===p)ball.release();
    if(ball._passTarget===p)ball._passTarget=null;
    p.x=p.teamId===0?-8:_PW+8;p.y=_PH/2;
    stats.reds[p.teamId]=(stats.reds[p.teamId]||0)+1;
    const nm=p.name.split(' ').pop();
    _html("simComm","<b>"+nm+"</b> — "+reason);
    _addRow(p.teamId,"<b>"+Math.floor(matchTime/60)+"'</b><span>🟥 "+nm+"</span>");
    _updateStats();
  }
  function _updateStats(){
    _dom("statShot",stats.shots[0]+"-"+stats.shots[1]);
    _dom("statSave",stats.saves[0]+"-"+stats.saves[1]);
    const dangerA=Math.max(stats.danger[0],score[0]),dangerB=Math.max(stats.danger[1],score[1]);
    _dom("statDanger",dangerA+"-"+dangerB);
    _dom("statCorner",stats.corners[0]+"-"+stats.corners[1]);
    const cardsA=stats.reds[0]?stats.yellows[0]+"+"+stats.reds[0]+"K":stats.yellows[0];
    const cardsB=stats.reds[1]?stats.yellows[1]+"+"+stats.reds[1]+"K":stats.yellows[1];
    _dom("statYellow",cardsA+"-"+cardsB);
    const tot=stats.possession[0]+stats.possession[1]+1;
    const pct=Math.round(stats.possession[0]/tot*100);
    _dom("statPoss",pct+"–"+(100-pct));
    const ma=document.getElementById("momA"),mb=document.getElementById("momB"),bar=document.getElementById("momBar");
    const a=Math.round(momDisplay);
    if(ma)ma.textContent=a+"%";if(mb)mb.textContent=(100-a)+"%";
    if(bar)bar.style.background=`linear-gradient(90deg,var(--green,#3fb950) ${a}%,var(--red,#ef4444) ${a}%)`;
  }

  function _registerDanger(teamId,label,icon){
    stats.danger[teamId]=(stats.danger[teamId]||0)+1;
    lastDangerTime=matchTime;
    momDisplay=Math.max(18,Math.min(82,momDisplay+(teamId===0?3:-3)));
    _addRow(teamId,"<b>"+Math.floor(matchTime/60)+"'</b><span>"+(icon||"⚠")+" "+label+"</span>");
    _updateStats();
  }

  /* kickoff */
  function kickoff(teamId){
    ball.x=_PW/2;ball.y=_PH/2;ball.vx=0;ball.vy=0;ball.state=_BS.LOOSE;
    const st=(teamId===0?teamA:teamB).find(p=>p.role==='ST'&&!p.sentOff)||(teamId===0?teamA:teamB).find(p=>p.role!=='GK'&&!p.sentOff);
    if(st){st.x=_PW/2+rng.rng(-1,1);st.y=_PH/2+rng.rng(-1,1);ball.setOwner(st);chooseSequence(st);}
    ball._lastTeam=teamId;
  }

  function reposition(){
    [...teamA,...teamB].forEach(p=>{if(p.sentOff)return;p.x=p.hx;p.y=p.hy;p.vx=0;p.vy=0;p.targetX=p.hx;p.targetY=p.hy;p.hasBall=false;});
  }

  /* goal */
  function onGoal(teamId){
    score[teamId]++;liveScore[teamId]=score[teamId];
    const sc2=score[0]+"–"+score[1];
    const nm=lastCarrier||'?';
    goalEvents.push({type:'goal',side:teamId===0?'A':'B',scorer:nm,assist:lastAssist||'',minute:Math.floor(matchTime/60)});
    _dom("simScore",score[0]+"–"+score[1]);
    renderer.goalFlash(teamId);renderer.burst("⚽ "+nm+" "+sc2);
    audio.goal();
    const comm="⚽ <b>"+Math.floor(matchTime/60)+"'</b> <b>"+nm+"</b>"+(lastAssist?" <small>"+(isTR?"Asist":"Assist")+" "+lastAssist+"</small>":"")+" — "+sc2;
    _html("simComm",comm);_html("simRadio","📻 "+comm);
    _addRow(teamId,"<b>"+Math.floor(matchTime/60)+"'</b><span>⚽ "+nm+" "+sc2+"</span>");
    momDisplay=Math.max(18,Math.min(82,momDisplay+(teamId===0?22:-22)));
    // add to heatgrid
    addHeat(ball.x,ball.y,4);
    if(goldenGoalMode){
      _dom("simState",isTR?"ALTIN GOL!":"GOLDEN GOAL!");
      const stateEl=document.getElementById("simState");if(stateEl)stateEl.classList.add("is-golden");
      lastCarrier=null;lastAssist=null;
      _updateStats();
      setTimeout(()=>endMatch(),700);
      return;
    }
    const stateEl=document.getElementById("simState");if(stateEl)stateEl.classList.remove("is-golden");
    _dom("simState",teamId===0?myName.slice(0,8)+" "+(isTR?"önde":"leads"):oppName.slice(0,8)+" "+(isTR?"önde":"leads"));
    reposition();kickoff(1-teamId);
    lastCarrier=null;lastAssist=null;
    _updateStats();
  }

  /* shot resolution */
  function handleShot(shooter, forcedResult, alreadyCounted){
    if(!shooter)return;
    if(!alreadyCounted){
      stats.shots[shooter.teamId]++;
      shotCooldown[shooter.teamId]=SHOT_COOLDOWN;
    }
    const gk=shooter.teamId===0?teamB.find(p=>p.role==='GK'):teamA.find(p=>p.role==='GK');
    const res=forcedResult||_resolveShot(shooter,gk,rng);
    const goalX=_PW/2,goalY=shooter.teamId===0?_PH:0;
    if(!alreadyCounted){
      effects.spawn('SHOT',shooter.x,shooter.y,goalX,goalY,'#fbbf2466',0.55);
      audio.shot();
    }
    ball._shotResult=null;
    ball._shooter=null;
    stats.danger[shooter.teamId]=(stats.danger[shooter.teamId]||0)+1;
    lastDangerTime=matchTime;
    switch(res){
      case'GOAL':ball.state=_BS.OUT_OF_PLAY;ball.x=goalX;ball.y=goalY;onGoal(shooter.teamId);break;
      case'KEEPER_SAVE':case'KEEPER_CLAIM':
        if(gk){ball.setOwner(gk);lastCarrier=gk.name;}
        stats.saves[gk?gk.teamId:1-shooter.teamId]++;audio.save();
        effects.spawn('RECEIVE',gk?gk.x:goalX,gk?gk.y:goalY,0,0,'#fbbf24',0.5);
        _html("simComm","🧤 "+(isTR?_COMM.save_tr[rng.int(_COMM.save_tr.length)]:_COMM.save_en[rng.int(_COMM.save_en.length)]));
        _addRow(1-shooter.teamId,"<b>"+Math.floor(matchTime/60)+"'</b><span>🧤 "+(isTR?"Kurtarış":"Save")+"</span>");
        momDisplay=Math.max(18,Math.min(82,momDisplay+(shooter.teamId===0?-8:8)));
        break;
      case'POST':
        ball.vx*=-0.4;ball.vy*=-0.4;ball.state=_BS.LOOSE;audio.post();
        effects.spawn('TACKLE',ball.x,ball.y,0,0,'#94a3b8',0.5);
        _addRow(shooter.teamId,"<b>"+Math.floor(matchTime/60)+"'</b><span>▥ "+(isTR?"Direk":"Post")+"</span>");
        _html("simComm",isTR?"🏃 Direğe çarptı!":"🏃 Off the post!");
        break;
      case'WIDE':ball.state=_BS.LOOSE;ball.vx*=0.2;ball.vy*=0.2;
        _html("simComm","😮 "+rng.pick(isTR?_COMM.wide_tr:_COMM.wide_en));
        _addRow(shooter.teamId,"<b>"+Math.floor(matchTime/60)+"'</b><span>↗ "+(isTR?"İsabetsiz şut":"Shot wide")+"</span>");
        break;
    }
    addHeat(ball.x,ball.y,2);
    _updateStats();
  }

  /* out-of-play resolve */
  let outTimer=0,inHalfTime=false,halfDone=false,etStarted=false;

  function resolveOut(){
    if(ball._shooter&&ball._shotResult){
      const shooter=ball._shooter;
      const res=ball._shotResult;
      handleShot(shooter,res,true);
      return;
    }
    const inGoalX=ball.x/_PW>0.44&&ball.x/_PW<0.56;
    // y=0 is team A's goal (team B scores); y=_PH is team B's goal (team A scores)
    if(ball.y<=0&&inGoalX){ball.state=_BS.LOOSE;onGoal(1);return;}
    if(ball.y>=_PH&&inGoalX){ball.state=_BS.LOOSE;onGoal(0);return;}
    const lastTeam=ball._lastTeam;
    if(ball.y<=0||ball.y>=_PH){
      const defTeam=ball.y<=0?0:1;
      if(lastTeam!==defTeam){onCorner(lastTeam);}
      else{onGoalKick(defTeam);}
    } else if(ball.x<=0||ball.x>=_PW){onThrowIn(lastTeam);}
    else{kickoff(lastTeam===0?1:0);}
  }
  function onCorner(atkTeam){
    stats.corners[atkTeam]++;
    _addRow(atkTeam,"<b>"+Math.floor(matchTime/60)+"'</b><span>🚩 "+(isTR?"Köşe":"Corner")+"</span>");
    const bx=ball.x<_PW/2?0.5:_PW-0.5,by=atkTeam===0?_PH-0.5:0.5;
    ball.x=bx;ball.y=by;ball.vx=0;ball.vy=0;ball.state=_BS.LOOSE;
    const winger=(atkTeam===0?teamA:teamB).find(p=>p.role==='LW'||p.role==='RW'||p.role==='LB'||p.role==='RB');
    if(winger){winger.x=bx;winger.y=by;ball.setOwner(winger);}
    momDisplay=Math.max(18,Math.min(82,momDisplay+(atkTeam===0?4:-4)));
    _html("simComm","⛳ "+rng.pick(isTR?_COMM.corner_tr:_COMM.corner_en));
    _updateStats();
  }
  function onGoalKick(defTeam){
    const gy=defTeam===0?3.5:64.5;ball.x=_PW/2;ball.y=gy;ball.vx=0;ball.vy=0;
    const gk=(defTeam===0?teamA:teamB).find(p=>p.role==='GK');
    if(gk){gk.x=_PW/2;gk.y=gy;ball.setOwner(gk);}else ball.state=_BS.LOOSE;
  }
  function onThrowIn(lastTeam){
    const throwTeam=lastTeam===0?1:0;
    const ty=Math.max(4,Math.min(_PH-4,ball.y));const tx=ball.x<=0?1:_PW-1;
    ball.x=tx;ball.y=ty;ball.vx=0;ball.vy=0;ball.state=_BS.LOOSE;
      const takers=(throwTeam===0?teamA:teamB).filter(p=>p.role!=='GK'&&!p.sentOff);
    if(takers.length){const tk=takers.reduce((a,b)=>a.dist(tx,ty)<b.dist(tx,ty)?a:b);tk.x=tx;tk.y=ty;ball.setOwner(tk);}
  }

  /* pickup */
  let decTimer=0;
  const DEC_INT=1.82; // calmer decisions: visual football needs readable beats
  let slotTimer=0;
  // Per-team shot cooldown — prevents shot spam; resets after each shot
  const SHOT_COOLDOWN=58; // keeps shots readable without making 0-0 finals feel empty
  const shotCooldown=[0,0];
  const SLOT_INT=0.17;
  let stuckTimer=0;

  function tryPickup(){
    if(ball.state===_BS.OWNED||ball.state===_BS.OUT_OF_PLAY)return;
    if(ball.state===_BS.SHOOTING&&ball.height>0.4)return;
    const PR2=9.0; // tighter pickup radius; prevents crowded instant possessions
    for(const p of [...teamA,...teamB]){
      if(p.sentOff)continue;
      const d2=p.distSq(ball.x,ball.y);if(d2>PR2)continue;
      if(ball.state===_BS.SHOOTING){
        if(p.role==='GK'&&p.teamId!==(ball._shooter?ball._shooter.teamId:-1)){
          handleShot(ball._shooter||p,ball._shotResult,true);return;
        }
        if(p.teamId!==(ball._shooter?ball._shooter.teamId:-1)&&rng.bool(0.3)){ball._shotResult=null;ball._shooter=null;ball.state=_BS.LOOSE;return;}
        continue;
      }
      if(ball.state===_BS.PASSING||ball.state===_BS.CROSSING){
        if(p===ball._passTarget){
          const deliveryType=ball._deliveryType||(ball.state===_BS.CROSSING?'CROSS':'');
          ball.setOwner(p);lastAssist=lastCarrier;lastCarrier=p.name;
          currentSequence(p);
          effects.spawn('RECEIVE',p.x,p.y,0,0,'#4ade80',0.35);
          if(deliveryType&&_inBox(p.x,p.y,p.teamId===0?1:0)){
            const chanceP=deliveryType==='CUTBACK'?0.62:0.50;
            if(rng.bool(chanceP)){
              ball._deliveryType=null;
              handleShot(p,null,false);
            } else {
              _registerDanger(p.teamId,deliveryType==='CUTBACK'?(isTR?"Cutback savunmadan döndü":"Cutback blocked"):(isTR?"Orta savunmadan sekti":"Cross cleared"),deliveryType==='CUTBACK'?'↩':'↗');
              ball._deliveryType=null;
              ball.release();
            }
          } else if(deliveryType){
            ball._deliveryType=null;
          }
          return;
        }
        if(p.teamId!==(ball._shooter?ball._shooter.teamId:ball._lastTeam)){
          const intC=(p.anticipation/100)*0.045+(d2<4?0.06:0);
          if(rng.bool(intC)){ball.setOwner(p);chooseSequence(p);ball._lastTeam=p.teamId;lastAssist=null;lastCarrier=p.name;effects.spawn('TACKLE',p.x,p.y,0,0,'#f59e0b',0.35);
            if(rng.bool(0.35))_html("simComm","🦵 <b>"+p.name.split(' ').pop()+"</b> — "+rng.pick(isTR?_COMM.tackle_tr:_COMM.tackle_en));
            return;}
        }
        continue;
      }
      // loose
      ball.setOwner(p);chooseSequence(p);ball._lastTeam=p.teamId;lastCarrier=p.name;return;
    }
  }

  function doDecision(){
    const carrier=[...teamA,...teamB].find(p=>p.hasBall&&!p.sentOff);if(!carrier)return;
    const tid=carrier.teamId;
    const mates=(tid===0?teamA:teamB).filter(p=>!p.hasBall&&!p.sentOff);
    const opps=(tid===0?teamB:teamA).filter(p=>!p.sentOff);
    const seq=currentSequence(carrier);
    const action=_decide(carrier,ball,mates,opps,score,matchTime,fullTimeSec,shapeCfg,rng,shotCooldown[tid],seq);
    sequenceBeat(action,carrier);
    ball._lastTeam=tid;

    if(action.type==='SHOOT'){
      const goalX=_PW/2,goalY=tid===0?_PH:0;
      const jitter=rng.rng(-5,5);
      const gk=tid===0?teamB.find(p=>p.role==='GK'):teamA.find(p=>p.role==='GK');
      stats.shots[tid]++;
      shotCooldown[tid]=SHOT_COOLDOWN;
      ball._shooter=carrier;
      ball._shotResult=_resolveShot(carrier,gk,rng);
      effects.spawn('SHOT',carrier.x,carrier.y,goalX,goalY,'#fbbf2466',0.55);
      audio.shot();
      ball.shoot(goalX+jitter,goalY);
      _updateStats();
    } else if(action.type==='CROSS'||action.type==='CUTBACK'){
      const gx=action.type==='CUTBACK'?_PW/2+rng.rng(-7,7):_PW/2+rng.rng(-10,10);
      const gy=action.type==='CUTBACK'?(tid===0?_PH-18:18):(tid===0?_PH-10:10);
      const targetPool=(tid===0?teamA:teamB).filter(p=>!p.sentOff&&!p.hasBall);
      const targetRoles=action.type==='CUTBACK'?['AM','CM','ST','LW','RW']:['ST','AM','LW','RW','CM'];
      ball._shooter=carrier;
      ball._passTarget=targetRoles.map(role=>targetPool.find(p=>p.role===role)).find(Boolean)||targetPool[0]||null;
      if(ball._passTarget)ball._passTarget.setTarget(_clampPitchX(gx),_clampPitchY(gy));
      effects.spawn('PASS',carrier.x,carrier.y,gx,gy,action.type==='CUTBACK'?'#4ade8055':'#a78bfa55',0.46);
      if(action.type==='CUTBACK'){ball.passTo(gx,gy,12);ball._deliveryType='CUTBACK';}
      else ball.cross(gx,gy);
      addHeat(carrier.x,carrier.y,1.15);
      addHeat(gx,gy,1.25);
      if(action.type==='CUTBACK'&&rng.bool(0.45))_html("simComm",isTR?"↩️ Cutback! Ceza alanı yayı hedeflendi.":"↩️ Cutback into the edge of the box.");
    } else if(['SHORT_PASS','DRIVEN_PASS','THROUGH_BALL','LONG_PASS','BACK_PASS'].includes(action.type)&&action.receiver){
      const spds={SHORT_PASS:10,DRIVEN_PASS:13.5,THROUGH_BALL:15.5,LONG_PASS:16.5,BACK_PASS:9.5};
      const qual=(carrier.passing*0.4+carrier.vision*0.25+carrier.decisions*0.2+carrier.anticipation*0.15)/100;
      const err=(1-qual)*(action.type==='THROUGH_BALL'?3.5:4.5);
      // Through ball target is ahead of receiver (run into space)
      const runAhead=action.type==='THROUGH_BALL'?8:(action.type==='LONG_PASS'&&seq&&seq.type==='LONG_BALL'?6:0);
      const runDir=tid===0?1:-1;
      const tx=action.receiver.x+rng.rng(-err,err);
      const ty=action.receiver.y+runDir*runAhead+rng.rng(-err*0.5,err*0.5);
      ball._shooter=carrier;ball._passTarget=action.receiver;
      if(runAhead>0)action.receiver.setTarget(_clampPitchX(tx),_clampPitchY(ty));
      const passCol=action.type==='THROUGH_BALL'?(tid===0?'#4ade8055':'#f472b655'):(tid===0?'#93c5fd44':'#fca5a544');
      effects.spawn('PASS',carrier.x,carrier.y,action.receiver.x,action.receiver.y,passCol,0.46);
      ball.passTo(tx,ty,spds[action.type]||16);
      if(seq&&(seq.type==='WIDE_LEFT'||seq.type==='WIDE_RIGHT')){
        addHeat(carrier.x,carrier.y,0.85);
        addHeat(action.receiver.x,action.receiver.y,0.75);
      }
      if(action.type==='THROUGH_BALL'){
        audio.drivenPass();
        if(rng.bool(0.35))_html("simComm","🔑 "+rng.pick(isTR?_COMM.through_tr:_COMM.through_en));
      } else if(action.type==='SHORT_PASS'){
        audio.shortPass();
        if(rng.bool(0.12))_html("simComm","🎵 "+rng.pick(isTR?_COMM.combo_tr:_COMM.combo_en));
      } else audio.drivenPass();
      stats.possession[tid]++;
      lastAssist=lastCarrier;lastCarrier=carrier.name;
    } else if(action.type==='CARRY'){
      const goalX=_PW/2,goalY=tid===0?_PH:0;
      let tx,ty;
      const isWideSeq=seq&&(seq.type==='WIDE_LEFT'||seq.type==='WIDE_RIGHT');
      const isWideCarrier=carrier.role==='LW'||carrier.role==='RW'||carrier.role==='LB'||carrier.role==='RB'||carrier.x<_PW*0.24||carrier.x>_PW*0.76;
      if(isWideSeq&&isWideCarrier){
        const left=seq.type==='WIDE_LEFT';
        const lane=left?_PW*(seq.mode==='underlap'?0.24:0.10):_PW*(seq.mode==='underlap'?0.76:0.90);
        tx=Math.max(4,Math.min(_PW-4,lane+rng.rng(-2,2)));
        ty=Math.max(2,Math.min(_PH-2,carrier.y+(tid===0?1:-1)*rng.rng(7,13)));
      } else {
        tx=Math.max(4,Math.min(_PW-4,carrier.x+(goalX-carrier.x)*0.4+rng.rng(-3,3)));
        ty=Math.max(2,Math.min(_PH-2,carrier.y+(goalY-carrier.y)*0.45));
      }
      carrier.setTarget(tx,ty);
    } else if(action.type==='CLEAR'){
      ball._passTarget=null;ball._shooter=carrier;
      ball.passTo(_PW/2+rng.rng(-18,18),_PH/2,24);audio.drivenPass();
    }
    addHeat(carrier.x,carrier.y,0.5);
    if(seq&&(seq.type==='WIDE_LEFT'||seq.type==='WIDE_RIGHT')){
      const wideX=seq.type==='WIDE_LEFT'?_PW*0.12:_PW*0.88;
      addHeat(wideX,carrier.y,0.32);
    }
  }

  function applyPlayerSeparation(){
    const all=[...teamA,...teamB].filter(p=>!p.sentOff);
    const minD=2.55,minD2=minD*minD;
    for(let i=0;i<all.length;i++){
      for(let j=i+1;j<all.length;j++){
        const a=all[i],b=all[j];
        if(a.role==='GK'||b.role==='GK')continue;
        const dx=b.x-a.x,dy=b.y-a.y,d2=dx*dx+dy*dy;
        if(d2<=0.0001||d2>=minD2)continue;
        const d=Math.sqrt(d2),push=(minD-d)*0.28;
        const nx=dx/d,ny=dy/d;
        if(!a.hasBall){a.x=_clampPitchX(a.x-nx*push);a.y=_clampPitchY(a.y-ny*push);}
        if(!b.hasBall){b.x=_clampPitchX(b.x+nx*push);b.y=_clampPitchY(b.y+ny*push);}
      }
    }
  }

  /* crowd danger */
  function updateCrowd(){
    const carrier=[...teamA,...teamB].find(p=>p.hasBall&&!p.sentOff);
    if(!carrier){audio.crowd(0.1);return;}
    const goalY=carrier.teamId===0?_PH:0;
    const dg=carrier.dist(_PW/2,goalY);
    const threat=Math.max(0,1-dg/35);
    const inBox=_inBox(carrier.x,carrier.y,carrier.teamId===0?1:0);
    audio.crowd(Math.min(1,threat*0.5+(inBox?0.4:0)+(ball.state===_BS.SHOOTING?0.3:0)));
  }

  /* halftime check */
  let halfTimePause=false,etMode=false,goldenGoalMode=false;
  function checkHalftime(){
    if(!halfDone&&matchTime>=45*60){
      halfDone=true;audio.whistle();
      _dom("simState",isTR?"DEVRE ARASI":"HALF TIME");
      _html("simComm","🔔 "+(isTR?"DEVRE ARASI":"HALF TIME")+" · "+score[0]+"–"+score[1]);
      reposition();kickoff(1);
    }
  }
  function checkFT(){
    if(!etMode&&matchTime>=fullTimeSec){
      if(score[0]===score[1]){
        etMode=true;goldenGoalMode=true;audio.whistle();
        _dom("simState",isTR?"ALTIN GOL":"GOLDEN GOAL");
        const stateEl=document.getElementById("simState");if(stateEl)stateEl.classList.add("is-golden");
        _html("simComm","<b>"+(isTR?"ALTIN GOL":"GOLDEN GOAL")+"</b>: "+(isTR?"\u0130lk gol kupay\u0131 al\u0131r.":"Next goal wins the cup."));
        renderer.burst(isTR?"ALTIN GOL":"GOLDEN GOAL");
        lastPressureAudit=matchTime-360;
        lastForcedAttackTime=matchTime-180;
        shotCooldown[0]=Math.min(shotCooldown[0],6);
        shotCooldown[1]=Math.min(shotCooldown[1],6);
        reposition();kickoff(0);
      } else endMatch();
    }
    if(etMode&&matchTime>=(90+stoppage+30)*60){
      if(score[0]===score[1])goToFinalPenalties();
      else endMatch();
    }
  }

  /* atmosphere events */
  let atmTimer=0;
  let disciplineCooldown=90;
  let comboCount=0; // track pass sequences for combo commentary
  let lastPressureAudit=-999;
  function _liveTeam(teamId){return (teamId===0?teamA:teamB).filter(p=>!p.sentOff);}
  function _setCarrier(player){
    if(!player)return false;
    [...teamA,...teamB].forEach(p=>{p.hasBall=false;});
    ball.setOwner(player);
    ball._lastTeam=player.teamId;
    lastCarrier=player.name;
    return true;
  }
  function startWidePressure(teamId,reason){
    const team=teamId===0?teamA:teamB;
    const side=rng.bool(0.5)?'WIDE_LEFT':'WIDE_RIGHT';
    const wanted=side==='WIDE_LEFT'?['LW','LB','CM','AM']:['RW','RB','CM','AM'];
    let carrier=null;
    for(const role of wanted){carrier=team.find(p=>p.role===role&&!p.sentOff);if(carrier)break;}
    if(!carrier)carrier=team.find(p=>p.role!=='GK'&&!p.sentOff);
    if(!carrier)return;
    const x=side==='WIDE_LEFT'?_PW*0.13:_PW*0.87;
    const y=teamId===0?_PH*rng.rng(0.56,0.68):_PH*rng.rng(0.32,0.44);
    carrier.x=_clampPitchX(x+rng.rng(-2,2));
    carrier.y=_clampPitchY(y);
    carrier.setTarget(carrier.x,carrier.y);
    _setCarrier(carrier);
    tacticalSeq.team=teamId;tacticalSeq.type=side;tacticalSeq.mode=rng.pick(['overlap','overlap','cutback','underlap']);
    tacticalSeq.beat=0;tacticalSeq.until=matchTime+rng.rng(10,16);tacticalSeq.lastCarrierId=carrier.id;
    shotCooldown[teamId]=Math.min(shotCooldown[teamId],12);
    addHeat(carrier.x,carrier.y,1.6);
    const runner=team.find(p=>!p.sentOff&&!p.hasBall&&((side==='WIDE_LEFT'&&(p.role==='LB'||p.role==='LW'))||(side==='WIDE_RIGHT'&&(p.role==='RB'||p.role==='RW'))));
    if(runner){
      const rx=side==='WIDE_LEFT'?_PW*(tacticalSeq.mode==='underlap'?0.24:0.08):_PW*(tacticalSeq.mode==='underlap'?0.76:0.92);
      const ry=_clampPitchY(carrier.y+(teamId===0?1:-1)*rng.rng(8,13));
      runner.setTarget(rx,ry);
      addHeat(rx,ry,0.9);
      effects.spawn('RUN',carrier.x,carrier.y,rx,ry,'rgba(217,249,157,0.78)',0.95);
    }
    const support=team.find(p=>!p.sentOff&&!p.hasBall&&(p.role==='CM'||p.role==='AM'));
    if(support){
      const sx=side==='WIDE_LEFT'?_PW*rng.rng(0.30,0.40):_PW*rng.rng(0.60,0.70);
      const sy=_clampPitchY(carrier.y+(teamId===0?1:-1)*rng.rng(4,8));
      support.setTarget(sx,sy);
      addHeat(sx,sy,0.65);
      effects.spawn('RUN',carrier.x,carrier.y,sx,sy,'rgba(134,239,172,0.55)',0.75);
    }
    const label=side==='WIDE_LEFT'?(isTR?"Sol kanat yüklendi":"Left flank overload"):(isTR?"Sağ kanat yüklendi":"Right flank overload");
    _html("simComm",(reason||"")+" <b>"+label+"</b>.");
  }
  function startCentralProbe(teamId,reason){
    const team=_liveTeam(teamId);
    if(!team.length)return;
    const wanted=['AM','CM','ST','LW','RW'];
    let carrier=null;
    for(const role of wanted){carrier=team.find(p=>p.role===role);if(carrier)break;}
    carrier=carrier||team.find(p=>p.role!=='GK')||team[0];
    const y=teamId===0?_PH*rng.rng(0.58,0.70):_PH*rng.rng(0.30,0.42);
    carrier.x=_clampPitchX(_PW*rng.rng(0.38,0.62));
    carrier.y=_clampPitchY(y);
    carrier.setTarget(carrier.x,carrier.y);
    _setCarrier(carrier);
    tacticalSeq.team=teamId;tacticalSeq.type=rng.bool(0.35)?'COUNTER':'BUILD_CENTER';tacticalSeq.mode='triangle';
    tacticalSeq.beat=0;tacticalSeq.until=matchTime+rng.rng(8,13);tacticalSeq.lastCarrierId=carrier.id;
    shotCooldown[teamId]=Math.min(shotCooldown[teamId],8);
    addHeat(carrier.x,carrier.y,1.4);
    _html("simComm",(reason||"")+" <b>"+(isTR?"Merkezden yoklama":"Central probe")+"</b>.");
  }
  function maybePressureAudit(){
    if(gameEnded||matchTime-lastPressureAudit<280||matchTime-lastForcedAttackTime<150)return;
    const totalShots=stats.shots[0]+stats.shots[1];
    const totalDanger=stats.danger[0]+stats.danger[1];
    const etElapsed=goldenGoalMode?Math.max(0,matchTime-fullTimeSec):0;
    let due=false;
    if(matchTime>18*60&&totalDanger<1)due=true;
    if(matchTime>40*60&&totalShots<2)due=true;
    if(matchTime>66*60&&totalShots<4)due=true;
    if(goldenGoalMode&&etElapsed>3*60&&totalShots<6)due=true;
    if(!due)return;
    lastPressureAudit=matchTime;
    lastForcedAttackTime=matchTime;
    const trailing=score[0]<score[1]?0:score[1]<score[0]?1:-1;
    const teamId=trailing>=0?trailing:(momDisplay<48?0:momDisplay>52?1:rng.int(2));
    const reason=goldenGoalMode?(isTR?"Altın golde risk arttı.":"Golden goal raises the risk."):(isTR?"Maç sıkıştı.":"Game has stalled.");
    if(goldenGoalMode||rng.bool(0.58))startWidePressure(teamId,reason);
    else startCentralProbe(teamId,reason);
  }
  function maybeAtmosphere(){
    atmTimer+=_FIXED_STEP;
    disciplineCooldown=Math.max(0,disciplineCooldown-_FIXED_STEP);
    if(atmTimer<58)return;atmTimer=0;
    const tid=rng.int(2);
    const oppTeam=tid===0?teamB:teamA;
    const atkTeam=tid===0?teamA:teamB;
    const roll=rng.next();
    const recentDanger=matchTime-lastDangerTime<95;
    const sterile=(stats.shots[0]+stats.shots[1]<2&&matchTime>35*60)||(stats.danger[0]+stats.danger[1]<2&&matchTime>55*60);
    if(roll<0.007&&disciplineCooldown<=0){
      // yellow card
      const cardable=oppTeam.filter(p=>p.role!=='GK'&&!p.sentOff&&(p.yellowCards||0)<2);
      const fresh=cardable.filter(p=>(p.yellowCards||0)===0);
      const warned=cardable.filter(p=>(p.yellowCards||0)===1);
      let pl=null;
      if(warned.length&&rng.bool(0.0016)&&stats.reds[0]+stats.reds[1]<1)pl=rng.pick(warned);
      else if(fresh.length)pl=rng.pick(fresh);
      else if(warned.length&&rng.bool(0.0008)&&stats.reds[0]+stats.reds[1]<1)pl=rng.pick(warned);
      const nm=pl?pl.name.split(' ').pop():'?';
      if(pl){
        disciplineCooldown=380+rng.rng(0,300);
        pl.yellowCards=(pl.yellowCards||0)+1;
        if(pl.yellowCards>=2){
          stats.yellows[pl.teamId]++;
          _sendOffPlayer(pl,isTR?"İkinci sarıdan kırmızı! Oyundan çıktı.":"Second yellow, red card! Sent off.");
          momDisplay=Math.max(18,Math.min(82,momDisplay+(pl.teamId===0?-8:8)));
        } else {
          stats.yellows[pl.teamId]++;
          _html("simComm","🟨 <b>"+nm+"</b> — "+(isTR?"Sarı kart!":"Yellow card!"));
          _addRow(pl.teamId,"<b>"+Math.floor(matchTime/60)+"'</b><span>🟨 "+nm+"</span>");
        }
        return;
      }
      return;
    } else if(roll<0.11){
      // tackle / interception with player name
      const defender=oppTeam.find(p=>(p.role==='CB'||p.role==='DM')&&!p.sentOff)||oppTeam.find(p=>p.role!=='GK'&&!p.sentOff);
      const nm=defender?defender.name.split(' ').pop():'?';
      _html("simComm","🦵 <b>"+nm+"</b> — "+rng.pick(isTR?_COMM.tackle_tr:_COMM.tackle_en));
      effects.spawn('TACKLE',defender?defender.x:_PW/2,defender?defender.y:_PH/2,0,0,'#f59e0b',0.4);
    } else if(roll<0.16){
      // counter attack sequence
      const fwd=atkTeam.find(p=>(p.role==='ST'||p.role==='LW'||p.role==='RW')&&!p.sentOff);
      const nm=fwd?fwd.name.split(' ').pop():'?';
      _html("simComm","⚡ <b>"+nm+"</b> — "+rng.pick(isTR?_COMM.counter_tr:_COMM.counter_en));
      if(matchTime-lastForcedAttackTime>120&&rng.bool(goldenGoalMode?0.65:0.38)){
        lastForcedAttackTime=matchTime;
        startCentralProbe(tid,isTR?"Hızlı geçiş fırsatı.":"Transition chance.");
      }
    } else if(roll<0.23){
      // free kick
      const pl=atkTeam.find(p=>(p.role==='CM'||p.role==='AM')&&!p.sentOff)||atkTeam.find(p=>!p.sentOff);
      const nm=pl?pl.name.split(' ').pop():'?';
      _html("simComm","🎯 <b>"+nm+"</b> — "+rng.pick(isTR?_COMM.freekick_tr:_COMM.freekick_en));
      if(matchTime-lastDangerTime>140&&rng.bool(0.28)){
        _registerDanger(tid,isTR?"Serbest vuruş tehlikesi":"Free-kick threat","🎯");
      }
    } else if(roll<0.30){
      // combo pass sequence
      _html("simComm",rng.pick(isTR?_COMM.combo_tr:_COMM.combo_en));
      if(sterile&&matchTime-lastForcedAttackTime>120){
        lastForcedAttackTime=matchTime;
        startWidePressure(tid,isTR?"Pas trafiği kanada aktı.":"Passing pattern moved wide.");
      }
    } else if(roll<0.40){
      // tactical shout-based
      const shoutComm=shapeCfg.shout==='push'?rng.pick(isTR?_COMM.press_tr:_COMM.press_en):shapeCfg.shout==='hold'?rng.pick(isTR?_COMM.protect_tr:_COMM.protect_en):shapeCfg.shout==='calm'?rng.pick(isTR?_COMM.tempo_tr:_COMM.tempo_en):shapeCfg.shout==='more'?rng.pick(isTR?_COMM.surge_tr:_COMM.surge_en):null;
      if(shoutComm)_html("simComm",shoutComm);
      else{
        const at=recentDanger
          ?(isTR?["📣 Tribünler ayakta!","🌊 Baskı devam ediyor!","🔔 Kritik an!","⚡ Her iki takım sıkı!"]:["📣 Crowd on their feet!","🌊 Pressure building!","🔔 Critical moment!","⚡ Both teams compact!"])
          :(isTR?["🎵 Oyun dengede akıyor.","🧭 Takımlar pozisyon arıyor.","💨 Tempo yavaş yavaş yükseliyor.","⚖️ Orta sahada denge var."]:["🎵 The match is settling.","🧭 Both teams looking for shape.","💨 Tempo is gradually rising.","⚖️ Midfield balance holds."]);
        _html("simComm",rng.pick(at));
      }
    } else if(roll<0.50){
      // score-context commentary
      const diff=score[0]-score[1];
      let ctx;
      if(diff>1)ctx=isTR?"🛡️ Rahat fark — skoru yönetiyoruz":"🛡️ Comfortable lead — managing the game";
      else if(diff===1)ctx=isTR?"⏰ Tek gollük fark — gergin dakikalar":"⏰ One goal lead — nervy moments";
      else if(diff===-1)ctx=isTR?"🔥 Eşitleme peşindeyiz!":"🔥 Chasing the equaliser!";
      else if(diff<-1)ctx=isTR?"😰 İki gol gerideyiz — gerçekçi olmak lazım":"😰 Two down — need a miracle";
      else ctx=isTR?"⚖️ Beraberlik — her iki takım da gol arıyor":"⚖️ Level — both hunting the winner";
      _html("simComm",ctx);
    } else {
      // player-specific moment
      const star=atkTeam.find(p=>p.role==='ST'&&!p.sentOff)||atkTeam.find(p=>p.role==='AM'&&!p.sentOff)||atkTeam.find(p=>!p.sentOff);
      const nm=star?star.name.split(' ').pop():'?';
      const pComms=isTR?["🌟 <b>"+nm+"</b> yine sahada!","💫 <b>"+nm+"</b> fırsatı kolluyor!","🎯 <b>"+nm+"</b> pozisyon arıyor!"]:["🌟 <b>"+nm+"</b> on the ball!","💫 <b>"+nm+"</b> looking for his chance!","🎯 <b>"+nm+"</b> seeking the opening!"];
      _html("simComm",rng.pick(pComms));
    }
    _updateStats();
  }

  /* main sim step */
  function simStep(dt){
    if(gameEnded||halfTimePause)return;
    matchTime+=dt;
    checkHalftime();checkFT();if(gameEnded)return;

    // out of play
    if(ball.state===_BS.OUT_OF_PLAY){outTimer-=dt;if(outTimer<=0)resolveOut();return;}

    const motionDt=dt*0.31;
    ball.update(motionDt);
    if(ball.state===_BS.LOOSE&&ball._shooter&&ball._shotResult){
      handleShot(ball._shooter,ball._shotResult,true);
    }

    // boundary check
    if(ball.x<-2||ball.x>_PW+2||ball.y<-4||ball.y>_PH+4){
      if(ball.state!==_BS.OUT_OF_PLAY){ball.state=_BS.OUT_OF_PLAY;outTimer=0.7;}
      return;
    }

    tryPickup();

    // Pass receiver chases ball
    if((ball.state===_BS.PASSING||ball.state===_BS.CROSSING)&&ball._passTarget){
      ball._passTarget.setTarget(ball.x,ball.y);
    }

    // GK
    _updateGK(teamA.find(p=>p.role==='GK'),ball,motionDt);
    _updateGK(teamB.find(p=>p.role==='GK'),ball,motionDt);

    // Tactical
    slotTimer+=dt;
    if(slotTimer>=SLOT_INT){slotTimer=0;
      const hasBallA=teamA.some(p=>p.hasBall&&!p.sentOff);
      const hasBallB=teamB.some(p=>p.hasBall&&!p.sentOff);
      const seqA=hasBallA?tacticalSeq:null;
      const seqB=hasBallB?tacticalSeq:null;
      _tacticalTargets(teamA,ball,teamB,0,hasBallA,shapeCfg.shout,matchTime,rng,seqA);
      _tacticalTargets(teamB,ball,teamA,1,hasBallB,shapeCfg.shout==='push'&&hasBallA?'push':null,matchTime,rng,seqB);
      // presser
      const carrierRef=[...teamA,...teamB].find(p=>p.hasBall&&!p.sentOff);
      if(carrierRef){const oppTeam=carrierRef.teamId===0?teamB:teamA;let bst=null,bd=99;for(const p of oppTeam){if(p.role==='GK'||p.sentOff)continue;const d=p.dist(ball.x,ball.y);if(d<bd){bd=d;bst=p;}}if(bst)bst.setTarget(ball.x,ball.y);}
    }

    // Shot cooldown
    if(shotCooldown[0]>0)shotCooldown[0]-=dt;
    if(shotCooldown[1]>0)shotCooldown[1]-=dt;

    // Decision
    decTimer+=dt;
    if(decTimer>=DEC_INT){decTimer=0;doDecision();}

    // Move players
    for(const p of [...teamA,...teamB])p.update(motionDt,matchTime);
    applyPlayerSeparation();

    // Stuck
    if(ball.state===_BS.LOOSE||ball.state===_BS.PASSING||ball.state===_BS.CROSSING){
      stuckTimer+=dt;
      const stuckLimit=ball.state===_BS.LOOSE?3.5:2.0;
      if(stuckTimer>stuckLimit){stuckTimer=0;let n=null,nd=99;for(const p of[...teamA,...teamB]){if(p.sentOff)continue;const d=p.dist(ball.x,ball.y);if(d<nd){nd=d;n=p;}}if(n){ball.setOwner(n);ball._passTarget=null;}}
    }else stuckTimer=0;

    // Effects
    effects.update(motionDt);

    // Possession
    const car2=[...teamA,...teamB].find(p=>p.hasBall&&!p.sentOff);if(car2)stats.possession[car2.teamId]++;

    // Crowd
    if(Math.floor(matchTime*2)%3===0)updateCrowd();

    // Atmosphere
    maybeAtmosphere();
    maybePressureAudit();

    // HUD clock + TV overlay
    const min=etMode?Math.min(120,90+Math.floor((matchTime-fullTimeSec)/60)):Math.min(90,Math.floor(matchTime/60));
    _dom("simClk",min+"'");
    const tvEl=document.getElementById("tvover");
    if(tvEl){
      const finalLabel=goldenGoalMode?(isTR?"🏆 ALTIN GOL":"🏆 GOLDEN GOAL"):(isTR?"🏆 FİNAL":"🏆 FINAL");
      const liveLabel=isTR?"🔴 TRT SPOR · CANLI":"🔴 LIVE";
      tvEl.innerHTML=(typeof round!=="undefined"&&round>=6?finalLabel:liveLabel)+" · "+min+"' · "+score[0]+"–"+score[1];
    }
  }

  /* player ratings */
  function calcRatings(){
    window.lastMatchRatings=null;
    try{
      const players=(typeof picksBySlot!=="undefined"?picksBySlot:[]).filter(Boolean);
      if(!players.length)return;
      const goalMap={},assistMap={};
      goalEvents.forEach(ev=>{if(ev.type!=='goal'||ev.side!=='A')return;const sn=(ev.scorer||'').split(' ').pop();if(sn)goalMap[sn]=(goalMap[sn]||0)+1;const an=(ev.assist||'').split(' ').pop();if(an)assistMap[an]=(assistMap[an]||0)+1;});
      const gFor=score[0],gAgainst=score[1],won=score[0]>score[1];
      const seed=typeof seedNum!=="undefined"?seedNum:0;
      window.lastMatchRatings=players.map((p,i)=>{
        const sn=p.name.split(' ').pop();const goals=goalMap[sn]||0,assists=assistMap[sn]||0;
        const grp=typeof groupOf==='function'?groupOf(p.pos):'MID';
        let r=6.0;r+=goals*1.5+assists*0.7;r+=won?0.3:(gAgainst>gFor?-0.25:0);
        if(grp==='GK')r+=gAgainst===0?0.8:-gAgainst*0.25;else if(grp==='DEF'&&gAgainst===0)r+=0.3;
        r+=(Math.sin(seed*31+i*17)*0.5+0.5)*0.6-0.3;r=Math.round(Math.max(4.5,Math.min(9.5,r))*10)/10;
        return{name:p.name,pos:p.pos,eff:typeof effOf==='function'?effOf(p):(p.ov||0),rating:r,goals,assists};
      });
    }catch(e){}
  }

  function endMatch(){
    if(gameEnded)return;gameEnded=true;
    if(animId){cancelAnimationFrame(animId);animId=null;}
    audio.whistle();setTimeout(()=>audio.stop(),1000);
    // final heatmap
    [...teamA,...teamB].forEach(p=>{const gy=Math.min(HGH-1,Math.floor(p.hy/_PH*HGH));const gx=Math.min(HGW-1,Math.floor(p.hx/_PW*HGW));if(p.role!=='GK')heatGrid[gy*HGW+gx]+=0.5;});
    // draw final frame with heatmap
    renderer.clear();renderer.drawPitch();renderer.drawPlayers([...teamA,...teamB],ball);renderer.drawBall(ball);
    drawHeatmap(rawCtx,W,H,heatGrid,HGW,HGH);
    try{window._heatmapImg=canvas.toDataURL("image/png");}catch(e2){}
    // globals
    const won=score[0]>score[1];const sc=score[0]+"–"+score[1];
    const aScorers=goalEvents.filter(e=>e.side==='A').map(e=>e.scorer).filter(Boolean);
    window.motm=aScorers.length?aScorers.reduce((a,b,_,arr)=>arr.filter(x=>x===b).length>=arr.filter(x=>x===a).length?b:a):null;
    if(!window.motm&&typeof picksBySlot!=="undefined"&&picksBySlot){const out=(picksBySlot).filter(p=>p&&p.pos!=='GK');const pp=out[Math.floor(Math.random()*out.length)];window.motm=pp?pp.name.split(' ').pop():'?';}
    if(!window.motm)window.motm='?';
    window.keyMoment=goalEvents[0]?.scorer?(goalEvents[0].scorer+" "+goalEvents[0].minute+"'"):sc;
    window.penaltyNote='';window.shotsA=stats.shots[0];window.shotsB=stats.shots[1];window.keeperA=stats.saves[1];window.keeperB=stats.saves[0];window.goals=goalEvents;
    const isTR2=isTR;const kM=window.keyMoment||"-";
    const fw=["Kupa sandığa girdi.","Rüya sezon!","Son düdüğe kadar didindi.","Bu takım birlikte büyüdü."];const lw=["Finale geldi, yetmedi.","Son adımda tökezledi.","Sıfırdan başla.","Bir sonraki run."];
    const ni=Math.floor(Math.random()*fw.length);
    window.finalReportHTML=`<h4>${isTR2?"Final Karnesi":"Final Report"}</h4><div class="frrow"><span>${isTR2?"Kırılma anı":"Key moment"}</span><b>${kM}</b></div><div class="frrow"><span>${isTR2?"Şutlar":"Shots"}</span><b>${stats.shots[0]}-${stats.shots[1]}</b></div><div class="frrow"><span>${isTR2?"Kurtarışlar":"Saves"}</span><b>${stats.saves[0]}-${stats.saves[1]}</b></div><div class="frrow"><span>${isTR2?"Final yorumu":"Final note"}</span><b>${won?(isTR2?fw[ni]:fw[ni]):(isTR2?lw[ni]:lw[ni])}</b></div>`;
    calcRatings();
    _dom("simScore",sc);
    setTimeout(()=>endRun(won,sc),900);
  }

  function goToFinalPenalties(){
    if(gameEnded)return;gameEnded=true;
    if(animId){cancelAnimationFrame(animId);animId=null;}
    audio.whistle();setTimeout(()=>audio.stop(),800);
    renderer.clear();renderer.drawPitch();renderer.drawPlayers([...teamA,...teamB],ball);renderer.drawBall(ball);
    const sc=score[0]+"–"+score[1];
    window._finalPenaltyScore=sc;
    window.keyMoment=isTR?"Altın golde gol çıkmadı":"No golden goal";
    window.penaltyNote=isTR?"penaltılara gidildi":"went to penalties";
    window.shotsA=stats.shots[0];window.shotsB=stats.shots[1];window.keeperA=stats.saves[1];window.keeperB=stats.saves[0];window.goals=goalEvents;
    calcRatings();
    _dom("simState",isTR?"PENALTILAR":"PENALTIES");
    const stateEl=document.getElementById("simState");if(stateEl)stateEl.classList.remove("is-golden");
    renderer.burst(isTR?"PENALTILAR":"PENALTIES");
    _html("simComm","<b>"+(isTR?"PENALTILAR":"PENALTIES")+"</b>: "+(isTR?"Alt\u0131n gol \u00e7\u0131kmad\u0131. Kupa penalt\u0131lara kald\u0131.":"No golden goal. The cup goes to penalties."));
    _html("simRadio",(isTR?"\uD83C\uDFC6 Alt\u0131n golde skor de\u011fi\u015fmedi. Penalt\u0131lara haz\u0131rlan\u0131yoruz.":"\uD83C\uDFC6 No golden goal. Preparing for penalties."));
    setTimeout(()=>{if(typeof showPenaltyShootout==="function")showPenaltyShootout("final");else endRun(false,sc);},2400);
  }

  /* animation loop */
  const FIXED_STEP=_FIXED_STEP;
  let accumulator=0,prevTime=null,frameCount=0;
  let statUpdateTimer=0;

  function tick(now){
    if(gameEnded)return;
    if(!prevTime)prevTime=now;
    const frameMs=Math.min((now-prevTime)/1000,0.25);prevTime=now;
    const spd=Math.max(0.1,typeof speedMul!=="undefined"?speedMul:1);
    accumulator+=frameMs*spd;
    // Cap steps per frame to prevent spiral of death at very high speeds
    const MAX_STEPS=Math.ceil(spd*0.38)+4;
    let _steps=0;
    while(accumulator>=FIXED_STEP&&_steps<MAX_STEPS){simStep(FIXED_STEP);accumulator-=FIXED_STEP;_steps++;}
    renderer.decay(frameMs);
    renderer.clear();
    renderer.drawPitch();
    renderer.drawEffects(effects.all());
    renderer.drawPlayers([...teamA,...teamB],ball);
    renderer.drawBall(ball);
    renderer.drawHUD(momDisplay,score,Math.floor(matchTime/60),myName,oppName,shoutMode,isTR);
    statUpdateTimer+=frameMs;
    if(statUpdateTimer>0.5){statUpdateTimer=0;_updateStats();}
    if(!gameEnded)animId=requestAnimationFrame(tick);
  }

  /* init DOM */
  _dom("simScore","0–0");_dom("simClk","0'");_dom("simState",isTR?"Dengeli final":"Even game");
  _dom("simComm","—");_dom("simRadio","📻 —");
  const sg=document.getElementById("simGoals");if(sg)sg.innerHTML="";
  const initStateEl=document.getElementById("simState");if(initStateEl)initStateEl.classList.remove("is-golden");
  _updateStats();
  _dom("simA",myName);_dom("simB",oppName);

  /* kickoff */
  reposition();kickoff(0);

  /* sim object */
  sim={
    pause(){if(animId){cancelAnimationFrame(animId);animId=null;}},
    resume(){if(!gameEnded&&!animId){prevTime=null;animId=requestAnimationFrame(tick);}},
    skip(){
      if(gameEnded)return;
      if(animId){cancelAnimationFrame(animId);animId=null;}
      // fast-forward synchronously — bypass halftime pause
      halfTimePause=false;
      const maxSec=(90+stoppage+30)*60;
      let guard=0;
      while(!gameEnded&&matchTime<maxSec&&guard<300000){simStep(FIXED_STEP);guard++;}
      if(!gameEnded)endMatch();
    },
    shout(t){
      if(gameEnded)return;
      shoutMode=t;shapeCfg.shout=t;
      const msgs={more:isTR?"⚡ Yükleniyoruz! Tam gaz!":"⚡ We're surging! Full attack!",push:isTR?"📣 Önde baskı! Rakibi boğ!":"📣 High press! Suffocate them!",calm:isTR?"🧘 Tempoyu düşür, kontrol et.":"🧘 Slow it down, keep control.",hold:isTR?"🛡️ Skoru koru! Savunma duvarı!":"🛡️ Hold the score! Defensive wall!"};
      const boosts={more:10,push:7,calm:-5,hold:-7};
      momDisplay=Math.max(18,Math.min(82,momDisplay+(boosts[t]||0)));
      const msg=msgs[t]||"";_html("simComm",msg);_html("simRadio","📻 "+msg);
    }
  };

  animId=requestAnimationFrame(tick);
}
