import {beforeEach,describe,expect,it} from "vitest";
import {env,SELF,applyD1Migrations,runInDurableObject} from "cloudflare:test";
import {addTournamentParticipant,createTournamentState,roundPairs,tournamentPublicState} from "../src/tournament.js";

const origin="https://copa.life";
const headers=suffix=>({
  origin,"content-type":"application/json",
  "x-copa-client":`GCL-${suffix.padEnd(12,"A").toUpperCase()}`,
  "x-copa-arena-token":`CAR-${suffix.padEnd(32,"B").toUpperCase()}`
});

beforeEach(async()=>{await applyD1Migrations(env.DB,env.TEST_MIGRATIONS);});

describe("Arena private tournaments",()=>{
  it.each([4,8])("fills a %i-club bracket without exposing private owners",size=>{
    const state=createTournamentState("ABC234",size,{owner:"owner-1",clubName:"Club 1",rating:1000},1000);
    for(let index=2;index<=size;index++)expect(addTournamentParticipant(state,{owner:`owner-${index}`,clubName:`Club ${index}`,rating:1000+index},1001+index).ok).toBe(true);
    expect(state.participants).toHaveLength(size);
    expect(roundPairs(state.participants.map(item=>item.owner))).toHaveLength(size/2);
    const publicView=tournamentPublicState(state,"owner-1");
    expect(publicView).toMatchObject({size,joined:size,status:"waiting",host:true});
    expect(JSON.stringify(publicView)).not.toContain("owner-");
  });

  it("creates four clubs, advances both winners and completes the final",async()=>{
    const createdResponse=await SELF.fetch("https://arena.test/v1/arena/tournaments",{method:"POST",headers:headers("tourhost"),body:JSON.stringify({clubName:"Kupa Ev",size:4})});
    const created=await createdResponse.json(),code=created.tournament.code;
    expect(createdResponse.status).toBe(201);
    for(const suffix of ["toura","tourb","tourc"]){
      const joined=await SELF.fetch(`https://arena.test/v1/arena/tournaments/${code}`,{method:"POST",headers:headers(suffix),body:JSON.stringify({clubName:`Kulüp ${suffix.slice(-1).toUpperCase()}`})});
      expect(joined.status).toBe(200);
    }
    const coordinator=env.ARENA_TOURNAMENT.getByName(`ATN-${code}`);
    let firstRound;
    await runInDurableObject(coordinator,instance=>{
      expect(instance.state).toMatchObject({status:"running",round:1,size:4});
      firstRound=instance.state.rounds[0].matches.map(match=>({matchId:match.matchId,winner:match.players[0]}));
      expect(firstRound).toHaveLength(2);
    });
    for(const match of firstRound)await coordinator.reportResult(match.matchId,match.winner,[2,1]);
    let final;
    await runInDurableObject(coordinator,instance=>{
      expect(instance.state.round).toBe(2);
      final=instance.state.rounds[1].matches[0];
      expect(final.players).toEqual(firstRound.map(match=>match.winner));
    });
    await coordinator.reportResult(final.matchId,final.players[0],[1,0]);
    await runInDurableObject(coordinator,instance=>{
      expect(instance.state).toMatchObject({status:"completed",champion:final.players[0]});
      expect(instance.player(final.players[0]).place).toBe(1);
      expect(instance.player(final.players[1]).place).toBe(2);
    });
  });

  it("rejects unsupported sizes and keeps a player in only one active Arena session",async()=>{
    const invalid=await SELF.fetch("https://arena.test/v1/arena/tournaments",{method:"POST",headers:headers("badsize"),body:JSON.stringify({clubName:"Boyut FK",size:6})});
    expect(invalid.status).toBe(422);
    const created=await SELF.fetch("https://arena.test/v1/arena/tournaments",{method:"POST",headers:headers("single"),body:JSON.stringify({clubName:"Tek Kulüp",size:8})});
    expect(created.status).toBe(201);
    const duplicate=await SELF.fetch("https://arena.test/v1/arena/custom-rooms",{method:"POST",headers:headers("single"),body:JSON.stringify({clubName:"Tek Kulüp"})});
    expect(duplicate.status).toBe(409);
  });
});
