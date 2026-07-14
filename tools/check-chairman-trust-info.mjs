import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const read=file=>fs.readFileSync(path.join(root,file),"utf8");
const index=read("index.html");
const hub=read("src/ui/hub.js");
const css=read("src/styles/layout.css");

function requireMatch(source,pattern,message){
  if(!pattern.test(source))throw new Error(message);
}

requireMatch(index,/id="trustTile"[\s\S]*?id="trustInfoBtn"[\s\S]*?showTrustInfo\(\)/,"Chairman trust tile is missing its help button.");
requireMatch(index,/function showTrustInfo\(\)/,"Chairman trust help modal is missing.");
requireMatch(index,/Math\.max\(0,Math\.min\(3,/,"Trust help does not clamp the live value to 0-3.");
requireMatch(index,/Yeni run <b>1\/3<\/b> ile başlar/,"Trust help does not explain the starting value.");
requireMatch(index,/Normal maç galibiyeti <b>\+1<\/b>; beraberlik veya yenilgi <b>−1<\/b>/,"Trust help does not explain match-result changes.");
requireMatch(index,/Kovulma güven puanıyla değil[\s\S]*?<b>borç eşiği<\/b>/,"Trust help does not distinguish trust from the dismissal threshold.");
requireMatch(index,/DARK \/ risk/,"Trust help does not explain risky-card trust loss.");
requireMatch(hub,/trustInfoBtn[\s\S]*?aria-label/,"Trust help accessibility label is not refreshed with the locale.");
requireMatch(css,/#trustTile\.context-metric \.mtile-info/,"Trust help button is not styled with contextual metric tiles.");
requireMatch(css,/\.trust-info-modal\{[^}]*max-width:100%/,"Trust help modal is missing its width guard.");
requireMatch(css,/@media\(max-width:430px\)[\s\S]*?\.trust-info-modal\{width:calc\(100vw - 20px\)/,"Trust help modal is missing its mobile layout.");

console.log("Chairman trust info OK: help trigger, real mechanics, localization, accessibility and mobile width guards verified.");
