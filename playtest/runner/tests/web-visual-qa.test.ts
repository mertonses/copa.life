import {test,expect} from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const visualDir=path.resolve(__dirname,"../../../outputs/ui-visuals/web-only");

const capture=async(page:any,name:string)=>{
  fs.mkdirSync(visualDir,{recursive:true});
  await page.waitForTimeout(500);
  await page.screenshot({path:path.join(visualDir,name),fullPage:true});
};

const reset=async(page:any)=>{
  await page.addInitScript(()=>{
    for(const key of ["copa_run_v6","copa_run_v6_last_good","copa_run_v5","copa_run_v5_last_good"])localStorage.removeItem(key);
    sessionStorage.removeItem("copa_run");
  });
};

test("web play-style modal keeps summaries and effects aligned",async({page},testInfo)=>{
  test.skip(testInfo.project.name!=="desktop-chromium","web-only play-style modal");
  await reset(page);
  await page.goto("/?web-style-modal-visual-qa=1",{waitUntil:"domcontentloaded"});
  await page.evaluate(()=>{
    document.querySelector(".copa-coachmark")?.remove();
    (globalThis as any).normalStart();
  });
  await expect(page.locator(".style-select-modal")).toBeVisible();
  await page.waitForFunction(()=>[...document.styleSheets].some(sheet=>sheet.href?.includes("/webOnly.css")));
  await page.waitForTimeout(100);
  const layout=await page.locator(".style-select-modal").evaluate((modal:HTMLElement)=>{
    const cards=[...modal.querySelectorAll<HTMLElement>(".style-choice-modern")];
    const modalRect=modal.getBoundingClientRect();
    const list=modal.querySelector<HTMLElement>(".stylelist")!;
    const listRect=list.getBoundingClientRect();
    return{
      modalWidth:modalRect.width,
      modalOverflow:modal.scrollWidth-modal.clientWidth,
      listOverflow:list.scrollWidth-list.clientWidth,
      listInsideModal:listRect.left>=modalRect.left&&listRect.right<=modalRect.right,
      pageOverflow:document.documentElement.scrollWidth-innerWidth,
      cardHeights:cards.map(card=>card.getBoundingClientRect().height),
      rows:cards.map(card=>{
        const cardRect=card.getBoundingClientRect();
        const summary=card.querySelector<HTMLElement>(".style-choice-summary")!.getBoundingClientRect();
        const effects=card.querySelector<HTMLElement>(".style-impact-grid")!.getBoundingClientRect();
        const value=card.querySelector<HTMLElement>(".style-impact-value")!.getBoundingClientRect();
        const effectStyle=getComputedStyle(card.querySelector<HTMLElement>(".style-impact-grid")!);
        const effectItems=[...card.querySelectorAll<HTMLElement>(".style-impact-grid span")].map(node=>node.getBoundingClientRect());
        return{
          cardInsideList:cardRect.left>=listRect.left-1&&cardRect.right<=listRect.right+1,
          cardInsideModal:cardRect.left>=modalRect.left&&cardRect.right<=modalRect.right,
          effectsAfterSummary:effects.left>=summary.right+8,
          effectsInsideCard:effects.left>=cardRect.left&&effects.right<=cardRect.right-10,
          itemsInsideEffects:effectItems.every(item=>item.left>=effects.left-1&&item.right<=effects.right+1),
          equalEffectWidths:Math.max(...effectItems.map(item=>item.width))-Math.min(...effectItems.map(item=>item.width))<=1,
          verticallyAligned:Math.abs((summary.top+summary.bottom)/2-(effects.top+effects.bottom)/2)<=4,
          valueInsideSummary:value.left>=summary.left&&value.right<=summary.right+1,
          effectDisplay:effectStyle.display,
          effectColumns:effectStyle.gridTemplateColumns,
          clipped:[...card.querySelectorAll<HTMLElement>(".style-impact-grid span")]
            .some(node=>node.scrollWidth>node.clientWidth+1||node.scrollHeight>node.clientHeight+1),
        };
      }),
    };
  });
  await capture(page,"00b-style-selection-modal.png");
  expect(layout.modalWidth).toBeGreaterThanOrEqual(720);
  expect(layout.modalOverflow).toBeLessThanOrEqual(1);
  expect(layout.listOverflow).toBeLessThanOrEqual(1);
  expect(layout.listInsideModal).toBe(true);
  expect(layout.pageOverflow).toBeLessThanOrEqual(1);
  expect(Math.max(...layout.cardHeights)).toBeLessThanOrEqual(112);
  expect(layout.rows.every(row=>row.cardInsideList&&row.cardInsideModal&&row.effectsAfterSummary&&row.effectsInsideCard&&row.itemsInsideEffects&&row.equalEffectWidths&&row.verticallyAligned&&row.valueInsideSummary&&row.effectDisplay==="grid"&&row.effectColumns.split(" ").length===2&&!row.clipped),JSON.stringify(layout.rows)).toBe(true);
  await page.setViewportSize({width:768,height:900});
  const narrow=await page.locator(".style-select-modal").evaluate((modal:HTMLElement)=>({
    pageOverflow:document.documentElement.scrollWidth-innerWidth,
    modalOverflow:modal.scrollWidth-modal.clientWidth,
    listOverflow:modal.querySelector<HTMLElement>(".stylelist")!.scrollWidth-modal.querySelector<HTMLElement>(".stylelist")!.clientWidth,
    rows:[...modal.querySelectorAll<HTMLElement>(".style-choice-modern")].map(card=>{
      const cardRect=card.getBoundingClientRect();
      const summary=card.querySelector<HTMLElement>(".style-choice-summary")!.getBoundingClientRect();
      const effects=card.querySelector<HTMLElement>(".style-impact-grid")!.getBoundingClientRect();
      const items=[...card.querySelectorAll<HTMLElement>(".style-impact-grid span")].map(node=>node.getBoundingClientRect());
      return effects.left>=summary.right+8&&effects.right<=cardRect.right-10&&items.every(item=>item.left>=effects.left-1&&item.right<=effects.right+1);
    }),
  }));
  expect(narrow.pageOverflow).toBeLessThanOrEqual(1);
  expect(narrow.modalOverflow).toBeLessThanOrEqual(1);
  expect(narrow.listOverflow).toBeLessThanOrEqual(1);
  expect(narrow.rows.every(Boolean)).toBe(true);
  await capture(page,"00c-style-selection-modal-768.png");
  await page.setViewportSize({width:1024,height:768});
  const compactDesktop=await page.locator(".style-select-modal").evaluate((modal:HTMLElement)=>{
    const rect=modal.getBoundingClientRect();
    const list=modal.querySelector<HTMLElement>(".stylelist")!;
    return{
      top:rect.top,
      bottom:rect.bottom,
      viewportHeight:innerHeight,
      listNeedsScroll:list.scrollHeight>list.clientHeight+1,
      pageOverflow:document.documentElement.scrollWidth-innerWidth,
    };
  });
  expect(compactDesktop.top).toBeGreaterThanOrEqual(0);
  expect(compactDesktop.bottom).toBeLessThanOrEqual(compactDesktop.viewportHeight);
  expect(compactDesktop.listNeedsScroll).toBe(false);
  expect(compactDesktop.pageOverflow).toBeLessThanOrEqual(1);
  await capture(page,"00d-style-selection-modal-1024x768.png");
});

