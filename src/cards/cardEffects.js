/* Kartlarin guce ve run durumuna etkileri — v4 */
function squadBasePower(){const s=picksBySlot.filter(Boolean);return s.length?Math.round(s.reduce((a,p)=>a+effOf(p),0)/s.length):0;}

/* Variant bonus kaldirildi — her kart kendi eff() icinde variant farkini yonetiyor */
var VARIANT_BONUS=[0,0];

/* DARK variant'ta finalde dususecek guc — sadece DARK kart alindiginda eklenir */
var KARA_PEN={
 taraftar:6,genc:4,ch_momentum:6,
 yildiz:2,otobus:3,
 altyapi_plani:4,tecrubeli_omurga:4,
 yerli_blok:3,kanat_akini:5,
 taksit_transfer:6,
 sahte_evrak:8,
 doping:8,
 gec_gec:3,
 kasiga_para:2,
 /* DARK now carries real final risk on cards that previously had free upside */
 kaleci_kalesi:8,cift_forvet:4
};

/* DARK risks resolved once when the card is acquired. */
var DARK_PURCHASE_RISKS={
 anadolu:{chance:0.20,cash:5},
 final_provasi:{chance:0.25,cash:3},
 kriz:{chance:0.20,cash:5},
 bu_adam:{chance:0.25,cash:6},
 derbi:{chance:0.25,cash:7}
};

function cardEff(k,s,r){
 if(!CARDDEFS[k])return 0;
 return CARDDEFS[k].eff(s,r)||0;
}
function chairmanCardBoost(k){
 return typeof chairman!=="undefined"&&chairman&&chairman.id==="sansasyoncu"&&(k==="yildiz"||k==="buyuk_mac")?1:0;
}

/* Kumarbaz taksit sistemi */
var kumarbazInstallmentTurns=0,kumarbazInstallmentAmt=0;
/* Kriz bayragi */
var krizActive=false,krizVariant=0;
/* Match-bound contracts. All fields are optional in old saves. */
var matchPromiseState=null,matchPromiseReward=null,matchPromisePromptedRound=0;
var captainDecisionUsed=false,captainDecisionActive=null;

