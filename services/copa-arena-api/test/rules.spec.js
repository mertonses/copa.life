import {describe,expect,it} from "vitest";
import {
  ARENA_RULES_VERSION,DRAFT_LINES,createDraftOffers,createLegacyDraftOffers,createMarketOffers,divisionFor,initialPlayerState,
  ratingDelta,resolveParticipation,resolveWindow,rewardFor,teamSnapshot,tacticEdge,usesFullXI
} from "../src/rules.js";
import {ARENA_PLAYER_CATALOG,ARENA_PLAYER_COUNTRIES} from "../src/playerCatalog.js";

function completedPlayer(seed,side,setup={formation:"4-4-2",style:"balanced",chairman:"babacan"}){
  const player=initialPlayerState({owner:`owner-${side}`,clubName:`Club ${side}`,rating:1000});
  player.setup=setup;
  player.draft=DRAFT_LINES.map((line,index)=>createDraftOffers(seed,line,index,side)[1]);
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
      expect(one.map(item=>item.power).sort()).toEqual(two.map(item=>item.power).sort());
      expect(one.map(item=>item.cost).sort()).toEqual(two.map(item=>item.cost).sort());
      expect(one.map(item=>item.sourceId).sort()).toEqual(two.map(item=>item.sourceId).sort());
      expect(one.map(item=>item.id)).not.toEqual(two.map(item=>item.id));
    }
  });

  it("sources complete real-player profiles from all six cleared country databases",()=>{
    const countries=new Set();
    for(let run=0;run<40;run++)for(let step=0;step<DRAFT_LINES.length;step++){
      for(const offer of createDraftOffers(`country-${run}`,DRAFT_LINES[step],step,0)){
        countries.add(offer.country);
        expect(offer).toMatchObject({
          sourceId:expect.stringMatching(/^(TR|ES|DE|IT|EN|JP)-\d+$/),
          name:expect.any(String),
          club:expect.any(String),
          position:expect.any(String),
          age:expect.any(Number),
          potential:expect.any(Number)
        });
        const tierPool=ARENA_PLAYER_CATALOG[offer.line][offer.trait][offer.country];
        expect(tierPool.some(player=>player.sourceId===offer.sourceId&&player.name===offer.name&&player.power===offer.power)).toBe(true);
        expect(offer.cost).toBeGreaterThanOrEqual(1);
        expect(offer.cost).toBeLessThanOrEqual(6);
        expect(offer.chemistry).toBeGreaterThanOrEqual(-1);
        expect(offer.chemistry).toBeLessThanOrEqual(2);
      }
    }
    expect([...countries].sort()).toEqual([...ARENA_PLAYER_COUNTRIES].sort());
  });

  it("keeps v3 eleven-player rooms compatible while preserving five-player v1/v2 rooms",()=>{
    expect(ARENA_RULES_VERSION).toBe("arena-rules-v5");
    expect(usesFullXI("arena-rules-v3")).toBe(true);
    expect(usesFullXI("arena-rules-v2")).toBe(false);
    expect(createLegacyDraftOffers("legacy","GK",0,0)).toHaveLength(3);
    const eleven=completedPlayer("legacy-eleven",0);
    expect(teamSnapshot(eleven,"arena-rules-v3")).not.toBeNull();
    const five=initialPlayerState({owner:"legacy",clubName:"Legacy",rating:1000});
    five.setup={formation:"4-4-2",style:"balanced",chairman:"patron"};
    five.draft=["GK","DEF","MID","WING","ST"].map((line,index)=>createLegacyDraftOffers("legacy-five",line,index,0)[1]);
    five.market={id:"none"};
    expect(teamSnapshot(five,"arena-rules-v2")).not.toBeNull();
  });

  it("mirrors market power while varying only presentation order",()=>{
    for(let run=0;run<100;run++){
      const one=createMarketOffers(`market-${run}`,0),two=createMarketOffers(`market-${run}`,1);
      expect(one.map(item=>item.id).sort()).toEqual(two.map(item=>item.id).sort());
      expect(one.at(-1).id).toBe("none");
      expect(two.at(-1).id).toBe("none");
    }
  });

  it("keeps rating exchange zero-sum",()=>{
    for(let home=700;home<=1900;home+=50)for(let away=700;away<=1900;away+=50){
      expect(ratingDelta(home,away,1)+ratingDelta(away,home,0)).toBe(0);
      expect(ratingDelta(home,away,.5)+ratingDelta(away,home,.5)).toBe(0);
    }
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
    expect(team.chemistry).toBeLessThanOrEqual(9);
    expect(team.budget).toBeGreaterThanOrEqual(-10);
  });

  it("gives every chairman a bounded, distinct mechanical lever",()=>{
    const teams=["patron","diplomat","showman","professor"].map(chairman=>teamSnapshot(completedPlayer("chairs",0,{formation:"4-4-2",style:"balanced",chairman})));
    expect(new Set(teams.map(team=>`${team.budget}:${team.chemistry}:${team.risk}:${team.flex}`)).size).toBe(4);
    expect(teams.every(team=>team.power>=65&&team.power<=90)).toBe(true);
  });

  it("caps rewards and maps divisions",()=>{
    expect(rewardFor("win",1000,1600).ratingDelta).toBeLessThanOrEqual(28);
    expect(rewardFor("loss",1600,1000).ratingDelta).toBeGreaterThanOrEqual(-28);
    expect(divisionFor(999)).toBe("aday");
    expect(divisionFor(1600)).toBe("efsane");
  });

  it("voids fully automated matches and turns one-sided inactivity into a forfeit",()=>{
    const active={manualDecisions:2},inactive={manualDecisions:1};
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
});

describe("Arena balance Monte Carlo",()=>{
  it("keeps mirrored clubs inside the expected win band",()=>{
    let homeWins=0,awayWins=0,draws=0,totalGoals=0;
    for(let run=0;run<5000;run++){
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
    expect(draws/5000).toBeGreaterThan(.12);
    expect(draws/5000).toBeLessThan(.42);
    expect(totalGoals/5000).toBeGreaterThan(1.2);
    expect(totalGoals/5000).toBeLessThan(4.4);
  });

  it("makes correct counters useful without making them deterministic",()=>{
    let edgeWins=0,neutralWins=0;
    for(let run=0;run<3000;run++){
      const seed=`counter-${run}`,home=teamSnapshot(completedPlayer(seed,0)),away=teamSnapshot(completedPlayer(seed,1));
      const edge=resolveWindow({seed,window:1,home,away,homeTactic:"press",awayTactic:"control"});
      const neutral=resolveWindow({seed,window:1,home,away,homeTactic:"balanced",awayTactic:"balanced"});
      if(edge.homeGoals>edge.awayGoals)edgeWins++;
      if(neutral.homeGoals>neutral.awayGoals)neutralWins++;
    }
    expect(edgeWins).toBeGreaterThan(neutralWins);
    expect(edgeWins/3000).toBeLessThan(.7);
  });
});
