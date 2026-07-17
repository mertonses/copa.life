import fs from "node:fs";

const sim = fs.readFileSync("src/sim/finalSim.js", "utf8");
const core = fs.readFileSync("src/sim/finalSimCore.js", "utf8");
const replay = fs.readFileSync("src/runtime/finalReplay.js", "utf8");
const persistence = fs.readFileSync("src/state/finalSimPersistence.js", "utf8");
const penaltyPersistence = fs.readFileSync("src/state/penaltyPersistence.js", "utf8");
const calibration = fs.readFileSync("src/balance/finalCalibration.js", "utf8");
const lazy = fs.readFileSync("src/runtime/lazyAssets.js", "utf8");
const index = fs.readFileSync("index.html", "utf8");
const layout = fs.readFileSync("src/styles/layout.css", "utf8");

const wideBiasMatch = sim.match(/hasWingCard\?0\.(\d+):0\.(\d+)/);
const yellowRateMatch = sim.match(/roll<0\.(\d+)&&disciplineCooldown<=0/);
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
    pass:
      /secondYellow:round\(secondYellow,5\)/.test(core) &&
      /secondYellow=clamp\([^;]+0\.055\)/.test(core) &&
      /disciplineModel\.secondYellow/.test(sim),
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
  {
    name: "final test seed creates a final-ready hub",
    pass: /const _jumpToFinal=!!window\._wantFinal/.test(index) && /round=6;opponent=bracket\[5\]/.test(index),
  },
  {
    name: "pause state synchronizes visual and accessible controls",
    pass: /function _setFinalPauseUi\(paused\)/.test(index) && /aria-pressed/.test(index) && /_simAutoPaused/.test(index),
  },
  {
    name: "speed controls expose their selected state",
    pass: /querySelectorAll\("\.spd\[data-s\]"\)/.test(sim) && /setAttribute\("aria-pressed",active\?"true":"false"\)/.test(sim),
  },
  {
    name: "DOM-free deterministic core drives browser sequence and shot resolution",
    pass:
      /copa-final-core-v2/.test(core) &&
      /core\.chooseSequence/.test(sim) &&
      /core\.resolveShot/.test(sim) &&
      /finalSimCore\.js/.test(lazy),
  },
  {
    name: "visual and Monte Carlo engines share pass and discipline resolution",
    pass:
      /function passProbabilities/.test(core) &&
      /function resolvePass/.test(core) &&
      /function disciplineProbabilities/.test(core) &&
      /sharedCore\.passProbabilities/.test(sim) &&
      /sharedCore\.disciplineProbabilities/.test(sim),
  },
  {
    name: "final checkpoint preserves minute, RNG, players and ball",
    pass:
      /rngState/.test(sim) &&
      /teams:\[teamA\.map\(_snapshotPlayer\),teamB\.map\(_snapshotPlayer\)\]/.test(sim) &&
      /restoreCheckpoint/.test(sim) &&
      /MAX_AGE_MS/.test(persistence),
  },
  {
    name: "penalty checkpoint preserves attempts, order and RNG position",
    pass:
      /copa_penalty_checkpoint_v1/.test(penaltyPersistence) &&
      /rngCalls/.test(penaltyPersistence) &&
      /homeShots/.test(penaltyPersistence) &&
      /homeShooters/.test(penaltyPersistence) &&
      /_tryResumePenaltyCheckpoint/.test(index),
  },
  {
    name: "shareable replay code is versioned and contains no names",
    pass:
      /CFS\$\{REPLAY_VERSION\}/.test(core) &&
      /parseReplayCode/.test(core) &&
      /copyFinalReplayCode/.test(replay) &&
      !/playerName|clubName|teamName/.test(replay),
  },
  {
    name: "real replay viewer is read-only, seekable and accessible",
    pass:
      /openViewer/.test(replay) &&
      /finalReplayRange/.test(replay) &&
      /speechSynthesis/.test(replay) &&
      /aria-live="polite"/.test(replay) &&
      /timeline:cleanEvents/.test(replay),
  },
  {
    name: "weekly calibration stores only anonymous aggregate buckets",
    pass:
      /copa_final_calibration_v1/.test(calibration) &&
      /powerBands/.test(calibration) &&
      /endTypes/.test(calibration) &&
      /tactics/.test(calibration) &&
      !/seedNum|teamName|playerName|deviceId/.test(calibration),
  },
  {
    name: "final audit is user-visible and replay telemetry is seed-free",
    pass:
      /final-audit-details/.test(sim) &&
      /final_sim_completed/.test(sim) &&
      /power_gap/.test(sim) &&
      !/CopaAnalytics\.track\([\s\S]{0,300}seed/.test(sim),
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
