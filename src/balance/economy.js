/* Kart pazari teklifleri ve kart satin alma ekonomisi. */
function newShopOffers(){
 shopOffers=[];
 const pool=[];CARDKEYS.forEach(k=>{if(isProgressCard(k)&&invOf(k)>=MAX_CARD_COPIES)return;if(!isProgressCard(k)&&!isInstantCard(k)&&invOf(k)>0)return;let n=invOf(k)>0?2:1;if(isProgressCard(k)&&invOf(k)>=2)n+=4;if(isProgressCard(k)&&tierFromCopies(invOf(k)+1)>tierOf(k))n+=5;for(let i=0;i<n;i++)pool.push(k);});
 const limit=debtStage()>=3?1:2;
 while(shopOffers.length<limit&&pool.length){const k=pool.splice(rand()*pool.length|0,1)[0];if(!shopOffers.includes(k)||rand()<0.2)shopOffers.push(k);}

}
