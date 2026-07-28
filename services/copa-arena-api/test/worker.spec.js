import {beforeEach,describe,expect,it} from "vitest";
import {env,SELF,runInDurableObject,applyD1Migrations} from "cloudflare:test";
import {ARENA_RULES_VERSION,DRAFT_LINES,seasonKey,teamSnapshot} from "../src/rules.js";

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
    const first=await make(),created=await first.json();
    expect(first.status).toBe(201);
    const socket=await SELF.fetch(`https://arena.test/v1/arena/connect?ticket=${created.ticket}`,{headers:{...headers("singlequeue"),upgrade:"websocket"}});
    expect(socket.status).toBe(101);
    socket.webSocket.accept();
    const duplicate=await make();
    expect(duplicate.status).toBe(409);
    expect((await duplicate.json()).error).toBe("arena_session_active");
    socket.webSocket.close(1000,"done");
  });

  it("replaces a ticket that was never consumed after a connection failure",async()=>{
    const make=()=>SELF.fetch("https://arena.test/v1/arena/session",{method:"POST",headers:headers("lostticket"),body:JSON.stringify({clubName:"Kurtarma SK",mode:"ranked",region:"weur"})});
    const first=await make(),oldSession=await first.json();
    const replacement=await make(),newSession=await replacement.json();
    expect(first.status).toBe(201);
    expect(replacement.status).toBe(201);
    expect(newSession.ticket).not.toBe(oldSession.ticket);
    const stale=await SELF.fetch(`https://arena.test/v1/arena/connect?ticket=${oldSession.ticket}`,{headers:{...headers("lostticket"),upgrade:"websocket"}});
    expect(stale.status).toBe(401);
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
      expect(instance.state.rulesVersion).toBe(ARENA_RULES_VERSION);
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

  it("does not award progression when both players abandon the match",async()=>{
    const room=env.ARENA_ROOM.getByName("AR-AFKVOID000000001");
    const players=[
      {owner:"owner-void-home",clubName:"Sessiz Ev",rating:1000},
      {owner:"owner-void-away",clubName:"Sessiz Dep",rating:1000}
    ];
    const created=new Date().toISOString();
    await env.DB.batch(players.map((player,index)=>
      env.DB.prepare("INSERT INTO arena_profiles VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)")
        .bind(player.owner,`AC-VOID${index}`,player.clubName,1000,"2026-Q3",0,0,0,0,0,0,"[]",created,created)
    ));
    await room.init("AR-AFKVOID000000001",players,"void-seed");
    await runInDurableObject(room,async instance=>{
      for(const player of instance.state.players){
        player.setup={formation:"4-4-2",style:"balanced",chairman:"diplomat"};
        player.draft=DRAFT_LINES.map((line,index)=>({
          line,id:`${line}-${index}`,name:`Test ${line}`,power:72,cost:1,chemistry:0,trait:"reliable"
        }));
        player.market={id:"none"};
        player.training="recovery";
        player.tactics=["balanced","balanced","balanced"];
      }
      const home=instance.state.players[0],away=instance.state.players[1];
      await instance.finish(teamSnapshot(home),teamSnapshot(away));
      expect(instance.state.result.voided).toBe(true);
      expect(instance.state.result.score).toEqual([0,0]);
    });
    const rows=await env.DB.prepare("SELECT * FROM arena_match_players WHERE match_id=?").bind("AR-AFKVOID000000001").all();
    expect(rows.results).toHaveLength(0);
    const profiles=await env.DB.prepare("SELECT rating,season_points,token_progress,wins,draws,losses FROM arena_profiles WHERE owner_hash LIKE 'owner-void-%'").all();
    expect(profiles.results).toHaveLength(2);
    expect(profiles.results.every(profile=>profile.rating===1000&&profile.season_points===0&&profile.token_progress===0&&profile.wins===0&&profile.draws===0&&profile.losses===0)).toBe(true);
  });

  it("awards the active player and withholds progression from a forfeiting player",async()=>{
    const room=env.ARENA_ROOM.getByName("AR-AFKFORFEIT000001");
    const players=[
      {owner:"owner-active",clubName:"Aktif SK",rating:1000},
      {owner:"owner-afk",clubName:"AFK SK",rating:1000}
    ];
    const created=new Date().toISOString();
    await env.DB.batch(players.map((player,index)=>
      env.DB.prepare("INSERT INTO arena_profiles VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)")
        .bind(player.owner,`AC-FORFEIT${index}`,player.clubName,1000,"2026-Q3",0,0,0,0,0,0,"[]",created,created)
    ));
    await room.init("AR-AFKFORFEIT000001",players,"forfeit-seed");
    await runInDurableObject(room,async instance=>{
      for(const player of instance.state.players){
        player.setup={formation:"4-4-2",style:"balanced",chairman:"diplomat"};
        player.draft=DRAFT_LINES.map((line,index)=>({
          line,id:`${line}-${index}`,name:`Test ${line}`,power:72,cost:1,chemistry:0,trait:"reliable"
        }));
        player.market={id:"none"};
        player.training="recovery";
        player.tactics=["balanced","balanced","balanced"];
      }
      instance.state.players[0].manualDecisions=2;
      const [home,away]=instance.state.players;
      await instance.finish(teamSnapshot(home),teamSnapshot(away));
      expect(instance.state.result).toMatchObject({
        score:[3,0],outcomes:["win","loss"],forfeitIndex:1,voided:false
      });
    });
    const rows=await env.DB.prepare("SELECT owner_hash,outcome,season_points,token_progress,rating_delta FROM arena_match_players WHERE match_id=? ORDER BY owner_hash").bind("AR-AFKFORFEIT000001").all();
    expect(rows.results).toHaveLength(2);
    const active=rows.results.find(row=>row.owner_hash==="owner-active");
    const inactive=rows.results.find(row=>row.owner_hash==="owner-afk");
    expect(active).toMatchObject({outcome:"win",season_points:30,token_progress:3});
    expect(active.rating_delta).toBeGreaterThan(0);
    expect(inactive).toMatchObject({outcome:"loss",season_points:0,token_progress:0});
    expect(inactive.rating_delta).toBeLessThan(0);
  });

  it("soft-resets a stale season before applying the completed match",async()=>{
    const room=env.ARENA_ROOM.getByName("AR-SEASONRESET00001");
    const players=[
      {owner:"owner-season-home",clubName:"Yeni Sezon Ev",rating:1800},
      {owner:"owner-season-away",clubName:"Yeni Sezon Dep",rating:1800}
    ];
    const created=new Date().toISOString();
    await env.DB.batch(players.map((player,index)=>
      env.DB.prepare("INSERT INTO arena_profiles VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)")
        .bind(player.owner,`AC-SEASON${index}`,player.clubName,1800,"2000-Q1",999,4,2,3,2,99,"[]",created,created)
    ));
    await room.init("AR-SEASONRESET00001",players,"season-seed");
    await runInDurableObject(room,async instance=>{
      for(const player of instance.state.players){
        player.setup={formation:"4-4-2",style:"balanced",chairman:"diplomat"};
        player.draft=DRAFT_LINES.map((line,index)=>({
          line,id:`${line}-${index}`,name:`Test ${line}`,power:72,cost:1,chemistry:0,trait:"reliable"
        }));
        player.market={id:"none"};
        player.training="recovery";
        player.tactics=["balanced","balanced","balanced"];
        player.manualDecisions=2;
      }
      const [home,away]=instance.state.players;
      await instance.finish(teamSnapshot(home),teamSnapshot(away));
    });
    const rows=await env.DB.prepare("SELECT rating_before,season_points,token_progress FROM arena_match_players WHERE match_id=?").bind("AR-SEASONRESET00001").all();
    expect(rows.results).toHaveLength(2);
    expect(rows.results.every(row=>row.rating_before===1400&&row.season_points<=30&&row.token_progress<=3)).toBe(true);
    const profiles=await env.DB.prepare("SELECT season_key,season_points,token_progress FROM arena_profiles WHERE owner_hash LIKE 'owner-season-%'").all();
    expect(profiles.results.every(profile=>profile.season_key===seasonKey()&&profile.season_points<=30&&profile.token_progress<=3)).toBe(true);
  });
});
