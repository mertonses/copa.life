/* Kartlarin guce ve run durumuna etkileri. */
function squadBasePower(){const s=picksBySlot.filter(Boolean);return s.length?Math.round(s.reduce((a,p)=>a+effOf(p),0)/s.length):0;}

/* Variant guc bonuslari — altin/kara */
var VARIANT_BONUS=[1,3];

/* Kara variant'ta finalde dususecek guc (satin almada eklenir) */
var KARA_PEN={
 taraftar:1,genc:1,ch_momentum:1,kontra:2,buyuk_mac:1,yildiz:2,
 otobus:1,kaleci_kalesi:2,anadolu:1,altyapi_plani:1,tecrubeli_omurga:1,
 veteran:2,yerli_blok:1,kanat_akini:1,cift_forvet:1,
 derbi:3,ch_final:2,final_provasi:2,kupaci_kadro:2,son_dans:3,
 deplasman_kafilesi:1,sosyal_medya:1,
 sahte_evrak:3,kumarbaz:2,doping:3,
 kaynasma:1,gec_gec:1
};

function cardEff(k,s,r){
 const v=variantOf(k),base=CARDDEFS[k].eff(s,r);
 const bonus=isProgressCard(k)?VARIANT_BONUS[v]||0:0;
 /* Ozel variant kosullu kartlar (eskiden tier skalasi) */
 if(k==="kontra")return base+bonus+(cnt(s,FWDP)>=3?2:0)+(v>=1&&opponent&&opponent.power>squadBasePower()?3:0);
 if(k==="anadolu")return base+bonus+(s.filter(p=>p.tr).length>=6?3:0)+(v>=1?Math.floor(Math.max(0,budget)/18)+3:0);
 if(k==="veteran")return base+bonus+Math.min(3,s.filter(p=>p.age>=32).length)+(v>=1&&(talkUsed||r>=5)?3:0);
 if(k==="cift_forvet")return base+bonus+(s.filter(p=>p.pos==="ST").length>=2?1:0);
 return base+bonus;
}

const BET_SPONSOR_GAIN=16,BET_SPONSOR_DEBT=8,BET_SPONSOR_LOSS=24,BET_SPONSOR_LOSS_CHANCE=0.20,
      DOPING_POWER=8,DOPING_FINE=15,DOPING_FINE_CHANCE=0.35,
      TEMP_PRIME_POWER=8,TEMP_PRIME_INJURY_CHANCE=0.35,TEMP_PRIME_NEXT_PENALTY=2,
      INSTALLMENT_GAIN=10,INSTALLMENT_PAY=4,INSTALLMENT_TURNS=2,
      BLACK_MARKET_FINE=12,BLACK_MARKET_FINE_CHANCE=0.40,
      LAST_CREDIT_GAIN=15,LAST_CREDIT_TIGHTEN=5,
      FAKE_DOC_DEBT=6,FINAL_PROVA_COST=4,KUPA_DEBT=2,AWAY_TRIP_COST=3;

