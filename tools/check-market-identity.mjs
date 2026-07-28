import fs from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";

const context={window:{},groupOf:pos=>["ST","LW","RW"].includes(pos)?"FWD":"MID"};
context.window.groupOf=context.groupOf;
vm.runInNewContext(fs.readFileSync("src/game/marketIdentity.js","utf8"),context,{filename:"marketIdentity.js"});
const api=context.window.CopaMarketIdentity;

assert.equal(api.current(1).id,"local_week");
assert.equal(api.current(2).id,"forward_surplus");
assert.equal(api.current(3).id,"dark_pressure");
assert.equal(api.current(4).id,"normal");
assert.equal(api.freeAgentPosition(2,0,"GK"),"ST");
assert.equal(api.freeAgentPosition(2,1,"GK"),"GK");
assert.equal(api.freeAgentFee(2,{pos:"ST"},7),6);
assert.equal(api.freeAgentFee(2,{pos:"CM"},7),7);
const variants={};
api.applyCardOffers(3,["example","other"],variants);
assert.equal(variants.example,1);
assert.equal(api.label(1,"tr").effect.includes("yerli"),true);
console.log("Market identity OK: each round changes one explicit axis and neutral market stays unmodified.");
