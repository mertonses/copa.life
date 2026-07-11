/* Yerel denge telemetrisi. Yalnızca toplulaştırılmış oyun sayılarını saklar. */
var BALANCE_TELEMETRY_KEY="copa_balance_telemetry_v1";
var balanceTelemetryRun=null;

function _btBlank(){return{version:1,runs:0,cards:{},chairmen:{},updatedAt:0};}
function _btLoad(){
 try{
  const raw=localStorage.getItem(BALANCE_TELEMETRY_KEY);
  const data=raw?JSON.parse(raw):_btBlank();
  if(!data||data.version!==1)return _btBlank();
  data.cards=data.cards||{};data.chairmen=data.chairmen||{};
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
function _btEnsureRun(){
 if(!balanceTelemetryRun)balanceTelemetryRun={chairman:"unknown",cards:{},startedAt:Date.now()};
 return balanceTelemetryRun;
}
function startBalanceTelemetry(meta){
 meta=meta||{};
 balanceTelemetryRun={chairman:String(meta.chairman||"unknown"),cards:{},startedAt:Date.now()};
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
 const cid=String(meta.chairman||run.chairman||"unknown");
 if(!data.chairmen[cid])data.chairmen[cid]={runs:0,finalReached:0,champion:0,sacked:0};
 const chair=data.chairmen[cid];chair.runs++;if(finalReached)chair.finalReached++;if(won)chair.champion++;if(meta.endType==="sacked")chair.sacked++;
 _btSave(data);balanceTelemetryRun=null;
}
function getBalanceTelemetry(){return _btLoad();}