function applyRiskCardGain(k){
 if(k==="kumarbaz"){earn(BET_SPONSOR_GAIN,"earned");finalPenalty=Math.min(FINAL_DEBT_CAP,finalPenalty+BET_SPONSOR_DEBT);pushFeed("\u{1f3b2} <b>"+L().cards[k].n+"</b> +€"+BET_SPONSOR_GAIN+"M, finalde -"+BET_SPONSOR_DEBT+" güç","pres");}
 if(k==="gecici_prim"){tempPrime=1;riskPowerMod+=TEMP_PRIME_POWER;pushFeed("\u{1f4b8} <b>"+L().cards[k].n+"</b> "+(LANG==="tr"?"bu maç +8 güç; sonra %35 sakatlık, sıradaki maç -2":"this match +8; then 35% injury, next match -2"),"pres");}
 if(k==="doping"){pushFeed("\u{1f9ea} <b>"+L().cards[k].n+"</b> +"+DOPING_POWER+" güç, her tur %35 ihtimal -€"+DOPING_FINE+"M","lose");}
 if(k==="kriz"){const d=Math.min(6,finalPenalty);finalPenalty-=d;pushFeed("\u{1f9ef} <b>"+L().cards[k].n+"</b> finaldeki güç eksiği -"+d,"pres");}
 if(k==="kisa_kamp"){shortCamp=1;riskPowerMod+=4;pushFeed("\u{26fa} <b>"+L().cards[k].n+"</b> "+(LANG==="tr"?"bu maç +4, sonraki maç -1":"this match +4; next match -1"),"pres");}
 if(k==="taksit_transfer"){earn(INSTALLMENT_GAIN,"earned");installmentTurns+=INSTALLMENT_TURNS;pushFeed("\u{1f4b3} <b>"+L().cards[k].n+"</b> +€"+INSTALLMENT_GAIN+"M, 2 tur -€"+INSTALLMENT_PAY+"M","buy");}
 if(k==="kara_borsa"){const pool=CARDKEYS.filter(x=>x!==k&&invOf(x)<=0);if(pool.length){const free=rnd(pool);addCard(free,weightedVariant(),{silent:false});pushFeed("\u{1f5a4} <b>"+L().cards[k].n+"</b> bedava kart: <b>"+L().cards[free].n+"</b>","buy");}if(rand()<BLACK_MARKET_FINE_CHANCE){spend(BLACK_MARKET_FINE,"spent");pushFeed("\u{1f6a8} "+(LANG==="tr"?"Kara Borsa cezası: -€":"Black Market fine: -€")+BLACK_MARKET_FINE+"M","lose");}}
 if(k==="sahte_evrak"){finalPenalty=Math.min(FINAL_DEBT_CAP,finalPenalty+FAKE_DOC_DEBT);pushFeed("\u{1f4c4} <b>"+L().cards[k].n+"</b> +6 güç, finalde -"+FAKE_DOC_DEBT+" güç","lose");}
 if(k==="son_kredi"){if(budget<-10&&!lastCreditActive){earn(LAST_CREDIT_GAIN,"earned");lastCreditActive=1;pushFeed("\u{1f198} <b>"+L().cards[k].n+"</b> +€"+LAST_CREDIT_GAIN+"M, başkan eşiği +"+LAST_CREDIT_TIGHTEN,"buy");}else{lastCreditActive=-1;pushFeed("\u{1f198} <b>"+L().cards[k].n+"</b> "+(LANG==="tr"?"kasa -10M altına inerse çalışır":"works if funds drop below -10M"),"pres");}}
 if(k==="deplasman_kafilesi"){spend(AWAY_TRIP_COST,"spent");pushFeed("\u{1f68c} <b>"+L().cards[k].n+"</b> -€"+AWAY_TRIP_COST+"M, güçlü rakibe +4","pres");}
 if(k==="final_provasi"){spend(FINAL_PROVA_COST,"spent");pushFeed("\u{1f3df} <b>"+L().cards[k].n+"</b> şimdi -€"+FINAL_PROVA_COST+"M, finalde +5","pres");}
 if(k==="kupaci_kadro"){finalPenalty=Math.min(FINAL_DEBT_CAP,finalPenalty+KUPA_DEBT);pushFeed("\u{1f3c6} <b>"+L().cards[k].n+"</b> YF/final +4, finalde -"+KUPA_DEBT+" güç","lose");}
 if(k==="cilgin_basin"){if(rand()<0.65){earn(20,"earned");pushFeed("\u{1f4f0} <b>"+L().cards[k].n+"</b> "+(LANG==="tr"?"medya baskısı işe yaradı: +€20M":"press worked in our favour: +€20M"),"buy");}else{spend(8,"spent");pushFeed("\u{1f4f0} <b>"+L().cards[k].n+"</b> "+(LANG==="tr"?"medya baskısı ters tepti: -€8M":"press backfired: -€8M"),"lose");}}
 if(k==="kurban_belli"){
  const v=variantOf(k);
  const pow=v===1?10:6;
  riskPowerMod+=pow;
  kurbanScheduled={count:v===1?2:1,turns:v===1?2:1};
  pushFeed("\u{1f52a} <b>"+L().cards[k].n+"</b> +"+(pow)+(LANG==="tr"?" güç, tur sonu bedel — "+kurbanScheduled.count+" sakatlık bekliyor":" power — "+kurbanScheduled.count+" injury(ies) pending"),"pres");
 }
 if(k==="primler_yatinca"){
  const v=variantOf(k);
  const pow=v===1?9:4;
  const pen=v===1?15:8;
  riskPowerMod+=pow;
  deferredBudgetPenalty+=pen;
  pushFeed("\u{1f4b8} <b>"+L().cards[k].n+"</b> +"+(pow)+(LANG==="tr"?" güç, gelecek tur -€":" power, next turn -€")+pen+"M","pres");
 }
 if(k==="vur_igneyi"){
  if(injuredIdx<0){pushFeed("\u{1f489} <b>"+L().cards[k].n+"</b> "+(LANG==="tr"?"sakat oyuncu yok":"no injured player"),"lose");return;}
  const v=variantOf(k);
  const pow=v===1?5:2;
  const extraTurns=v===1?2:1;
  riskPowerMod+=pow;
  const _inj=picksBySlot[injuredIdx];
  if(_inj){_inj.injured=Math.max(0,(_inj.injured||0)+extraTurns);}
  pushFeed("\u{1f489} <b>"+L().cards[k].n+"</b> "+(LANG==="tr"?"sakat oyuncu sahada":"injured player on pitch")+" +"+pow+(LANG==="tr"?" güç, sakatlık +":" power, injury +")+extraTurns+(LANG==="tr"?" tur":" turn(s)"),"pres");
 }
 if(k==="bu_adam"){
  const v=variantOf(k);
  const minOV=v===1?80:70,maxOV=v===1?89:79;
  const commission=v===1?10:0;
  const emptySlot=picksBySlot.findIndex(p=>!p);
  const slotIdx=emptySlot>=0?emptySlot:picksBySlot.length-1;
  const displaced=picksBySlot[slotIdx]||null;
  const positions=["ST","CM","CB","GK","LW","RW","LM","RM","WB","CDM","CAM"];
  const pos=positions[ri(0,positions.length-1)];
  const ov=ri(minOV,maxOV);
  const tempP={name:"Misafir",sur:"Misafir "+ov,age:ri(25,32),pos,ov,tr:false,eff:Math.round(ov*0.95),isTemp:true};
  picksBySlot[slotIdx]=tempP;
  renderRoundel("h"+slotIdx,tempP);
  if(commission>0){spend(commission,"spent");}
  loanPlayer={...tempP,loanCost:commission,turnsLeft:1,slotIdx,displaced};
  pushFeed("⚡ <b>"+L().cards[k].n+"</b> OV"+ov+" "+pos+(LANG==="tr"?" 1 tur sahada":" on pitch for 1 turn")+(commission>0?" -€"+commission+"M":""),"pres");
 }
 if(k==="eski_kurt"){
  const v=variantOf(k);
  const minAge=v===1?32:30;
  const pow=v===1?12:8;
  const pen=v===1?6:2;
  const elder=picksBySlot.map((p,i)=>({p,i})).filter(x=>x.p&&x.p.age>=minAge);
  if(!elder.length){pushFeed("\u{1f9d3} <b>"+L().cards[k].n+"</b> "+(LANG==="tr"?minAge+"+ oyuncu yok":minAge+"+ player needed"),"lose");return;}
  const target=elder[ri(0,elder.length-1)];
  riskPowerMod+=pow;
  eskiKurtSlotIdx=target.i;
  eskiKurtPenalty=pen;
  pushFeed("\u{1f9d3} <b>"+L().cards[k].n+"</b> <b>"+shortName(target.p)+"</b> +"+pow+(LANG==="tr"?" güç, tur sonu OV -":" power, turn end OV -")+pen,"pres");
 }
 if(k==="nasip_kismet"){
  const v=variantOf(k);
  const drawCount=v===1?2:1;
  const freePool=CARDKEYS.filter(x=>invOf(x)<=0&&!isInstantCard(x));
  let drawn=0;
  while(drawn<drawCount&&freePool.length){const fi=ri(0,freePool.length-1);const fk=freePool.splice(fi,1)[0];addCard(fk,weightedVariant(),{silent:false});drawn++;}
  if(v===1){cardPriceMod=1.6;cardPriceModTurns=1;presidentBlocked=1;pushFeed("\u{1f340} <b>"+L().cards[k].n+"</b> "+drawn+(LANG==="tr"?" bedava kart · fiyatlar +%60 · başkan kapalı":" free card(s) · prices +60% · president unavailable"),"pres");}
  else{cardPriceMod=0.8;cardPriceModTurns=2;pushFeed("\u{1f340} <b>"+L().cards[k].n+"</b> "+drawn+(LANG==="tr"?" bedava kart · 2 tur fiyatlar -%20":" free card · prices -20% for 2 turns"),"buy");}
 }
 if(k==="yildiz_krizi"){
  const v=variantOf(k);
  const s=picksBySlot.filter(Boolean);
  if(!s.length)return;
  let bestIdx=-1,bestEff=0;
  picksBySlot.forEach((p,i)=>{if(p&&p.eff>bestEff){bestEff=p.eff;bestIdx=i;}});
  if(bestIdx<0)return;
  const best=picksBySlot[bestIdx];
  if(v===1){
   const domestic=s.filter(p=>p.tr&&p!==best).length;
   const netPow=domestic*3-Math.round(best.eff);
   riskPowerMod+=netPow;
   if(rand()<0.20){spend(10,"spent");pushFeed("⚡ "+(LANG==="tr"?"Yıldız Krizi: medya cezası -€10M":"Star Crisis: media fine -€10M"),"lose");}
   pushFeed("⭐ <b>"+L().cards[k].n+"</b> <b>"+shortName(best)+"</b> "+(LANG==="tr"?"dışarıda · "+domestic+" yerli +"+(domestic*3)+" güç":"out · "+domestic+" domestic +"+(domestic*3)+" power"),"pres");
  } else {
   const restCount=s.length-1;
   const netPow=restCount*2-Math.round(best.eff);
   riskPowerMod+=netPow;
   pushFeed("⭐ <b>"+L().cards[k].n+"</b> <b>"+shortName(best)+"</b> "+(LANG==="tr"?"dışarıda · kalan "+restCount+" oyuncu +"+(restCount*2)+" güç":"out · rest +"+restCount*2+" power"),"pres");
  }
 }
 if(k==="kasiga_para"){
  const v=variantOf(k);
  const debuff=v===1?8:4;
  if(opponent)opponent.power=Math.max(1,opponent.power-debuff);
  shopBlocked=1;
  if(v===1){presidentBlocked=1;deferredPowerPenalty=3;}
  pushFeed("\u{1f911} <b>"+L().cards[k].n+"</b> "+(LANG==="tr"?"rakip -"+debuff+" güç · gelecek tur pazar kapalı":"opponent -"+debuff+" power · next turn market closed")+(v===1?" · "+(LANG==="tr"?"başkan kapalı":"president unavailable"):""),"pres");
 }
}

