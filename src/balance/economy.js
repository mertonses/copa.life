/* Kart pazari teklifleri ve kart satin alma ekonomisi. */
function newShopOffers(){
 shopOffers=[];
 shopVariants={};
 if(shopBlocked>0)return; // market is closed
 const pool=[];
 const pintiShop=typeof chairman!=="undefined"&&chairman&&chairman.id==="pinti";
 CARDKEYS.forEach(k=>{
   if(invOf(k)>0)return; // zaten sahip
   if(pintiShop&&CARDDEFS[k]&&(CARDDEFS[k].price||0)>=10)return;
   if(k==="taksit_transfer"&&typeof installmentTurns!=="undefined"&&installmentTurns>0)return;
   if(k==="kumarbaz"&&typeof kumarbazInstallmentTurns!=="undefined"&&kumarbazInstallmentTurns>0)return;
   if(k==="kurban_belli"&&round>=6)return; // Finalde kullanılamaz
   if(k==="kumarbaz"&&round>=6)return; // Finalde kullanılamaz
   if(round>=6&&cardKind(k)!=="final")return;
   const kind=cardKind(k);
   let weight=1;
   if(round<=2)weight=kind==="squad"||kind==="economy"||kind==="power"?4:(kind==="defense"?2:.35);
   else if(round<=4)weight=kind==="squad"||kind==="power"||kind==="defense"?3:(kind==="economy"?2:1);
   else if(round===5)weight=kind==="final"?5:(kind==="risk"||kind==="temporary"?2:1);
   else weight=6;
   if(typeof chairman!=="undefined"&&chairman&&chairman.id==="sansasyoncu"&&(k==="yildiz"||k==="buyuk_mac"||kind==="final"))weight*=1.8;
   for(let i=0;i<Math.max(1,Math.round(weight));i++)pool.push(k);
 });
 const limit=2;
 while(shopOffers.length<limit&&pool.length){
   const idx=rand()*pool.length|0;
   const k=pool.splice(idx,1)[0];
   if(!shopOffers.includes(k)){
     shopOffers.push(k);
     shopVariants[k]=shopVariantLock[k]!==undefined?shopVariantLock[k]:weightedVariant();
     shopVariantLock[k]=shopVariants[k];
     if(typeof trackCardOffered==="function"){
       const old=cardVariant[k]||0;cardVariant[k]=shopVariants[k];const price=cardPrice(k);cardVariant[k]=old;
       trackCardOffered(k,shopVariants[k],price);
     }
   }
 }
}
