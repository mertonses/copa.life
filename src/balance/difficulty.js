/* Risk/odul draftlari ve tur ici zorluk carpanlari. */
function maybeDraftEvent(){if(round<2||round>5||eventSeen[round]||runEnded)return;eventSeen[round]=1;if(rand()>0.75)return;setTimeout(showDraftEvent,260);}

function applyRiskDraftCarryovers(){
  if(round<=1)return;
  const tr=LANG==="tr";
  if(draftFatigueTurns>0){
    draftFatigueTurns--;
    riskPowerMod-=2;
    pushFeed("⚡ "+(tr?"Tam Saha Baskı yorgunluğu: -2 güç":"Full Press fatigue: -2 power"),"lose");
  }
  if(draftDebtTurns>0){
    draftDebtTurns--;
    riskPowerMod-=2;
    pushFeed("🎲 "+(tr?"Kupaya Senet bedeli: -2 güç":"Cup IOU debt: -2 power"),"lose");
  }
}

function _riskValueHTML(value,cls){
  const tone=cls==="risk-offer-gain"?"good":((cls==="risk-offer-cost"||cls==="risk-offer-risk")?"bad":"neutral");
  return String(value).replace(/(%\d+(?:[.,]\d+)?|[+\-−]?\s?€?\d+(?:[.,]\d+)?M?|[+\-−]\d+)/g,`<span class="risk-num risk-num-${tone}">$1</span>`);
}

function _riskDraftLine(label,value,cls){
  return `<div class="risk-offer-line ${cls||""}"><span>${label}</span><b>${_riskValueHTML(value,cls)}</b></div>`;
}

function _riskOfferHTML(o,i){
  const onclick=o.skip?"pickDraftEvent(-1)":"pickDraftEvent("+i+")";
  return `<button type="button" class="risk-offer ${o.skip?"risk-offer-safe":""}" style="--risk-accent:${o.c}" onclick="${onclick}">
    <span class="risk-offer-icon">${o.i}</span>
    <span class="risk-offer-copy">
      <span class="risk-offer-head"><b>${o.n}</b></span>
      ${o.lines.map(x=>_riskDraftLine(x[0],x[1],x[2])).join("")}
    </span>
  </button>`;
}

function _decisionIcon(name){
  const icons={
    press:`<svg class="decision-ico" viewBox="0 0 32 32" aria-hidden="true"><path class="ico-fill" d="M8 20h16l-8 7-8-7Z"/><path d="M6 22c5.5-.5 9.5-3 12-7"/><path d="M18 15h-5"/><path d="M18 15v5"/><path d="M14 8c3 1 5.5 3 7 6"/><path d="M22 8l2-3 2 3 3 1-3 1-2 3-2-3-3-1 3-1Z"/><circle cx="8" cy="23" r="2.2"/><circle cx="24" cy="23" r="2.2"/></svg>`,
    envelope:`<svg class="decision-ico" viewBox="0 0 32 32" aria-hidden="true"><path class="ico-fill" d="M5 10h22v15H5z"/><rect x="5" y="10" width="22" height="15" rx="3"/><path d="M6.5 12l9.5 7 9.5-7"/><path d="M6.5 24l7-6"/><path d="M25.5 24l-7-6"/><circle cx="22" cy="20" r="3.2"/><path d="M22 18.2v3.6M20.5 19.7h3"/></svg>`,
    contract:`<svg class="decision-ico" viewBox="0 0 32 32" aria-hidden="true"><path class="ico-fill" d="M8 4h14l4 5v19H8z"/><path d="M8 4h14l4 5v19H8z"/><path d="M22 4v5h4"/><path d="M13 13h8"/><path d="M13 24c3-3 6 2 9-2"/><path d="M14 18h5"/><path d="M19.5 16.5h3v2.5c0 2.2-1.4 3.8-3 4.4-1.6-.6-3-2.2-3-4.4v-2.5h3Z"/></svg>`,
    grit:`<svg class="decision-ico" viewBox="0 0 32 32" aria-hidden="true"><path class="ico-fill" d="M8 14h15c2 0 4 2 4 5 0 5-4 8-10 8H9z"/><path d="M8 14V9a2.5 2.5 0 0 1 5 0v5"/><path d="M13 14V7a2.5 2.5 0 0 1 5 0v7"/><path d="M18 14V9a2.5 2.5 0 0 1 5 0v7"/><path d="M23 16h1.5c2.5 0 4.5 2 4.5 4.6C29 25 25 28 18 28H9c-2.5-2.4-3.5-5.2-3-9l2-5"/><path d="M10 21h12"/><path d="M12 24h8"/></svg>`,
    hold:`<svg class="decision-ico" viewBox="0 0 32 32" aria-hidden="true"><path class="ico-fill" d="M8 16h16v5c0 5-3 8-8 8s-8-3-8-8z"/><path d="M8 17V8a2.4 2.4 0 0 1 4.8 0v7"/><path d="M12.8 14V6.5a2.4 2.4 0 0 1 4.8 0V15"/><path d="M17.6 15V8a2.4 2.4 0 0 1 4.8 0v8"/><path d="M22.4 16v-4a2.4 2.4 0 0 1 4.8 0v7c0 5.5-4.2 9-10 9H16c-5 0-8-3.2-8-8v-3"/><path d="M4 7c2-2 4-2 6 0"/><path d="M4 11c2-2 4-2 6 0"/></svg>`
  };
  return icons[name]||"";
}

