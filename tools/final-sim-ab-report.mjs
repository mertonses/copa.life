import fs from "node:fs";
import {createRequire} from "node:module";

const require=createRequire(import.meta.url);
const core=require("../src/sim/finalSimCore.js");
const checkMode=process.argv.includes("--check");
const MATCHES=4_000;
const variants={
  more:{tactic:"more"},
  push:{tactic:"push"},
  calm:{tactic:"calm"},
  hold:{tactic:"hold"},
  wing_card:{cards:["kanat_akini"]},
  counter_card:{cards:["kontra"]},
  positive_talk:{teamTalk:3}
};
const blank=()=>({winRate:0,shots:0,goalsFor:0,goalsAgainst:0,xg:0,cards:0,pressWins:0,wide:0,counters:0,possession:0});
const report={modelVersion:core.MODEL_VERSION,sampleSizePerVariant:MATCHES,deltas:{}};

for(const [name,changes] of Object.entries(variants)){
  const delta=blank();
  for(let index=1;index<=MATCHES;index++){
    const seed=(Math.imul(index,2654435761)^0xAB2026)>>>0;
    const base=core.simulateMatch({seed,homePower:72,awayPower:72});
    const variant=core.simulateMatch({seed,homePower:72,awayPower:72,...changes});
    delta.winRate+=(variant.winner===0?1:0)-(base.winner===0?1:0);
    delta.shots+=variant.stats.shots[0]-base.stats.shots[0];
    delta.goalsFor+=variant.score[0]-base.score[0];
    delta.goalsAgainst+=variant.score[1]-base.score[1];
    delta.xg+=variant.stats.xg[0]-base.stats.xg[0];
    delta.cards+=(variant.stats.yellow[0]+variant.stats.red[0])-(base.stats.yellow[0]+base.stats.red[0]);
    delta.pressWins+=variant.stats.pressWins[0]-base.stats.pressWins[0];
    delta.wide+=(variant.audit.sequenceCounts.WIDE_LEFT+variant.audit.sequenceCounts.WIDE_RIGHT)
      -(base.audit.sequenceCounts.WIDE_LEFT+base.audit.sequenceCounts.WIDE_RIGHT);
    delta.counters+=(variant.audit.sequenceCounts.COUNTER+variant.audit.sequenceCounts.PRESS_RECOVERY)
      -(base.audit.sequenceCounts.COUNTER+base.audit.sequenceCounts.PRESS_RECOVERY);
    delta.possession+=variant.stats.possession[0]-base.stats.possession[0];
  }
  Object.keys(delta).forEach(key=>{delta[key]=Math.round(delta[key]/MATCHES*1000)/1000;});
  report.deltas[name]=delta;
}

const d=report.deltas;
const checks=[
  ["surge creates more shots",d.more.shots>1,d.more.shots],
  ["surge creates more xG",d.more.xg>0.30,d.more.xg],
  ["surge exposes the defence",d.more.goalsAgainst>0.05,d.more.goalsAgainst],
  ["surge remains bounded",d.more.winRate<0.22,d.more.winRate],
  ["press creates recoveries",d.push.pressWins>2,d.push.pressWins],
  ["press increases discipline risk",d.push.cards>0.20,d.push.cards],
  ["calm improves possession",d.calm.possession>0.30,d.calm.possession],
  ["calm reduces cards",d.calm.cards<-0.08,d.calm.cards],
  ["calm reduces shot volume",d.calm.shots<-0.50,d.calm.shots],
  ["hold reduces conceded goals",d.hold.goalsAgainst<-0.10,d.hold.goalsAgainst],
  ["hold sacrifices attack",d.hold.shots<-1,d.hold.shots],
  ["wing card changes routes",d.wing_card.wide>0.25,d.wing_card.wide],
  ["wing card is not direct pay-to-win",Math.abs(d.wing_card.winRate)<0.05,d.wing_card.winRate],
  ["counter card changes routes",d.counter_card.counters>0.20,d.counter_card.counters],
  ["counter card is not direct pay-to-win",Math.abs(d.counter_card.winRate)<0.05,d.counter_card.winRate],
  ["positive talk gives a bounded lift",d.positive_talk.winRate>0.02&&d.positive_talk.winRate<0.10,d.positive_talk.winRate]
];
let failed=false;
for(const [name,ok,value] of checks){
  console.log(`${ok?"OK":"FAIL"} final A/B: ${name} = ${Number(value).toFixed(3)}`);
  if(!ok)failed=true;
}
console.log(JSON.stringify(report,null,2));
if(!checkMode){
  fs.mkdirSync("outputs",{recursive:true});
  fs.writeFileSync("outputs/final-sim-ab.json",`${JSON.stringify(report,null,2)}\n`);
}
if(failed)process.exit(1);