function matchPromisePowerForRound(r){
 const reward=matchPromiseReward;
 return reward&&Number(reward.round)===Number(r)?Number(reward.delta)||0:0;
}
function matchPromiseStatusText(){
 const tr=LANG==="tr",active=matchPromiseState&&matchPromiseState.round===round,reward=matchPromisePowerForRound(round);
 if(active)return tr?"Söz verildi: gol yeme":"Promise active: keep a clean sheet";
 if(reward)return (tr?"Bu maç söz ödülü: ":"Promise reward this match: ")+(reward>0?"+":"")+reward;
 if(matchPromisePromptedRound===round)return tr?"Bu tur söz verilmedi":"No promise this round";
 return tr?"Maç öncesi söz verilebilir":"A pre-match promise is available";
}
function shouldOfferMatchPromise(r){
 return Number(r)<6&&hasCard("mac_sozu")&&(!matchPromiseState||Number(matchPromiseState.round)!==Number(r))&&Number(matchPromisePromptedRound)!==Number(r);
}
function declareCleanSheetPromise(){
 if(!hasCard("mac_sozu")||round>=6||matchPromiseState)return false;
 matchPromisePromptedRound=round;
 matchPromiseState={round,variant:variantOf("mac_sozu")};
 pushFeed("🤝 <b>"+L().cards.mac_sozu.n+"</b> "+(LANG==="tr"?"Söz: gol yemeyeceğiz.":"Promise: we will keep a clean sheet."),"pres");
 closeModal();if(typeof renderHub==="function")renderHub();
 return true;
}
function skipMatchPromise(){
 matchPromisePromptedRound=round;
 closeModal();if(typeof renderHub==="function")renderHub();
}
function showMatchPromiseModal(){
 if(!shouldOfferMatchPromise(round))return false;
 if(autoPlay){
  declareCleanSheetPromise();
  setTimeout(()=>playMatch(true),0);
  return true;
 }
 matchPromisePromptedRound=round;
 const tr=LANG==="tr",v=variantOf("mac_sozu"),success=v===1?5:3,failure=v===1?-3:0;
 const consequence=v===1
  ?(tr?`Başarı: sonraki maç +${success} güç. Başarısızlık: sonraki maç ${failure} güç.`:`Success: +${success} next match. Failure: ${failure} next match.`)
  :(tr?`Başarı: yalnızca sonraki maç +${success} güç. Başarısızlıkta ceza yok.`:`Success: +${success} only in the next match. No penalty on failure.`);
 showModal(`<div class="bulletin match-promise-modal"><div class="bhead"><span>${tr?"MAÇ SÖZÜ":"MATCH PROMISE"}</span><span>${L().rounds[round-1]}</span></div><div class="bmascot">🤝</div><div class="bhl">${tr?"GOL YEMEYECEĞİZ":"WE WILL KEEP A CLEAN SHEET"}</div><div class="bbody">${tr?"Takımın önüne tek, net bir hedef koy.":"Set one clear target for the squad."}<br>${consequence}</div><div class="bact"><button class="btn btn-primary" onclick="declareCleanSheetPromise()">${tr?"SÖZ VER":"MAKE THE PROMISE"}</button><button class="btn btn-ghost" onclick="skipMatchPromise()">${tr?"BU MAÇ PAS":"SKIP THIS MATCH"}</button></div></div>`,{dismissOnOverlay:false,label:tr?"Maç Sözü":"Match Promise"});
 return true;
}
function resolveMatchPromiseAfterScore(gf,ga,r){
 const playedRound=Number(r),usedReward=matchPromiseReward&&Number(matchPromiseReward.round)===playedRound?Number(matchPromiseReward.delta)||0:0;
 if(usedReward)matchPromiseReward=null;
 let result=null;
 if(matchPromiseState&&Number(matchPromiseState.round)===playedRound){
  const state=matchPromiseState,success=Number(ga)===0,delta=success?(state.variant===1?5:3):(state.variant===1?-3:0);
  matchPromiseState=null;
  if(playedRound<6&&delta)matchPromiseReward={round:playedRound+1,delta,sourceRound:playedRound};
  const tr=LANG==="tr";
  pushFeed("🤝 <b>"+L().cards.mac_sozu.n+"</b> "+(success?(tr?"söz tutuldu":"promise kept"):(tr?"söz tutulamadı":"promise missed"))+(delta?(tr?" · sonraki maç ":" · next match ")+(delta>0?"+":"")+delta:""),success?"win":"lose");
  result={success,delta,nextRound:playedRound+1};
 }
 return {usedReward,result};
}
function canUseCaptainDecision(){
 return hasCard("kaptanin_karari")&&!captainDecisionUsed&&lastTalkResult&&Number(lastTalkResult.delta)<0&&typeof _currentCaptainPlayer==="function"&&!!_currentCaptainPlayer();
}
function captainDecisionPlayerPenaltyForRound(r,s){
 if(!captainDecisionActive||Number(captainDecisionActive.round)!==Number(r))return 0;
 const squad=Array.isArray(s)?s:[];
 return squad.some(p=>p&&p.name===captainDecisionActive.playerName)?-Math.abs(Number(captainDecisionActive.penalty)||0):0;
}
function captainDecisionChemistryForRound(r){
 return captainDecisionActive&&Number(captainDecisionActive.round)===Number(r)?Number(captainDecisionActive.chem)||0:0;
}
function captainDecisionStatusText(){
 const tr=LANG==="tr";
 if(captainDecisionActive&&captainDecisionActive.round===round)return tr
  ?`Konuşma 0 · kaptan -${captainDecisionActive.penalty}${captainDecisionActive.chem?" · kimya +"+captainDecisionActive.chem:""}`
  :`Talk 0 · captain -${captainDecisionActive.penalty}${captainDecisionActive.chem?" · chemistry +"+captainDecisionActive.chem:""}`;
 if(captainDecisionUsed)return tr?"Bu run kullanıldı":"Used this run";
 return tr?"Olumsuz konuşma sonrası hazır":"Ready after a negative team talk";
}
function useCaptainDecision(){
 if(!canUseCaptainDecision())return false;
 const captain=_currentCaptainPlayer(),variant=variantOf("kaptanin_karari"),original=Number(lastTalkResult.delta)||0;
 captainDecisionUsed=true;
 captainDecisionActive={round,variant,playerName:captain.name,penalty:variant===1?3:2,chem:variant===1?1:0};
 talkMod.all=0;
 lastTalkResult=Object.assign({},lastTalkResult,{originalDelta:original,delta:0,captainIntervened:true,captain:captain.name});
 pushFeed("© <b>"+shortName(captain)+"</b> "+(LANG==="tr"?"takıma sahip çıktı; konuşma etkisi sıfırlandı.":"stepped in; the negative talk was neutralized."),"pres");
 closeModal();if(typeof renderHub==="function")renderHub();
 return true;
}
function clearCaptainDecisionAfterMatch(r){
 if(captainDecisionActive&&Number(captainDecisionActive.round)===Number(r))captainDecisionActive=null;
}
function cardHasLockedCommitment(k){
 if(k==="mac_sozu")return !!matchPromiseState||!!matchPromiseReward;
 if(k==="kaptanin_karari")return !!captainDecisionActive;
 return false;
}
function finishCardMatchCommitments(gf,ga,r){
 const promise=resolveMatchPromiseAfterScore(gf,ga,r);
 clearCaptainDecisionAfterMatch(r);
 return promise;
}
function applyCardCashPenalty(k,amount){
 amount=Math.max(0,Math.round(amount||0));
 if(!amount)return;
 spend(amount,"spent");
 if(typeof trackCardPenalty==="function")trackCardPenalty(k,0,0,amount);
}
function applyCardSecondaryCost(k,variant){
 const meta=typeof cardCostMeta==="function"?cardCostMeta(k,variant):null;
 if(!meta||!meta.chem)return;
 cardChemDebt=Math.min(5,Math.max(0,(Number(cardChemDebt)||0)+meta.chem));
 const tr=LANG==="tr";
 pushFeed("<b>"+L().cards[k].n+"</b> "+(tr?"kimya bedeli: -":"chemistry cost: -")+meta.chem,"lose");
}
function applyDarkPurchaseRisk(k,variant){
 const risk=DARK_PURCHASE_RISKS[k];
 if(variant!==1||!risk||rand()>=risk.chance)return{triggered:false,cash:0};
 applyCardCashPenalty(k,risk.cash);
 pushFeed("<b>"+L().cards[k].n+"</b> "+(LANG==="tr"?"DARK ek masrafı: -€":"DARK extra cost: -€")+risk.cash+"M","lose");
 return{triggered:true,cash:risk.cash};
}

