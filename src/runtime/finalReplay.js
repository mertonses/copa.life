/* Local final replay/audit record. Share codes contain only model inputs. */
(function(global){
  "use strict";
  const VERSION=2;
  const KEY="copa_final_replay_v2";
  const finite=value=>Number.isFinite(Number(value));
  const pair=value=>Array.isArray(value)&&value.length===2?value.map(item=>Number(item)||0):[0,0];
  function cleanAudit(value){
    const source=value&&typeof value==="object"?value:{};
    const numbers=[
      "wide","central","recycle","longBall","counter","overlapRuns","cutbacks","crosses",
      "throughBalls","longPasses","backPasses","pressWins","discipline","buildFromBack",
      "setPieces","gkShortStarts","centralTriangles","lowTempoBeats","resets",
      "finalPressureEvents","plannedSequences","reweightedSequences"
    ];
    return Object.fromEntries(numbers.map(key=>[key,Math.max(0,Math.round(Number(source[key])||0))]));
  }
  function validate(value){
    return !!value&&value.v===VERSION&&typeof value.modelVersion==="string"&&
      typeof value.code==="string"&&value.code.length<2300&&finite(value.savedAt)&&
      Array.isArray(value.score)&&value.score.length===2&&value.stats&&typeof value.stats==="object";
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
      stats:{
        shots:pair(source.stats&&source.stats.shots),
        saves:pair(source.stats&&source.stats.saves),
        xg:pair(source.stats&&source.stats.xg).map(item=>Math.round(item*1000)/1000),
        yellow:pair(source.stats&&(source.stats.yellow||source.stats.yellows)),
        red:pair(source.stats&&(source.stats.red||source.stats.reds))
      },
      audit:cleanAudit(source.audit),
      events:(Array.isArray(source.events)?source.events:[]).slice(0,40).map(event=>({
        minute:Math.max(0,Math.min(120,Math.round(Number(event&&event.minute)||0))),
        type:String(event&&event.type||"event").replace(/[^a-z_]/g,"").slice(0,20),
        side:event&&event.side==="B"?"B":"A"
      }))
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
        const area=document.createElement("textarea");area.value=text;area.setAttribute("readonly","");area.style.position="fixed";area.style.opacity="0";
        document.body.appendChild(area);area.select();document.execCommand("copy");area.remove();
      }
      if(typeof global.showToast==="function")global.showToast(global.LANG==="tr"?"Final tekrar kodu kopyalandı":"Final replay code copied");
      return true;
    }catch(_){return false;}
  }
  function importDialog(){
    const tr=global.LANG==="tr";
    global.showModal(`<div class="scoutmodal"><h4>${tr?"Final tekrar kodu":"Final replay code"}</h4><p>${tr?"Paylaşılan CFS2 kodunu yapıştır. Kod yalnız simülasyon girdilerini içerir.":"Paste a shared CFS2 code. It contains simulation inputs only."}</p><textarea id="finalReplayImportValue" maxlength="2300" spellcheck="false" style="width:100%;min-height:116px;resize:vertical;border:1px solid var(--border-subtle);border-radius:7px;background:var(--surface-muted);color:var(--color-ink);font:10px/1.45 var(--mono);padding:9px"></textarea><div class="bact"><button class="btn btn-primary" type="button" onclick="inspectFinalReplayInput()">${tr?"TEKRARI DOĞRULA":"VERIFY REPLAY"}</button><button class="btn btn-ghost" type="button" onclick="closeModal()">${tr?"KAPAT":"CLOSE"}</button></div></div>`,{label:tr?"Final tekrar kodu":"Final replay code"});
    setTimeout(()=>document.getElementById("finalReplayImportValue")?.focus(),30);
  }
  function openImport(){
    const ready=global.CopaFinalSimCore
      ?Promise.resolve()
      :(global.CopaLazy&&global.CopaLazy.ensureFinalSim?global.CopaLazy.ensureFinalSim():Promise.reject(new Error("core_unavailable")));
    ready.then(importDialog).catch(()=>{if(typeof global.showToast==="function")global.showToast(global.LANG==="tr"?"Final çekirdeği yüklenemedi":"Final core could not load");});
  }
  function inspect(code){
    const core=global.CopaFinalSimCore;
    const match=core&&core.replay(String(code||"").trim());
    if(!match)return null;
    return match;
  }
  function inspectInput(){
    const input=document.getElementById("finalReplayImportValue");
    const match=inspect(input&&input.value);
    const tr=global.LANG==="tr";
    if(!match){if(typeof global.showToast==="function")global.showToast(tr?"Kod geçersiz veya sürümü uyumsuz":"Code is invalid or incompatible");return false;}
    const end=match.penalties?(tr?"Penaltılar":"Penalties"):match.goldenGoal?(tr?"Altın gol":"Golden goal"):(tr?"Normal süre":"Regulation");
    global.showModal(`<div class="scoutmodal"><h4>${tr?"Doğrulanmış final tekrarı":"Verified final replay"}</h4><div class="pbreak"><div class="pbr"><span>${tr?"Model":"Model"}</span><b>${match.model_version}</b></div><div class="pbr"><span>${tr?"Skor":"Score"}</span><b>${match.score[0]}–${match.score[1]}</b></div><div class="pbr"><span>${tr?"Bitiş":"Finish"}</span><b>${end}</b></div><div class="pbr"><span>${tr?"Şut":"Shots"}</span><b>${match.stats.shots[0]}–${match.stats.shots[1]}</b></div><div class="pbr"><span>xG</span><b>${match.stats.xg[0].toFixed(2)}–${match.stats.xg[1].toFixed(2)}</b></div><div class="pbr"><span>${tr?"Kart":"Cards"}</span><b>${match.stats.yellow[0]+match.stats.red[0]}–${match.stats.yellow[1]+match.stats.red[1]}</b></div></div><div class="bact"><button class="btn btn-ghost" type="button" onclick="closeModal()">${tr?"KAPAT":"CLOSE"}</button></div></div>`,{label:tr?"Final tekrar sonucu":"Final replay result"});
    return true;
  }
  function clear(){try{global.localStorage.removeItem(KEY);}catch(_){}}
  global.CopaFinalReplay=Object.freeze({VERSION,KEY,record,last,copy,inspect,openImport,clear});
  global.copyFinalReplayCode=()=>copy();
  global.openFinalReplayImport=openImport;
  global.inspectFinalReplayInput=inspectInput;
})(window);
