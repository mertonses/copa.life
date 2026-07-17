import fs from "node:fs";
import {createRequire} from "node:module";

const require=createRequire(import.meta.url);
const core=require("../src/sim/finalSimCore.js");
const checkMode=process.argv.includes("--check");
const MATCHES=10_000;
const GAP_PATTERN=[-24,-18,-13,-9,-5,-2,0,2,5,9,13,18,24];

const blank=()=>({
  matches:0,homeWins:0,extraTime:0,penalties:0,goals:0,shots:0,xg:0,
  yellows:0,reds:0,saves:0,corners:0,wide:0,sequences:0
});
const totals=blank();
const buckets={
  away_strong:blank(),
  away_edge:blank(),
  even:blank(),
  home_edge:blank(),
  home_strong:blank()
};
const bucketFor=gap=>gap<=-12?"away_strong":gap<=-4?"away_edge":gap<=3?"even":gap<=11?"home_edge":"home_strong";
const add=(target,match)=>{
  target.matches++;
  target.homeWins+=match.winner===0?1:0;
  target.extraTime+=match.extraTime?1:0;
  target.penalties+=match.penalties?1:0;
  target.goals+=match.score[0]+match.score[1];
  target.shots+=match.stats.shots[0]+match.stats.shots[1];
  target.xg+=match.stats.xg[0]+match.stats.xg[1];
  target.yellows+=match.stats.yellow[0]+match.stats.yellow[1];
  target.reds+=match.stats.red[0]+match.stats.red[1];
  target.saves+=match.stats.saves[0]+match.stats.saves[1];
  target.corners+=match.stats.corners[0]+match.stats.corners[1];
  target.wide+=match.audit.wide;
  target.sequences+=match.audit.plannedSequences;
};

let deterministic=true;
for(let index=0;index<MATCHES;index++){
  const gap=GAP_PATTERN[index%GAP_PATTERN.length];
  const seed=(Math.imul(index+1,2654435761)^0xC0FA2026)>>>0;
  const config={seed,homePower:72+gap/2,awayPower:72-gap/2};
  const match=core.simulateMatch(config);
  if(index<64){
    const repeat=core.simulateMatch(config);
    if(JSON.stringify(match)!==JSON.stringify(repeat))deterministic=false;
    const replay=core.replay(match.replayCode);
    if(!replay||JSON.stringify(replay.score)!==JSON.stringify(match.score)||replay.winner!==match.winner)deterministic=false;
  }
  add(totals,match);
  add(buckets[bucketFor(gap)],match);
}

const summarize=value=>({
  matches:value.matches,
  homeWinRate:value.homeWins/value.matches,
  extraTimeRate:value.extraTime/value.matches,
  penaltyRate:value.penalties/value.matches,
  goalsPerMatch:value.goals/value.matches,
  shotsPerMatch:value.shots/value.matches,
  xgPerMatch:value.xg/value.matches,
  yellowPerMatch:value.yellows/value.matches,
  redPerMatch:value.reds/value.matches,
  savesPerMatch:value.saves/value.matches,
  cornersPerMatch:value.corners/value.matches,
  wideUsage:value.wide/Math.max(1,value.sequences)
});
const report={
  modelVersion:core.MODEL_VERSION,
  sampleSize:MATCHES,
  deterministic,
  overall:summarize(totals),
  powerGapBuckets:Object.fromEntries(Object.entries(buckets).map(([name,value])=>[name,summarize(value)]))
};
const b=report.powerGapBuckets,o=report.overall;
const checks=[
  ["shared model version",report.modelVersion==="copa-final-core-v2",report.modelVersion],
  ["10k real-core sample",report.sampleSize===10_000,report.sampleSize],
  ["same seed and replay are deterministic",deterministic,deterministic],
  ["power gap produces monotonic win rates",
    b.away_strong.homeWinRate<b.away_edge.homeWinRate&&
    b.away_edge.homeWinRate<b.even.homeWinRate&&
    b.even.homeWinRate<b.home_edge.homeWinRate&&
    b.home_edge.homeWinRate<b.home_strong.homeWinRate,
    Object.values(b).map(value=>value.homeWinRate.toFixed(3)).join(" < ")],
  ["strong-away home win band",b.away_strong.homeWinRate>=0.12&&b.away_strong.homeWinRate<=0.30,b.away_strong.homeWinRate],
  ["even-match home win band",b.even.homeWinRate>=0.46&&b.even.homeWinRate<=0.55,b.even.homeWinRate],
  ["strong-home win band",b.home_strong.homeWinRate>=0.70&&b.home_strong.homeWinRate<=0.88,b.home_strong.homeWinRate],
  ["goals per match",o.goalsPerMatch>=2.30&&o.goalsPerMatch<=3.30,o.goalsPerMatch],
  ["shots per match",o.shotsPerMatch>=14&&o.shotsPerMatch<=24,o.shotsPerMatch],
  ["xG per match",o.xgPerMatch>=2.40&&o.xgPerMatch<=3.50,o.xgPerMatch],
  ["saves per match",o.savesPerMatch>=4&&o.savesPerMatch<=11,o.savesPerMatch],
  ["yellow cards per match",o.yellowPerMatch>=0.8&&o.yellowPerMatch<=4,o.yellowPerMatch],
  ["red cards per match",o.redPerMatch<=0.20,o.redPerMatch],
  ["extra-time rate",o.extraTimeRate>=0.16&&o.extraTimeRate<=0.34,o.extraTimeRate],
  ["penalty rate",o.penaltyRate>=0.05&&o.penaltyRate<=0.18,o.penaltyRate],
  ["wide usage",o.wideUsage>=0.22&&o.wideUsage<=0.48,o.wideUsage]
];

let failed=false;
for(const [name,ok,value] of checks){
  const printable=typeof value==="number"?value.toFixed(3):String(value);
  console.log(`${ok?"OK":"FAIL"} final-core: ${name} = ${printable}`);
  if(!ok)failed=true;
}
console.log(JSON.stringify(report,null,2));
if(!checkMode){
  fs.mkdirSync("outputs",{recursive:true});
  fs.writeFileSync("outputs/final-sim-quality.json",`${JSON.stringify(report,null,2)}\n`);
}
if(failed)process.exit(1);
