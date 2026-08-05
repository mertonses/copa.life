import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const defsSource=fs.readFileSync(new URL("../src/cards/cardDefs.js",import.meta.url),"utf8");
const summarySource=fs.readFileSync(new URL("../src/cards/cardEffectSummary.js",import.meta.url),"utf8");
const defsContext={variantOf(){return 0;},opponent:{power:70}};
vm.createContext(defsContext);vm.runInContext(`${defsSource}\nthis.__defs=CARDDEFS;`,defsContext);

const root={
  LANG:"tr",CARDDEFS:defsContext.__defs,KARA_PEN:{doping:8},DARK_PURCHASE_RISKS:{derbi:{chance:.25,cash:7}},
  cardMode(key){return this.CARDDEFS[key]&&this.CARDDEFS[key].mode;},
  cardCostMeta(key){return key==="sahte_evrak"?{trust:1,risk:18}:{};}
};
root.window=root;const context={...root,window:root};vm.createContext(context);vm.runInContext(summarySource,context);
const api=root.CopaCardEffectSummary,keys=Object.keys(root.CARDDEFS);
assert.ok(api,"canonical card effect summary API must be installed");

for(const language of ["tr","en","es","de","it"]){
  root.LANG=language;
  for(const key of keys){
    const summary=api.summary(key,0,{power:3,price:4});
    assert.deepEqual(Object.keys(summary),["key","variant","power","duration","cost","risk","source"],`${language}/${key} must expose one stable effect contract`);
    for(const field of ["duration","cost","risk","source"])assert.ok(String(summary[field]).trim(),`${language}/${key}.${field} must be visible`);
    const html=api.render(summary);
    assert.equal((html.match(/<dt>/g)||[]).length,5,`${language}/${key} must render exactly five effect rows`);
  }
}
root.LANG="en";
assert.match(api.summary("doping",1,{power:5,price:6}).risk,/Final penalty/);
assert.match(api.summary("sahte_evrak",0,{power:2,price:3}).cost,/trust/);
console.log(`Card effect summary contract passed: ${keys.length} cards × 5 locales, five canonical fields each.`);
