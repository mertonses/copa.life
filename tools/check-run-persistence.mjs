import fs from "node:fs";
import vm from "node:vm";

const html=fs.readFileSync(new URL("../index.html",import.meta.url),"utf8");
const hub=fs.readFileSync(new URL("../src/ui/hub.js",import.meta.url),"utf8");
const state=fs.readFileSync(new URL("../src/state/gameState.js",import.meta.url),"utf8");
const lifecycle=fs.readFileSync(new URL("../src/state/runLifecycle.js",import.meta.url),"utf8");
const persistence=fs.readFileSync(new URL("../src/state/runPersistence.js",import.meta.url),"utf8");
const tournamentEngine=fs.readFileSync(new URL("../src/tournament/tournamentEngine.js",import.meta.url),"utf8");
const finalPersistence=fs.readFileSync(new URL("../src/state/finalSimPersistence.js",import.meta.url),"utf8");
const finalSim=fs.readFileSync(new URL("../src/sim/finalSim.js",import.meta.url),"utf8");
const mobile=fs.readFileSync(new URL("../src/ui/mobileExperience.js",import.meta.url),"utf8");
const nativeApp=fs.readFileSync(new URL("../src/runtime/nativeApp.js",import.meta.url),"utf8");
const expect=(condition,message)=>{if(!condition)throw new Error(message);};

for(const marker of [
  "v:6","phase","savedAt","seedNum","seedStr","rngCalls","bracket","fixtures","opponent","tournamentFormat","tournament",
  "currentWeather","oppChar","oppLineup","shopOffers","freeAgents","powerHist",
  "ghostOpponentId","ghostCheckedRounds","ghostSeenIds",
  "enterHub(true)","CopaRunPersistence","applyStorageMigrations"
])expect(html.includes(marker),`Save v6 alanı/geri yükleme işareti eksik: ${marker}`);
expect(hub.includes("function enterHub(restoring=false,ghostLocked=false)"),"Hub restore/Ghost kilit modu eksik");
expect(hub.includes("if(restoring){"),"Hub restore koruması eksik");
expect(state.includes("runRngCalls++"),"Deterministik RNG çağrı sayacı eksik");
expect(html.includes('["draft","draw","hub","match","reward"].includes(st.phase)'),"Draft/kura/maç/ödül aşamaları geri yüklenebilmeli");
expect(html.includes('restorePhase!=="draft"&&!st.picks.every(Boolean)'),"Eksik hub kaydı restore edilmemeli");
expect(html.includes("usedNames.clear()")&&!html.includes("usedNames=new Set"),"Sabit usedNames Set restore sırasında yeniden atanmamalı");
expect(html.includes("function hasCompleteStartingXI()"),"Tam ilk 11 kontrolü eksik");
expect(html.includes("if(!hasCompleteStartingXI()){showModal"),"Eksik ilk 11 ile maç başlatma engeli eksik");
expect(html.includes("choose.locked")&&html.includes("||!p||filled[idx])return false"),"Draft çift seçim/reentry koruması eksik");
expect(lifecycle.includes("illegal_transition")&&lifecycle.includes("incomplete_starting_xi"),"Merkezi state/invariant koruması eksik");
expect(html.includes("CopaFinalSimPersistence")&&html.includes("_tryResumeFinalCheckpoint"),"Final süreç-kapanması geri yükleme köprüsü eksik");
expect(finalSim.includes("getCheckpointState")&&finalSim.includes("restoreCheckpoint")&&finalSim.includes("rngState"),"Final motoru checkpoint/restore API'si eksik");
expect(html.includes('m.dataset.dismissOnEscape=dismissOnEscape?"true":"false"'),"Modal ESC kapatma politikası eksik");
expect(html.includes('if(!dismissOnEscape){e.preventDefault();e.stopPropagation();return;}'),"Modal içi ESC engeli eksik");
expect(html.includes('m.dataset.dismissOnEscape==="false"'),"Global ESC dinleyicisi kilitli modalı korumuyor");
expect(html.includes('tensionHtml+actionDock+"</div>",{dismissOnEscape:false})'),"Penaltı modalı ESC ile kapatmaya karşı kilitli değil");
expect(mobile.includes('modal.dataset.dismissOnEscape==="false"')&&nativeApp.includes('modal.dataset.dismissOnEscape==="false"'),"Mobil/native geri tuşu kilitli modalı korumuyor");
expect(html.includes('_saveState("match")')&&html.includes("_showPendingMatchResult"),"Normal maç sonucu atomik checkpoint ile korunmuyor");
expect(html.includes('_saveState("reward")')&&html.includes("rewardPendingRound"),"Ödül seçimi checkpoint ile korunmuyor");
expect(html.includes('window._rewardResolvedRound===round||_rewardActionLocked'),"Ödül çift işlem koruması eksik");
expect(hub.includes("shopOffers.includes(k)")&&hub.includes("expectedPrice"),"Kart pazarı teklif/fiyat doğrulaması eksik");

