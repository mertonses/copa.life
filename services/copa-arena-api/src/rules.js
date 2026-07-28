import {ARENA_PLAYER_CATALOG,ARENA_PLAYER_CATALOG_VERSION,ARENA_PLAYER_COUNTRIES} from "./playerCatalog.js";

export const ARENA_RULES_VERSION="arena-rules-v4";
export const MIN_MANUAL_DECISIONS=2;
export const PHASE_SECONDS=Object.freeze({
  lobby:45,
  setup:60,
  draft:22,
  market:30,
  training:25,
  live:24,
  result:180
});

export const FORMATIONS=Object.freeze({
  "4-4-2":{attack:2,defense:1,midfield:0,wing:0},
  "4-3-3":{attack:2,defense:0,midfield:0,wing:2},
  "4-2-3-1":{attack:0,defense:1,midfield:2,wing:1},
  "3-5-2":{attack:1,defense:-1,midfield:3,wing:0}
});

export const STYLES=Object.freeze({
  balanced:{attack:0,defense:0,midfield:1,stamina:1},
  press:{attack:1,defense:0,midfield:2,stamina:-2},
  counter:{attack:2,defense:1,midfield:-1,stamina:1},
  control:{attack:0,defense:1,midfield:3,stamina:-1}
});

export const CHAIRMEN=Object.freeze({
  babacan:{budget:4,chemistry:0,risk:0,flex:0},
  // Kept for rooms created with arena-rules-v1/v2. New matches always use Babacan.
  patron:{budget:4,chemistry:0,risk:0,flex:0},
  diplomat:{budget:1,chemistry:2,risk:0,flex:0},
  showman:{budget:2,chemistry:0,risk:2,flex:0},
  professor:{budget:1,chemistry:0,risk:0,flex:2}
});

export const LEGACY_DRAFT_LINES=Object.freeze(["GK","DEF","MID","WING","ST"]);
export const DRAFT_SLOTS=Object.freeze([
  {slot:"GK",line:"GK"},
  {slot:"LB",line:"DEF"},
  {slot:"CB1",line:"DEF"},
  {slot:"CB2",line:"DEF"},
  {slot:"RB",line:"DEF"},
  {slot:"CM1",line:"MID"},
  {slot:"CM2",line:"MID"},
  {slot:"AM",line:"MID"},
  {slot:"LW",line:"WING"},
  {slot:"RW",line:"WING"},
  {slot:"ST",line:"ST"}
]);
export const DRAFT_LINES=Object.freeze(DRAFT_SLOTS.map(item=>item.line));
export const TACTICS=Object.freeze(["press","balanced","counter","control"]);
export const TRAINING=Object.freeze(["finishing","shape","chemistry","recovery"]);
export const MARKET_CARDS=Object.freeze([
  {id:"twelfth",cost:4,attack:1,defense:0,midfield:1,chemistry:1,stamina:0,risk:0},
  {id:"counter",cost:3,attack:2,defense:0,midfield:-1,chemistry:0,stamina:0,risk:0},
  {id:"wall",cost:4,attack:0,defense:2,midfield:0,chemistry:0,stamina:1,risk:0},
  {id:"wonderkid",cost:5,attack:2,defense:0,midfield:0,chemistry:-1,stamina:0,risk:1},
  {id:"captain",cost:3,attack:0,defense:1,midfield:0,chemistry:2,stamina:0,risk:0},
  {id:"none",cost:0,attack:0,defense:0,midfield:0,chemistry:0,stamina:0,risk:0}
]);

const FIRST_NAMES=["Arda","Deniz","Mert","Onur","Emir","Can","Atlas","Eren","Kerem","Bora","Luca","Diego","Marco","Leo","Alex","Noah"];
const LAST_NAMES=["Aydın","Kaya","Demir","Erdem","Yalın","Aksoy","Costa","Rossi","Silva","Santos","Meyer","Mori","Ito","King","Stone","Reed"];
const FULL_XI_RULES=new Set(["arena-rules-v3","arena-rules-v4"]);
const DRAFT_TIERS=Object.freeze(["connector","reliable","star"]);

