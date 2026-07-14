import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const context={console};
context.globalThis=context;
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root,"src/core/clubName.js"),"utf8"),context);
vm.runInContext(fs.readFileSync(path.join(root,"src/data/opponents.js"),"utf8"),context);

const policy=context.ClubNamePolicy;
assert.ok(policy,"ClubNamePolicy must be exposed");
assert.equal(policy.MAX_LENGTH,29);

for(const name of ["Çaykur Rizespor","Brighton & Hove Albion","Real Racing Club de Santander","東京ヴェルディ","St. Pauli"]){
  assert.equal(policy.inspect(name).ok,true,`${name} should be accepted`);
}
assert.equal(policy.inspect("ＡＣ ＭＩＬＡＮ").value,"AC MILAN","NFKC normalization should be deterministic");
assert.equal(policy.inspect("L'Aquila").ok,true);

for(const name of [
  "<img src=x onerror=alert(1)>",
  "ABC\u202EDEF",
  "ABC\u200BDEF",
  "ABC\nDEF",
  "FC 💣",
  "PАRIS FC",
  "A".repeat(30),
  "--Club--",
]){
  assert.equal(policy.inspect(name).ok,false,`${JSON.stringify(name)} should be rejected`);
}

const pools=["OPP_POOL","OPP_POOL_EN","OPP_POOL_ES","OPP_POOL_IT","OPP_POOL_DE","OPP_POOL_JP"].flatMap(key=>context[key]||[]);
const longest=pools.reduce((best,name)=>Array.from(name).length>Array.from(best).length?name:best,"");
assert.equal(longest,"Real Racing Club de Santander");
assert.equal(Array.from(longest).length,policy.MAX_LENGTH,"limit must match the longest bundled club name");

const html=fs.readFileSync(path.join(root,"index.html"),"utf8");
assert.match(html,/maxlength="\$\{ClubNamePolicy\.MAX_LENGTH\}"/);
assert.match(html,/validateClubNameInput\(true\)/);
assert.match(html,/ClubNamePolicy\.sanitize\(st\.teamName/);

console.log("[club names] Unicode allowlist, 29-character data limit, UI validation, and restore sanitization passed.");
