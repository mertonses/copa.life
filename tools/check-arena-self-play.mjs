import {
  DRAFT_SLOTS,
  FORMATIONS,
  MARKET_CARDS,
  MATCH_PLAN_SCENARIOS,
  STYLES,
  TACTICS,
  TRAINING,
  createDraftPlan,
  initialPlayerState,
  resolveLiveSegment,
  teamSnapshot
} from "../services/copa-arena-api/src/rules.js";

const RUNS=Number(process.argv.find(argument=>argument.startsWith("--runs="))?.split("=")[1]||400);
const DECISION_RUNS=Math.min(120,Math.max(30,RUNS));
const failures=[];
const draftPlans=new Map();
const strategies={
  connector:offers=>[...offers].sort((a,b)=>a.cost-b.cost||b.chemistry-a.chemistry)[0],
  reliable:offers=>offers.find(offer=>offer.trait==="reliable"),
  star:offers=>[...offers].sort((a,b)=>b.power-a.power||a.cost-b.cost)[0],
  value:offers=>[...offers].sort((a,b)=>(b.power+b.chemistry*1.5-b.cost*1.6)-(a.power+a.chemistry*1.5-a.cost*1.6))[0]
};

function assert(condition,message){
  if(!condition)failures.push(message);
}

function buildTeam(seed,side,strategyName,setup,marketId,training){
  const player=initialPlayerState({owner:`self-play-${side}`,clubName:`Self Play ${side}`,rating:1000});
  player.setup={...setup,chairman:"babacan"};
  const plan=draftPlans.get(seed)||createDraftPlan(seed);
  draftPlans.set(seed,plan);
  let remaining=48;
  player.draft=DRAFT_SLOTS.map((slot,step)=>{
    const offers=plan[step][side];
    const futureMinimum=DRAFT_SLOTS.slice(step+1).reduce((sum,futureSlot,futureOffset)=>{
      const futureStep=step+1+futureOffset;
      const futureOffers=plan[futureStep][side];
      return sum+Math.min(...futureOffers.map(offer=>offer.cost));
    },0);
    const affordable=offers.filter(offer=>offer.cost<=remaining-futureMinimum);
    const choice=strategies[strategyName](affordable);
    assert(Boolean(choice),`${seed}/${side}/${strategyName}: draft step ${step} has no completable choice`);
    remaining-=choice.cost;
    return choice;
  });
  const market=MARKET_CARDS.find(card=>card.id===marketId);
  player.market={id:market&&market.cost<=remaining?market.id:"none"};
  player.training=training;
  return {player,team:teamSnapshot(player),remaining};
}

function play(seed,home,away,homeTactics,awayTactics){
  const score=[0,0];
  for(let segment=0;segment<4;segment++){
    const result=resolveLiveSegment({
      seed,segment,score,home:home.team,away:away.team,
      homeTactic:homeTactics[segment],awayTactic:awayTactics[segment]
    });
    score[0]+=result.homeGoals;
    score[1]+=result.awayGoals;
    assert(result.events.every((event,index,events)=>
      event.minute>=result.startMinute&&event.minute<result.endMinute&&
      (index===0||events[index-1].minute<=event.minute)
    ),`${seed}: live events are outside their window or unordered`);
  }
  return score;
}

const strategyStats=Object.fromEntries(Object.keys(strategies).map(name=>[name,{
  games:0,wins:0,goals:0,power:0,budget:0,traits:{connector:0,reliable:0,star:0}
}]));
const matchupStats={};
let totalGoals=0;
let draws=0;
let homeWins=0;
let awayWins=0;
let totalMatches=0;
const seenDraftSignatures=new Set();
const seenScorelines=new Set();