export function hashSeed(value){
  let hash=2166136261;
  for(const char of String(value)){hash^=char.codePointAt(0);hash=Math.imul(hash,16777619);}
  return hash>>>0;
}

export function rng(seed){
  let state=hashSeed(seed)||0x9e3779b9;
  return ()=>{
    state+=0x6D2B79F5;
    let value=state;
    value=Math.imul(value^(value>>>15),value|1);
    value^=value+Math.imul(value^(value>>>7),value|61);
    return ((value^(value>>>14))>>>0)/4294967296;
  };
}

const clamp=(value,min,max)=>Math.max(min,Math.min(max,Number(value)||0));
const round=value=>Math.round(Number(value)||0);
const pick=(random,list)=>list[Math.floor(random()*list.length)%list.length];

export function usesFullXI(rulesVersion=ARENA_RULES_VERSION){
  return FULL_XI_RULES.has(rulesVersion);
}

export function seasonKey(date=new Date()){
  const start=new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth(),1));
  const quarter=Math.floor(start.getUTCMonth()/3)+1;
  return `${start.getUTCFullYear()}-Q${quarter}`;
}

export function divisionFor(rating){
  const value=round(rating);
  if(value>=1600)return "efsane";
  if(value>=1450)return "elmas";
  if(value>=1300)return "altin";
  if(value>=1150)return "gumus";
  if(value>=1000)return "bronz";
  return "aday";
}

export function ratingDelta(homeRating,awayRating,score){
  const expected=1/(1+Math.pow(10,(Number(awayRating)-Number(homeRating))/400));
  return Math.max(-28,Math.min(28,Math.round(28*(Number(score)-expected))));
}

export function createLegacyDraftOffers(seed,line,step,side,slot=line){
  if(!LEGACY_DRAFT_LINES.includes(line))throw new Error("invalid_draft_line");
  const random=rng(`${seed}|${line}|${step}`);
  const bands=[
    {power:66+Math.floor(random()*4),cost:1,chemistry:2,trait:"connector"},
    {power:72+Math.floor(random()*5),cost:3,chemistry:1,trait:"reliable"},
    {power:79+Math.floor(random()*5),cost:6,chemistry:-1,trait:"star"}
  ];
  const rotation=(hashSeed(`${seed}|${side}|${step}`)%3);
  return bands.map((_,index)=>bands[(index+rotation)%3]).map((base,index)=>({
    id:`${line.toLowerCase()}-${step}-${index}-${hashSeed(`${seed}|${side}|${line}|${index}`).toString(36)}`,
    slot,
    line,
    name:`${pick(random,FIRST_NAMES)} ${pick(random,LAST_NAMES)}`,
    power:base.power,
    cost:base.cost,
    chemistry:base.chemistry,
    trait:base.trait
  }));
}

function arenaCost(player,tier){
  const potentialGap=Math.max(0,round(player.potential)-round(player.power));
  if(tier==="connector")return potentialGap>=6&&round(player.age)<=22?2:1;
  if(tier==="reliable")return round(player.power)>=76&&round(player.age)<=29?4:3;
  return round(player.power)>=82&&round(player.age)<=29?6:5;
}

function arenaChemistry(player,tier){
  let value=round(player.age)>=30?2:round(player.age)>=24?1:0;
  if(tier==="star"&&round(player.power)>=82)value--;
  return clamp(value,-1,2);
}

