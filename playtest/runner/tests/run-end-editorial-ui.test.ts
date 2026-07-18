import { test, expect, type Page } from "@playwright/test";

test.use({serviceWorkers:"block"});

async function finishRun(page:Page,options:{ghost?:boolean;zeroEconomy?:boolean;path?:string}={}){
  if(options.ghost){
    await page.addInitScript(()=>{
      localStorage.setItem("copa_ghost_consent_v1",JSON.stringify({
        version:"ghost-terms-v1",terms:true,sharing:true,accepted_at:Date.now()
      }));
      localStorage.setItem("copa_ghost_sharing_enabled","1");
      localStorage.removeItem("copa.ghost.result.notice.v1");
    });
    await page.route("**/v1/ghosts",route=>route.fulfill({
      status:201,
      headers:{"access-control-allow-origin":"*"},
      contentType:"application/json",
      body:JSON.stringify({ok:true,public_ghost_id:"G-TESTGHOST",eligible_until:new Date(Date.now()+86400000).toISOString()})
    }));
  }
  await page.goto(options.path||"/?run-end-editorial=1",{waitUntil:"domcontentloaded"});
  await page.evaluate(()=>{
    const game=globalThis as any;
    game.setLang("tr");
    game.quickStart();
    game.quickAll();
  });
  await page.locator("#postClubName").fill("Editorial XI");
  await page.evaluate(({zeroEconomy})=>{
    const game=globalThis as any;
    game.pcGo();
    game.setCaptain(0);
    game.closeModal();
    const scorer=game.picksBySlot.find((player:any)=>player)?.name?.split(" ").pop()||"Duarte";
    const opponents=["United Vale","Oxford United","Racing Norte","Berlin 04"];
    const results=[["W",2,0],["W",2,1],["W",1,0],["L",1,2]];
    results.forEach((entry,index)=>{
      const fixture=game.fixtures[index];
      fixture.res=entry[0];
      fixture.gf=entry[1];
      fixture.ga=entry[2];
      fixture.opp=opponents[index];
      fixture.events=index===3
        ?[{m:85,home:false,type:"goal",name:"Duarte"}]
        :[{m:52,home:true,type:"goal",name:scorer}];
    });
    game.round=4;
    game.budget=zeroEconomy?0:8;
    game.cards=zeroEconomy?[]:["taraftar"];
    game.benchUsed=0;
    game.econStats=zeroEconomy
      ?{earned:0,spent:0,president:0,injuries:0,worstDebt:0,finalDebt:0}
      :{earned:18,spent:50,president:0,injuries:0,worstDebt:-7,finalDebt:0};
    game.endRun(false);
  },{zeroEconomy:!!options.zeroEconomy});
  await expect(page.locator("#result")).toBeVisible();
}