for(let run=0;run<RUNS;run++){
  const formationNames=Object.keys(FORMATIONS);
  const styleNames=Object.keys(STYLES);
  for(const homeStrategy of Object.keys(strategies))for(const awayStrategy of Object.keys(strategies)){
    const seed=`arena-self-play-${run}-${homeStrategy}-${awayStrategy}`;
    const home=buildTeam(seed,0,homeStrategy,{
      formation:formationNames[(run+homeStrategy.length)%formationNames.length],
      style:styleNames[(run*5+homeStrategy.length)%styleNames.length]
    },MARKET_CARDS[(run+homeStrategy.length)%MARKET_CARDS.length].id,TRAINING[(run+homeStrategy.length)%TRAINING.length]);
    const away=buildTeam(seed,1,awayStrategy,{
      formation:formationNames[(run*7+awayStrategy.length)%formationNames.length],
      style:styleNames[(run*11+awayStrategy.length)%styleNames.length]
    },MARKET_CARDS[(run*13+awayStrategy.length)%MARKET_CARDS.length].id,TRAINING[(run*17+awayStrategy.length)%TRAINING.length]);
    assert(home.team.budget>=0&&away.team.budget>=0,`${seed}: a completed squad has negative budget`);
    assert(home.player.draft.length===11&&away.player.draft.length===11,`${seed}: incomplete XI`);
    assert(new Set(home.player.draft.map(player=>player.slot)).size===11,`${seed}: home XI repeats a slot`);
    assert(new Set(away.player.draft.map(player=>player.slot)).size===11,`${seed}: away XI repeats a slot`);
    assert(new Set(home.player.draft.map(player=>player.sourceId)).size===11,`${seed}: home XI repeats a player`);
    assert(new Set(away.player.draft.map(player=>player.sourceId)).size===11,`${seed}: away XI repeats a player`);
    assert(new Set([...home.player.draft,...away.player.draft].map(player=>player.sourceId)).size===22,`${seed}: a player appears for both clubs`);
    seenDraftSignatures.add(home.player.draft.map(player=>player.sourceId).join("|"));
    const homeTactics=TACTICS.map((_,index)=>TACTICS[(run+index+homeStrategy.length)%TACTICS.length]);
    const awayTactics=TACTICS.map((_,index)=>TACTICS[(run*3+index+awayStrategy.length)%TACTICS.length]);
    const score=play(seed,home,away,homeTactics,awayTactics);
    seenScorelines.add(score.join("-"));
    totalMatches++;
    totalGoals+=score[0]+score[1];
    if(score[0]===score[1])draws++;
    else if(score[0]>score[1])homeWins++;
    else awayWins++;
    const matchupKey=`${homeStrategy} vs ${awayStrategy}`;
    const matchup=matchupStats[matchupKey]||{games:0,homeWins:0,awayWins:0,draws:0};
    matchup.games++;
    if(score[0]===score[1])matchup.draws++;
    else if(score[0]>score[1])matchup.homeWins++;
    else matchup.awayWins++;
    matchupStats[matchupKey]=matchup;
    for(const [side,strategy,team] of [[0,homeStrategy,home],[1,awayStrategy,away]]){
      const stats=strategyStats[strategy];
      stats.games++;
      stats.goals+=score[side];
      stats.power+=team.team.power;
      stats.budget+=team.team.budget;
      for(const player of team.player.draft)stats.traits[player.trait]++;
      if(score[side]>score[side===0?1:0])stats.wins++;
    }
  }
}

const decided=homeWins+awayWins;
const averageGoals=totalGoals/totalMatches;
const drawRate=draws/totalMatches;
const homeShare=decided?homeWins/decided:.5;
assert(averageGoals>=1.2&&averageGoals<=4.4,`average goals ${averageGoals.toFixed(3)} outside 1.2-4.4`);
assert(drawRate>=.12&&drawRate<=.42,`draw rate ${(drawRate*100).toFixed(1)}% outside 12-42%`);
assert(homeShare>=.44&&homeShare<=.56,`home decided-win share ${(homeShare*100).toFixed(1)}% outside 44-56%`);
assert(seenDraftSignatures.size>=Math.min(100,Math.floor(totalMatches*.6)),`only ${seenDraftSignatures.size} distinct draft signatures`);
assert(seenScorelines.size>=8,`only ${seenScorelines.size} distinct scorelines`);

const report={
  seeds:RUNS,
  matches:totalMatches,
  averageGoals:Number(averageGoals.toFixed(3)),
  drawRate:Number(drawRate.toFixed(3)),
  homeDecidedWinShare:Number(homeShare.toFixed(3)),
  distinctDrafts:seenDraftSignatures.size,
  distinctScorelines:seenScorelines.size,
  strategies:Object.fromEntries(Object.entries(strategyStats).map(([name,stats])=>[name,{
    games:stats.games,
    winRate:Number((stats.wins/stats.games).toFixed(3)),
    goalsPerGame:Number((stats.goals/stats.games).toFixed(3)),
    averagePower:Number((stats.power/stats.games).toFixed(2)),
    averageBudget:Number((stats.budget/stats.games).toFixed(2)),
    traitSelections:stats.traits
  }])),
  matchups:Object.fromEntries(Object.entries(matchupStats).map(([name,stats])=>[name,{
    games:stats.games,
    homeWinRate:Number((stats.homeWins/stats.games).toFixed(3)),
    drawRate:Number((stats.draws/stats.games).toFixed(3)),
    awayWinRate:Number((stats.awayWins/stats.games).toFixed(3))
  }]))
};

const decisionMatrix={setup:{},market:{},training:{},scenario:{}};
function recordDecision(group,label,score,candidateSide){
  const entry=decisionMatrix[group][label]||{games:0,wins:0,draws:0,losses:0};
  const candidate=score[candidateSide],opponent=score[candidateSide===0?1:0];
  entry.games++;
  if(candidate>opponent)entry.wins++;
  else if(candidate===opponent)entry.draws++;
  else entry.losses++;
  decisionMatrix[group][label]=entry;
}

