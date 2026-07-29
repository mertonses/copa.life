import {describe,expect,it} from "vitest";
import {BOT_NAME_CAPACITY,botDecisionDelay,botWaitMs,createBotIdentity} from "../src/botIdentity.js";

describe("Arena system club identities",()=>{
  it("provides thousands of safe, varied club names and personalities",()=>{
    const clubs=Array.from({length:20_000},(_,index)=>createBotIdentity(`qa-bot-${index}`,700+index%1201));
    const names=new Set(clubs.map(club=>club.clubName));
    const personalities=new Set(clubs.map(club=>JSON.stringify(club.personality)));
    expect(BOT_NAME_CAPACITY).toBeGreaterThan(1_000_000);
    expect(names.size).toBeGreaterThanOrEqual(19_900);
    expect(personalities.size).toBe(20_000);
    for(const club of clubs){
      expect(club.clubName.length).toBeGreaterThanOrEqual(2);
      expect(club.clubName.length).toBeLessThanOrEqual(29);
      expect(club.clubName).not.toMatch(/[<>{}\u0000-\u001f\u007f]/);
      expect(club.owner).toMatch(/^arena-system:[a-f0-9]{8}:[A-Z0-9]{4}$/);
      expect(club.rating).toBeGreaterThanOrEqual(700);
      expect(club.rating).toBeLessThanOrEqual(1900);
    }
  });

  it("acts before phase deadlines at deterministic but varied moments",()=>{
    const waits=Array.from({length:2_000},(_,index)=>botWaitMs(`wait-${index}`));
    const decisions=Array.from({length:2_000},(_,index)=>botDecisionDelay(`decision-${index}`,"setup",index));
    expect(Math.min(...waits)).toBeGreaterThanOrEqual(6_000);
    expect(Math.max(...waits)).toBeLessThan(14_000);
    expect(new Set(waits).size).toBeGreaterThan(1_500);
    expect(Math.min(...decisions)).toBeGreaterThanOrEqual(2_100);
    expect(Math.max(...decisions)).toBeLessThan(9_700);
    expect(new Set(decisions).size).toBeGreaterThan(1_400);
  });
});
