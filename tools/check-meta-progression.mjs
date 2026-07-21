import fs from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";

const source=fs.readFileSync(new URL("../src/state/metaProgression.js",import.meta.url),"utf8");
assert.match(source,/draws\*2/,"group draws must contribute to career reputation");
const storage=new Map();
const sandbox={
  console,JSON,Math,Date,Object,Array,Number,String,Set,Uint8Array,TextEncoder,TextDecoder,Blob,URL,
  btoa:value=>Buffer.from(value,"binary").toString("base64"),
  atob:value=>Buffer.from(value,"base64").toString("binary"),
  localStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,String(value))},
  navigator:{},document:{readyState:"complete",querySelector:()=>null},
  FORMORDER:["4-4-2","4-3-3","3-5-2","5-3-2"],DEFAULT_FORMS:["4-4-2"],
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
  ,players:[{id:`p-${index}-a`,name:`Captain ${index}`,pos:"CM",power:75+index%8,club:`Archive ${index}`,age:24},{id:`p-${index}-b`,name:`Keeper ${index}`,pos:"GK",power:70,club:`Archive ${index}`,age:27}]
});
const state=meta.getState();
assert.equal(state.archive.length,20,"run archive must be capped at 20");
assert.equal(state.archive.at(-1).result,"win");
for(const badge of ["first_run","finalist","champion","clean_books","collector","ghost_match","six_styles"])assert.ok(state.badges.includes(badge),`missing horizontal badge ${badge}`);
assert.equal(Object.values(state.mastery.styles).reduce((sum,count)=>sum+count,0),23,"style mastery must count completed runs without adding power");
assert.equal(state.career.reputation,687,"reputation must use the fixed run-result formula");
assert.equal(meta.careerSummary().level,6,"career level must be derived from reputation thresholds");
assert.equal(state.career.licenses,3,"level 3, level 5 and championship must each award one licence while formations remain locked");
assert.equal(state.museum.memories.length,23,"completed runs with player snapshots must create museum memories");
assert.equal(meta.setFeaturedPlayer(state.museum.memories[0].id,1),true);
assert.equal(meta.getState().museum.memories[0].featuredIndex,1,"featured museum player must be changeable");
for(const memory of state.museum.memories.slice(0,11))assert.equal(meta.toggleHallPlayer(memory.id,memory.players[0].id),true);
assert.equal(meta.getState().museum.hall.length,11,"Hall XI must accept eleven players");
assert.equal(meta.toggleHallPlayer(state.museum.memories[11].id,state.museum.memories[11].players[0].id),false,"Hall XI must reject a twelfth player");
const unlocked=meta.requestFormationUnlock("3-5-2");
assert.equal(unlocked.ok,true,"one licence must permanently unlock one formation");
assert.equal(unlocked.formation,"3-5-2");assert.equal(unlocked.licenses,2);
assert.equal(meta.requestFormationUnlock("5-3-2").reason,"window_closed","only one licence may be used between runs");

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

console.log("Meta progression OK: reputation/levels, one-per-run licences, mastery, museum/Hall XI, capped archive and portable saves passed.");
