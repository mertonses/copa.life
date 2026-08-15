/* Premium cash counter driven only by committed economy transactions. */
(function(root){
  "use strict";
  let latest=null,lastHapticAt=0;
  const consumed=new Set(),audioSeen=new Set(),history=[];
  const roundHalf=value=>Math.round((Number(value)||0)*2)/2;
  const format=value=>{const rounded=roundHalf(value);return Number.isInteger(rounded)?String(Math.abs(rounded)):Math.abs(rounded).toFixed(1);};
  const reduced=()=>!!(document.body.classList.contains("reduced-motion")||(root.matchMedia&&root.matchMedia("(prefers-reduced-motion: reduce)").matches));
  const labels={
    tr:{cash:"Kasa",spent:"Transfer",president:"Başkan kararı",earned:"Kulüp geliri",yan_saha:"Risk Kulvarı",yanSahaPayout:"Risk Kulvarı dönüşü",undo:"Transfer geri alındı",care:"Sağlık ekibi",default:"Kasa işlemi",legacy:"Miras kasa",legacyShort:"MİRAS"},
    en:{cash:"Cash",spent:"Transfer",president:"Chairman decision",earned:"Club income",yan_saha:"Side Field",yanSahaPayout:"Side Field return",undo:"Transfer undone",care:"Medical team",default:"Cash transaction",legacy:"Legacy vault",legacyShort:"LEGACY"},
    es:{cash:"Caja",spent:"Fichaje",president:"Decisión presidencial",earned:"Ingreso del club",yan_saha:"Campo Lateral",yanSahaPayout:"Retorno de Campo Lateral",undo:"Fichaje deshecho",care:"Equipo médico",default:"Movimiento de caja",legacy:"Caja legado",legacyShort:"LEGADO"},
    de:{cash:"Kasse",spent:"Transfer",president:"Präsidentenentscheid",earned:"Clubeinnahme",yan_saha:"Nebenplatz",yanSahaPayout:"Nebenplatz-Rückkehr",undo:"Transfer rückgängig",care:"Medizinteam",default:"Kassenvorgang",legacy:"Vermächtniskasse",legacyShort:"ERBE"},
    it:{cash:"Cassa",spent:"Trasferimento",president:"Decisione del presidente",earned:"Entrata del club",yan_saha:"Campo Laterale",yanSahaPayout:"Ritorno Campo Laterale",undo:"Trasferimento annullato",care:"Staff medico",default:"Movimento di cassa",legacy:"Cassa eredità",legacyShort:"EREDITÀ"}
  };
  const copy=()=>labels[root.LANG]||labels.en;
  const sourceLabel=tx=>copy()[tx&&tx.tag]||copy().default;
  function digitMarkup(before,after,direction,animate){
    const oldDigits=format(before).replace(".",""),newText=format(after),newDigits=newText.replace(".",""),oldPadded=oldDigits.padStart(newDigits.length,"0").slice(-newDigits.length);let digitIndex=0;
    return [...newText].map(character=>{
      if(character===".")return '<span class="cash-punctuation">.</span>';
      const previous=oldPadded[digitIndex++]||"0";
      if(!animate||character===previous)return `<span class="cash-digit is-static"><span>${character}</span></span>`;
      return `<span class="cash-digit is-rolling is-${direction}"><span class="cash-digit-current">${character}</span><span class="cash-digit-ghost">${previous}</span></span>`;
    }).join("");
  }
  function legacyMarkup(value){const legacy=Math.max(0,roundHalf(value));return legacy?`<span class="legacy-cash-chip cash-legacy-inline" aria-label="${copy().legacy} €${format(legacy)}M"><small>${copy().legacyShort}</small><b>+€${format(legacy)}M</b></span>`:"";}
  function deltaMarkup(tx){
    if(!tx)return"";const delta=roundHalf(tx.delta),legacy=roundHalf(tx.legacy),direction=delta>0||delta===0&&tx.kind==="income"?"gain":delta<0||legacy>0?"loss":"neutral",shown=delta!==0?Math.abs(delta):legacy;
    if(!shown)return"";const sign=direction==="gain"?"+":"−",source=sourceLabel(tx);
    return `<span class="cash-delta-toast is-${direction}" data-cash-source="${String(tx.tag||tx.kind||"")}"><b>${sign}€${format(shown)}M</b><small>${source}</small></span>`;
  }
  function render(target,value,options){
    if(!target)return;const settings=options||{},next=roundHalf(value),legacy=Math.max(0,roundHalf(settings.legacy)),targetKey=target.id||String(settings.target||"cash"),tx=latest&&roundHalf(latest.after)===next?latest:null,consumeKey=tx?`${tx.transactionId}|${targetKey}`:"";
    if(tx&&target.dataset.cashTransaction===tx.transactionId&&Number(target.dataset.cashLegacy||0)===legacy)return;
    const canAnimate=!!(tx&&!consumed.has(consumeKey)&&roundHalf(tx.before)!==next&&!reduced()),previous=tx?roundHalf(tx.before):(target.dataset.cashValue==null?next:roundHalf(target.dataset.cashValue)),direction=next>=previous?"up":"down",negative=next<0;
    target.classList.add("cash-display-host");
    target.innerHTML=`<span class="cash-display ${canAnimate?`is-rolling is-${direction}`:""}" role="status" aria-live="polite" aria-label="${copy().cash} ${negative?"−":""}€${format(next)}M"><span class="cash-sign">${negative?"−":""}</span><span class="cash-currency">€</span><span class="cash-reels" aria-hidden="true">${digitMarkup(previous,next,direction,canAnimate)}</span><span class="cash-unit">M</span></span>${legacyMarkup(legacy)}`;
    target.dataset.cashValue=String(next);target.dataset.cashLegacy=String(legacy);target.dataset.cashTransaction=tx?tx.transactionId:"";(target.closest(".kasa-card")||target.closest(".budget"))?.classList.add("cash-premium");
    if(canAnimate){const transactionId=tx.transactionId;root.setTimeout(()=>{if(target.isConnected&&target.dataset.cashTransaction===transactionId){target.dataset.cashTransaction="";render(target,next,settings);}},520);}
    if(tx&&!consumed.has(consumeKey)){
      consumed.add(consumeKey);const card=target.closest(".kasa-card")||target.closest(".budget");
      if(card){const gain=roundHalf(tx.delta)>0||roundHalf(tx.delta)===0&&tx.kind==="income",isKasa=card.classList.contains("kasa-card");card.querySelector(".cash-delta-toast")?.remove();if(!isKasa)card.insertAdjacentHTML("beforeend",deltaMarkup(tx));card.classList.remove("cash-gain","cash-loss","cash-debt-cross");void card.offsetWidth;card.classList.add(gain?"cash-gain":"cash-loss");if(Number(tx.before)>=0&&Number(tx.after)<0)card.classList.add("cash-debt-cross");root.setTimeout(()=>{card.classList.remove("cash-gain","cash-loss","cash-debt-cross");card.querySelector(".cash-delta-toast")?.remove();},1250);}
    }
  }
  function onTransaction(event){
    const tx=event&&event.detail;if(!tx||!tx.transactionId||audioSeen.has(tx.transactionId))return;latest={...tx,before:roundHalf(tx.before),after:roundHalf(tx.after),delta:roundHalf(tx.delta),legacy:roundHalf(tx.legacy)};audioSeen.add(tx.transactionId);history.push(latest);if(history.length>24)history.shift();
    if(typeof root.sfxCashTransaction==="function")root.sfxCashTransaction(latest);
    const now=performance.now();if(now-lastHapticAt>140&&root.CopaMobileExperience&&typeof root.CopaMobileExperience.haptic==="function"){lastHapticAt=now;const magnitude=Math.max(Math.abs(latest.delta),latest.legacy||0),crossed=Number(latest.before)>=0&&Number(latest.after)<0;root.CopaMobileExperience.haptic(crossed?[22,28,22]:magnitude>=10?[14,22]:8);}
    root.setBudget?.();
  }
  function sync(value){latest=null;for(const target of document.querySelectorAll(".cash-display-host")){target.dataset.cashTransaction="";target.dataset.cashValue=String(roundHalf(value));}}
  root.addEventListener("copa:cash-transaction",onTransaction);
  root.CopaCashDisplay=Object.freeze({render,sync,format,sourceLabel,recentTransactions:()=>history.map(item=>({...item})),lastTransaction:()=>latest&&({...latest})});
  root.setBudget?.();
})(window);
