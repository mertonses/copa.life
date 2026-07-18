import fs from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";

const source=fs.readFileSync(new URL("../src/state/metaProgression.js",import.meta.url),"utf8");
const storage=new Map();
const sandbox={
  console,JSON,Math,Date,Object,Array,Number,String,Set,Uint8Array,TextEncoder,TextDecoder,Blob,URL,
  btoa:value=>Buffer.from(value,"binary").toString("base64"),
  atob:value=>Buffer.from(value,"base64").toString("binary"),
  localStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,String(value))},
  navigator:{},document:{readyState:"complete",querySelector:()=>null},
  FORMORDER:["4-4-2","4-3-3","3-5-2"],DEFAULT_FORMS:["4-4-2"],
  CHAIR_ORDER:["babacan","leydi"],unlockedForms:["4-4-2","4-3-3"],unlockedChairs:["babacan","leydi"],
  selectedChairId:"leydi",pendingChairChoices:[],metaBest:6,metaRuns:8,eliteBonus:true,legacyFund:12,
  LANG:"en"
};
sandbox.window=sandbox;sandbox.globalThis=sandbox;
vm.createContext(sandbox);
vm.runInContext(source,sandbox,{filename:"metaProgression.js"});
const meta=sandbox.CopaMeta;

for(let index=0;index<23;index++)meta.recordRun({
  seed:index+1,metaRun:index+1,team:`Archive ${index}`,country:index%2?"TR":"JP",
  formation:index%2?"4-4-2":"4-3-3",style:["gegen","kontra","tiki","uzun","blok"][index%5],
  chairman:index%2?"babacan":"leydi",identity:"Test build",won:index===22,round:index===22?6:3,
  endType:"",power:72+index%8,cards:index===22?5:2,cash:index===22?4:-3,score:index===22?"2-1":"",ghost:index===21
});
const state=meta.getState();
assert.equal(state.archive.length,20,"run archive must be capped at 20");
assert.equal(state.archive.at(-1).result,"win");
for(const badge of ["first_run","finalist","champion","clean_books","collector","ghost_match","six_styles"])assert.ok(state.badges.includes(badge),`missing horizontal badge ${badge}`);
assert.equal(Object.values(state.mastery.styles).reduce((sum,count)=>sum+count,0),23,"style mastery must count completed runs without adding power");

const code=meta.exportCode();
assert.match(code,/^CPS1\.[A-Za-z0-9+/=]+\.[a-z0-9]+$/);
sandbox.unlockedForms=["4-4-2"];sandbox.unlockedChairs=["babacan"];sandbox.selectedChairId="babacan";
sandbox.metaBest=1;sandbox.metaRuns=1;sandbox.eliteBonus=false;sandbox.legacyFund=0;
const imported=meta.importCode(code);
assert.equal(imported.ok,true);
assert.ok(sandbox.unlockedForms.includes("4-3-3"));
assert.ok(sandbox.unlockedChairs.includes("leydi"));
assert.equal(sandbox.metaBest,6);assert.equal(sandbox.metaRuns,8);
assert.equal(sandbox.eliteBonus,true);assert.equal(sandbox.legacyFund,12);
const corrupt=code.slice(0,-1)+(code.endsWith("x")?"y":"x");
assert.throws(()=>meta.importCode(corrupt),/checksum|invalid/,"corrupt save code must be rejected");
assert.equal(code.includes("activeRun"),false,"portable meta save must not contain an active run");

console.log("Meta progression OK: horizontal mastery/badges, capped archive, validated merge import and portable export passed.");