export function createDraftOffers(seed,line,step,side,slot=line){
  if(!LEGACY_DRAFT_LINES.includes(line))throw new Error("invalid_draft_line");
  const countryOffset=hashSeed(`${seed}|countries|${line}|${step}|${ARENA_PLAYER_CATALOG_VERSION}`)%ARENA_PLAYER_COUNTRIES.length;
  const offers=DRAFT_TIERS.map((tier,tierIndex)=>{
    const country=ARENA_PLAYER_COUNTRIES[(countryOffset+tierIndex*2)%ARENA_PLAYER_COUNTRIES.length];
    const pool=ARENA_PLAYER_CATALOG[line]&&ARENA_PLAYER_CATALOG[line][tier]&&ARENA_PLAYER_CATALOG[line][tier][country];
    if(!Array.isArray(pool)||!pool.length)throw new Error("missing_arena_player_pool");
    const player=pool[hashSeed(`${seed}|player|${line}|${step}|${tier}|${country}|${ARENA_PLAYER_CATALOG_VERSION}`)%pool.length];
    return {
      sourceId:player.sourceId,
      slot,
      line,
      name:player.name,
      power:round(player.power),
      cost:arenaCost(player,tier),
      chemistry:arenaChemistry(player,tier),
      trait:tier,
      country:player.country,
      club:player.club,
      age:round(player.age),
      position:player.position,
      potential:round(player.potential),
      leagueLevel:round(player.leagueLevel),
      marketHint:round(player.marketHint)
    };
  });
  const rotation=hashSeed(`${seed}|${side}|${step}`)%offers.length;
  return offers.map((_,index)=>offers[(index+rotation)%offers.length]).map((offer,index)=>({
    ...offer,
    id:`${line.toLowerCase()}-${step}-${index}-${hashSeed(`${seed}|${side}|${offer.sourceId}`).toString(36)}`
  }));
}

export function createMarketOffers(seed,side){
  const random=rng(`${seed}|market`);
  const pool=MARKET_CARDS.filter(card=>card.id!=="none");
  const chosen=[];
  while(chosen.length<3){
    const card=pool[Math.floor(random()*pool.length)];
    if(!chosen.some(item=>item.id===card.id))chosen.push({...card});
  }
  const rotation=hashSeed(`${seed}|market-order|${side}`)%chosen.length;
  const ordered=chosen.map((_,index)=>chosen[(index+rotation)%chosen.length]);
  return [...ordered,{...MARKET_CARDS.find(card=>card.id==="none")}];
}

export function initialPlayerState(input){
  return {
    owner:String(input.owner||""),
    clubName:String(input.clubName||"COPA CLUB").slice(0,29),
    rating:round(input.rating)||1000,
    ready:false,
    setup:null,
    draft:[],
    market:null,
    training:null,
    tactics:[],
    manualDecisions:0,
    connected:false,
    lastSeenAt:Date.now()
  };
}

export function resolveParticipation(players,outcomes){
  const eligible=players.map(player=>(Number(player&&player.manualDecisions)||0)>=MIN_MANUAL_DECISIONS);
  if(eligible[0]&&eligible[1])return {eligible,outcomes:[...outcomes],forfeitIndex:null,voided:false};
  if(!eligible[0]&&!eligible[1])return {eligible,outcomes:["draw","draw"],forfeitIndex:null,voided:true};
  const forfeitIndex=eligible[0]?1:0;
  return {
    eligible,
    outcomes:forfeitIndex===0?["loss","win"]:["win","loss"],
    forfeitIndex,
    voided:false
  };
}

export function validateSetup(choice){
  return !!choice&&Object.hasOwn(FORMATIONS,choice.formation)&&Object.hasOwn(STYLES,choice.style)&&Object.hasOwn(CHAIRMEN,choice.chairman);
}

