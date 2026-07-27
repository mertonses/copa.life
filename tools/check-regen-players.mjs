import fs from "node:fs";
import vm from "node:vm";

const generate=fs.readFileSync("src/game/generate.js","utf8");
const regenNames=fs.readFileSync("src/data/regenNames.js","utf8");
const profiles=fs.readFileSync("src/data/player_profile_store.js","utf8");
const profileData=JSON.parse(fs.readFileSync("assets/data/copa/player_profiles.json","utf8"));
const localeSamples={tr:/[çğıöşü]/i,en:/^[\x00-\x7F]+$/,es:/[áíó]/i,de:/[äöü]/i,it:/[ò]/i};

for(const lang of Object.keys(localeSamples)){
  let state=123456789;
  const context={LANG:lang,selectedCountry:"TR",deadlineH:24,rand:()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;},groupOf:pos=>pos==="GK"?"GK":pos==="ST"?"FWD":"MID",valueOf:()=>1,playerPotential:(ov)=>ov,playerProfileKey:(country,name,club,age)=>[country,name,age,club].join("|")};
  context.window=context;
  vm.createContext(context);
  vm.runInContext(regenNames+"\n"+generate+"\nthis.makeRegen=fabPlayer;",context);
  const players=Array.from({length:40},(_,index)=>context.makeRegen(index%2?"ST":"CM",55,88));
  const names=players.map(player=>player.name);
  if(new Set(names).size!==names.length)throw new Error(lang+" regen names are not unique");
  if(names.some(name=>/\d/.test(name)||/Yeğen|Nephew/i.test(name)))throw new Error(lang+" regen name contains a placeholder");
  if(!names.some(name=>localeSamples[lang].test(name)))throw new Error(lang+" locale-specific name pool was not used");
}

const store={fetch:async()=>({ok:true,json:async()=>profileData}),console,setTimeout};
vm.createContext(store);
vm.runInContext(profiles,store);
for(const ov of [56,70,84]){
  const player={name:"Test Regen "+ov,ov,pos:"ST",natPos:"ST",age:20,fab:true,profileSeed:ov};
  const first=await store.playerProfileForPlayerAsync(player,"TR"),second=await store.playerProfileForPlayerAsync(player,"TR");
  const scores=["impact","build_up","space_control","duels","engine","pressure_decision"].map(key=>first["copa_"+key]);
  const average=scores.reduce((sum,value)=>sum+value,0)/scores.length;
  if(scores.some(value=>!Number.isInteger(value)||value<0||value>100)||Math.abs(average-ov)>18)throw new Error("regen profile does not match power "+ov);
  if(!first.preferred_foot||!first.best_position||JSON.stringify(first)!==JSON.stringify(second))throw new Error("regen profile is incomplete or unstable");
}
const variants=await Promise.all(Array.from({length:20},(_,index)=>store.playerProfileForPlayerAsync({name:"Regen Variant "+index,ov:70,pos:"CM",natPos:"CM",age:19+index%8,fab:true},"TR")));
const signatures=new Set(variants.map(profile=>["impact","build_up","space_control","duels","engine","pressure_decision"].map(key=>profile["copa_"+key]).join(",")+"|"+profile.archetype+"|"+profile.preferred_foot));
if(signatures.size<5)throw new Error("regen profiles are not varied enough");

console.log("Regen players OK: five localized name pools, unique number-free identities and deterministic power-scaled profiles.");
