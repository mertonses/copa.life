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
      "access-control-allow-headers":"content-type,x-copa-client,x-copa-delete-token,x-copa-consent-version,x-copa-leaderboard-consent-version",
    };
    if(request.method()==="OPTIONS"){
      await route.fulfill({status:204,headers:corsHeaders,body:""});
      return;
    }
    if(request.method()==="DELETE"){
      await route.fulfill({status:200,headers:corsHeaders,contentType:"application/json",body:JSON.stringify({ok:true,deleted:1})});
      return;
    }
    if(request.method()==="GET"&&request.url().includes("/v1/leaderboard/me")){
      const profile={rank:7,public_club_id:"C-TEST123456",club_name:"Test Athletic",country:"TR",career_level:4,lifetime_reputation:420,season_score:188,total_runs:9,total_champions:1,total_finals:2};
      await route.fulfill({status:200,headers:corsHeaders,contentType:"application/json",body:JSON.stringify({season:"2026-07",profile,nearby:[profile]})});
      return;
    }
    if(request.method()==="GET"&&request.url().includes("/v1/leaderboard")){
      await route.fulfill({status:200,headers:corsHeaders,contentType:"application/json",body:JSON.stringify({season:"2026-07",clubs:[{rank:1,public_club_id:"C-WORLD1234",club_name:"World Athletic",country:"JP",career_level:8,lifetime_reputation:980,season_score:620,total_runs:18,total_champions:3,total_finals:5}]})});
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
  const leaderboardToggle=page.locator("#leaderboardToggle");
  await expect(toggle).toHaveAttribute("aria-pressed","true");
  await expect(shareToggle).toHaveAttribute("aria-pressed","false");
  await expect(leaderboardToggle).toHaveAttribute("aria-pressed","false");

  // This API-focused setup detaches the Ghost slot from the real settings
  // panel, so bypass the mobile intro dock's unrelated hit-test layer.
  await shareToggle.evaluate((button:HTMLButtonElement)=>button.click());
  const dialog=page.locator("#ghostConsentDialog");
  const accept=dialog.locator("[data-ghost-accept]");
  await expect(dialog).toBeVisible();
  await expect(dialog.locator("input[type=checkbox]")).toHaveCount(0);
  await expect(dialog.locator(".ghost-consent-confirm")).toContainText(/“(?:KABUL ET VE PAYLAŞ|ACCEPT AND SHARE)”/);
  await expect(dialog.locator(".ghost-consent-links a")).toHaveCount(2);
  await expect(accept).toBeEnabled();
  await accept.click();
  await expect(dialog).toHaveCount(0);
  await expect(toggle).toHaveAttribute("aria-pressed","true");
  await expect(shareToggle).toHaveAttribute("aria-pressed","true");
  await expect(page.locator("#ghostShareSettingCopy")).toHaveText("Your club joins the Ghost pool at the end of the run.");

  const consent=await page.evaluate(()=>JSON.parse(localStorage.getItem("copa_ghost_consent_v1")||"null"));
  expect(consent).toMatchObject({version:"ghost-terms-v1",terms:true,sharing:true,action:"accept_and_share"});

  await leaderboardToggle.evaluate((button:HTMLButtonElement)=>button.click());
  const leaderboardDialog=page.locator("#leaderboardConsentDialog");
  await expect(leaderboardDialog).toBeVisible();
  await leaderboardDialog.locator("[data-lb-accept]").click();
  await expect(leaderboardToggle).toHaveAttribute("aria-pressed","true");
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem("copa_leaderboard_consent_v1")||"null"))).toMatchObject({version:"leaderboard-terms-v1",terms:true,public_profile:true});
  await page.evaluate(async()=>{const w=globalThis as any;await w.CopaLazy.ensureMetaProgression();w.CopaMeta.openProgression("world");});
  await expect(page.locator(".world-rank-row")).toHaveCount(2);
  await expect(page.locator("#metaWorldPanel")).toContainText("World Athletic");
  await expect(page.locator("#metaWorldPanel")).toContainText("Test Athletic");
  await page.evaluate(()=>{(globalThis as any).closeModal();});

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
    "copa_leaderboard_consent_v1",
    "copa_leaderboard_enabled",
    "copa_leaderboard_queue_v1",
    "copa_online_features_onboarding_v1",
  ].map(key=>[key,localStorage.getItem(key)])));
  expect(Object.values(local)).toEqual(Array(11).fill(null));
  await expect(toggle).toHaveAttribute("aria-pressed","true");
  await expect(shareToggle).toHaveAttribute("aria-pressed","false");
  await expect(page.locator("#ghostShareSettingCopy")).toHaveText("Your club does not join the Ghost pool at the end of the run.");
  expect(await page.evaluate(()=>(globalThis as any).GhostClubs.blockedIds())).toEqual(["G-REPORT123"]);
  await expect.poll(()=>requests.find(request=>request.method==="DELETE")).toBeTruthy();
  const deleteRequest=requests.find(request=>request.method==="DELETE");
  expect(deleteRequest?.headers["x-copa-client"]).toMatch(/^GCL-[A-Z0-9]{8,40}$/);
  expect(deleteRequest?.headers["x-copa-delete-token"]).toMatch(/^GDT-[A-Z0-9]{16,80}$/);
});

