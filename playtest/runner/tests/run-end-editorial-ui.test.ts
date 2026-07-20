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
  await page.evaluate(async()=>{
    const game=globalThis as any;
    game.setLang("tr");
    game.quickStart();
    await game.quickAll();
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

test("completed shared run becomes a Ghost Club continuity moment and nests share tools",async({page},testInfo)=>{
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
  if(testInfo.project.name.includes("mobile")){
    const viewport=page.viewportSize()!;
    const modalSize=await shell.evaluate(element=>{
      const rect=element.getBoundingClientRect();
      return{width:rect.width,height:rect.height};
    });
    expect(modalSize.width).toBeGreaterThanOrEqual(viewport.width-14);
    expect(modalSize.width).toBeLessThan(viewport.width);
    expect(modalSize.height).toBeLessThanOrEqual(Math.min(viewport.height*.9,740)+1);
  }

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
  await expect(consent.locator("input[type=checkbox]")).toHaveCount(0);
  await expect(consent.locator(".ghost-consent-confirm")).toContainText("İznini ayarlardan dilediğin zaman geri çekebilirsin");
  await expect(consent.locator("[data-ghost-accept]")).toBeEnabled();
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

test("landing hero keeps desktop tactics and persistent header actions",async({page},testInfo)=>{
  await page.goto("/?editorial-hero=1",{waitUntil:"domcontentloaded"});
  await page.evaluate(()=>(globalThis as any).setLang("tr"));
  const isMobile=testInfo.project.name.includes("mobile");
  await expect(page.locator(".v7-hero-desc")).toHaveText("Her seçiminle yeni bir futbol hikâyesi yaz.");
  await expect(page.locator(".hero-die-icon")).toHaveCount(0);
  await expect(page.locator("#howtoPrompt")).toHaveCount(0);
  if(isMobile)await expect(page.locator(".tactical-board")).toBeHidden();
  else await expect(page.locator(".tactical-board")).toBeVisible();
  await expect(page.locator(".tactical-board .tactical-player")).toHaveCount(5);
  await expect(page.locator(".tactical-board .tactical-ball-carrier")).toHaveCount(1);
  await expect(page.locator(".tactical-board .tactical-final-arrow")).toHaveCount(1);
  await expect(page.locator(".tactical-board .tactical-penalty-area")).toHaveCount(2);
  await expect(page.locator(".tactical-board .tactical-goal-area")).toHaveCount(2);
  await expect(page.locator(".tactical-board svg gradient,.tactical-board svg filter")).toHaveCount(0);
  await expect(page.locator(".tools > #howtoWrap #howtoToggle")).toBeVisible();
  await expect(page.locator("#howtoToggle")).toContainText("COPA REHBERİ");
  await expect(page.locator(".v7-hero-side #howtoToggle")).toHaveCount(0);
  await expect(page.locator(".tactical-board #howtoToggle")).toHaveCount(0);
  await expect(page.locator("#settingsBtn")).toBeVisible();
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
    const boardElement=document.querySelector(".tactical-board") as HTMLElement;
    const board=boardElement.getBoundingClientRect();
    const diagram=document.querySelector(".tactical-diagram") as SVGElement;
    const secondaryLink=getComputedStyle(document.querySelector(".tactical-link-secondary") as SVGElement);
    const pitchDetail=getComputedStyle(document.querySelector(".tactical-pitch-detail") as SVGElement);
    const route=getComputedStyle(document.querySelector(".tactical-links") as SVGElement);
    const player=getComputedStyle(document.querySelector(".tactical-player") as SVGElement);
    const guide=(document.getElementById("howtoToggle") as HTMLElement).getBoundingClientRect();
    const settings=(document.getElementById("settingsBtn") as HTMLElement).getBoundingClientRect();
    const layer=getComputedStyle(document.getElementById("introLand")!,"::before");
    const connector=document.querySelector("#mechSection .mstep") as HTMLElement;
    const connectorLine=getComputedStyle(connector,"::after");
    const connectorHead=getComputedStyle(connector,"::before");
    return{
      uniqueTops:new Set(steps.map(rect=>Math.round(rect.top))).size,
      overflow:document.getElementById("introLand")!.scrollWidth-document.getElementById("introLand")!.clientWidth,
      opacity:Number(layer.opacity),
      numbers,
      boardHidden:getComputedStyle(boardElement).display==="none",
      boardWidth:board.width,
      diagramRatio:diagram.getBoundingClientRect().width/diagram.getBoundingClientRect().height,
      mobileDetailHidden:secondaryLink.display==="none"&&pitchDetail.display==="none",
      routeAnimation:route.animationName,
      playerAnimation:player.animationName,
      guideSettingsGap:settings.left-guide.right,
      guideSettingsHeightDelta:Math.abs(guide.height-settings.height),
      guideSettingsWidthDelta:Math.abs(guide.width-settings.width),
      guideSettingsCenterDelta:Math.abs((guide.top+guide.height/2)-(settings.top+settings.height/2)),
      guideFontSize:Number.parseFloat(getComputedStyle(document.getElementById("howtoToggle")!).fontSize),
      connectorLineContent:connectorLine.content,
      connectorHeadContent:connectorHead.content,
      connectorLineDisplay:connectorLine.display,
      connectorHeadDisplay:connectorHead.display,
    };
  });
  expect(layout.overflow).toBeLessThanOrEqual(1);
  expect(layout.opacity).toBeGreaterThanOrEqual(.03);
  expect(layout.opacity).toBeLessThanOrEqual(.05);
  expect(layout.uniqueTops).toBe(isMobile?2:1);
  expect(layout.numbers.every(item=>item.scrollWidth<=item.clientWidth&&item.scrollHeight<=item.clientHeight)).toBe(true);
  expect(layout.numbers.every(item=>item.alignItems==="center"&&item.justifyContent==="center")).toBe(true);
  expect(layout.connectorLineContent==="none"||layout.connectorLineDisplay==="none").toBe(true);
  expect(layout.connectorHeadContent==="none"||layout.connectorHeadDisplay==="none").toBe(true);
  expect(layout.boardHidden).toBe(isMobile);
  expect(layout.guideSettingsGap).toBeGreaterThanOrEqual(0);
  expect(layout.guideSettingsGap).toBeLessThanOrEqual(8);
  expect(layout.guideSettingsHeightDelta).toBeLessThanOrEqual(1);
  expect(layout.guideSettingsCenterDelta).toBeLessThanOrEqual(1);
  if(isMobile){
    expect(layout.boardWidth).toBe(0);
    expect(layout.guideSettingsWidthDelta).toBeLessThanOrEqual(1);
    expect(layout.guideFontSize).toBe(0);
  }else{
    expect(layout.guideFontSize).toBeGreaterThan(0);
    expect(layout.routeAnimation).toContain("tacticalRouteFlow");
    expect(layout.playerAnimation).toContain("tacticalNodePulse");
    expect(layout.boardWidth).toBeGreaterThanOrEqual(230);
    expect(layout.diagramRatio).toBeCloseTo(238/138,1);
    expect(layout.mobileDetailHidden).toBe(false);
    const reducedAnimations=await page.evaluate(()=>{
      document.body.classList.add("reduced-motion");
      const values=[
        getComputedStyle(document.querySelector(".tactical-links") as SVGElement).animationName,
        getComputedStyle(document.querySelector(".tactical-player") as SVGElement).animationName,
      ];
      document.body.classList.remove("reduced-motion");
      return values;
    });
    expect(reducedAnimations).toEqual(["none","none"]);
  }

  await page.setViewportSize({width:isMobile?900:700,height:900});
  const collapsedGuide=await page.evaluate(()=>{
    const guide=document.getElementById("howtoToggle")!.getBoundingClientRect();
    const settings=document.getElementById("settingsBtn")!.getBoundingClientRect();
    return{
      fontSize:Number.parseFloat(getComputedStyle(document.getElementById("howtoToggle")!).fontSize),
      widthDelta:Math.abs(guide.width-settings.width),
    };
  });
  expect(collapsedGuide.fontSize).toBe(0);
  expect(collapsedGuide.widthDelta).toBeLessThanOrEqual(1);
  await expect(page.locator("#howtoToggle")).toHaveAttribute("aria-label","COPA REHBERİ");

  await page.evaluate(()=>(globalThis as any).setLang("de"));
  await expect(page.locator(".v7-hero-desc")).toHaveText("Schreibe mit jeder Entscheidung eine neue Fußballgeschichte.");
  await expect(page.locator(".hero-die-icon")).toHaveCount(0);
  await expect(page.locator("#howtoPrompt")).toHaveCount(0);
  await expect(page.locator("#mechSection .mt").first()).toContainText("Formation & Präsident");
  await expect(page.locator("#howtoToggle")).toContainText("COPA-GUIDE");
  await page.evaluate(()=>(globalThis as any).quickStart());
  await expect(page.locator("#draft")).toBeVisible();
  await expect(page.locator(".tools > #howtoWrap #howtoToggle")).toBeVisible();
});

test("chairman picker separates personality from mechanics and collapses safely on mobile",async({page},testInfo)=>{
  await page.goto("/?chair-picker-grid=1",{waitUntil:"domcontentloaded"});
  await page.evaluate(()=>{
    (globalThis as any).setLang("tr");
    (globalThis as any).unlockedChairs=["babacan","leydi","pinti","sansasyoncu","torpilci","cilgin"];
    (globalThis as any).showChairPopup("babacan");
  });

  const modal=page.locator(".chair-picker-modal");
  await expect(modal).toBeVisible();
  await expect(modal).toHaveAttribute("data-chair-id","babacan");
  await expect(modal.locator(".chairpopup-name")).toHaveText("Patron Başkan");
  await expect(modal.locator(".cp-persona-role")).toHaveText("Büyük Patron");
  await expect(modal.locator(".cp-role-badge")).toHaveText("Ekonomi");
  await expect(modal.locator(".cp-fx-hdr")).toHaveText(["AVANTAJLAR","DEZAVANTAJ","OYUN TARZI"]);
  await expect(modal.locator(".cp-fx-item")).toContainText([
    "Borç limiti €28M — en geniş marj",
    "Her turda küçük finansal destek gelebilir",
    "Finalde −2 güç bırakabilir",
  ]);
  await expect(modal.locator(".cp-playstyle")).toContainText("Kasayı rahatlatır");
  await expect(modal.locator(".cp-sel-btn")).toHaveText("BAŞKANI SEÇ");
  await expect(modal.locator(".cp-counter")).toHaveText("1 / 6");

  const layout=await modal.evaluate(root=>{
    const persona=(root.querySelector(".cp-persona") as HTMLElement).getBoundingClientRect();
    const mechanics=(root.querySelector(".cp-mechanics") as HTMLElement).getBoundingClientRect();
    const footer=root.querySelector(".cp-bot-row") as HTMLElement;
    const pros=(root.querySelector(".cp-fx-pro") as HTMLElement).getBoundingClientRect();
    const cons=(root.querySelector(".cp-fx-con") as HTMLElement).getBoundingClientRect();
    const play=(root.querySelector(".cp-playstyle") as HTMLElement).getBoundingClientRect();
    const portrait=(root.querySelector(".cp-portrait-frame") as HTMLElement).getBoundingClientRect();
    const personaCopy=(root.querySelector(".cp-persona-copy") as HTMLElement).getBoundingClientRect();
    const modalRect=(root as HTMLElement).getBoundingClientRect();
    const sheet=root.closest(".sheet") as HTMLElement;
    return{
      persona:{top:persona.top,right:persona.right,bottom:persona.bottom},
      mechanics:{top:mechanics.top,left:mechanics.left,bottom:mechanics.bottom},
      desktopOrder:Math.abs(pros.top-cons.top)<=1&&play.top>=Math.max(pros.bottom,cons.bottom)-1,
      mobileOrder:pros.top<cons.top&&cons.top<play.top,
      portrait:{left:portrait.left,right:portrait.right,width:portrait.width},
      personaCopy:{left:personaCopy.left},
      modalHeight:modalRect.height,
      footerHeight:footer.getBoundingClientRect().height,
      footerPosition:getComputedStyle(footer).position,
      horizontalOverflow:sheet.scrollWidth-sheet.clientWidth,
      sheetRight:sheet.getBoundingClientRect().right,
      viewportWidth:window.innerWidth,
    };
  });
  expect(layout.footerPosition).toBe("sticky");
  expect(layout.footerHeight).toBeLessThanOrEqual(68);
  expect(layout.horizontalOverflow).toBeLessThanOrEqual(1);
  expect(layout.sheetRight).toBeLessThanOrEqual(layout.viewportWidth+1);
  if(testInfo.project.name.includes("mobile")){
    expect(layout.mobileOrder).toBe(true);
    expect(layout.mechanics.top).toBeGreaterThanOrEqual(layout.persona.bottom-1);
    expect(layout.portrait.width).toBeLessThanOrEqual(88);
    expect(layout.portrait.right).toBeLessThanOrEqual(layout.personaCopy.left+1);
    await expect(modal.locator(".cp-playstyle")).not.toHaveAttribute("open","");
  }else{
    expect(layout.desktopOrder).toBe(true);
    expect(Math.abs(layout.persona.top-layout.mechanics.top)).toBeLessThanOrEqual(1);
    expect(layout.mechanics.left).toBeGreaterThanOrEqual(layout.persona.right-1);
    expect(layout.portrait.width).toBeLessThanOrEqual(220);
    expect(layout.modalHeight).toBeLessThanOrEqual(520);
    await expect(modal.locator(".cp-playstyle")).toHaveAttribute("open","");
    await expect(modal.locator(".cp-nav-btn small")).toHaveCount(2);
    await expect(modal.locator(".cp-nav-btn small").first()).toBeVisible();
  }

  const themeStyles=await modal.evaluate(root=>{
    const html=document.documentElement;
    const mechanics=root.querySelector(".cp-mechanics") as HTMLElement;
    const copy=root.querySelector(".chairpopup-desc") as HTMLElement;
    return["light","dark"].map(theme=>{
      html.dataset.theme=theme;
      return{
        background:getComputedStyle(mechanics).backgroundColor,
        text:getComputedStyle(copy).color,
      };
    });
  });
  expect(themeStyles.every(style=>style.background!=="rgba(0, 0, 0, 0)"&&style.background!==style.text)).toBe(true);

  await modal.locator(".cp-nav-next").click();
  await expect(page.locator(".chair-picker-modal")).toHaveAttribute("data-chair-id","leydi");
  await expect(page.locator(".chair-picker-modal .chairpopup-name")).toHaveText("Diplomat Başkan");
  await expect(page.locator(".chair-picker-modal .cp-counter")).toHaveText("2 / 6");
  await page.locator(".chair-picker-modal .cp-sel-btn").click();
  await expect(page.locator("#modal")).toHaveClass(/hidden/);
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