test("wide web surfaces remain readable and use the available canvas",async({page},testInfo)=>{
  test.skip(testInfo.project.name!=="desktop-chromium","web-only desktop visual pass");
  await reset(page);
  await page.goto("/?web-visual-qa=1",{waitUntil:"domcontentloaded"});
  await expect(page.locator("#startBtn")).toBeVisible();
  const structuralContracts=await page.evaluate(()=>({
    chairmanCards:[...document.querySelectorAll<HTMLElement>("#chairpick .chairbtn")].map(card=>({
      detail:card.querySelector(".chair-detail-link")?.textContent?.trim()||"",
      hasMeta:!!card.querySelector(".chair-mobile-meta"),
      hasNameRow:!!card.querySelector(".chair-name-row"),
    })),
    analysisImmediatelyBeforeCareer:document.querySelector("#matchAnalysisEntry")?.nextElementSibling?.id==="rCareerProgress",
    resultActionOrder:[...document.querySelectorAll<HTMLElement>(".result-row>*")].map(node=>node.id),
  }));
  expect(structuralContracts.chairmanCards.length).toBeGreaterThanOrEqual(6);
  expect(structuralContracts.chairmanCards.every(card=>["DETAY →","DETAIL →"].includes(card.detail)&&!card.hasMeta&&card.hasNameRow)).toBe(true);
  expect(structuralContracts.analysisImmediatelyBeforeCareer).toBe(true);
  expect(structuralContracts.resultActionOrder).toEqual(["shareCardBtn","statsBtn",""]);
  await capture(page,"01-opening.png");
  await page.locator("#settingsBtn").click();
  const advancedSettingsButton=page.locator(".settings-advanced-btn");
  await expect(advancedSettingsButton).toBeVisible();
  const settingsButtonLayout=await advancedSettingsButton.evaluate((button:HTMLElement)=>{
    const icon=button.querySelector<SVGElement>("svg")!;
    const buttonRect=button.getBoundingClientRect();
    const iconRect=icon.getBoundingClientRect();
    return{
      buttonHeight:buttonRect.height,
      iconWidth:iconRect.width,
      iconHeight:iconRect.height,
      overflow:button.scrollWidth-button.clientWidth,
      iconFill:getComputedStyle(icon).fill,
      iconStroke:getComputedStyle(icon).stroke,
    };
  });
  expect(settingsButtonLayout.buttonHeight).toBeLessThanOrEqual(48);
  expect(settingsButtonLayout.iconWidth).toBeLessThanOrEqual(20);
  expect(settingsButtonLayout.iconHeight).toBeLessThanOrEqual(20);
  expect(settingsButtonLayout.overflow).toBeLessThanOrEqual(1);
  expect(settingsButtonLayout.iconFill).toBe("none");
  expect(settingsButtonLayout.iconStroke).not.toBe("none");
  await capture(page,"00-settings-menu.png");
  await page.locator("#settingsBtn").click();
  const coachmark=page.locator(".copa-coachmark");
  if(await coachmark.isVisible())await coachmark.locator(".copa-coachmark-ok").click();

  await page.evaluate(async()=>{
    const game=globalThis as any;
    game.CopaMobileShell.newRun();
    await game.quickStart();
    if(game._countryDraftPromise)await game._countryDraftPromise;
    game.setBudget();
  });
  await page.locator("#rollBtn").click();
  await expect(page.locator("#opts .opt")).toHaveCount(3);
  await page.waitForTimeout(400);
  expect(await page.locator(".player-profile-layer:not(.hidden)").count()).toBe(0);
  const draftLayout=await page.locator("#opts .opt").evaluateAll((cards:HTMLElement[])=>({
    widths:cards.map(card=>card.getBoundingClientRect().width),
    pageOverflow:document.documentElement.scrollWidth-innerWidth,
    smallestText:Math.min(...cards.flatMap(card=>[...card.querySelectorAll<HTMLElement>("*")]
      .filter(node=>node.textContent?.trim()&&getComputedStyle(node).display!=="none")
      .map(node=>parseFloat(getComputedStyle(node).fontSize)||99))),
  }));
  expect(Math.min(...draftLayout.widths)).toBeGreaterThanOrEqual(170);
  expect(draftLayout.pageOverflow).toBeLessThanOrEqual(1);
  expect(draftLayout.smallestText).toBeGreaterThanOrEqual(7);
  await capture(page,"02-draft-candidates.png");

  await page.evaluate(async()=>{
    const game=globalThis as any;
    await game.quickAll();
  });
  await expect(page.locator("#postClubName")).toBeVisible();
  await page.locator("#postClubName").fill("Web QA FK");
  await page.evaluate(()=>(globalThis as any).pcGo());
  await expect(page.locator("#tournamentDraw")).toBeVisible();
  await capture(page,"03-group-draw.png");
  const drawLayout=await page.locator(".td-groups").evaluate((groups:HTMLElement)=>({
    visibleWidth:groups.clientWidth,
    firstFour:[...groups.querySelectorAll<HTMLElement>(".td-group")].slice(0,4)
      .every(group=>group.getBoundingClientRect().right<=groups.getBoundingClientRect().right+1),
    allEight:[...groups.querySelectorAll<HTMLElement>(".td-group")]
      .every(group=>{
        const card=group.getBoundingClientRect(),strip=groups.getBoundingClientRect();
        return card.left>=strip.left-1&&card.right<=strip.right+1;
      }),
    columns:getComputedStyle(groups).gridTemplateColumns.split(" ").filter(Boolean).length,
  }));
  expect(drawLayout.visibleWidth).toBeGreaterThan(650);
  expect(drawLayout.firstFour).toBe(true);
  expect(drawLayout.allEight).toBe(true);
  expect(drawLayout.columns).toBe(4);

  await page.evaluate(()=>{
    const game=globalThis as any;
    game.fastTournamentDraw();
    game.finishTournamentDraw();
    game.setCaptain(0);
    game.closeModal();
    game.CopaClubFiles.select("debt");
  });
  await expect(page.locator("#hub")).toBeVisible();
  await page.locator('#nativeHubNav [data-native-target="match"]').click();
  const matchLayout=await page.evaluate(()=>{
    const panel=document.querySelector<HTMLElement>(".hub-action-panel")!;
    const side=document.querySelector<HTMLElement>(".hcol-r")!;
    const cupRoad=document.querySelector<HTMLElement>("#tournamentHubPanel");
    const feed=document.querySelector<HTMLElement>("#feedwrap")!;
    const main=document.querySelector<HTMLElement>(".hcol-l")!;
    const labels=[...document.querySelectorAll<HTMLElement>(".hub-stat-row .mh")];
    const talk=panel.querySelector<HTMLElement>("#talkBtn")!;
    const president=panel.querySelector<HTMLElement>("#presBtn")!;
    const play=panel.querySelector<HTMLElement>("#playBtn")!;
    const talkParts=[...talk.querySelectorAll<HTMLElement>("svg,span")].map(node=>node.getBoundingClientRect());
    const talkRect=talk.getBoundingClientRect();
    const talkContentLeft=Math.min(...talkParts.map(rect=>rect.left));
    const talkContentRight=Math.max(...talkParts.map(rect=>rect.right));
    const presWrap=panel.querySelector<HTMLElement>(".presbtngp")!;
    const cashValue=document.querySelector<HTMLElement>("#kasaTile .kasa-main-val")!;
    const debtValue=document.querySelector<HTMLElement>("#kasaTile .kasa-compact-debt-value")!;
    const cashInfo=document.querySelector<HTMLElement>("#kasaTile .kasa-detail-btn")!.getBoundingClientRect();
    const trustInfo=document.querySelector<HTMLElement>("#trustInfoBtn")!.getBoundingClientRect();
    const debtLabel=document.querySelector<HTMLElement>("#kasaTile .kasa-compact-debt-label")!.getBoundingClientRect();
    return{
      panelWidth:panel.getBoundingClientRect().width,
      actionWidth:panel.querySelector<HTMLElement>(".actionbtns")!.getBoundingClientRect().width,
      sideWidth:side.getBoundingClientRect().width,
      mainWidth:main.getBoundingClientRect().width,
      feedWidth:feed.getBoundingClientRect().width,
      cupRoadWidth:cupRoad?.getBoundingClientRect().width||0,
      panelInsideMain:panel.parentElement===main,
      smallestMetric:Math.min(...labels.map(label=>parseFloat(getComputedStyle(label).fontSize))),
      clippedActions:[...panel.querySelectorAll<HTMLElement>("button span")]
        .filter(label=>label.scrollWidth>label.clientWidth+1).map(label=>label.textContent?.trim()),
      actionFontSizes:[...panel.querySelectorAll<HTMLElement>("#talkBtn span,#presBtn span,#playBtn span")]
        .map(label=>parseFloat(getComputedStyle(label).fontSize)),
      actionGeometry:[talk,president,play].map(button=>{
        const rect=button.getBoundingClientRect(),style=getComputedStyle(button);
        return{
          width:rect.width,
          height:rect.height,
          padding:[style.paddingTop,style.paddingRight,style.paddingBottom,style.paddingLeft],
          radius:style.borderRadius,
        };
      }),
      talkCenterDelta:Math.abs((talkContentLeft+talkContentRight)/2-(talkRect.left+talkRect.right)/2),
      chairmanMascots:panel.querySelectorAll("#presBtn .pres-mascot").length,
      chairmanIcons:panel.querySelectorAll("#presBtn .chair-action-ico").length,
      chairmanIconVisible:!!panel.querySelector<SVGElement>("#presBtn .chair-action-ico")?.getBoundingClientRect().width,
      chairmanBorderBottom:parseFloat(getComputedStyle(president).borderBottomWidth),
      chairmanWrapBorder:parseFloat(getComputedStyle(presWrap).borderTopWidth),
      chairmanWrapBackground:getComputedStyle(presWrap).backgroundColor,
      cashFontSize:parseFloat(getComputedStyle(cashValue).fontSize),
      cashBackground:getComputedStyle(cashValue).backgroundImage,
      debtColor:getComputedStyle(debtValue).color,
      cashInfoSize:[cashInfo.width,cashInfo.height],
      trustInfoSize:[trustInfo.width,trustInfo.height],
      debtHelpGap:cashInfo.left-debtLabel.right,
      pageOverflow:document.documentElement.scrollWidth-innerWidth,
      documentHeight:document.documentElement.scrollHeight,
      viewportHeight:innerHeight,
      cupRoadBottom:cupRoad?.getBoundingClientRect().bottom||0,
    };
  });
  expect(matchLayout.panelInsideMain).toBe(true);
  expect(matchLayout.panelWidth).toBeGreaterThan(matchLayout.mainWidth*.9);
  expect(matchLayout.actionWidth).toBeGreaterThan(matchLayout.panelWidth*.9);
  expect(matchLayout.sideWidth).toBe(0);
  expect(Math.abs(matchLayout.feedWidth-matchLayout.cupRoadWidth)).toBeLessThanOrEqual(2);
  expect(matchLayout.clippedActions).toEqual([]);
  expect(Math.min(...matchLayout.actionFontSizes)).toBeGreaterThanOrEqual(9);
  expect(Math.max(...matchLayout.actionGeometry.map(button=>button.width))-Math.min(...matchLayout.actionGeometry.map(button=>button.width)),JSON.stringify(matchLayout.actionGeometry)).toBeLessThanOrEqual(1);
  expect(Math.max(...matchLayout.actionGeometry.map(button=>button.height))-Math.min(...matchLayout.actionGeometry.map(button=>button.height))).toBeLessThanOrEqual(1);
  expect(new Set(matchLayout.actionGeometry.map(button=>button.padding.join(" "))).size).toBe(1);
  expect(new Set(matchLayout.actionGeometry.map(button=>button.radius)).size).toBe(1);
  expect(matchLayout.talkCenterDelta).toBeLessThanOrEqual(2);
  expect(matchLayout.chairmanMascots).toBe(0);
  expect(matchLayout.chairmanIcons).toBe(1);
  expect(matchLayout.chairmanIconVisible).toBe(true);
  expect(matchLayout.chairmanBorderBottom).toBeGreaterThanOrEqual(1);
  expect(matchLayout.chairmanWrapBorder).toBe(0);
  expect(matchLayout.chairmanWrapBackground).toBe("rgba(0, 0, 0, 0)");
  expect(matchLayout.cashFontSize).toBeLessThanOrEqual(18);
  expect(matchLayout.cashBackground).not.toBe("none");
  expect(matchLayout.debtColor).toBe("rgb(217, 200, 143)");
  expect(matchLayout.cashInfoSize[0]).toBeLessThanOrEqual(matchLayout.trustInfoSize[0]);
  expect(matchLayout.cashInfoSize[1]).toBeLessThanOrEqual(matchLayout.trustInfoSize[1]);
  expect(matchLayout.debtHelpGap).toBeGreaterThanOrEqual(3);
  expect(matchLayout.smallestMetric).toBeGreaterThanOrEqual(8);
  expect(matchLayout.pageOverflow).toBeLessThanOrEqual(1);
  expect(matchLayout.documentHeight).toBeGreaterThanOrEqual(matchLayout.viewportHeight);
  expect(matchLayout.cupRoadBottom).toBeLessThanOrEqual(matchLayout.documentHeight+2);
  await capture(page,"04-match-hub.png");

  await page.locator('#nativeHubNav [data-native-target="market"]').click();
  await page.waitForTimeout(650);
  const marketLayout=await page.evaluate(()=>{
    const cards=[...document.querySelectorAll<HTMLElement>("#shopcards>.cardtile")];
    const agents=[...document.querySelectorAll<HTMLElement>("#freeAgentRow .free-agent-card")];
    return{
      htmlClass:document.documentElement.className,
      viewport:innerWidth,
      rightWidth:document.querySelector<HTMLElement>(".hcol-r")?.getBoundingClientRect().width||0,
      cardGrid:getComputedStyle(document.querySelector<HTMLElement>("#shopcards")!).gridTemplateColumns,
      cardGridWidth:document.querySelector<HTMLElement>("#shopcards")?.getBoundingClientRect().width||0,
      mobileCss:[...document.styleSheets].some(sheet=>sheet.href?.includes("mobileGameSystems.css")),
      cardWidths:cards.map(card=>card.offsetWidth),
      agentWidths:agents.map(card=>card.offsetWidth),
      headerWidth:document.querySelector<HTMLElement>("#shopLbl")?.getBoundingClientRect().width||0,
      feedVisible:!!document.querySelector<HTMLElement>(".feedwrap")?.offsetParent,
      pageOverflow:document.documentElement.scrollWidth-innerWidth,
    };
  });
  expect(marketLayout.cardWidths).toHaveLength(3);
  expect(marketLayout.agentWidths).toHaveLength(4);
  expect(Math.min(...marketLayout.cardWidths),JSON.stringify(marketLayout)).toBeGreaterThanOrEqual(280);
  expect(Math.max(...marketLayout.cardWidths),JSON.stringify(marketLayout)).toBeLessThanOrEqual(480);
  expect(Math.min(...marketLayout.agentWidths)).toBeGreaterThanOrEqual(210);
  expect(Math.abs(marketLayout.headerWidth-marketLayout.cardGridWidth)).toBeLessThanOrEqual(2);
  expect(marketLayout.feedVisible).toBe(false);
  expect(marketLayout.pageOverflow).toBeLessThanOrEqual(1);
  await capture(page,"05-market.png");

  await page.locator('#nativeHubNav [data-native-target="training"]').click();
  await expect(page.locator("#mobileTrainingRoute")).toBeVisible();
  const trainingLayout=await page.locator("#mobileTrainingRoute").evaluate((route:HTMLElement)=>{
    const drills=[...route.querySelectorAll<HTMLElement>(".prep-drill")];
    const last=drills.at(-1)!;
    const grid=route.querySelector<HTMLElement>(".prep-grid")!;
    const opponent=route.querySelector<HTMLElement>(".mobile-opponent-analysis")!;
    return{
      routeWidth:route.getBoundingClientRect().width,
      gridWidth:grid.getBoundingClientRect().width,
      lastWidth:last.getBoundingClientRect().width,
      opponentOverflow:opponent.scrollWidth-opponent.clientWidth,
    };
  });
  expect(trainingLayout.routeWidth).toBeLessThanOrEqual(1182);
  expect(trainingLayout.lastWidth).toBeGreaterThan(trainingLayout.gridWidth*.9);
  expect(trainingLayout.opponentOverflow).toBeLessThanOrEqual(1);
  await capture(page,"06-training.png");
  await page.evaluate(()=>(globalThis as any).CopaPreparation.openHelp());
  await expect(page.locator(".prep-help-modal")).toBeVisible();
  const helpLayout=await page.locator(".prep-help-modal").evaluate((modal:HTMLElement)=>({
    numbers:[...modal.querySelectorAll<HTMLElement>("article>i")].map(node=>({
      size:parseFloat(getComputedStyle(node).fontSize),
      color:getComputedStyle(node).color,
      background:getComputedStyle(node).backgroundColor,
    })),
    emphasis:[...modal.querySelectorAll<HTMLElement>("article em")].map(node=>node.textContent?.trim()),
    overflow:modal.scrollWidth-modal.clientWidth,
  }));
  expect(helpLayout.numbers).toHaveLength(6);
  expect(helpLayout.numbers.every(item=>item.size>=12&&item.color!==item.background)).toBe(true);
  expect(helpLayout.emphasis.filter(Boolean)).toHaveLength(6);
  expect(helpLayout.overflow).toBeLessThanOrEqual(1);
  await capture(page,"06b-training-help.png");
  await page.locator(".prep-help-modal>.btn").click();

  await page.setViewportSize({width:2048,height:1080});
  await page.locator('#nativeHubNav [data-native-target="career"]').click();
  await expect(page.locator("#mobileCareerRoute")).toBeVisible();
  const careerTabs=page.locator("#mobileCareerRoute .meta-tabs button");
  await expect(careerTabs).toHaveCount(3);
  await careerTabs.last().click();
  await expect(careerTabs.last()).toHaveClass(/active/);
  const careerLayout=await page.locator("#mobileCareerRoute .mobile-career-inline").evaluate((panel:HTMLElement)=>{
    const panelRect=panel.getBoundingClientRect(),tabs=panel.querySelector<HTMLElement>(".meta-tabs")!;
    const tabsRect=tabs.getBoundingClientRect(),buttons=[...tabs.querySelectorAll<HTMLElement>("button")];
    return{
      centerDelta:Math.abs(panelRect.left+panelRect.width/2-innerWidth/2),
      panelInside:panelRect.left>=0&&panelRect.right<=innerWidth,
      tabOverflow:tabs.scrollWidth-tabs.clientWidth,
      tabsInside:buttons.every(button=>{const rect=button.getBoundingClientRect();return rect.left>=tabsRect.left-1&&rect.right<=tabsRect.right+1;}),
      labels:buttons.map(button=>button.textContent?.trim()),
    };
  });
  expect(careerLayout.centerDelta).toBeLessThanOrEqual(1);
  expect(careerLayout.panelInside).toBe(true);
  expect(careerLayout.tabOverflow).toBeLessThanOrEqual(1);
  expect(careerLayout.tabsInside).toBe(true);
  expect(careerLayout.labels.at(-1)).toMatch(/^(DÜNYA|WORLD)$/);
  const surfaceContract=await page.evaluate(()=>{
    const game=globalThis as any;
    game.CopaSurfaceContract.audit();
    return game.CopaSurfaceContract.report();
  });
  expect(surfaceContract.candidates).toBeGreaterThan(20);
  expect(surfaceContract.transparent).toEqual([]);
  await capture(page,"07-career.png");
  await page.locator('.meta-tabs button[onclick*="career"]').click();
  await expect(page.locator(".meta-overview-snapshot")).toBeVisible();
  const overviewLayout=await page.locator("#mobileCareerRoute .mobile-career-inline").evaluate((panel:HTMLElement)=>({
    overview:!!panel.querySelector(".meta-overview-snapshot"),
    path:!!panel.querySelector(".meta-career-path"),
    overflow:panel.scrollWidth-panel.clientWidth,
  }));
  expect(overviewLayout.overview).toBe(true);
  expect(overviewLayout.path).toBe(true);
  expect(overviewLayout.overflow).toBeLessThanOrEqual(1);
  await capture(page,"07b-career-overview.png");
});

