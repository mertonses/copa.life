import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const checks = [
  ["ghost client", "src/online/ghostClubs.js", ["recordCompletedRun", "updateRun", "findOpponent", "flushQueue", "beginRun", "matchChance", "schemaVersion", "hasOpponentUsed", "markOpponentUsed", "cheatRun"]],
  ["hub bridge", "src/ui/hub.js", ["_maybeGhostOpponent", "_applyGhostOpponent", "ghostMeta", 'playUiSample("ghost"', "_ghostOpponentUsed"]],
  ["ghost sfx", "src/audio/sfx.js", ["assets/audio/ui/ghost.ogg", "playUiSample"]],
  ["ghost sfx asset", "assets/audio/ui/ghost.ogg", []],
  ["match bridge", "src/sim/finalSim.js", ["_ghostProfile", "ghostTactics"]],
  ["page bootstrap", "index.html", ["src/online/ghostClubs.js", "copa-ghost-api", "GhostClubs.recordCompletedRun", "_runUsesCheatSeed", "cheatRun"]],
  ["service worker", "sw.js", ["/src/online/ghostClubs.js", "/src/core/clubName.js", "ghost2"]],
  ["worker api", "services/ghost-club-api/src/index.js", ["/v1/ghosts", "/v1/ghosts/match", "valid(snapshot)", "eligibleUntil"]],
  ["worker schema", "services/ghost-club-api/schema.sql", ["ghost_runs", "eligible_until", "game_version"]],
];

let failures = 0;
for (const [label, relative, needles] of checks) {
  const file = path.join(root, relative);
  if (!fs.existsSync(file)) {
    console.error(`[ghosts] missing ${label}: ${relative}`);
    failures += 1;
    continue;
  }
  const text = fs.readFileSync(file, "utf8");
  const missing = needles.filter((needle) => !text.includes(needle));
  if (missing.length) {
    console.error(`[ghosts] ${label} missing: ${missing.join(", ")}`);
    failures += 1;
  }
}

if (failures) process.exit(1);

const storage=new Map();
let fetchCount=0;
const snapshot={
  schema_version:1,game_version:"2026.07.13",data_version:"2026.07.13",
  public_ghost_id:"G-TEST1234",squad_power:74,chemistry:2,formation:"4-3-3",reached_round:3,
  club:{name:"Tokyo Athletic",country:"JP"},chairman:{id:"babacan"},active_cards:[],
  starting_xi:Array.from({length:11},(_,index)=>({name:`Player ${index+1}`,pos:index?"OS":"KL",power:72+index%4})),
};
const math=Object.create(Math);math.random=()=>0;
const sandbox={
  console,Math:math,Date,JSON,URLSearchParams,
  localStorage:{getItem:key=>storage.has(key)?storage.get(key):null,setItem:(key,value)=>storage.set(key,String(value))},
  navigator:{onLine:true},
  document:{querySelector:selector=>selector==="meta[name='copa-ghost-api']"?{content:"https://ghost.test"}:null,getElementById:()=>null},
  fetch:async()=>{fetchCount++;return {ok:true,json:async()=>({ghost:snapshot})};},
  setTimeout:()=>0,
  addEventListener:()=>{},
};
sandbox.window=sandbox;sandbox.globalThis=sandbox;sandbox.LANG="en";
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(root,"src/core/clubName.js"),"utf8"),sandbox);
vm.runInContext(fs.readFileSync(path.join(root,"src/online/ghostClubs.js"),"utf8"),sandbox);

const ghosts=sandbox.GhostClubs;
ghosts.beginRun({seed:42,clubName:"Test United",country:"ENG",cheatRun:false});
const [first,simultaneous]=await Promise.all([
  ghosts.findOpponent({round:3,power:74}),
  ghosts.findOpponent({round:3,power:74}),
]);
assert.equal(first?.ghostId,"G-TEST1234");
assert.equal(simultaneous,null,"a concurrent second lookup must be gated");
assert.equal(fetchCount,1);
assert.equal(ghosts.markOpponentUsed(first.ghostId),true);
assert.equal(ghosts.hasOpponentUsed(),true);
assert.equal(await ghosts.findOpponent({round:4,power:76}),null,"a second ghost in the same run must be rejected");
assert.equal(fetchCount,1,"the one-per-run gate must stop before the network request");

storage.delete("copa_ghost_upload_queue_v1");
ghosts.beginRun({seed:99,clubName:"Cheat Athletic",country:"TR",cheatRun:true});
assert.equal(ghosts.recordCompletedRun({seed:99,teamName:"Cheat Athletic",cheatRun:false}),null,"cheat provenance must be sticky for the full run");
assert.deepEqual(JSON.parse(storage.get("copa_ghost_upload_queue_v1")||"[]"),[],"cheat runs must never enter the upload queue");

storage.delete("copa_ghost_upload_queue_v1");
ghosts.beginRun({seed:100,clubName:"Event Athletic",country:"JP",cheatRun:false});
const squad=Array.from({length:11},(_,index)=>({name:`Event Player ${index+1}`,pos:index?"OS":"KL",ov:70+index%4}));
assert.ok(ghosts.recordCompletedRun({
  seed:100,teamName:"Event Athletic",selectedCountry:"JP",picksBySlot:squad,
  run:{power:74,round:3},lastMatchEvents:[{m:56,home:true,name:"Silva",type:"goal"}],finalPenalty:2,
}),"eligible runs should enter the upload queue");
const queued=JSON.parse(storage.get("copa_ghost_upload_queue_v1")||"[]");
assert.equal(queued.length,1);
assert.deepEqual(queued[0].final_profile.events,[{minute:56,side:"home",type:"goal",name:"Silva"}],"match events must remain structured JSON");
assert.equal(JSON.stringify(queued).includes("[object Object]"),false,"object events must never be stringified implicitly");

console.log("[ghosts] one opponent per run, concurrent lookup gate, cheat exclusion, structured event serialization, client bridge, worker API, and schema checks passed.");
