import {beforeEach,describe,expect,it} from "vitest";
import {env,SELF,runInDurableObject,applyD1Migrations} from "cloudflare:test";
import {ARENA_RULES_VERSION,DRAFT_LINES,publicState,seasonKey,teamSnapshot} from "../src/rules.js";
import {ARENA_PLAYER_CATALOG_VERSION} from "../src/playerCatalog.js";

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
const ownerFor=async suffix=>{
  const token=headers(suffix)["x-copa-arena-token"];
  const bytes=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(`arena-owner:${token}`));
  return Array.from(new Uint8Array(bytes),item=>item.toString(16).padStart(2,"0")).join("");
};

beforeEach(async()=>{await applyD1Migrations(env.DB,env.TEST_MIGRATIONS);});

describe("Arena HTTP API",()=>{
  it("requires an Arena identity and rejects invalid names",async()=>{
    const missing=await SELF.fetch("https://arena.test/v1/arena/session",{method:"POST",headers:{origin,"content-type":"application/json"},body:JSON.stringify({clubName:"Copa"})});
    expect(missing.status).toBe(428);
    const invalid=await SELF.fetch("https://arena.test/v1/arena/session",{method:"POST",headers:headers("invalid"),body:JSON.stringify({clubName:"<script>",mode:"ranked"})});
    expect(invalid.status).toBe(422);
  });

  it("rejects an oversized streamed body before buffering it",async()=>{
    const stream=new ReadableStream({
      start(controller){
        for(let index=0;index<6;index++)controller.enqueue(new TextEncoder().encode("x".repeat(1024)));
        controller.close();
      }
    });
    const response=await SELF.fetch("https://arena.test/v1/arena/session",{
      method:"POST",headers:headers("streamlimit"),body:stream
    });
    expect(response.status).toBe(413);
    expect(await response.json()).toEqual({error:"payload_too_large"});
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

  it("creates a separate rewardless server-authoritative practice room",async()=>{
    const suffix="practice",owner=await ownerFor(suffix);
    const response=await SELF.fetch("https://arena.test/v1/arena/session",{method:"POST",headers:headers(suffix),body:JSON.stringify({clubName:"Prova SK",mode:"practice",region:"weur"})});
    const data=await response.json();
    expect(response.status).toBe(201);
    expect(data.ticket).toBeUndefined();
    expect(data.directMatch.roomToken).toMatch(/^RT-/);
    const room=env.ARENA_ROOM.getByName(data.directMatch.matchId);
    await runInDurableObject(room,instance=>{
      expect(instance.state.mode).toBe("practice");
      expect(instance.state.botIndex).toBe(1);
      expect(instance.state.players[0].owner).toBe(owner);
      expect(instance.state.players[1]).toMatchObject({clubName:"ARENA TRAINING XI",connected:true});
    });
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

  it("recovers an active match when its matched socket message was lost",async()=>{
    const suffix="recoverroom",owner=await ownerFor(suffix),matchId="AR-RECOVERY00000001";
    const first=await SELF.fetch("https://arena.test/v1/arena/session",{method:"POST",headers:headers(suffix),body:JSON.stringify({clubName:"Dönüş SK",mode:"ranked",region:"weur"})});
    expect(first.status).toBe(201);
    const room=env.ARENA_ROOM.getByName(matchId);
    const access=await room.init(matchId,[
      {owner,clubName:"Dönüş SK",rating:1000},
      {owner:"owner-recovery-rival",clubName:"Rakip SK",rating:1000}
    ],"recovery-seed");
    await env.DB.prepare("UPDATE arena_presence SET status='match',match_id=?,expires_at=?,updated_at=? WHERE owner_hash=?")
      .bind(matchId,new Date(Date.now()+60_000).toISOString(),new Date().toISOString(),owner).run();
    const recovered=await SELF.fetch("https://arena.test/v1/arena/session",{method:"POST",headers:headers(suffix),body:JSON.stringify({clubName:"Dönüş SK",mode:"ranked",region:"weur"})});
    expect(recovered.status).toBe(200);
    expect(await recovered.json()).toMatchObject({recoverMatch:{matchId,roomToken:access[owner]}});
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
  it("recovers an expired live decision window when a client syncs",async()=>{
    const room=env.ARENA_ROOM.getByName("AR-EXPIREDLIVE000001");
    const players=[
      {owner:"owner-expired-home",clubName:"Aktif Ev",rating:1000},
      {owner:"owner-expired-away",clubName:"Bekleyen Dep",rating:1000}
    ];
    await room.init("AR-EXPIREDLIVE000001",players,"expired-live-seed");
    await runInDurableObject(room,async instance=>{
      for(const player of instance.state.players){
        player.setup={formation:"4-4-2",style:"balanced",chairman:"babacan"};
        player.draft=DRAFT_LINES.map((line,index)=>({
          line,id:`${line}-${index}`,name:`Test ${line}`,power:72,cost:1,chemistry:0,trait:"reliable"
        }));
        player.market={id:"none"};
        player.training="recovery";
      }
      instance.state.phase="live";
      instance.state.window=0;
      instance.state.players[0].tactics=["press"];
      instance.state.players[1].tactics=[];
      instance.state.deadline=Date.now()-1;
      instance.persist();
      expect(await instance.recoverExpired()).toBe(true);
      expect(instance.state.phase).toBe("live");
      expect(instance.state.window).toBe(0);
      expect(instance.state.liveStage).toBe("reveal");
      expect(instance.state.matchMinute).toBe(20);
      expect(instance.state.players[1].tactics).toEqual(["balanced"]);
      expect(instance.state.deadline).toBeGreaterThan(Date.now());
      instance.state.deadline=Date.now()-1;
      await instance.alarm();
      expect(instance.state.window).toBe(1);
      expect(instance.state.liveStage).toBe("decision");
    });
  });

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
      expect(instance.state.catalogVersion).toBe(ARENA_PLAYER_CATALOG_VERSION);
      expect(instance.state.draftPlan.flat(2)).toHaveLength(66);
      expect(new Set(instance.state.draftPlan.flat(2).map(offer=>offer.sourceId)).size).toBe(66);
      expect(instance.acceptAction("owner-home","AA-c093e7e013304d56a149c633e80f02a3")).toBe(true);
      expect(instance.acceptAction("owner-home","AA-c093e7e013304d56a149c633e80f02a3")).toBe(false);
      let sequence=0;
      const act=(owner,data)=>instance.action(owner,{...data,actionId:`AA-${++sequence}ABCDEFGH`});
      await act("owner-home",{type:"ready"});await act("owner-away",{type:"ready"});
      for(const owner of ["owner-home","owner-away"])await act(owner,{type:"setup",choice:{formation:"4-4-2",style:"balanced",chairman:"diplomat"}});
      expect(instance.state.players.every(player=>player.setup.chairman==="babacan")).toBe(true);
      for(let step=0;step<DRAFT_LINES.length;step++){
        for(let side=0;side<2;side++){
          const offer=instance.state.offers[side].sort((a,b)=>a.cost-b.cost)[0];
          expect(await act(players[side].owner,{type:"draft",choice:offer.id})).toBe("ok");
          if(step===0&&side===0)expect(await act(players[side].owner,{type:"draft",choice:offer.id})).toBe("already_submitted");
        }
      }
      expect(instance.state.players.every(player=>player.draft.length===11)).toBe(true);
      for(let side=0;side<2;side++){
        const free=instance.state.offers[side].find(item=>item.id==="none");
        await act(players[side].owner,{type:"market",choice:free.id});
      }
      await act("owner-home",{type:"training",choice:"chemistry"});await act("owner-away",{type:"training",choice:"recovery"});
      const segmentEnds=[20,45,70,90];
      for(let window=0;window<4;window++){
        await act("owner-home",{type:"tactic",choice:"press"});await act("owner-away",{type:"tactic",choice:"control"});
        expect(instance.state.liveStage).toBe("reveal");
        expect(instance.state.matchMinute).toBe(segmentEnds[window]);
        instance.state.deadline=Date.now()-1;
        await instance.alarm();
      }
      while(instance.state.phase==="penalty"){
        if(instance.state.penalty.stage==="choice"){
          expect(await act("owner-home",{type:"penalty",choice:"leftHigh"})).toBe("ok");
          expect(JSON.stringify(publicState(instance.state,"owner-away"))).not.toContain("leftHigh");
          expect(await act("owner-home",{type:"penalty",choice:"center"})).toBe("already_submitted");
          expect(await act("owner-away",{type:"penalty",choice:"rightLow"})).toBe("ok");
        }
        instance.state.deadline=Date.now()-1;
        await instance.alarm();
      }
      expect(instance.state.phase).toBe("result");
      expect(instance.state.events.length).toBeGreaterThan(0);
      expect(instance.state.result.rewards).toHaveLength(2);
      expect(instance.state.result.profiles).toHaveLength(2);
      expect(instance.state.result.profiles[0].wins+instance.state.result.profiles[0].draws+instance.state.result.profiles[0].losses).toBe(1);
    });
    const results=await env.DB.prepare("SELECT * FROM arena_match_players WHERE match_id=?").bind("AR-TESTROOM000000001").all();
    expect(results.results).toHaveLength(2);
    const match=await env.DB.prepare("SELECT catalog_version,source_provenance_json,result_json FROM arena_matches WHERE match_id=?").bind("AR-TESTROOM000000001").first();
    expect(match.catalog_version).toBe(ARENA_PLAYER_CATALOG_VERSION);
    expect(JSON.parse(match.source_provenance_json).ENG.code).toBe("ENG");
    expect(JSON.parse(match.result_json).catalogVersion).toBe(ARENA_PLAYER_CATALOG_VERSION);
    await runInDurableObject(room,instance=>instance.recordResult(instance.state.result.outcomes));
    const history=await env.DB.prepare("SELECT * FROM arena_match_players WHERE match_id=?").bind("AR-TESTROOM000000001").all();
    expect(history.results).toHaveLength(2);
  });

  it("settles concurrent duplicate result writes exactly once",async()=>{
    const matchId="AR-CONCURRENT0000001",created=new Date().toISOString();
    const players=[
      {owner:"owner-concurrent-home",clubName:"Tek Yazım Ev",rating:1000},
      {owner:"owner-concurrent-away",clubName:"Tek Yazım Dep",rating:1000}
    ];
    await env.DB.batch(players.map((player,index)=>
      env.DB.prepare("INSERT INTO arena_profiles VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)")
        .bind(player.owner,`AC-CONCUR${index}`,player.clubName,1000,seasonKey(),0,0,0,0,0,0,"[]",created,created)
    ));
    const room=env.ARENA_ROOM.getByName(matchId);
    await room.init(matchId,players,"concurrent-seed");
    await runInDurableObject(room,async instance=>{
      instance.state.score=[2,1];
      instance.state.result={
        score:[2,1],outcomes:["win","loss"],penalty:null,forfeitIndex:null,voided:false,
        teams:[{},{}],rulesVersion:instance.state.rulesVersion
      };
      const outcomes=instance.state.result.outcomes;
      expect(await Promise.all([instance.recordResult(outcomes),instance.recordResult(outcomes)])).toEqual([true,true]);
    });
    const profiles=await env.DB.prepare("SELECT owner_hash,wins,draws,losses FROM arena_profiles WHERE owner_hash LIKE 'owner-concurrent-%' ORDER BY owner_hash").all();
    expect(profiles.results).toHaveLength(2);
    expect(profiles.results.reduce((total,row)=>total+row.wins+row.draws+row.losses,0)).toBe(2);
    const settlements=await env.DB.prepare("SELECT owner_hash,settlement_token FROM arena_match_players WHERE match_id=?").bind(matchId).all();
    expect(settlements.results).toHaveLength(2);
    expect(settlements.results.every(row=>String(row.settlement_token).startsWith("AS-"))).toBe(true);
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
        player.setup={formation:"4-4-2",style:"balanced",chairman:"babacan"};
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
        player.setup={formation:"4-4-2",style:"balanced",chairman:"babacan"};
        player.draft=DRAFT_LINES.map((line,index)=>({
          line,id:`${line}-${index}`,name:`Test ${line}`,power:72,cost:1,chemistry:0,trait:"reliable"
        }));
        player.market={id:"none"};
        player.training="recovery";
        player.tactics=["balanced","balanced","balanced"];
      }
      instance.state.players[0].manualDecisions=6;
      instance.state.players[0].manualTactics=1;
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

  it("records a current-rules regulation draw without a penalty shootout",async()=>{
    const room=env.ARENA_ROOM.getByName("AR-REGULATIONDRAW001");
    const players=[
      {owner:"owner-draw-home",clubName:"Berabere Ev",rating:1000},
      {owner:"owner-draw-away",clubName:"Berabere Dep",rating:1000}
    ];
    const created=new Date().toISOString();
    await env.DB.batch(players.map((player,index)=>
      env.DB.prepare("INSERT INTO arena_profiles VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)")
        .bind(player.owner,`AC-DRAW${index}`,player.clubName,1000,seasonKey(),0,0,0,0,0,0,"[]",created,created)
    ));
    await room.init("AR-REGULATIONDRAW001",players,"draw-seed");
    await runInDurableObject(room,async instance=>{
      for(const player of instance.state.players){
        player.setup={formation:"4-4-2",style:"balanced",chairman:"babacan"};
        player.draft=DRAFT_LINES.map((line,index)=>({
          line,id:`${line}-${index}`,name:`Draw ${line}`,power:72,cost:1,chemistry:0,trait:"reliable"
        }));
        player.market={id:"none"};
        player.training="recovery";
        player.tactics=["balanced","balanced","balanced"];
        player.manualDecisions=6;
        player.manualTactics=1;
      }
      instance.state.score=[1,1];
      await instance.finish(
        teamSnapshot(instance.state.players[0]),
        teamSnapshot(instance.state.players[1])
      );
      expect(instance.state.result).toMatchObject({
        score:[1,1],penalty:null,outcomes:["draw","draw"],forfeitIndex:null,voided:false
      });
    });
    const rows=await env.DB.prepare(
      "SELECT outcome,rating_delta,season_points,token_progress FROM arena_match_players WHERE match_id=?"
    ).bind("AR-REGULATIONDRAW001").all();
    expect(rows.results).toHaveLength(2);
    expect(rows.results.every(row=>
      row.outcome==="draw"&&row.rating_delta===0&&row.season_points===12&&row.token_progress===2
    )).toBe(true);
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
        player.setup={formation:"4-4-2",style:"balanced",chairman:"babacan"};
        player.draft=DRAFT_LINES.map((line,index)=>({
          line,id:`${line}-${index}`,name:`Test ${line}`,power:72,cost:1,chemistry:0,trait:"reliable"
        }));
        player.market={id:"none"};
        player.training="recovery";
        player.tactics=["balanced","balanced","balanced"];
        player.manualDecisions=6;
        player.manualTactics=1;
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