export function teamSnapshot(player,rulesVersion=ARENA_RULES_VERSION){
  const legacy=!usesFullXI(rulesVersion);
  const expectedDraftLength=legacy?LEGACY_DRAFT_LINES.length:DRAFT_SLOTS.length;
  if(!validateSetup(player&&player.setup)||!Array.isArray(player.draft)||player.draft.length!==expectedDraftLength)return null;
  const formation=FORMATIONS[player.setup.formation],style=STYLES[player.setup.style],chairman=CHAIRMEN[player.setup.chairman];
  const card=MARKET_CARDS.find(item=>item.id===(player.market&&player.market.id))||MARKET_CARDS.at(-1);
  const linePowers=Object.fromEntries(LEGACY_DRAFT_LINES.map(line=>{
    const players=player.draft.filter(item=>item.line===line);
    return [line,players.length?players.reduce((sum,item)=>sum+round(item.power),0)/players.length:65];
  }));
  const spent=player.draft.reduce((sum,item)=>sum+round(item.cost),0)+round(card.cost);
  const budget=(legacy?20:44)+chairman.budget-spent;
  const chemistry=clamp(player.draft.reduce((sum,item)=>sum+round(item.chemistry),0)+chairman.chemistry+card.chemistry+(player.training==="chemistry"?2:0),-3,9);
  const base={
    attack:((linePowers.ST||65)*.58+(linePowers.WING||65)*.27+(linePowers.MID||65)*.15)/1,
    defense:((linePowers.GK||65)*.34+(linePowers.DEF||65)*.52+(linePowers.MID||65)*.14)/1,
    midfield:((linePowers.MID||65)*.58+(linePowers.WING||65)*.22+(linePowers.DEF||65)*.2)/1,
    stamina:72
  };
  base.attack+=formation.attack+style.attack+card.attack+(player.training==="finishing"?2:0);
  base.defense+=formation.defense+style.defense+card.defense+(player.training==="shape"?2:0);
  base.midfield+=formation.midfield+style.midfield+card.midfield+chemistry*.35;
  base.stamina+=style.stamina+card.stamina+(player.training==="recovery"?3:0);
  const power=round((base.attack+base.defense+base.midfield)/3+chemistry*.18);
  return {
    formation:player.setup.formation,
    style:player.setup.style,
    chairman:player.setup.chairman,
    attack:round(base.attack),
    defense:round(base.defense),
    midfield:round(base.midfield),
    stamina:round(base.stamina),
    chemistry:round(chemistry),
    budget,
    power,
    risk:chairman.risk+card.risk,
    flex:chairman.flex,
    card:card.id
  };
}

const COUNTERS=Object.freeze({press:"control",control:"counter",counter:"press"});
export function tacticEdge(home,away){
  if(home===away||home==="balanced"||away==="balanced")return 0;
  return COUNTERS[home]===away?1:-1;
}

export function resolveWindow(input){
  const random=rng(`${input.seed}|window|${input.window}`);
  const home=input.home,away=input.away;
  const homeTactic=TACTICS.includes(input.homeTactic)?input.homeTactic:"balanced";
  const awayTactic=TACTICS.includes(input.awayTactic)?input.awayTactic:"balanced";
  const late=Math.max(0,Number(input.window)-1);
  const edge=tacticEdge(homeTactic,awayTactic);
  const homeEdge=edge>=0?edge*(2.4+(home.flex||0)*.4):edge*Math.max(.8,2.4-(home.flex||0)*.4);
  const awayEdge=edge<=0?-edge*(2.4+(away.flex||0)*.4):-edge*Math.max(.8,2.4-(away.flex||0)*.4);
  const homeAttack=(home.attack*0.45+home.midfield*0.32-away.defense*0.37)+homeEdge-Math.max(0,72-home.stamina)*late*.12;
  const awayAttack=(away.attack*0.45+away.midfield*0.32-home.defense*0.37)+awayEdge-Math.max(0,72-away.stamina)*late*.12;
  const sharedRisk=((home.risk||0)+(away.risk||0))*.02;
  const homeXg=clamp(.42+(homeAttack-28)*.027+sharedRisk,0.15,1.25);
  const awayXg=clamp(.42+(awayAttack-28)*.027+sharedRisk,0.15,1.25);
  const goals=xg=>{
    let result=0;
    const shots=3+Math.floor(random()*3);
    for(let index=0;index<shots;index++)if(random()<xg/shots)result++;
    return Math.min(3,result);
  };
  const homeGoals=goals(homeXg),awayGoals=goals(awayXg);
  const start=Number(input.window)*30;
  const events=[];
  for(let index=0;index<homeGoals;index++)events.push({minute:start+5+Math.floor(random()*24),type:"goal",side:"home"});
  for(let index=0;index<awayGoals;index++)events.push({minute:start+5+Math.floor(random()*24),type:"goal",side:"away"});
  if(random()<.28)events.push({minute:start+4+Math.floor(random()*25),type:"card",side:random()<.5?"home":"away"});
  events.sort((a,b)=>a.minute-b.minute);
  return {homeGoals,awayGoals,homeXg:Number(homeXg.toFixed(2)),awayXg:Number(awayXg.toFixed(2)),events,edge};
}

