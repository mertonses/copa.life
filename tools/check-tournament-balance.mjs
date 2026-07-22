import {createRequire} from "node:module";
import {fileURLToPath} from "node:url";
import path from "node:path";

const require=createRequire(import.meta.url);
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const engine=require(path.join(ROOT,"src/tournament/tournamentEngine.js"));
const core=require(path.join(ROOT,"src/sim/finalSimCore.js"));
const normal=require(path.join(ROOT,"src/game/normalMatch.js"));
const pool=Array.from({length:36},(_,index)=>({name:`Balance Club ${index+1}`}));
const powers=[64,72,80,88,96],sampleSize=700,report={model:core.MODEL_VERSION,sampleSize,powers:{}};

function resolveMatch(state,match,runSeed){
  const home=state.teams[match.homeId],away=state.teams[match.awayId];
  const result=core.simulateMatch({
    resolution:match.stage==="group"?"regulation":"knockout",
    seed:engine.hashSeed(`${runSeed}|${match.id}`),
    homePower:home.power,awayPower:away.power,
    tactic:normal.tacticForStyle(home.style),awayTactic:normal.tacticForStyle(away.style)
  });
  return{
    score:result.score.slice(),
    winnerId:result.winner===0?home.id:result.winner===1?away.id:null,
    decidedBy:result.penalties?"penalties":result.extraTime?"extra_time":"regulation",
    fairPlay:{home:-(result.stats.yellow[0]+result.stats.red[0]*3),away:-(result.stats.yellow[1]+result.stats.red[1]*3)}
  };
}

for(const playerPower of powers){
  let qualified=0,champion=0,points=0,groupWins=0,groupDraws=0,groupLosses=0,matches=0;
  let knockoutMatches=0,knockoutWins=0,knockoutLosses=0,knockoutPenaltyDecisions=0;
  for(let run=0;run<sampleSize;run++){
    const seed=910000+run*17+playerPower;
    const state=engine.createTournament({seed,playerName:"BALANCE XI",playerPower,playerFormation:"4-3-3",playerStyle:"gegen",pool,powerBases:[60,66,72,78,86,94]});
    engine.completeDraw(state);
    while(state.phase!=="complete"){
      const match=engine.getCurrentPlayerMatch(state);if(!match)throw new Error(`Missing player match at ${state.phase}`);
      const resolution=resolveMatch(state,match,seed),playerHome=match.homeId==="player";
      if(match.stage==="group"){
        const gf=resolution.score[playerHome?0:1],ga=resolution.score[playerHome?1:0];
        groupWins+=gf>ga?1:0;groupDraws+=gf===ga?1:0;groupLosses+=gf<ga?1:0;matches++;
      }else{
        knockoutMatches++;knockoutWins+=resolution.winnerId==="player"?1:0;knockoutLosses+=resolution.winnerId!=="player"?1:0;
        knockoutPenaltyDecisions+=resolution.decidedBy==="penalties"?1:0;
      }
      engine.completePlayerMatch(state,resolution,item=>resolveMatch(state,item,seed));
    }
    const row=engine.getPlayerGroup(state).table.find(item=>item.teamId==="player");
    points+=row.points;qualified+=state.group.qualified===true?1:0;champion+=state.player.champion===true?1:0;
  }
  report.powers[playerPower]={qualificationRate:qualified/sampleSize,championRate:champion/sampleSize,averageGroupPoints:points/sampleSize,groupWinRate:groupWins/matches,groupDrawRate:groupDraws/matches,groupLossRate:groupLosses/matches,knockoutWinRate:knockoutMatches?knockoutWins/knockoutMatches:0,knockoutLossRate:knockoutMatches?knockoutLosses/knockoutMatches:0,knockoutPenaltyRate:knockoutMatches?knockoutPenaltyDecisions/knockoutMatches:0};
  if(groupWins+groupDraws+groupLosses!==matches)throw new Error(`Group W/D/L accounting drifted at power ${playerPower}`);
  if(knockoutWins+knockoutLosses!==knockoutMatches)throw new Error(`Knockout outcome accounting drifted at power ${playerPower}`);
}

const values=powers.map(power=>report.powers[power]);
for(let index=1;index<values.length;index++){
  if(values[index].qualificationRate<=values[index-1].qualificationRate)throw new Error("Qualification rate is not monotonic by player power");
  if(values[index].championRate<=values[index-1].championRate)throw new Error("Champion rate is not monotonic by player power");
}
const even=report.powers[80];
if(even.qualificationRate<.45||even.qualificationRate>.9)throw new Error(`Power 80 qualification rate is outside the playable band: ${even.qualificationRate}`);
if(even.championRate<.04||even.championRate>.45)throw new Error(`Power 80 champion rate is outside the replayable band: ${even.championRate}`);
for(const value of values){
  if(value.groupDrawRate<.12||value.groupDrawRate>.4)throw new Error(`Group draw rate is implausible: ${value.groupDrawRate}`);
  if(value.averageGroupPoints<0||value.averageGroupPoints>9)throw new Error(`Group points escaped valid bounds: ${value.averageGroupPoints}`);
}
const favorite=report.powers[96];
if(favorite.qualificationRate<.9)throw new Error(`A clearly stronger squad is eliminated from the group too often: ${1-favorite.qualificationRate}`);
if(favorite.groupLossRate>.13)throw new Error(`A clearly stronger squad loses group matches too often: ${favorite.groupLossRate}`);

console.log(JSON.stringify(report,null,2));
console.log("Tournament balance checks passed: power response, qualification, trophy and draw rates are within calibrated bands.");
