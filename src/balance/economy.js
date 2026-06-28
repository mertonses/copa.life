/* Kart pazari teklifleri ve kart satin alma ekonomisi. */
function newShopOffers(){
 shopOffers=[];
 shopVariants={};
 const pool=[];
 const pintiShop=typeof chairman!=="undefined"&&chairman&&chairman.id==="pinti";
 CARDKEYS.forEach(k=>{
   if(invOf(k)>0)return; // zaten sahip
   if(pintiShop&&CARDDEFS[k]&&CARDDEFS[k].rar==="gold")return;
   pool.push(k);
 });
 const limit=debtStage()>=3?1:2;
 while(shopOffers.length<limit&&pool.length){
   const idx=rand()*pool.length|0;
   const k=pool.splice(idx,1)[0];
   if(!shopOffers.includes(k)){
     shopOffers.push(k);
     shopVariants[k]=weightedVariant();
   }
 }
}
