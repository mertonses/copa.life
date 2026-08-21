import assert from "node:assert/strict";
import {execFileSync} from "node:child_process";
import {fileURLToPath} from "node:url";

const script=fileURLToPath(new URL("./changed-test-matrix.mjs",import.meta.url));
const plan=files=>JSON.parse(execFileSync(process.execPath,[script,"--files",files.join(",")],{encoding:"utf8"}));
assert.deepEqual(plan(["README.md"]),["contracts"]);
assert.deepEqual(plan(["src/sidefield/sideFieldUI.js"]),["contracts","navigation"]);
assert.deepEqual(plan(["services/copa-arena-api/src/rules.js"]),["contracts","arena"]);
assert.deepEqual(plan(["services/copa-arena-gateway/functions/[[path]].js"]),["contracts","arena"]);
assert.deepEqual(plan(["src/runtime/productAnalytics.js"]),["contracts","ghost"]);
assert.deepEqual(plan(["android/app/build.gradle"]),["contracts","native"]);
assert.deepEqual(plan(["package.json"]),["contracts","arena","ghost","navigation","native"]);
console.log("Changed-file matrix contract passed: core, UI, Arena, analytics and native suites route independently.");