function processRiskCards(){
 if(installmentTurns>0){installmentTurns--;spend(INSTALLMENT_PAY,"spent");pushFeed("\u{1f4b3} "+(LANG==="tr"?"Taksitli Transfer ödemesi: -€":"Installment payment: -€")+INSTALLMENT_PAY+"M","lose");}
 if(lastCreditActive<0&&budget<-10){earn(LAST_CREDIT_GAIN,"earned");lastCreditActive=1;pushFeed("\u{1f198} <b>"+L().cards.son_kredi.n+"</b> +€"+LAST_CREDIT_GAIN+"M, "+(LANG==="tr"?"başkan eşiği 5M sertleşti":"chairman limit tightened 5M"),"buy");}
 if(hasCard("kumarbaz")&&round>1&&rand()<BET_SPONSOR_LOSS_CHANCE){spend(BET_SPONSOR_LOSS,"spent");pushFeed("\u{1f4c9} "+(LANG==="tr"?"Bahis Sponsoru patladı: -€":"Bet Sponsor collapsed: -€")+BET_SPONSOR_LOSS+"M","lose");}
 if(hasCard("doping")&&round>1&&rand()<DOPING_FINE_CHANCE){spend(DOPING_FINE,"spent");pushFeed("\u{1f9ea} "+(LANG==="tr"?"Doping incelemesi: -€":"Doping review: -€")+DOPING_FINE+"M","lose");}
 if(hasCard("gec_gec")&&variantOf("gec_gec")===1&&rand()<0.25){
  const inj=applyRandomInjury(1);
  if(inj)pushFeed("\u{1f9ba} "+(LANG==="tr"?"Geç Geçebilirsen riski: ":"Defensive wall risk: ")+"<b>"+shortName(inj)+"</b>"+(LANG==="tr"?" sakatlandı":" injured"),"lose");
 }
}

