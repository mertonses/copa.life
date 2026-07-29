import {describe,expect,it} from "vitest";
import {
  ARENA_RULES_VERSION,CHAIRMEN,DRAFT_LINES,DRAFT_SLOTS,MIN_MANUAL_DECISIONS,allowsRegulationDraw,chooseMatchCandidate,createDraftOffers,createDraftPlan,createLegacyDraftOffers,createMarketOffers,divisionFor,initialPlayerState,
  LIVE_SEGMENTS,PENALTY_ZONES,minimumFutureDraftCost,normalizeMatchPlan,ratingDelta,resolveLiveSegment,resolveParticipation,resolvePenaltyKick,resolveWindow,rewardFor,teamSnapshot,tacticEdge,usesFullXI
} from "../src/rules.js";
import {
  ARENA_PLAYER_CATALOG,ARENA_PLAYER_CATALOG_VERSION,ARENA_PLAYER_COUNTRIES,ARENA_PLAYER_QUARANTINE_COUNT,ARENA_PLAYER_SOURCES
} from "../src/playerCatalog.js";

const planCache=new Map();
function planFor(seed){
  if(!planCache.has(seed))planCache.set(seed,createDraftPlan(seed));
  return planCache.get(seed);
}

function completedPlayer(seed,side,setup={formation:"4-4-2",style:"balanced",chairman:"babacan"}){
  const player=initialPlayerState({owner:`owner-${side}`,clubName:`Club ${side}`,rating:1000});
  player.setup=setup;
  const plan=planFor(seed);
  player.draft=DRAFT_LINES.map((_,index)=>plan[index][side][1]);
  player.market={id:"captain"};
  player.training="chemistry";
  return player;
}

