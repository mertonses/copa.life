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

function _riskDraftLine(label,value,cls){
  return `<div class="risk-offer-line ${cls||""}"><span>${label}</span><b>${value}</b></div>`;
}

function _riskOfferHTML(o,i){
  const onclick=o.skip?"pickDraftEvent(-1)":"pickDraftEvent("+i+")";
  return `<button type="button" class="risk-offer ${o.skip?"risk-offer-safe":""}" style="--risk-accent:${o.c}" onclick="${onclick}">
    <span class="risk-offer-icon">${o.i}</span>
    <span class="risk-offer-copy">
      <span class="risk-offer-head"><b>${o.n}</b><em>${o.badge}</em></span>
      ${o.lines.map(x=>_riskDraftLine(x[0],x[1],x[2])).join("")}
    </span>
  </button>`;
}

function showDraftEvent(){
 if($("hub").classList.contains("hidden"))return;const tr=LANG==="tr";
 const _bolt=`<svg viewBox='0 0 22 32' width='22' height='28' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M14 2L5 17H12L8 30L19 14H12L14 2Z' fill='currentColor' opacity='.18'/><path d='M14 2L5 17H12L8 30L19 14H12L14 2Z'><animate attributeName='opacity' values='1;0.3;1' dur='0.7s' repeatCount='indefinite'/></path></svg>`;
 const _case=`<svg viewBox='0 0 32 32' width='28' height='28' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><circle cx='16' cy='16' r='13'/><line x1='16' y1='7' x2='16' y2='25'/><path d='M12 11C12 9.5 14 8.5 16 9C18 9.5 19.5 11.5 18 13C16.5 14.5 13 15 12.5 17.5C12 20 14 22 16 22.5C18 23 20.5 21.5 20 19.5'><animate attributeName="stroke-dasharray" values="0 60;60 0" dur="2s" repeatCount="indefinite"/></path></svg>`;
 const _dice=`<svg viewBox='0 0 28 28' width='26' height='26' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><g><animateTransform attributeName='transform' type='rotate' values='0 14 14;-9 14 14;0 14 14;9 14 14;0 14 14' dur='2.2s' repeatCount='indefinite'/><rect x='2' y='2' width='24' height='24' rx='4'/><circle cx='9' cy='9' r='2.2' fill='currentColor'/><circle cx='19' cy='9' r='2.2' fill='currentColor'/><circle cx='9' cy='19' r='2.2' fill='currentColor'/><circle cx='19' cy='19' r='2.2' fill='currentColor'/><circle cx='14' cy='14' r='2.2' fill='currentColor'/></g></svg>`;
 const _band=`<svg viewBox='0 0 26 34' width='22' height='30' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><g><animateTransform attributeName='transform' type='scale' values='1 1;1.05 1.08;1 1;0.97 0.95;1 1' dur='1.4s' repeatCount='indefinite' additive='sum' transformOrigin='13 17'/><path d='M13 30C6 30 4 24 6 19C7 17 8.5 15.5 7.5 12C11 14 10.5 18 9.5 20C11.5 18.5 12.5 15 11.5 11C15 13 15.5 17.5 14 21C16 19.5 17.5 15 15.5 11C21 13 23 18.5 21 23C20 26 17 30 13 30Z' fill='currentColor' opacity='.18'/><path d='M13 30C6 30 4 24 6 19C7 17 8.5 15.5 7.5 12C11 14 10.5 18 9.5 20C11.5 18.5 12.5 15 11.5 11C15 13 15.5 17.5 14 21C16 19.5 17.5 15 15.5 11C21 13 23 18.5 21 23C20 26 17 30 13 30Z'/></g></svg>`;
 const _hand=`<svg viewBox='0 0 26 32' width='22' height='28' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><g><animateTransform attributeName='transform' type='rotate' values='0 13 24;-12 13 24;0 13 24;12 13 24;0 13 24' dur='2s' repeatCount='indefinite' calcMode='spline' keySplines='0.4 0 0.6 1;0.4 0 0.6 1;0.4 0 0.6 1;0.4 0 0.6 1'/><path d='M7 18V8a2.5 2.5 0 0 1 5 0v5'/><path d='M12 8V6a2.5 2.5 0 0 1 5 0v8'/><path d='M17 9V7a2.5 2.5 0 0 1 5 0v6'/><path d='M7 18c0 6 3 10 9 10s9-4 9-10v-5'/></g></svg>`;
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
