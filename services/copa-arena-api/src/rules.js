import {
  ARENA_PLAYER_CATALOG,ARENA_PLAYER_CATALOG_VERSION,ARENA_PLAYER_COUNTRIES,ARENA_PLAYER_SOURCES
} from "./playerCatalog.js";

export const ARENA_RULES_VERSION="arena-rules-v10";
export const MIN_MANUAL_DECISIONS=6;
export const LEGACY_MIN_MANUAL_DECISIONS=2;
export const PHASE_SECONDS=Object.freeze({
  lobby:45,
  setup:60,
  draft:22,
  market:30,
  training:25,
  live:24,
  liveReveal:7,
  penalty:15,
  penaltyReveal:4,
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
  babacan:{budget:4,chemistry:0,risk:0,flex:0}
});
const LEGACY_CHAIRMEN=Object.freeze({
  patron:{budget:4,chemistry:0,risk:0,flex:0},
  diplomat:{budget:1,chemistry:2,risk:0,flex:0},
  showman:{budget:2,chemistry:0,risk:2,flex:0},
  professor:{budget:1,chemistry:0,risk:0,flex:2}
});
const chairmanFor=(id,rulesVersion)=>CHAIRMEN[id]||(!usesFullXI(rulesVersion)&&LEGACY_CHAIRMEN[id])||CHAIRMEN.babacan;

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
export const ARENA_EMOTES=Object.freeze(["hello","applause","fire","respect","easy","comeOn","yawn"]);
export const TRAINING=Object.freeze(["finishing","shape","chemistry","recovery"]);
export const MATCH_PLAN_SCENARIOS=Object.freeze(["adaptive","protect","brave"]);
export const MARKET_CARDS=Object.freeze([
  {id:"twelfth",category:"momentum",rarity:"signature",activation:"second_half",cost:4,attack:0,defense:0,midfield:1,chemistry:1,stamina:0,risk:0},
  {id:"counter",category:"doctrine",rarity:"elite",activation:"trailing",cost:3,attack:1,defense:0,midfield:-1,chemistry:0,stamina:1,risk:0},
  {id:"wall",category:"defense",rarity:"elite",activation:"leading",cost:4,attack:0,defense:1,midfield:0,chemistry:0,stamina:1,risk:0},
  {id:"wonderkid",category:"attack",rarity:"signature",activation:"late",cost:5,attack:1,defense:0,midfield:0,chemistry:-1,stamina:0,risk:1},
  {id:"captain",category:"leadership",rarity:"elite",activation:"pressure",cost:3,attack:0,defense:0,midfield:0,chemistry:2,stamina:0,risk:0},
  {id:"none",category:"reserve",rarity:"standard",activation:"none",cost:0,attack:0,defense:0,midfield:0,chemistry:0,stamina:0,risk:0}
]);

const FIRST_NAMES=["Arda","Deniz","Mert","Onur","Emir","Can","Atlas","Eren","Kerem","Bora","Luca","Diego","Marco","Leo","Alex","Noah"];
const LAST_NAMES=["Aydın","Kaya","Demir","Erdem","Yalın","Aksoy","Costa","Rossi","Silva","Santos","Meyer","Mori","Ito","King","Stone","Reed"];
const FULL_XI_RULES=new Set(["arena-rules-v3","arena-rules-v4","arena-rules-v5","arena-rules-v6","arena-rules-v7","arena-rules-v8","arena-rules-v9","arena-rules-v10"]);
const DRAFT_TIERS=Object.freeze(["connector","reliable","star"]);
const SLOT_POSITIONS=Object.freeze({
  GK:["GK"],LB:["LB"],CB1:["CB"],CB2:["CB"],RB:["RB"],
  CM1:["CM","DM"],CM2:["CM","DM"],AM:["AM","CM"],LW:["LW","LM"],RW:["RW","RM"],ST:["ST","CF"]
});
const SLOT_ADAPTED_POSITIONS=Object.freeze({
  GK:[],LB:["WB","CB"],CB1:["WB","LB","RB"],CB2:["WB","LB","RB"],RB:["WB","CB"],
  CM1:["AM","LM","RM"],CM2:["AM","LM","RM"],AM:["DM","LM","RM"],LW:["RW","RM","AM"],RW:["LW","LM","AM"],ST:["LW","RW","AM"]
});
const ADAPTED_POSITION_PENALTY=3;

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