export function resolvePenalty(seed,homePower,awayPower){
  const random=rng(`${seed}|penalties`);
  let home=0,away=0;
  for(let index=0;index<5;index++){
    if(random()<clamp(.72+(homePower-awayPower)*.003,.62,.84))home++;
    if(random()<clamp(.72+(awayPower-homePower)*.003,.62,.84))away++;
  }
  while(home===away){
    const h=random()<.74,a=random()<.74;
    home+=h?1:0;away+=a?1:0;
  }
  return [home,away];
}

export function rewardFor(outcome,currentRating,opponentRating){
  const score=outcome==="win"?1:outcome==="draw"?.5:0;
  const delta=ratingDelta(currentRating,opponentRating,score);
  return {
    ratingDelta:delta,
    seasonPoints:outcome==="win"?30:outcome==="draw"?12:5,
    tokenProgress:outcome==="win"?3:outcome==="draw"?2:1
  };
}

export function publicState(state,owner){
  const selfIndex=state.players.findIndex(player=>player.owner===owner);
  const opponentIndex=selfIndex===0?1:0;
  const self=state.players[selfIndex],opponent=state.players[opponentIndex];
  const hideCurrentDraft=state.phase==="draft";
  const legacy=!usesFullXI(state.rulesVersion);
  const chairman=self&&CHAIRMEN[self.setup&&self.setup.chairman]||CHAIRMEN.patron;
  const draftSpent=self?self.draft.reduce((sum,item)=>sum+round(item.cost),0):0;
  const draftStatus=self?{
    count:self.draft.length,
    total:legacy?LEGACY_DRAFT_LINES.length:DRAFT_SLOTS.length,
    budget:(legacy?20:44)+chairman.budget-draftSpent,
    power:self.draft.length?round(self.draft.reduce((sum,item)=>sum+round(item.power),0)/self.draft.length):0
  }:null;
  return {
    protocol:1,
    rulesVersion:state.rulesVersion||(state.participationPolicy?ARENA_RULES_VERSION:"arena-rules-v1"),
    matchId:state.matchId,
    phase:state.phase,
    deadline:state.deadline,
    selfIndex,
    draftStep:state.draftStep,
    window:state.window,
    score:state.score,
    events:state.events,
    result:state.result,
    self:self?{...self}:null,
    opponent:opponent?{
      clubName:opponent.clubName,
      rating:opponent.rating,
      ready:opponent.ready,
      connected:opponent.connected,
      setup:state.phase==="setup"?null:opponent.setup,
      draftCount:opponent.draft.length,
      draft:hideCurrentDraft&&opponent.draft.length>state.draftStep?opponent.draft.slice(0,-1):opponent.draft,
      market:state.phase==="market"?null:opponent.market,
      training:state.phase==="training"?null:opponent.training,
      tacticLocked:opponent.tactics.length>state.window
    }:null,
    offers:state.offers&&selfIndex>=0?state.offers[selfIndex]:null,
    draftStatus,
    team:self?teamSnapshot(self,state.rulesVersion):null,
    opponentTeam:["live","result"].includes(state.phase)&&opponent?teamSnapshot(opponent,state.rulesVersion):null
  };
}