test("browser settings keep phone controls structured and remove them after widening",async({page},testInfo)=>{
  test.skip(testInfo.project.name!=="desktop-chromium","web-only responsive settings regression");
  await reset(page);
  await page.setViewportSize({width:430,height:900});
  await page.goto("/?web-settings-responsive=1",{waitUntil:"domcontentloaded"});
  await page.locator("#settingsBtn").click();
  await expect(page.locator(".mobile-pref-group")).toBeVisible();
  const narrowLayout=await page.evaluate(()=>{
    const scale=[...document.querySelectorAll<HTMLElement>("[data-mobile-text-scale]")].map(button=>button.getBoundingClientRect());
    const toggles=[...document.querySelectorAll<HTMLElement>(".mobile-pref-btn")].map(button=>button.getBoundingClientRect());
    return{
      scaleRows:new Set(scale.map(rect=>Math.round(rect.top))).size,
      scaleWidths:scale.map(rect=>rect.width),
      toggleWidths:toggles.map(rect=>rect.width),
      menuWidth:document.getElementById("settingsDrop")!.getBoundingClientRect().width,
      overflow:document.documentElement.scrollWidth-innerWidth,
    };
  });
  expect(narrowLayout.scaleRows).toBe(1);
  expect(Math.max(...narrowLayout.scaleWidths)-Math.min(...narrowLayout.scaleWidths)).toBeLessThanOrEqual(1);
  expect(narrowLayout.toggleWidths.every(width=>Math.abs(width-narrowLayout.menuWidth+16)<=2)).toBe(true);
  expect(narrowLayout.overflow).toBeLessThanOrEqual(1);
  await capture(page,"00b-narrow-browser-settings.png");

  await page.locator("#settingsBtn").click();
  await page.setViewportSize({width:900,height:900});
  await expect(page.locator(".mobile-pref-group")).toHaveCount(0);
  await page.locator("#settingsBtn").click();
  await expect(page.locator(".mobile-pref-group")).toHaveCount(0);
  await capture(page,"00c-wide-browser-settings.png");
});

