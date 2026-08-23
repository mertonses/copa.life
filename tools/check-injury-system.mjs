import fs from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";

const read=path=>fs.readFileSync(new URL(`../${path}`,import.meta.url),"utf8");
const config=read("src/balance/config.js");
const html=read("index.html");
const state=read("src/state/gameState.js");
const persistence=read("src/state/runPersistence.js");
const cards=read("src/cards/cardEffects.js");
const native=read("android/app/src/main/java/life/copa/app/CopaAdsPlugin.java");
const fixture=read("src/runtime/testFixtures.js");

const random=[];
const sandbox={
  console,Math:Object.create(Math),Number,Object,Array,Set,
  picksBySlot:[],bench:[],injuredIdx:-1,econStats:{injuries:0},medicalProtectionTurns:0,
  style:"balanced",lastTalkResult:null,chairman:{id:"babacan"},lastCreditActive:0,
  torpilDebtPenalty:0,chairTrust:1,round:2,legacyCash:0,budget:30,finalPenalty:0,
  rand:()=>random.length?random.shift():0.5,rnd:list=>list[0],hasCard:()=>false
};
vm.createContext(sandbox);
vm.runInContext(config,sandbox,{filename:"config.js"});

const mild={name:"Mild",age:25};
sandbox.assignPlayerInjury(mild,1);
assert.equal(mild.injuryMatchesRemaining,1);
assert.equal(sandbox.injuryTreatmentCost(mild),3);
assert.equal(sandbox.injuryPlayRisk(mild),0.15);
const moderate={name:"Moderate",age:33};
sandbox.assignPlayerInjury(moderate,2);
assert.equal(moderate.injuryMatchesRemaining,2);
assert.equal(sandbox.injuryTreatmentCost(moderate),5);
assert.equal(sandbox.injuryPlayRisk(moderate),0.35);
const veteran={name:"Veteran",age:35};
sandbox.assignPlayerInjury(veteran,3);
assert.equal(veteran.injuryMatchesRemaining,2);
assert.equal(sandbox.injuryTreatmentCost(veteran),8,"34+ bakım ücreti uygulanmalı");
assert.equal(sandbox.injuryPlayRisk(veteran),0.55);
sandbox.clearPlayerInjury(veteran);
assert.deepEqual({injured:veteran.injured,level:veteran.injuryLevel,remaining:veteran.injuryMatchesRemaining,decision:veteran.injuryDecisionRound,played:veteran.injuryPlayedRound},{injured:false,level:0,remaining:0,decision:0,played:0});

const young={name:"Young",age:24,injured:false},old={name:"Old",age:36,injured:false};
sandbox.picksBySlot=[young,old];
random.push(0,0.9,0.1);
const victim=sandbox.applyRandomInjury(1);
assert.equal(victim,old,"yaş riski takım arkadaşına aktarılmamalı; yaşlı oyuncu ağırlıklı seçilmeli");
assert.equal(old.injured,true);
assert.equal(young.injured,false);

for(const marker of [
  "function _activeInjuryDecisionIdx()",
  "injuryDecisionRound=round",
  "injuryPlayedRound=round",
  "rand()<injuryPlayRisk(p)",
  "p.injuryMatchesRemaining=Math.max(0",
  "clearPlayerInjury(p)",
  "Önce sakat oyuncu için bir karar ver.",
  "old.injuryMatchesRemaining",
  "TEDAVİ · €",
  'rewardTitle=LT("REKLAM"',
  'const rewardButton=`<button class="inj-reward-btn'
])assert.ok(html.includes(marker),`index sakatlık sözleşmesi eksik: ${marker}`);
assert.ok(html.includes("!x.p.used&&!x.p.injured&&!x.p.suspended"),"sakat/cezalı oyuncu yedek seçeneği olarak sunulmamalı");
assert.ok(!/function doBackup[^\n]+old\.injured=false/.test(html),"yedek seçimi sakatlığı ücretsiz temizlememeli");
assert.ok(cards.includes('clearPlayerInjury(_ip)')&&cards.includes('clearPlayerInjury(_sp)'),"kart tedavisi sakatlık metadatasını temizlemeli");
assert.ok(fixture.includes("assignPlayerInjury(target,2)"),"deterministik fixture yeni sakatlık modelini kullanmalı");
assert.ok(state.includes("MAX_REWARDED_INJURY_HEALS=2"));
assert.ok(persistence.includes("Math.min(2,Number(state.rewardedInjuryHealsEarned))"));
assert.ok(native.includes("MAX_REWARDED_INJURY_HEALS_PER_RUN = 2"));

console.log("Injury system OK: severity pricing/recovery, 34+ care, explicit play risk, weighted age risk, bench persistence, save cap and Android 2/run reward verified.");