function blackMarketRewardPool(burnKey){
 if(typeof eligibleMarketCardPool==="function")return eligibleMarketCardPool(round,{persistentOnly:true,exclude:["kara_borsa",burnKey]});
 return CARDKEYS.filter(k=>k!=="kara_borsa"&&k!==burnKey&&invOf(k)<=0&&!isInstantCard(k)&&!(cardKind(k)==="final"&&round<5)&&(round<6||cardKind(k)==="final"));
}
function blackMarketCardPreview(k,v){
 const old=cardVariant[k]||0;cardVariant[k]=v;
 const value=cardEff(k,picksBySlot.filter(Boolean),round);
 cardVariant[k]=old;
 return value;
}
function blackMarketCardCosts(k,v){
 const lines=typeof cardCostLines==="function"?cardCostLines(k,v):[];
 return lines.length?lines:[LANG==="tr"?"Ek bedel yok":"No extra cost"];
}
function showBlackMarketRewards(){
 const state=BLACK_MARKET_REWARD;if(!state)return;
 const tr=LANG==="tr",required=state.required;
 const list=state.offers.map(function(item){
  const card=L().cards[item.key]||{},tier=typeof variantBadge==="function"?variantBadge(item.variant):(item.variant===1?"DARK":"COMMON"),power=blackMarketCardPreview(item.key,item.variant),costs=blackMarketCardCosts(item.key,item.variant);
  return `<button type="button" class="black-market-card black-market-reward-card" role="checkbox" aria-checked="false" data-card="${item.key}" onclick="toggleBlackMarketReward('${item.key}')"><span class="black-market-card-copy"><strong>${card.n||item.key}</strong><small>${tr?"Bu tur güç":"Power this round"}: ${power>=0?"+":""}${power}</small><span class="black-market-card-costs">${costs.map(line=>`<i>${line}</i>`).join("")}</span></span><span class="var-badge var-${item.variant}">${tier}</span><span class="black-market-card-mark" aria-hidden="true"></span></button>`;
 }).join("");
 showModal(`<div class="black-market-modal black-market-rewards"><header class="black-market-head"><div class="black-market-badge">${tr?"KARA BORSA":"BLACK MARKET"}</div><h2>${tr?(required===1?"BİR KART SEÇ":"İKİ KART SEÇ"):(required===1?"CHOOSE ONE CARD":"CHOOSE TWO CARDS")}</h2><p>${tr?"Varyantı ve bütün bedelleri görerek ödülünü seç.":"Choose your reward with its variant and every cost visible."}</p></header><div class="black-market-list" role="group" aria-label="${tr?"Alınacak kartlar":"Cards to take"}">${list}</div><div class="black-market-status" data-black-market-status aria-live="polite">${tr?"0 / "+required+" seçildi":"0 / "+required+" selected"}</div>${state.variant===1?`<div class="black-market-warning">${tr?"Seçim tamamlanınca %25 ihtimalle -€8M ceza uygulanır.":"Completing the trade has a 25% chance of an €8M fine."}</div>`:""}<div class="black-market-actions"><button class="btn black-market-burn" data-black-market-take disabled onclick="completeBlackMarketTrade()">${tr?"SEÇİMİ AL":"TAKE SELECTION"}</button></div></div>`,{dismissOnOverlay:false,label:tr?"Kara Borsa ödül seçimi":"Black Market reward selection"});
}
function resolveBlackMarketTrade(burnKey,variant){
 const tr=LANG==="tr";
 if(!cards.includes(burnKey)||isInstantCard(burnKey)||cardHasLockedCommitment(burnKey))return false;
 const pool=blackMarketRewardPool(burnKey),offerCount=Math.min(variant===1?4:3,pool.length),required=Math.min(variant===1?2:1,offerCount);
 if(!required){showModal(`<div class="black-market-modal black-market-empty"><div class="black-market-badge">${tr?"KARA BORSA":"BLACK MARKET"}</div><h2>${tr?"UYGUN KART YOK":"NO ELIGIBLE CARDS"}</h2><p>${tr?"Bu tur takas havuzunda uygun kalıcı kart bulunmuyor.":"There is no eligible persistent card in this round's trade pool."}</p><div class="black-market-actions"><button class="btn btn-ghost" onclick="closeModal()">${tr?"KAPAT":"CLOSE"}</button></div></div>`,{dismissOnOverlay:false});return false;}
 const offers=[];
 while(offers.length<offerCount&&pool.length){
  const index=Math.floor(rand()*pool.length),key=pool.splice(index,1)[0];
  offers.push({key,variant:variant===1?weightedVariant():0});
 }
 const oldName=(L().cards[burnKey]&&L().cards[burnKey].n)||burnKey;
 cards=cards.filter(k=>k!==burnKey);cardInv[burnKey]=0;cardVariant[burnKey]=0;
 BLACK_MARKET_REWARD={burnKey,burnName:oldName,variant,required,offers,selected:[]};
 showBlackMarketRewards();
 return true;
}
var BLACK_MARKET_SELECTION=null,BLACK_MARKET_REWARD=null;
function toggleBlackMarketReward(key){
 const state=BLACK_MARKET_REWARD;if(!state||!state.offers.some(item=>item.key===key))return;
 const selected=state.selected,index=selected.indexOf(key);
 if(index>=0)selected.splice(index,1);
 else if(selected.length<state.required)selected.push(key);
 const root=document.querySelector(".black-market-rewards");if(!root)return;
 root.querySelectorAll(".black-market-reward-card").forEach(button=>{const on=selected.includes(button.dataset.card);button.classList.toggle("is-selected",on);button.setAttribute("aria-checked",on?"true":"false");});
 const status=root.querySelector("[data-black-market-status]");if(status)status.textContent=(LANG==="tr"?selected.length+" / "+state.required+" seçildi":selected.length+" / "+state.required+" selected");
 const action=root.querySelector("[data-black-market-take]");if(action)action.disabled=selected.length!==state.required;
}
function completeBlackMarketTrade(){
 const state=BLACK_MARKET_REWARD;if(!state||state.selected.length!==state.required)return false;
 const chosen=state.selected.map(key=>state.offers.find(item=>item.key===key)).filter(Boolean),tr=LANG==="tr";
 chosen.forEach(item=>addCard(item.key,item.variant,{silent:true,freeSource:"kara_borsa"}));
 if(state.variant===1&&rand()<0.25){
  const old=cardVariant.kara_borsa||0;cardVariant.kara_borsa=1;
  applyCardCashPenalty("kara_borsa",8);cardVariant.kara_borsa=old;
  pushFeed(tr?"Kara Borsa riski: -€8M":"Black Market risk: -€8M","lose");
 }
 pushFeed("<b>"+((L().cards.kara_borsa&&L().cards.kara_borsa.n)||"Kara Borsa")+"</b> "+(tr?state.burnName+" yakıldı; "+chosen.length+" kart seçildi.":state.burnName+" burned; "+chosen.length+" card(s) selected."),"buy");
 BLACK_MARKET_REWARD=null;BLACK_MARKET_SELECTION=null;
 closeModal();if(typeof renderHub==="function")renderHub();
 return true;
}
function selectBlackMarketCard(burnKey,variant){
 BLACK_MARKET_SELECTION=burnKey;
 const root=document.querySelector(".black-market-modal");if(!root)return;
 root.querySelectorAll(".black-market-card").forEach(function(button){
  const selected=button.dataset.card===burnKey;
  button.classList.toggle("is-selected",selected);
  button.setAttribute("aria-checked",selected?"true":"false");
 });
 const action=root.querySelector("[data-black-market-burn]");
 if(action){action.hidden=false;action.onclick=function(){confirmBlackMarketTrade(burnKey,variant);};}
 const status=root.querySelector("[data-black-market-status]");
 const card=L().cards[burnKey];
 if(status){status.textContent=((card&&card.n)||burnKey)+(LANG==="tr"?" seçildi.":" selected.");}
}
function confirmBlackMarketTrade(burnKey,variant){
 const tr=LANG==="tr",card=L().cards[burnKey],name=(card&&card.n)||burnKey,v=variantOf(burnKey),tier=typeof variantBadge==="function"?variantBadge(v):(v===1?"DARK":"COMMON");
 showModal(`<div class="black-market-modal black-market-confirm"><div class="black-market-badge">${tr?"KARA BORSA":"BLACK MARKET"}</div><div class="black-market-confirm-mark" aria-hidden="true">&#10005;</div><h2>${name} ${tr?"yakılacak.":"will be burned."}</h2><p>${tr?"Ardından ödül kartlarını sen seçeceksin.":"You will choose the reward cards next."}</p><div class="black-market-confirm-card"><span class="var-badge var-${v}">${tier}</span><strong>${name}</strong></div><div class="black-market-warning">${tr?"Yakma işlemi geri alınamaz.":"The burn cannot be undone."}</div><div class="black-market-actions"><button class="btn black-market-burn" onclick="resolveBlackMarketTrade('${burnKey}',${variant})">${tr?"KARTI YAK":"BURN CARD"}</button><button class="btn btn-ghost" onclick="openBlackMarketTrade(${variant})">${tr?"GERİ":"BACK"}</button></div></div>`,{dismissOnOverlay:false,label:tr?"Kart yakma onayı":"Burn card confirmation"});
}
function openBlackMarketTrade(variant){
 const tr=LANG==="tr",choices=cards.filter(k=>k!=="kara_borsa"&&!isInstantCard(k)&&!cardHasLockedCommitment(k));
 BLACK_MARKET_SELECTION=null;
 if(!choices.length){
  showModal(`<div class="black-market-modal black-market-empty"><button class="modal-x" onclick="closeModal()" aria-label="${tr?"Kapat":"Close"}">&times;</button><div class="black-market-badge">${tr?"KARA BORSA":"BLACK MARKET"}</div><h2>${tr?"YAKACAK KART YOK":"NO CARD TO BURN"}</h2><p>${tr?"Bu hamle için en az bir aktif kalıcı kart gerekir.":"This move requires at least one active persistent card."}</p><div class="black-market-actions"><button class="btn btn-ghost" onclick="closeModal()">${tr?"VAZGEÇ":"CANCEL"}</button></div></div>`,{dismissOnOverlay:true,label:tr?"Kara Borsa":"Black Market"});
  return;
 }
 const list=choices.map(function(k){const card=L().cards[k],v=variantOf(k),tier=typeof variantBadge==="function"?variantBadge(v):(v===1?"DARK":"COMMON");return `<button type="button" class="black-market-card" role="radio" aria-checked="false" data-card="${k}" onclick="selectBlackMarketCard('${k}',${variant})"><span class="black-market-card-copy"><strong>${(card&&card.n)||k}</strong><small>${tr?"Bu kartı yak":"Burn this card"}</small></span><span class="var-badge var-${v}">${tier}</span><span class="black-market-card-mark" aria-hidden="true"></span></button>`;}).join("");
 showModal(`<div class="black-market-modal"><header class="black-market-head"><div class="black-market-badge">${tr?"KARA BORSA":"BLACK MARKET"}</div><h2><span>${tr?"BİR KARTI YAK,":"BURN ONE CARD,"}</span><span>${tr?(variant===1?"İKİ KART SEÇ":"BİR KART SEÇ"):(variant===1?"CHOOSE TWO":"CHOOSE ONE")}</span></h2><p>${tr?"Feda edeceğin kartı seç.":"Choose a card to sacrifice."}</p></header><div class="black-market-list" role="radiogroup" aria-label="${tr?"Yakılacak kart":"Card to burn"}">${list}</div><div class="black-market-status" data-black-market-status aria-live="polite"></div><div class="black-market-warning">${tr?"Kart yakılmadan önce son kez onaylayacaksın.":"You will confirm once more before the card is burned."}</div><div class="black-market-actions"><button class="btn black-market-burn" data-black-market-burn hidden>${tr?"DEVAM ET":"CONTINUE"}</button></div></div>`,{dismissOnOverlay:false,label:tr?"Kara Borsa kart yakma":"Black Market card burn"});
}

