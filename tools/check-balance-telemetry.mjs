import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const source=fs.readFileSync(new URL("../src/balance/telemetry.js",import.meta.url),"utf8");
const storage=new Map();
const sandbox={
  console,Date,Math,Number,Object,Array,Set,String,
  chairman:{id:"pinti"},
  localStorage:{
    getItem:key=>storage.has(key)?storage.get(key):null,
    setItem:(key,value)=>storage.set(key,String(value))
  }
};
vm.createContext(sandbox);
vm.runInContext(source,sandbox,{filename:"src/balance/telemetry.js"});

sandbox.startBalanceTelemetry({chairman:"pinti"});
sandbox.trackRiskOffersShown(["fortune","grit","fortune"],3);
sandbox.trackRiskOfferChosen("fortune",3);
sandbox.trackRiskOfferOutcome("fortune",{failed:true,cashDelta:-10});
sandbox.trackInjurySource("pre_match");
sandbox.trackInjurySource("card",2);
sandbox.trackInjuryDecision("paid_treatment");
sandbox.finishBalanceTelemetry(false,{finalReached:true,endType:"sacked",country:"TR",formation:"4-3-3",power:78,endCash:-12,worstDebt:-19,injuries:3});

const data=sandbox.getBalanceTelemetry();
assert.deepEqual({...data.riskOffers.fortune},{shown:1,chosen:1,success:0,failed:1,cashDeltaTotal:-10});
assert.equal(data.riskOffers.grit.shown,1);
assert.deepEqual({...data.injury.sources},{pre_match:1,card:2});
assert.deepEqual({...data.injury.decisions},{paid_treatment:1});
assert.deepEqual({...data.runSummary.countries.TR},{runs:1,finalReached:1,champion:0,sacked:1,powerTotal:78,endCashTotal:-12,worstDebtTotal:-19,injuriesTotal:3});
assert.deepEqual({...data.runSummary.formations["4-3-3"]},{runs:1,finalReached:1,champion:0,sacked:1,powerTotal:78,endCashTotal:-12,worstDebtTotal:-19,injuriesTotal:3});
assert.equal(data.chairmen.pinti.powerTotal,78);
assert.equal(data.chairmen.pinti.injuriesTotal,3);

console.log("Balance telemetry OK: risk offer funnel/outcomes, injury sources/decisions and country/formation run outcomes verified.");
