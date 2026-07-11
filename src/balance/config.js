/* Oyun genel sabitleri ve ortak sayac yardimcisi. */
var BUDGET=30,DEBT_LIMIT=-28,MAX_CARD_COPIES=4,FINAL_DEBT_CAP=30,CARD_PRICE_FLOOR=2,FINAL_CARD_POWER_CAP=18;
/* İletişim formu — web3forms.com'dan ücretsiz key al, buraya yapıştır */
var CONTACT_FORM_KEY="2eb11e4e-335a-401e-b2e7-104c07ecd4a6";
function cnt(s,arr){return s.filter(p=>arr.includes(p.pos)).length;}
function activeDebtLimit(){return round>=3?Math.max(DEBT_LIMIT,chairmanSackLimit()):DEBT_LIMIT;}
function legacySpendable(){return Math.max(0,Math.round(legacyCash||0));}
function budgetAfterCost(cost){cost=Math.max(0,Math.round(cost||0));return Math.round((budget||0)-Math.max(0,cost-legacySpendable()));}
function canAffordCost(cost){return budgetAfterCost(cost)>=activeDebtLimit();}
function recordDebt(){if(econStats)econStats.worstDebt=Math.min(econStats.worstDebt||0,budget||0);}
function debtStage(){return budget<=-20?3:budget<=-10?2:budget<0?1:0;}
function spend(cost,tag){cost=Math.round(cost||0);if(cost<=0)return budget;const fromLegacy=Math.min(legacySpendable(),cost);if(fromLegacy>0)legacyCash=Math.max(0,Math.round((legacyCash||0)-fromLegacy));const fromBudget=cost-fromLegacy;budget=Math.round(budget-fromBudget);if(econStats&&tag)econStats[tag]=(econStats[tag]||0)+cost;recordDebt();return budget;}
function earn(amount,tag){amount=Math.round(amount||0);budget=Math.round(budget+amount);if(econStats&&tag)econStats[tag]=(econStats[tag]||0)+amount;recordDebt();return budget;}
function addLegacyCash(amount){amount=Math.max(0,Math.round(amount||0));legacyCash=Math.round((legacyCash||0)+amount);return legacyCash;}
function addFinalPenalty(amount,source){
 amount=Math.max(0,Math.round(amount||0));
 if(!amount)return{added:0,overflow:0,cash:0};
 const before=Math.max(0,Math.round(finalPenalty||0));
 const added=Math.min(amount,Math.max(0,FINAL_DEBT_CAP-before));
 const overflow=Math.max(0,amount-added);
 finalPenalty=before+added;
 let cash=0;
 /* Tavandan sonraki risk bedavaya donusmez: guc borcu yerine kasa ve guven baskisi yaratir. */
 if(overflow>0){
  cash=Math.min(12,overflow*2);
  spend(cash,"spent");
  if(typeof chairTrust!=="undefined"&&overflow>=3)chairTrust=Math.max(0,chairTrust-1);
 }
 if(typeof trackCardPenalty==="function")trackCardPenalty(source||"system",added,overflow,cash);
 return{added,overflow,cash};
}
function hasRunCard(k){return typeof hasCard==="function"&&hasCard(k);}
function baseChairmanSackLimit(id){const m={pinti:-14,torpilci:-16,leydi:-20,sansasyoncu:-22,babacan:-28,cilgin:-29};return m[id||(chairman&&chairman.id)]||DEBT_LIMIT;}
function chairmanSackLimit(){let lim=baseChairmanSackLimit();if(lastCreditActive)lim+=(typeof LAST_CREDIT_TIGHTEN==="number"?LAST_CREDIT_TIGHTEN:5);if(chairman&&chairman.id==="torpilci"&&torpilDebtPenalty>0)lim+=torpilDebtPenalty*5;return lim;}
function checkChairmanSack(reason){if(runEnded||budget>=chairmanSackLimit())return false;lastSackReason=reason||"debt";endRun(false,null,"sacked");return true;}
function chairmanMarketMod(){const id=chairman&&chairman.id;if(id==="pinti")return -1;if(id==="sansasyoncu")return 2+(sansMediaPressure>0?3:0);if(id==="babacan")return 1;if(id==="torpilci")return -1;return 0;}
function chairmanTransferMultiplier(){return chairman&&chairman.id==="pinti"?0.90:1;}
function chairmanReactToSpend(cost,context,payload){
 cost=Math.round(cost||0);payload=payload||{};
 if(!chairman||cost<=0||typeof chairTrust==="undefined")return;
 const tr=typeof LANG==="undefined"||LANG==="tr";
 if(chairman.id==="pinti"&&cost>=14){
  chairTrust=Math.max(0,chairTrust-1);
  if(typeof pushFeed==="function")pushFeed("🪙 "+(tr?"Pahalı harcama: Pinti Başkan güveni -1":"Expensive spend: Miser trust -1"),"lose");
 }
 if(chairman.id==="sansasyoncu"&&context==="transfer"&&payload.ov>=85&&sansStarBonusRound!==round){
  sansStarBonusRound=round;
  const bonus=payload.ov>=90?3:2;
  if(typeof riskPowerMod!=="undefined")riskPowerMod+=bonus;
  if(typeof pushFeed==="function")pushFeed("🎤 "+(tr?"Manşet transferi: +"+bonus+" güç":"Headline signing: +"+bonus+" power"),"buy");
 }else if(chairman.id==="sansasyoncu"&&context==="transfer"&&payload.ov&&payload.ov<72&&cost>=6){
  chairTrust=Math.max(0,chairTrust-1);
  if(typeof pushFeed==="function")pushFeed("🎤 "+(tr?"Sıkıcı transfer: Sansasyoncu güveni -1":"Boring signing: Showman trust -1"),"lose");
 }
}
function opponentEdge(power,oppPower){const gap=(power||0)-(oppPower||0);return gap>=24?5:gap>=18?4:gap>=12?3:gap>=8?2:0;}
function injuryRiskFor(power){const s=picksBySlot.filter(Boolean);let risk=0.09;risk+=s.filter(p=>p.age>=32).length*0.022;if(style==="gegen")risk+=0.035;if(lastTalkResult&&lastTalkResult.key==="gaz"&&lastTalkResult.delta>0)risk+=0.025;if(power>=90)risk+=0.035;if(power>=95)risk+=0.035;if(hasRunCard("temiz_sayfa"))risk*=0.70;return Math.min(0.40,Math.max(0.02,risk));}
var _r=function(){return typeof rand==="function"?rand():Math.random();};
function _randInjLevel(){const r=_r();return r<0.50?1:r<0.80?2:3;}
function applyRandomInjury(chance){if(injuredIdx>=0||_r()>=chance)return null;const idxs=[];picksBySlot.forEach((p,i)=>{if(p&&!p.injured)idxs.push(i);});if(!idxs.length)return null;injuredIdx=rnd(idxs);const p=picksBySlot[injuredIdx];p.injured=true;p.injuryLevel=_randInjLevel();if(econStats)econStats.injuries=(econStats.injuries||0)+1;return p;}
/* Birden fazla sakatlık (kurban_belli gibi) — injuredIdx kısıtlamasını aşar */
function applyMultiInjury(count){const idxs=[];picksBySlot.forEach((p,i)=>{if(p&&!p.injured)idxs.push(i);});const injured=[];for(let i=0;i<count&&idxs.length;i++){const pick=Math.floor(rand()*idxs.length);const slotIdx=idxs.splice(pick,1)[0];const p=picksBySlot[slotIdx];p.injured=true;p.injuryLevel=_randInjLevel();if(econStats)econStats.injuries=(econStats.injuries||0)+1;if(injuredIdx<0)injuredIdx=slotIdx;injured.push(p);}return injured;}
