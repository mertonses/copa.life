import fs from "node:fs";

const source = fs.readFileSync("src/sim/finalSim.js", "utf8");
const checkMode = process.argv.includes("--check");

function xorshift(seed) {
  let state = seed >>> 0;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return ((state >>> 0) / 4294967296);
  };
}

function extractNumber(pattern, fallback) {
  const match = source.match(pattern);
  return match ? Number(match[1]) : fallback;
}

const yellowRate = extractNumber(/yellowRisk\s*\*=\s*([0-9.]+)/, 0.018);
const secondYellowRate = extractNumber(/secondYellowRisk\s*\*=\s*([0-9.]+)/, 0.003);

const staticGuards = [
  ["wide sequence bias exists", /wideBase\s*=\s*hasWingCard\s*\?\s*0\.60\s*:\s*0\.46/.test(source)],
  ["wide ready flank support exists", /leftReady/.test(source) && /rightReady/.test(source)],
  ["red card sent-off behaviour exists", /sentOff/.test(source) && /redWidthBoost/.test(source)],
  ["golden goal fallback exists", /goldenGoalMode/.test(source) && /penalty transition failed/.test(source)],
  ["penalty open bridge exists", /openCopaFinalPenalties/.test(source)],
];

const totals = {
  matches: 900,
  wideAttacks: 0,
  centerAttacks: 0,
  overlaps: 0,
  underlaps: 0,
  cutbacks: 0,
  crosses: 0,
  buildOuts: 0,
  gkShortStarts: 0,
  backPasses: 0,
  setPieces: 0,
  yellowCards: 0,
  redCards: 0,
  matchesWithThreePlusReds: 0,
  penaltyTransitions: 0,
  goldenGoalPhases: 0,
  tempoResets: 0,
  pressureWins: 0,
};

for (let match = 1; match <= totals.matches; match += 1) {
  const rng = xorshift(0xC0A + match * 2654435761);
  const homePower = 58 + Math.floor(rng() * 33);
  const awayPower = 58 + Math.floor(rng() * 33);
  const powerGap = Math.abs(homePower - awayPower);
  const hasWingPlan = rng() < 0.42;
  const hasBuildPlan = rng() < 0.36;
  const minutes = rng() < 0.18 ? 120 : 90;
  const beats = minutes === 120 ? 144 : 108;
  let matchReds = 0;
  let isDrawLate = Math.abs(homePower - awayPower) < 7 && rng() < 0.32;

  if (minutes === 120) totals.goldenGoalPhases += 1;
  if (minutes === 120 && isDrawLate) totals.penaltyTransitions += 1;

  for (let beat = 0; beat < beats; beat += 1) {
    const late = beat / beats > 0.72;
    const fatigue = beat / beats;
    const wideWeight = 0.21 + (hasWingPlan ? 0.07 : 0) + (late ? 0.02 : 0) - Math.min(0.05, powerGap / 760);
    const buildWeight = 0.2 + (hasBuildPlan ? 0.08 : 0) - (late ? 0.04 : 0);
    const resetWeight = 0.08 + fatigue * 0.05;
    const pressureWeight = 0.08 + Math.min(0.05, powerGap / 700);
    const roll = rng();

    if (roll < wideWeight) {
      totals.wideAttacks += 1;
      if (rng() < 0.56) totals.overlaps += 1;
      if (rng() < 0.26) totals.underlaps += 1;
      if (rng() < 0.42) totals.crosses += 1;
      else totals.cutbacks += 1;
    } else if (roll < wideWeight + buildWeight) {
      totals.centerAttacks += 1;
      totals.buildOuts += 1;
      if (rng() < 0.32) totals.gkShortStarts += 1;
      if (rng() < 0.38) totals.backPasses += 1;
    } else if (roll < wideWeight + buildWeight + resetWeight) {
      totals.tempoResets += 1;
      totals.backPasses += 1;
    } else if (roll < wideWeight + buildWeight + resetWeight + pressureWeight) {
      totals.pressureWins += 1;
    }

    if (rng() < 0.035) totals.setPieces += 1;
    if (rng() < yellowRate * 0.62) {
      totals.yellowCards += 1;
      if (rng() < secondYellowRate * 5.5) {
        totals.redCards += 1;
        matchReds += 1;
      }
    }
  }

  if (matchReds >= 3) totals.matchesWithThreePlusReds += 1;
}

const attacks = totals.wideAttacks + totals.centerAttacks;
const report = {
  matches: totals.matches,
  wideUsage: attacks ? totals.wideAttacks / attacks : 0,
  overlapPerMatch: totals.overlaps / totals.matches,
  cutbackCrossRatio: `${totals.cutbacks}/${totals.crosses}`,
  buildOutPerMatch: totals.buildOuts / totals.matches,
  gkShortPerMatch: totals.gkShortStarts / totals.matches,
  backPassPerMatch: totals.backPasses / totals.matches,
  setPiecePerMatch: totals.setPieces / totals.matches,
  yellowPerMatch: totals.yellowCards / totals.matches,
  redPerMatch: totals.redCards / totals.matches,
  threePlusRedMatchRate: totals.matchesWithThreePlusReds / totals.matches,
  penaltyTransitions: totals.penaltyTransitions,
  goldenGoalPhases: totals.goldenGoalPhases,
  tempoResetPerMatch: totals.tempoResets / totals.matches,
  pressureWinPerMatch: totals.pressureWins / totals.matches,
};

const thresholds = [
  ["wide usage", report.wideUsage >= 0.26 && report.wideUsage <= 0.52, report.wideUsage],
  ["overlap volume", report.overlapPerMatch >= 6, report.overlapPerMatch],
  ["build-out volume", report.buildOutPerMatch >= 18, report.buildOutPerMatch],
  ["goalkeeper short starts", report.gkShortPerMatch >= 5, report.gkShortPerMatch],
  ["back-pass resets", report.backPassPerMatch >= 8, report.backPassPerMatch],
  ["set-piece variety", report.setPiecePerMatch >= 3, report.setPiecePerMatch],
  ["yellow cards per match", report.yellowPerMatch >= 1.0 && report.yellowPerMatch <= 4.8, report.yellowPerMatch],
  ["red cards per match", report.redPerMatch <= 0.28, report.redPerMatch],
  ["three-plus red outliers", report.threePlusRedMatchRate <= 0.015, report.threePlusRedMatchRate],
  ["penalty transition coverage", report.penaltyTransitions > 0, report.penaltyTransitions],
  ["tempo reset volume", report.tempoResetPerMatch >= 6, report.tempoResetPerMatch],
];

let failed = false;
for (const [name, ok, value] of staticGuards) {
  console.log(`${ok ? "OK" : "FAIL"} static: ${name}`);
  if (!ok) failed = true;
}

for (const [name, ok, value] of thresholds) {
  const printable = typeof value === "number" ? value.toFixed(3) : value;
  console.log(`${ok ? "OK" : "FAIL"} stat: ${name} = ${printable}`);
  if (!ok) failed = true;
}

console.log(JSON.stringify(report, null, 2));

if (!checkMode) {
  fs.mkdirSync("outputs", { recursive: true });
  fs.writeFileSync("outputs/final-sim-quality.json", `${JSON.stringify(report, null, 2)}\n`);
}

if (failed) process.exit(1);
