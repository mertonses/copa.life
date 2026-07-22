import {createRequire} from "node:module";
import {fileURLToPath} from "node:url";
import path from "node:path";

const require=createRequire(import.meta.url);
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const engine=require(path.join(ROOT,"src/tournament/tournamentEngine.js"));
const core=require(path.join(ROOT,"src/sim/finalSimCore.js"));
const normal=require(path.join(ROOT,"src/game/normalMatch.js"));
const pool=Array.from({length:36},(_,index)=>({name:`Matrix Club ${index+1}`}));
const styles=["gegen","kontra","tiki","uzun","blok"];
const sampleSize=360;

function resolveMatch(state,match,seed){
  const home=state.teams[match.homeId],away=state.teams[match.awayId];
  const result=core.simulateMatch({
    resolution:match.stage==="group"?"regulation":"knockout",
    seed:engine.hashSeed(`${seed}|${match.id}`),
    homePower:home.power,awayPower:away.power,
    tactic:normal.tacticForStyle(home.style),awayTactic:normal.tacticForStyle(away.style)
  });
  return{score:result.score.slice(),winnerId:result.winner===0?home.id:result.winner===1?away.id:null,decidedBy:result.penalties?"penalties":result.extraTime?"extra_time":"regulation",fairPlay:{home:-(result.stats.yellow[0]+result.stats.red[0]*3),away:-(result.stats.yellow[1]+result.stats.red[1]*3)}};
}

function cohort(style){
  const totals={runs:sampleSize,qualified:0,champion:0,points:0,wins:0,draws:0,losses:0,penaltyDecisions:0,exits:{group:0,quarterfinal:0,semifinal:0,final:0,champion:0}};
  for(let run=0;run<sampleSize;run++){
    const seed=engine.hashSeed(`matrix|${style}|${run}`),state=engine.createTournament({seed,playerName:"MATRIX XI",playerPower:80,playerFormation:"4-3-3",playerStyle:style,pool,powerBases:[60,66,72,78,86,94]});
    engine.completeDraw(state);
    while(state.phase!=="complete"){
      const match=engine.getCurrentPlayerMatch(state);if(!match)throw new Error(`${style}: missing player match in ${state.phase}`);
      const resolution=resolveMatch(state,match,seed),playerHome=match.homeId==="player";
      if(match.stage==="group"){
        const gf=resolution.score[playerHome?0:1],ga=resolution.score[playerHome?1:0];
        if(gf>ga)totals.wins++;else if(gf===ga)totals.draws++;else totals.losses++;
      }else if(resolution.decidedBy==="penalties")totals.penaltyDecisions++;
      engine.completePlayerMatch(state,resolution,item=>resolveMatch(state,item,seed));
    }
    const row=engine.getPlayerGroup(state).table.find(item=>item.teamId==="player");
    totals.points+=row.points;
    if(state.group.qualified===true)totals.qualified++;
    if(state.player.champion){totals.champion++;totals.exits.champion++;}
    else totals.exits[state.player.exitStage]++;
    const validation=engine.validate(state);if(!validation.ok)throw new Error(`${style}: invalid completed state: ${validation.errors.join(",")}`);
  }
  const groupMatches=sampleSize*3;
  if(totals.wins+totals.draws+totals.losses!==groupMatches)throw new Error(`${style}: group outcome accounting drift`);
  if(Object.values(totals.exits).reduce((sum,value)=>sum+value,0)!==sampleSize)throw new Error(`${style}: exit-stage accounting drift`);
  return{
    qualificationRate:totals.qualified/sampleSize,championRate:totals.champion/sampleSize,
    averageGroupPoints:totals.points/sampleSize,groupWinRate:totals.wins/groupMatches,
    groupDrawRate:totals.draws/groupMatches,groupLossRate:totals.losses/groupMatches,
    penaltyDecisionRate:totals.penaltyDecisions/Math.max(1,totals.qualified),exits:totals.exits
  };
}

const report={model:core.MODEL_VERSION,playerPower:80,sampleSize,styles:{}};
for(const style of styles)report.styles[style]=cohort(style);
const values=Object.values(report.styles),qualification=values.map(value=>value.qualificationRate),champions=values.map(value=>value.championRate);
for(const [style,value] of Object.entries(report.styles)){
  if(value.qualificationRate<.42||value.qualificationRate>.92)throw new Error(`${style}: qualification rate outside playable band: ${value.qualificationRate}`);
  if(value.championRate<.015||value.championRate>.22)throw new Error(`${style}: champion rate outside replayable band: ${value.championRate}`);
  if(value.groupDrawRate<.12||value.groupDrawRate>.4)throw new Error(`${style}: draw rate outside plausible band: ${value.groupDrawRate}`);
  if(value.averageGroupPoints<3.5||value.averageGroupPoints>7.5)throw new Error(`${style}: average points outside playable band: ${value.averageGroupPoints}`);
}
if(Math.max(...qualification)-Math.min(...qualification)>.24)throw new Error("Style qualification spread is too large");
if(Math.max(...champions)-Math.min(...champions)>.12)throw new Error("Style championship spread is too large");

console.log(JSON.stringify(report,null,2));
console.log("Tournament style matrix passed: all five play styles preserve plausible group, qualification and trophy distributions.");
