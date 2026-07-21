import { test, expect, type Page } from "@playwright/test";

async function prepareCompletedRun(page:Page,path:string){
  const errors:string[]=[];
  page.on("pageerror",error=>errors.push(error.message));
  await page.goto(path,{waitUntil:"domcontentloaded"});
  await page.evaluate(()=>{
    const game=globalThis as any;
    if(game.COPA_IS_NATIVE){
      localStorage.setItem("copa_online_features_onboarding_v1",JSON.stringify({
        version:"online-features-v1",terms:true,matching:false,sharing:false,leaderboard:false,
        action:"test_fixture",accepted_at:new Date().toISOString()
      }));
    }
    game.quickStart();
    game.quickAll();
  });
  await page.locator("#postClubName").fill("Season Visual XI");
  await page.evaluate(()=>{
    const game=globalThis as any;
    game.pcGo();game.fastTournamentDraw();game.finishTournamentDraw();
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

async function prepareShortPenaltyRun(page:Page,path:string){
  const errors:string[]=[];
  page.on("pageerror",error=>errors.push(error.message));
  await page.goto(path,{waitUntil:"domcontentloaded"});
  await page.evaluate(()=>{
    const game=globalThis as any;
    if(game.COPA_IS_NATIVE){
      localStorage.setItem("copa_online_features_onboarding_v1",JSON.stringify({
        version:"online-features-v1",terms:true,matching:false,sharing:false,leaderboard:false,
        action:"test_fixture",accepted_at:new Date().toISOString()
      }));
    }
    game.quickStart();
    game.quickAll();
  });
  await page.locator("#postClubName").fill("DERD");
  await page.evaluate(()=>{
    const game=globalThis as any;
    game.pcGo();game.fastTournamentDraw();game.finishTournamentDraw();
    game.setCaptain(0);
    game.closeModal();
    game.fixtures[0].res="L";
    game.fixtures[0].gf=0;
    game.fixtures[0].ga=0;
    game.fixtures[0].opp="Galatasaray";
    game.fixtures[0].events=[];
    game.round=1;
    game.budget=-28;
    game.cards=[];
    game.econStats={earned:0,spent:60,president:0,injuries:0,worstDebt:-28,finalDebt:0};
    game.endRun(false);
    game.lastResult.power=85;
    game.lastResult.budgetAtEnd=-28;
    game.lastResult.round=1;
    game.lastMatchReportData={penalty:[3,4],homeWon:false};
    game.showSeasonStats();
  });
  await expect(page.locator(".season-stats-modal")).toBeVisible();
  await expect(page.locator(".season-stats-modal")).toHaveClass(/is-short-run/);
  return errors;
}

async function assertSharedLayout(page:Page){
  const modal=page.locator(".season-stats-modal");
  await expect(modal).toBeVisible();
  await expect(modal.locator(".ss-summary-metrics>div")).toHaveCount(3);
  await expect(modal.locator(".ss-tab")).toHaveCount(3);
  await expect(modal.locator(".ss-panel")).toHaveCount(3);
  await expect(modal.locator(".ss-journey-node")).toHaveCount(6);
  await expect(modal.locator(".ss-takeaway")).toHaveCount(1);
  await expect(modal.locator(".ss-kpi,.ss-empty,.ss-insights")).toHaveCount(0);
  await expect(modal.locator('[data-ss-panel="summary"]')).toBeVisible();

  await modal.locator(".ss-journey-node").nth(3).click();
  await expect(modal.locator("#ssJourneyDetail")).toContainText("Rival Four");

  await modal.locator('[data-ss-tab="match"]').click();
  await expect(modal.locator('[data-ss-panel="match"]')).toBeVisible();
  await expect(modal.locator("#ssMatchOpponent")).toHaveText("Rival Four");
  await expect(modal.locator("#ssMatchScore")).toHaveText("3-0");
  await expect(modal.locator(".ss-player-spotlight")).toHaveCount(1);

  await modal.locator('[data-ss-tab="economy"]').click();
  await expect(modal.locator('[data-ss-panel="economy"]')).toBeVisible();
  await expect(modal.locator(".ss-waterfall-bar")).toHaveCount(4);
  await expect(modal.locator('[data-ss-panel="economy"]')).toHaveClass(/is-drawn/);

  await modal.locator('[data-ss-tab="summary"]').click();
  const overflow=await modal.evaluate(element=>{
    const body=element.querySelector(".ss-body") as HTMLElement;
    return{
      horizontal:element.scrollWidth-element.clientWidth,
      bodyHorizontal:body.scrollWidth-body.clientWidth,
      bodyVertical:body.scrollHeight-body.clientHeight,
      height:Math.round(element.getBoundingClientRect().height),
    };
  });
  expect(overflow.horizontal).toBeLessThanOrEqual(2);
  expect(overflow.bodyHorizontal).toBeLessThanOrEqual(2);
  expect(overflow.bodyVertical).toBeLessThanOrEqual(2);
  return overflow;
}

test("PC web season report is a compact progressive recap",async({page},testInfo)=>{
  test.skip(testInfo.project.name!=="desktop-chromium","PC web contract");
  const errors=await prepareCompletedRun(page,"/?season-stats-desktop=1");
  const layout=await assertSharedLayout(page);
  const metricTops=await page.locator(".season-stats-modal .ss-summary-metrics>div").evaluateAll(nodes=>nodes.map(node=>Math.round(node.getBoundingClientRect().top)));
  expect(new Set(metricTops).size).toBe(1);
  expect(layout.height).toBeLessThanOrEqual(670);
  expect(errors).toEqual([]);
});

test("short penalty run removes empty player panels and repeated stats",async({page},testInfo)=>{
  test.skip(testInfo.project.name!=="desktop-chromium","PC short-run contract");
  const errors=await prepareShortPenaltyRun(page,"/?season-stats-short=1");
  const modal=page.locator(".season-stats-modal");
  await expect(modal.locator(".ss-player-spotlight,.ss-empty,.ss-kpi,.ss-insights")).toHaveCount(0);
  await expect(modal.locator(".ss-hero")).toHaveClass(/stat-negative/);
  await expect(modal.locator(".ss-progress-badge")).toHaveText("1/6");
  await expect(modal.locator(".ss-journey-detail")).toContainText(/(?:Pen\.|Pens) 3-4/);
  const layout=await modal.evaluate(element=>{
    const body=element.querySelector(".ss-body") as HTMLElement;
    return{height:Math.round(element.getBoundingClientRect().height),bodyVertical:body.scrollHeight-body.clientHeight};
  });
  expect(layout.height).toBeLessThanOrEqual(560);
  expect(layout.bodyVertical).toBeLessThanOrEqual(2);
  expect(errors).toEqual([]);
});

test("mobile web season report keeps the full journey in one viewport",async({page},testInfo)=>{
  test.skip(testInfo.project.name!=="mobile-chromium","mobile web contract");
  const errors=await prepareCompletedRun(page,"/?season-stats-mobile=1");
  const layout=await assertSharedLayout(page);
  const journey=await page.locator(".season-stats-modal .ss-journey-track").evaluate(element=>({
    scrollWidth:(element as HTMLElement).scrollWidth,
    clientWidth:(element as HTMLElement).clientWidth,
  }));
  expect(journey.scrollWidth).toBeLessThanOrEqual(journey.clientWidth+2);
  expect(layout.height).toBeLessThanOrEqual(700);
  expect(errors).toEqual([]);
});

test("Android package keeps the native-safe compact season recap",async({page},testInfo)=>{
  test.skip(testInfo.project.name!=="mobile-chromium","Android WebView contract");
  const errors=await prepareCompletedRun(page,"/dist-android/index.html?season-stats-android=1");
  await assertSharedLayout(page);
  await expect(page.locator('script[src*="src/data/logos.js"]')).toHaveCount(0);
  expect(await page.evaluate(()=>(globalThis as any).COPA_PLATFORM)).toBe("android");
  expect(errors).toEqual([]);
});

test("iOS package keeps the native-safe compact season recap",async({page},testInfo)=>{
  test.skip(testInfo.project.name!=="webkit-mobile","iOS WKWebView contract");
  const errors=await prepareCompletedRun(page,"/dist-ios/index.html?season-stats-ios=1");
  await assertSharedLayout(page);
  await expect(page.locator('script[src*="src/data/logos.js"]')).toHaveCount(0);
  expect(await page.evaluate(()=>(globalThis as any).COPA_PLATFORM)).toBe("ios");
  expect(errors).toEqual([]);
});

test("season recap is complete in TR, EN, ES, DE and IT",async({page},testInfo)=>{
  test.skip(testInfo.project.name!=="desktop-chromium","one browser is enough for copy coverage");
  await prepareCompletedRun(page,"/?season-stats-locales=1");
  const expected:{[key:string]:{kicker:string,summary:string}}={
    tr:{kicker:"SEZON İSTATİSTİKLERİ",summary:"ÖZET"},
    en:{kicker:"SEASON STATISTICS",summary:"SUMMARY"},
    es:{kicker:"ESTADÍSTICAS DE TEMPORADA",summary:"RESUMEN"},
    de:{kicker:"SAISONSTATISTIK",summary:"ÜBERSICHT"},
    it:{kicker:"STATISTICHE STAGIONALI",summary:"SINTESI"},
  };
  for(const [language,copy] of Object.entries(expected)){
    await page.evaluate(lang=>{
      const game=globalThis as any;
      game.closeModal();
      game.setLang(lang);
      game.showSeasonStats();
    },language);
    const modal=page.locator(".season-stats-modal");
    await expect(modal).toBeVisible();
    await expect(modal.locator(".ss-kicker")).toHaveText(copy.kicker);
    await expect(modal.locator('[data-ss-tab="summary"]')).toHaveText(copy.summary);
    await expect(modal.locator(".ss-panel")).toHaveCount(3);
    const text=await modal.innerText();
    expect(text).not.toMatch(/\b(?:undefined|null|NaN)\b/i);
  }
});
