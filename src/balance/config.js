/* Oyun genel sabitleri ve ortak sayac yardimcisi. */
var BUDGET=30,DEBT_LIMIT=-28,FINAL_DEBT_CAP=30,CARD_PRICE_FLOOR=2;
/* İletişim formu — web3forms.com'dan ücretsiz key al, buraya yapıştır */
var CONTACT_FORM_KEY="2eb11e4e-335a-401e-b2e7-104c07ecd4a6";
function cnt(s,arr){return s.filter(p=>arr.includes(p.pos)).length;}
/* Seçilen başkanın borç eşiği ilk turdan itibaren geçerlidir. */
function activeDebtLimit(){return chairmanSackLimit();}
function legacySpendable(){return Math.max(0,Math.round(legacyCash||0));}
function cashHalf(value){return Math.round((Number(value)||0)*2)/2;}
function budgetAfterCost(cost){cost=Math.max(0,cashHalf(cost));return cashHalf((budget||0)-Math.max(0,cost-legacySpendable()));}
function canAffordCost(cost){return budgetAfterCost(cost)>=activeDebtLimit();}
function recordDebt(){if(econStats)econStats.worstDebt=Math.min(econStats.worstDebt||0,budget||0);}
function recordCashFlow(kind,amount,tag,before,after,legacy){
 const hasStats=typeof econStats!=="undefined"&&econStats, list=hasStats&&Array.isArray(econStats.transactions)?econStats.transactions:[];
 const sequence=Math.max(Number(globalThis._copaCashSequence)||0,...list.map(item=>Number(item&&item.id)||0))+1;globalThis._copaCashSequence=sequence;
 const entry={id:sequence,round:Math.max(1,Number(typeof round!=="undefined"?round:1)||1),kind,amount:Math.abs(cashHalf(amount)),tag:tag||kind,before:cashHalf(before),after:cashHalf(after),legacy:Math.max(0,cashHalf(legacy))};
 if(hasStats){list.push(entry);econStats.transactions=list.slice(-120);}
 try{
  const runKey=String(typeof chairmanEventRunId!=="undefined"&&chairmanEventRunId||typeof seedNum!=="undefined"&&seedNum||"session");
  globalThis.dispatchEvent(new CustomEvent("copa:cash-transaction",{detail:{...entry,transactionId:`${runKey}:${sequence}`,delta:cashHalf(entry.after-entry.before)}}));
 }catch(_){ }
 return entry;
}
function debtStage(){return budget<=-20?3:budget<=-10?2:budget<0?1:0;}
function spend(cost,tag){cost=Math.max(0,cashHalf(cost));if(cost<=0)return budget;const before=budget,fromLegacy=Math.min(legacySpendable(),cost);if(fromLegacy>0)legacyCash=Math.max(0,cashHalf((legacyCash||0)-fromLegacy));const fromBudget=cost-fromLegacy;budget=cashHalf(budget-fromBudget);if(econStats&&tag)econStats[tag]=(econStats[tag]||0)+cost;recordCashFlow("expense",cost,tag,before,budget,fromLegacy);recordDebt();return budget;}
function earn(amount,tag){amount=cashHalf(amount);if(amount<=0)return budget;const before=budget;budget=cashHalf(budget+amount);if(econStats&&tag)econStats[tag]=(econStats[tag]||0)+amount;recordCashFlow("income",amount,tag,before,budget,0);recordDebt();return budget;}
function addLegacyCash(amount){amount=Math.max(0,Math.round(amount||0));legacyCash=Math.round((legacyCash||0)+amount);return legacyCash;}
function addFinalPenalty(amount,source){
 amount=Math.max(0,Math.round(amount||0));
 if(!amount)return{added:0,overflow:0,cash:0};
 const before=Math.max(0,Math.round(finalPenalty||0));
 const added=Math.min(amount,Math.max(0,FINAL_DEBT_CAP-before));
 const overflow=Math.max(0,amount-added);
 finalPenalty=before+added;
 let cash=0;
 /* Final cezası 30'da durur; taşan risk bedavaya dönüşmez. */
 if(overflow>0){
  cash=Math.min(12,overflow*2);
  spend(cash,"spent");
  if(typeof chairTrust!=="undefined"&&overflow>=3)requestChairTrustChange(-1,"final_risk_overflow",85);
 }
 if(typeof trackCardPenalty==="function")trackCardPenalty(source||"system",added,overflow,cash);
 return{added,overflow,cash};
}
function hasRunCard(k){return typeof hasCard==="function"&&hasCard(k);}
function baseChairmanSackLimit(id){const m={pinti:-14,torpilci:-16,leydi:-21,sansasyoncu:-22,babacan:-28,cilgin:-29};return m[id||(chairman&&chairman.id)]||DEBT_LIMIT;}
function chairmanTrustDebtAdjustment(value){
 const trust=Math.max(0,Math.min(3,Math.round(value==null?(typeof chairTrust==="number"?chairTrust:1):value)));
 return trust===3?-4:trust===2?-2:trust===0?3:0;
}
function chairmanSackLimitForTrust(value){let lim=baseChairmanSackLimit()+chairmanTrustDebtAdjustment(value);if(lastCreditActive)lim+=(typeof LAST_CREDIT_TIGHTEN==="number"?LAST_CREDIT_TIGHTEN:5);if(chairman&&chairman.id==="torpilci"&&torpilDebtPenalty>0)lim+=torpilDebtPenalty*3;return lim;}
function chairmanSackLimit(){return chairmanSackLimitForTrust();}
function resetChairTrustRoundLedger(value){
 const current=Math.max(0,Math.min(3,Math.round(value==null?(typeof chairTrust==="number"?chairTrust:1):value)));
 chairTrustChangeRound=Math.max(1,Number(typeof round!=="undefined"?round:1)||1);
 chairTrustRoundBase=current;chairTrustRoundDelta=0;chairTrustChangePriority=-1;
}
function requestChairTrustChange(delta,reason,priority){
 if(typeof chairTrust==="undefined")return false;
 const currentRound=Math.max(1,Number(typeof round!=="undefined"?round:1)||1),direction=Math.sign(Number(delta)||0);
 if(!direction)return false;
 if(Number(chairTrustChangeRound)!==currentRound)resetChairTrustRoundLedger(chairTrust);
 const weight=Math.max(0,Number(priority)||0);
 if(chairTrustRoundDelta!==0&&weight<=Number(chairTrustChangePriority))return false;
 const next=Math.max(0,Math.min(3,Number(chairTrustRoundBase)+direction));
 const applied=next-Number(chairTrustRoundBase);
 chairTrust=next;chairTrustRoundDelta=applied;chairTrustChangePriority=weight;
 if(applied){
  chairTrustLastReason=String(reason||"board");
  chairTrustLastDelta=applied;
 }
 return !!applied;
}
function resetChairTrustForNewChair(value){
 chairTrust=Math.max(0,Math.min(3,Math.round(value==null?1:value)));
 chairTrustLastReason="";chairTrustLastDelta=0;resetChairTrustRoundLedger(chairTrust);
 return chairTrust;
}
function chairTrustLedgerSnapshot(){return{round:chairTrustChangeRound,base:chairTrustRoundBase,delta:chairTrustRoundDelta,priority:chairTrustChangePriority,reason:chairTrustLastReason,lastDelta:chairTrustLastDelta};}
function restoreChairTrustLedger(value){
 const source=value||{};chairTrustChangeRound=Number(source.round)||Math.max(1,Number(round)||1);chairTrustRoundBase=Number.isFinite(Number(source.base))?Number(source.base):chairTrust;chairTrustRoundDelta=Number(source.delta)||0;chairTrustChangePriority=Number.isFinite(Number(source.priority))?Number(source.priority):-1;chairTrustLastReason=String(source.reason||"");chairTrustLastDelta=Number(source.lastDelta)||0;
}
function checkChairmanSack(reason){if(runEnded||budget>=chairmanSackLimit())return false;lastSackReason=reason||"debt";endRun(false,null,"sacked");return true;}
function chairmanMarketMod(){const id=chairman&&chairman.id;if(id==="pinti")return -1;if(id==="sansasyoncu")return 2+(sansMediaPressure>0?3:0);if(id==="babacan")return 1;if(id==="torpilci")return -1;return 0;}
function chairmanTransferMultiplier(){return chairman&&chairman.id==="pinti"?0.90:1;}
function chairmanSpendTrustLoss(cost,context,payload){
 cost=Math.round(cost||0);payload=payload||{};
 if(!chairman||cost<=0||typeof chairTrust==="undefined")return 0;
 if(chairman.id==="pinti"&&(cost>=14||(context==="card"&&((payload.variant||0)===1||cardKind(payload.card)==="risk"))))return 1;
 if(chairman.id==="sansasyoncu"&&context==="transfer"&&payload.ov&&payload.ov<72&&cost>=6)return 1;
 return 0;
}
function canAffordChairmanSpend(cost,context,payload){
 payload=payload||{};
 const loss=chairmanSpendTrustLoss(cost,context,payload),currentRound=Math.max(1,Number(typeof round!=="undefined"?round:1)||1);
 let projectedTrust=Math.max(0,(Number(chairTrust)||0)-loss);
 if(loss&&Number(chairTrustChangeRound)===currentRound){
  projectedTrust=Number(chairTrustChangePriority)<80?Math.max(0,Math.min(3,Number(chairTrustRoundBase)-1)):Number(chairTrust);
 }
 const reserve=Math.max(0,Number(payload.reserve)||0);
 return budgetAfterCost((Number(cost)||0)+reserve)>=chairmanSackLimitForTrust(projectedTrust);
}
function chairmanReactToSpend(cost,context,payload){
 cost=Math.round(cost||0);payload=payload||{};
 if(!chairman||cost<=0||typeof chairTrust==="undefined")return;
 const tr=typeof LANG==="undefined"||LANG==="tr";
 if(chairman.id==="pinti"&&chairmanSpendTrustLoss(cost,context,payload)>0){
  requestChairTrustChange(-1,"miser_spending",80);
  if(typeof pushFeed==="function")pushFeed("🪙 "+(tr?"Pinti harcama kuralı: güven -1":"Miser spending rule: trust -1"),"lose");
 }
 if(chairman.id==="sansasyoncu"&&context==="transfer"&&payload.ov>=85&&sansStarBonusRound!==round){
  sansStarBonusRound=round;
  const bonus=payload.ov>=90?3:2;
  if(typeof riskPowerMod!=="undefined")riskPowerMod+=bonus;
  requestChairTrustChange(1,"showman_star_transfer",75);
  if(typeof trackChairmanMetric==="function")trackChairmanMetric("starTransferBonuses",1);
  if(typeof pushFeed==="function")pushFeed("🎤 "+(tr?"Manşet transferi: +"+bonus+" güç":"Headline signing: +"+bonus+" power"),"buy");
 }else if(chairman.id==="sansasyoncu"&&context==="transfer"&&payload.ov&&payload.ov<72&&cost>=6){
  requestChairTrustChange(-1,"showman_boring_transfer",80);
 if(typeof pushFeed==="function")pushFeed("🎤 "+(tr?"Sıkıcı transfer: Şovmen güveni -1":"Boring signing: Showman trust -1"),"lose");
 }
}
function opponentEdge(power,oppPower){const gap=(power||0)-(oppPower||0);return gap>=24?5:gap>=18?4:gap>=12?3:gap>=8?2:0;}
function injuryRiskFor(power){let risk=0.09;if(style==="gegen")risk+=0.035;if(lastTalkResult&&lastTalkResult.key==="gaz"&&lastTalkResult.delta>0)risk+=0.025;if(power>=90)risk+=0.035;if(power>=95)risk+=0.035;if(hasRunCard("temiz_sayfa"))risk*=0.70;return Math.min(0.40,Math.max(0.02,risk));}
var _r=function(){return typeof rand==="function"?rand():Math.random();};
function _randInjLevel(){const r=_r();return r<0.50?1:r<0.80?2:3;}
function injuryRecoveryMatches(level){return Number(level)===1?1:2;}
function injuryPlayRisk(player){const level=Math.max(1,Math.min(3,Number(player&&player.injuryLevel)||2));return level===1?0.15:level===2?0.35:0.55;}
function injuryTreatmentCost(player){const level=Math.max(1,Math.min(3,Number(player&&player.injuryLevel)||2)),base=level===1?3:level===2?5:7,age=Number(player&&player.age)||0;return base+(age>=34?1:0);}
function normalizePlayerInjury(player){if(!player)return player;if(!player.injured){player.injuryLevel=0;player.injuryMatchesRemaining=0;player.injuryDecisionRound=0;player.injuryPlayedRound=0;return player;}player.injuryLevel=Math.max(1,Math.min(3,Number(player.injuryLevel)||2));player.injuryMatchesRemaining=Math.max(1,Number(player.injuryMatchesRemaining)||injuryRecoveryMatches(player.injuryLevel));player.injuryDecisionRound=Math.max(0,Number(player.injuryDecisionRound)||0);player.injuryPlayedRound=Math.max(0,Number(player.injuryPlayedRound)||0);return player;}
function assignPlayerInjury(player,level){if(!player)return player;player.injured=true;player.injuryLevel=Math.max(1,Math.min(3,Number(level)||_randInjLevel()));player.injuryMatchesRemaining=injuryRecoveryMatches(player.injuryLevel);player.injuryDecisionRound=0;player.injuryPlayedRound=0;return player;}
function clearPlayerInjury(player){if(!player)return player;player.injured=false;player.injuryLevel=0;player.injuryMatchesRemaining=0;player.injuryDecisionRound=0;player.injuryPlayedRound=0;return player;}
function injuryVictimWeight(player){const age=Math.max(16,Number(player&&player.age)||27);return 1+Math.max(0,age-31)*0.16;}
function weightedInjuryIndex(indices){let total=0;const weighted=indices.map(index=>{const weight=injuryVictimWeight(picksBySlot[index]);total+=weight;return{index,weight};});let roll=_r()*total;for(const item of weighted){roll-=item.weight;if(roll<=0)return item.index;}return weighted.length?weighted[weighted.length-1].index:-1;}
function injuredSlotIndices(){const out=[];picksBySlot.forEach((p,i)=>{if(p&&p.injured)out.push(i);});return out;}
function syncInjuredIdx(preferred){
 const current=Number.isInteger(preferred)&&picksBySlot[preferred]&&picksBySlot[preferred].injured?preferred:
  (Number.isInteger(injuredIdx)&&picksBySlot[injuredIdx]&&picksBySlot[injuredIdx].injured?injuredIdx:-1);
 injuredIdx=current>=0?current:(injuredSlotIndices()[0]??-1);
 return injuredIdx;
}
function injuryChanceWithMedicalProtection(chance){
 const base=Math.max(0,Math.min(1,Number(chance)||0));
 return typeof medicalProtectionTurns!=="undefined"&&medicalProtectionTurns>0?base*0.50:base;
}
function applyRandomInjury(chance){
 if(_r()>=injuryChanceWithMedicalProtection(chance))return null;
 const idxs=[];picksBySlot.forEach((p,i)=>{if(p&&!p.injured)idxs.push(i);});
 if(!idxs.length)return null;
 const slotIdx=weightedInjuryIndex(idxs),p=picksBySlot[slotIdx];
 assignPlayerInjury(p,_randInjLevel());
 syncInjuredIdx(slotIdx);
 if(econStats)econStats.injuries=(econStats.injuries||0)+1;
 return p;
}
/* Birden fazla sakatlık (kurban_belli gibi) — injuredIdx kısıtlamasını aşar */
function applyMultiInjury(count){const idxs=[];picksBySlot.forEach((p,i)=>{if(p&&!p.injured)idxs.push(i);});const injured=[];for(let i=0;i<count&&idxs.length;i++){const slotIdx=weightedInjuryIndex(idxs),pick=idxs.indexOf(slotIdx);if(pick>=0)idxs.splice(pick,1);const p=picksBySlot[slotIdx];assignPlayerInjury(p,_randInjLevel());if(econStats)econStats.injuries=(econStats.injuries||0)+1;injured.push(p);}syncInjuredIdx(injured.length?picksBySlot.indexOf(injured[0]):-1);return injured;}
