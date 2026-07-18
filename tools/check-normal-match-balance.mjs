import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require=createRequire(import.meta.url);
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const core=require(path.join(ROOT,"src/sim/finalSimCore.js"));
const normal=require(path.join(ROOT,"src/game/normalMatch.js"));
const failures=[];
const expect=(condition,message)=>{if(!condition)failures.push(message);};

const source=fs.readFileSync(path.join(ROOT,"index.html"),"utf8");
const playSource=source.slice(source.indexOf("function playMatch("),source.indexOf("function afterMatch("));
expect(playSource.includes("CopaNormalMatch.simulate"),"normal rounds do not call the shared match adapter");
expect(!playSource.includes("opponentEdge("),"legacy opponent edge still changes the normal-match result");
expect(!playSource.includes("ri(-6,6)"),"legacy uniform score swing still changes the normal-match result");
expect(!playSource.includes("_variedScore("),"score is still decorated after deciding the outcome");

const buckets=[
  {name:"away_strong",home:66,away:80},
  {name:"away_edge",home:72,away:78},
  {name:"even",home:76,away:76},
  {name:"home_edge",home:78,away:72},
  {name:"home_strong",home:80,away:66}
];
const sampleSize=4000,report={modelVersion:core.MODEL_VERSION,sampleSize,buckets:{}};
for(const bucket of buckets){
  let home=0,draw=0,away=0,goals=0,shots=0;
  for(let index=0;index<sampleSize;index++){
    const result=normal.simulate({
      core,runSeed:index+1000,round:3,opponentName:bucket.name,
      homePower:bucket.home,awayPower:bucket.away,style:"kontra",cards:[]
    });
    if(result.outcome==="home")home++;
    else if(result.outcome==="draw")draw++;
    else away++;
    goals+=result.score[0]+result.score[1];
    shots+=result.stats.shots[0]+result.stats.shots[1];
    expect(!result.extraTime&&!result.penalties,"normal regulation result unexpectedly entered extra time");
  }
  report.buckets[bucket.name]={
    homeWinRate:home/sampleSize,drawRate:draw/sampleSize,awayWinRate:away/sampleSize,
    goalsPerMatch:goals/sampleSize,shotsPerMatch:shots/sampleSize
  };
}

const rates=buckets.map(bucket=>report.buckets[bucket.name].homeWinRate);
expect(rates.every((rate,index)=>index===0||rate>rates[index-1]),"power-gap home win rates are not strictly monotonic");
expect(report.buckets.even.homeWinRate>=0.32&&report.buckets.even.homeWinRate<=0.38,"even-match regulation home win rate is outside the calibrated band");
expect(report.buckets.even.drawRate>=0.24&&report.buckets.even.drawRate<=0.35,"even-match draw rate is outside the calibrated band");
expect(report.buckets.home_strong.homeWinRate>=0.56,"strong home side is not rewarded enough");
expect(report.buckets.away_strong.homeWinRate<=0.18,"strong away side is not rewarded enough");
expect(report.buckets.even.goalsPerMatch>=1.75&&report.buckets.even.goalsPerMatch<=2.55,"normal-match goals are outside the calibrated band");

const config={core,runSeed:99,round:4,opponentName:"determinism",homePower:76,awayPower:75,style:"gegen",cards:["kontra"]};
const first=normal.simulate(config),second=normal.simulate(config);
expect(JSON.stringify(first)===JSON.stringify(second),"normal-match seed is not deterministic");
expect(first.config.resolution==="regulation","normal-match resolution contract is missing");
expect(normal.tacticForStyle("gegen")==="push"&&normal.tacticForStyle("blok")==="hold","game styles do not map to shared tactics");
const ghost=normal.simulate({...config,ghostProfile:{tactics:{style:"tiki"},cards:[{id:"kanat_akini"}]}});
expect(ghost.config.awayTactic==="calm"&&ghost.config.awayCards.includes("kanat_akini"),"Ghost tactics/cards are not transferred to the shared core");

if(failures.length){
  for(const failure of [...new Set(failures)])console.error(`[normal-match] ${failure}`);
  console.error(JSON.stringify(report,null,2));
  process.exit(1);
}
console.log("[normal-match] shared regulation core, deterministic scores and monotonic power bands passed");
console.log(JSON.stringify(report,null,2));
