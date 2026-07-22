import { env, exports } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import { MAX_BODY_BYTES, requestKey, moderateClubName, normalizeAnalyticsEvent, detectSchemaVersion, purgeExpired, routeBucket, validHistory } from "../src/index.js";

const origin="https://copa.life";
const formation442=["GK","LB","CB","CB","RB","LM","CM","CM","RM","ST","ST"];
const snapshot=(id="G-CLIENT123")=>{
  const starting=formation442.map((pos,index)=>({name:`Player ${index+1}`,pos,power:70+index%4}));
  return {
    schema_version:1,game_version:"2026.07.13",data_version:"2026.07.13",public_ghost_id:id,
    simulation_version:"copa-final-core-v3",card_schema_version:"2026.07",
    reached_round:3,squad_power:74,cash:12,club:{name:"Test Athletic",country:"TR"},chairman:{id:"babacan",name:"Patron"},formation:"4-4-2",active_cards:[],
    squad:starting.map(player=>({...player})),starting_xi:starting,bench:[],
    match_history:Array.from({length:6},(_,index)=>({opponent:`Opponent ${index+1}`,result:index<2?"W":index===2?"L":"",gf:index<2?2:index===2?1:0,ga:index<2?0:index===2?2:0})),
    result:{won:false,score:"",end_type:""}
  };
};
const reachFinal=(value,won=false)=>{
  value.reached_round=6;
  value.match_history=value.match_history.map((match,index)=>({...match,result:index<5?"W":won?"W":"L",gf:index<5?2:won?2:1,ga:index<5?0:won?1:2}));
  value.result={won,score:won?"2-1":"1-2",end_type:"regulation"};
  return value;
};
const authHeaders=(client="GCL-CLIENT123",token="GDT-DELETE1234567890")=>({origin,"content-type":"application/json","x-copa-client":client,"x-copa-consent-version":"ghost-terms-v1","x-copa-delete-token":token});
const post=(body,client,token)=>exports.default.fetch(new Request("https://ghost.test/v1/ghosts",{method:"POST",headers:authHeaders(client,token),body:JSON.stringify(body)}));
const careerRun=(id="run-career123",won=false)=>({
  schema_version:1,run_id:id,cheat_run:false,club:{name:"Test Athletic",country:"TR"},reached_round:won?6:3,
  result:{won,score:won?"2-1":"",end_type:won?"regulation":""},
  match_history:Array.from({length:6},(_,index)=>({opponent:`Opponent ${index+1}`,result:index<(won?6:2)?"W":index===(won?99:2)?"L":"",gf:index<(won?6:2)?2:index===(won?99:2)?1:0,ga:index<(won?6:2)?0:index===(won?99:2)?2:0}))
});
const leaderboardHeaders=(client="GCL-CAREER123",token="GDT-CAREERDELETE12345")=>({origin,"content-type":"application/json","x-copa-client":client,"x-copa-leaderboard-consent-version":"leaderboard-terms-v1","x-copa-delete-token":token});
const postCareer=(body,client,token)=>exports.default.fetch(new Request("https://ghost.test/v1/leaderboard/runs",{method:"POST",headers:leaderboardHeaders(client,token),body:JSON.stringify(body)}));