const makeStorage=()=>{const values=new Map();return{getItem:key=>values.has(key)?values.get(key):null,setItem:(key,value)=>values.set(key,String(value)),removeItem:key=>values.delete(key),values};};
const sandbox={window:null,localStorage:makeStorage(),sessionStorage:makeStorage(),Date,JSON,Object,Array,Number,Math,Set};
sandbox.window=sandbox;
vm.runInNewContext(tournamentEngine,sandbox,{filename:"tournamentEngine.js"});
vm.runInNewContext(persistence,sandbox,{filename:"runPersistence.js"});
const api=sandbox.CopaRunPersistence;
const picks=Array.from({length:11},(_,index)=>({name:`P${index}`,pos:"ST",ov:70}));
const legacy={v:4,picks,budget:10,round:2,seedNum:42,formName:"4-4-2",country:"TR"};
const migrated=api.migrate(legacy);
expect(migrated.v===6&&migrated.phase==="hub"&&migrated.tournamentFormat==="legacy_knockout_v1","v4 hub kaydı v6 legacy formatına migrate edilemedi");
expect(api.validate(migrated).ok,"Migrate edilen hub kaydı şema doğrulamasından geçmedi");
const partial=picks.map((player,index)=>index===3?null:player);
const draft=api.migrate({v:4,picks:partial,budget:20,round:1,seedNum:7,formName:"4-4-2",country:"TR"});
expect(draft.phase==="draft"&&draft.draft.remaining===1&&api.validate(draft).ok,"Eski kısmi draft kaydı migrate edilemedi");
expect(!api.validate({...migrated,picks:partial}).ok,"Eksik hub kaydı reddedilmedi");
const pendingMatch={...migrated,phase:"match",pendingMatchResolution:{round:2,gf:1,ga:0,advance:true,draw:false}};
expect(api.validate(pendingMatch).ok,"Bekleyen normal maç sonucu doğrulanamadı");
expect(!api.validate({...pendingMatch,pendingMatchResolution:null}).ok,"Checkpoint'siz maç aşaması kabul edildi");
const pendingReward={...migrated,phase:"reward",rewardPendingRound:2,rewardResolvedRound:0};
expect(api.validate(pendingReward).ok,"Bekleyen ödül aşaması doğrulanamadı");
expect(!api.validate({...pendingReward,rewardResolvedRound:2}).ok,"Çözülmüş ödül tekrar bekleyen kabul edildi");
const groupTournament=sandbox.CopaTournamentEngine.createTournament({seed:42,playerName:"COPA XI",playerPower:74,pool:Array.from({length:20},(_,index)=>`Club ${index}`),powerBases:[60,66,72,78,86,94]});
const drawState={...migrated,phase:"draw",round:1,tournamentFormat:"groups16_v1",tournament:groupTournament};
expect(api.validate(drawState).ok,"Grup kurası checkpoint'i doğrulanamadı");
expect(!api.validate({...drawState,tournament:{...groupTournament,groups:[]}}).ok,"Bozuk turnuva grafiği kabul edildi");
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

console.log("Run persistence OK: save v6, legacy migration, group draw graph and final minute/RNG checkpoints verified.");