for(let run=0;run<DECISION_RUNS;run++){
  const baselineSetup={formation:"4-4-2",style:"balanced"};
  for(const formation of Object.keys(FORMATIONS))for(const style of Object.keys(STYLES)){
    const label=`${formation}/${style}`;
    for(const candidateSide of [0,1]){
      const seed=`decision-setup-${run}-${label}-${candidateSide}`;
      const candidate=buildTeam(seed,candidateSide,"reliable",{formation,style},"none","recovery");
      const baseline=buildTeam(seed,candidateSide===0?1:0,"reliable",baselineSetup,"none","recovery");
      const score=candidateSide===0
        ?play(seed,candidate,baseline,["balanced","balanced","balanced","balanced"],["balanced","balanced","balanced","balanced"])
        :play(seed,baseline,candidate,["balanced","balanced","balanced","balanced"],["balanced","balanced","balanced","balanced"]);
      recordDecision("setup",label,score,candidateSide);
    }
  }
  for(const card of MARKET_CARDS){
    const label=card.id;
    for(const candidateSide of [0,1]){
      const seed=`decision-market-${run}-${label}-${candidateSide}`;
      const candidate=buildTeam(seed,candidateSide,"reliable",baselineSetup,label,"recovery");
      const baseline=buildTeam(seed,candidateSide===0?1:0,"reliable",baselineSetup,"none","recovery");
      const score=candidateSide===0
        ?play(seed,candidate,baseline,["balanced","balanced","balanced","balanced"],["balanced","balanced","balanced","balanced"])
        :play(seed,baseline,candidate,["balanced","balanced","balanced","balanced"],["balanced","balanced","balanced","balanced"]);
      recordDecision("market",label,score,candidateSide);
    }
  }
  for(const training of TRAINING){
    const label=training;
    for(const candidateSide of [0,1]){
      const seed=`decision-training-${run}-${label}-${candidateSide}`;
      const candidate=buildTeam(seed,candidateSide,"reliable",baselineSetup,"none",label);
      const baseline=buildTeam(seed,candidateSide===0?1:0,"reliable",baselineSetup,"none","recovery");
      const score=candidateSide===0
        ?play(seed,candidate,baseline,["balanced","balanced","balanced","balanced"],["balanced","balanced","balanced","balanced"])
        :play(seed,baseline,candidate,["balanced","balanced","balanced","balanced"],["balanced","balanced","balanced","balanced"]);
      recordDecision("training",label,score,candidateSide);
    }
  }
  for(const scenario of MATCH_PLAN_SCENARIOS){
    for(const candidateSide of [0,1]){
      const seed=`decision-scenario-${run}-${scenario}-${candidateSide}`;
      const candidate=buildTeam(seed,candidateSide,"reliable",baselineSetup,"none",{focus:"recovery",scenario});
      const baseline=buildTeam(seed,candidateSide===0?1:0,"reliable",baselineSetup,"none",{focus:"recovery",scenario:"adaptive"});
      const score=candidateSide===0
        ?play(seed,candidate,baseline,["balanced","balanced","balanced","balanced"],["balanced","balanced","balanced","balanced"])
        :play(seed,baseline,candidate,["balanced","balanced","balanced","balanced"],["balanced","balanced","balanced","balanced"]);
      recordDecision("scenario",scenario,score,candidateSide);
    }
  }
}

for(const [group,entries] of Object.entries(decisionMatrix))for(const [label,entry] of Object.entries(entries)){
  const decided=entry.wins+entry.losses;
  entry.decidedWinRate=Number((decided?entry.wins/decided:.5).toFixed(3));
  entry.drawRate=Number((entry.draws/entry.games).toFixed(3));
  assert(entry.decidedWinRate>=.25&&entry.decidedWinRate<=.75,
    `${group} choice ${label} has unhealthy decided win rate ${entry.decidedWinRate}`);
}
report.decisions=decisionMatrix;
report.decisionSeeds=DECISION_RUNS;

const valueTraits=report.strategies.value.traitSelections;
const valueTotal=Object.values(valueTraits).reduce((sum,value)=>sum+value,0);
for(const [trait,count] of Object.entries(valueTraits)){
  assert(count/valueTotal>=.05,`${trait} appears in only ${(count/valueTotal*100).toFixed(1)}% of value-drafted slots`);
}

console.log(JSON.stringify(report,null,2));
if(failures.length){
  console.error(`Arena self-play failed with ${failures.length} issue(s):`);
  for(const failure of [...new Set(failures)].slice(0,30))console.error(`- ${failure}`);
  process.exitCode=1;
}else{
  console.log("Arena self-play checks passed.");
}