function showDraftEvent(){
 if($("hub").classList.contains("hidden"))return;const tr=LANG==="tr";
 const _bolt=_decisionIcon("press"),_case=_decisionIcon("envelope"),_dice=_decisionIcon("contract"),_band=_decisionIcon("grit"),_hand=_decisionIcon("hold");
 const gain=tr?"Kazanç":"Gain",cost=tr?"Bedel":"Cost",risk=tr?"Risk":"Risk",note=tr?"Not":"Note";
 const opts=[
  {i:_bolt,c:"#f59e0b",n:tr?"Tam Saha Baskı":"Full Press",badge:tr?"RİSKLİ":"RISKY",lines:[[gain,tr?"Bu maç +6 güç":"This match +6 power","risk-offer-gain"],[cost,tr?"-€8M, sonraki maç -2 güç":"-€8M, next match -2 power","risk-offer-cost"]],go:()=>{riskPowerMod+=6;spend(8,"spent");draftFatigueTurns=Math.max(draftFatigueTurns,1);pushFeed("⚡ "+(tr?"Tam Saha Baskı: +6 güç, sonraki maç -2":"Full Press: +6 power, next match -2"),"pres");}},
  {i:_case,c:"#16a34a",n:tr?"Kapalı Zarf":"Sealed Envelope",badge:tr?"KUMAR":"GAMBLE",lines:[[gain,tr?"+€16M hemen":"Immediate +€16M","risk-offer-gain"],[risk,tr?"%30 ihtimal -€12M geri ödeme":"30% chance -€12M clawback","risk-offer-risk"]],go:()=>{earn(16,"earned");let msg="💼 "+(tr?"Kapalı Zarf: +€16M":"Sealed Envelope: +€16M");if(rand()<0.30){spend(12,"spent");msg+=(tr?", geri ödeme -€12M":", clawback -€12M");}pushFeed(msg,"buy");}},
  {i:_dice,c:"#7c3aed",n:tr?"Kupaya Senet":"Cup IOU",badge:tr?"FİNAL BORCU":"FINAL DEBT",lines:[[gain,tr?"+€8M ve bu maç +3 güç":"+€8M and this match +3 power","risk-offer-gain"],[cost,tr?"Sonraki 2 maç -2, finalde -4":"Next 2 matches -2, final -4","risk-offer-cost"]],go:()=>{earn(8,"earned");riskPowerMod+=3;draftDebtTurns=Math.max(draftDebtTurns,2);finalPenalty=Math.min(FINAL_DEBT_CAP,finalPenalty+4);pushFeed("🎲 "+(tr?"Kupaya Senet: +€8M, +3 güç, final -4":"Cup IOU: +€8M, +3 power, final -4"),"pres");}},
  {i:_band,c:"#dc2626",n:tr?"Dişini Sık":"Grit Your Teeth",badge:tr?"SAKATLIK":"INJURY",lines:[[gain,tr?"Bu maç +5 güç":"This match +5 power","risk-offer-gain"],[risk,tr?"Maç sonu %35 sakatlık riski":"35% post-match injury risk","risk-offer-risk"]],go:()=>{riskPowerMod+=5;draftPendingInjury=1;pushFeed("🩹 "+(tr?"Dişini Sık: +5 güç, maç sonu risk":"Grit Your Teeth: +5 power, post-match risk"),"pres");}},
  {i:_hand,c:"#496E71",n:tr?"Planı Bozma":"Hold the Plan",badge:tr?"GÜVENLİ":"SAFE",skip:true,lines:[[gain,tr?"Başkan güveni +1":"Chairman trust +1","risk-offer-gain"],[note,tr?"Risk alma, mevcut düzeni koru":"Take no risk, keep the plan","risk-offer-note"]],go:()=>{chairTrust=Math.min(3,chairTrust+1);pushFeed("✋ "+(tr?"Planı Bozma: başkan güveni +1":"Hold the Plan: chairman trust +1"),"pres");}}
 ];
 let h=`<div class="riskdraft-modal"><div class="kithdr">${tr?"RİSKLİ TEKLİFLER":"RISKY OFFERS"}</div><div class="kitsub">${tr?"Büyük kazanç, gerçek bedel. Gerek yoksa pas geç.":"Big upside, real cost. Skip if you do not need it."}</div><div class="risk-offer-list">`;
 opts.forEach((o,i)=>{h+=_riskOfferHTML(o,i);});
 h+="</div></div>";
 window._draftEvents=opts;showModal(h,{dismissOnOverlay:true,label:tr?"Riskli teklifler":"Risky offers"});
}
function pickDraftEvent(i){const o=i<0?(window._draftEvents&&window._draftEvents.find(x=>x.skip)):(window._draftEvents&&window._draftEvents[i]);if(!o)return;closeModal();o.go();sfxStamp();setBudget();renderHub();showToast(o.n,{type:o.skip?"default":"default"});}