describe("Arena rules",()=>{
  it("builds a real eleven-player draft with Babacan as the default chairman",()=>{
    const player=completedPlayer("eleven",0);
    expect(DRAFT_LINES).toHaveLength(11);
    expect(player.draft).toHaveLength(11);
    expect(teamSnapshot(player)).toMatchObject({chairman:"babacan"});
  });

  it("creates deterministic but side-specific fair draft offers",()=>{
    for(let step=0;step<DRAFT_LINES.length;step++){
      const one=createDraftOffers("seed",DRAFT_LINES[step],step,0);
      const two=createDraftOffers("seed",DRAFT_LINES[step],step,1);
      expect(createDraftOffers("seed",DRAFT_LINES[step],step,0)).toEqual(one);
      expect(one.map(item=>item.trait).sort()).toEqual(two.map(item=>item.trait).sort());
      expect(one.map(item=>item.sourceLeague).sort()).toEqual(two.map(item=>item.sourceLeague).sort());
      expect(new Set([...one,...two].map(item=>item.sourceId)).size).toBe(6);
      for(const trait of ["connector","reliable","star"]){
        const home=one.find(item=>item.trait===trait),away=two.find(item=>item.trait===trait);
        expect(Math.abs(home.effectivePower-away.effectivePower)).toBeLessThanOrEqual(2);
        expect(Math.abs(home.cost-away.cost)).toBeLessThanOrEqual(1);
      }
      expect(one.map(item=>item.id)).not.toEqual(two.map(item=>item.id));
    }
  });

  it("sources complete real-player profiles from all six cleared country databases",()=>{
    const countries=new Set();
    for(let run=0;run<40;run++)for(let step=0;step<DRAFT_LINES.length;step++){
      for(const offer of createDraftOffers(`country-${run}`,DRAFT_LINES[step],step,0)){
        countries.add(offer.sourceLeague);
        expect(offer).toMatchObject({
          sourceId:expect.stringMatching(/^CP-[A-F0-9]{16}$/),
          name:expect.any(String),
          club:expect.any(String),
          position:expect.any(String),
          age:expect.any(Number),
          potential:expect.any(Number),
          sourceLeague:expect.stringMatching(/^(TR|ES|DE|IT|ENG|JP)$/),
          nationality:null
        });
        const tierPool=ARENA_PLAYER_CATALOG[offer.line][offer.trait][offer.sourceLeague];
        expect(tierPool.some(player=>player.sourceId===offer.sourceId&&player.name===offer.name&&player.power===offer.power)).toBe(true);
        expect(offer.cost).toBeGreaterThanOrEqual(1);
        expect(offer.cost).toBeLessThanOrEqual(6);
        expect(offer.chemistry).toBeGreaterThanOrEqual(-1);
        expect(offer.chemistry).toBeLessThanOrEqual(2);
      }
    }
    expect([...countries].sort()).toEqual([...ARENA_PLAYER_COUNTRIES].sort());
    expect(ARENA_PLAYER_SOURCES.ENG.code).toBe("ENG");
    expect(ARENA_PLAYER_QUARANTINE_COUNT).toBeGreaterThan(0);
  });

  it("pins a globally unique, reproducible player plan to the catalog version",()=>{
    for(let run=0;run<100;run++){
      const seed=`unique-plan-${run}`,plan=createDraftPlan(seed);
      expect(createDraftPlan(seed)).toEqual(plan);
      const ids=plan.flat(2).map(offer=>offer.sourceId);
      expect(ids).toHaveLength(66);
      expect(new Set(ids).size).toBe(ids.length);
    }
    expect(()=>createDraftPlan("wrong-version",ARENA_RULES_VERSION,"stale-catalog")).toThrow("arena_catalog_version_unavailable");
    expect(ARENA_PLAYER_CATALOG_VERSION).toMatch(/^[a-f0-9]{16}$/);
  },15000);

  it("makes the connector tier consistently deliver its advertised chemistry value",()=>{
    for(let run=0;run<250;run++)for(let step=0;step<DRAFT_SLOTS.length;step++){
      const slot=DRAFT_SLOTS[step];
      const offers=createDraftOffers(`connector-${run}`,slot.line,step,0,slot.slot);
      const connector=offers.find(offer=>offer.trait==="connector");
      expect(connector.chemistry).toBe(2);
    }
    const legacy=createDraftOffers("legacy-connector","GK",0,0,"GK","arena-rules-v5");
    expect(legacy.find(offer=>offer.trait==="connector").chemistry).toBeLessThanOrEqual(2);
  });

  it("keeps v3 eleven-player rooms compatible while preserving five-player v1/v2 rooms",()=>{
    expect(ARENA_RULES_VERSION).toBe("arena-rules-v10");
    expect(usesFullXI("arena-rules-v3")).toBe(true);
    expect(usesFullXI("arena-rules-v2")).toBe(false);
    expect(createLegacyDraftOffers("legacy","GK",0,0)).toHaveLength(3);
    expect(initialPlayerState({owner:"blank"}).clubName).toBe("");
    const eleven=completedPlayer("legacy-eleven",0);
    expect(teamSnapshot(eleven,"arena-rules-v3")).not.toBeNull();
    const five=initialPlayerState({owner:"legacy",clubName:"Legacy",rating:1000});
    five.setup={formation:"4-4-2",style:"balanced",chairman:"patron"};
    five.draft=["GK","DEF","MID","WING","ST"].map((line,index)=>createLegacyDraftOffers("legacy-five",line,index,0)[1]);
    five.market={id:"none"};
    expect(teamSnapshot(five,"arena-rules-v2")).not.toBeNull();
  });

  it("builds deterministic continuous live segments with a full 90 minute timeline",()=>{
    const home={attack:76,defense:75,midfield:77,stamina:74,risk:0,flex:0};
    const away={attack:75,defense:76,midfield:74,stamina:73,risk:0,flex:0};
    const reports=LIVE_SEGMENTS.map((_,segment)=>resolveLiveSegment({
      seed:"continuous-match",segment,home,away,homeTactic:"press",awayTactic:"control"
    }));
    expect(reports.map(item=>[item.startMinute,item.endMinute])).toEqual([[0,20],[20,45],[45,70],[70,90]]);
    expect(reports.flatMap(item=>item.events).every(event=>event.minute>=0&&event.minute<90)).toBe(true);
    expect(resolveLiveSegment({seed:"continuous-match",segment:2,home,away,homeTactic:"press",awayTactic:"control"})).toEqual(reports[2]);
  });

  it("resolves sealed penalty choices deterministically without trusting the client",()=>{
    const input={seed:"sealed-kick",kick:3,shooterZone:"leftHigh",keeperZone:"rightLow",shooterPower:82,keeperPower:79};
    expect(resolvePenaltyKick(input)).toEqual(resolvePenaltyKick(input));
    expect(PENALTY_ZONES).toContain(resolvePenaltyKick(input).shooterZone);
    expect(["goal","save","miss","post"]).toContain(resolvePenaltyKick(input).outcome);
  });

  it("normalizes legacy training choices and validates compact match plans",()=>{
    expect(normalizeMatchPlan("finishing")).toEqual({focus:"finishing",scenario:"adaptive"});
    expect(normalizeMatchPlan({focus:"shape",scenario:"protect"})).toEqual({focus:"shape",scenario:"protect"});
    expect(normalizeMatchPlan({focus:"unknown",scenario:"brave"})).toBeNull();
  });

  it("applies card and match-plan conditions only in their authoritative context",()=>{
    const base={attack:76,defense:76,midfield:76,stamina:74,risk:0,flex:0,card:"wall",plan:{focus:"shape",scenario:"protect"}};
    const opponent={...base,card:"none",plan:{focus:"recovery",scenario:"adaptive"}};
    const leading=resolveLiveSegment({seed:"plan-context",segment:3,score:[2,1],home:base,away:opponent,homeTactic:"balanced",awayTactic:"balanced"});
    const trailing=resolveLiveSegment({seed:"plan-context",segment:3,score:[1,2],home:base,away:opponent,homeTactic:"balanced",awayTactic:"balanced"});
    expect(leading).not.toEqual(trailing);
    expect(resolveLiveSegment({seed:"plan-context",segment:3,score:[2,1],home:base,away:opponent,homeTactic:"balanced",awayTactic:"balanced"})).toEqual(leading);
  });

  it("mirrors market power while varying only presentation order",()=>{
    for(let run=0;run<100;run++){
      const one=createMarketOffers(`market-${run}`,0),two=createMarketOffers(`market-${run}`,1);
      expect(one.map(item=>item.id).sort()).toEqual(two.map(item=>item.id).sort());
      expect(one.at(-1).id).toBe("none");
      expect(two.at(-1).id).toBe("none");
    }
  });

  it("reserves enough budget to complete every remaining draft slot",()=>{
    for(let run=0;run<100;run++)for(let side=0;side<2;side++){
      const seed=`budget-${run}`,plan=createDraftPlan(seed);
      let budget=48;
      for(let step=0;step<DRAFT_LINES.length;step++){
        const offers=plan[step][side];
        const reserve=minimumFutureDraftCost(seed,side,step,ARENA_RULES_VERSION,plan);
        const affordable=offers.filter(offer=>offer.cost<=budget-reserve);
        expect(affordable.length).toBeGreaterThan(0);
        const choice=[...affordable].sort((a,b)=>b.power-a.power)[0];
        budget-=choice.cost;
      }
      expect(budget).toBeGreaterThanOrEqual(0);
    }
  },15000);

  it("allows ranked regulation draws only in the new rules version",()=>{
    expect(allowsRegulationDraw("arena-rules-v7")).toBe(true);
    expect(allowsRegulationDraw("arena-rules-v8")).toBe(true);
    expect(allowsRegulationDraw("arena-rules-v6")).toBe(true);
    expect(allowsRegulationDraw("arena-rules-v5")).toBe(false);
  });

  it("keeps rating exchange zero-sum",()=>{
    for(let home=700;home<=1900;home+=50)for(let away=700;away<=1900;away+=50){
      expect(ratingDelta(home,away,1)+ratingDelta(away,home,0)).toBe(0);
      expect(ratingDelta(home,away,.5)+ratingDelta(away,home,.5)).toBe(0);
    }
  });

  it("prefers a fresh opponent over an immediate rematch without blocking a two-player queue",()=>{
    const home={owner:"home",rating:1200,joined_at:1};
    const repeat={owner:"repeat",rating:1201,joined_at:2};
    const fresh={owner:"fresh",rating:1215,joined_at:3};
    const recent={home:["repeat"],repeat:["home"],fresh:[]};
    expect(chooseMatchCandidate(home,[repeat,fresh],recent)).toBe(fresh);
    expect(chooseMatchCandidate(home,[repeat],recent)).toBe(repeat);
  });

  it("uses an explicit non-transitive tactic counter",()=>{
    expect(tacticEdge("press","control")).toBe(1);
    expect(tacticEdge("control","counter")).toBe(1);
    expect(tacticEdge("counter","press")).toBe(1);
    expect(tacticEdge("balanced","press")).toBe(0);
  });

  it("returns an explainable, chronological live-window report",()=>{
    const home=teamSnapshot(completedPlayer("report",0)),away=teamSnapshot(completedPlayer("report",1));
    const report=resolveWindow({seed:"report",window:1,home,away,homeTactic:"press",awayTactic:"control"});
    expect(report).toMatchObject({
      window:1,startMinute:30,endMinute:60,tactics:["press","control"],advantage:"home"
    });
    expect(report.events.every(event=>event.minute>=30&&event.minute<60)).toBe(true);
    expect([...report.events].sort((a,b)=>a.minute-b.minute)).toEqual(report.events);
  });

  it("builds bounded teams without permanent progression power",()=>{
    const player=completedPlayer("team",0);
    const team=teamSnapshot(player);
    expect(team.power).toBeGreaterThanOrEqual(65);
    expect(team.power).toBeLessThanOrEqual(90);
    expect(team.chemistry).toBeGreaterThanOrEqual(-3);
    expect(team.chemistry).toBeLessThanOrEqual(18);
    expect(team.budget).toBeGreaterThanOrEqual(-10);
  });

  it("turns adapted-position labels into a real power penalty",()=>{
    const player=completedPlayer("position-penalty",0);
    const natural=teamSnapshot(player);
    player.draft[1]={...player.draft[1],positionFit:"adapted",positionPenalty:3,effectivePower:player.draft[1].power-3};
    const adapted=teamSnapshot(player);
    expect(adapted.power).toBeLessThanOrEqual(natural.power);
    expect(player.draft[1].effectivePower).toBe(player.draft[1].power-3);
  });

  it("exposes only the fixed Babacan chairman to current rooms",()=>{
    expect(Object.keys(CHAIRMEN)).toEqual(["babacan"]);
    expect(teamSnapshot(completedPlayer("chairs",0,{formation:"4-4-2",style:"balanced",chairman:"diplomat"}))).toBeNull();
  });

  it("scales chemistry capacity with the eleven-player draft",()=>{
    const eleven=completedPlayer("chemistry-eleven",0);
    eleven.draft=eleven.draft.map(player=>({...player,chemistry:2}));
    eleven.training="chemistry";
    expect(teamSnapshot(eleven,"arena-rules-v7").chemistry).toBe(18);
    expect(teamSnapshot(eleven,"arena-rules-v8").chemistry).toBe(18);
    expect(teamSnapshot(eleven,"arena-rules-v6").chemistry).toBe(18);
    expect(teamSnapshot(eleven,"arena-rules-v5").chemistry).toBe(9);
    const legacy=initialPlayerState({owner:"legacy-chem",clubName:"Legacy Chem",rating:1000});
    legacy.setup={formation:"4-4-2",style:"balanced",chairman:"diplomat"};
    legacy.draft=["GK","DEF","MID","WING","ST"].map((line,index)=>({
      ...createLegacyDraftOffers("legacy-chem",line,index,0)[0],chemistry:2
    }));
    legacy.market={id:"captain"};
    legacy.training="chemistry";
    expect(teamSnapshot(legacy,"arena-rules-v2").chemistry).toBe(9);
  });

  it("caps rewards and maps divisions",()=>{
    expect(rewardFor("win",1000,1600).ratingDelta).toBeLessThanOrEqual(28);
    expect(rewardFor("loss",1600,1000).ratingDelta).toBeGreaterThanOrEqual(-28);
    expect(divisionFor(999)).toBe("aday");
    expect(divisionFor(1600)).toBe("efsane");
  });

  it("voids fully automated matches and turns one-sided inactivity into a forfeit",()=>{
    const active={manualDecisions:MIN_MANUAL_DECISIONS,manualTactics:1};
    const inactive={manualDecisions:MIN_MANUAL_DECISIONS,manualTactics:0};
    expect(resolveParticipation([inactive,inactive],["win","loss"])).toMatchObject({
      outcomes:["draw","draw"],forfeitIndex:null,voided:true
    });
    expect(resolveParticipation([active,inactive],["loss","win"])).toMatchObject({
      outcomes:["win","loss"],forfeitIndex:1,voided:false
    });
    expect(resolveParticipation([active,active],["loss","win"])).toMatchObject({
      outcomes:["loss","win"],forfeitIndex:null,voided:false
    });
  });

  it("does not let early clicks farm ranked rewards and preserves legacy rooms",()=>{
    const earlyOnly={manualDecisions:12,manualTactics:0};
    const completedBuild={manualDecisions:13,manualTactics:0};
    expect(resolveParticipation([earlyOnly,earlyOnly],["win","loss"]).voided).toBe(true);
    expect(resolveParticipation([completedBuild,completedBuild],["win","loss"]).voided).toBe(false);
    expect(resolveParticipation(
      [{manualDecisions:2},{manualDecisions:2}],["win","loss"],"minimum-manual-v1"
    ).voided).toBe(false);
  });
});

