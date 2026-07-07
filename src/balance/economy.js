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
   if(k==="kurban_belli"&&round>=6)return; // Finalde kullanılamaz
   if(k==="kumarbaz"&&round>=6)return; // Finalde kullanılamaz
   pool.push(k);
 });
 const limit=2;
 while(shopOffers.length<limit&&pool.length){
   const idx=rand()*pool.length|0;
   const k=pool.splice(idx,1)[0];
   if(!shopOffers.includes(k)){
     shopOffers.push(k);
     shopVariants[k]=shopVariantLock[k]!==undefined?shopVariantLock[k]:weightedVariant();
     shopVariantLock[k]=shopVariants[k];
   }
 }
}
