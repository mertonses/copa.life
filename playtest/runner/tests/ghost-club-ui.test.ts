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
  await page.evaluate(async()=>{
    const api=document.querySelector("meta[name='copa-ghost-api']") as HTMLMetaElement|null;
    if(api)api.content=location.origin;
    const advanced=await (globalThis as any).CopaLazy.ensureAdvancedSettings();
    advanced.ensureMarkup(document.querySelector(".advanced-body"));
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

test("advanced settings are grouped by task without changing seed or Ghost behavior",async({page},testInfo)=>{
  await page.addInitScript(()=>{
    Object.defineProperty(navigator,"clipboard",{configurable:true,value:{readText:async()=>" 24680 "}});
  });
  await page.goto("/?advanced-settings-ui=1",{waitUntil:"domcontentloaded"});
  await page.evaluate(()=>(globalThis as any).setLang("tr"));
  await page.locator("#advancedToggle").click();

  const body=page.locator(".advanced-body");
  await expect(body).toBeVisible();
  await expect(body.locator(".advanced-section")).toHaveCount(3);
  await expect(body.locator(".advanced-section-title")).toHaveText(["RUN AYARLARI","GHOST CLUB","VERİ VE GİZLİLİK"]);
  await expect(page.locator("#seedInput")).toHaveValue("");
  await expect(page.locator("#seedInput")).toHaveAttribute("placeholder","Rastgele oluşturulur");
  await expect(page.locator(".seed-hint")).toHaveText("Aynı seed, aynı başlangıç koşullarını yeniden üretir.");

  await page.locator("#seedRandomBtn").click();
  await expect(page.locator("#seedInput")).toHaveValue(/^\d{5}$/);
  await page.locator("#seedPasteBtn").click();
  await expect(page.locator("#seedInput")).toHaveValue("24680");

  await expect(page.locator("#ghostClubSetting .ghost-setting-option")).toHaveCount(2);
  expect(await page.locator("#ghostClubSetting .ghost-setting-option").first().locator(":scope > *").evaluateAll(nodes=>nodes.map(node=>node.id))).toEqual(["ghostClubSettingHdr","ghostClubToggle","ghostClubSettingCopy"]);
  await expect(page.locator("#ghostClubSettingCopy")).toHaveText("Bu run uygun bir Ghost rakiple eşleşebilir.");
  await page.locator("#ghostClubToggle").click();
  await expect(page.locator("#ghostClubToggle")).toHaveAttribute("aria-pressed","false");
  await expect(page.locator("#ghostClubSettingCopy")).toHaveText("Bu run yalnızca standart rakipleri kullanır.");
  await expect(page.locator("#ghostShareSettingCopy")).toHaveText("Tamamlanan kulübün Ghost havuzuna gönderilmiyor.");

  const privacy=page.locator("#advancedPrivacySlot #ghostSettingPrivacy");
  await expect(privacy).toBeVisible();
  await expect(privacy.locator("a")).toHaveText(["Gizlilik","Şartlar"]);
  await expect(privacy.locator("[data-ghost-delete]")).toHaveText("Verilerimi sil");
  await expect(page.locator("#advancedGhostSettingSlot .ghost-setting-privacy")).toHaveCount(0);

  const layout=await page.evaluate(()=>{
    const tools=[...document.querySelectorAll(".advanced-run-tools button")].map(node=>(node as HTMLElement).getBoundingClientRect());
    const advanced=document.querySelector(".advanced-body") as HTMLElement;
    return{
      sameRow:Math.abs(tools[0].top-tools[1].top)<=1,
      equalWidth:Math.abs(tools[0].width-tools[1].width)<=1,
      overflow:advanced.scrollWidth-advanced.clientWidth,
    };
  });
  expect(layout.overflow).toBeLessThanOrEqual(1);
  expect(layout.equalWidth).toBe(true);
  expect(layout.sameRow).toBe(!testInfo.project.name.includes("mobile"));

  await page.evaluate(()=>(globalThis as any).setLang("en"));
  await expect(page.locator(".advanced-section-title")).toHaveText(["RUN SETTINGS","GHOST CLUB","DATA & PRIVACY"]);
  await expect(page.locator("#seedInput")).toHaveAttribute("placeholder","Generated randomly");
  await expect(privacy.locator("a")).toHaveText(["Privacy","Terms"]);
});