describe("Arena balance Monte Carlo",()=>{
  it("keeps mirrored clubs inside the expected win band",()=>{
    let homeWins=0,awayWins=0,draws=0,totalGoals=0;
    const runs=1000;
    for(let run=0;run<runs;run++){
      const seed=`balance-${run}`,home=teamSnapshot(completedPlayer(seed,0)),away=teamSnapshot(completedPlayer(seed,1));
      let homeGoals=0,awayGoals=0;
      for(let window=0;window<3;window++){
        const result=resolveWindow({seed,window,home,away,homeTactic:"balanced",awayTactic:"balanced"});
        homeGoals+=result.homeGoals;awayGoals+=result.awayGoals;
      }
      totalGoals+=homeGoals+awayGoals;
      if(homeGoals>awayGoals)homeWins++;else if(awayGoals>homeGoals)awayWins++;else draws++;
    }
    const decided=homeWins+awayWins;
    expect(homeWins/decided).toBeGreaterThan(.46);
    expect(homeWins/decided).toBeLessThan(.54);
    expect(draws/runs).toBeGreaterThan(.12);
    expect(draws/runs).toBeLessThan(.42);
    expect(totalGoals/runs).toBeGreaterThan(1.2);
    expect(totalGoals/runs).toBeLessThan(4.4);
  },30000);

  it("makes correct counters useful without making them deterministic",()=>{
    let edgeWins=0,neutralWins=0;
    const runs=300;
    for(let run=0;run<runs;run++){
      const seed=`counter-${run}`,home=teamSnapshot(completedPlayer(seed,0)),away=teamSnapshot(completedPlayer(seed,1));
      const edge=resolveWindow({seed,window:1,home,away,homeTactic:"press",awayTactic:"control"});
      const neutral=resolveWindow({seed,window:1,home,away,homeTactic:"balanced",awayTactic:"balanced"});
      if(edge.homeGoals>edge.awayGoals)edgeWins++;
      if(neutral.homeGoals>neutral.awayGoals)neutralWins++;
    }
    expect(edgeWins).toBeGreaterThan(neutralWins);
    expect(edgeWins/runs).toBeLessThan(.7);
  },15000);
});
