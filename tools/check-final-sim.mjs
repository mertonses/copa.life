import fs from "node:fs";

const sim = fs.readFileSync("src/sim/finalSim.js", "utf8");

const checks = [
  {
    name: "wide sequence base bias is visible",
    pass: /hasWingCard\?0\.52:0\.34/.test(sim),
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
    pass: /roll<0\.014&&disciplineCooldown<=0/.test(sim),
  },
  {
    name: "second yellow red cards are rare",
    pass: /rng\.bool\(0\.018\)&&stats\.reds\[0\]\+stats\.reds\[1\]<1/.test(sim),
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