function expireTemporaryCards(){
 if(tempPrime>0){tempPrime=0;tempPrimePenalty=-TEMP_PRIME_NEXT_PENALTY;cards=cards.filter(k=>k!=="gecici_prim");cardInv.gecici_prim=0;cardVariant.gecici_prim=0;if(rand()<TEMP_PRIME_INJURY_CHANCE){const inj=applyRandomInjury(1);if(inj)pushFeed("\u{1fa79} <b>"+shortName(inj)+"</b> "+(LANG==="tr"?"Geçici Prim sonrası sakatlandı":"was injured after Temporary Bonus"),"lose");}pushFeed("\u{1f4b8} "+(LANG==="tr"?"Geçici Prim bitti: sıradaki maç -2 güç":"Temporary Bonus expired: next match -2 power"),"lose");}
 if(shortCamp>0){shortCamp=0;shortCampPenalty=-1;cards=cards.filter(k=>k!=="kisa_kamp");cardInv.kisa_kamp=0;cardVariant.kisa_kamp=0;pushFeed("\u{26fa} "+(LANG==="tr"?"Kısa Kamp bitti: sıradaki maç -1 güç":"Short Camp ended: next match -1 power"),"lose");}
}

/* Ana kart ekleme fonksiyonu. v=0..3 (variant). */
function addCard(k,v,opts){
 opts=opts||{};const silent=!!opts.silent,variant=v||0;
 const instant=isInstantCard(k);
 if(!instant&&invOf(k)>0){
   const refund=Math.max(3,Math.floor(cardPrice(k)*0.35));
   earn(refund,"earned");
   if(!silent)pushFeed("\u{1f0cf} <b>"+L().cards[k].n+"</b> "+(LANG==="tr"?"zaten var · iade":"already owned · refund")+" €"+refund+"M","buy");
   return{added:false,refund};
 }
 cardInv[k]=1;cardVariant[k]=variant;
 if(!instant&&!hasCard(k)&&cards.length<activeCardSlots())cards.push(k);
 /* Kara variant: final guc cezasi uygula */
 if(variant===1&&!isInstantCard(k)&&(KARA_PEN[k]||0)>0){
   const pen=KARA_PEN[k];
   finalPenalty=Math.min(FINAL_DEBT_CAP,finalPenalty+pen);
   if(!silent)pushFeed("\u{1f5a4} <b>"+L().cards[k].n+"</b> "+(LANG==="tr"?"KARA — finalde -"+pen+" güç (lanetli)":"DARK — -"+pen+" in the final (cursed)"),"lose");
 }
 if(variant===1&&k==="kaynasma")kaynasmaDark=true;
 if(instant)applyRiskCardGain(k);
 /* Contract kartlar satin alindiginda ani etkilerini uygula */
 if(!instant&&cardMode(k)==="contract")applyRiskCardGain(k);
 if(instant){cardInv[k]=0;cardVariant[k]=0;cards=cards.filter(c=>c!==k);return{added:true,instant:true};}
 if(!silent)pushFeed("\u{1f0cf} <b>"+L().cards[k].n+"</b> "+(LANG==="tr"?"aktif slota hazır":"ready for slot")+(variant>0?" · "+variantText(k):""),"ch");
 return{added:true};
}

/* Geriye donuk uyumluluk — random variant atar */
function addCardCopy(k,opts){return addCard(k,weightedVariant(),opts);}
