import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const read=file=>fs.readFileSync(path.join(root,file),"utf8");
const index=read("index.html");
const hub=read("src/ui/hub.js");
const css=read("src/styles/layout.css");
const config=read("src/balance/config.js");
const metaState=read("src/state/metaState.js");
const saveLoad=read("src/state/saveLoad.js");
const metaUnlocks=read("src/ui/metaUnlocks.js");

function requireMatch(source,pattern,message){
  if(!pattern.test(source))throw new Error(message);
}

requireMatch(index,/id="trustTile"[\s\S]*?id="trustInfoBtn"[\s\S]*?showTrustInfo\(\)/,"Chairman trust tile is missing its help button.");
requireMatch(index,/function showTrustInfo\(\)/,"Chairman trust help modal is missing.");
requireMatch(index,/Math\.max\(0,Math\.min\(3,/,"Trust help does not clamp the live value to 0-3.");
requireMatch(index,/Yeni run <b>1\/3<\/b> ile başlar/,"Trust help does not explain the starting value.");
requireMatch(index,/Normal maç galibiyeti <b>\+1<\/b>; beraberlik veya yenilgi <b>−1<\/b>/,"Trust help does not explain match-result changes.");
requireMatch(index,/Güven, seçili başkanın <b>aktif borç eşiğini<\/b> değiştirir/,"Trust help does not explain its active debt-threshold effect.");
requireMatch(index,/runMoney\(currentDebtLine\)/,"Trust help does not show the current active debt line.");
requireMatch(index,/DARK \/ risk/,"Trust help does not explain risky-card trust loss.");
requireMatch(hub,/trustInfoBtn[\s\S]*?aria-label/,"Trust help accessibility label is not refreshed with the locale.");
requireMatch(css,/#trustTile\.context-metric \.mtile-info/,"Trust help button is not styled with contextual metric tiles.");
requireMatch(css,/\.trust-info-modal\{[^}]*max-width:100%/,"Trust help modal is missing its width guard.");
requireMatch(css,/@media\(max-width:430px\)[\s\S]*?\.trust-info-modal\{width:calc\(100vw - 20px\)/,"Trust help modal is missing its mobile layout.");
requireMatch(metaUnlocks,/chooseChairUnlock[\s\S]*?meta_unlocked/,"Chairman unlock choice UI or telemetry is missing.");
requireMatch(saveLoad,/pendingChairChoices[\s\S]*?prepareChairUnlockChoices[\s\S]*?unlockChairChoice/,"Chairman unlock choices are not persisted.");

const context={
  Math,console,chairman:{id:"babacan"},chairTrust:1,lastCreditActive:0,torpilDebtPenalty:0,
  runEnded:false,budget:0,lastSackReason:"",econStats:{},legacyCash:0,
  localStorage:{
    value:"",
    setItem(_key,value){this.value=value;},
    getItem(){return this.value||null;}
  },
  eliteBonus:false,legacyFund:0
};
vm.createContext(context);
vm.runInContext(config,context,{filename:"src/balance/config.js"});
const trustLines=[0,1,2,3].map(value=>{context.chairTrust=value;return context.chairmanSackLimit();});
if(JSON.stringify(trustLines)!==JSON.stringify([-25,-28,-30,-32]))throw new Error(`Trust debt lines are not monotonic and calibrated: ${trustLines.join(",")}`);
vm.runInContext(metaState,context,{filename:"src/state/metaState.js"});
vm.runInContext(saveLoad,context,{filename:"src/state/saveLoad.js"});
const chairChoices=context.prepareChairUnlockChoices();
if(chairChoices.length!==3||chairChoices.some(id=>context.unlockedChairs.includes(id)))throw new Error("Chairman choice pool is not three locked options.");
const selected=chairChoices[0];
if(context.unlockChairChoice(selected)!==selected||!context.unlockedChairs.includes(selected)||context.pendingChairChoices.length)throw new Error("Chairman choice did not unlock exactly one option and clear the pending pool.");

console.log("Chairman trust info OK: active debt lines, persisted three-way unlock choice, localization, accessibility and mobile width guards verified.");