test("wide web breakpoints remain centered, bounded and operable",async({page},testInfo)=>{
  test.skip(testInfo.project.name!=="desktop-chromium","source-web desktop viewport matrix");
  for(const viewport of [
    {width:1280,height:800,name:"desktop"},
    {width:1440,height:900,name:"desktop-large"},
    {width:1920,height:1080,name:"full-hd"},
    {width:2560,height:1298,name:"ultrawide"},
  ]){
    await page.setViewportSize({width:viewport.width,height:viewport.height});
    await reset(page);
    await page.goto(`/?web-${viewport.name}-visual-qa=1`,{waitUntil:"domcontentloaded"});
    const layout=await page.evaluate(()=>{
      const intro=document.querySelector<HTMLElement>("#intro")!;
      const rect=intro.getBoundingClientRect();
      const controls=[...intro.querySelectorAll<HTMLElement>("button")]
        .filter(button=>button.offsetParent)
        .map(button=>button.getBoundingClientRect());
      return{
        overflow:document.documentElement.scrollWidth-innerWidth,
        intro:{left:rect.left,right:rect.right,width:rect.width},
        tiny:controls.filter(control=>control.height<36||control.width<36).length,
      };
    });
    expect(layout.overflow,viewport.name).toBeLessThanOrEqual(1);
    expect(layout.intro.left,viewport.name).toBeGreaterThanOrEqual(0);
    expect(layout.intro.right,viewport.name).toBeLessThanOrEqual(viewport.width+1);
    expect(Math.abs(layout.intro.left-(viewport.width-layout.intro.right)),viewport.name).toBeLessThanOrEqual(2);
    expect(layout.tiny,viewport.name).toBe(0);
    await capture(page,`responsive-${viewport.name}-opening.png`);
  }
});