describe("Ghost Club Worker",()=>{
  it("accepts group-stage records and validates qualification semantics",()=>{
    const history=[
      {opponent:"A",result:"W",gf:2,ga:0,stage:"group",penalty:null},
      {opponent:"B",result:"D",gf:1,ga:1,stage:"group",penalty:null},
      {opponent:"C",result:"L",gf:0,ga:1,stage:"group",penalty:null},
      ...Array.from({length:3},(_,index)=>({opponent:"",result:"",gf:0,ga:0,stage:["quarterfinal","semifinal","final"][index],penalty:null}))
    ];
    const eliminated={reached_round:3,result:{won:false,score:"",end_type:"group_eliminated"},match_history:history,tournament:{format:"groups16_v1",stage:"group",group:{id:"D",rank:3,points:4,gd:1,qualified:false}}};
    expect(validHistory(eliminated)).toBe(true);
    expect(validHistory({...eliminated,tournament:{...eliminated.tournament,group:{...eliminated.tournament.group,qualified:true}}})).toBe(false);
    const qualified={...eliminated,reached_round:4,result:{won:false,score:"1-1 p 3-4",end_type:"quarterfinal_eliminated"},match_history:history.map((match,index)=>index===3?{opponent:"D",result:"L",gf:1,ga:1,stage:"quarterfinal",penalty:[3,4]}:match),tournament:{format:"groups16_v1",stage:"quarterfinal",group:{id:"D",rank:2,points:4,gd:1,qualified:true}}};
    expect(validHistory(qualified)).toBe(true);
    qualified.match_history[3]={...qualified.match_history[3],result:"D"};
    expect(validHistory(qualified)).toBe(false);
  });

  it("uses fixed privacy-safe route buckets for worker metrics",()=>{
    expect(routeBucket("/v1/health")).toBe("health");
    expect(routeBucket("/v1/ghosts/G-ABCDEF123456/report")).toBe("ghost_report");
    expect(routeBucket("/private/user@example.com")).toBe("not_found");
  });

  it("reports D1 health",async()=>{
    const response=await exports.default.fetch(new Request("https://ghost.test/v1/health",{headers:{origin}}));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ok:true,service:"ghost-club-api",schema_version:3,consent_version:"ghost-terms-v1",leaderboard_consent_version:"leaderboard-terms-v1"});
  });

  it("reports the highest fully installed schema instead of hard-coding health",()=>{
    expect(detectSchemaVersion(null)).toBe(0);
    expect(detectSchemaVersion({ghost_runs:1})).toBe(1);
    expect(detectSchemaVersion({ghost_runs:1,ghost_reports:1,ghost_clients:1})).toBe(2);
    expect(detectSchemaVersion({ghost_runs:1,ghost_reports:1,ghost_clients:1,club_profiles:1,career_runs:1})).toBe(3);
  });

  it("creates server-owned IDs and never overwrites a submitted ID",async()=>{
    const first=await post(snapshot("G-SAMECLIENT")),second=await post(snapshot("G-SAMECLIENT"));
    expect(first.status).toBe(201);expect(second.status).toBe(201);
    const a=await first.json(),b=await second.json();
    expect(a.id).toMatch(/^G-[A-Z0-9]{16}$/);expect(b.id).toMatch(/^G-[A-Z0-9]{16}$/);
    expect(a.id).not.toBe(b.id);expect(a.id).not.toBe("G-SAMECLIENT");
    expect(a.integrity).toMatch(/^sha256:[a-f0-9]{64}$/);
    const rows=await env.GHOSTS.prepare("SELECT public_id, snapshot, integrity FROM ghost_runs ORDER BY created_at").all();
    expect(rows.results).toHaveLength(2);
    const stored=JSON.parse(rows.results[0].snapshot);
    expect(stored.public_ghost_id).toBe(rows.results[0].public_id);
    expect(stored.integrity).toBe(rows.results[0].integrity);
  });

  it("enforces actual streamed payload size without trusting content-length",async()=>{
    const request=new Request("https://ghost.test/v1/ghosts",{method:"POST",headers:authHeaders(),body:JSON.stringify({padding:"x".repeat(MAX_BODY_BYTES+1)})});
    const response=await exports.default.fetch(request);
    expect(response.status).toBe(413);
    expect(await response.json()).toEqual({error:"payload_too_large"});
  });

  it("rejects browser origins outside the allowlist",async()=>{
    const response=await exports.default.fetch(new Request("https://ghost.test/v1/health",{headers:{origin:"https://evil.example"}}));
    expect(response.status).toBe(403);
    expect(response.headers.get("access-control-allow-origin")).toBeNull();
  });

  it("accepts the fixed Android and iOS WebView origins",async()=>{
    for(const nativeOrigin of ["https://localhost","capacitor://localhost"]){
      const response=await exports.default.fetch(new Request("https://ghost.test/v1/health",{headers:{origin:nativeOrigin}}));
      expect(response.status).toBe(200);
      expect(response.headers.get("access-control-allow-origin")).toBe(nativeOrigin);
    }
  });

  it("uses the Cloudflare connecting IP before the spoofable client header",()=>{
    const request=new Request("https://ghost.test",{headers:{"cf-connecting-ip":"203.0.113.9","x-copa-client":"GCL-CHANGEME1"}});
    expect(requestKey(request)).toBe("ip:203.0.113.9");
  });

  it("requires explicit consent and a deletion token",async()=>{
    const response=await exports.default.fetch(new Request("https://ghost.test/v1/ghosts",{method:"POST",headers:{origin,"content-type":"application/json"},body:JSON.stringify(snapshot())}));
    expect(response.status).toBe(428);expect(await response.json()).toMatchObject({error:"consent_required"});
  });

  it("scores career runs on the server, deduplicates them and exposes ranked profiles",async()=>{
    const token="GDT-CAREERDELETE12345";
    const missingConsent=await exports.default.fetch(new Request("https://ghost.test/v1/leaderboard/runs",{method:"POST",headers:{origin,"content-type":"application/json","x-copa-delete-token":token},body:JSON.stringify(careerRun())}));
    expect(missingConsent.status).toBe(428);
    const first=await postCareer(careerRun("run-career123"),"GCL-CAREER123",token);
    expect(first.status).toBe(201);
    expect(await first.json()).toMatchObject({ok:true,duplicate:false,reputation:46,profile:{club_name:"Test Athletic",country:"TR",lifetime_reputation:46,total_runs:1}});
    const duplicate=await postCareer(careerRun("run-career123"),"GCL-CAREER123",token);
    expect(duplicate.status).toBe(200);expect(await duplicate.json()).toMatchObject({ok:true,duplicate:true});
    const champion=await postCareer(careerRun("run-champion123",true),"GCL-CAREER123",token);
    expect(champion.status).toBe(201);
    expect(await champion.json()).toMatchObject({reputation:105,profile:{lifetime_reputation:151,total_runs:2,total_champions:1,total_finals:1,career_level:2}});
    const ranking=await exports.default.fetch(new Request("https://ghost.test/v1/leaderboard?limit=100",{headers:{origin}}));
    expect(ranking.status).toBe(200);
    expect(await ranking.json()).toMatchObject({clubs:[{rank:1,club_name:"Test Athletic",season_score:151}]});
    const mine=await exports.default.fetch(new Request("https://ghost.test/v1/leaderboard/me",{headers:{origin,"x-copa-client":"GCL-CAREER123","x-copa-delete-token":token}}));
    expect(mine.status).toBe(200);expect(await mine.json()).toMatchObject({profile:{rank:1,season_score:151}});
    await env.GHOSTS.prepare("UPDATE club_profiles SET season_key='2000-01',season_score=151").run();
    const betweenSeasons=await exports.default.fetch(new Request("https://ghost.test/v1/leaderboard/me",{headers:{origin,"x-copa-client":"GCL-CAREER123","x-copa-delete-token":token}}));
    expect(betweenSeasons.status).toBe(200);expect(await betweenSeasons.json()).toMatchObject({profile:{rank:0,season_score:0,lifetime_reputation:151},nearby:[]});
    const removed=await exports.default.fetch(new Request("https://ghost.test/v1/me/leaderboard",{method:"DELETE",headers:{origin,"x-copa-client":"GCL-CAREER123","x-copa-delete-token":token}}));
    expect(removed.status).toBe(200);expect(await removed.json()).toMatchObject({ok:true,deleted:3});
  });

  it("keeps concurrent career totals atomic and gives equal scores the same rank",async()=>{
    const ownerToken="GDT-CONCURRENTDELETE1";
    const [first,second]=await Promise.all([
      postCareer(careerRun("run-concurrenta",true),"GCL-CONCURRENT1",ownerToken),
      postCareer(careerRun("run-concurrentb",true),"GCL-CONCURRENT1",ownerToken)
    ]);
    expect([first.status,second.status].sort()).toEqual([201,201]);
    const concurrentBodies=await Promise.all([first.json(),second.json()]);
    expect(concurrentBodies.map(body=>body.reputation).sort((a,b)=>a-b)).toEqual([95,105]);
    const owner=await env.GHOSTS.prepare("SELECT * FROM club_profiles WHERE owner_hash=(SELECT owner_hash FROM career_runs WHERE run_id='run-concurrenta')").first();
    expect(owner).toMatchObject({lifetime_reputation:200,total_runs:2,total_champions:2,total_finals:2,season_score:200});

    const rivalToken="GDT-EQUALRANKDELETE12";
    const rivalResponses=await Promise.all([
      postCareer(careerRun("run-equalranka",true),"GCL-EQUALRANK01",rivalToken),
      postCareer(careerRun("run-equalrankb",true),"GCL-EQUALRANK01",rivalToken)
    ]);
    expect(rivalResponses.every(response=>response.status===201)).toBe(true);
    const ranking=await exports.default.fetch(new Request("https://ghost.test/v1/leaderboard?limit=100",{headers:{origin}}));
    const clubs=(await ranking.json()).clubs;
    expect(clubs).toHaveLength(2);
    expect(clubs.map(club=>club.rank)).toEqual([1,1]);
    expect(clubs.map(club=>club.season_score)).toEqual([200,200]);
  });

  it("rejects semantically forged squads and histories",async()=>{
    const overpowered=snapshot();overpowered.starting_xi[0].power=115;overpowered.squad[0].power=115;
    expect((await post(overpowered,"GCL-FORGER001","GDT-FORGERDELETE12345")).status).toBe(422);
    const wrongShape=snapshot();wrongShape.starting_xi[1].pos="ST";wrongShape.squad[1].pos="ST";
    expect((await post(wrongShape,"GCL-FORGER002","GDT-FORGERDELETE45678")).status).toBe(422);
    const fakePath=snapshot();fakePath.match_history[0].result="L";
    expect((await post(fakePath,"GCL-FORGER003","GDT-FORGERDELETE78901")).status).toBe(422);
    const fakePower=snapshot();fakePower.squad_power=115;
    expect((await post(fakePower,"GCL-FORGER004","GDT-FORGERDELETEABCDE")).status).toBe(422);
  });

  it("records only allowlisted aggregate product events",async()=>{
    const raw={schema_version:1,event:"draft_started",platform:"web",locale:"tr",game_country:"TR",round:1,outcome:"",detail:"",page_path:"/",app_version:"build-123",player_name:"Must Not Be Stored",club_name:"Must Not Be Stored",session_id:"Must Not Be Stored"};
    expect(normalizeAnalyticsEvent(raw)).toEqual({event:"draft_started",platform:"web",locale:"tr",gameCountry:"TR",outcome:"",detail:"",round:1,pagePath:"/",appVersion:"build-123"});
    const response=await exports.default.fetch(new Request("https://ghost.test/v1/analytics/events",{method:"POST",headers:{origin,"content-type":"text/plain;charset=UTF-8"},body:JSON.stringify(raw)}));
    expect(response.status).toBe(204);
    expect(await response.text()).toBe("");
    expect(normalizeAnalyticsEvent({...raw,event:"arbitrary_event"})).toBeNull();
    expect(normalizeAnalyticsEvent({...raw,platform:"ios"})).toMatchObject({platform:"ios"});
    expect(normalizeAnalyticsEvent({...raw,page_path:"/?email=user@example.com"})).toBeNull();
    const finalEvent={...raw,schema_version:2,event:"final_sim_completed",round:6,outcome:"win",model_version:"copa-final-core-v2",power_gap:"home_4_11",end_type:"golden_goal",tactic:"push"};
    expect(normalizeAnalyticsEvent(finalEvent)).toMatchObject({event:"final_sim_completed",schemaVersion:2,modelVersion:"copa-final-core-v2",powerGap:"home_4_11",endType:"golden_goal",tactic:"push"});
    const balanceEvent={...raw,schema_version:3,event:"reward_selected",outcome:"draw",chairman:"babacan",formation:"4-3-3",style:"gegen",reward:"cash",card_kind:"power",economy_band:"cash_0_9"};
    expect(normalizeAnalyticsEvent(balanceEvent)).toMatchObject({event:"reward_selected",schemaVersion:3,outcome:"draw",chairman:"babacan",formation:"4-3-3",style:"gegen",reward:"cash",cardKind:"power",economyBand:"cash_0_9"});
    expect(normalizeAnalyticsEvent({...balanceEvent,chairman:"unknown"})).toBeNull();
    expect(normalizeAnalyticsEvent({...finalEvent,schema_version:3,chairman:"babacan"})).toMatchObject({event:"final_sim_completed",schemaVersion:3,chairman:"babacan"});
    const tournamentEvent={...balanceEvent,schema_version:4,event:"tournament_match_resolved",tournament_stage:"group",draw_mode:"",qualification:"yes",group_matchday:3};
    expect(normalizeAnalyticsEvent(tournamentEvent)).toMatchObject({event:"tournament_match_resolved",schemaVersion:4,tournamentStage:"group",qualification:"yes",groupMatchday:3});
    expect(normalizeAnalyticsEvent({...tournamentEvent,tournament_stage:"round-of-16"})).toBeNull();
    expect(normalizeAnalyticsEvent({...finalEvent,seed:"never-store",power_gap:"exact_7"})).toBeNull();
  });

  it("moderates prohibited and brand-like club names",async()=>{
    expect(moderateClubName("Nazi Club")).toMatchObject({status:"blocked"});
    expect(moderateClubName("Galatasaray FC")).toMatchObject({status:"review"});
    expect(moderateClubName("Tokyo Athletic")).toMatchObject({status:"eligible"});
    const blocked=snapshot();blocked.club.name="Nazi Club";const response=await post(blocked,"GCL-BADCLIENT1","GDT-BADDELETE1234567");expect(response.status).toBe(422);
  });

  it("matches only compatible simulation and card schemas in the tight power band",async()=>{
    const compatibleSnapshot=reachFinal(snapshot());compatibleSnapshot.squad_power=104;compatibleSnapshot.active_cards=[{id:"derbi",tier:"COMMON"},{id:"final_provasi",tier:"COMMON"},{id:"son_dans",tier:"COMMON"}];
    const compatible=await post(compatibleSnapshot,"GCL-MATCHOWNER1","GDT-MATCHDELETE12345"),compatibleId=(await compatible.json()).id;
    const legacy=reachFinal(snapshot());legacy.squad_power=104;legacy.active_cards=[{id:"derbi",tier:"COMMON"},{id:"final_provasi",tier:"COMMON"},{id:"son_dans",tier:"COMMON"}];legacy.simulation_version="copa-final-core-v2";
    const legacyCreated=await post(legacy,"GCL-MATCHOWNER2","GDT-MATCHDELETE56789");expect(legacyCreated.status).toBe(201);
    const legacyId=(await legacyCreated.json()).id;
    const response=await exports.default.fetch(new Request("https://ghost.test/v1/ghosts/match?power=104&round=6&simulation_version=copa-final-core-v3&card_schema_version=2026.07",{headers:{origin}}));
    expect(response.status).toBe(200);
    const matched=(await response.json()).ghost;
    expect(matched).toMatchObject({simulation_version:"copa-final-core-v3",card_schema_version:"2026.07"});
    expect(matched.public_ghost_id).not.toBe(legacyId);
    expect(matched.public_ghost_id).toBe(compatibleId);
  });

  it("uses the compatibility index before reading ghost snapshots",async()=>{
    const plan=await env.GHOSTS.prepare("EXPLAIN QUERY PLAN SELECT public_id, snapshot FROM ghost_runs WHERE status='eligible' AND eligible_until > ? AND json_extract(snapshot,'$.simulation_version')=? AND json_extract(snapshot,'$.card_schema_version')=? AND reached_round BETWEEN ? AND ? AND squad_power BETWEEN ? AND ? ORDER BY ABS(squad_power-?) ASC, created_at DESC LIMIT 60").bind("2026-07-01T00:00:00.000Z","copa-final-core-v3","2026.07",5,6,96,112,104).all();
    expect(JSON.stringify(plan.results||[])).toContain("ghost_match_compat_lookup");
    const leaderboardPlan=await env.GHOSTS.prepare("EXPLAIN QUERY PLAN SELECT * FROM club_profiles WHERE status='eligible' AND season_key=? AND season_score>0 ORDER BY season_score DESC LIMIT ?").bind("2026-07",100).all();
    expect(JSON.stringify(leaderboardPlan.results||[])).toContain("club_leaderboard_lookup");
  });

  it("deduplicates spoofed reports by network and sends three distinct reporters to review",async()=>{
    const created=await post(snapshot(),"GCL-OWNER1234","GDT-OWNERDELETE12345"),id=(await created.json()).id;
    for(let index=1;index<=3;index++){
      const duplicate=await exports.default.fetch(new Request(`https://ghost.test/v1/ghosts/${id}/report`,{method:"POST",headers:{origin,"content-type":"application/json","cf-connecting-ip":"203.0.113.10","x-copa-client":`GCL-SPOOFED${index}A`},body:JSON.stringify({reason:"impersonation"})}));
      expect(duplicate.status).toBe(201);
    }
    let row=await env.GHOSTS.prepare("SELECT status FROM ghost_runs WHERE public_id=?").bind(id).first();expect(row.status).toBe("eligible");
    for(let index=1;index<=3;index++){
      const report=await exports.default.fetch(new Request(`https://ghost.test/v1/ghosts/${id}/report`,{method:"POST",headers:{origin,"content-type":"application/json","cf-connecting-ip":`203.0.113.${20+index}`,"x-copa-client":`GCL-REPORTER${index}A`},body:JSON.stringify({reason:"impersonation"})}));
      expect(report.status).toBe(201);
    }
    row=await env.GHOSTS.prepare("SELECT status FROM ghost_runs WHERE public_id=?").bind(id).first();expect(row.status).toBe("review");
    const owner=await env.GHOSTS.prepare("SELECT violation_count FROM ghost_clients WHERE client_hash=(SELECT client_hash FROM ghost_runs WHERE public_id=?)").bind(id).first();
    expect(Number(owner.violation_count)).toBe(0);
  });

  it("deletes all rows owned by the client-held deletion token",async()=>{
    const token="GDT-PRIVATEDELETE123",created=await post(snapshot(),"GCL-DELETE1234",token),id=(await created.json()).id;
    const response=await exports.default.fetch(new Request("https://ghost.test/v1/me/ghosts",{method:"DELETE",headers:{origin,"x-copa-client":"GCL-DELETE1234","x-copa-delete-token":token}}));
    expect(response.status).toBe(200);expect(await response.json()).toMatchObject({ok:true,deleted:1});
    expect(await env.GHOSTS.prepare("SELECT public_id FROM ghost_runs WHERE public_id=?").bind(id).first()).toBeNull();
  });

  it("credits a group draw in server-owned career reputation",async()=>{
    const run={schema_version:1,run_id:"run-groupdraw1",cheat_run:false,club:{name:"Draw Athletic",country:"TR"},reached_round:3,result:{won:false,score:"",end_type:"group_eliminated"},match_history:[
      {opponent:"A",result:"W",gf:2,ga:0,stage:"group",penalty:null},
      {opponent:"B",result:"D",gf:1,ga:1,stage:"group",penalty:null},
      {opponent:"C",result:"L",gf:0,ga:1,stage:"group",penalty:null},
      {opponent:"",result:"",gf:0,ga:0,stage:"quarterfinal",penalty:null},
      {opponent:"",result:"",gf:0,ga:0,stage:"semifinal",penalty:null},
      {opponent:"",result:"",gf:0,ga:0,stage:"final",penalty:null}
    ],tournament:{format:"groups16_v1",stage:"group",group:{id:"A",rank:3,points:4,gd:1,qualified:false}}};
    const response=await postCareer(run,"GCL-GROUPDRAW1","GDT-GROUPDRAW1234567");
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({reputation:44,profile:{lifetime_reputation:44,total_runs:1}});
  });

  it("physically purges expired rows",async()=>{
    await env.GHOSTS.prepare("INSERT INTO ghost_runs (public_id,game_version,data_version,reached_round,squad_power,created_at,eligible_until,snapshot,integrity,status) VALUES ('G-EXPIRED123','v','d',1,50,'2020-01-01','2020-02-01','{}','sha256:x','eligible')").run();
    expect(await purgeExpired(env,new Date("2026-07-15T00:00:00Z"))).toBeGreaterThanOrEqual(1);
    expect(await env.GHOSTS.prepare("SELECT public_id FROM ghost_runs WHERE public_id='G-EXPIRED123'").first()).toBeNull();
  });
});
