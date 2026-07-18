import fs from "node:fs";
import vm from "node:vm";

const html=fs.readFileSync(new URL("../index.html",import.meta.url),"utf8");
const hub=fs.readFileSync(new URL("../src/ui/hub.js",import.meta.url),"utf8");
const state=fs.readFileSync(new URL("../src/state/gameState.js",import.meta.url),"utf8");
const lifecycle=fs.readFileSync(new URL("../src/state/runLifecycle.js",import.meta.url),"utf8");
const persistence=fs.readFileSync(new URL("../src/state/runPersistence.js",import.meta.url),"utf8");
const finalPersistence=fs.readFileSync(new URL("../src/state/finalSimPersistence.js",import.meta.url),"utf8");
const finalSim=fs.readFileSync(new URL("../src/sim/finalSim.js",import.meta.url),"utf8");
const expect=(condition,message)=>{if(!condition)throw new Error(message);};

for(const marker of [
  "v:5","phase","savedAt","seedNum","seedStr","rngCalls","bracket","fixtures","opponent",
  "currentWeather","oppChar","oppLineup","shopOffers","freeAgents","powerHist",
  "ghostOpponentId","ghostCheckedRounds","ghostSeenIds",
  "enterHub(true)","CopaRunPersistence","applyStorageMigrations"
])expect(html.includes(marker),`Save v5 alanı/geri yükleme işareti eksik: ${marker}`);
expect(hub.includes("function enterHub(restoring=false,ghostLocked=false)"),"Hub restore/Ghost kilit modu eksik");
expect(hub.includes("if(restoring){"),"Hub restore koruması eksik");
expect(state.includes("runRngCalls++"),"Deterministik RNG çağrı sayacı eksik");
expect(html.includes('restorePhase=st.phase==="draft"'),"Draft aşaması geri yüklenebilmeli");
expect(html.includes('restorePhase!=="draft"&&!st.picks.every(Boolean)'),"Eksik hub kaydı restore edilmemeli");
expect(html.includes("usedNames.clear()")&&!html.includes("usedNames=new Set"),"Sabit usedNames Set restore sırasında yeniden atanmamalı");
expect(html.includes("function hasCompleteStartingXI()"),"Tam ilk 11 kontrolü eksik");
expect(html.includes("if(!hasCompleteStartingXI()){showModal"),"Eksik ilk 11 ile maç başlatma engeli eksik");
expect(html.includes("choose.locked")&&html.includes("||!p||filled[idx])return false"),"Draft çift seçim/reentry koruması eksik");
expect(lifecycle.includes("illegal_transition")&&lifecycle.includes("incomplete_starting_xi"),"Merkezi state/invariant koruması eksik");
expect(html.includes("CopaFinalSimPersistence")&&html.includes("_tryResumeFinalCheckpoint"),"Final süreç-kapanması geri yükleme köprüsü eksik");
expect(finalSim.includes("getCheckpointState")&&finalSim.includes("restoreCheckpoint")&&finalSim.includes("rngState"),"Final motoru checkpoint/restore API'si eksik");

const makeStorage=()=>{const values=new Map();return{getItem:key=>values.has(key)?values.get(key):null,setItem:(key,value)=>values.set(key,String(value)),removeItem:key=>values.delete(key),values};};
const sandbox={window:null,localStorage:makeStorage(),sessionStorage:makeStorage(),Date,JSON,Object,Array,Number,Math,Set};
sandbox.window=sandbox;
vm.runInNewContext(persistence,sandbox,{filename:"runPersistence.js"});
const api=sandbox.CopaRunPersistence;
const picks=Array.from({length:11},(_,index)=>({name:`P${index}`,pos:"ST"}));
const legacy={v:4,picks,budget:10,round:2,seedNum:42,formName:"4-4-2",country:"TR"};
const migrated=api.migrate(legacy);
expect(migrated.v===5&&migrated.phase==="hub","v4 hub kaydı v5'e migrate edilemedi");
expect(api.validate(migrated).ok,"Migrate edilen hub kaydı şema doğrulamasından geçmedi");
const partial=picks.map((player,index)=>index===3?null:player);
const draft=api.migrate({v:4,picks:partial,budget:20,round:1,seedNum:7,formName:"4-4-2",country:"TR"});
expect(draft.phase==="draft"&&draft.draft.remaining===1&&api.validate(draft).ok,"Eski kısmi draft kaydı migrate edilemedi");
expect(!api.validate({...migrated,picks:partial}).ok,"Eksik hub kaydı reddedilmedi");
expect(api.persist(migrated).ok,"Doğrulanmış kayıt yazılamadı");
sandbox.localStorage.setItem(api.KEYS.primary,"{broken");
expect(api.read().source==="session","Bozuk primary kaydında geçerli session fallback seçilmedi");

vm.runInNewContext(finalPersistence,sandbox,{filename:"finalSimPersistence.js"});
const finalApi=sandbox.CopaFinalSimPersistence;
const checkpoint={
  modelVersion:"copa-final-core-v2",runSeed:42,round:6,homePower:76,awayPower:74,
  match:{
    rngState:12345,matchTime:1234,score:[1,0],stats:{shots:[4,3]},
    teams:[Array.from({length:11},()=>({x:1,y:1})),Array.from({length:11},()=>({x:1,y:1}))],
    ball:{x:52.5,y:34},goalEvents:[]
  }
};
expect(finalApi.persist(checkpoint),"Final checkpoint yazılamadı");
const restoredFinal=finalApi.read().state;
expect(restoredFinal&&restoredFinal.match.matchTime===1234&&restoredFinal.match.rngState===12345,"Final aynı dakika/RNG durumuyla okunamadı");
const stale={...restoredFinal,savedAt:Date.now()-49*60*60*1000};
expect(!finalApi.validate(stale),"48 saatten eski final checkpoint kabul edildi");
expect(!finalApi.validate({...restoredFinal,match:{...restoredFinal.match,score:[99,0]}}),"Geçersiz final skoru kabul edildi");

console.log("Run persistence OK: save v5 plus versioned final minute/RNG checkpoint, migration, fallback, backup and state invariants verified.");