test("completed shared run becomes a Ghost Club continuity moment and nests share tools",async({page})=>{
  await finishRun(page,{ghost:true});
  const shell=page.locator(".ghost-run-shell");
  await expect(shell).toBeVisible();
  await expect(shell.locator("h2")).toHaveText("HAYALET KULÜBÜN HAZIR");
  await expect(shell).toContainText("başka oyuncuların karşısına çıkabilir");
  await expect(shell.locator(".ghost-run-status")).toHaveText("HAVUZDA");
  await expect(shell.locator(".ghost-run-fact")).toHaveCount(4);
  await expect(shell).toContainText("EDITORIAL XI");
  await expect(shell.locator(".ghost-run-seed-row code")).toHaveText(/^#\d{4,5}$/);
  await expect(shell).not.toContainText("PNG");
  await expect(shell.locator("[data-ghost-restart]")).toHaveText("YENİ RUN BAŞLAT");

  await shell.locator("[data-ghost-seed]").click();
  await expect(shell.locator("[data-ghost-seed]")).toHaveText("SEED KOPYALANDI");
  await shell.locator("[data-ghost-share]").click();
  await expect(page.locator(".share-modal")).toBeVisible();
  await expect(page.locator(".share-actions")).toContainText("PNG İndir");

  await page.evaluate(()=>{
    (globalThis as any).closeModal();
    (globalThis as any).showGhostRunResultOnce();
  });
  await page.waitForTimeout(250);
  await expect(page.locator(".ghost-run-shell")).toHaveCount(0);
});

test("completed unshared run shows a truthful Ghost offer and becomes ready after explicit consent",async({page})=>{
  await page.route("**/v1/ghosts",route=>route.fulfill({
    status:201,
    headers:{"access-control-allow-origin":"*"},
    contentType:"application/json",
    body:JSON.stringify({ok:true,public_ghost_id:"G-CONSENTED",eligible_until:new Date(Date.now()+86400000).toISOString()})
  }));
  await finishRun(page);
  const shell=page.locator(".ghost-run-shell");
  await expect(shell).toBeVisible();
  await expect(shell.locator("h2")).toHaveText("RUN YAŞAMAYA DEVAM EDEBİLİR");
  await expect(shell.locator(".ghost-run-status")).toHaveText("HENÜZ HAVUZDA DEĞİL");
  await expect(shell).toContainText("iznin olmadan oyun verisi yüklenmez");
  await shell.locator("[data-ghost-enable]").click();
  const consent=page.locator("#ghostConsentDialog");
  await expect(consent).toBeVisible();
  await consent.locator("[data-ghost-terms]").check();
  await consent.locator("[data-ghost-sharing]").check();
  await consent.locator("[data-ghost-accept]").click();
  await expect(page.locator(".ghost-run-shell h2")).toHaveText("HAYALET KULÜBÜN HAZIR");
  await expect(page.locator(".ghost-run-status")).toHaveText("HAVUZDA");
  expect(await page.evaluate(()=>(globalThis as any).GhostClubs.sharingEnabled())).toBe(true);
});

test("season story keeps four meaningful chronological beats and economy hides zero rows",async({page})=>{
  await finishRun(page);
  const story=page.locator("#rStory");
  await expect(story.locator(".storyevent")).toHaveCount(4);
  await expect(story).toContainText("85. dakikadaki Duarte golü");
  await expect(story.locator(".storyevent").last()).toContainText("Berlin 04");
  await expect(story).not.toContainText("Kupa yolu");
  const economy=page.locator("#econTile");
  await expect(economy).toContainText("Transfer ve kart harcamaları");
  await expect(economy).not.toContainText("Başkan maliyeti");
  await expect(economy).not.toContainText("Sakatlık / yedek");
  await expect(economy).not.toContainText("Son maç güç kaybı");
  await expect(story.locator(".narrative-entity")).not.toHaveCount(0);
  await expect(story.locator(".narrative-number.neg")).not.toHaveCount(0);
  await expect(economy.locator(".narrative-number")).not.toHaveCount(0);
  const contrast=await page.evaluate(()=>{
    const root=document.documentElement;
    const entity=document.querySelector("#rStory .narrative-entity") as HTMLElement;
    const score=(color:string)=>{const values=(color.match(/\d+(?:\.\d+)?/g)||[]).slice(0,3).map(Number);return values.reduce((sum,value)=>sum+value,0);};
    root.dataset.theme="dark";
    const dark=getComputedStyle(entity);
    const darkValues={background:score(dark.backgroundColor),foreground:score(dark.color)};
    root.dataset.theme="light";
    const light=getComputedStyle(entity);
    return{dark:darkValues,light:{background:score(light.backgroundColor),foreground:score(light.color)}};
  });
  expect(contrast.dark.background).toBeGreaterThan(contrast.dark.foreground);
  expect(contrast.light.background).toBeLessThan(contrast.light.foreground);

  await page.evaluate(()=>(globalThis as any).restart());
  await finishRun(page,{zeroEconomy:true});
  const zeroEconomy=page.locator("#econTile");
  await expect(zeroEconomy).not.toContainText("Kazanılan");
  await expect(zeroEconomy).not.toContainText("Harcanan");
  await expect(zeroEconomy).not.toContainText("Başkan maliyeti");
  await expect(zeroEconomy).not.toContainText("En düşük kasa");
});

test("landing hero places the guide left of the tactical board and keeps the timeline aligned",async({page},testInfo)=>{
  await page.goto("/?editorial-hero=1",{waitUntil:"domcontentloaded"});
  await page.evaluate(()=>(globalThis as any).setLang("tr"));
  await expect(page.locator(".v7-hero-desc")).toHaveText("Her seçiminle yeni bir futbol hikâyesi yaz.");
  await expect(page.locator(".hero-die-icon")).toHaveCount(0);
  await expect(page.locator("#howtoPrompt")).toHaveCount(0);
  await expect(page.locator(".tactical-board")).toBeVisible();
  await expect(page.locator(".v7-hero-side > #howtoWrap #howtoToggle")).toBeVisible();
  await expect(page.locator(".tactical-board #howtoToggle")).toHaveCount(0);
  await expect(page.locator("#mechSection .mstep")).toHaveCount(4);
  await expect(page.locator("#mechSection .mn")).toHaveText(["1","2","3","4"]);
  await expect(page.locator("#mechSection .mt small")).toHaveCount(4);
  const layout=await page.evaluate(()=>{
    const steps=Array.from(document.querySelectorAll("#mechSection .mstep")).map(node=>(node as HTMLElement).getBoundingClientRect());
    const numbers=Array.from(document.querySelectorAll("#mechSection .mn")).map(node=>{
      const element=node as HTMLElement;
      const rect=element.getBoundingClientRect();
      return{
        scrollWidth:element.scrollWidth,
        clientWidth:element.clientWidth,
        scrollHeight:element.scrollHeight,
        clientHeight:element.clientHeight,
        alignItems:getComputedStyle(element).alignItems,
        justifyContent:getComputedStyle(element).justifyContent,
      };
    });
    const board=(document.querySelector(".tactical-board") as HTMLElement).getBoundingClientRect();
    const guide=(document.getElementById("howtoToggle") as HTMLElement).getBoundingClientRect();
    const layer=getComputedStyle(document.getElementById("introLand")!,"::before");
    const connector=document.querySelector("#mechSection .mstep") as HTMLElement;
    const connectorLine=getComputedStyle(connector,"::after");
    const connectorHead=getComputedStyle(connector,"::before");
    const connectorCenterDelta=Math.abs(
      (Number.parseFloat(connectorLine.top)+Number.parseFloat(connectorLine.height)/2)
      -(Number.parseFloat(connectorHead.top)+Number.parseFloat(connectorHead.height)/2)
    );
    return{
      uniqueTops:new Set(steps.map(rect=>Math.round(rect.top))).size,
      overflow:document.getElementById("introLand")!.scrollWidth-document.getElementById("introLand")!.clientWidth,
      opacity:Number(layer.opacity),
      numbers,
      boardWidth:board.width,
      guideLeftOutside:guide.right<=board.left-6,
      guideCenterDelta:Math.abs((guide.top+guide.bottom)/2-(board.top+board.bottom)/2),
      connectorCenterDelta,
    };
  });
  expect(layout.overflow).toBeLessThanOrEqual(1);
  expect(layout.opacity).toBeGreaterThanOrEqual(.03);
  expect(layout.opacity).toBeLessThanOrEqual(.05);
  expect(layout.uniqueTops).toBe(testInfo.project.name.includes("mobile")?4:1);
  expect(layout.numbers.every(item=>item.scrollWidth<=item.clientWidth&&item.scrollHeight<=item.clientHeight)).toBe(true);
  expect(layout.numbers.every(item=>item.alignItems==="center"&&item.justifyContent==="center")).toBe(true);
  expect(layout.guideLeftOutside).toBe(true);
  expect(layout.guideCenterDelta).toBeLessThanOrEqual(3);
  if(!testInfo.project.name.includes("mobile"))expect(layout.connectorCenterDelta).toBeLessThanOrEqual(.1);
  expect(layout.boardWidth).toBeGreaterThanOrEqual(testInfo.project.name.includes("mobile")?160:230);

  await page.evaluate(()=>(globalThis as any).setLang("de"));
  await expect(page.locator(".v7-hero-desc")).toHaveText("Schreibe mit jeder Entscheidung eine neue Fußballgeschichte.");
  await expect(page.locator(".hero-die-icon")).toHaveCount(0);
  await expect(page.locator("#howtoPrompt")).toHaveCount(0);
  await expect(page.locator("#mechSection .mt").first()).toContainText("Formation & Präsident");
});

test("obsolete same-setup restart is absent from UI and runtime",async({page})=>{
  await finishRun(page);
  await expect(page.locator("#quickBtn")).toHaveCount(0);
  await expect(page.getByText(/Aynı ayarla yeniden|Replay same setup/i)).toHaveCount(0);
  expect(await page.evaluate(()=>typeof (globalThis as any).quickRestart)).toBe("undefined");
});

test("native Android and iOS packages keep the Ghost sheet safe-area layout",async({page},testInfo)=>{
  const isAndroid=testInfo.project.name==="mobile-chromium";
  const isIos=testInfo.project.name==="webkit-mobile";
  test.skip(!isAndroid&&!isIos,"native mobile contract");
  await finishRun(page,{
    ghost:true,
    path:isIos?"/dist-ios/index.html?ghost-result-native=ios":"/dist-android/index.html?ghost-result-native=android",
  });
  const shell=page.locator(".ghost-run-shell");
  await expect(shell).toBeVisible();
  await expect(shell.locator("h2")).toHaveText("HAYALET KULÜBÜN HAZIR");
  await expect(page.locator("#quickBtn")).toHaveCount(0);
  const layout=await shell.evaluate(element=>({
    overflow:element.scrollWidth-element.clientWidth,
    bottomPadding:getComputedStyle(element.querySelector(".ghost-run-actions")!).paddingBottom,
  }));
  expect(layout.overflow).toBeLessThanOrEqual(1);
  expect(Number.parseFloat(layout.bottomPadding)).toBeGreaterThanOrEqual(14);
  expect(await page.evaluate(()=>(globalThis as any).COPA_PLATFORM)).toBe(isIos?"ios":"android");
});
