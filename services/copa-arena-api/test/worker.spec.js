import {beforeEach,describe,expect,it} from "vitest";
import {env,SELF,runInDurableObject,applyD1Migrations} from "cloudflare:test";
import {DRAFT_LINES} from "../src/rules.js";

const origin="https://copa.life";
const headers=(suffix)=>({
  origin,
  "content-type":"application/json",
  "x-copa-client":`GCL-${String(suffix).padEnd(12,"A").toUpperCase()}`,
  "x-copa-arena-token":`CAR-${String(suffix).padEnd(32,"B").toUpperCase()}`
});
const waitMessage=(socket,type,timeout=2000)=>new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>reject(new Error(`timeout:${type}`)),timeout);
  const listener=event=>{
    const value=JSON.parse(event.data);
    if(value.type===type){clearTimeout(timer);socket.removeEventListener("message",listener);resolve(value);}
  };
  socket.addEventListener("message",listener);
});

beforeEach(async()=>{await applyD1Migrations(env.DB,env.TEST_MIGRATIONS);});

describe("Arena HTTP API",()=>{
  it("requires an Arena identity and rejects invalid names",async()=>{
    const missing=await SELF.fetch("https://arena.test/v1/arena/session",{method:"POST",headers:{origin,"content-type":"application/json"},body:JSON.stringify({clubName:"Copa"})});
    expect(missing.status).toBe(428);
    const invalid=await SELF.fetch("https://arena.test/v1/arena/session",{method:"POST",headers:headers("invalid"),body:JSON.stringify({clubName:"<script>",mode:"ranked"})});
    expect(invalid.status).toBe(422);
  });

  it("creates a stable profile and a single-use queue ticket",async()=>{
    const request=()=>SELF.fetch("https://arena.test/v1/arena/session",{method:"POST",headers:headers("alpha"),body:JSON.stringify({clubName:"Anka SK",mode:"ranked",region:"weur"})});
    const first=await request(),created=await first.json();
    expect(first.status).toBe(201);
    expect(created.profile.rating).toBe(1000);
    const profileResponse=await SELF.fetch("https://arena.test/v1/arena/profile",{headers:headers("alpha")});
    expect((await profileResponse.json()).profile.publicId).toBe(created.profile.publicId);

    const socketResponse=await SELF.fetch(`https://arena.test/v1/arena/connect?ticket=${created.ticket}`,{headers:{...headers("alpha"),upgrade:"websocket"}});
    expect(socketResponse.status).toBe(101);
    socketResponse.webSocket.accept();
    const reused=await SELF.fetch(`https://arena.test/v1/arena/connect?ticket=${created.ticket}`,{headers:{...headers("alpha"),upgrade:"websocket"}});
    expect(reused.status).toBe(401);
    socketResponse.webSocket.close(1000,"done");
  });

  it("returns only public leaderboard fields",async()=>{
    await SELF.fetch("https://arena.test/v1/arena/session",{method:"POST",headers:headers("board"),body:JSON.stringify({clubName:"Kuzey FK",mode:"ranked"})});
    const response=await SELF.fetch("https://arena.test/v1/arena/leaderboard");
    const data=await response.json();
    expect(data.entries.some(entry=>entry.clubName==="Kuzey FK")).toBe(true);
    expect(JSON.stringify(data)).not.toContain("owner_hash");
  });

  it("prevents one Arena identity from entering two queues",async()=>{
    const make=()=>SELF.fetch("https://arena.test/v1/arena/session",{method:"POST",headers:headers("singlequeue"),body:JSON.stringify({clubName:"Tek Arena",mode:"ranked",region:"weur"})});
    expect((await make()).status).toBe(201);
    const duplicate=await make();
    expect(duplicate.status).toBe(409);
    expect((await duplicate.json()).error).toBe("arena_session_active");
  });

  it("deletes Arena identity data without deleting the opponent's match record",async()=>{
    await SELF.fetch("https://arena.test/v1/arena/session",{method:"POST",headers:headers("eraseme"),body:JSON.stringify({clubName:"Silinecek SK",mode:"ranked"})});
    const removed=await SELF.fetch("https://arena.test/v1/arena/profile",{method:"DELETE",headers:headers("eraseme")});
    expect(removed.status).toBe(204);
    const recreated=await SELF.fetch("https://arena.test/v1/arena/profile",{headers:headers("eraseme")});
    expect((await recreated.json()).profile.rating).toBe(1000);
  });
});

