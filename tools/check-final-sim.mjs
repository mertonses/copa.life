import fs from "node:fs";

const sim = fs.readFileSync("src/sim/finalSim.js", "utf8");

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
    name: "live yellow-card rate stays restrained",
    pass: Number.isFinite(toRate(yellowRateMatch)) && toRate(yellowRateMatch) <= 0.008,
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
];

let failed = false;
for (const check of checks) {
  if (!check.pass) {
    failed = true;
    console.error(`final sim check failed: ${check.name}`);
  }
}

if (failed) process.exit(1);
console.log("Final.sim OK: pacing, discipline, wide play, and final transition guards are present.");
