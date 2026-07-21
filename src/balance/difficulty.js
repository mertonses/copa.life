/* Risk/odul draftlari ve tur ici zorluk carpanlari. */
function maybeDraftEvent(){if(round<2||round>5||eventSeen[round]||runEnded)return;eventSeen[round]=1;if(rand()>0.75)return;const scheduledRound=round;setTimeout(()=>showDraftEvent(scheduledRound),260);}

function applyRiskDraftCarryovers(){
  if(round<=1)return;
  const tr=LANG==="tr";
  if(draftFatigueTurns>0){
    draftFatigueTurns--;
    riskPowerMod-=2;
    pushFeed("⚡ "+(tr?"Vadeli Kudret bedeli: -2 güç":"Deferred Might cost: -2 power"),"lose");
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
  return `<button type="button" class="risk-offer risk-offer-${o.id} ${o.skip?"risk-offer-safe":""}" style="--risk-accent:${o.c};--risk-secondary:${o.c2}" onclick="${onclick}">
    <span class="risk-offer-icon">${o.i}</span>
    <span class="risk-offer-copy">
      <span class="risk-offer-head"><b>${o.n}</b></span>
      ${o.lines.map(x=>_riskDraftLine(x[0],x[1],x[2])).join("")}
    </span>
  </button>`;
}

function _riskOfferIcon(name){
  const common=`class="risk-svg risk-svg-${name}" viewBox="0 0 48 48" aria-hidden="true" focusable="false"`;
  const icons={
    power:`<svg ${common}>
      <circle class="risk-icon-orbit" cx="24" cy="24" r="19"/>
      <path class="risk-icon-secondary risk-clock" d="M13.5 14.5A15 15 0 0 0 11 31.3M34.5 33.5A15 15 0 0 0 37 16.7"/>
      <path class="risk-clock-hand" d="M24 8v5M24 35v5M8 24h5M35 24h5"/>
      <path class="risk-bolt" d="M27.8 8.5 15.7 26h7l-2.5 13.5L32.3 22h-7z"/>
      <path class="risk-spark risk-spark-a" d="m37 10 2-2M39 14h3"/>
      <path class="risk-spark risk-spark-b" d="m9 35-2 2M9 31H6"/>
    </svg>`,
    fortune:`<svg ${common}>
      <path class="risk-icon-orbit risk-icon-secondary" d="M8.5 27.5A16 16 0 0 1 34 13.2"/>
      <path class="risk-icon-orbit" d="M39.5 20.5A16 16 0 0 1 14 34.8"/>
      <path class="risk-arrow risk-icon-secondary" d="m31.5 9.5 3 3.7-4.7.8M16.5 38.5l-3-3.7 4.7-.8"/>
      <g class="risk-coin">
        <circle cx="24" cy="24" r="10.5"/>
        <path class="risk-icon-fill" d="M24 16.5c4.1 0 7.5 3.4 7.5 7.5s-3.4 7.5-7.5 7.5-7.5-3.4-7.5-7.5 3.4-7.5 7.5-7.5Z"/>
        <path d="M27.7 20.2c-1-1.7-6.6-1.4-6.6 1.6 0 3.2 6.2 1.2 6.2 4.4 0 3-5.8 3.1-7 .8M24 17.5v13"/>
      </g>
      <circle class="risk-chance-dot risk-dot-a" cx="39" cy="30" r="1.4"/>
      <circle class="risk-chance-dot risk-dot-b" cx="36" cy="35" r="1.4"/>
      <circle class="risk-chance-dot risk-dot-c" cx="31" cy="39" r="1.4"/>
    </svg>`,
    contract:`<svg ${common}>
      <path class="risk-paper" d="M12 7.5h17l7 7V40H12z"/>
      <path class="risk-icon-fill" d="M14.5 10h13.4l5.6 5.6v21.9h-19z"/>
      <path class="risk-icon-secondary" d="M29 7.5v7h7M17 19h9M17 24h7"/>
      <path class="risk-signature" d="M17 33c3.4-5.5 5.8 4.7 9-1.2 1.2-2.2 2.2.8 4.8-.5"/>
      <g class="risk-trophy">
        <path d="M27 19h8v4.5c0 4.5-2.3 7.5-6 8.7-3.7-1.2-6-4.2-6-8.7V19z"/>
        <path class="risk-icon-secondary" d="M23 21h-3v1.2c0 2.1 1.4 3.8 3.4 4.2M35 21h3v1.2c0 2.1-1.4 3.8-3.4 4.2M29 32.3V36M25.5 36h7"/>
        <path class="risk-cup-star risk-icon-secondary" d="m29 21.3.8 1.6 1.8.3-1.3 1.3.3 1.8-1.6-.9-1.6.9.3-1.8-1.3-1.3 1.8-.3z"/>
      </g>
    </svg>`,
    grit:`<svg ${common}>
      <path class="risk-pulse risk-icon-secondary" d="M5.5 13h7l2.2-4.5 3.7 9 3-6 2 4H31"/>
      <g class="risk-fist">
        <path class="risk-icon-fill" d="M11 24h24.5v8.2c0 6-4.6 10.3-11.3 10.3h-5.7C12.8 39 10 33.7 11 24Z"/>
        <path d="M11.5 27V16.5a3 3 0 0 1 6 0V27M17.5 25V13.5a3 3 0 0 1 6 0V25M23.5 25V15a3 3 0 0 1 6 0v11M29.5 25v-6.5a3 3 0 0 1 6 0v11.8c0 7-4.5 12.2-11.3 12.2h-5.7C13.4 39.4 10.2 34 11 27"/>
        <path class="risk-icon-secondary" d="M15 31h15M17 35h10"/>
      </g>
      <path class="risk-impact risk-icon-secondary" d="m38 12 3-3M39.5 17H44M35 9V4.5"/>
    </svg>`,
    safe:`<svg ${common}>
      <path class="risk-shield risk-icon-fill" d="M24 5.5 38 11v10.5c0 9.2-5.2 16.3-14 21-8.8-4.7-14-11.8-14-21V11z"/>
      <path class="risk-shield" d="M24 5.5 38 11v10.5c0 9.2-5.2 16.3-14 21-8.8-4.7-14-11.8-14-21V11z"/>
      <path class="risk-safe-route risk-icon-secondary" d="M15 23.5h12.5M23.5 18l5.5 5.5-5.5 5.5"/>
      <path class="risk-check" d="m16 33 4 4 10-11"/>
      <circle class="risk-safe-dot risk-icon-secondary" cx="15" cy="23.5" r="2"/>
    </svg>`
  };
  return icons[name]||"";
}

function _decisionIcon(name){
  const icons={
    press:`<svg class="decision-ico" viewBox="0 0 32 32" aria-hidden="true"><path class="ico-fill" d="M6 7h20v18H6z"/><rect x="5" y="7" width="22" height="18" rx="2"/><path d="M16 7v18"/><circle cx="16" cy="16" r="3.2"/><circle cx="10" cy="12" r="1.7"/><circle cx="10" cy="20" r="1.7"/><circle cx="22" cy="12" r="1.7"/><circle cx="22" cy="20" r="1.7"/><path d="M8 12h6"/><path d="M14 12l-2-2M14 12l-2 2"/><path d="M24 20h-6"/><path d="M18 20l2-2M18 20l2 2"/><path d="M16 5v-2M16 29v-2"/></svg>`,
    envelope:`<svg class="decision-ico" viewBox="0 0 32 32" aria-hidden="true"><path class="ico-fill" d="M5 9h22v16H5z"/><rect x="5" y="9" width="22" height="16" rx="3"/><path d="M6.5 11.5L16 18.5l9.5-7"/><path d="M7 24l7-6"/><path d="M25 24l-7-6"/><circle cx="23" cy="21" r="4"/><path d="M23 18.8v4.4"/><path d="M21.4 20.2h2.8a1.2 1.2 0 0 1 0 2.4h-2.8"/></svg>`,
    contract:`<svg class="decision-ico" viewBox="0 0 32 32" aria-hidden="true"><path class="ico-fill" d="M7 4h15l4 5v19H7z"/><path d="M7 4h15l4 5v19H7z"/><path d="M22 4v5h4"/><path d="M11 13h8"/><path d="M11 17h6"/><path d="M11 24c2.7-3 5.5 2 8.3-1.5"/><path d="M22 17h3v2.2c0 2.1-1.4 3.8-3 4.5-1.6-.7-3-2.4-3-4.5V17h3Z"/><path d="M21 13.5l1-2 1 2 2 .7-2 .8-1 2-1-2-2-.8z"/></svg>`,
    grit:`<svg class="decision-ico" viewBox="0 0 32 32" aria-hidden="true"><path class="ico-fill" d="M8 14h15c2.5 0 5 2.3 5 6.2C28 25 24 28 17 28H9c-2.5-2.3-3.6-5.3-3-9z"/><path d="M8 15V9.5a2.4 2.4 0 0 1 4.8 0V15"/><path d="M12.8 15V7a2.4 2.4 0 0 1 4.8 0v8"/><path d="M17.6 15V9.5a2.4 2.4 0 0 1 4.8 0V16"/><path d="M22.4 16h1.4c2.9 0 5.2 2.2 5.2 5.1C29 25.8 24.8 29 17 29H9c-2.6-2.4-3.8-5.5-3-9.5L8 15"/><path d="M10 21h12"/><path d="M12 24h7"/><path d="M25 11l2-2M26.5 15h3"/></svg>`,
    hold:`<svg class="decision-ico" viewBox="0 0 32 32" aria-hidden="true"><path class="ico-fill" d="M5 7h22v18H5z"/><rect x="5" y="7" width="22" height="18" rx="2"/><path d="M16 7v18"/><circle cx="16" cy="16" r="3.1"/><circle cx="10" cy="12" r="1.6"/><circle cx="22" cy="12" r="1.6"/><circle cx="10" cy="20" r="1.6"/><circle cx="22" cy="20" r="1.6"/><path d="M10 12l6 4 6-4"/><path d="M10 20l6-4 6 4"/><path d="M8 4h5"/><path d="M8 4v3"/><path d="M24 28h-5"/><path d="M24 28v-3"/></svg>`
  };
  return icons[name]||"";
}

function showDraftEvent(scheduledRound){
 if(runEnded||Number(scheduledRound||round)!==Number(round)||$("hub").classList.contains("hidden")||pendingMatchResolution||window.CopaRunState&&window.CopaRunState.phase!=="hub"||!$("modal").classList.contains("hidden"))return;const tr=LANG==="tr";
 const _bolt=_riskOfferIcon("power"),_case=_riskOfferIcon("fortune"),_dice=_riskOfferIcon("contract"),_band=_riskOfferIcon("grit"),_hand=_riskOfferIcon("safe");
 const gain=tr?"Kazanç":"Gain",cost=tr?"Bedel":"Cost",risk=tr?"Risk":"Risk",note=tr?"Not":"Note";
 const opts=[
  {id:"power",i:_bolt,c:"var(--risk-power)",c2:"var(--risk-power-highlight)",n:tr?"Vadeli Kudret":"Deferred Might",badge:tr?"RİSKLİ":"RISKY",lines:[[gain,tr?"Bu maç +6 güç":"This match +6 power","risk-offer-gain"],[cost,tr?"-€8M, sonraki maç -2 güç":"-€8M, next match -2 power","risk-offer-cost"]],go:()=>{riskPowerMod+=6;spend(8,"spent");draftFatigueTurns=Math.max(draftFatigueTurns,1);pushFeed("⚡ "+(tr?"Vadeli Kudret: +6 güç, sonraki maç -2":"Deferred Might: +6 power, next match -2"),"pres");}},
  {id:"fortune",i:_case,c:"var(--risk-fortune)",c2:"var(--risk-fortune-highlight)",n:tr?"Kör Talih":"Blind Fortune",badge:tr?"KUMAR":"GAMBLE",lines:[[gain,tr?"+€12M hemen":"Immediate +€12M","risk-offer-gain"],[risk,tr?"%35 ihtimal -€20M geri ödeme":"35% chance -€20M clawback","risk-offer-risk"]],go:()=>{earn(12,"earned");let msg="💼 "+(tr?"Kör Talih: +€12M":"Blind Fortune: +€12M");if(rand()<0.35){spend(20,"spent");msg+=(tr?", geri ödeme -€20M":", clawback -€20M");}pushFeed(msg,"buy");}},
  {id:"contract",i:_dice,c:"var(--risk-contract)",c2:"var(--risk-contract-highlight)",n:tr?"Kupaya Senet":"Cup IOU",badge:tr?"FİNAL BORCU":"FINAL DEBT",lines:[[gain,tr?"+€8M ve bu maç +3 güç":"+€8M and this match +3 power","risk-offer-gain"],[cost,tr?"Sonraki 2 maç -2, finalde -4":"Next 2 matches -2, final -4","risk-offer-cost"]],go:()=>{earn(8,"earned");riskPowerMod+=3;draftDebtTurns+=2;addFinalPenalty(4,"cup_iou");pushFeed("🎲 "+(tr?"Kupaya Senet: +€8M, +3 güç, final -4":"Cup IOU: +€8M, +3 power, final -4"),"pres");}},
  {id:"grit",i:_band,c:"var(--risk-grit)",c2:"var(--risk-grit-highlight)",n:tr?"Dişini Sık":"Grit Your Teeth",badge:tr?"SAKATLIK":"INJURY",lines:[[gain,tr?"Bu maç +5 güç":"This match +5 power","risk-offer-gain"],[risk,tr?"Maç sonu %35 sakatlık riski":"35% post-match injury risk","risk-offer-risk"]],go:()=>{riskPowerMod+=5;draftPendingInjury=1;pushFeed("🩹 "+(tr?"Dişini Sık: +5 güç, maç sonu risk":"Grit Your Teeth: +5 power, post-match risk"),"pres");}},
  {id:"safe",i:_hand,c:"var(--risk-safe)",c2:"var(--risk-safe-highlight)",n:tr?"Pas Geç":"Pass",badge:tr?"GÜVENLİ":"SAFE",skip:true,lines:[[gain,tr?"Etki yok":"No effect","risk-offer-note"],[note,tr?"Risk alma, mevcut düzeni koru":"Take no risk, keep the plan","risk-offer-note"]],go:()=>{pushFeed("✋ "+(tr?"Pas geçildi: risk alınmadı":"Passed: no risk taken"),"pres");}}
 ];
 let h=`<div class="riskdraft-modal"><div class="kithdr">${tr?"RİSKLİ TEKLİFLER":"RISKY OFFERS"}</div><div class="kitsub">${tr?"Büyük kazanç, gerçek bedel. Gerek yoksa pas geç.":"Big upside, real cost. Skip if you do not need it."}</div><div class="risk-offer-list">`;
 opts.forEach((o,i)=>{h+=_riskOfferHTML(o,i);});
 h+="</div></div>";
 window._draftEvents=opts;showModal(h,{dismissOnOverlay:true,label:tr?"Riskli teklifler":"Risky offers"});
}
function pickDraftEvent(i){const o=i<0?(window._draftEvents&&window._draftEvents.find(x=>x.skip)):(window._draftEvents&&window._draftEvents[i]);if(!o)return;closeModal();o.go();sfxStamp();setBudget();renderHub();showToast(o.n,{type:o.skip?"default":"default"});}
