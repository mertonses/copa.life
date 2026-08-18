import fs from "node:fs";

const index=fs.readFileSync("index.html","utf8");
const fixture=fs.readFileSync("src/runtime/testFixtures.js","utf8");
const hub=fs.readFileSync("src/ui/hub.js","utf8");
const checks=[
  ["fixture is URL-gated",/testMode/.test(fixture)&&/Object\.freeze/.test(fixture)],
  ["injury fixture is deterministic and one-shot",/injuryConsumed=false/.test(fixture)&&/injuryLevel=2/.test(fixture)&&/!is\("injury"\)\|\|injuryConsumed/.test(fixture)],
  ["post-match uses fixture instead of random injury",/fixtureInjury=/.test(index)&&/is\("injury"\)\)\?null:applyRandomInjury/.test(index)],
  ["placement fixture enables coarse tap flow",/is\("placement"\)\)return true/.test(hub)&&/_tapPlaceOnSlot/.test(hub)],
  ["placement fixture supports Playwright/CUA pointer and mouse drag",/qaPointerPlacementReady/.test(hub)&&/pointerdown/.test(hub)&&/mousedown/.test(hub)&&/pointerup/.test(hub)&&/mouseup/.test(hub)],
  ["normal UI has no final replay/import/export controls",!/(openFinalReplayImport|copyFinalReplayCode|openFinalMatchReplay|finalReplayImportBtn|CopaFinalReplay)/.test(index+fs.readFileSync("src/sim/finalSim.js","utf8")+fs.readFileSync("src/ui/advancedSettings.js","utf8"))]
];
const failed=checks.filter(([,pass])=>!pass);
for(const [name,pass] of checks)console.log(`${pass?"PASS":"FAIL"} ${name}`);
if(failed.length)process.exit(1);