/* ===== Kart satin alma etkileri ===== */
function applyRiskCardGain(k){
 const v=variantOf(k);
 const tr=LANG==="tr";

 /* --- GÜVENILIR EKONOMI --- */
 if(k==="taksit_transfer"){
  const gain=v===1?18:10,pay=v===1?7:4;
  earn(gain,"earned");
  installmentTurns=2;installmentAmt=pay;
  if(v===1){chairTrust=Math.max(0,chairTrust-1);pushFeed("💳 <b>"+L().cards[k].n+"</b> +€"+gain+"M · güven -1","buy");}
  else{pushFeed("💳 <b>"+L().cards[k].n+"</b> +€"+gain+"M","buy");}
  pushFeed("💳 "+(tr?"Sonraki 2 tur: -€"+pay+"M":"Next 2 rounds: -€"+pay+"M"),"pres");
  return;
 }
 if(k==="son_kredi"){
  const gain=v===1?20:15;
  if(budget<-10&&!lastCreditActive){
   earn(gain,"earned");lastCreditActive=1;
   if(v===1){chairTrust=Math.max(0,chairTrust-1);}
   pushFeed("🆘 <b>"+L().cards[k].n+"</b> +€"+gain+"M"+(v===1?" · güven -1":""),"buy");
  }else{
   lastCreditActive=-1;
   pushFeed("🆘 <b>"+L().cards[k].n+"</b> "+(tr?"kasa -€10M altına inerse çalışır":"activates when below -€10M"),"pres");
  }
  return;
 }
 if(k==="kumarbaz"){
  const gain=v===1?25:15,pay=v===1?10:5;
  earn(gain,"earned");
  kumarbazInstallmentTurns=2;kumarbazInstallmentAmt=pay;
  if(v===1){chairTrust=Math.max(0,chairTrust-1);}
  pushFeed("🎲 <b>"+L().cards[k].n+"</b> +€"+gain+"M · 2 tur -€"+pay+"M"+(v===1?" · güven -1":""),"pres");
  return;
 }

 /* --- ANLIK GÜÇ (INSTANT) --- */
 if(k==="kontra"){
  const s=picksBySlot.filter(Boolean);
  const fwds=s.filter(p=>FWDP&&FWDP.includes(p.pos)).length;
  const pow=fwds*(v===1?2:1);
  riskPowerMod+=pow;
  pushFeed("⚡ <b>"+L().cards[k].n+"</b> "+fwds+(tr?" forvet → +"+pow+" güç":" forwards → +"+pow+" power"),"pres");
  if(v===1&&rand()<0.25){applyCardCashPenalty(k,10);pushFeed("⚡ "+(tr?"Kontra cezası: -€10M":"Counter penalty: -€10M"),"lose");}
  return;
 }
 if(k==="buyuk_mac"){
  const pow=v===1?10:6,chairBoost=chairmanCardBoost(k);
  riskPowerMod+=pow+chairBoost;
  pushFeed("🎯 <b>"+L().cards[k].n+"</b> +"+(pow+chairBoost)+(tr?" güç":" power"),"pres");
  if(v===1&&rand()<0.20){applyCardCashPenalty(k,12);pushFeed("🎯 "+(tr?"Büyük maç riski: -€12M":"Big game risk: -€12M"),"lose");}
  return;
 }
 if(k==="yildiz"){
  const s=picksBySlot.filter(Boolean);
  const maxOV=s.length?s.reduce((a,p)=>Math.max(a,p.ov||0),0):0;
  const pow=v===1?(maxOV>=90?14:maxOV>=85?10:maxOV>=80?8:6):(maxOV>=90?10:maxOV>=85?8:maxOV>=80?6:4),chairBoost=chairmanCardBoost(k);
  riskPowerMod+=pow+chairBoost;
  pushFeed("🍰 <b>"+L().cards[k].n+"</b> "+(tr?"Güç ":"Power ")+maxOV+" → +"+(pow+chairBoost)+(tr?" güç":" power"),"pres");
  if(v===1&&rand()<0.25){applyCardCashPenalty(k,6);pushFeed("🍰 "+(tr?"Yıldız riski: -€6M":"Star risk: -€6M"),"lose");}
  return;
 }
 if(k==="otobus"){
  const s=picksBySlot.filter(Boolean);
  const cbs=s.filter(p=>p.pos==="CB").length;
   const pow=Math.min(v===1?12:9,cbs*(v===1?4:3));
  riskPowerMod+=pow;
  pushFeed("🚌 <b>"+L().cards[k].n+"</b> "+cbs+(tr?" stoper → +"+pow+" güç":" CBs → +"+pow+" power"),"pres");
  if(v===1&&rand()<0.10){applyCardCashPenalty(k,6);pushFeed("🚌 "+(tr?"Savunma cezası: -€6M":"Defensive penalty: -€6M"),"lose");}
  return;
 }

 /* --- PLAYER POWER BOOST (INSTANT) --- */
 if(k==="kaleci_kalesi"){
   const boost=v===1?9:5;
  const s=picksBySlot.filter(Boolean);
  const gk=s.find(p=>p.pos==="GK");
  if(gk){gk.ov=Math.min(99,gk.ov+boost);gk.eff=Math.min(99,gk.eff+boost);renderRoundel&&renderRoundel("h"+picksBySlot.indexOf(gk),gk);pushFeed("🧤 <b>"+L().cards[k].n+"</b> "+(tr?"Kaleci gücü +":"Goalkeeper power +")+boost,"buy");}
  if(v===1&&rand()<0.15){applyCardCashPenalty(k,15);pushFeed("🧤 "+(tr?"Transfer cezası: -€15M":"Transfer penalty: -€15M"),"lose");}
  return;
 }

 /* --- DEPLASMAN (INSTANT) --- */
 if(k==="deplasman_kafilesi"){
  const currentSquadPower=typeof squadPower==="function"?squadPower(round).power:0;
  const stronger=typeof opponent!=="undefined"&&opponent&&opponent.power>currentSquadPower;
  if(v===1){
   if(stronger){riskPowerMod+=9;pushFeed("✈️ <b>"+L().cards[k].n+"</b> +9"+(tr?" güç":" power"),"pres");}
   else{if(rand()<0.5){riskPowerMod+=4;pushFeed("✈️ <b>"+L().cards[k].n+"</b> +4"+(tr?" güç (şans)":" power (luck)"),"pres");}else{riskPowerMod-=2;pushFeed("✈️ <b>"+L().cards[k].n+"</b> -2"+(tr?" güç (kötü deplasman)":" power (bad away)"),"lose");}}
  }else{
   const pow=stronger?6:2;riskPowerMod+=pow;
   pushFeed("✈️ <b>"+L().cards[k].n+"</b> +"+pow+(tr?" güç":" power"),"pres");
  }
  return;
 }

 /* --- KARA BORSA (INSTANT) --- */
 if(k==="kara_borsa"){
  openBlackMarketTrade(v);return;
 }

 /* --- GEÇİCİ GÜÇLER (INSTANT) --- */
 if(k==="gecici_prim"){
  const pow=v===1?12:6;
  tempPrime=1;
  window._geciciPrimV=v; // dark/golden varyantı sakla
  riskPowerMod+=pow;
  pushFeed("💸 <b>"+L().cards[k].n+"</b> +"+pow+(tr?" güç":" power")+(v===1?", %60":", %30")+(tr?" sakatlık riski":" injury risk after"),"pres");
  return;
 }
 if(k==="kisa_kamp"){
  const pow=v===1?6:4,pen=v===1?4:2;
  shortCamp=pen; // pen degeri expireTemporaryCards'da kullanilacak
  riskPowerMod+=pow;
  pushFeed("⛺ <b>"+L().cards[k].n+"</b> +"+pow+(tr?" güç, sonraki maç -"+pen:" power, next -"+pen),"pres");
  return;
 }

 /* --- KRIZ BAYRAĞI (INSTANT) --- */
 if(k==="kriz"){
  krizActive=true;krizVariant=v;
  pushFeed("🧯 <b>"+L().cards[k].n+"</b> "+(tr?"final sigortası hazır":"final insurance ready"),"buy");
  return;
 }

 /* --- RİSK / KURBAN (INSTANT) --- */
 if(k==="kurban_belli"){
  const pow=v===1?12:6;
  riskPowerMod+=pow;
  if(v===1){
   kurbanScheduled={count:2,turns:1};
   if(rand()<0.25){applyCardCashPenalty(k,6);pushFeed("🔪 "+(tr?"Kurban cezası: -€6M":"Sacrifice penalty: -€6M"),"lose");}
  }else{
   kurbanScheduled={count:1,turns:1};
  }
  pushFeed("🔪 <b>"+L().cards[k].n+"</b> +"+pow+(tr?" güç":" power")+(v===1?" · 2":" · 1")+(tr?" sakatlık bekliyor":" injury pending"),"pres");
  return;
 }
 if(k==="primler_yatinca"){
  const pow=v===1?9:5,pen=v===1?12:6;
  riskPowerMod+=pow;
  deferredBudgetPenalty+=pen;
  pushFeed("💰 <b>"+L().cards[k].n+"</b> +"+pow+(tr?" güç, gelecek tur -€":" power, next turn -€")+pen+"M","pres");
  return;
 }
 if(k==="vur_igneyi"){
  const count=v===1?2:1;
  let healed=0;
  if(injuredIdx>=0&&picksBySlot[injuredIdx]){
   const _ip=picksBySlot[injuredIdx];_ip.injured=false;healed++;
   pushFeed("💉 <b>"+shortName(_ip)+"</b> "+(tr?"iyileşti":"healed"),"buy");
   injuredIdx=-1;
  }
  // 2. sakatlık icin (dark): basit kontrol
  if(healed<count){
   const secondInj=picksBySlot.findIndex((p,i)=>p&&p.injured&&i!==injuredIdx);
   if(secondInj>=0){const _sp=picksBySlot[secondInj];_sp.injured=false;healed++;pushFeed("💉 <b>"+shortName(_sp)+"</b> "+(tr?"iyileşti":"healed"),"buy");}
  }
  if(!healed){const refund=cardPrice(k);if(refund>0)earn(refund,"earned");pushFeed("💉 <b>"+L().cards[k].n+"</b> "+(tr?"sakat oyuncu yok — iade +€"+refund+"M":"no injured player — refund +€"+refund+"M"),"buy");return;}
  if(v===1&&rand()<0.25){applyCardCashPenalty(k,6);pushFeed("💉 "+(tr?"Tedavi masrafı: -€6M":"Treatment cost: -€6M"),"lose");}
  pushFeed("💉 <b>"+L().cards[k].n+"</b> "+healed+(tr?" oyuncu iyileşti":" player(s) healed"),"buy");
  return;
 }
 if(k==="bu_adam"){
  const minOV=v===1?80:70,maxOV=v===1?89:79;
  const pos=(slots&&slots.length?rnd(slots)[0]:rnd(["ST","CM","CB","GK","LW","RW","LM","RM","WB","CDM","CAM"]));
  const p=typeof takeUnique==="function"?takeUnique(pos,minOV,maxOV):fabPlayer(pos,minOV,maxOV);
  p.price=0;
  p.bench=true;
  p.used=false;
  p.isSurprise=true;
  bench.push(p);
  pushFeed("<b>"+L().cards[k].n+"</b> "+(tr?"yedek kulübesine geldi: ":"joins the bench: ")+shortName(p)+" · "+(tr?"Güç ":"Power ")+p.ov,"pres");
  if(typeof renderHub==="function")renderHub();
  return;
 }
 if(k==="nasip_kismet"){
  const coupon=v===1?8:5;
  lotteryCouponAmount=coupon;
  // The purchase round immediately decrements this counter at reward time.
  // Three ticks therefore cover the next two card-market rounds.
  lotteryCouponTurns=3;
  pushFeed("🎟️ <b>"+L().cards[k].n+"</b> "+(tr?"iki tur içinde alınacak bir kartta -€"+coupon+"M":"-€"+coupon+"M on one card bought within two rounds"),"buy");
  if(v===1&&rand()<0.20){applyCardCashPenalty(k,3);pushFeed("🎟️ "+(tr?"Piyango masrafı: -€3M":"Lottery cost: -€3M"),"lose");}
  return;
 }
 if(k==="yildiz_krizi"){
  const netPow=v===1?4:3;
  riskPowerMod+=netPow;
  pushFeed("⭐ <b>"+L().cards[k].n+"</b> "+(tr?"takım kenetlendi: +"+netPow+" güç":"squad rallied: +"+netPow+" power"),"pres");
  if(v===1&&rand()<0.20){applyCardCashPenalty(k,4);pushFeed("⭐ "+(tr?"Medya cezası: -€4M":"Media fine: -€4M"),"lose");}
  return;
 }
 if(k==="kasiga_para"){
  const debuff=v===1?8:4;
  const priceRise=v===1?0.50:0.25;
  if(typeof opponent!=="undefined"&&opponent)opponent.power=Math.max(1,opponent.power-debuff);
  shopBlocked=2;
  cardPriceMod=1+priceRise;cardPriceModTurns=3;
  if(v===1){chairTrust=Math.max(0,chairTrust-1);}
  pushFeed("🤑 <b>"+L().cards[k].n+"</b> "+(tr?"rakip -"+debuff+" güç · gelecek pazar kapalı · sonraki fiyat +%"+Math.round(priceRise*100):"opp -"+debuff+" power · next market closed · then prices +"+Math.round(priceRise*100)+"%")+(v===1?" · güven -1":""),"pres");
  return;
 }

 /* --- CONTRACT KART SATIN ALMA MESAJLARI --- */
 if(k==="taraftar"){
   const pow=cardEff(k,picksBySlot.filter(Boolean),round);
   pushFeed("📣 <b>"+L().cards[k].n+"</b> +"+pow+(tr?" güç (bu tur)":" power (this round)"),"buy");
  if(v===1&&rand()<0.25){chairTrust=Math.max(0,chairTrust-1);pushFeed("📣 "+(tr?"Taraftar baskısı — güven -1":"Fan pressure — trust -1"),"lose");}
  return;
 }
 if(k==="mac_sozu"){
  pushFeed("🤝 <b>"+L().cards[k].n+"</b> "+(tr?"maç öncesi temiz sayfa sözü açıldı":"pre-match clean-sheet promise unlocked"),"buy");
  return;
 }
 if(k==="kaptanin_karari"){
  pushFeed("© <b>"+L().cards[k].n+"</b> "+(tr?"olumsuz takım konuşması sonrası kullanıma hazır":"ready after a negative team talk"),"buy");
  return;
 }
 if(k==="kumarbaz"){return;} // yukarida islendi
 if(k==="sahte_evrak"){
  const pow=v===1?8:5;
  if(v===1){chairTrust=Math.max(0,chairTrust-1);pushFeed("📄 "+(tr?"Kontrat riski: güven -1":"Contract risk: trust -1"),"lose");}
  else if(rand()<0.18){chairTrust=Math.max(0,chairTrust-1);pushFeed("📄 "+(tr?"Başkan kontratı sorguladı: güven -1":"Chairman questioned the contract: trust -1"),"lose");}
  pushFeed("📄 <b>"+L().cards[k].n+"</b> +"+pow+(tr?" güç/tur (kontrat)":" power/turn (contract)"),"buy");
  return;
 }
 if(k==="doping"){
  const pow=v===1?9:6;
  const fineChance=v===1?20:25,fineAmt=v===1?18:10;
  if(v===1||rand()<0.20){chairTrust=Math.max(0,chairTrust-1);pushFeed("🧪 "+(tr?"Doping şüphesi: güven -1":"Doping suspicion: trust -1"),"lose");}
  pushFeed("🧪 <b>"+L().cards[k].n+"</b> +"+pow+(tr?" güç/tur; her tur %"+fineChance+" -€"+fineAmt+"M · en fazla 2 ceza":" power/round; "+fineChance+"% -€"+fineAmt+"M each round · max 2 fines")+(v===1?" · finalde -8":""),"pres");
  return;
 }
}

