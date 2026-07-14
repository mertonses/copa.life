import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const html=fs.readFileSync("index.html","utf8");
const hub=fs.readFileSync("src/ui/hub.js","utf8");
const power=fs.readFileSync("src/balance/power.js","utf8");

assert.match(hub,/function renderHub\(\)\{if\(typeof _currentCaptainPlayer==="function"\)_currentCaptainPlayer\(\);try\{if\(typeof _saveState/,
  "renderHub must synchronize captain identity before saving and calculating HUD power");
const pitchSwaps=[...hub.matchAll(/picksBySlot\[(?:_src\.idx|_tSrc\.idx|src)\]=b;?\s*picksBySlot\[i\]=a/g)];
assert.equal(pitchSwaps.length,3,
  "desktop drag, touch drag and tap placement swaps must remain covered");
pitchSwaps.forEach((match,index)=>assert.match(hub.slice(match.index,match.index+1400),/renderHub\(\);/,
  `pitch swap path ${index+1} must rerender the hub and recalculate squad power`));
assert.match(power,/const cap=typeof _currentCaptainPlayer==="function"\?_currentCaptainPlayer\(\)/,
  "power calculation must resolve the captain by player identity");
assert.match(html,/function setCaptain\(idx\)\{captainIdx=idx;captainPlayerRef=picksBySlot\[idx\]\|\|null;/,
  "captain selection must retain the selected player identity");

const currentSource=html.match(/function _currentCaptainPlayer\(\)\{[\s\S]*?\n\}/)?.[0];
const syncSource=html.match(/function _syncCaptainAfterLineupChange\(player\)\{[^\n]+\}/)?.[0];
assert.ok(currentSource&&syncSource,"captain identity helpers must exist");
const sandbox={picksBySlot:[],captainIdx:-1,captainPlayerRef:null};
vm.createContext(sandbox);
vm.runInContext(`var captainIdx=-1,captainPlayerRef=null;${currentSource};${syncSource};globalThis.api={current:_currentCaptainPlayer,sync:_syncCaptainAfterLineupChange,getIndex:()=>captainIdx};`,sandbox);
const a={name:"A"},captain={name:"Captain"},c={name:"C"},replacement={name:"Replacement"};
sandbox.picksBySlot=[a,captain,c];sandbox.api.sync(captain);
assert.equal(sandbox.api.getIndex(),1);
sandbox.picksBySlot=[captain,a,c];
assert.equal(sandbox.api.current(),captain,"captain must follow the same player after a pitch swap");
assert.equal(sandbox.api.getIndex(),0,"captain index must be derived from the player's new slot");
sandbox.picksBySlot=[replacement,a,c];
assert.equal(sandbox.api.current(),null,"a benched or replaced captain must not transfer the armband to the incoming player");
assert.equal(sandbox.api.getIndex(),-1);

console.log("Lineup sync OK: desktop/touch/tap swaps rerender power; captain identity follows the player and clears on replacement.");
