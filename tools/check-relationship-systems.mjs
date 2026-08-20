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
assert.equal(api.summary().pending.eventKind,"promise");
api.resolvePromise(true);
assert.equal(api.summary().promises[0].type,"captain");
api.completeMatch(players,3,()=>0.99,{captain:players[0],bench:[]});
assert.equal(api.summary().promises[0].status,"fulfilled");
assert.match(api.profileMarkup(players[0]),/Söz tutuldu/);
assert.match(api.matchStory(),/kaptanlık sözünün/);
assert.equal(api.groupSummary().length,4);
const brokenPlayer={name:"Yedek Oyuncu",pos:"ST",ov:83,age:22,trait:"wonderkid"};
api.restore({
  ...api.snapshot(),
  promises:[{key:"yedek oyuncu|ST",name:"Yedek Oyuncu",type:"start",dueRound:4,status:"active"}],
});
api.completeMatch(players,4,()=>0.99,{captain:players[0],bench:[brokenPlayer]});
assert.equal(api.summary().promises[0].status,"broken");
assert.equal(api.canEnter(brokenPlayer).allowed,false);
assert.match(api.canEnter(brokenPlayer).message,/oyuna girmek istemiyor/);
assert.match(api.profileMarkup(brokenPlayer),/Söz bozuldu/);
assert.equal(api.chairRank("babacan"),2);
api.restore({
  bonds:{"test oyuncu|CM":3},
  pending:{eventKind:"relationship",key:"test oyuncu|CM",name:"Test Oyuncu",pos:"CM",personality:"professional",bond:3,type:"confidence",round:5,groups:["captain"]},
  eventCount:1,
  matchPower:0,
  groupMood:{captain:0,youth:0,stars:0,local:0}
});
api.resolve("support");
assert.equal(api.summary().matchPower,1,"confidence support must create a bounded one-match boost");
assert.equal(api.summary().lastDecision.choice,"support");
assert.equal(api.summary().lastDecision.bondAfter,4);
assert.match(api.profileMarkup(players[0]),/Özel konuşma yapıldı/);
assert.ok(api.summary().groups.find(group=>group.id==="captain").mood>0,"confidence support must lift the related group mood");
api.restore({
  bonds:{"hırslı oyuncu|ST":3},
  pending:{eventKind:"relationship",key:"hırslı oyuncu|ST",name:"Hırslı Oyuncu",pos:"ST",personality:"ambitious",bond:3,type:"confidence",round:5,groups:["stars"]},
  eventCount:1,
  matchPower:0,
  groupMood:{captain:0,youth:0,stars:0,local:0}
});
api.resolve("bench");
assert.equal(api.summary().matchPower,-1,"ambitious role clarification must carry a visible one-match relationship cost");
assert.equal(api.summary().lastDecision.bondAfter,2);
assert.ok(api.summary().groups.find(group=>group.id==="stars").mood<0,"a broken confidence moment must reach the player group");
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