/* ===== Tur sonu risk kartlari ===== */
function processRiskCards(){
 const tr=LANG==="tr";
 /* Taksitli Transfer geri ödemeleri */
 if(installmentTurns>0){
  installmentTurns--;
  spend(installmentAmt,"spent");
  pushFeed("💳 "+(tr?"Taksitli Transfer ödemesi: -€":"Installment payment: -€")+installmentAmt+"M","lose");
  if(installmentTurns<=0)installmentAmt=0;
 }
 /* Kumarbaz taksit odemeleri */
 if(kumarbazInstallmentTurns>0){
  kumarbazInstallmentTurns--;
  spend(kumarbazInstallmentAmt,"spent");
  pushFeed("🎲 "+(tr?"Kumarbaz ödemesi: -€":"Gambler payment: -€")+kumarbazInstallmentAmt+"M","lose");
 }
 /* Son Kredi beklemede aktivasyon */
 if(lastCreditActive<0&&budget<-10){
  const v=variantOf("son_kredi");const gain=v===1?20:15;
  earn(gain,"earned");lastCreditActive=1;
  if(v===1){chairTrust=Math.max(0,chairTrust-1);}
  pushFeed("🆘 <b>"+(L().cards.son_kredi&&L().cards.son_kredi.n||"Son Kredi")+"</b> +€"+gain+"M"+(v===1?" · güven -1":""),"buy");
 }
 /* Doping ceza sansi */
 if(hasCard("doping")&&round>1&&Number(dopingInvestigationResolved||0)<2){
  const v=variantOf("doping");
  const fineChance=v===1?0.20:0.25,fineAmt=v===1?18:10;
  if(rand()<fineChance){
   dopingInvestigationResolved=Math.min(2,Number(dopingInvestigationResolved||0)+1);
   applyCardCashPenalty("doping",fineAmt);
   pushFeed("🧪 "+(tr?"Doping incelemesi cezası "+dopingInvestigationResolved+"/2: -€":"Doping investigation fine "+dopingInvestigationResolved+"/2: -€")+fineAmt+"M","lose");
  }
 }
 /* Gec Gec dark: sakatlık riski */
 if(hasCard("gec_gec")&&variantOf("gec_gec")===1&&rand()<0.25){
  const inj=applyRandomInjury(1);
  if(inj)pushFeed("🦺 "+(tr?"Barikat riski: ":"Barricade risk: ")+"<b>"+shortName(inj)+"</b>"+(tr?" sakatlandı":" injured"),"lose");
 }
}

