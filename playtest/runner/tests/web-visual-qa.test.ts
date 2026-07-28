import {test,expect} from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const visualDir=path.resolve(__dirname,"../../../outputs/ui-visuals/web-only");

const capture=async(page:any,name:string)=>{
  fs.mkdirSync(visualDir,{recursive:true});
  await page.screenshot({path:path.join(visualDir,name),fullPage:true});
};

const reset=async(page:any)=>{
  await page.addInitScript(()=>{
    for(const key of ["copa_run_v6","copa_run_v6_last_good","copa_run_v5","copa_run_v5_last_good"])localStorage.removeItem(key);
    sessionStorage.removeItem("copa_run");
  });
};

test("wide web surfaces remain readable and use the available canvas",async({page},testInfo)=>{
  test.skip(testInfo.project.name!=="desktop-chromium","web-only desktop visual pass");
  await reset(page);
  await page.goto("/?web-visual-qa=1",{waitUntil:"domcontentloaded"});
  await expect(page.locator("#startBtn")).toBeVisible();
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
  }));
  expect(drawLayout.visibleWidth).toBeGreaterThan(650);
  expect(drawLayout.firstFour).toBe(true);

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
    const labels=[...document.querySelectorAll<HTMLElement>(".hub-stat-row .mh")];
    return{
      panelWidth:panel.getBoundingClientRect().width,
      sideWidth:side.getBoundingClientRect().width,
      smallestMetric:Math.min(...labels.map(label=>parseFloat(getComputedStyle(label).fontSize))),
      clippedActions:[...panel.querySelectorAll<HTMLElement>("button span")]
        .filter(label=>label.scrollWidth>label.clientWidth+1).map(label=>label.textContent?.trim()),
      pageOverflow:document.documentElement.scrollWidth-innerWidth,
      documentHeight:document.documentElement.scrollHeight,
      viewportHeight:innerHeight,
      cupRoadBottom:cupRoad?.getBoundingClientRect().bottom||0,
    };
  });
  expect(matchLayout.panelWidth).toBeGreaterThan(matchLayout.sideWidth*.9);
  expect(matchLayout.sideWidth).toBeGreaterThanOrEqual(330);
  expect(matchLayout.clippedActions).toEqual([]);
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
      feedVisible:!!document.querySelector<HTMLElement>(".feedwrap")?.offsetParent,
      pageOverflow:document.documentElement.scrollWidth-innerWidth,
    };
  });
  expect(Math.min(...marketLayout.cardWidths),JSON.stringify(marketLayout)).toBeGreaterThanOrEqual(280);
  expect(Math.min(...marketLayout.agentWidths)).toBeGreaterThanOrEqual(280);
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

  await page.locator('#nativeHubNav [data-native-target="career"]').click();
  await expect(page.locator("#mobileCareerRoute")).toBeVisible();
  const surfaceContract=await page.evaluate(()=>{
    const game=globalThis as any;
    game.CopaSurfaceContract.audit();
    return game.CopaSurfaceContract.report();
  });
  expect(surfaceContract.candidates).toBeGreaterThan(20);
  expect(surfaceContract.transparent).toEqual([]);
  await capture(page,"07-career.png");
});

test("web mobile and tablet shells keep navigation readable and centered",async({page},testInfo)=>{
  test.skip(testInfo.project.name!=="mobile-chromium","source-web mobile device matrix");
  for(const viewport of [{width:430,height:932,name:"mobile"},{width:768,height:1024,name:"tablet"}]){
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
    await capture(page,viewport.name==="mobile"?"08-mobile-opening.png":"09-tablet-opening.png");
  }
});
