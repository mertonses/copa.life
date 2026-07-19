import { test, expect } from "@playwright/test";

const GAME_URL="/?autotest=1";
const setupHub=async(page:any)=>{
  await page.goto(GAME_URL,{waitUntil:"domcontentloaded"});
  await page.evaluate(()=>{(globalThis as any).quickStart();(globalThis as any).quickAll();});
  await expect(page.locator("#postClubName")).toBeVisible();
  await page.locator("#postClubName").fill("Lifecycle FK");
  await page.evaluate(()=>{(globalThis as any).pcGo();});
  await expect(page.locator("#hub")).toBeVisible();
};

test.describe("run lifecycle and recovery",()=>{
  test("play styles expose their real tradeoffs and use the rebalanced weather effects",async({page})=>{
    await page.goto(GAME_URL,{waitUntil:"domcontentloaded"});
    await page.evaluate(()=>{(globalThis as any).setLang("tr");(globalThis as any).normalStart();});
    await expect(page.locator('[data-style="gegen"] .ssd')).toContainText("+%3,5");
    await expect(page.locator('[data-style="kontra"] .ssd')).toContainText("yağmurda +1");
    await expect(page.locator('[data-style="tiki"] .ssd')).toContainText("yağmurda -1");
    const balance=await page.evaluate(()=>{
      style="kontra";currentWeather={id:"rain"};const counterRain=weatherPowerBonus();
      currentWeather={id:"wind"};const counterWind=weatherPowerBonus();
      style="tiki";currentWeather={id:"rain"};const possessionRain=weatherPowerBonus();
      currentWeather={id:"wind"};const possessionWind=weatherPowerBonus();
      style="gegen";currentWeather={id:"sun"};const gegenRisk=injuryRiskFor(70);
      style="tiki";const baselineRisk=injuryRiskFor(70);
      return{counterRain,counterWind,possessionRain,possessionWind,injuryRiskDelta:Number((gegenRisk-baselineRisk).toFixed(3))};
    });
    expect(balance).toEqual({counterRain:1,counterWind:0,possessionRain:-1,possessionWind:0,injuryRiskDelta:.035});
  });

  test("complete run traverses hub, match, reward and result phases",async({page})=>{
    await setupHub(page);
    for(let expectedRound=2;expectedRound<=6;expectedRound++){
      const reward=await page.evaluate(()=>{const w=globalThis as any;const moved=w.CopaRunState.transition("match",{reason:"browser_lifecycle_test"});if(!moved.ok)return moved;w.showRewardChoice();return{ok:true,phase:w.CopaRunState.phase};});
      expect(reward).toEqual({ok:true,phase:"reward"});
      await expect(page.locator("#modal")).toBeVisible();
      await page.evaluate(()=>{(globalThis as any).finishRoundReward("cash");});
      await expect(page.locator("#hub")).toBeVisible();
      const state=await page.evaluate(()=>{const w=globalThis as any;return{round:w.round,phase:w.CopaRunState.phase,complete:w.hasCompleteStartingXI()};});
      expect(state).toEqual({round:expectedRound,phase:"hub",complete:true});
    }
    await page.evaluate(()=>{(globalThis as any).endRun(true,"2–1");});
    await expect(page.locator("#result")).toBeVisible();
    const result=await page.evaluate(()=>{const w=globalThis as any;return{phase:w.CopaRunState.phase,ended:w.runEnded,won:w.lastResult&&w.lastResult.won,save:localStorage.getItem("copa_run_v5")};});
    expect(result).toEqual({phase:"result",ended:true,won:true,save:null});
  });

  test("reload during reward returns to the last safe hub checkpoint",async({page})=>{
    await setupHub(page);
    expect(await page.evaluate(()=>JSON.parse(localStorage.getItem("copa_run_v5")||"null")?.phase)).toBe("hub");
    await page.evaluate(()=>{const w=globalThis as any;w.CopaRunState.transition("match",{reason:"reload_test"});w.showRewardChoice();});
    await expect(page.locator("#modal")).toBeVisible();
    await page.reload({waitUntil:"domcontentloaded"});
    await expect(page.locator("#hub")).toBeVisible();
    expect(await page.evaluate(()=>({phase:(globalThis as any).CopaRunState.phase,round:(globalThis as any).round}))).toEqual({phase:"hub",round:1});
  });

  test("corrupt primary checkpoint falls back without losing the run",async({page})=>{
    await setupHub(page);
    await page.evaluate(()=>{const w=globalThis as any;w._saveState();w._saveState();localStorage.setItem("copa_run_v5","{broken");});
    await page.reload({waitUntil:"domcontentloaded"});
    await expect(page.locator("#hub")).toBeVisible();
    expect(await page.evaluate(()=>({phase:(globalThis as any).CopaRunState.phase,complete:(globalThis as any).hasCompleteStartingXI()}))).toEqual({phase:"hub",complete:true});
  });

  test("installed game shell reopens offline",async({page},testInfo)=>{
    test.skip(testInfo.project.name!=="mobile-chromium","Offline PWA coverage runs once.");
    await page.goto(GAME_URL,{waitUntil:"domcontentloaded"});
    await page.evaluate(()=>navigator.serviceWorker.ready);
    if(!await page.evaluate(()=>!!navigator.serviceWorker.controller))await page.reload({waitUntil:"domcontentloaded"});
    await expect.poll(()=>page.evaluate(()=>!!navigator.serviceWorker.controller)).toBe(true);
    await expect.poll(()=>page.evaluate(async()=>!!(await caches.match(location.href,{ignoreSearch:true})))).toBe(true);
    await page.context().setOffline(true);
    await page.reload({waitUntil:"domcontentloaded"});
    await expect(page.locator("#intro")).toBeVisible();
    await page.context().setOffline(false);
  });
});
