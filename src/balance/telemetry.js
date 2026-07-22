/* Yerel denge telemetrisi. Yalnızca toplulaştırılmış oyun sayılarını saklar. */
var BALANCE_TELEMETRY_KEY="copa_balance_telemetry_v1";
var balanceTelemetryRun=null;
var CHAIRMAN_METRIC_KEYS=["consults","positiveEvents","negativeEvents","neutralEvents","penaltyWins","penaltyLosses","spotlightSelections","starTransferBonuses","nephewAccepted","nephewRejected","chaosOffers","chaosRolls","savingsEarned","savingsCash","savingsPower","savingsResidualCash","premiumCardsOffered","premiumCardsPurchased"];

function _btBlank(){return{version:1,runs:0,cards:{},chairmen:{},rewards:{},hiddenDraft:{},updatedAt:0};}
function _btLoad(){
 try{
  const raw=localStorage.getItem(BALANCE_TELEMETRY_KEY);
  const data=raw?JSON.parse(raw):_btBlank();
  if(!data||data.version!==1)return _btBlank();
  data.cards=data.cards||{};data.chairmen=data.chairmen||{};data.rewards=data.rewards||{};data.hiddenDraft=data.hiddenDraft||{};
  return data;
 }catch(e){return _btBlank();}
}
function _btSave(data){try{data.updatedAt=Date.now();localStorage.setItem(BALANCE_TELEMETRY_KEY,JSON.stringify(data));}catch(e){}}
function _btKey(k,v){return String(k||"unknown")+":"+(Number(v)===1?"DARK":"COMMON");}
function _btCard(data,key){
 const empty={offered:0,offerPriceTotal:0,acquired:0,bought:0,free:0,priceTotal:0,powerTotal:0,powerSamples:0,matchPowerTotal:0,matchSamples:0,penaltyPower:0,penaltyCash:0,finalReached:0,champion:0,runsOwned:0};
 if(!data.cards[key])data.cards[key]=empty;
 else Object.keys(empty).forEach(k=>{if(typeof data.cards[key][k]!=="number")data.cards[key][k]=empty[k];});
 return data.cards[key];
}
function _btChair(data,id){
 const empty={runs:0,finalReached:0,champion:0,sacked:0};
 CHAIRMAN_METRIC_KEYS.forEach(key=>{empty[key]=0;});
 const cid=String(id||"unknown");
 if(!data.chairmen[cid])data.chairmen[cid]=empty;
 else Object.keys(empty).forEach(key=>{if(typeof data.chairmen[cid][key]!=="number")data.chairmen[cid][key]=empty[key];});
 return data.chairmen[cid];
}
function _btEnsureRun(){
 if(!balanceTelemetryRun)balanceTelemetryRun={chairman:"unknown",cards:{},startedAt:Date.now()};
 return balanceTelemetryRun;
}
function startBalanceTelemetry(meta){
 meta=meta||{};
 balanceTelemetryRun={chairman:String(meta.chairman||"unknown"),cards:{},startedAt:Date.now()};
}
function trackChairmanMetric(metric,amount,chairmanId){
 const key=String(metric||"");
 if(!CHAIRMAN_METRIC_KEYS.includes(key))return;
 const value=Number(amount);
 if(!Number.isFinite(value)||value===0)return;
 const run=_btEnsureRun(),cid=String(chairmanId||(typeof chairman!=="undefined"&&chairman&&chairman.id)||run.chairman||"unknown");
 const data=_btLoad(),row=_btChair(data,cid);
 row[key]+=value;
 _btSave(data);
}
function trackCardOffered(k,v,price){
 const data=_btLoad(),row=_btCard(data,_btKey(k,v));
 row.offered++;row.offerPriceTotal+=Math.max(0,Number(price)||0);
 _btSave(data);
}
function trackCardAcquired(k,v,opts){
 opts=opts||{};
 const data=_btLoad(),key=_btKey(k,v),row=_btCard(data,key),run=_btEnsureRun();
 const paid=opts.source==="market"||Number(opts.price)>0;
 row.acquired++;
 if(paid){row.bought++;row.priceTotal+=Math.max(0,Number(opts.price)||0);}else row.free++;
 if(!run.cards[key])run.cards[key]={penaltyPower:0,penaltyCash:0};
 _btSave(data);
}
function trackCardImpact(k,v,power,price){
 const n=Number(power)||0;
 const data=_btLoad(),row=_btCard(data,_btKey(k,v));
 row.powerTotal+=n;row.powerSamples++;
 _btSave(data);
}
function trackBalanceMatchTelemetry(roundNo){
 const run=balanceTelemetryRun;if(!run||typeof cardEff!=="function")return;
 const squad=typeof picksBySlot!=="undefined"?picksBySlot.filter(Boolean):[];
 const active=typeof cards!=="undefined"?cards:[];
 const data=_btLoad();
 active.forEach(k=>{
  const v=typeof variantOf==="function"?variantOf(k):0,key=_btKey(k,v);
  const power=Number(cardEff(k,squad,roundNo))||0,row=_btCard(data,key);
  row.matchPowerTotal+=power;row.matchSamples++;
  if(!run.cards[key])run.cards[key]={penaltyPower:0,penaltyCash:0};
 });
 _btSave(data);
}
function trackRewardChoice(kind,roundNo){
 const key=String(kind||"");if(!["cash","loan","swap","care"].includes(key))return;
 const data=_btLoad(),roundKey=String(Math.max(1,Math.min(5,Math.round(Number(roundNo)||1))));
 if(!data.rewards[roundKey])data.rewards[roundKey]={cash:0,loan:0,swap:0,care:0};
 data.rewards[roundKey][key]++;_btSave(data);
}
function trackHiddenDraftMetric(kind,meta){
 meta=meta||{};if(!["offered","selected","revealed","rerolled"].includes(kind))return;
 const data=_btLoad(),row=data.hiddenDraft||(data.hiddenDraft={}),inc=key=>row[key]=(row[key]||0)+1,cap=key=>key[0].toUpperCase()+key.slice(1),suffix=cap(kind);
 inc(kind);inc((["manual","reroll","auto"].includes(meta.source)?meta.source:"manual")+suffix);
 if(meta.late)inc("late"+suffix);
 if((kind==="offered"||kind==="selected")&&["positive","neutral","negative"].includes(meta.signal))inc("signal"+cap(meta.signal)+suffix);
 if(kind==="revealed"&&["gem","fair","bust"].includes(meta.outcome))inc("outcome"+cap(meta.outcome));
 _btSave(data);
}
function trackCardPenalty(k,power,overflow,cash){
 if(!k||k==="system")return;
 const v=typeof variantOf==="function"?variantOf(k):0,key=_btKey(k,v),data=_btLoad(),row=_btCard(data,key),run=_btEnsureRun();
 const pp=Math.max(0,Number(power)||0),pc=Math.max(0,Number(cash)||0);
 row.penaltyPower+=pp;row.penaltyCash+=pc;
 if(!run.cards[key])run.cards[key]={penaltyPower:0,penaltyCash:0};
 run.cards[key].penaltyPower+=pp;run.cards[key].penaltyCash+=pc;
 _btSave(data);
}
function finishBalanceTelemetry(won,meta){
 meta=meta||{};const run=balanceTelemetryRun;if(!run)return;
 const data=_btLoad();data.runs++;
 const finalReached=!!meta.finalReached;
 Object.keys(run.cards).forEach(key=>{const row=_btCard(data,key);row.runsOwned++;if(finalReached)row.finalReached++;if(won)row.champion++;});
 /* Attribute a run to the chairman selected at kickoff; a late board vote must
    not rewrite the balance history of the run's original ruleset. */
 const cid=String(run.chairman||meta.chairman||"unknown");
 const chair=_btChair(data,cid);chair.runs++;if(finalReached)chair.finalReached++;if(won)chair.champion++;if(meta.endType==="sacked")chair.sacked++;
 _btSave(data);balanceTelemetryRun=null;
}
function getBalanceTelemetry(){return _btLoad();}
