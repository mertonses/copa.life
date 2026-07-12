import fs from "node:fs";

const read=(file)=>fs.readFileSync(file,"utf8");
const files={
 html:read("index.html"),
 config:read("src/balance/config.js"),
 economy:read("src/balance/economy.js"),
 power:read("src/balance/power.js"),
 core:read("src/core/squad.js"),
 generate:read("src/game/generate.js"),
 effects:read("src/cards/cardEffects.js"),
 prices:read("src/cards/cardBalance.js"),
 telemetry:read("src/balance/telemetry.js"),
 legacy:read("src/legacy/v6-singlefile.html"),
};

const failures=[];
const expect=(ok,message)=>{if(!ok)failures.push(message);};
const all=Object.values(files).join("\n");

expect(!/faiz|interest/i.test(all),"interest mechanic or copy still exists");
expect(/VARIANT_PRICE_MOD=\[1\.0,1\.25\]/.test(files.prices),"DARK price multiplier is not 1.25");
expect(/FINAL_DEBT_CAP=30/.test(files.config),"final risk cap is not 30");
expect(/FINAL_CARD_POWER_CAP=18/.test(files.config),"final-only card stack cap is not 18");
expect(!/final_provasi\s*:\s*4/.test(files.effects),"Final Provası DARK still cancels its own final-only bonus");
expect(/final_provasi:\{chance:0\.25,cash:3\}/.test(files.effects),"Final Provası DARK purchase risk is not 25% / EUR3M");
expect(/anadolu:\{chance:0\.20,cash:5\}/.test(files.effects),"Anadolu Eksp. DARK is missing its purchase risk");
expect(/kriz:\{chance:0\.20,cash:5\}/.test(files.effects),"Crisis Management DARK is missing its purchase risk");
expect(/bu_adam:\{chance:0\.25,cash:6\}/.test(files.effects),"Surprise Factor DARK is missing its purchase risk");
expect(/applyDarkPurchaseRisk\(k,variant\)/.test(files.effects),"DARK purchase risk is not connected to card acquisition");
expect(/CARD_PRICE_FLOOR=2/.test(files.config),"paid-card price floor is not 2");
expect(/playerMarketValue\(p\.ov,"free_agent",round\)/.test(files.html),"free agents do not use the shared player valuation curve");
expect(/playerMarketValue/.test(files.core)&&/chairmanTransferMultiplier/.test(files.generate),"draft valuation or chairman transfer modifier is disconnected");
expect(/installmentTurns>0/.test(files.economy),"installment offers can overwrite an outstanding payment plan");
expect(/legacyFund=Math\.min\(20/.test(files.html),"Legacy Vault total cap is not normalized to EUR20M");
expect(/Math\.min\(8,Math\.floor\(finalCashTotal\*0\.30\)\)/.test(files.html),"Legacy Vault carry-over is not 30% capped at EUR8M");
expect(/trackBalanceMatchTelemetry/.test(files.telemetry)&&/matchPowerTotal/.test(files.telemetry),"per-match card power telemetry is missing");
expect(/offerPriceTotal/.test(files.telemetry)&&/finalReached/.test(files.telemetry)&&/champion/.test(files.telemetry),"card economy outcome telemetry is incomplete");
expect(/baseChairmanSackLimit/.test(files.config)&&/pinti:-14/.test(files.config)&&/babacan:-28/.test(files.config),"chairman debt limits are missing or stale");
expect(!/pinti:-12|cilgin:-31/.test(files.html),"stale chairman debt limits remain in the UI");
expect(/finalPenalty,relief,Math\.ceil\(finalPenalty\*0\.5\)/.test(files.effects),"Crisis Management does not enforce the half-penalty rule");
expect(/const gain=v===1\?18:10,pay=v===1\?7:4/.test(files.effects),"Installment Transfer behavior is out of sync");
expect(/const netPow=v===1\?4:3/.test(files.effects)&&/riskPowerMod\+=netPow/.test(files.effects),"Star Crisis behavior is out of sync");
expect(/if\(k==="buyuk_mac"\)\{\s*const pow=v===1\?10:6/.test(files.effects),"Big Game Player DARK reward is still dominated by COMMON");

if(failures.length){console.error(failures.join("\n"));process.exit(1);}
console.log("Economy balance OK: interest removed, caps/valuation/chairmen/telemetry verified.");
