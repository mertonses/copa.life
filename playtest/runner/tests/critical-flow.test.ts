import { test, expect } from "@playwright/test";

const GAME_URL="http://127.0.0.1:5500/?autotest=1";
const startDraft=async(page:any)=>{
  await page.goto(GAME_URL,{waitUntil:"domcontentloaded"});
  await page.evaluate(async()=>{await (globalThis as any).quickStart();});
  await expect(page.locator("#draft")).toBeVisible();
};
const chooseOne=async(page:any)=>{
  await page.evaluate(()=>{(globalThis as any).roll();});
  await expect(page.locator("#optstage")).toBeVisible();
  await page.evaluate(()=>{const w=globalThis as any,i=w.currentOpts.findIndex((player:any)=>!player.hidden);w.choose(i);w.choose(i);});
};

test.describe("critical mobile run integrity",()=>{
  test("double selection fills exactly one slot",async({page})=>{
    await startDraft(page);await chooseOne(page);
    const state=await page.evaluate(()=>{const w=globalThis as any;return{filled:w.picksBySlot.filter(Boolean).length,remaining:w.remaining,phase:w.CopaRunState.phase};});
    expect(state).toEqual({filled:1,remaining:10,phase:"draft"});
  });

  test("draft and hub survive reload without corrupting the XI",async({page})=>{
    await startDraft(page);await chooseOne(page);await page.reload({waitUntil:"domcontentloaded"});
    await expect(page.locator("#draft")).toBeVisible();
    let state=await page.evaluate(()=>{const w=globalThis as any;return{filled:w.picksBySlot.filter(Boolean).length,remaining:w.remaining,phase:w.CopaRunState.phase};});
    expect(state).toEqual({filled:1,remaining:10,phase:"draft"});
    await page.evaluate(()=>{(globalThis as any).quickAll();});
    await expect(page.locator("#postClubName")).toBeVisible();
    await page.locator("#postClubName").fill("Mobile Test FK");
    await page.evaluate(()=>{const w=globalThis as any;w.pcGo();w.fastTournamentDraw();w.finishTournamentDraw();});
    await expect(page.locator("#hub")).toBeVisible();
    await page.reload({waitUntil:"domcontentloaded"});
    await expect(page.locator("#hub")).toBeVisible();
    state=await page.evaluate(()=>{const w=globalThis as any;return{filled:w.picksBySlot.filter(Boolean).length,complete:w.hasCompleteStartingXI(),phase:w.CopaRunState.phase};});
    expect(state).toEqual({filled:11,complete:true,phase:"hub"});
  });

  test("an incomplete XI cannot kick off",async({page})=>{
    await startDraft(page);await page.evaluate(()=>{(globalThis as any).quickAll();});
    await expect(page.locator("#postClubName")).toBeVisible();await page.locator("#postClubName").fill("Guard FK");await page.evaluate(()=>{const w=globalThis as any;w.pcGo();w.fastTournamentDraw();w.finishTournamentDraw();});
    await expect(page.locator("#hub")).toBeVisible();
    const phase=await page.evaluate(()=>{const w=globalThis as any;w.picksBySlot[2]=null;w.playMatch();return w.CopaRunState.phase;});
    expect(phase).toBe("hub");await expect(page.locator("#modal")).toContainText(/Kadro tamamlanmadı|Squad incomplete/);
  });

  test("rewarded ads add at most two persisted draft rerolls",async({page})=>{
    await startDraft(page);
    expect(await page.evaluate(()=>{const w=globalThis as any;return{configured:w.DRAFT_REROLLS,left:w.draftRerollsLeft};})).toEqual({configured:1,left:1});
    await page.evaluate(()=>{const w=globalThis as any;w.roll();w.COPA_IS_NATIVE=true;w.COPA_PLATFORM="android";w.__rewardCalls=0;w.CopaNativeAds={showRewardedReroll:async({runKey}:any)=>{w.__rewardCalls++;return{earned:true,earnedCount:w.__rewardCalls,runKey};}};w.draftRerollsLeft=0;w.draftRewardedRerollsEarned=0;w.renderOpts();});
    const reroll=page.locator("#rerollBtn");
    await expect(reroll).toContainText(/Reklam izle|Watch ad/);
    await reroll.click();
    await page.waitForFunction(()=>{const w=globalThis as any;return w.draftRerollsLeft===1&&w.draftRewardedRerollsEarned===1;});
    await page.evaluate(()=>{const w=globalThis as any;w.rerollOptions();});
    await reroll.click();
    await page.waitForFunction(()=>{const w=globalThis as any;return w.draftRerollsLeft===1&&w.draftRewardedRerollsEarned===2;});
    await page.evaluate(()=>{const w=globalThis as any;w.rerollOptions();});
    await expect(reroll).toBeDisabled();
    const saved=await page.evaluate(()=>{const w=globalThis as any;const run=JSON.parse(localStorage.getItem("copa_run_v6")||"null");return{calls:w.__rewardCalls,left:w.draftRerollsLeft,earned:w.draftRewardedRerollsEarned,saved:run&&run.draft&&run.draft.rewardedRerollsEarned};});
    expect(saved).toEqual({calls:2,left:0,earned:2,saved:2});
  });
});

test("England player pool loads on selection and is ready before draft generation",async({page})=>{
  await page.addInitScript(()=>{localStorage.setItem("copa_country","TR");localStorage.removeItem("copa_run_v5");});
  await page.goto(GAME_URL,{waitUntil:"domcontentloaded"});
  expect(await page.evaluate(()=>Array.isArray((globalThis as any).POOL_EN)&&(globalThis as any).POOL_EN.length)).toBe(0);
  await page.evaluate(()=>{(globalThis as any).pickCountry("ENG");});
  await page.waitForFunction(()=>Array.isArray((globalThis as any).POOL_EN)&&(globalThis as any).POOL_EN.length===2983);
  await page.evaluate(()=>{const w=globalThis as any;w.formName="4-3-3";w.slots=w.FORMATIONS[w.formName];w.style="gegen";w.beginDraft();});
  await expect(page.locator("#draft")).toBeVisible();
  expect(await page.evaluate(()=>({country:(globalThis as any).selectedCountry,pool:(globalThis as any).POOL.length}))).toEqual({country:"ENG",pool:2983});
});

test("country pools stay lazy, load on demand, and restore the saved country synchronously",async({page})=>{
  await page.addInitScript(()=>{if(!localStorage.getItem("_copa_country_lazy_test")){localStorage.setItem("_copa_country_lazy_test","1");localStorage.setItem("copa_country","TR");localStorage.removeItem("copa_run_v5");}});
  await page.goto(GAME_URL,{waitUntil:"domcontentloaded"});
  expect(await page.evaluate(()=>{const w=globalThis as any;return [w.POOL_EN,w.POOL_ES,w.POOL_IT,w.POOL_DE,w.POOL_JP].map((pool:any[])=>pool.length);})).toEqual([0,0,0,0,0]);
  const expected={ES:1061,IT:2656,DE:1206,JP:561};
  for(const [country,count] of Object.entries(expected)){
    await page.evaluate(async(code)=>{await (globalThis as any).CopaLazy.ensureCountryPlayers(code);},country);
    expect(await page.evaluate(code=>(globalThis as any)[`POOL_${code}`].length,country)).toBe(count);
  }
  await page.evaluate(()=>{localStorage.setItem("copa_country","DE");});
  await page.reload({waitUntil:"domcontentloaded"});
  expect(await page.evaluate(()=>{const w=globalThis as any;return {selected:w.selectedCountry,de:w.POOL_DE.length};})).toEqual({selected:"DE",de:1206});
});
