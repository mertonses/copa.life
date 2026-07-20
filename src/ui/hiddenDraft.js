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

function outcomeInfo(player){
  const key=outcomeKey(player),copy={
    gem:{label:LT("CEVHER","GEM","JOYA","JUWEL","TALENTO"),desc:LT("Scout ekibi büyük bir değer yakaladı.","The scouting team found major value.","El equipo de scouting encontró un gran valor.","Das Scouting-Team hat großen Wert entdeckt.","Lo staff scout ha trovato un grande valore."),tone:"up"},
    fair:{label:LT("DENGELİ","FAIR VALUE","VALOR JUSTO","FAIRER WERT","VALORE EQUO"),desc:LT("Rapor ile saha değeri birbirine yakın çıktı.","The report and on-pitch value landed close together.","El informe y el valor en campo resultaron cercanos.","Bericht und Platzwert liegen nah beieinander.","Rapporto e valore in campo sono risultati vicini."),tone:""},
    bust:{label:LT("BALON","DUD","FIASCO","FLOP","BIDONE"),desc:LT("Menajer anlatısı saha değerinin önüne geçti.","The agent's pitch exceeded the on-pitch value.","El discurso del agente superó el valor en campo.","Die Aussagen des Beraters übertrafen den Platzwert.","Il racconto dell'agente ha superato il valore in campo."),tone:"down"}
  };
  return Object.assign({key:key},copy[key]);
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
  const legacy=player.hiddenTier==="gem"?"positive":player.hiddenTier==="bust"?"negative":"neutral";
  const note=typeof global.hiddenScoutNote==="function"?global.hiddenScoutNote(player.scoutSignal||legacy):global.L().ctxHidden;
  global.showModal(`<div class="bulletin hidden-player-confirm"><div class="bhead"><span>${LT("GİZLİ OYUNCU","MYSTERY PLAYER","JUGADOR MISTERIOSO","MYSTERY-SPIELER","GIOCATORE MISTERIOSO")}</span><span>€${player.price||0}M</span></div><div class="bhl">${LT("İmzala ve kimliğini aç","Sign and reveal","Ficha y revela","Verpflichten und enthüllen","Firma e rivela")}</div><div class="bbody">${note}</div><div class="beff down">${LT("Bu transfer açıldıktan sonra geri alınamaz.","This transfer cannot be undone after the reveal.","Este fichaje no se puede deshacer tras revelarlo.","Dieser Transfer kann nach der Enthüllung nicht rückgängig gemacht werden.","Questo trasferimento non può essere annullato dopo la rivelazione.")}</div><div class="bact"><button class="btn btn-primary" onclick="confirmHiddenChoice(${index})">${LT("İMZALA VE AÇ","SIGN & REVEAL","FICHAR Y REVELAR","VERPFLICHTEN & ÖFFNEN","FIRMA E RIVELA")}</button><button class="btn btn-ghost" onclick="closeModal()">${LT("VAZGEÇ","CANCEL","CANCELAR","ABBRECHEN","ANNULLA")}</button></div></div>`,{dismissOnOverlay:false,label:LT("Gizli oyuncu onayı","Mystery player confirmation","Confirmación del jugador misterioso","Mystery-Spieler bestätigen","Conferma giocatore misterioso")});
}

function showReveal(player){
  const info=outcomeInfo(player),trait=player.trait&&typeof TRAITS!=="undefined"&&TRAITS[player.trait]?` · ${L().trait[player.trait]||player.trait}`:"",pos=L().abbr[player.pos]||player.pos;
  global.showModal(`<div class="bulletin hidden-player-reveal"><div class="bhead"><span>${LT("SCOUT SONUCU","SCOUT RESULT","RESULTADO DEL SCOUT","SCOUT-ERGEBNIS","RISULTATO SCOUT")}</span><span>${info.label}</span></div><div class="bhl ${info.tone}">${player.name}</div><div class="bbody">${info.desc}</div><div class="beff ${info.tone}">${player.ov} ${LT("GÜÇ","POWER","POTENCIA","STÄRKE","FORZA")} · ${player.age||"—"} · ${pos}${trait}</div><div class="bact"><button class="btn btn-primary" onclick="continueAfterHiddenReveal()">${LT("DEVAM ET","CONTINUE","CONTINUAR","WEITER","CONTINUA")}</button></div></div>`,{dismissOnOverlay:false,label:LT("Gizli oyuncu açıldı","Mystery player revealed","Jugador misterioso revelado","Mystery-Spieler enthüllt","Giocatore misterioso rivelato")});
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
    if(!options.some(option=>option.price<=cap)){const fallback=fabPlayer(pos,55,61);fallback.price=Math.max(0,Math.min(cap,1));fallback.free=true;options[_draftWorstPublicIndex(options)]=fallback;}
    _trackHiddenOffer("auto",options);
    let affordable=options.filter(option=>canAffordCost((option.price||0)+reserve));
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
  setTimeout(()=>{if(reuseClub)reuseClub=false;showPostcard(enterHub);},350);
}

global.CopaHiddenDraft=Object.freeze({outcomeInfo,scoutNote,revealPlayer,requestChoose,showReveal,quickAll});
})(window);
