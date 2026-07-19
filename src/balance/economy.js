/* Kart pazari teklifleri ve kart satin alma ekonomisi. */
function cardMarketEligible(k,targetRound){
 const r=Math.max(1,Math.min(6,Number(targetRound)||round||1));
 if(invOf(k)>0)return false;
 if(k==="taksit_transfer"&&typeof installmentTurns!=="undefined"&&installmentTurns>0)return false;
 if(k==="kumarbaz"&&typeof kumarbazInstallmentTurns!=="undefined"&&kumarbazInstallmentTurns>0)return false;
 if((k==="kurban_belli"||k==="kumarbaz")&&r>=6)return false;
 if(cardKind(k)==="final"&&r<5)return false;
 if(r>=6&&cardKind(k)!=="final")return false;
 return true;
}
function eligibleMarketCardPool(targetRound,options){
 const opts=options||{},excluded=new Set(opts.exclude||[]);
 return CARDKEYS.filter(k=>cardMarketEligible(k,targetRound)&&!excluded.has(k)&&(!opts.persistentOnly||!isInstantCard(k)));
}
function cardMarketWeight(k,targetRound){
 const r=Math.max(1,Math.min(6,Number(targetRound)||round||1)),kind=cardKind(k);
 let weight=1;
 if(r<=2)weight=kind==="squad"||kind==="economy"||kind==="power"?4:(kind==="defense"?2:.35);
 else if(r<=4)weight=kind==="squad"||kind==="power"||kind==="defense"?3:(kind==="economy"?2:1);
 else if(r===5)weight=kind==="final"?5:(kind==="risk"||kind==="temporary"?2:1);
 else weight=6;
 if(typeof chairman!=="undefined"&&chairman&&chairman.id==="sansasyoncu"&&(k==="yildiz"||k==="buyuk_mac"||kind==="final"))weight*=1.8;
 return weight;
}
function newShopOffers(){
 shopOffers=[];
 shopVariants={};
 shopPriceChaos={};
 if(shopBlocked>0)return; // market is closed
 const pool=[];
 eligibleMarketCardPool(round).forEach(k=>{
   const weight=cardMarketWeight(k,round);
   for(let i=0;i<Math.max(1,Math.round(weight));i++)pool.push(k);
 });
 const limit=2;
 while(shopOffers.length<limit&&pool.length){
   const idx=rand()*pool.length|0;
   const k=pool.splice(idx,1)[0];
   if(!shopOffers.includes(k)){
     shopOffers.push(k);
     if(typeof chairman!=="undefined"&&chairman&&chairman.id==="pinti"&&(CARDDEFS[k]&&CARDDEFS[k].price||0)>=10&&typeof trackChairmanMetric==="function")trackChairmanMetric("premiumCardsOffered",1);
     shopVariants[k]=shopVariantLock[k]!==undefined?shopVariantLock[k]:weightedVariant();
     shopVariantLock[k]=shopVariants[k];
     if(typeof chairman!=="undefined"&&chairman&&chairman.id==="cilgin"&&(CARDDEFS[k].price||0)>0&&rand()<0.35){
       shopPriceChaos[k]=rand()<0.5?-1:1;
     }
     if(typeof trackCardOffered==="function"){
       const old=cardVariant[k]||0;cardVariant[k]=shopVariants[k];const price=cardPrice(k);cardVariant[k]=old;
       trackCardOffered(k,shopVariants[k],price);
     }
   }
 }
}
