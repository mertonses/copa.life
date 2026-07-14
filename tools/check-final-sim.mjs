import fs from "node:fs";

const sim = fs.readFileSync("src/sim/finalSim.js", "utf8");
const index = fs.readFileSync("index.html", "utf8");
const layout = fs.readFileSync("src/styles/layout.css", "utf8");

const wideBiasMatch = sim.match(/hasWingCard\?0\.(\d+):0\.(\d+)/);
const yellowRateMatch = sim.match(/roll<0\.(\d+)&&disciplineCooldown<=0/);
const secondYellowMatch = sim.match(/rng\.bool\(0\.(\d+)\)&&stats\.reds\[0\]\+stats\.reds\[1\]<1/);
const toRate = (match) => (match ? Number(`0.${match[1]}`) : NaN);

const checks = [
  {
    name: "wide sequence base bias is visible",
    pass:
      wideBiasMatch &&
      Number(`0.${wideBiasMatch[1]}`) >= 0.58 &&
      Number(`0.${wideBiasMatch[2]}`) >= 0.44,
  },
  {
    name: "wide sequence chooses ready flank",
    pass: /leftReady=.*role==='LW'.*role==='LB'[\s\S]*rightReady=.*role==='RW'.*role==='RB'/.test(sim),
  },
  {
    name: "red-card teams become compact",
    pass: /redCompact=ownReds>0\?Math\.min\(0\.20,ownReds\*0\.09\):0/.test(sim),
  },
  {
    // Card volume was intentionally raised (matches were finishing with 0 bookings);
    // the effective per-tick rate is clamped in-engine to [0.008, 0.022].
    name: "live yellow-card rate stays in a readable band",
    pass: Number.isFinite(toRate(yellowRateMatch)) && toRate(yellowRateMatch) <= 0.022,
  },
  {
    name: "second yellow red cards are rare",
    pass: Number.isFinite(toRate(secondYellowMatch)) && toRate(secondYellowMatch) <= 0.004,
  },
  {
    name: "sterile matches can force real attacks",
    pass: /function startCentralProbe/.test(sim) && /function startWidePressure/.test(sim) && /lastForcedAttackTime/.test(sim),
  },
  {
    name: "commentary respects recent danger",
    pass: /lastDangerTime=matchTime/.test(sim) && /const recentDanger=matchTime-lastDangerTime<95/.test(sim),
  },
  {
    name: "red-card teams stop aggressive pressing",
    pass: /const press=shout==='push'&&ownReds===0/.test(sim),
  },
  {
    name: "golden goal raises attacking urgency",
    pass: /lastPressureAudit=matchTime-360/.test(sim) && /shotCooldown\[0\]=Math\.min\(shotCooldown\[0\],6\)/.test(sim),
  },
  {
    name: "golden goal falls through to penalties",
    pass: /goToFinalPenalties\(\)/.test(sim) && /goldenGoalMode=true/.test(sim),
  },
  {
    name: "penalty modal uses the circular tactical goalkeeper token",
    pass:
      /const _PEN_GK_SVG=/.test(index) &&
      /class=\"pen-gk-token-body\"/.test(index) &&
      /class=\"pen-gk-token-gloves\"/.test(index) &&
      !/pen-gk-(?:head|hair|shirt|arm|leg|boot)/.test(index) &&
      /penKeeperTokenIdle/.test(layout) &&
      /penKeeperTokenDiveL/.test(layout) &&
      /penKeeperTokenSaveL/.test(layout),
  },
  {
    name: "final penalty transition requires a rendered modal",
    pass: /window\._penaltyModalReady=true/.test(index) && /rendered===false\|\|!window\._penaltyModalReady/.test(sim),
  },
  {
    name: "final match HUD reports xG rather than an unnamed card stat",
    pass: /xg:\[0,0\]/.test(sim) && /shotExpectedGoals\(shooter,deliveryType\)/.test(sim) && /_dom\("statXg",stats\.xg/.test(sim) && /id=\"statXg\"/.test(index),
  },
  {
    name: "final report includes position-based xG in regular time and penalties",
    pass: /<span>xG<\/span>/.test(sim) && /const xgA=Number\(window\.xgA\|\|0\)\.toFixed\(1\)/.test(index),
  },
  {
    name: "Turkish sudden-death copy uses ANİ ÖLÜM",
    pass: /ANİ ÖLÜM/.test(index) && !/ANI ÖLÜM/.test(index),
  },
];

let failed = false;
for (const check of checks) {
  if (!check.pass) {
    failed = true;
    console.error(`final sim check failed: ${check.name}`);
  }
}

if (failed) process.exit(1);
console.log("Final.sim OK: pacing, discipline, wide play, xG, and final transition guards are present.");