describe("Arena Durable Objects",()=>{
  it("pairs two real sockets and creates a room",async()=>{
    const make=async(id,name)=>{
      const response=await SELF.fetch("https://arena.test/v1/arena/session",{method:"POST",headers:headers(id),body:JSON.stringify({clubName:name,mode:"ranked",region:"weur"})});
      return response.json();
    };
    const one=await make("pairone","Mavi SK"),two=await make("pairtwo","Kırmızı SK");
    const first=await SELF.fetch(`https://arena.test/v1/arena/connect?ticket=${one.ticket}`,{headers:{...headers("pairone"),upgrade:"websocket"}});
    first.webSocket.accept();
    const firstMatch=waitMessage(first.webSocket,"matched");
    const second=await SELF.fetch(`https://arena.test/v1/arena/connect?ticket=${two.ticket}`,{headers:{...headers("pairtwo"),upgrade:"websocket"}});
    second.webSocket.accept();
    const [matchedOne,matchedTwo]=await Promise.all([firstMatch,waitMessage(second.webSocket,"matched")]);
    expect(matchedOne.matchId).toBe(matchedTwo.matchId);
    expect(matchedOne.roomToken).not.toBe(matchedTwo.roomToken);
    first.webSocket.close(1000,"matched");second.webSocket.close(1000,"matched");
  });

  it("runs every authoritative phase and records rewards once",async()=>{
    const room=env.ARENA_ROOM.getByName("AR-TESTROOM000000001");
    const players=[
      {owner:"owner-home",clubName:"Ev Sahibi",rating:1000},
      {owner:"owner-away",clubName:"Deplasman",rating:1000}
    ];
    await env.DB.batch([
      env.DB.prepare("INSERT INTO arena_profiles VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)").bind("owner-home","AC-HOME","Ev Sahibi",1000,"2026-Q3",0,0,0,0,0,0,"[]",new Date().toISOString(),new Date().toISOString()),
      env.DB.prepare("INSERT INTO arena_profiles VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)").bind("owner-away","AC-AWAY","Deplasman",1000,"2026-Q3",0,0,0,0,0,0,"[]",new Date().toISOString(),new Date().toISOString())
    ]);
    await room.init("AR-TESTROOM000000001",players,"room-seed");
    await runInDurableObject(room,async instance=>{
      expect(instance.acceptAction("owner-home","AA-c093e7e013304d56a149c633e80f02a3")).toBe(true);
      expect(instance.acceptAction("owner-home","AA-c093e7e013304d56a149c633e80f02a3")).toBe(false);
      let sequence=0;
      const act=(owner,data)=>instance.action(owner,{...data,actionId:`AA-${++sequence}ABCDEFGH`});
      await act("owner-home",{type:"ready"});await act("owner-away",{type:"ready"});
      for(const owner of ["owner-home","owner-away"])await act(owner,{type:"setup",choice:{formation:"4-4-2",style:"balanced",chairman:"diplomat"}});
      for(let step=0;step<DRAFT_LINES.length;step++){
        for(let side=0;side<2;side++){
          const offer=instance.state.offers[side].sort((a,b)=>a.cost-b.cost)[0];
          await act(players[side].owner,{type:"draft",choice:offer.id});
        }
      }
      for(let side=0;side<2;side++){
        const free=instance.state.offers[side].find(item=>item.id==="none");
        await act(players[side].owner,{type:"market",choice:free.id});
      }
      await act("owner-home",{type:"training",choice:"chemistry"});await act("owner-away",{type:"training",choice:"recovery"});
      for(let window=0;window<3;window++){
        await act("owner-home",{type:"tactic",choice:"press"});await act("owner-away",{type:"tactic",choice:"control"});
      }
      expect(instance.state.phase).toBe("result");
      expect(instance.state.events.length).toBeGreaterThan(0);
    });
    const results=await env.DB.prepare("SELECT * FROM arena_match_players WHERE match_id=?").bind("AR-TESTROOM000000001").all();
    expect(results.results).toHaveLength(2);
    await runInDurableObject(room,instance=>instance.recordResult(instance.state.result.outcomes));
    const history=await env.DB.prepare("SELECT * FROM arena_match_players WHERE match_id=?").bind("AR-TESTROOM000000001").all();
    expect(history.results).toHaveLength(2);
  });
});
