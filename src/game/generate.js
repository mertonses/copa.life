/* Kadro/oyuncu uretimi: havuz filtreleme, fabrikasyon, draft secenekleri.
   core/squad.js USTUNE oturur; runtime state (round/style/deadlineH/LANG) okur. */
const usedNames=new Set();let fabCount=0;
const FABSUR=["Yılmaz","Demir","Kaya","Şahin","Çelik","Aslan","Doğan","Polat","Koç","Bulut"];
const rnd=a=>a[rand()*a.length|0],ri=(a,b)=>a+Math.floor(rand()*(b-a+1));
function availAll(lo,hi){lo=lo||0;hi=hi||99;return POOL.filter(p=>!usedNames.has(p[0])&&p[1]>=lo&&p[1]<=hi);}
function availG(g,lo,hi){return availAll(lo,hi).filter(p=>p[2]===g);}
const _tsvg={
 hizli:`<svg viewBox='0 0 14 20' width='11' height='16' fill='none' stroke='currentColor' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'><path d='M9 1L3 10H8L5 19L12 9H7L9 1Z' fill='currentColor' opacity='.18'/><path d='M9 1L3 10H8L5 19L12 9H7L9 1Z'/></svg>`,
 lider:`<svg viewBox='0 0 18 18' width='13' height='13' fill='none' stroke='currentColor' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'><circle cx='9' cy='9' r='7.5'/><line x1='9' y1='2' x2='9' y2='5'/><line x1='9' y1='13' x2='9' y2='16'/><line x1='2' y1='9' x2='5' y2='9'/><line x1='13' y1='9' x2='16' y2='9'/><circle cx='9' cy='9' r='2.5' fill='currentColor' opacity='.3'/><path d='M9 6.5L9.7 8.3H11.6L10.1 9.4L10.7 11.2L9 10.1L7.3 11.2L7.9 9.4L6.4 8.3H8.3Z' fill='currentColor'/></svg>`,
 buyukmac:`<svg viewBox='0 0 18 18' width='13' height='13' fill='none' stroke='currentColor' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'><circle cx='9' cy='9' r='7.5'/><circle cx='9' cy='9' r='4'/><circle cx='9' cy='9' r='1.5' fill='currentColor'/></svg>`,
 sorunlu:`<svg viewBox='0 0 14 18' width='11' height='15' fill='none' stroke='currentColor' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'><path d='M7 2L8.5 10H5.5Z'/><circle cx='7' cy='14' r='1.5' fill='currentColor'/></svg>`,
 temasli:`<svg viewBox='0 0 18 18' width='13' height='13' fill='none' stroke='currentColor' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'><path d='M3 12l4-6 3 2 2-4 3 2'/><path d='M4 14h10'/></svg>`,
 wonderkid:`<svg viewBox='0 0 16 16' width='13' height='13' fill='none' stroke='currentColor' stroke-width='1.4' stroke-linecap='round' stroke-linejoin='round'><path d='M8 2L9.2 5.6H13L10 7.8L11.1 11.4L8 9.2L4.9 11.4L6 7.8L3 5.6H6.8Z' fill='currentColor' opacity='.25'/><path d='M8 2L9.2 5.6H13L10 7.8L11.1 11.4L8 9.2L4.9 11.4L6 7.8L3 5.6H6.8Z'/></svg>`
};
const TRAITS={hizli:{e:_tsvg.hizli,pw:()=>(style==="kontra"||style==="gegen")?2:0},lider:{e:_tsvg.lider,pw:()=>round>=6?2:0},buyukmac:{e:_tsvg.buyukmac,pw:()=>round>=5?2:0},sorunlu:{e:_tsvg.sorunlu,pw:()=>0},temasli:{e:_tsvg.temasli,pw:()=>0},wonderkid:{e:_tsvg.wonderkid,pw:()=>0}};
function assignTrait(o){o.dev=0;o.trait=null;if(o.fab)return;const r=rand();if(o.age<=20&&r<0.20)o.trait="wonderkid";else if(r<0.10)o.trait="hizli";else if(r<0.17)o.trait="lider";else if(r<0.24)o.trait="buyukmac";else if(r<0.30)o.trait="sorunlu";else if(r<0.35)o.trait="temasli";}
function mkOpt(name,ov,nat,pos,fab,club,age,tr,marketHint,naturalPos,potential,leagueTier){const resolvedAge=age||26,resolvedPotential=typeof playerPotential==="function"?playerPotential(ov,resolvedAge,potential):Math.max(ov,Number(potential)||ov);const pr=valueOf(ov,resolvedAge,resolvedPotential);let price=(!fab&&typeof deadlineH!=="undefined"&&deadlineH<=6)?Math.max(1,Math.round(pr*1.15)):pr;if(!fab&&typeof chairmanTransferMultiplier==="function")price=Math.max(1,Math.round(price*chairmanTransferMultiplier()));const o={name,ov,natG:nat,natPos:naturalPos||pos,pos,club:club||"",age:resolvedAge,tr:tr||0,marketHint:Number(marketHint)||0,potential:resolvedPotential,leagueTier:Number(leagueTier)||1,price,fab:!!fab,train:0,dev:0,trait:null,eff:ov};if(!fab&&typeof playerProfileKey==="function")o.profileKey=playerProfileKey(typeof selectedCountry==="string"?selectedCountry:"TR",name,o.club,o.age);assignTrait(o);return o;}
function fabPlayer(pos,lo,hi){fabCount++;const ov=ri(lo||55,hi||61),g=groupOf(pos);const nm=(lo&&lo<60?(LANG==="tr"?"Yeğen ":"Nephew "):"")+rnd(FABSUR)+" "+fabCount;return mkOpt(nm,ov,g,pos,true,"",ri(17,34),1);}
function discountRangeFor(ov){if(ov>=85)return [35,50];if(ov>=80)return [20,40];if(ov>=75)return [20,40];if(ov>=70)return [15,30];return [10,22];}
function applyBargain(o){if(!o||o.hidden||o.free||o.bargain)return;const rg=discountRangeFor(o.ov),id=chairman&&chairman.id,bonus=(id==="pinti")?3:0,pct=Math.min(50,ri(rg[0]+bonus,rg[1]+bonus));o.oldPrice=o.price;o.discountPct=pct;o.price=Math.max(1,Math.round(o.oldPrice*(100-pct)/100));o.bargain=true;if(!o.trait&&rand()<0.25)o.trait=rnd(["temasli","sorunlu"]);}
const DRAFT_QUALITY_BIAS={TR:0,JP:0.20,ENG:0.25,ES:0.25,DE:0.30,IT:0.30};
const NON_TR_DRAFT_FLOOR=65;
const NON_TR_DRAFT_FLOOR_CEILING=69;
function draftCountry(){return(typeof selectedCountry==="string"?selectedCountry:"TR").toUpperCase();}
function draftQualityBias(){return DRAFT_QUALITY_BIAS[draftCountry()]||0;}
function weightedDraftIndex(a){const bias=draftQualityBias();let total=0;const weights=a.map(p=>{const ov=Number(p&&p[1])||60,age=Number(p&&p[4])||26,potential=Number(p&&p[8])||ov,tier=Number(p&&p[9])||1;let weight=Math.exp(bias*(ov-65)/10)*(tier===1?1.8:1);if(age<=18&&ov<=62)weight*=.08;else if(age<=21&&ov<=64)weight*=.18;if(ov>=65&&potential>=ov+4)weight*=1.15;total+=weight;return weight;});if(!total)return rand()*a.length|0;let roll=rand()*total;for(let i=0;i<weights.length;i++){roll-=weights[i];if(roll<=0)return i;}return a.length-1;}
function ensureDraftQuality(out,pos){if(draftCountry()==="TR"||!out.length||out.some(o=>!o.hidden&&o.ov>=NON_TR_DRAFT_FLOOR))return;const SG=groupOf(pos),shown=new Set(out.map(o=>o.name));let upgrades=availG(SG,NON_TR_DRAFT_FLOOR,NON_TR_DRAFT_FLOOR_CEILING).filter(p=>!shown.has(p[0]));if(!upgrades.length)upgrades=availG(SG,NON_TR_DRAFT_FLOOR,99).filter(p=>!shown.has(p[0]));if(!upgrades.length)return;const p=upgrades[weightedDraftIndex(upgrades)],i=out.reduce((worst,o,j)=>o.ov<out[worst].ov?j:worst,0);out[i]=mkOpt(p[0],p[1],p[2],pos,false,p[3],p[4],p[5],p[6],p[7],p[8],p[9]);}
const HIDDEN_PLAYER_PRICE=5;
const HIDDEN_SET_CHANCE={early:0.448632,late:0.725375};
function hiddenOutcomeFor(o){const market=typeof valueOf==="function"?valueOf(o.ov,o.age,o.potential):Math.max(0,(Number(o.ov)||60)-65);if(market>=7)return"gem";if(market>=3)return"fair";return"bust";}
function hiddenScoutSignal(outcome){const r=rand();if(outcome==="gem")return r<0.68?"positive":(r<0.93?"neutral":"negative");if(outcome==="bust")return r<0.68?"negative":(r<0.93?"neutral":"positive");return r<0.68?"neutral":(r<0.84?"positive":"negative");}
function makeHidden(o){const r=rand(),base=o.ov;o.hidden=true;o.price=HIDDEN_PLAYER_PRICE;o.oldPrice=0;o.discountPct=0;if(r<0.45)o.ov=Math.min(90,Math.max(base+ri(5,12),76));else if(r<0.80)o.ov=Math.max(60,Math.min(82,base+ri(-2,3)));else o.ov=Math.max(55,base-ri(6,12));o.potential=Math.max(o.ov,Number(o.potential)||o.ov);o.hiddenOutcome=hiddenOutcomeFor(o);o.hiddenTier=o.hiddenOutcome;o.scoutSignal=hiddenScoutSignal(o.hiddenOutcome);o.eff=effOf(o);}
function maybeHideDraftOption(out){const candidates=out.filter(o=>o&&!o.fab&&!o.free),late=typeof deadlineH!=="undefined"&&deadlineH<=6,chance=late?HIDDEN_SET_CHANCE.late:HIDDEN_SET_CHANCE.early;if(candidates.length&&rand()<chance)makeHidden(rnd(candidates));}
function draftOptions(pos){const SG=groupOf(pos);let inp=availG(SG).slice(),oth=availAll().filter(p=>p[2]!==SG&&p[2]!=="GK"&&SG!=="GK").slice();const out=[];
  function takeFrom(a){if(!a.length)return null;let j=weightedDraftIndex(a);if(typeof chairman!=="undefined"&&chairman&&chairman.id==="leydi"&&rand()<0.20){const locals=[];a.forEach((p,i)=>{if(p&&p[5])locals.push(i);});if(locals.length)j=rnd(locals);}const p=a.splice(j,1)[0];return mkOpt(p[0],p[1],p[2],pos,false,p[3],p[4],p[5],p[6],p[7],p[8],p[9]);}
  for(let i=0;i<2;i++){const o=takeFrom(inp);if(o)out.push(o);}
  const om=takeFrom(inp.length?inp:oth);if(om)out.push(om);
  while(out.length<3){const o=takeFrom(inp.length?inp:oth);if(o)out.push(o);else out.push(fabPlayer(pos,70,76));}
  ensureDraftQuality(out,pos);
  for(let i=out.length-1;i>0;i--){const j=rand()*(i+1)|0;[out[i],out[j]]=[out[j],out[i]];}
  maybeHideDraftOption(out);
  {const pool=out.filter(o=>!o.hidden&&!o.free),cand=pool.filter(o=>o.ov>=70);if((cand.length?cand:pool).length)applyBargain(rnd(cand.length?cand:pool));}
  {const strong=out.filter(o=>!o.hidden&&!o.free&&!o.bargain&&o.ov>=80);if(strong.length&&rand()<0.32)applyBargain(rnd(strong));}
  if(typeof eliteBonus!=="undefined"&&eliteBonus){const rolePool=POOL.filter(p=>p[2]===SG&&!usedNames.has(p[0])),bestPower=rolePool.reduce((best,p)=>Math.max(best,Number(p[1])||0),0),elites=rolePool.filter(p=>p[1]>=Math.max(85,bestPower));if(elites.length){const ep=rnd(elites);const eo=mkOpt(ep[0],ep[1],ep[2],pos,false,ep[3],ep[4],ep[5],ep[6],ep[7],ep[8],ep[9]);eo.price=Math.max(2,Math.round(valueOf(ep[1],ep[4],ep[8])));eo.eliteContact=true;out[0]=eo;eliteBonus=false;if(typeof saveMeta==="function")saveMeta();}}
  return out.slice(0,3);}
function takeUnique(pos,lo,hi){const SG=groupOf(pos);let a=availG(SG,lo,hi);if(!a.length&&SG!=="GK")a=availAll(lo,hi).filter(p=>p[2]!=="GK");if(!a.length)return fabPlayer(pos,lo,hi);const p=rnd(a);usedNames.add(p[0]);return mkOpt(p[0],p[1],p[2],pos,false,p[3],p[4],p[5],p[6],p[7],p[8],p[9]);}
function oppPick(g){const a=POOL.filter(p=>p[2]===g);return rnd(a.length?a:POOL);}
