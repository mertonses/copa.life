import fs from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";

const chairDecisions=[];
const root={
  LANG:"tr",rand:()=>0.1,renderHub(){},_saveState(){},closeModal(){},showToast(){},
  CopaMeta:{
    getState:()=>({mastery:{chairmen:{babacan:5}}}),
    chairHistory:()=>({runs:2,decisionCount:3,lastOutcome:"sale",positive:1,negative:2}),
    recordChairDecision:(...args)=>{chairDecisions.push(args);return true;}
  }
};
const context={window:root,document:{getElementById:()=>null},setTimeout:fn=>fn(),Math};
vm.runInNewContext(fs.readFileSync("src/game/relationshipSystems.js","utf8"),context,{filename:"relationshipSystems.js"});
const api=root.CopaRelationships,players=[{name:"Test Oyuncu",pos:"CM",ov:78,age:25,trait:"lider"}];

api.reset({startToken:1});
api.completeMatch(players,1,()=>0.1);
assert.equal(api.summary().pending,null);
api.completeMatch(players,2,()=>0.1);
assert.equal(api.summary().pending.name,"Test Oyuncu");
api.resolve("compromise");
assert.equal(api.matchModifier(),0);
assert.equal(api.summary().startToken,0);
assert.equal(api.chairRank("babacan"),2);
api.setChairAgenda("squad");
const filtered=api.filterChairOutcomes([{id:"sale"},{id:"academy"},{id:"tax"}]);
assert.deepEqual(Array.from(filtered,item=>item.id),["academy"]);
api.reset({});
api.setChairAgenda("different");
const remembered=api.filterChairOutcomes([{id:"sale"},{id:"academy"},{id:"tax"}]);
assert.deepEqual(Array.from(remembered,item=>item.id),["academy","tax"],"history negotiation must only remove the exact previous outcome");
assert.equal(api.recordChairDecision("babacan","academy",true),true);
assert.deepEqual(chairDecisions,[["babacan","academy",true]]);
assert.equal(api.matchModifier()>=-1&&api.matchModifier()<=1,true);
const saved=api.snapshot();
api.reset({});
api.restore(saved);
assert.equal(api.snapshot().chairAgendaUsed,true);
console.log("Relationship systems OK: bounded match effects, personality event, museum compromise and chairman agenda passed.");
