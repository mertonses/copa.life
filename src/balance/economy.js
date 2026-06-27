/* Kart pazari teklifleri ve kart satin alma ekonomisi. */
function newShopOffers(){
 shopOffers=[];
 shopVariants={};
 const pool=[];
 CARDKEYS.forEach(k=>{
   if(invOf(k)>0)return; // zaten sahip
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
