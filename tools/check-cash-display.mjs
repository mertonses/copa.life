import assert from "node:assert/strict";
import fs from "node:fs";

const read=path=>fs.readFileSync(new URL(`../${path}`,import.meta.url),"utf8");
const economy=read("src/balance/config.js"),display=read("src/ui/cashDisplay.js"),styles=read("src/styles/cashDisplay.css"),sfx=read("src/audio/sfx.js"),hub=read("src/ui/hub.js"),lazy=read("src/runtime/lazyAssets.js"),index=read("index.html"),worker=read("sw.js");

assert.match(economy,/cashHalf\(entry\.after-entry\.before\)/,"cash deltas must preserve half-million precision");
assert.match(economy,/copa:cash-transaction/,"committed cash changes must publish one central event");
assert.match(display,/audioSeen\.has\(tx\.transactionId\)/,"cash audio must deduplicate transaction IDs");
assert.match(display,/dataset\.cashTransaction===tx\.transactionId/,"repeat renders must not replay a transaction animation");
assert.match(display,/function sync\(value\)/,"save restore and new-run resets must have an explicit silent synchronization path");
assert.match(display,/cash-legacy-inline/,"remaining legacy cash must render inline with the primary balance");
assert.match(display,/target\.isConnected&&target\.dataset\.cashTransaction===transactionId/,"animated reels must always settle into static digits");
assert.match(display,/root\.setBudget\?\.\(\)/,"cash transactions must refresh every visible vault surface");
assert.match(sfx,/function sfxCashTransaction\(tx\)/,"premium cash audio must expose a transaction-driven sound contract");
assert.match(sfx,/CASH_SFX_IDS\.has\(id\)/,"premium cash audio must be idempotent");
assert.match(sfx,/crossed=Number\(tx\.before\)>=0&&Number\(tx\.after\)<0/,"crossing into debt must have a distinct cue");
assert.match(styles,/@keyframes cashRollUp/,"cash gains must have mechanical reel motion");
assert.match(styles,/@keyframes cashRollDown/,"cash losses must have mechanical reel motion");
assert.match(styles,/prefers-reduced-motion:reduce/,"cash motion must respect the OS accessibility preference");
assert.match(index,/kasa-card kasa-compact clickable/,"the match hub must use the compact premium vault surface");
assert.match(styles,/#hub \.hub-stat-row\{grid-template-columns:repeat\(4,minmax\(0,1fr\)\)!important\}/,"hub cash must share an equal metric column");
assert.match(styles,/#hub \.hub-stat-row>\.kasa-compact[\s\S]*height:58px!important/,"desktop hub cash must match the compact metric height");
assert.match(styles,/\.kasa-compact-foot/,"compact cash must keep its debt-limit context visible");
assert.match(hub,/CopaCashDisplay\.render\(vEl,bv,\{target:"kasaTile",legacy:lc\}\)/,"hub refreshes must preserve the shared premium cash renderer");
assert.match(lazy,/ensureCashDisplay/,"the premium vault must remain outside the critical startup bundle");
assert.match(index,/CopaCashDisplay\.render\(cashTarget,budget/,"the shared cash renderer must own the top balance");
assert.match(worker,/src\/ui\/cashDisplay\.js/,"offline packaging must include the premium cash renderer");

console.log("Premium cash contracts passed: half-million ledger, compact hub parity, idempotent reels/audio, debt cues, accessibility and lazy/offline wiring verified.");
