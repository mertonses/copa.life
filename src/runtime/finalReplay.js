/* Local final replay/audit record. Share codes contain only model inputs. */
(function(global){
  "use strict";

  const VERSION=2;
  const KEY="copa_final_replay_v2";
  const finite=value=>Number.isFinite(Number(value));
  const pair=value=>Array.isArray(value)&&value.length===2?value.map(item=>Number(item)||0):[0,0];
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,Number(value)||0));
  let viewer=null;
  let verifiedPreview=null;

  function cleanAudit(value){
    const source=value&&typeof value==="object"?value:{};
    const numbers=[
      "wide","central","recycle","longBall","counter","overlapRuns","cutbacks","crosses",
      "throughBalls","longPasses","backPasses","pressWins","discipline","buildFromBack",
      "setPieces","gkShortStarts","centralTriangles","lowTempoBeats","resets",
      "finalPressureEvents","plannedSequences","reweightedSequences","passes","interceptions"
    ];
    return Object.fromEntries(numbers.map(key=>[key,Math.max(0,Math.round(Number(source[key])||0))]));
  }

  function cleanEvents(events){
    return (Array.isArray(events)?events:[]).slice(0,160).map(event=>({
      minute:Math.round(clamp(event&&event.minute,0,120)),
      type:String(event&&event.type||"moment").replace(/_/g,"-").replace(/[^a-z0-9-]/g,"").slice(0,24)||"moment",
      side:event&&event.side==="B"?"B":"A",
      label:String(event&&event.label||"").replace(/\s+/g," ").trim().slice(0,180),
      x:Math.round(clamp(event&&finite(event.x)?event.x:0.5,0,1)*1000)/1000,
      y:Math.round(clamp(event&&finite(event.y)?event.y:(event&&event.side==="B"?0.68:0.32),0,1)*1000)/1000
    })).sort((a,b)=>a.minute-b.minute);
  }

  function validate(value){
    return !!value&&value.v===VERSION&&typeof value.modelVersion==="string"&&
      typeof value.code==="string"&&value.code.length<2300&&finite(value.savedAt)&&
      Array.isArray(value.score)&&value.score.length===2&&value.stats&&typeof value.stats==="object"&&
      (!value.timeline||Array.isArray(value.timeline));
  }

  function record(input){
    const core=global.CopaFinalSimCore;
    if(!core||typeof core.createReplayCode!=="function")return null;
    const source=input&&typeof input==="object"?input:{};
    const config=core.normalizeConfig(source.config||{});
    const value={
      v:VERSION,savedAt:Date.now(),modelVersion:core.MODEL_VERSION,
      code:core.createReplayCode(config),config,
      result:String(source.result||"complete").slice(0,24),
      score:pair(source.score),
      teams:(Array.isArray(source.teams)?source.teams:["COPA","OPPONENT"]).slice(0,2).map(item=>String(item||"").slice(0,42)),
      stats:{
        shots:pair(source.stats&&source.stats.shots),
        saves:pair(source.stats&&source.stats.saves),
        xg:pair(source.stats&&source.stats.xg).map(item=>Math.round(item*1000)/1000),
        yellow:pair(source.stats&&(source.stats.yellow||source.stats.yellows)),
        red:pair(source.stats&&(source.stats.red||source.stats.reds))
      },
      audit:cleanAudit(source.audit),
      timeline:cleanEvents(source.events)
    };
    try{global.localStorage.setItem(KEY,JSON.stringify(value));}catch(_){}
    return value;
  }

  function last(){
    try{const value=JSON.parse(global.localStorage.getItem(KEY)||"null");return validate(value)?value:null;}catch(_){return null;}
  }

  async function copy(code){
    const text=String(code||(last()&&last().code)||"");
    if(!text)return false;
    try{
      if(global.navigator.clipboard&&global.isSecureContext)await global.navigator.clipboard.writeText(text);
      else{
        const area=document.createElement("textarea");
        area.value=text;area.setAttribute("readonly","");area.style.position="fixed";area.style.opacity="0";
        document.body.appendChild(area);area.select();document.execCommand("copy");area.remove();
      }
      if(typeof global.showToast==="function")global.showToast(global.LANG==="tr"?"Final tekrar kodu kopyalandı":"Final replay code copied");
      return true;
    }catch(_){return false;}
  }

  function importDialog(){
    const tr=global.LANG==="tr";
    global.showModal(`<div class="scoutmodal final-replay-import"><h4>${tr?"Final tekrar kodu":"Final replay code"}</h4><p>${tr?"Paylaşılan CFS3 kodunu yapıştır. Kod yalnız simülasyon girdilerini içerir.":"Paste a shared CFS3 code. It contains simulation inputs only."}</p><textarea id="finalReplayImportValue" maxlength="2300" spellcheck="false"></textarea><div class="bact"><button class="btn btn-primary" type="button" onclick="inspectFinalReplayInput()">${tr?"TEKRARI DOĞRULA":"VERIFY REPLAY"}</button><button class="btn btn-ghost" type="button" onclick="closeModal()">${tr?"KAPAT":"CLOSE"}</button></div></div>`,{label:tr?"Final tekrar kodu":"Final replay code"});
    setTimeout(()=>document.getElementById("finalReplayImportValue")?.focus(),30);
  }

  function openImport(){
    const ready=global.CopaFinalSimCore
      ?Promise.resolve()
      :(global.CopaLazy&&global.CopaLazy.ensureFinalSim?global.CopaLazy.ensureFinalSim():Promise.reject(new Error("core_unavailable")));
    ready.then(importDialog).catch(()=>{
      if(typeof global.showToast==="function")global.showToast(global.LANG==="tr"?"Final çekirdeği yüklenemedi":"Final core could not load");
    });
  }

  function inspect(code){
    const core=global.CopaFinalSimCore;
    return core&&core.replay(String(code||"").trim())||null;
  }

  function previewFromCore(match){
    const tr=global.LANG==="tr";
    return {
      v:VERSION,savedAt:Date.now(),modelVersion:match.model_version,code:match.replayCode||"",
      score:pair(match.score),teams:[tr?"Ev sahibi":"Home",tr?"Deplasman":"Away"],
      stats:match.stats,
      timeline:cleanEvents((match.events||[]).map(event=>({
        ...event,side:event.side===1?"B":"A",x:0.5,y:event.side===1?0.68:0.32,
        label:`${Math.round(event.minute||0)}' · ${String(event.type||"event").replace(/_/g," ")}`
      })))
    };
  }

  function inspectInput(){
    const input=document.getElementById("finalReplayImportValue");
    const match=inspect(input&&input.value);
    const tr=global.LANG==="tr";
    if(!match){
      if(typeof global.showToast==="function")global.showToast(tr?"Kod geçersiz veya sürümü uyumsuz":"Code is invalid or incompatible");
      return false;
    }
    verifiedPreview=previewFromCore(match);
    const end=match.penalties?(tr?"Penaltılar":"Penalties"):match.goldenGoal?(tr?"Altın gol":"Golden goal"):(tr?"Normal süre":"Regulation");
    global.showModal(`<div class="scoutmodal"><h4>${tr?"Doğrulanmış final tekrarı":"Verified final replay"}</h4><div class="pbreak"><div class="pbr"><span>${tr?"Model":"Model"}</span><b>${match.model_version}</b></div><div class="pbr"><span>${tr?"Skor":"Score"}</span><b>${match.score[0]}–${match.score[1]}</b></div><div class="pbr"><span>${tr?"Bitiş":"Finish"}</span><b>${end}</b></div><div class="pbr"><span>${tr?"Şut":"Shots"}</span><b>${match.stats.shots[0]}–${match.stats.shots[1]}</b></div><div class="pbr"><span>xG</span><b>${match.stats.xg[0].toFixed(2)}–${match.stats.xg[1].toFixed(2)}</b></div><div class="pbr"><span>${tr?"Kart":"Cards"}</span><b>${match.stats.yellow[0]+match.stats.red[0]}–${match.stats.yellow[1]+match.stats.red[1]}</b></div></div><div class="bact"><button class="btn btn-primary" type="button" onclick="openVerifiedFinalReplay()">${tr?"GÖRSEL TEKRAR":"VISUAL REPLAY"}</button><button class="btn btn-ghost" type="button" onclick="closeModal()">${tr?"KAPAT":"CLOSE"}</button></div></div>`,{label:tr?"Final tekrar sonucu":"Final replay result"});
    return true;
  }

  function eventText(event,tr){
    if(event&&event.label)return event.label;
    const names={
      goal:tr?"Gol":"Goal",save:tr?"Kurtarış":"Save",wide:tr?"İsabetsiz şut":"Shot wide",
      post:tr?"Direk":"Post",corner:tr?"Korner":"Corner",yellow:tr?"Sarı kart":"Yellow card",
      "yellow-card":tr?"Sarı kart":"Yellow card","red-card":tr?"Kırmızı kart":"Red card",
      tactic:tr?"Taktik değişikliği":"Tactical change",danger:tr?"Tehlikeli atak":"Dangerous attack"
    };
    return names[event&&event.type]||(tr?"Maç olayı":"Match event");
  }

  function scoreAt(record,index){
    const score=[0,0];
    const events=record.timeline||[];
    for(let cursor=0;cursor<=index&&cursor<events.length;cursor++){
      if(events[cursor].type==="goal")score[events[cursor].side==="B"?1:0]++;
    }
    return score;
  }

  function summary(record){
    const tr=global.LANG==="tr";
    const teams=record.teams||[tr?"Ev sahibi":"Home",tr?"Deplasman":"Away"];
    const events=record.timeline||[];
    const goals=events.filter(event=>event.type==="goal").length;
    const cards=events.filter(event=>event.type.includes("card")||event.type==="yellow").length;
    return tr
      ?`${teams[0]} ile ${teams[1]} arasındaki maç ${record.score[0]}–${record.score[1]} bitti. Zaman çizgisinde ${events.length} önemli olay, ${goals} gol ve ${cards} kart bulunuyor.`
      :`${teams[0]} versus ${teams[1]} finished ${record.score[0]}–${record.score[1]}. The timeline contains ${events.length} key events, ${goals} goals and ${cards} cards.`;
  }

  function renderFrame(){
    if(!viewer)return;
    const events=viewer.record.timeline||[];
    if(!events.length)return;
    viewer.index=((viewer.index%events.length)+events.length)%events.length;
    const event=events[viewer.index],tr=global.LANG==="tr",score=scoreAt(viewer.record,viewer.index);
    const minute=document.getElementById("finalReplayMinute");
    const label=document.getElementById("finalReplayEvent");
    const scoreEl=document.getElementById("finalReplayScore");
    const counter=document.getElementById("finalReplayCounter");
    const range=document.getElementById("finalReplayRange");
    const marker=document.getElementById("finalReplayMarker");
    if(minute)minute.textContent=`${event.minute}'`;
    if(label)label.textContent=eventText(event,tr);
    if(scoreEl)scoreEl.textContent=`${score[0]} – ${score[1]}`;
    if(counter)counter.textContent=`${viewer.index+1} / ${events.length}`;
    if(range){range.max=String(Math.max(0,events.length-1));range.value=String(viewer.index);}
    if(marker){
      marker.dataset.type=event.type;
      marker.style.left=`${clamp(event.x,0.04,0.96)*100}%`;
      marker.style.top=`${clamp(event.y,0.04,0.96)*100}%`;
    }
    const play=document.getElementById("finalReplayPlay");
    if(play){
      play.textContent=viewer.playing?(tr?"DURAKLAT":"PAUSE"):(tr?"OYNAT":"PLAY");
      play.setAttribute("aria-pressed",viewer.playing?"true":"false");
    }
  }

  function stopViewerTimer(){
    if(viewer&&viewer.timer){clearInterval(viewer.timer);viewer.timer=null;}
    if(viewer)viewer.playing=false;
  }

  function step(delta){
    if(!viewer||!(viewer.record.timeline||[]).length)return;
    stopViewerTimer();
    viewer.index+=Number(delta)||0;
    renderFrame();
  }

  function seek(value){
    if(!viewer)return;
    stopViewerTimer();
    viewer.index=Math.max(0,Math.round(Number(value)||0));
    renderFrame();
  }

  function togglePlay(){
    if(!viewer)return;
    if(viewer.playing){stopViewerTimer();renderFrame();return;}
    const events=viewer.record.timeline||[];
    if(!events.length)return;
    viewer.playing=true;
    viewer.timer=setInterval(()=>{
      if(!document.getElementById("finalReplayViewer")){closeViewer(false);return;}
      if(viewer.index>=events.length-1){stopViewerTimer();renderFrame();return;}
      viewer.index++;renderFrame();
    },1250);
    renderFrame();
  }

  function speakSummary(){
    if(!viewer||!("speechSynthesis" in global))return false;
    global.speechSynthesis.cancel();
    const utterance=new SpeechSynthesisUtterance(summary(viewer.record));
    utterance.lang=global.LANG==="tr"?"tr-TR":"en-US";
    global.speechSynthesis.speak(utterance);
    return true;
  }

  function openViewer(value){
    const recordValue=value||last();
    if(!recordValue)return false;
    const recordData={...recordValue,timeline:cleanEvents(recordValue.timeline||recordValue.events)};
    const events=recordData.timeline,tr=global.LANG==="tr";
    if(!events.length){
      if(typeof global.showToast==="function")global.showToast(tr?"Bu maç için görsel olay kaydı yok":"No visual event timeline is available for this match");
      return false;
    }
    closeViewer(false);
    viewer={record:recordData,index:0,playing:false,timer:null};
    const teams=recordData.teams||[tr?"Ev sahibi":"Home",tr?"Deplasman":"Away"];
    const label=tr?"Salt okunur maç tekrarı":"Read-only match replay";
    global.showModal(`<div class="final-replay-viewer" id="finalReplayViewer" role="region" aria-label="${label}" aria-describedby="finalReplaySummary"><header><div><span>${tr?"GERÇEK MAÇ TEKRARI":"MATCH REPLAY"}</span><b>${teams[0]} · ${teams[1]}</b></div><button type="button" class="btn btn-ghost" onclick="closeFinalMatchReplay()" aria-label="${tr?"Tekrarı kapat":"Close replay"}">×</button></header><p id="finalReplaySummary" class="final-replay-sr-summary">${summary(recordData)}</p><div class="final-replay-score"><span id="finalReplayMinute">0'</span><b id="finalReplayScore">0 – 0</b><span id="finalReplayCounter">1 / ${events.length}</span></div><div class="final-replay-pitch" aria-hidden="true"><i class="final-replay-half"></i><i class="final-replay-circle"></i><i id="finalReplayMarker" class="final-replay-marker"></i></div><div class="final-replay-current" id="finalReplayEvent" role="status" aria-live="polite"></div><input id="finalReplayRange" class="final-replay-range" type="range" min="0" max="${events.length-1}" value="0" aria-label="${tr?"Olay zaman çizgisi":"Event timeline"}" oninput="seekFinalMatchReplay(this.value)"><div class="final-replay-controls"><button type="button" class="btn btn-ghost" onclick="stepFinalMatchReplay(-1)" aria-label="${tr?"Önceki olay":"Previous event"}">←</button><button type="button" class="btn btn-primary" id="finalReplayPlay" aria-pressed="false" onclick="toggleFinalMatchReplay()">${tr?"OYNAT":"PLAY"}</button><button type="button" class="btn btn-ghost" onclick="stepFinalMatchReplay(1)" aria-label="${tr?"Sonraki olay":"Next event"}">→</button><button type="button" class="btn btn-ghost final-replay-speak" onclick="speakFinalMatchReplaySummary()">${tr?"SESLİ ÖZET":"AUDIO SUMMARY"}</button></div><small>${tr?"Salt okunur · ← → olaylar · Boşluk oynat/duraklat":"Read only · ← → events · Space plays/pauses"}</small></div>`,{label,bare:true,dismissOnOverlay:true});
    renderFrame();
    setTimeout(()=>document.getElementById("finalReplayPlay")?.focus(),40);
    return true;
  }

  function closeViewer(closeModalToo=true){
    stopViewerTimer();
    if("speechSynthesis" in global)global.speechSynthesis.cancel();
    viewer=null;
    if(closeModalToo&&typeof global.closeModal==="function")global.closeModal();
  }

  document.addEventListener("keydown",event=>{
    if(!viewer||!document.getElementById("finalReplayViewer"))return;
    if(event.target&&event.target.id==="finalReplayRange")return;
    if(event.key==="ArrowLeft"){event.preventDefault();step(-1);}
    else if(event.key==="ArrowRight"){event.preventDefault();step(1);}
    else if(event.key==="Home"){event.preventDefault();seek(0);}
    else if(event.key==="End"){event.preventDefault();seek((viewer.record.timeline||[]).length-1);}
    else if(event.key===" "){event.preventDefault();togglePlay();}
  });

  function clear(){try{global.localStorage.removeItem(KEY);}catch(_){}}

  global.CopaFinalReplay=Object.freeze({
    VERSION,KEY,record,last,copy,inspect,openImport,openViewer,closeViewer,summary,clear
  });
  global.copyFinalReplayCode=()=>copy();
  global.openFinalReplayImport=openImport;
  global.inspectFinalReplayInput=inspectInput;
  global.openFinalMatchReplay=()=>openViewer();
  global.openVerifiedFinalReplay=()=>openViewer(verifiedPreview);
  global.closeFinalMatchReplay=()=>closeViewer(true);
  global.stepFinalMatchReplay=step;
  global.seekFinalMatchReplay=seek;
  global.toggleFinalMatchReplay=togglePlay;
  global.speakFinalMatchReplaySummary=speakSummary;
})(window);