test("native first run offers one-screen online choices and a one-tap all-features consent",async({page})=>{
  await page.addInitScript(()=>{
    for(const key of Object.keys(localStorage))if(key.startsWith("copa_ghost_")||key.startsWith("copa_leaderboard_")||key==="copa_online_features_onboarding_v1")localStorage.removeItem(key);
  });
  await page.goto("/?native-online-onboarding=1",{waitUntil:"domcontentloaded"});
  await page.evaluate(()=>{(globalThis as any).COPA_PLATFORM="android";(globalThis as any).COPA_IS_NATIVE=true;});
  expect(await page.evaluate(()=>(globalThis as any).COPA_IS_NATIVE)).toBe(true);
  expect(await page.evaluate(()=>(globalThis as any).GhostClubs.shouldGateMobileOnboarding())).toBe(true);

  await page.evaluate(()=>(globalThis as any).normalStart());
  const dialog=page.locator("#onlineFeaturesOnboarding");
  await expect(dialog).toBeVisible();
  await expect(dialog.locator(".online-onboarding-options input")).toHaveCount(3);
  await expect(dialog.locator(".ghost-consent-links a")).toHaveCount(2);
  await expect(dialog.locator("[data-online-all]")).toContainText(/TÜMÜNÜ AÇ VE KABUL ET|ENABLE ALL AND ACCEPT/);
  await dialog.locator("[data-online-all]").click();
  await expect(dialog).toHaveCount(0);

  const state=await page.evaluate(()=>({
    gate:(globalThis as any).GhostClubs.shouldGateMobileOnboarding(),
    matching:(globalThis as any).GhostClubs.enabled(),
    sharing:(globalThis as any).GhostClubs.sharingEnabled(),
    ranking:(globalThis as any).GhostClubs.leaderboardEnabled(),
    onboarding:JSON.parse(localStorage.getItem("copa_online_features_onboarding_v1")||"null"),
  }));
  expect(state).toMatchObject({gate:false,matching:true,sharing:true,ranking:true,onboarding:{version:"online-features-v1",terms:true,matching:true,sharing:true,leaderboard:true,action:"enable_all"}});
  await expect(page.locator("#modal")).toBeVisible();
  await expect(page.locator("#modal .stylelist")).toBeVisible();
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
  await expect(body.locator(".advanced-section")).toHaveCount(4);
  await expect(body.locator(".advanced-section-title")).toHaveText(["RUN AYARLARI","KAYIT AKTARIMI","GHOST CLUB","VERİ VE GİZLİLİK"]);
  const ghostHelp=page.locator(".advanced-help");
  const ghostHelpToggle=ghostHelp.locator("summary");
  await expect(ghostHelpToggle).toHaveText("?");
  await expect(ghostHelpToggle).toHaveAttribute("aria-label","Ghost Club nedir?");
  await expect(page.locator("#ghostHelpCopy")).toBeHidden();
  await ghostHelpToggle.click();
  await expect(page.locator("#ghostHelpCopy")).toBeVisible();
  await expect(page.locator("#ghostHelpCopy")).toHaveText("Ghost Club, gerçek oyuncuların tamamladığı run'lardan oluşan rakip havuzudur. Rakip, paylaşım ve Dünya sıralaması birbirinden bağımsızdır; yalnız açtığın özellik veri gönderir.");
  await ghostHelpToggle.click();
  await expect(page.locator("#seedInput")).toHaveValue("");
  await expect(page.locator("#seedInput")).toHaveAttribute("placeholder","Rastgele oluşturulur");
  await expect(page.locator(".seed-hint")).toHaveText("Aynı seed, aynı başlangıç koşullarını yeniden üretir.");

  await page.locator("#seedRandomBtn").click();
  await expect(page.locator("#seedInput")).toHaveValue(/^\d{5}$/);
  await page.locator("#seedPasteBtn").click();
  await expect(page.locator("#seedInput")).toHaveValue("24680");

  await expect(page.locator("#ghostClubSetting .ghost-setting-option")).toHaveCount(3);
  expect(await page.locator("#ghostClubSetting .ghost-setting-option").first().locator(":scope > *").evaluateAll(nodes=>nodes.map(node=>node.id))).toEqual(["ghostClubSettingHdr","ghostClubToggle","ghostClubSettingCopy"]);
  await expect(page.locator("#ghostClubSettingHdr")).toHaveText("GHOST RAKİPLER");
  await expect(page.locator("#ghostClubSettingCopy")).toHaveText("Bu run uygun bir Ghost rakiple eşleşilebilir.");
  await expect(page.locator("#ghostShareSettingCopy")).toHaveText("Kulübün run sonunda Ghost havuzuna katılmaz.");
  await expect(page.locator("#leaderboardSettingCopy")).toHaveText("Kulüp profilin yayınlanmaz ve koşuların sıralamaya gönderilmez.");
  await page.locator("#ghostClubToggle").click();
  await expect(page.locator("#ghostClubToggle")).toHaveAttribute("aria-pressed","false");
  await expect(page.locator("#ghostClubSettingCopy")).toHaveText("Bu run uygun bir Ghost rakiple eşleşemez.");
  await expect(page.locator("#ghostShareSettingCopy")).toHaveText("Kulübün run sonunda Ghost havuzuna katılmaz.");

  const privacy=page.locator("#advancedPrivacySlot #ghostSettingPrivacy");
  await expect(privacy).toBeVisible();
  await expect(privacy.locator("a")).toHaveText(["Gizlilik","Şartlar"]);
  await expect(privacy.locator("[data-ghost-delete]")).toHaveText("Çevrimiçi verilerimi sil");
  await expect(page.locator("#advancedGhostSettingSlot .ghost-setting-privacy")).toHaveCount(0);

  const layout=await page.evaluate(()=>{
    const tools=[...document.querySelectorAll(".advanced-run-tools button")].map(node=>(node as HTMLElement).getBoundingClientRect());
    const advanced=document.querySelector(".advanced-body") as HTMLElement;
    const ghostOptions=[...document.querySelectorAll(".ghost-setting-option")].map(node=>(node as HTMLElement).getBoundingClientRect());
    const ghostToggles=[...document.querySelectorAll(".ghost-setting-toggle")].map(node=>(node as HTMLElement).getBoundingClientRect());
    const ghostSlot=document.getElementById("advancedGhostSettingSlot")!;
    return{
      sameRow:Math.abs(tools[0].top-tools[1].top)<=1,
      equalWidth:Math.abs(tools[0].width-tools[1].width)<=1,
      overflow:advanced.scrollWidth-advanced.clientWidth,
      ghostRowsStacked:ghostOptions[1].top>=ghostOptions[0].bottom-1,
      compactGhostToggles:ghostToggles.every((toggle,index)=>toggle.width<ghostOptions[index].width*.45),
      ghostSlotBorder:getComputedStyle(ghostSlot).borderTopWidth,
    };
  });
  expect(layout.overflow).toBeLessThanOrEqual(1);
  expect(layout.equalWidth).toBe(true);
  expect(layout.sameRow).toBe(!testInfo.project.name.includes("mobile"));
  expect(layout.ghostRowsStacked).toBe(true);
  expect(layout.compactGhostToggles).toBe(true);
  expect(layout.ghostSlotBorder).toBe("0px");

  await page.evaluate(()=>(globalThis as any).setLang("en"));
  await expect(page.locator(".advanced-section-title")).toHaveText(["RUN SETTINGS","SAVE TRANSFER","GHOST CLUB","DATA & PRIVACY"]);
  await expect(page.locator("#seedInput")).toHaveAttribute("placeholder","Generated randomly");
  await expect(privacy.locator("a")).toHaveText(["Privacy","Terms"]);
});