/* ===== Gecici kart suresi doluyor ===== */
function expireTemporaryCards(){
 if(tempPrime>0){
  tempPrime=0;
  const injChance=(typeof window._geciciPrimV!=="undefined"&&window._geciciPrimV===1)?0.60:0.30;
  const penAmt=(typeof window._geciciPrimV!=="undefined"&&window._geciciPrimV===1)?2:2;
  tempPrimePenalty=-penAmt;
  cards=cards.filter(k=>k!=="gecici_prim");cardInv.gecici_prim=0;cardVariant.gecici_prim=0;
  if(rand()<injChance){const inj=applyRandomInjury(1);if(inj)pushFeed("🩺 <b>"+shortName(inj)+"</b> "+(LANG==="tr"?"Geçici Prim sonrası sakatlandı":"injured after Temporary Bonus"),"lose");}
  pushFeed("💸 "+(LANG==="tr"?"Geçici Prim bitti: sıradaki maç -"+penAmt+" güç":"Temporary Bonus expired: next match -"+penAmt+" power"),"lose");
  window._geciciPrimV=0;
 }
 if(shortCamp>0){
  const pen=typeof shortCamp==="number"?shortCamp:1;
  shortCamp=0;shortCampPenalty=-pen;
  cards=cards.filter(k=>k!=="kisa_kamp");cardInv.kisa_kamp=0;cardVariant.kisa_kamp=0;
  pushFeed("⛺ "+(LANG==="tr"?"Kısa Kamp bitti: sıradaki maç -"+pen+" güç":"Short Camp ended: next match -"+pen+" power"),"lose");
 }
}

