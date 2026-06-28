/* Oyun genel sabitleri ve ortak sayac yardimcisi. */
var BUDGET=30,DEBT_LIMIT=-28,MAX_CARD_COPIES=4,BONUS_SOFT_CAP=8,BONUS_OVERFLOW_RATE=0.2,BONUS_HARD_CAP=12,FINAL_DEBT_CAP=18;
/* İletişim formu — web3forms.com'dan ücretsiz key al, buraya yapıştır */
var CONTACT_FORM_KEY="2eb11e4e-335a-401e-b2e7-104c07ecd4a6";
function cnt(s,arr){return s.filter(p=>arr.includes(p.pos)).length;}
function squadWage(){return 0;}
function activeDebtLimit(){return round>=3?Math.max(DEBT_LIMIT,chairmanSackLimit()):DEBT_LIMIT;}
function canAffordCost(cost){return budget-cost>=activeDebtLimit();}
function recordDebt(){if(econStats)econStats.worstDebt=Math.min(econStats.worstDebt||0,budget||0);}
function debtStage(){return budget<=-20?3:budget<=-10?2:budget<0?1:0;}
function spend(cost,tag){cost=Math.round(cost||0);budget=Math.round(budget-cost);if(econStats&&tag)econStats[tag]=(econStats[tag]||0)+cost;recordDebt();return budget;}
function earn(amount,tag){amount=Math.round(amount||0);budget=Math.round(budget+amount);if(econStats&&tag)econStats[tag]=(econStats[tag]||0)+amount;recordDebt();return budget;}
function hasRunCard(k){return typeof hasCard==="function"&&hasCard(k);}
function chairmanSackLimit(){const m={pinti:-12,torpilci:-16,leydi:-20,sansasyoncu:-22,babacan:-28,cilgin:-31};let lim=m[chairman&&chairman.id]||DEBT_LIMIT;if(lastCreditActive)lim+=(typeof LAST_CREDIT_TIGHTEN==="number"?LAST_CREDIT_TIGHTEN:5);if(chairman&&chairman.id==="torpilci"&&torpilDebtPenalty>0)lim+=torpilDebtPenalty*5;return lim;}
function checkChairmanSack(reason){if(runEnded||budget>=chairmanSackLimit())return false;lastSackReason=reason||"debt";endRun(false,null,"sacked");return true;}
function chairmanMarketMod(){const id=chairman&&chairman.id;if(id==="pinti")return -2;if(id==="sansasyoncu")return 2+(sansMediaPressure>0?3:0);if(id==="babacan")return 1;if(id==="torpilci")return -1;return 0;}
function chairmanPressureMod(power){return 0;}
function pressureLevel(power){return 0;}
function pressurePenalty(power){return 0;}
function opponentEdge(power,oppPower){const gap=(power||0)-(oppPower||0);return gap>=24?5:gap>=18?4:gap>=12?3:gap>=8?2:0;}
function injuryRiskFor(power){const s=picksBySlot.filter(Boolean);let risk=0.09;risk+=s.filter(p=>p.age>=32).length*0.022;if(style==="gegen")risk+=0.035;if(lastTalkResult&&lastTalkResult.key==="gaz"&&lastTalkResult.delta>0)risk+=0.025;if(power>=90)risk+=0.035;if(power>=95)risk+=0.035;if(hasRunCard("temiz_sayfa"))risk*=0.70;return Math.min(0.40,Math.max(0.02,risk));}
function applyRandomInjury(chance){if(injuredIdx>=0||rand()>=chance)return null;const idxs=[];picksBySlot.forEach((p,i)=>{if(p&&!p.injured)idxs.push(i);});if(!idxs.length)return null;injuredIdx=rnd(idxs);const p=picksBySlot[injuredIdx];p.injured=true;if(econStats)econStats.injuries=(econStats.injuries||0)+1;return p;}
/* Birden fazla sakatlık (kurban_belli gibi) — injuredIdx kısıtlamasını aşar */
function applyMultiInjury(count){const idxs=[];picksBySlot.forEach((p,i)=>{if(p&&!p.injured)idxs.push(i);});const injured=[];for(let i=0;i<count&&idxs.length;i++){const pick=Math.floor(rand()*idxs.length);const slotIdx=idxs.splice(pick,1)[0];const p=picksBySlot[slotIdx];p.injured=true;if(econStats)econStats.injuries=(econStats.injuries||0)+1;if(injuredIdx<0)injuredIdx=slotIdx;injured.push(p);}return injured;}
