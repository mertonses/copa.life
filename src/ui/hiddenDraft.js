(function(global){
"use strict";

function outcomeKey(player){
  let key=player&&(player.hiddenOutcome||player.hiddenTier);
  if(key==="normal")key="fair";
  if(!["gem","fair","bust"].includes(key))key=typeof hiddenOutcomeFor==="function"?hiddenOutcomeFor(player):((Number(player&&player.ov)||0)>=79?"gem":(Number(player&&player.ov)||0)>=74?"fair":"bust");
  if(player){player.hiddenOutcome=key;player.hiddenTier=key;}
  return key;
}

function revealPlayer(player,source){
  if(!player||!player.hidden)return null;
  const signal=player.scoutSignal||"neutral",key=outcomeKey(player),origin=source||"manual";
  player.hidden=false;
  if(typeof trackHiddenDraftMetric==="function"){
    trackHiddenDraftMetric("selected",{source:origin,signal,late:deadlineH<=6});
    trackHiddenDraftMetric("revealed",{source:origin,outcome:key,late:deadlineH<=6});
  }
  const copy=L(),tag=key==="gem"?copy.cevher:(key==="bust"?copy.balon:copy.reveal);
  pushFeed(" <b>"+surOf(player)+"</b> "+tag+" "+player.ov,key==="gem"?"win":key==="bust"?"lose":"pres");
  return{key};
}

function scoutNote(signal){
  if(signal==="positive")return LT("Scout notu: tavanı yüksek, rapor kesin değil.","Scout note: high ceiling, but the report is not conclusive.","Nota del scout: techo alto, pero el informe no es concluyente.","Scout-Notiz: hohes Potenzial, aber der Bericht ist nicht eindeutig.","Nota scout: grande potenziale, ma il rapporto non è definitivo.");
  if(signal==="negative")return LT("Scout notu: menajer anlatısı veriden daha güçlü.","Scout note: the agent's pitch is stronger than the data.","Nota del scout: el discurso del agente supera a los datos.","Scout-Notiz: Die Aussagen des Beraters sind stärker als die Daten.","Nota scout: il racconto dell'agente è più forte dei dati.");
  return LT("Scout notu: veriler dengeli, sürpriz payı var.","Scout note: balanced data with room for a surprise.","Nota del scout: datos equilibrados, con margen para sorpresas.","Scout-Notiz: ausgeglichene Daten mit Überraschungspotenzial.","Nota scout: dati equilibrati, con margine per una sorpresa.");
}

function requestChoose(index){
  if(global.choose.locked||global.currentSlot<0||!Number.isInteger(index)||!global.currentOpts[index])return;
  const player=global.currentOpts[index];
  if(!player.hidden){global.choose(index);return;}
  global.choose(index,"manual");
}

function autoScore(option){
  return _draftPublicRating(option)+(option&&!option.hidden&&option.trait?0.7:0)-(Number(option&&option.price)||0)*1.25;
}
function quickAll(){
  const slider=$("autoFillSlider"),budgetTarget=slider?+slider.value:999,open=unfilled();
  open.forEach(index=>{
    if(deadlineH>2)deadlineH-=2;
    const pos=slots[index][0],reserve=Math.max(0,(remaining-1)*0.6),debtLimit=typeof activeDebtLimit==="function"?activeDebtLimit():DEBT_LIMIT,cap=(budget+(typeof legacySpendable==="function"?legacySpendable():0))-reserve-debtLimit;
    let options=draftOptions(pos);
    if(!options.some(option=>typeof canAffordChairmanSpend==="function"?canAffordChairmanSpend(option.price||0,"transfer",Object.assign({},option,{reserve})):option.price<=cap)){const fallback=fabPlayer(pos,55,61);fallback.price=0;fallback.free=true;options[_draftWorstPublicIndex(options)]=fallback;}
    _trackHiddenOffer("auto",options);
    let affordable=options.filter(option=>typeof canAffordChairmanSpend==="function"?canAffordChairmanSpend(option.price||0,"transfer",Object.assign({},option,{reserve})):canAffordCost((option.price||0)+reserve));
    if(!affordable.length){const fallback=fabPlayer(pos,55,61);fallback.price=0;fallback.free=true;affordable=[fallback];}
    const targeted=affordable.filter(option=>(option.price||0)<=budgetTarget),pool=targeted.length?targeted:affordable,player=pool.reduce((best,option)=>autoScore(option)>autoScore(best)?option:best,pool[0]);
    if(player.hidden)revealPlayer(player,"auto");
    if(!player.fab)usedNames.add(player.name);
    fillSlot(index,player);
  });
  currentSlot=-1;currentOpts=[];
  const pitch=$("pitch");if(pitch)_drawConnectors(pitch);
  renderDraftExtra();updateDeadline();sfxRoll();_saveState();
  if(!hasCompleteStartingXI()){loadRollStage();return;}
  buildBench();$("ddbanner").classList.add("hidden");
  setTimeout(()=>{if(reuseClub)reuseClub=false;showPostcard(typeof tournamentFormat!=="undefined"&&tournamentFormat==="groups16_v1"&&typeof startTournamentDraw==="function"?startTournamentDraw:enterHub);},350);
}

global.CopaHiddenDraft=Object.freeze({scoutNote,revealPlayer,requestChoose,quickAll});
})(window);