/* ===== Kriz fonksiyonu — final oncesi cagrilir ===== */
function applyKriz(){
 if(!krizActive)return;
 krizActive=false;
 const v=krizVariant;krizVariant=0;
 /* Sigorta riski tamamen silmez; sabit tavan yerine toplam cezanın bir bölümünü telafi eder. */
 const rate=v===1?0.65:0.50;
 const cap=v===1?10:6;
 const cleared=Math.min(finalPenalty,cap,Math.ceil(finalPenalty*rate));
 finalPenalty=Math.max(0,finalPenalty-cleared);
 if(cleared>0)pushFeed("🧯 "+(LANG==="tr"?"Kriz Yönetimi: finalde -"+cleared+" güç telafi edildi.":"Crisis Management: -"+cleared+" final power offset."),"buy");
 else pushFeed("🧯 "+(LANG==="tr"?"Kriz Yönetimi: telafi edilecek final cezası yoktu.":"Crisis Management: no final penalty to offset."),"pres");
}

/* ===== Ana kart ekleme fonksiyonu. v=0 COMMON, v=1 DARK. ===== */
function addCard(k,v,opts){
 opts=opts||{};const silent=!!opts.silent,variant=v||0;
 const powerBefore=typeof squadPower==="function"?squadPower(round).power:0;
 const instant=isInstantCard(k);
 if(!instant&&invOf(k)>0){
   const refund=Math.max(1,Math.floor(cardPrice(k)*0.35));
   earn(refund,"earned");
   if(!silent)pushFeed("🃏 <b>"+L().cards[k].n+"</b> "+(LANG==="tr"?"zaten var · iade":"already owned · refund")+" €"+refund+"M","buy");
   return{added:false,refund};
 }
 cardInv[k]=1;cardVariant[k]=variant;
 if(typeof usedRiskCards!=="undefined"&&(variant===1||((typeof PRESIDENT_RISK_CARDS!=="undefined")&&PRESIDENT_RISK_CARDS.has(k)))&&!usedRiskCards.includes(k))usedRiskCards.push(k);
 if(!instant&&!hasCard(k)&&cards.length<activeCardSlots())cards.push(k);
 /* DARK variant: final guc cezasi — TUM modlar icin (instant dahil) */
 if(variant===1&&(KARA_PEN[k]||0)>0){
   const pen=KARA_PEN[k];
   const debt=typeof addFinalPenalty==="function"?addFinalPenalty(pen,k):{added:pen,overflow:0,cash:0};
   if(!silent)pushFeed("🖤 <b>"+L().cards[k].n+"</b> "+(LANG==="tr"?"DARK — finalde -"+debt.added+" güç":"DARK — -"+debt.added+" in the final")+(debt.overflow?(LANG==="tr"?" · fazla risk -€"+debt.cash+"M":" · excess risk -€"+debt.cash+"M"):""),"lose");
  }
 applyCardSecondaryCost(k,variant);
 applyDarkPurchaseRisk(k,variant);
 if(typeof trackCardAcquired==="function")trackCardAcquired(k,variant,opts);
 if(instant)applyRiskCardGain(k);
 /* Contract kartlar satin alindiginda ani etkilerini uygula */
 if(!instant&&cardMode(k)==="contract")applyRiskCardGain(k);
 if(typeof trackCardImpact==="function"){
  const powerAfter=typeof squadPower==="function"?squadPower(round).power:powerBefore;
  trackCardImpact(k,variant,powerAfter-powerBefore,Number(opts.price)||0);
 }
 if(instant){cardInv[k]=0;cardVariant[k]=0;cards=cards.filter(c=>c!==k);return{added:true,instant:true};}
 if(!silent)pushFeed("🃏 <b>"+L().cards[k].n+"</b> "+(LANG==="tr"?"aktif slota hazır":"ready for slot")+(variant>0?" · "+variantText(k):""),"ch");
 return{added:true};
}

/* Geriye donuk uyumluluk */
function addCardCopy(k,opts){return addCard(k,weightedVariant(),opts);}
