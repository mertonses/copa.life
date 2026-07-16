import { env, exports } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import { MAX_BODY_BYTES, requestKey, moderateClubName, normalizeAnalyticsEvent, purgeExpired, routeBucket } from "../src/index.js";

const origin="https://copa.life";
const snapshot=(id="G-CLIENT123")=>({
  schema_version:1,game_version:"2026.07.13",data_version:"2026.07.13",public_ghost_id:id,
  reached_round:3,squad_power:74,cash:12,club:{name:"Test Athletic",country:"TR"},active_cards:[],
  starting_xi:Array.from({length:11},(_,index)=>({name:`Player ${index+1}`,pos:index?"OS":"KL",power:70+index%4}))
});
const authHeaders=(client="GCL-CLIENT123",token="GDT-DELETE1234567890")=>({origin,"content-type":"application/json","x-copa-client":client,"x-copa-consent-version":"ghost-terms-v1","x-copa-delete-token":token});
const post=(body,client,token)=>exports.default.fetch(new Request("https://ghost.test/v1/ghosts",{method:"POST",headers:authHeaders(client,token),body:JSON.stringify(body)}));

describe("Ghost Club Worker",()=>{
  it("uses fixed privacy-safe route buckets for worker metrics",()=>{
    expect(routeBucket("/v1/health")).toBe("health");
    expect(routeBucket("/v1/ghosts/G-ABCDEF123456/report")).toBe("ghost_report");
    expect(routeBucket("/private/user@example.com")).toBe("not_found");
  });

  it("reports D1 health",async()=>{
    const response=await exports.default.fetch(new Request("https://ghost.test/v1/health",{headers:{origin}}));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ok:true,service:"ghost-club-api",schema_version:2,consent_version:"ghost-terms-v1"});
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

  it("uses the Cloudflare connecting IP before the spoofable client header",()=>{
    const request=new Request("https://ghost.test",{headers:{"cf-connecting-ip":"203.0.113.9","x-copa-client":"GCL-CHANGEME1"}});
    expect(requestKey(request)).toBe("ip:203.0.113.9");
  });

  it("requires explicit consent and a deletion token",async()=>{
    const response=await exports.default.fetch(new Request("https://ghost.test/v1/ghosts",{method:"POST",headers:{origin,"content-type":"application/json"},body:JSON.stringify(snapshot())}));
    expect(response.status).toBe(428);expect(await response.json()).toMatchObject({error:"consent_required"});
  });

  it("records only allowlisted aggregate product events",async()=>{
    const raw={schema_version:1,event:"draft_started",platform:"web",locale:"tr",game_country:"TR",round:1,outcome:"",detail:"",page_path:"/",app_version:"build-123",player_name:"Must Not Be Stored",club_name:"Must Not Be Stored",session_id:"Must Not Be Stored"};
    expect(normalizeAnalyticsEvent(raw)).toEqual({event:"draft_started",platform:"web",locale:"tr",gameCountry:"TR",outcome:"",detail:"",round:1,pagePath:"/",appVersion:"build-123"});
    const response=await exports.default.fetch(new Request("https://ghost.test/v1/analytics/events",{method:"POST",headers:{origin,"content-type":"text/plain;charset=UTF-8"},body:JSON.stringify(raw)}));
    expect(response.status).toBe(204);
    expect(await response.text()).toBe("");
    expect(normalizeAnalyticsEvent({...raw,event:"arbitrary_event"})).toBeNull();
    expect(normalizeAnalyticsEvent({...raw,page_path:"/?email=user@example.com"})).toBeNull();
  });

  it("moderates prohibited and brand-like club names",async()=>{
    expect(moderateClubName("Nazi Club")).toMatchObject({status:"blocked"});
    expect(moderateClubName("Galatasaray FC")).toMatchObject({status:"review"});
    expect(moderateClubName("Tokyo Athletic")).toMatchObject({status:"eligible"});
    const blocked=snapshot();blocked.club.name="Nazi Club";const response=await post(blocked,"GCL-BADCLIENT1","GDT-BADDELETE1234567");expect(response.status).toBe(422);
  });

  it("reports hide a Ghost from matching and repeated reports block it",async()=>{
    const created=await post(snapshot(),"GCL-OWNER1234","GDT-OWNERDELETE12345"),id=(await created.json()).id;
    for(let index=1;index<=3;index++){
      const report=await exports.default.fetch(new Request(`https://ghost.test/v1/ghosts/${id}/report`,{method:"POST",headers:{origin,"content-type":"application/json","x-copa-client":`GCL-REPORTER${index}A`},body:JSON.stringify({reason:"impersonation"})}));
      expect(report.status).toBe(201);
    }
    const row=await env.GHOSTS.prepare("SELECT status FROM ghost_runs WHERE public_id=?").bind(id).first();expect(row.status).toBe("blocked");
  });

  it("deletes all rows owned by the client-held deletion token",async()=>{
    const token="GDT-PRIVATEDELETE123",created=await post(snapshot(),"GCL-DELETE1234",token),id=(await created.json()).id;
    const response=await exports.default.fetch(new Request("https://ghost.test/v1/me/ghosts",{method:"DELETE",headers:{origin,"x-copa-client":"GCL-DELETE1234","x-copa-delete-token":token}}));
    expect(response.status).toBe(200);expect(await response.json()).toMatchObject({ok:true,deleted:1});
    expect(await env.GHOSTS.prepare("SELECT public_id FROM ghost_runs WHERE public_id=?").bind(id).first()).toBeNull();
  });

  it("physically purges expired rows",async()=>{
    await env.GHOSTS.prepare("INSERT INTO ghost_runs (public_id,game_version,data_version,reached_round,squad_power,created_at,eligible_until,snapshot,integrity,status) VALUES ('G-EXPIRED123','v','d',1,50,'2020-01-01','2020-02-01','{}','sha256:x','eligible')").run();
    expect(await purgeExpired(env,new Date("2026-07-15T00:00:00Z"))).toBeGreaterThanOrEqual(1);
    expect(await env.GHOSTS.prepare("SELECT public_id FROM ghost_runs WHERE public_id='G-EXPIRED123'").first()).toBeNull();
  });
});