test("web responsive setup shells keep navigation readable and centered",async({page},testInfo)=>{
  test.skip(testInfo.project.name!=="mobile-chromium","source-web mobile device matrix");
  for(const viewport of [
    {width:360,height:800,name:"small-mobile"},
    {width:390,height:844,name:"compact-mobile"},
    {width:414,height:896,name:"iphone-xr"},
    {width:430,height:932,name:"mobile"},
    {width:768,height:1024,name:"tablet"},
    {width:1024,height:768,name:"landscape"},
  ]){
    await page.setViewportSize({width:viewport.width,height:viewport.height});
    await reset(page);
    await page.goto(`/?web-${viewport.name}-visual-qa=1`,{waitUntil:"domcontentloaded"});
    await expect(page.locator("#startBtn")).toBeVisible();
    const landing=await page.locator("#introLand").evaluate((element:HTMLElement)=>({
      overflow:document.documentElement.scrollWidth-innerWidth,
      left:element.getBoundingClientRect().left,
      right:innerWidth-element.getBoundingClientRect().right,
    }));
    const setupFlow=await page.evaluate(()=>{
      const rect=(selector:string)=>document.querySelector<HTMLElement>(selector)!.getBoundingClientRect();
      const chair=rect("#chairpick"),country=rect("#countryPick"),start=rect(".v7-cta-stack");
      return{
        startPosition:getComputedStyle(document.querySelector<HTMLElement>(".v7-cta-stack")!).position,
        followsChair:start.top>=chair.bottom-1,
        followsCountry:start.top>=country.bottom-1,
      };
    });
    expect(landing.overflow).toBeLessThanOrEqual(1);
    expect(Math.abs(landing.left-landing.right)).toBeLessThanOrEqual(2);
    expect(setupFlow.startPosition).toBe("static");
    expect(setupFlow.followsChair).toBe(true);
    expect(setupFlow.followsCountry).toBe(true);
    await capture(page,`responsive-${viewport.name}-opening.png`);
  }
});

