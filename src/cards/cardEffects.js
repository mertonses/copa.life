/* Kartlarin guce ve run durumuna etkileri — v3 */
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
 sahte_evrak:10,
 doping:6,
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

function resolveBlackMarketTrade(burnKey,variant){
 const tr=LANG==="tr";
 const oldName=(L().cards[burnKey]&&L().cards[burnKey].n)||burnKey;
 cards=cards.filter(k=>k!==burnKey);cardInv[burnKey]=0;cardVariant[burnKey]=0;
 const pool=CARDKEYS.filter(k=>k!=="kara_borsa"&&k!==burnKey&&invOf(k)<=0&&!isInstantCard(k));
 let gained=0;
 while(gained<2&&pool.length){
  const next=pool.splice(ri(0,pool.length-1),1)[0];
  addCard(next,variant===1?weightedVariant():0,{silent:true,freeSource:"kara_borsa"});
  gained++;
 }
 if(variant===1&&rand()<0.35){applyCardCashPenalty("kara_borsa",10);pushFeed(tr?"Kara Borsa riski: -\u20ac10M":"Black Market risk: -\u20ac10M","lose");}
 pushFeed("<b>"+((L().cards.kara_borsa&&L().cards.kara_borsa.n)||"Kara Borsa")+"</b> "+(tr?oldName+" yak\u0131ld\u0131, "+gained+" kart geldi.":oldName+" burned; "+gained+" cards arrived."),"buy");
 closeModal();if(typeof renderHub==="function")renderHub();
}
function openBlackMarketTrade(variant){
 const tr=LANG==="tr",choices=cards.filter(k=>k!=="kara_borsa"&&!isInstantCard(k));
 if(!choices.length){
  showModal(`<div class="bulletin"><button class="modal-x" onclick="closeModal()" aria-label="${tr?"Kapat":"Close"}">&times;</button><div class="bhead"><span>${tr?"KARA BORSA":"BLACK MARKET"}</span></div><div class="bhl">${tr?"YAKACAK KART YOK":"NO CARD TO BURN"}</div><div class="bbody">${tr?"Bu hamle için en az bir aktif kalıcı kart gerekir.":"This move requires at least one active persistent card."}</div></div>`,{dismissOnOverlay:true});
  return;
 }
 const list=choices.map(k=>`<button class="swap-card-btn" onclick="resolveBlackMarketTrade('${k}',${variant})"><span class="sc-name">${L().cards[k].n}</span><span class="sc-desc">${tr?"Bu kart\u0131 yak":"Burn this card"}</span></button>`).join("");
 showModal(`<div class="bulletin"><button class="modal-x" onclick="closeModal()" aria-label="${tr?"Kapat":"Close"}">&times;</button><div class="bhead"><span>${tr?"KARA BORSA":"BLACK MARKET"}</span></div><div class="bhl">${tr?"Bir kart\u0131 yak, iki kart al":"Burn one card, take two"}</div><div class="bbody">${tr?"Feda edece\u011fin kart\u0131 se\u00e7.":"Choose a card to sacrifice."}</div><div class="swap-list">${list}</div></div>`,{dismissOnOverlay:true});
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
  pushFeed("🍰 <b>"+L().cards[k].n+"</b> OV"+maxOV+" → +"+(pow+chairBoost)+(tr?" güç":" power"),"pres");
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

 /* --- OYUNCU OV BOOST (INSTANT) --- */
 if(k==="kaleci_kalesi"){
   const boost=v===1?9:5;
  const s=picksBySlot.filter(Boolean);
  const gk=s.find(p=>p.pos==="GK");
  if(gk){gk.ov=Math.min(99,gk.ov+boost);gk.eff=Math.min(99,gk.eff+boost);renderRoundel&&renderRoundel("h"+picksBySlot.indexOf(gk),gk);pushFeed("🧤 <b>"+L().cards[k].n+"</b> GK OV+"+boost,"buy");}
  if(v===1&&rand()<0.15){applyCardCashPenalty(k,15);pushFeed("🧤 "+(tr?"Transfer cezası: -€15M":"Transfer penalty: -€15M"),"lose");}
  return;
 }

 /* --- DEPLASMAN (INSTANT) --- */
 if(k==="deplasman_kafilesi"){
  const s=picksBySlot.filter(Boolean);
  const avg=s.length?Math.round(s.reduce((a,p)=>a+effOf(p),0)/s.length):0;
  const stronger=typeof opponent!=="undefined"&&opponent&&opponent.power>avg;
  if(v===1){
   if(stronger){riskPowerMod+=8;pushFeed("✈️ <b>"+L().cards[k].n+"</b> +8"+(tr?" güç":" power"),"pres");}
   else{if(rand()<0.5){riskPowerMod+=4;pushFeed("✈️ <b>"+L().cards[k].n+"</b> +4"+(tr?" güç (şans)":" power (luck)"),"pres");}else{riskPowerMod-=4;pushFeed("✈️ <b>"+L().cards[k].n+"</b> -4"+(tr?" güç (kötü deplasman)":" power (bad away)"),"lose");}}
  }else{
   const pow=stronger?4:2;riskPowerMod+=pow;
   pushFeed("✈️ <b>"+L().cards[k].n+"</b> +"+pow+(tr?" güç":" power"),"pres");
  }
  return;
 }

 /* --- KARA BORSA (INSTANT) --- */
 if(k==="kara_borsa"){
   openBlackMarketTrade(v);return;
   const count=v===1?2:1;
   const pool=CARDKEYS.filter(x=>x!==k&&invOf(x)<=0&&!isInstantCard(x));
   let added=0;
   for(let i=0;i<count&&pool.length;i++){const idx=ri(0,pool.length-1);const fk=pool.splice(idx,1)[0];addCard(fk,v===1&&i>0?weightedVariant():0,{silent:false,freeSource:"kara_borsa"});added++;}
   pushFeed("🖤 <b>"+L().cards[k].n+"</b> "+(tr?added+" bedava kart":added+" free cards"),"buy");
   if(v===1&&rand()<0.40){applyCardCashPenalty(k,10);pushFeed("🖤 "+(tr?"Kara Borsa cezası: -€10M":"Black Market fine: -€10M"),"lose");}
  return;
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
  const pow=v===1?8:4,pen=v===1?16:8;
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
  pushFeed("<b>"+L().cards[k].n+"</b> "+(tr?"yedek kulübesine geldi: ":"joins the bench: ")+shortName(p)+" OV"+p.ov,"pres");
  if(typeof renderHub==="function")renderHub();
  return;
 }
 if(k==="nasip_kismet"){
   const discount=v===1?0.60:0.75;
  // Bought this turn consumes the 1-card purchase, so the discount must land NEXT turn.
  // turns=2 survives the end-of-turn decrement and stays active through the next round's shopping.
  cardPriceMod=discount;cardPriceModTurns=2;
   pushFeed("🍀 <b>"+L().cards[k].n+"</b> "+(tr?"sonraki tur kart fiyatları "+(v===1?"-%40":"-%25"):"next round card prices "+(v===1?"-40%":"-25%")),"buy");
  if(v===1&&rand()<0.25){applyCardCashPenalty(k,4);pushFeed("🍀 "+(tr?"Talih cezası: -€4M":"Fate penalty: -€4M"),"lose");}
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
 if(k==="kumarbaz"){return;} // yukarida islendi
 if(k==="sahte_evrak"){
  const pow=v===1?10:6;
  if(v===1){chairTrust=Math.max(0,chairTrust-1);pushFeed("📄 "+(tr?"Evrak riski: güven -1":"Paperwork risk: trust -1"),"lose");}
  else if(rand()<0.18){chairTrust=Math.max(0,chairTrust-1);pushFeed("📄 "+(tr?"Başkan evrakı sorguladı: güven -1":"Chairman questioned the papers: trust -1"),"lose");}
  pushFeed("📄 <b>"+L().cards[k].n+"</b> +"+pow+(tr?" güç/tur (kontrat)":" power/turn (contract)"),"buy");
  return;
 }
 if(k==="doping"){
  const pow=v===1?10:6;
  const fineChance=v===1?25:35,fineAmt=v===1?25:15;
  if(v===1||rand()<0.20){chairTrust=Math.max(0,chairTrust-1);pushFeed("🧪 "+(tr?"Doping şüphesi: güven -1":"Doping suspicion: trust -1"),"lose");}
  pushFeed("🧪 <b>"+L().cards[k].n+"</b> +"+pow+(tr?" güç/tur; %"+fineChance+" -€"+fineAmt+"M":" power/turn; "+fineChance+"% -€"+fineAmt+"M")+(v===1?" · finalde -6":""),"pres");
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
 if(hasCard("doping")&&round>1){
  const v=variantOf("doping");
  const fineChance=v===1?0.25:0.35,fineAmt=v===1?25:15;
  if(rand()<fineChance){applyCardCashPenalty("doping",fineAmt);pushFeed("🧪 "+(tr?"Doping incelemesi: -€":"Doping review: -€")+fineAmt+"M","lose");}
 }
 /* Gec Gec dark: sakatlık riski */
 if(hasCard("gec_gec")&&variantOf("gec_gec")===1&&rand()<0.25){
  const inj=applyRandomInjury(1);
  if(inj)pushFeed("🦺 "+(tr?"Geç Geçebilirsen riski: ":"Defensive wall risk: ")+"<b>"+shortName(inj)+"</b>"+(tr?" sakatlandı":" injured"),"lose");
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
 const rate=v===1?0.75:0.50;
 const cleared=Math.min(finalPenalty,Math.ceil(finalPenalty*rate));
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
