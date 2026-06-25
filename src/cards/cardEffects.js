/* Kartlarin guce ve run durumuna etkileri. */
function squadBasePower(){const s=picksBySlot.filter(Boolean);return s.length?Math.round(s.reduce((a,p)=>a+effOf(p),0)/s.length):0;}
function cardEff(k,s,r){
 const t=tierOf(k),base=CARDDEFS[k].eff(s,r);
 const noTierPower=[
  "genc","otobus","yildiz","derbi",
  "temiz_sayfa","kisa_kamp","yedek_guvence","taksit_transfer","kara_borsa","sahte_evrak","son_kredi",
  "altyapi_plani","tecrubeli_omurga","yerli_blok","kanat_akini","deplasman_kafilesi","sosyal_medya",
  "sessiz_kamp","final_provasi","kupaci_kadro","sogukkanli_penaltici","son_dans",
  "kumarbaz","gecici_prim","doping","kriz"
 ];
 if(noTierPower.includes(k))return base;
 if(k==="kontra")return base+(t>=1&&cnt(s,FWDP)>=3?2:0)+(t>=2&&opponent&&opponent.power>squadBasePower()?3:0)+(t>=3?Math.min(3,cnt(s,MIDP)):0);
 if(k==="anadolu")return base+(t>=1&&s.filter(p=>p.tr).length>=6?3:0)+(t>=2?Math.floor(Math.max(0,budget)/18):0)+(t>=3?3:0);
 if(k==="veteran")return base+(t>=1?Math.min(3,s.filter(p=>p.age>=32).length):0)+(t>=2&&talkUsed?2:0)+(t>=3&&r>=5?4:0);
 return base+t;
}
const BET_SPONSOR_GAIN=16,BET_SPONSOR_DEBT=8,BET_SPONSOR_LOSS=24,BET_SPONSOR_LOSS_CHANCE=0.20,DOPING_POWER=10,DOPING_FINE=15,DOPING_FINE_CHANCE=0.25,TEMP_PRIME_POWER=8,TEMP_PRIME_INJURY_CHANCE=0.35,TEMP_PRIME_NEXT_PENALTY=2,INSTALLMENT_GAIN=10,INSTALLMENT_PAY=4,INSTALLMENT_TURNS=2,BLACK_MARKET_FINE=12,BLACK_MARKET_FINE_CHANCE=0.30,LAST_CREDIT_GAIN=15,LAST_CREDIT_TIGHTEN=5,FAKE_DOC_DEBT=6,FINAL_PROVA_COST=8,KUPA_DEBT=4,AWAY_TRIP_COST=5;
function applyRiskCardGain(k){
 if(k==="kumarbaz"){earn(BET_SPONSOR_GAIN,"earned");finalPenalty=Math.min(FINAL_DEBT_CAP,finalPenalty+BET_SPONSOR_DEBT);pushFeed("\u{1f3b2} <b>"+L().cards[k].n+"</b> +\u20ac"+BET_SPONSOR_GAIN+"M, finalde -"+BET_SPONSOR_DEBT+" güç","pres");}
 if(k==="gecici_prim"){tempPrime=1;riskPowerMod+=TEMP_PRIME_POWER;pushFeed("\u{1f4b8} <b>"+L().cards[k].n+"</b> "+(LANG==="tr"?"bu maç +8 güç; sonra %35 sakatlık, sıradaki maç -2":"this match +8; then 35% injury, next match -2"),"pres");}
 if(k==="doping"){pushFeed("\u{1f9ea} <b>"+L().cards[k].n+"</b> +"+DOPING_POWER+" güç, her tur %25 ihtimal -\u20ac"+DOPING_FINE+"M","lose");}
 if(k==="kriz"){const d=Math.min(6,finalPenalty);finalPenalty-=d;pushFeed("\u{1f9ef} <b>"+L().cards[k].n+"</b> finaldeki güç eksiği -"+d,"pres");}
 if(k==="kisa_kamp"){shortCamp=1;riskPowerMod+=2;pushFeed("\u{26fa} <b>"+L().cards[k].n+"</b> bu maç +2, sonraki maç -1","pres");}
 if(k==="taksit_transfer"){earn(INSTALLMENT_GAIN,"earned");installmentTurns+=INSTALLMENT_TURNS;pushFeed("\u{1f4b3} <b>"+L().cards[k].n+"</b> +\u20ac"+INSTALLMENT_GAIN+"M, 2 tur -\u20ac"+INSTALLMENT_PAY+"M","buy");}
 if(k==="kara_borsa"){const pool=CARDKEYS.filter(x=>x!==k&&invOf(x)<MAX_CARD_COPIES);if(pool.length){const free=rnd(pool);addCardCopy(free,{silent:false});pushFeed("\u{1f5a4} <b>"+L().cards[k].n+"</b> bedava kart: <b>"+L().cards[free].n+"</b>","buy");}if(rand()<BLACK_MARKET_FINE_CHANCE){spend(BLACK_MARKET_FINE,"spent");pushFeed("\u{1f6a8} "+(LANG==="tr"?"Kara Borsa cezası: -\u20ac":"Black Market fine: -\u20ac")+BLACK_MARKET_FINE+"M","lose");}}
 if(k==="sahte_evrak"){finalPenalty=Math.min(FINAL_DEBT_CAP,finalPenalty+FAKE_DOC_DEBT);pushFeed("\u{1f4c4} <b>"+L().cards[k].n+"</b> +6 güç, finalde -"+FAKE_DOC_DEBT+" güç","lose");}
 if(k==="son_kredi"){if(budget<-10&&!lastCreditActive){earn(LAST_CREDIT_GAIN,"earned");lastCreditActive=1;pushFeed("\u{1f198} <b>"+L().cards[k].n+"</b> +\u20ac"+LAST_CREDIT_GAIN+"M, başkan eşiği +"+LAST_CREDIT_TIGHTEN,"buy");}else{lastCreditActive=-1;pushFeed("\u{1f198} <b>"+L().cards[k].n+"</b> "+(LANG==="tr"?"kasa -10M altına inerse çalışır":"works if funds drop below -10M"),"pres");}}
 if(k==="deplasman_kafilesi"){spend(AWAY_TRIP_COST,"spent");pushFeed("\u{1f68c} <b>"+L().cards[k].n+"</b> -\u20ac"+AWAY_TRIP_COST+"M, güçlü rakibe +4","pres");}
 if(k==="sessiz_kamp"){quietCamp=1;pushFeed("\u{1f910} <b>"+L().cards[k].n+"</b> başkan baskısı 1 maç kapalı","pres");}
 if(k==="final_provasi"){spend(FINAL_PROVA_COST,"spent");pushFeed("\u{1f3df} <b>"+L().cards[k].n+"</b> şimdi -\u20ac"+FINAL_PROVA_COST+"M, final +5","pres");}
 if(k==="kupaci_kadro"){finalPenalty=Math.min(FINAL_DEBT_CAP,finalPenalty+KUPA_DEBT);pushFeed("\u{1f3c6} <b>"+L().cards[k].n+"</b> YF/final +3, finalde -"+KUPA_DEBT+" güç","lose");}
}
function processRiskCards(){
 if(installmentTurns>0){installmentTurns--;spend(INSTALLMENT_PAY,"spent");pushFeed("\u{1f4b3} "+(LANG==="tr"?"Taksitli Transfer ödemesi: -\u20ac":"Installment payment: -\u20ac")+INSTALLMENT_PAY+"M","lose");}
 if(lastCreditActive<0&&budget<-10){earn(LAST_CREDIT_GAIN,"earned");lastCreditActive=1;pushFeed("\u{1f198} <b>"+L().cards.son_kredi.n+"</b> +\u20ac"+LAST_CREDIT_GAIN+"M, "+(LANG==="tr"?"başkan eşiği 5M sertleşti":"chairman limit tightened 5M"),"buy");}
 if(hasCard("kumarbaz")&&round>1&&rand()<BET_SPONSOR_LOSS_CHANCE){spend(BET_SPONSOR_LOSS,"spent");pushFeed("\u{1f4c9} "+(LANG==="tr"?"Bahis Sponsoru patladı: -\u20ac":"Bet Sponsor collapsed: -\u20ac")+BET_SPONSOR_LOSS+"M","lose");}
 if(hasCard("doping")&&round>1&&rand()<DOPING_FINE_CHANCE){spend(DOPING_FINE,"spent");pushFeed("\u{1f9ea} "+(LANG==="tr"?"Doping incelemesi: -\u20ac":"Doping review: -\u20ac")+DOPING_FINE+"M","lose");}
}
function expireTemporaryCards(){
 if(tempPrime>0){tempPrime=0;tempPrimePenalty=-TEMP_PRIME_NEXT_PENALTY;cards=cards.filter(k=>k!=="gecici_prim");cardInv.gecici_prim=0;cardTier.gecici_prim=0;if(rand()<TEMP_PRIME_INJURY_CHANCE){const inj=applyRandomInjury(1);if(inj)pushFeed("\u{1fa79} <b>"+shortName(inj)+"</b> "+(LANG==="tr"?"Geçici Prim sonrası sakatlandı":"was injured after Temporary Bonus"),"lose");}pushFeed("\u{1f4b8} "+(LANG==="tr"?"Geçici Prim bitti: sıradaki maç -2 güç":"Temporary Bonus expired: next match -2 power"),"lose");}
 if(shortCamp>0){shortCamp=0;shortCampPenalty=-1;cards=cards.filter(k=>k!=="kisa_kamp");cardInv.kisa_kamp=0;cardTier.kisa_kamp=0;pushFeed("\u{26fa} "+(LANG==="tr"?"Kısa Kamp bitti: sıradaki maç -1 güç":"Short Camp ended: next match -1 power"),"lose");}
 if(quietCamp>0){quietCamp=0;cards=cards.filter(k=>k!=="sessiz_kamp");cardInv.sessiz_kamp=0;cardTier.sessiz_kamp=0;pushFeed("\u{1f910} "+(LANG==="tr"?"Sessiz Kamp sona erdi":"Quiet Camp ended"),"pres");}
}
function tryUpgradeCard(k){const nt=tierFromCopies(invOf(k));if(nt>tierOf(k)){cardTier[k]=nt;pushFeed("UP <b>"+L().cards[k].n+"</b> "+tierText(k),"ch");return true;}return false;}
function addCardCopy(k,opts){opts=opts||{};const silent=!!opts.silent,first=invOf(k)<=0,instant=isInstantCard(k),progress=isProgressCard(k);if(progress&&invOf(k)>=MAX_CARD_COPIES){const r=duplicateRefund(k);earn(r,"earned");if(!silent)pushFeed("CARD <b>"+L().cards[k].n+"</b> "+(LANG==="tr"?"zaten maksimum \u00b7 iade":"already maxed \u00b7 refund")+" \u20ac"+r+"M","buy");return {added:false,refund:r,maxed:true};}cardInv[k]=progress?invOf(k)+1:1;if(!instant&&!hasCard(k)&&cards.length<activeCardSlots())cards.push(k);const upgraded=progress?tryUpgradeCard(k):false;if(first||instant)applyRiskCardGain(k);if(instant){cardInv[k]=0;cardTier[k]=0;cards=cards.filter(c=>c!==k);return {added:true,instant:true};}if(canActivate(k)&&!upgraded&&!silent)pushFeed("CARD <b>"+L().cards[k].n+"</b> "+(LANG==="tr"?"aktif slota hazır":"ready for slot"),"ch");return {added:true,upgraded};}
