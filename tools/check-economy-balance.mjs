import fs from "node:fs";
import vm from "node:vm";

const read=(file)=>fs.readFileSync(file,"utf8");
const files={
 html:read("index.html"),
 config:read("src/balance/config.js"),
 economy:read("src/balance/economy.js"),
 power:read("src/balance/power.js"),
 hub:read("src/ui/hub.js"),
 core:read("src/core/squad.js"),
 generate:read("src/game/generate.js"),
  effects:read("src/cards/cardEffects.js"),
  prices:read("src/cards/cardBalance.js"),
  telemetry:read("src/balance/telemetry.js"),
};

const failures=[];
const expect=(ok,message)=>{if(!ok)failures.push(message);};
const all=Object.values(files).join("\n");

expect(!/faiz|interest/i.test(all),"interest mechanic or copy still exists");
expect(/VARIANT_PRICE_MOD=\[1\.0,1\.25\]/.test(files.prices),"DARK price multiplier is not 1.25");
expect(/FINAL_DEBT_CAP=30/.test(files.config),"final risk safety cap is not 30");
expect(!/FINAL_CARD_POWER_CAP/.test(files.config),"aggregate final-card power cap still exists");
expect(/Math\.min\(amount,Math\.max\(0,FINAL_DEBT_CAP-before\)\)/.test(files.config),"final risk overflow guard is disconnected");
expect(/const finalCardApplied=r>=6\?finalCardRaw:0/.test(files.power),"aggregate final-card power is not applied in full");
expect(!/Math\.min\([^\n]*finalCardRaw|Math\.min\([^\n]*finalCardApplied/.test(files.power),"aggregate final-card power is capped in the power engine");
expect(/Math\.min\(v===1\?5:3,sub70\)/.test(read("src/cards/cardDefs.js")),"Anadolu Express card-specific cap is missing");
expect(/Math\.min\(v\?6:4,n\*\(v\?2:1\)\)/.test(read("src/cards/cardDefs.js")),"Wing Surge card-specific cap is missing");
expect(/Math\.min\(variantOf\("cift_forvet"\)===1\?8:4/.test(read("src/cards/cardDefs.js")),"Two Strikers card-specific cap is missing");
expect(/Math\.min\(v===1\?12:9,cbs\*\(v===1\?4:3\)\)/.test(files.effects),"The Bus card-specific cap is missing");
expect(/Math\.max\(-5,Math\.min\(5,total\)\)/.test(files.power),"chemistry engine is not clamped to -5/+5");
expect(/Math\.max\(-5,Math\.min\(5,cb\.total\)\)/.test(files.hub),"chemistry HUD is not clamped to -5/+5");
expect(/Kimya: -5 ile \+5 güç/.test(files.html)&&/Chemistry: -5 to \+5 power/.test(files.html),"power info still documents the old chemistry range");
expect(/COMMON final cezasının %50'sini, en fazla 6 gücü telafi eder/.test(files.html)&&/DARK offsets 65%, up to 10/.test(files.html),"fallback Crisis Management copy is stale");
expect(!/final_provasi\s*:\s*4/.test(files.effects),"Son Koz DARK still cancels its own final-only bonus");
expect(/final_provasi:\{chance:0\.25,cash:3\}/.test(files.effects),"Son Koz DARK purchase risk is not 25% / EUR3M");
expect(/anadolu:\{chance:0\.20,cash:5\}/.test(files.effects),"Anadolu Eksp. DARK is missing its purchase risk");
expect(/kriz:\{chance:0\.20,cash:5\}/.test(files.effects),"Crisis Management DARK is missing its purchase risk");
expect(/bu_adam:\{chance:0\.25,cash:6\}/.test(files.effects),"Joker DARK is missing its purchase risk");
expect(/derbi:\{chance:0\.25,cash:7\}/.test(files.effects),"Derby Lion DARK purchase risk is not 25% / EUR7M");
expect(!/derbi\s*:\s*4/.test(files.effects),"Derby Lion DARK still carries the old final deduction");
expect(/const g=v===1\?\[4,7,6\]/.test(files.html+files.power+read("src/cards/cardDefs.js")),"Derby Lion DARK round values are stale");
expect(/applyDarkPurchaseRisk\(k,variant\)/.test(files.effects),"DARK purchase risk is not connected to card acquisition");
expect(/CARD_PRICE_FLOOR=2/.test(files.config),"paid-card price floor is not 2");
expect(/playerMarketValue\(p\.ov,"free_agent",round\)/.test(files.html),"free agents do not use the shared player valuation curve");
expect(/free_agent:0\.90/.test(files.core),"free-agent valuation multiplier is not 0.90");
expect(/\*0\.10/.test(files.core)&&/freeAgentRoundFloor/.test(files.core),"free-agent round urgency or price floors are disconnected");
expect(/clampFreeAgentFee\(p\.ov,round,adjustedFee\)/.test(files.html),"free-agent target price bands are not enforced in the market");
expect(/Math\.min\(24,band\[1\]/.test(files.core),"free-agent EUR24M cap is missing");
expect(/playerMarketValue/.test(files.core)&&/chairmanTransferMultiplier/.test(files.generate),"draft valuation or chairman transfer modifier is disconnected");
expect(/installmentTurns>0/.test(files.economy),"installment offers can overwrite an outstanding payment plan");
expect(/legacyFund=Math\.min\(20/.test(files.html),"Legacy Vault total cap is not normalized to EUR20M");
expect(/Math\.min\(8,Math\.floor\(finalCashTotal\*0\.30\)\)/.test(files.html),"Legacy Vault carry-over is not 30% capped at EUR8M");
expect(/trackBalanceMatchTelemetry/.test(files.telemetry)&&/matchPowerTotal/.test(files.telemetry),"per-match card power telemetry is missing");
expect(/offerPriceTotal/.test(files.telemetry)&&/finalReached/.test(files.telemetry)&&/champion/.test(files.telemetry),"card economy outcome telemetry is incomplete");
expect(/baseChairmanSackLimit/.test(files.config)&&/pinti:-14/.test(files.config)&&/leydi:-21/.test(files.config)&&/babacan:-28/.test(files.config),"chairman debt limits are missing or stale");
expect(!/pinti:-12|cilgin:-31/.test(files.html),"stale chairman debt limits remain in the UI");
expect(/torpilDebtPenalty\*3/.test(files.config),"Torpilci rejection does not tighten debt by EUR3M");
expect(/pintiPremium/.test(files.prices)&&/base>=10/.test(files.prices),"Pinti premium-card surcharge is missing");
expect(!/chairman\.id==="pinti"[^\n]+def\.price>=10/.test(files.economy),"Pinti premium cards are still filtered out");
expect(/savingsResidualCash/.test(files.telemetry)&&/_pintiSavingsPow\(pow,sav\)/.test(files.html),"Pinti savings remainder is not tracked and returned");
expect(/CHAIRMAN_METRIC_KEYS/.test(files.telemetry)&&/trackChairmanMetric/.test(files.telemetry),"chairman behavior telemetry is missing");
expect(/const rate=v===1\?0\.65:0\.50/.test(files.effects)&&/const cap=v===1\?10:6/.test(files.effects)&&/Math\.min\(finalPenalty,cap,Math\.ceil\(finalPenalty\*rate\)\)/.test(files.effects),"Crisis Management does not enforce the 50% / 65% capped rule");
expect(/const gain=v===1\?18:10,pay=v===1\?7:4/.test(files.effects),"Installment Transfer behavior is out of sync");
expect(/const netPow=v===1\?4:3/.test(files.effects)&&/riskPowerMod\+=netPow/.test(files.effects),"Star Crisis behavior is out of sync");
expect(/if\(k==="buyuk_mac"\)\{\s*const pow=v===1\?10:6/.test(files.effects),"Big Game Player DARK reward is still dominated by COMMON");

const chemContext={
 Math,
 LANG:"tr",
 L:()=>({chem:{young:"genç",tr:"yerli",vet:"tecrübe",scattered:"Dağınık kadro",localGap:"Yerli çekirdek yok",leaderGap:"Saha içi lider yok"}}),
};
vm.createContext(chemContext);
vm.runInContext(files.power,chemContext,{filename:"src/balance/power.js"});
const fractured=Array.from({length:11},(_,i)=>({club:`Kulüp ${i}`,age:24+(i%5),tr:0,trait:null}));
const cohesive=Array.from({length:11},()=>({club:"Aynı Kulüp",age:30,tr:1,trait:null}));
const fracturedChem=chemContext.chemBonus(fractured);
const cohesiveChem=chemContext.chemBonus(cohesive);
expect(fracturedChem.total===-5,"fractured XI cannot reach the -5 chemistry floor");
expect(fracturedChem.parts.filter(part=>part[2]<0).reduce((sum,part)=>sum+part[2],0)===-5,"negative chemistry sources do not add up to -5");
expect(cohesiveChem.total===5,"cohesive XI cannot reach the +5 chemistry ceiling");

const finalStackContext={
 Math,
 LANG:"tr",
 L:()=>({chem:{young:"young",tr:"local",vet:"veteran",scattered:"scattered",localGap:"local gap",leaderGap:"leader gap"}}),
 picksBySlot:Array.from({length:11},(_,index)=>({ov:70,eff:70,club:"A",age:30,tr:true,pos:index===0?"GK":"CM"})),
 effOf:player=>player.eff,
 STYLES:{balanced:{eff:()=>0}},
 style:"balanced",
 cards:["final_a","final_b","normal"],
 cardEff:key=>({final_a:14,final_b:10,normal:2})[key]||0,
 cardKind:key=>key.startsWith("final_")?"final":"power",
 matchupBonus:0,
 riskPowerMod:0,
 tempPrimePenalty:0,
 shortCampPenalty:0,
 finalPenalty:0,
 TRAITS:{},
 talkMod:{all:0,def:0,atk:0},
 cnt:()=>0,
 DEFP:[],
 FWDP:[],
 captainIdx:-1,
};
vm.createContext(finalStackContext);
vm.runInContext(files.power,finalStackContext,{filename:"src/balance/power.js"});
const finalStack=finalStackContext.powerBreakdown(6);
expect(finalStack.finalCardRaw===24,"final-card stack fixture did not exceed the former 18-power cap");
expect(finalStack.finalCardApplied===24,"final-card stack is still being reduced to the former aggregate cap");
expect(finalStack.cardBonus===26,"non-final and final card power are not combined without an aggregate cap");

if(failures.length){console.error(failures.join("\n"));process.exit(1);}
console.log("Economy balance OK: card caps, uncapped final stack, final-risk guard, and -5/+5 chemistry verified.");
