import { test, expect, type Page } from "@playwright/test";

async function prepareCompletedRun(page:Page,path:string){
  const errors:string[]=[];
  page.on("pageerror",error=>errors.push(error.message));
  await page.goto(path,{waitUntil:"domcontentloaded"});
  await page.evaluate(()=>{
    const game=globalThis as any;
    game.quickStart();
    game.quickAll();
  });
  await page.locator("#postClubName").fill("Season Visual XI");
  await page.evaluate(()=>{
    const game=globalThis as any;
    game.pcGo();
    game.setCaptain(0);
    game.closeModal();
    const scorer=game.picksBySlot.find((player:any)=>player)?.name||"COPA Player";
    const scores=[["W",2,0],["W",4,2],["W",1,0],["W",3,0],["L",1,2]];
    scores.forEach((score,index)=>{
      const fixture=game.fixtures[index];
      fixture.res=score[0];
      fixture.gf=score[1];
      fixture.ga=score[2];
      fixture.opp=["Rival One","Rival Two","Rival Three","Rival Four","Rival Five"][index];
      fixture.events=index<4?[{home:true,type:"goal",name:scorer}]:[];
    });
    game.round=5;
    game.budget=22;
    game.cards=["taraftar"];
    game.benchUsed=1;
    game.econStats={earned:38,spent:45,president:1,injuries:0,worstDebt:-11,finalDebt:0};
    game._finalMVPName=scorer;
    game.endRun(false);
  });
  await expect(page.locator("#result")).toBeVisible();
  await page.evaluate(()=>{(globalThis as any).showSeasonStats();});
  await expect(page.locator(".season-stats-modal")).toBeVisible();
  await expect(page.locator("#seasonStatsStyles")).toHaveCount(1);
  await expect(page.locator(".season-stats-modal")).toHaveClass(/is-ready/);
  return errors;
}

async function assertSharedLayout(page:Page){
  const modal=page.locator(".season-stats-modal");
  await page.waitForTimeout(900);
  await expect(modal).toBeVisible();
  await expect(modal.locator(".ss-kpi")).toHaveCount(4);
  await expect(modal.locator(".ss-journey-node")).toHaveCount(6);
  await expect(modal.locator(".ss-flow-step")).toHaveCount(5);
  await expect(modal.locator(".ss-compare>div")).toHaveCount(2);
  await expect(modal.locator(".ss-insights li")).toHaveCount(3);
  await modal.locator(".ss-journey-node").nth(3).click();
  await expect(modal.locator("#ssJourneyDetail")).toContainText("Rival Four");
  const overflow=await modal.evaluate(element=>({
    horizontal:element.scrollWidth-element.clientWidth,
    bodyHorizontal:(element.querySelector(".ss-body") as HTMLElement).scrollWidth-(element.querySelector(".ss-body") as HTMLElement).clientWidth,
  }));
  expect(overflow.horizontal).toBeLessThanOrEqual(2);
  expect(overflow.bodyHorizontal).toBeLessThanOrEqual(2);
}

test("PC web season report has a dense two-column visual hierarchy",async({page},testInfo)=>{
  test.skip(testInfo.project.name!=="desktop-chromium","PC web contract");
  const errors=await prepareCompletedRun(page,"/?season-stats-desktop=1");
  await assertSharedLayout(page);
  const layout=await page.locator(".season-stats-modal").evaluate(element=>{
    const main=Array.from(element.querySelectorAll(".ss-grid-main>.ss-section")).map(node=>(node as HTMLElement).getBoundingClientRect());
    const kpis=Array.from(element.querySelectorAll(".ss-kpi")).map(node=>(node as HTMLElement).getBoundingClientRect());
    return{mainTop:main.map(rect=>Math.round(rect.top)),kpiTop:kpis.map(rect=>Math.round(rect.top))};
  });
  expect(new Set(layout.mainTop).size).toBe(1);
  expect(new Set(layout.kpiTop).size).toBe(1);
  expect(errors).toEqual([]);
});

test("mobile web season report uses two KPI columns and a scrollable journey",async({page},testInfo)=>{
  test.skip(testInfo.project.name!=="mobile-chromium","mobile web contract");
  const errors=await prepareCompletedRun(page,"/?season-stats-mobile=1");
  await assertSharedLayout(page);
  const layout=await page.locator(".season-stats-modal").evaluate(element=>{
    const main=Array.from(element.querySelectorAll(".ss-grid-main>.ss-section")).map(node=>(node as HTMLElement).getBoundingClientRect());
    const kpis=Array.from(element.querySelectorAll(".ss-kpi")).map(node=>(node as HTMLElement).getBoundingClientRect());
    const journey=element.querySelector(".ss-journey-track") as HTMLElement;
    return{mainTop:main.map(rect=>Math.round(rect.top)),kpiTop:kpis.map(rect=>Math.round(rect.top)),journeyScrollable:journey.scrollWidth>journey.clientWidth};
  });
  expect(new Set(layout.mainTop).size).toBe(2);
  expect(new Set(layout.kpiTop).size).toBe(2);
  expect(layout.journeyScrollable).toBe(true);
  expect(errors).toEqual([]);
});

test("Android package keeps the native-safe mobile season layout",async({page},testInfo)=>{
  test.skip(testInfo.project.name!=="mobile-chromium","Android WebView contract");
  const errors=await prepareCompletedRun(page,"/dist-android/index.html?season-stats-android=1");
  await assertSharedLayout(page);
  await expect(page.locator('script[src*="src/data/logos.js"]')).toHaveCount(0);
  expect(await page.evaluate(()=>(globalThis as any).COPA_PLATFORM)).toBe("android");
  expect(errors).toEqual([]);
});

test("iOS package keeps the native-safe mobile season layout",async({page},testInfo)=>{
  test.skip(testInfo.project.name!=="webkit-mobile","iOS WKWebView contract");
  const errors=await prepareCompletedRun(page,"/dist-ios/index.html?season-stats-ios=1");
  await assertSharedLayout(page);
  await expect(page.locator('script[src*="src/data/logos.js"]')).toHaveCount(0);
  expect(await page.evaluate(()=>(globalThis as any).COPA_PLATFORM)).toBe("ios");
  expect(errors).toEqual([]);
});

test("season report is complete in TR, EN, ES, DE and IT",async({page},testInfo)=>{
  test.skip(testInfo.project.name!=="desktop-chromium","one browser is enough for copy coverage");
  await prepareCompletedRun(page,"/?season-stats-locales=1");
  const expected:{[key:string]:string}={
    tr:"SEZON İSTATİSTİKLERİ",
    en:"SEASON STATISTICS",
    es:"ESTADÍSTICAS DE TEMPORADA",
    de:"SAISONSTATISTIK",
    it:"STATISTICHE STAGIONALI",
  };
  for(const [language,kicker] of Object.entries(expected)){
    await page.evaluate(lang=>{
      const game=globalThis as any;
      game.closeModal();
      game.setLang(lang);
      game.showSeasonStats();
    },language);
    const modal=page.locator(".season-stats-modal");
    await expect(modal).toBeVisible();
    await expect(modal.locator(".ss-kicker")).toHaveText(kicker);
    await expect(modal.locator(".ss-section")).toHaveCount(6);
    const text=await modal.innerText();
    expect(text).not.toMatch(/\b(?:undefined|null|NaN)\b/i);
  }
});