test("source-web hub routes stay bounded and keep every primary action visible",async({page},testInfo)=>{
  test.skip(testInfo.project.name!=="mobile-chromium","source-web responsive hub matrix");
  for(const viewport of [
    {width:360,height:800,name:"small-mobile"},
    {width:390,height:844,name:"compact-mobile"},
    {width:414,height:896,name:"iphone-xr"},
    {width:430,height:932,name:"mobile"},
    {width:768,height:1024,name:"tablet"},
    {width:1024,height:768,name:"landscape"},
  ]){
    await page.setViewportSize({width:viewport.width,height:viewport.height});
    await reset(page);
    await page.goto(`/?web-hub-${viewport.name}-visual-qa=1`,{waitUntil:"domcontentloaded"});
    await page.waitForFunction(()=>[...document.styleSheets].some(sheet=>sheet.href?.includes("/webOnly.css")));
    await page.evaluate(async()=>{
      const game=globalThis as any;
      game.CopaMobileShell.newRun();
      await game.quickStart();
      if(game._countryDraftPromise)await game._countryDraftPromise;
      await game.quickAll();
    });
    await page.locator("#postClubName").fill("Responsive QA");
    await page.evaluate(()=>{
      const game=globalThis as any;
      game.pcGo();
      game.fastTournamentDraw();
      game.finishTournamentDraw();
      game.setCaptain(0);
      game.closeModal();
      game.CopaClubFiles.select("debt");
    });
    await expect(page.locator("#hub")).toBeVisible();
    const coachmark=page.locator(".copa-coachmark");
    if(await coachmark.isVisible())await coachmark.locator(".copa-coachmark-ok").click();

    await page.locator('#nativeHubNav [data-native-target="match"]').click();
    const match=await page.evaluate(()=>{
      const actionRoot=document.querySelector<HTMLElement>(".mobile-action-dock .actionbtns")
        ||document.querySelector<HTMLElement>(".hub-action-panel .actionbtns")!;
      const buttons=[...actionRoot.querySelectorAll<HTMLElement>("button")].filter(button=>button.offsetParent);
      const navIcons=[...document.querySelectorAll<SVGElement>("#nativeHubNav .hub-tab-svg")];
      const feed=document.querySelector<HTMLElement>("#feedwrap")!;
      const tournament=document.querySelector<HTMLElement>("#tournamentHubPanel")!;
      const pitch=document.querySelector<HTMLElement>(".pitch-area")!;
      const president=document.querySelector<HTMLElement>("#presBtn")!;
      return{
        overflow:document.documentElement.scrollWidth-innerWidth,
        leakedMarket:!!document.querySelector<HTMLElement>("#shopLbl")?.offsetParent,
        actionWidth:actionRoot.getBoundingClientRect().width,
        parentWidth:actionRoot.parentElement!.getBoundingClientRect().width,
        clipped:buttons.filter(button=>button.scrollWidth>button.clientWidth+1).map(button=>button.id),
        tiny:buttons.filter(button=>button.getBoundingClientRect().height<44).map(button=>button.id),
        presidentLabel:getComputedStyle(president,"::after").content,
        presidentSpans:[...president.querySelectorAll("span")].filter(span=>(span as HTMLElement).offsetParent).length,
        navIconCount:navIcons.length,
        malformedNavIcons:navIcons.filter(icon=>{
          const rect=icon.getBoundingClientRect(),style=getComputedStyle(icon);
          return rect.width<16||rect.height<16||style.fill!=="none";
        }).length,
        feedVisible:!!feed.offsetParent,
        feedHeight:feed.getBoundingClientRect().height,
        feedAfterPitch:feed.getBoundingClientRect().top>=pitch.getBoundingClientRect().bottom-1,
        feedAfterTournament:!tournament.offsetParent||feed.getBoundingClientRect().top>=tournament.getBoundingClientRect().bottom-1,
      };
    });
    expect(match.overflow,viewport.name).toBeLessThanOrEqual(1);
    expect(match.leakedMarket,viewport.name).toBe(false);
    expect(match.actionWidth,viewport.name).toBeGreaterThan(match.parentWidth*.88);
    expect(match.clipped,viewport.name).toEqual([]);
    expect(match.tiny,viewport.name).toEqual([]);
    expect(match.presidentSpans,viewport.name).toBe(1);
    expect(match.navIconCount,viewport.name).toBe(5);
    expect(match.malformedNavIcons,viewport.name).toBe(0);
    expect(match.feedVisible,viewport.name).toBe(true);
    expect(match.feedHeight,viewport.name).toBeGreaterThanOrEqual(80);
    expect(match.feedAfterPitch,viewport.name).toBe(true);
    expect(match.feedAfterTournament,viewport.name).toBe(true);
    if(viewport.width<=760)expect(["none","normal",'""']).toContain(match.presidentLabel);
    await capture(page,`responsive-${viewport.name}-match.png`);
    await page.locator("#feedwrap").scrollIntoViewIfNeeded();
    const feedViewport=await page.locator("#feedwrap").evaluate((feed:HTMLElement)=>{
      const rect=feed.getBoundingClientRect();
      return{top:rect.top,bottom:rect.bottom,viewportHeight:innerHeight};
    });
    expect(feedViewport.top,viewport.name).toBeGreaterThanOrEqual(-1);
    expect(feedViewport.bottom,viewport.name).toBeLessThanOrEqual(feedViewport.viewportHeight+1);
    await capture(page,`responsive-${viewport.name}-match-bottom.png`);
    await page.locator("#nativeHubNav").scrollIntoViewIfNeeded();

    await page.locator('#nativeHubNav [data-native-target="market"]').click();
    await expect(page.locator("#shopcards>.cardtile")).toHaveCount(3);
    await expect(page.locator("#freeAgentRow .free-agent-card")).toHaveCount(4);
    await capture(page,`responsive-${viewport.name}-market.png`);
    const market=await page.evaluate(()=>({
      overflow:document.documentElement.scrollWidth-innerWidth,
      cards:[...document.querySelectorAll<HTMLElement>("#shopcards>.cardtile,#freeAgentRow .free-agent-card")]
        .filter(card=>card.offsetParent)
        .map(card=>{const rect=card.getBoundingClientRect();return{left:rect.left,right:rect.right,width:rect.width};}),
    }));
    expect(market.overflow,viewport.name).toBeLessThanOrEqual(1);
    expect(market.cards.length,viewport.name).toBeGreaterThanOrEqual(4);
    expect(
      market.cards.every(card=>card.left>=-1&&card.right<=viewport.width+1&&card.width>=140),
      `${viewport.name}: ${JSON.stringify(market.cards)}`,
    ).toBe(true);

    await page.locator('#nativeHubNav [data-native-target="training"]').click();
    await expect(page.locator("#mobileTrainingRoute")).toBeVisible();
    const trainingCta=page.locator("#mobileTrainingRoute .bact .btn").first();
    await trainingCta.scrollIntoViewIfNeeded();
    await capture(page,`responsive-${viewport.name}-training.png`);
    const training=await page.evaluate(()=>{
      const route=document.querySelector<HTMLElement>("#mobileTrainingRoute")!;
      const cta=[...route.querySelectorAll<HTMLElement>(".bact .btn")].find(button=>button.offsetParent)!,rect=cta.getBoundingClientRect();
      const drills=[...route.querySelectorAll<HTMLElement>(".prep-drill")];
      const routeRect=route.getBoundingClientRect();
      return{
        overflow:document.documentElement.scrollWidth-innerWidth,
        routeOverflow:route.scrollWidth-route.clientWidth,
        routeTop:routeRect.top,
        routeBottom:routeRect.bottom,
        visibleDrills:drills.filter(drill=>drill.offsetParent).length,
        totalDrills:drills.length,
        cta:{left:rect.left,right:rect.right,bottom:rect.bottom,height:rect.height},
      };
    });
    expect(training.overflow,viewport.name).toBeLessThanOrEqual(1);
    expect(training.routeOverflow,viewport.name).toBeLessThanOrEqual(1);
    expect(training.cta.left,viewport.name).toBeGreaterThanOrEqual(-1);
    expect(training.cta.right,viewport.name).toBeLessThanOrEqual(viewport.width+1);
    expect(training.cta.height,viewport.name).toBeGreaterThanOrEqual(44);
    expect(training.cta.bottom-training.cta.height,viewport.name).toBeGreaterThanOrEqual(training.routeTop-1);
    expect(training.cta.bottom,viewport.name).toBeLessThanOrEqual(training.routeBottom+1);
    expect(training.visibleDrills,viewport.name).toBe(training.totalDrills);
    expect(training.totalDrills,viewport.name).toBeGreaterThanOrEqual(7);

    await page.locator('#nativeHubNav [data-native-target="career"]').click();
    await expect(page.locator("#mobileCareerRoute")).toBeVisible();
    const career=await page.evaluate(()=>{
      const tabs=[...document.querySelectorAll<HTMLElement>(".mobile-career-tabs button")];
      return{
        overflow:document.documentElement.scrollWidth-innerWidth,
        hidden:tabs.filter(tab=>{const rect=tab.getBoundingClientRect();return rect.left<0||rect.right>innerWidth;}).map(tab=>tab.textContent),
      };
    });
    expect(career.overflow,viewport.name).toBeLessThanOrEqual(1);
    expect(career.hidden,viewport.name).toEqual([]);
    await capture(page,`responsive-${viewport.name}-career.png`);
  }
});
