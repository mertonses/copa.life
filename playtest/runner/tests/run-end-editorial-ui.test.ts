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
    if(game.COPA_IS_NATIVE){
      localStorage.setItem("copa_online_features_onboarding_v1",JSON.stringify({
        version:"online-features-v1",terms:true,matching:false,sharing:false,leaderboard:false,
        action:"test_fixture",accepted_at:new Date().toISOString()
      }));
    }
    await game.quickStart();
    if(game._countryDraftPromise)await game._countryDraftPromise;
    await game.quickAll();
  });
  await page.locator("#postClubName").fill("Editorial XI");
  await page.evaluate(({zeroEconomy})=>{
    const game=globalThis as any;
    game.pcGo();game.fastTournamentDraw();game.finishTournamentDraw();
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

async function finishSackedRun(page:Page){
  await page.goto("/?run-end-sacked-ui=1",{waitUntil:"domcontentloaded"});
  await page.evaluate(async()=>{
    const game=globalThis as any;
    game.setLang("tr");
    await game.quickStart();
    if(game._countryDraftPromise)await game._countryDraftPromise;
    await game.quickAll();
  });
  await page.locator("#postClubName").fill("Borç FK");
  await page.evaluate(()=>{
    const game=globalThis as any;
    game.pcGo();
    game.fastTournamentDraw();
    game.finishTournamentDraw();
    game.setCaptain(0);
    game.closeModal();
    game._runSeedResultCheat("sacked");
  });
  await expect(page.locator("#result")).toBeVisible();
}

test("sacked result keeps a compact visual hierarchy without horizontal overflow",async({page},testInfo)=>{
  if(testInfo.project.name==="mobile-chromium")await page.setViewportSize({width:360,height:800});
  await finishSackedRun(page);
  await page.waitForFunction(()=>[...document.styleSheets].some(sheet=>sheet.href?.includes("/webOnly.css")));
  const layout=await page.evaluate(()=>{
    const rect=(selector:string)=>document.querySelector(selector)!.getBoundingClientRect();
    const board=rect("#result .scoreboard");
    const actions=[...document.querySelectorAll<HTMLElement>("#result .result-action")].filter(node=>node.offsetParent).map(node=>node.getBoundingClientRect());
    const stats=[...document.querySelectorAll("#result .statline .stat")].map(node=>node.getBoundingClientRect());
    const decision=getComputedStyle(document.querySelector("#result .scoreboard")!,"::before");
    return{
      overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,
      boardHeight:board.height,
      actionWidthDelta:actions.length?Math.max(...actions.map(item=>item.width))-Math.min(...actions.map(item=>item.width)):0,
      actionItemCount:actions.length,
      actionItemsInside:actions.every(item=>item.left>=0&&item.right<=innerWidth+1),
      actionMinHeight:actions.length?Math.min(...actions.map(item=>item.height)):0,
      statGap:stats[1].left-stats[0].right,
      decision:decision.content,
      negativeCash:getComputedStyle(document.querySelector("#rCash")!).color
    };
  });
  expect(layout.overflow).toBeLessThanOrEqual(1);
  expect(layout.boardHeight).toBeGreaterThanOrEqual(99);
  expect(layout.boardHeight).toBeLessThanOrEqual(testInfo.project.name==="mobile-chromium"?300:230);
  expect(layout.actionWidthDelta).toBeLessThanOrEqual(1);
  expect(layout.actionItemCount).toBeGreaterThanOrEqual(3);
  expect(layout.actionItemsInside).toBe(true);
  expect(layout.actionMinHeight).toBeGreaterThanOrEqual(40);
  expect(layout.statGap).toBeGreaterThanOrEqual(5);
  expect(layout.decision).toContain("YÖNETİM");
  expect(layout.negativeCash).not.toBe("rgb(243, 245, 244)");
  await page.locator("#result .result-actions").scrollIntoViewIfNeeded();
  await page.screenshot({path:testInfo.outputPath("sacked-result-ui.png"),fullPage:true});
});

test("completed shared run stays on the result and keeps Club Career in the main flow",async({page})=>{
  await finishRun(page,{ghost:true});
  await expect(page.locator(".ghost-run-shell")).toHaveCount(0);
  await expect(page.locator("#result")).toBeVisible();
  await expect(page.locator("#rCareerProgress")).toBeVisible();
  await expect(page.locator("#rCareerProgress")).toContainText(/CLUB CAREER|KULÜP KARİYERİ/);
  await expect(page.locator("#modal")).toBeHidden();
});

test("completed unshared run does not interrupt the result with a Ghost solicitation",async({page})=>{
  await finishRun(page);
  await expect(page.locator(".ghost-run-shell")).toHaveCount(0);
  await expect(page.locator("#ghostConsentDialog")).toHaveCount(0);
  await expect(page.locator("#result")).toBeVisible();
  await expect(page.locator("#rCareerProgress")).toBeVisible();
  expect(await page.evaluate(()=>(globalThis as any).GhostClubs.sharingEnabled())).toBe(false);
});

test("season story keeps four meaningful chronological beats and economy hides zero rows",async({page})=>{
  await finishRun(page);
  await expect(page.locator("#rFinish")).toHaveText("ELENDİN");
  await expect(page.locator("#rLn")).toBeVisible();
  const heroAlignment=await page.locator(".scoreboard").evaluate(element=>{
    const copy=element.querySelector(".result-hero-copy")!.getBoundingClientRect();
    const title=element.querySelector("#rFinish")!.getBoundingClientRect();
    return Math.abs(title.left-copy.left);
  });
  expect(heroAlignment).toBeLessThanOrEqual(1);
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

test("deferred Ghost result never interrupts a new active screen",async({page})=>{
  await finishRun(page);
  await expect(page.locator(".ghost-run-shell")).toHaveCount(0);
  await page.evaluate(()=>{
    const game=globalThis as any;
    document.querySelector("#result")?.classList.add("hidden");
    document.querySelector("#sim")?.classList.remove("hidden");
    game.showGhostRunResultOnce();
  });
  await page.waitForTimeout(500);
  await expect(page.locator(".ghost-run-shell")).toHaveCount(0);
  await expect(page.locator("#modal")).toBeHidden();
});

test("landing hero keeps responsive tactics and persistent header actions",async({page},testInfo)=>{
  await page.goto("/?editorial-hero=1",{waitUntil:"domcontentloaded"});
  await page.evaluate(()=>(globalThis as any).setLang("tr"));
  const isMobile=testInfo.project.name.includes("mobile");
  await expect(page.locator(".v7-hero-desc")).toHaveText("Her seçiminle yeni bir futbol hikâyesi yaz.");
  await expect(page.locator(".hero-die-icon")).toHaveCount(0);
  await expect(page.locator("#howtoPrompt")).toHaveCount(0);
  await expect(page.locator(".tactical-board")).toBeVisible();
  await expect(page.locator(".tactical-board .tactical-unit")).toHaveCount(10);
  await expect(page.locator(".tactical-board .tactical-selected")).toHaveCount(1);
  await expect(page.locator(".tactical-board .tactical-route-primary")).toHaveCount(1);
  await expect(page.locator(".tactical-board .tactical-run")).toHaveCount(1);
  await expect(page.locator(".tactical-board .tactical-penalty-area")).toHaveCount(1);
  await expect(page.locator(".tactical-board .tactical-goal-area")).toHaveCount(1);
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
    const route=getComputedStyle(document.querySelector(".tactical-route-primary") as SVGElement);
    const player=getComputedStyle(document.querySelector(".tactical-unit") as SVGElement);
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
  expect(layout.boardHidden).toBe(false);
  expect(layout.routeAnimation).toContain("tacticalRouteFlow");
  expect(layout.playerAnimation).toContain("tacticalNodePulse");
  expect(layout.boardWidth).toBeGreaterThanOrEqual(230);
  expect(layout.diagramRatio).toBeCloseTo(360/144,1);
  expect(layout.guideSettingsGap).toBeGreaterThanOrEqual(0);
  expect(layout.guideSettingsGap).toBeLessThanOrEqual(8);
  expect(layout.guideSettingsHeightDelta).toBeLessThanOrEqual(1);
  expect(layout.guideSettingsCenterDelta).toBeLessThanOrEqual(1);
  if(isMobile){
    expect(layout.guideSettingsWidthDelta).toBeLessThanOrEqual(1);
    expect(layout.guideFontSize).toBe(0);
  }else{
    expect(layout.guideFontSize).toBeGreaterThan(0);
  }
  const reducedAnimations=await page.evaluate(()=>{
    document.body.classList.add("reduced-motion");
    const values=[
      getComputedStyle(document.querySelector(".tactical-route-primary") as SVGElement).animationName,
      getComputedStyle(document.querySelector(".tactical-unit") as SVGElement).animationName,
    ];
    document.body.classList.remove("reduced-motion");
    return values;
  });
  expect(reducedAnimations).toEqual(["none","none"]);

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
  await expect(modal.locator(".cp-fx-hdr")).toHaveText(["ANA AVANTAJ","TETİKLEYİCİ","KIRMIZI ÇİZGİ","OYUN TARZI"]);
  await expect(modal.locator(".cp-contract-row p")).toContainText([
    "En geniş borç alanı: −€28M.",
    "Güven 3/3: danışma €1M.",
    "Kartlar +€1M. Borç disiplinini koru.",
  ]);
  await expect(modal.locator(".cp-playstyle")).toContainText("Geniş borç limitiyle rahat harcama yaparsın. Finalde borcu kontrol etmen gerekir.");
  await expect(modal.locator(".cp-sel-btn")).toHaveText("BAŞKANI SEÇ");
  await expect(modal.locator(".cp-counter")).toHaveText("1 / 6");

  const layout=await modal.evaluate(root=>{
    const persona=(root.querySelector(".cp-persona") as HTMLElement).getBoundingClientRect();
    const mechanics=(root.querySelector(".cp-mechanics") as HTMLElement).getBoundingClientRect();
    const footer=root.querySelector(".cp-bot-row") as HTMLElement;
    const advantage=(root.querySelector(".cp-contract-adv") as HTMLElement).getBoundingClientRect();
    const trigger=(root.querySelector(".cp-contract-trigger") as HTMLElement).getBoundingClientRect();
    const redline=(root.querySelector(".cp-contract-red") as HTMLElement).getBoundingClientRect();
    const play=(root.querySelector(".cp-playstyle") as HTMLElement).getBoundingClientRect();
    const portrait=(root.querySelector(".cp-portrait-frame") as HTMLElement).getBoundingClientRect();
    const personaCopy=(root.querySelector(".cp-persona-copy") as HTMLElement).getBoundingClientRect();
    const badge=(root.querySelector(".cp-role-badge") as HTMLElement).getBoundingClientRect();
    const contractCopy=root.querySelector(".cp-contract-row p") as HTMLElement;
    const contextNumber=root.querySelector(".cp-context-number") as HTMLElement;
    const counter=(root.querySelector(".cp-counter") as HTMLElement).getBoundingClientRect();
    const close=(root.querySelector(".cp-close") as HTMLElement).getBoundingClientRect();
    const navButtons=[
      root.querySelector(".cp-nav-prev"),
      root.querySelector(".cp-sel-btn"),
      root.querySelector(".cp-nav-next"),
    ].map(node=>(node as HTMLElement).getBoundingClientRect());
    const modalRect=(root as HTMLElement).getBoundingClientRect();
    const sheet=root.closest(".sheet") as HTMLElement;
    return{
      persona:{top:persona.top,right:persona.right,bottom:persona.bottom},
      mechanics:{top:mechanics.top,left:mechanics.left,bottom:mechanics.bottom},
      contractOrder:advantage.top<trigger.top&&trigger.top<redline.top&&redline.top<play.top,
      portrait:{left:portrait.left,right:portrait.right,width:portrait.width},
      personaCopy:{left:personaCopy.left},
      badgeInPersona:!!root.querySelector(".cp-persona > .cp-role-badge"),
      badgeInMechanics:!!root.querySelector(".cp-mechanics .cp-role-badge"),
      badgeCenterDelta:Math.abs((badge.left+badge.width/2)-(persona.left+persona.width/2)),
      contractFontSize:Number.parseFloat(getComputedStyle(contractCopy).fontSize),
      numberIsEmphasized:Number.parseFloat(getComputedStyle(contextNumber).fontWeight)>=800,
      actionTopDelta:Math.max(...navButtons.map(rect=>rect.top))-Math.min(...navButtons.map(rect=>rect.top)),
      counterInTopControls:!!root.querySelector(".cp-top-controls > .cp-counter"),
      closeInTopControls:!!root.querySelector(".cp-top-controls > .cp-close"),
      counterCloseGap:Math.abs(close.left-counter.right),
      counterCloseCenterDelta:Math.abs((counter.top+counter.height/2)-(close.top+close.height/2)),
      counterInFooter:!!root.querySelector(".cp-bot-row .cp-counter"),
      modalHeight:modalRect.height,
      footerHeight:footer.getBoundingClientRect().height,
      footerPosition:getComputedStyle(footer).position,
      horizontalOverflow:sheet.scrollWidth-sheet.clientWidth,
      sheetRight:sheet.getBoundingClientRect().right,
      controlsWithinModal:counter.left>=modalRect.left-1&&close.right<=modalRect.right+1&&counter.top>=modalRect.top-1&&close.bottom<=modalRect.bottom+1,
      viewportWidth:window.innerWidth,
    };
  });
  expect(layout.footerPosition).toBe("sticky");
  expect(layout.footerHeight).toBeLessThanOrEqual(68);
  expect(layout.actionTopDelta).toBeLessThanOrEqual(1);
  expect(layout.counterInTopControls).toBe(true);
  expect(layout.closeInTopControls).toBe(true);
  expect(layout.counterCloseGap).toBeLessThanOrEqual(8);
  expect(layout.counterCloseCenterDelta).toBeLessThanOrEqual(1);
  expect(layout.counterInFooter).toBe(false);
  expect(layout.badgeInPersona).toBe(true);
  expect(layout.badgeInMechanics).toBe(false);
  expect(layout.badgeCenterDelta).toBeLessThanOrEqual(1);
  expect(layout.contractFontSize).toBeGreaterThanOrEqual(10.5);
  expect(layout.numberIsEmphasized).toBe(true);
  expect(layout.contractOrder).toBe(true);
  expect(layout.horizontalOverflow).toBeLessThanOrEqual(1);
  expect(layout.sheetRight).toBeLessThanOrEqual(layout.viewportWidth+1);
  expect(layout.controlsWithinModal).toBe(true);
  if(testInfo.project.name.includes("mobile")){
    expect(layout.mechanics.top).toBeGreaterThanOrEqual(layout.persona.bottom-1);
    expect(layout.portrait.width).toBeLessThanOrEqual(88);
    expect(layout.portrait.right).toBeLessThanOrEqual(layout.personaCopy.left+1);
  }else{
    expect(Math.abs(layout.persona.top-layout.mechanics.top)).toBeLessThanOrEqual(1);
    expect(layout.mechanics.left).toBeGreaterThanOrEqual(layout.persona.right-1);
    expect(layout.portrait.width).toBeLessThanOrEqual(190);
    expect(layout.modalHeight).toBeLessThanOrEqual(470);
    await expect(modal.locator(".cp-nav-btn small")).toHaveCount(2);
    await expect(modal.locator(".cp-nav-btn small").first()).toBeVisible();
  }

  const themeStyles=await modal.evaluate(root=>{
    const html=document.documentElement;
    const mechanics=root.querySelector(".cp-mechanics") as HTMLElement;
    const copy=root.querySelector(".cp-playstyle p") as HTMLElement;
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

test("native Android and iOS packages keep the inline result and Club Career layout safe",async({page},testInfo)=>{
  const isAndroid=testInfo.project.name==="mobile-chromium";
  const isIos=testInfo.project.name==="webkit-mobile";
  test.skip(!isAndroid&&!isIos,"native mobile contract");
  await finishRun(page,{
    ghost:true,
    path:isIos?"/dist-ios/index.html?ghost-result-native=ios":"/dist-android/index.html?ghost-result-native=android",
  });
  await expect(page.locator(".ghost-run-shell")).toHaveCount(0);
  const career=page.locator("#rCareerProgress");
  await expect(career).toBeVisible();
  await expect(page.locator("#quickBtn")).toHaveCount(0);
  const layout=await page.locator("#result").evaluate(element=>({
    overflow:element.scrollWidth-element.clientWidth,
    careerWidth:(element.querySelector("#rCareerProgress") as HTMLElement).getBoundingClientRect().width,
    resultWidth:element.getBoundingClientRect().width,
  }));
  expect(layout.overflow).toBeLessThanOrEqual(1);
  expect(layout.careerWidth).toBeLessThanOrEqual(layout.resultWidth);
  expect(await page.evaluate(()=>(globalThis as any).COPA_PLATFORM)).toBe(isIos?"ios":"android");
});

test("championship chairman reward previews three candidates before confirmation",async({page},testInfo)=>{
  test.skip(!testInfo.project.name.includes("mobile"),"mobile reward layout");
  await page.goto("/?chair-unlock-preview=1",{waitUntil:"domcontentloaded"});
  await page.evaluate(()=>{
    const game=globalThis as any;
    game.unlockedChairs=["babacan"];
    game.pendingChairChoices=["leydi","pinti","sansasyoncu"];
    game.showPendingChairUnlock();
  });
  const cards=page.locator(".chair-unlock-card");
  await expect(cards).toHaveCount(3);
  const positions=await cards.evaluateAll(elements=>elements.map(element=>{
    const rect=element.getBoundingClientRect();return{top:Math.round(rect.top),width:Math.round(rect.width)};
  }));
  expect(new Set(positions.map(item=>item.top)).size).toBe(1);
  expect(positions.every(item=>item.width>70)).toBe(true);
  await cards.first().click();
  await expect(page.locator(".chair-unlock-preview")).toBeVisible();
  await expect(page.locator(".chair-unlock-effects section")).toHaveCount(2);
  expect(await page.evaluate(()=>(globalThis as any).unlockedChairs)).toEqual(["babacan"]);
  await page.locator(".chair-unlock-close").click();
  await expect(page.locator("#modal")).toBeHidden();
});