export function allowsRegulationDraw(rulesVersion=ARENA_RULES_VERSION){
  return ["arena-rules-v6","arena-rules-v7","arena-rules-v8"].includes(rulesVersion);
}

export const LIVE_SEGMENTS=Object.freeze([
  {startMinute:0,endMinute:20,prompt:"opening"},
  {startMinute:20,endMinute:45,prompt:"control"},
  {startMinute:45,endMinute:70,prompt:"response"},
  {startMinute:70,endMinute:90,prompt:"finish"}
]);
export const PENALTY_ZONES=Object.freeze(["leftHigh","leftLow","center","rightLow","rightHigh"]);

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

export function chooseMatchCandidate(home,candidates,recentByOwner={}){
  const homeRecent=new Set(recentByOwner[home.owner]||[]);
  return [...candidates].sort((one,two)=>{
    const oneRepeat=homeRecent.has(one.owner)||(recentByOwner[one.owner]||[]).includes(home.owner);
    const twoRepeat=homeRecent.has(two.owner)||(recentByOwner[two.owner]||[]).includes(home.owner);
    if(oneRepeat!==twoRepeat)return Number(oneRepeat)-Number(twoRepeat);
    const oneGap=Math.abs(Number(one.rating)-Number(home.rating));
    const twoGap=Math.abs(Number(two.rating)-Number(home.rating));
    return oneGap-twoGap||Number(one.joined_at)-Number(two.joined_at);
  })[0]||null;
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

function arenaChemistry(player,tier,rulesVersion){
  if(tier==="connector"&&["arena-rules-v6","arena-rules-v7","arena-rules-v8","arena-rules-v9","arena-rules-v10"].includes(rulesVersion))return 2;
  let value=round(player.age)>=30?2:round(player.age)>=24?1:0;
  if(tier==="star"&&round(player.power)>=82)value--;
  return clamp(value,-1,2);
}

function draftOffer(player,tier,line,slot,rulesVersion){
  const position=String(player.position||"").toUpperCase();
  const natural=(SLOT_POSITIONS[slot]||[]).includes(position);
  const positionFit=natural?"natural":"adapted";
  const positionPenalty=positionFit==="adapted"&&["arena-rules-v7","arena-rules-v8","arena-rules-v9","arena-rules-v10"].includes(rulesVersion)?ADAPTED_POSITION_PENALTY:0;
  const power=round(player.power);
  const source=ARENA_PLAYER_SOURCES[player.sourceLeague]||{code:player.sourceLeague,label:{tr:player.sourceLeague,en:player.sourceLeague}};
  return {
    sourceId:player.sourceId,
    slot,
    line,
    name:player.name,
    power,
    effectivePower:Math.max(1,power-positionPenalty),
    positionPenalty,
    cost:arenaCost(player,tier),
    chemistry:arenaChemistry(player,tier,rulesVersion),
    trait:tier,
    sourceLeague:source.code,
    sourceLeagueLabel:source.label,
    nationality:null,
    club:player.club,
    age:round(player.age),
    position:player.position,
    positionFit,
    potential:round(player.potential),
    leagueLevel:round(player.leagueLevel),
    marketHint:round(player.marketHint)
  };
}

function candidatePair(seed,line,step,slot,tier,country,rulesVersion,reserved){
  const pool=ARENA_PLAYER_CATALOG[line]&&ARENA_PLAYER_CATALOG[line][tier]&&ARENA_PLAYER_CATALOG[line][tier][country];
  if(!Array.isArray(pool)||!pool.length)throw new Error("missing_arena_player_pool");
  const naturalPositions=SLOT_POSITIONS[slot]||[];
  const adaptedPositions=SLOT_ADAPTED_POSITIONS[slot]||[];
  const available=pool.filter(player=>!reserved.has(player.sourceId));
  const natural=available.filter(player=>naturalPositions.includes(String(player.position||"").toUpperCase()));
  const adapted=available.filter(player=>adaptedPositions.includes(String(player.position||"").toUpperCase()));
  const candidates=[...natural,...adapted.filter(player=>!natural.includes(player))];
  const fallback=available.filter(player=>!candidates.includes(player));
  const offers=[...(candidates.length>=2?candidates:available.length>=2?available:fallback)]
    .map(player=>draftOffer(player,tier,line,slot,rulesVersion));
  if(offers.length<2)throw new Error("exhausted_arena_player_pool");
  const pairs=[];
  for(let one=0;one<offers.length;one++)for(let two=one+1;two<offers.length;two++){
    const first=offers[one],second=offers[two];
    const fitMismatch=first.positionFit===second.positionFit?0:50;
    const adaptedPair=first.positionFit==="adapted"&&second.positionFit==="adapted"?12:0;
    const score=Math.abs(first.effectivePower-second.effectivePower)*10+
      Math.abs(first.cost-second.cost)*5+Math.abs(first.chemistry-second.chemistry)*2+fitMismatch+adaptedPair;
    pairs.push({offers:[first,second],score,tie:hashSeed(`${seed}|pair|${line}|${step}|${tier}|${country}|${first.sourceId}|${second.sourceId}`)});
  }
  pairs.sort((one,two)=>one.score-two.score||one.tie-two.tie);
  return pairs[0].offers;
}

export function createDraftOffers(seed,line,step,side,slot=line,rulesVersion=ARENA_RULES_VERSION,options={}){
  if(!LEGACY_DRAFT_LINES.includes(line))throw new Error("invalid_draft_line");
  const catalogVersion=options.catalogVersion||ARENA_PLAYER_CATALOG_VERSION;
  if(catalogVersion!==ARENA_PLAYER_CATALOG_VERSION)throw new Error("arena_catalog_version_unavailable");
  const reserved=new Set(options.reservedSourceIds||[]);
  const countryOffset=hashSeed(`${seed}|countries|${line}|${step}|${catalogVersion}`)%ARENA_PLAYER_COUNTRIES.length;
  const pairs=DRAFT_TIERS.map((tier,tierIndex)=>{
    const country=ARENA_PLAYER_COUNTRIES[(countryOffset+tierIndex*2)%ARENA_PLAYER_COUNTRIES.length];
    const pair=candidatePair(seed,line,step,slot,tier,country,rulesVersion,reserved);
    return hashSeed(`${seed}|pair-sides|${line}|${step}|${tier}|${country}`)%2?pair.reverse():pair;
  });
  const offers=pairs.map(pair=>pair[Number(side)===1?1:0]);
  const rotation=hashSeed(`${seed}|${side}|${step}`)%offers.length;
  return offers.map((_,index)=>offers[(index+rotation)%offers.length]).map((offer,index)=>({
    ...offer,
    id:`${line.toLowerCase()}-${step}-${index}-${hashSeed(`${seed}|${side}|${offer.sourceId}`).toString(36)}`
  }));
}

export function createDraftPlan(seed,rulesVersion=ARENA_RULES_VERSION,catalogVersion=ARENA_PLAYER_CATALOG_VERSION){
  if(catalogVersion!==ARENA_PLAYER_CATALOG_VERSION)throw new Error("arena_catalog_version_unavailable");
  const reserved=new Set();
  return DRAFT_SLOTS.map((item,step)=>{
    const options={catalogVersion,reservedSourceIds:[...reserved]};
    const round=[0,1].map(side=>createDraftOffers(seed,item.line,step,side,item.slot,rulesVersion,options));
    for(const offer of round.flat())reserved.add(offer.sourceId);
    return round;
  });
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

export function minimumFutureDraftCost(seed,side,afterStep,rulesVersion=ARENA_RULES_VERSION,draftPlan=null){
  const fullXI=usesFullXI(rulesVersion);
  const slots=fullXI?DRAFT_SLOTS:LEGACY_DRAFT_LINES.map(line=>({slot:line,line}));
  return slots.slice(Number(afterStep)+1).reduce((sum,item,offset)=>{
    const step=Number(afterStep)+1+offset;
    const offers=draftPlan&&draftPlan[step]&&draftPlan[step][side]
      ?draftPlan[step][side]
      :fullXI
      ?createDraftOffers(seed,item.line,step,side,item.slot,rulesVersion)
      :createLegacyDraftOffers(seed,item.line,step,side,item.slot);
    return sum+Math.min(...offers.map(offer=>round(offer.cost)));
  },0);
}

export function initialPlayerState(input){
  return {
    owner:String(input.owner||""),
    clubName:String(input.clubName||"").trim().slice(0,29),
    rating:round(input.rating)||1000,
    ready:false,
    setup:null,
    draft:[],
    market:null,
    training:null,
    tactics:[],
    manualDecisions:0,
    manualTactics:0,
    missedDecisions:0,
    forcedForfeit:false,
    forfeitReason:null,
    connected:false,
    lastSeenAt:Date.now()
  };
}

export function resolveParticipation(players,outcomes,policy="meaningful-participation-v2"){
  const eligible=players.map(player=>{
    const decisions=Number(player&&player.manualDecisions)||0;
    if(policy==="minimum-manual-v1")return decisions>=LEGACY_MIN_MANUAL_DECISIONS;
    const tactics=Number(player&&player.manualTactics)||0;
    return decisions>=MIN_MANUAL_DECISIONS&&(tactics>=1||decisions>=13);
  });
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

export function validateSetup(choice,rulesVersion=ARENA_RULES_VERSION){
  return !!choice&&Object.hasOwn(FORMATIONS,choice.formation)&&Object.hasOwn(STYLES,choice.style)&&
    (Object.hasOwn(CHAIRMEN,choice.chairman)||(!usesFullXI(rulesVersion)&&Object.hasOwn(LEGACY_CHAIRMEN,choice.chairman)));
}

export function normalizeMatchPlan(choice){
  if(typeof choice==="string"&&TRAINING.includes(choice))return {focus:choice,scenario:"adaptive"};
  if(!choice||!TRAINING.includes(choice.focus)||!MATCH_PLAN_SCENARIOS.includes(choice.scenario))return null;
  return {focus:choice.focus,scenario:choice.scenario};
}

export function teamSnapshot(player,rulesVersion=ARENA_RULES_VERSION){
  const legacy=!usesFullXI(rulesVersion);
  const expectedDraftLength=legacy?LEGACY_DRAFT_LINES.length:DRAFT_SLOTS.length;
  if(!validateSetup(player&&player.setup,rulesVersion)||!Array.isArray(player.draft)||player.draft.length!==expectedDraftLength)return null;
  if(["arena-rules-v7","arena-rules-v8","arena-rules-v9","arena-rules-v10"].includes(rulesVersion)){
    const identities=player.draft.map(item=>item.sourceId).filter(Boolean);
    if(new Set(identities).size!==identities.length)return null;
  }
  const formation=FORMATIONS[player.setup.formation],style=STYLES[player.setup.style],chairman=chairmanFor(player.setup.chairman,rulesVersion);
  const card=MARKET_CARDS.find(item=>item.id===(player.market&&player.market.id))||MARKET_CARDS.at(-1);
  const plan=normalizeMatchPlan(player.training)||{focus:"recovery",scenario:"adaptive"};
  const linePowers=Object.fromEntries(LEGACY_DRAFT_LINES.map(line=>{
    const players=player.draft.filter(item=>item.line===line);
    return [line,players.length?players.reduce((sum,item)=>
      sum+round(["arena-rules-v7","arena-rules-v8","arena-rules-v9","arena-rules-v10"].includes(rulesVersion)?(item.effectivePower??(Number(item.power)-Number(item.positionPenalty||0))):item.power),0
    )/players.length:65];
  }));
  const spent=player.draft.reduce((sum,item)=>sum+round(item.cost),0)+round(card.cost);
  const budget=(legacy?20:44)+chairman.budget-spent;
  const chemistry=clamp(
    player.draft.reduce((sum,item)=>sum+round(item.chemistry),0)+chairman.chemistry+card.chemistry+(plan.focus==="chemistry"?2:0),
    -3,["arena-rules-v6","arena-rules-v7","arena-rules-v8","arena-rules-v9","arena-rules-v10"].includes(rulesVersion)?18:9
  );
  const base={
    attack:((linePowers.ST||65)*.58+(linePowers.WING||65)*.27+(linePowers.MID||65)*.15)/1,
    defense:((linePowers.GK||65)*.34+(linePowers.DEF||65)*.52+(linePowers.MID||65)*.14)/1,
    midfield:((linePowers.MID||65)*.58+(linePowers.WING||65)*.22+(linePowers.DEF||65)*.2)/1,
    stamina:72
  };
  base.attack+=formation.attack+style.attack+card.attack+(plan.focus==="finishing"?2:0);
  base.defense+=formation.defense+style.defense+card.defense+(plan.focus==="shape"?2:0);
  base.midfield+=formation.midfield+style.midfield+card.midfield+chemistry*.35;
  base.stamina+=style.stamina+card.stamina+(plan.focus==="recovery"?3:0);
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
    card:card.id,
    plan
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
  return {
    window:Number(input.window),
    startMinute:start,
    endMinute:start+30,
    homeGoals,awayGoals,
    homeXg:Number(homeXg.toFixed(2)),awayXg:Number(awayXg.toFixed(2)),
    events,edge,
    tactics:[homeTactic,awayTactic],
    advantage:edge>0?"home":edge<0?"away":"neutral"
  };
}

export function resolveLiveSegment(input){
  const segment=LIVE_SEGMENTS[Number(input.segment)]||LIVE_SEGMENTS[0];
  const score=Array.isArray(input.score)?input.score:[0,0];
  const withLiveModifiers=(team,difference)=>{
    const next={...team},scenario=team.plan&&team.plan.scenario||"adaptive";
    if(scenario==="protect"){
      if(difference>0){next.defense+=2;next.attack-=1;}
      else if(difference===0)next.defense+=1;
      else next.attack+=1;
    }else if(scenario==="brave"){
      if(difference<0){next.attack+=2;next.defense-=1;}
      else if(difference===0)next.attack+=1;
      else next.midfield+=1;
    }else{
      if(difference>0)next.defense+=1;
      else if(difference<0)next.attack+=1;
      else next.midfield+=1;
    }
    if(team.card==="twelfth"&&Number(input.segment)===2){next.attack+=2;next.midfield+=1;}
    else if(team.card==="counter"&&difference<0)next.attack+=2;
    else if(team.card==="wall"&&difference>0)next.defense+=2;
    else if(team.card==="wonderkid"&&Number(input.segment)===3)next.attack+=2;
    else if(team.card==="captain"&&difference<=0){next.midfield+=1;next.stamina+=1;}
    return next;
  };
  const home=withLiveModifiers(input.home,score[0]-score[1]);
  const away=withLiveModifiers(input.away,score[1]-score[0]);
  const windowResult=resolveWindow({...input,home,away,window:Number(input.segment)});
  const random=rng(`${input.seed}|live-segment|${input.segment}`);
  const span=segment.endMinute-segment.startMinute;
  const durationFactor=span/30;
  const minute=()=>segment.startMinute+2+Math.floor(random()*Math.max(1,span-3));
  const events=windowResult.events
    .filter(event=>event.type!=="goal"||random()<durationFactor)
    .map(event=>({...event,minute:minute()}));
  const actionCount=2+Math.floor(random()*2);
  const actionTypes=["attack","shot","save"];
  for(let index=0;index<actionCount;index++){
    const type=pick(random,actionTypes);
    events.push({minute:minute(),type,side:random()<.5?"home":"away"});
  }
  events.sort((one,two)=>one.minute-two.minute||String(one.type).localeCompare(String(two.type)));
  const homeGoals=events.filter(event=>event.type==="goal"&&event.side==="home").length;
  const awayGoals=events.filter(event=>event.type==="goal"&&event.side==="away").length;
  return {
    ...windowResult,
    window:Number(input.segment),
    segment:Number(input.segment),
    prompt:segment.prompt,
    startMinute:segment.startMinute,
    endMinute:segment.endMinute,
    homeGoals,awayGoals,
    homeXg:Number((windowResult.homeXg*durationFactor).toFixed(2)),
    awayXg:Number((windowResult.awayXg*durationFactor).toFixed(2)),
    events
  };
}

export function resolvePenaltyKick(input){
  const shooterZone=PENALTY_ZONES.includes(input.shooterZone)?input.shooterZone:"center";
  const keeperZone=PENALTY_ZONES.includes(input.keeperZone)?input.keeperZone:"center";
  const random=rng(`${input.seed}|penalty-kick|${Number(input.kick)}`);
  const shooterPower=clamp(input.shooterPower,40,99);
  const keeperPower=clamp(input.keeperPower,40,99);
  const exact=shooterZone===keeperZone;
  const sameSide=shooterZone.slice(0,4)===keeperZone.slice(0,4)&&shooterZone!=="center"&&keeperZone!=="center";
  const missChance=clamp(.075-(shooterPower-70)*.0015,.025,.13);
  const saveChance=clamp((exact?.57:sameSide?.23:.055)+(keeperPower-shooterPower)*.004,.025,.78);
  const roll=random();
  const outcome=roll<missChance?(random()<.35?"post":"miss"):roll<missChance+saveChance?"save":"goal";
  return {goal:outcome==="goal",outcome,shooterZone,keeperZone};
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
  const chairman=self?chairmanFor(self.setup&&self.setup.chairman,state.rulesVersion):CHAIRMEN.babacan;
  const draftSpent=self?self.draft.reduce((sum,item)=>sum+round(item.cost),0):0;
  const draftStatus=self?{
    count:self.draft.length,
    total:legacy?LEGACY_DRAFT_LINES.length:DRAFT_SLOTS.length,
    budget:(legacy?20:44)+chairman.budget-draftSpent,
    power:self.draft.length?round(self.draft.reduce((sum,item)=>sum+round(item.effectivePower??item.power),0)/self.draft.length):0,
    recommendedReserve:state.phase==="draft"&&usesFullXI(state.rulesVersion)
      ?minimumFutureDraftCost(state.seed,selfIndex,state.draftStep,state.rulesVersion,state.draftPlan)
      :0
  }:null;
  return {
    protocol:1,
    mode:state.mode||"ranked",
    rulesVersion:state.rulesVersion||(state.participationPolicy?ARENA_RULES_VERSION:"arena-rules-v1"),
    catalogVersion:state.catalogVersion||null,
    playerSources:state.playerSources||null,
    matchId:state.matchId,
    phase:state.phase,
    deadline:state.deadline,
    selfIndex,
    draftStep:state.draftStep,
    window:state.window,
    liveStage:state.liveStage||"decision",
    matchMinute:Number(state.matchMinute)||0,
    windowResult:state.windowResult||null,
    liveSegments:LIVE_SEGMENTS,
    penalty:state.phase==="penalty"&&state.penalty?{
      stage:state.penalty.stage,
      kick:state.penalty.kick,
      round:state.penalty.round,
      turn:state.penalty.turn,
      firstShooter:state.penalty.firstShooter,
      score:[...state.penalty.score],
      kicks:[...state.penalty.kicks],
      history:state.penalty.history.map(item=>({...item})),
      selfRole:selfIndex===state.penalty.turn?"shooter":"keeper",
      selfLocked:!!state.penalty.choices[selfIndex],
      opponentLocked:!!state.penalty.choices[opponentIndex]
    }:null,
    score:state.score,
    events:state.events,
    result:state.result,
    rematch:state.phase==="result"&&state.rematch?{
      available:!!state.rematch.available,
      requested:!!state.rematch.requests[selfIndex],
      opponentRequested:!!state.rematch.requests[opponentIndex],
      launched:!!state.rematch.launched
    }:null,
    emotes:{
      self:state.emotes&&state.emotes[selfIndex]?{...state.emotes[selfIndex]}:null,
      opponent:state.emotes&&state.emotes[opponentIndex]?{...state.emotes[opponentIndex]}:null
    },
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
      tactics:state.phase==="result"
        ?opponent.tactics
        :(state.phase==="live"&&state.liveStage==="reveal"?opponent.tactics.slice(0,state.window+1):[]),
      tacticLocked:opponent.tactics.length>state.window
    }:null,
    offers:state.offers&&selfIndex>=0?state.offers[selfIndex]:null,
    draftStatus,
    team:self?teamSnapshot(self,state.rulesVersion):null,
    opponentTeam:["training","live","penalty","result"].includes(state.phase)&&opponent?teamSnapshot(opponent,state.rulesVersion):null
  };
}
