import { test, expect } from "@playwright/test";

test.use({serviceWorkers:"block"});

test("web Ghost opponents default on while sharing requires consent and deletion clears identity",async({page})=>{
  const requests:{method:string;url:string;headers:Record<string,string>;body:string|null}[]=[];
  await page.addInitScript(()=>{
    for(const key of Object.keys(localStorage))if(key.startsWith("copa_ghost_"))localStorage.removeItem(key);
  });
  await page.route("**/v1/**",async route=>{
    const request=route.request();
    requests.push({method:request.method(),url:request.url(),headers:request.headers(),body:request.postData()});
    const corsHeaders={
      "access-control-allow-origin":"*",
      "access-control-allow-methods":"GET,POST,DELETE,OPTIONS",
      "access-control-allow-headers":"content-type,x-copa-client,x-copa-delete-token,x-copa-consent-version",
    };
    if(request.method()==="OPTIONS"){
      await route.fulfill({status:204,headers:corsHeaders,body:""});
      return;
    }
    if(request.method()==="DELETE"){
      await route.fulfill({status:200,headers:corsHeaders,contentType:"application/json",body:JSON.stringify({ok:true,deleted:1})});
      return;
    }
    if(request.url().endsWith("/report")){
      await route.fulfill({status:201,headers:corsHeaders,contentType:"application/json",body:JSON.stringify({ok:true,report_id:"R-TEST"})});
      return;
    }
    await route.fulfill({status:204,headers:corsHeaders,body:""});
  });

  await page.goto("/?ghost-privacy-regression=1",{waitUntil:"domcontentloaded"});
  await page.evaluate(()=>{
    const api=document.querySelector("meta[name='copa-ghost-api']") as HTMLMetaElement|null;
    if(api)api.content=location.origin;
    const slot=document.getElementById("advancedGhostSettingSlot");
    if(slot){slot.className="";document.body.appendChild(slot);}
    (globalThis as any).GhostClubs.ensureSetting();
  });
  const toggle=page.locator("#ghostClubToggle");
  const shareToggle=page.locator("#ghostShareToggle");
  await expect(toggle).toHaveAttribute("aria-pressed","true");
  await expect(shareToggle).toHaveAttribute("aria-pressed","false");

  await shareToggle.click();
  const dialog=page.locator("#ghostConsentDialog");
  const accept=dialog.locator("[data-ghost-accept]");
  await expect(dialog).toBeVisible();
  await expect(accept).toBeDisabled();
  await dialog.locator("[data-ghost-terms]").check();
  await expect(accept).toBeDisabled();
  await dialog.locator("[data-ghost-sharing]").check();
  await expect(accept).toBeEnabled();
  await accept.click();
  await expect(dialog).toHaveCount(0);
  await expect(toggle).toHaveAttribute("aria-pressed","true");
  await expect(shareToggle).toHaveAttribute("aria-pressed","true");

  const consent=await page.evaluate(()=>JSON.parse(localStorage.getItem("copa_ghost_consent_v1")||"null"));
  expect(consent).toMatchObject({version:"ghost-terms-v1",terms:true,sharing:true});

  const report=await page.evaluate(async()=>{
    const ghosts=(globalThis as any).GhostClubs;
    const first=await ghosts.reportGhost("G-REPORT123","trademark");
    if(!first.pending)return first;
    const retry=await ghosts.flushReports();
    return{ok:true,hidden:true,pending:retry.pending>0,sent:first.sent+retry.sent};
  });
  expect(report).toEqual({ok:true,hidden:true,pending:false,sent:1});
  expect(await page.evaluate(()=>(globalThis as any).GhostClubs.blockedIds())).toContain("G-REPORT123");
  await expect.poll(()=>requests.find(request=>request.url.endsWith("/v1/ghosts/G-REPORT123/report"))).toBeTruthy();
  const reportRequest=requests.find(request=>request.url.endsWith("/v1/ghosts/G-REPORT123/report"));
  expect(reportRequest?.method).toBe("POST");
  expect(JSON.parse(reportRequest?.body||"{}")).toEqual({reason:"trademark"});

  const deletion=await page.evaluate(()=>(globalThis as any).GhostClubs.deleteMyData());
  expect(deletion).toEqual({ok:true,deleted:1});
  await expect(toggle).toHaveAttribute("aria-pressed","true");
  const local=await page.evaluate(()=>Object.fromEntries([
    "copa_ghost_consent_v1",
    "copa_ghost_sharing_enabled",
    "copa_ghost_client_id_v1",
    "copa_ghost_delete_token_v1",
    "copa_ghost_upload_queue_v1",
    "copa_ghost_report_queue_v1",
    "copa_ghost_current_run_v1",
  ].map(key=>[key,localStorage.getItem(key)])));
  expect(Object.values(local)).toEqual(Array(7).fill(null));
  await expect(toggle).toHaveAttribute("aria-pressed","true");
  await expect(shareToggle).toHaveAttribute("aria-pressed","false");
  expect(await page.evaluate(()=>(globalThis as any).GhostClubs.blockedIds())).toEqual(["G-REPORT123"]);
  await expect.poll(()=>requests.find(request=>request.method==="DELETE")).toBeTruthy();
  const deleteRequest=requests.find(request=>request.method==="DELETE");
  expect(deleteRequest?.headers["x-copa-client"]).toMatch(/^GCL-[A-Z0-9]{8,40}$/);
  expect(deleteRequest?.headers["x-copa-delete-token"]).toMatch(/^GDT-[A-Z0-9]{16,80}$/);
});
