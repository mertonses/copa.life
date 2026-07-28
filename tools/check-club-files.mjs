import fs from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";

const rewards=[],root={
  LANG:"tr",round:1,showToast(){},renderHub(){},_saveState(){},closeModal(){},
  CopaMeta:{completeClubFile(id){rewards.push(id);return {ok:true,rewards:[{kind:id==="debt"?"story":id==="youth"?"crest":"kit"}]};}}
};
const context={window:root,document:{getElementById:()=>null},setTimeout:fn=>fn()};
vm.runInNewContext(fs.readFileSync("src/game/clubFiles.js","utf8"),context,{filename:"clubFiles.js"});
const api=root.CopaClubFiles;

api.reset();assert.equal(api.select("debt"),true);
for(let round=1;round<=3;round++)api.completeRound({round,cash:-10,limit:-20,lineup:[],preparation:{choices:[]}});
assert.equal(api.summary().success,true,"debt file must require a safe buffer in all three matches");
assert.equal(rewards.at(-1),"debt");

api.reset();api.select("youth");
api.completeRound({round:1,lineup:[{name:"Genç",age:21}]});
api.completeRound({round:2,lineup:[{name:"Veteran",age:31}]});
api.completeRound({round:3,lineup:[{name:"Genç 2",age:24}]});
assert.equal(api.summary().success,true,"youth file must pass with U24 starters in two of three matches");

api.reset();api.select("tactics");
api.completeRound({round:1,preparation:{choices:[{id:"finishing"}]}});
api.completeRound({round:2,preparation:{choices:[{id:"analysis"}]}});
api.completeRound({round:3,preparation:{choices:[]}});
assert.equal(api.summary().success,true,"tactical file must require two trained matches and two distinct drills");
assert.equal(Object.hasOwn(api.summary(),"matchPower"),false,"club files must never add run power");
assert.deepEqual(rewards,["debt","youth","tactics"]);

const saved=api.snapshot();api.reset();api.restore(saved);
assert.equal(api.summary().selected,"tactics","club file progress must survive run restore");
console.log("Club files OK: three-round objectives, bounded non-power rewards and persistence passed.");
