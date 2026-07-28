import {describe,expect,it} from "vitest";
import {
  DRAFT_LINES,createDraftOffers,createMarketOffers,divisionFor,initialPlayerState,ratingDelta,resolveParticipation,
  resolveWindow,rewardFor,teamSnapshot,tacticEdge
} from "../src/rules.js";

function completedPlayer(seed,side,setup={formation:"4-4-2",style:"balanced",chairman:"diplomat"}){
  const player=initialPlayerState({owner:`owner-${side}`,clubName:`Club ${side}`,rating:1000});
  player.setup=setup;
  player.draft=DRAFT_LINES.map((line,index)=>createDraftOffers(seed,line,index,side)[1]);
  player.market={id:"captain"};
  player.training="chemistry";
  return player;
}

describe("Arena rules",()=>{
  it("creates deterministic but side-specific fair draft offers",()=>{
    for(let step=0;step<DRAFT_LINES.length;step++){
      const one=createDraftOffers("seed",DRAFT_LINES[step],step,0);
      const two=createDraftOffers("seed",DRAFT_LINES[step],step,1);
      expect(createDraftOffers("seed",DRAFT_LINES[step],step,0)).toEqual(one);
      expect(one.map(item=>item.power).sort()).toEqual(two.map(item=>item.power).sort());
      expect(one.map(item=>item.cost).sort()).toEqual(two.map(item=>item.cost).sort());
      expect(one.map(item=>item.id)).not.toEqual(two.map(item=>item.id));
    }
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
