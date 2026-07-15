import { test, expect } from "@playwright/test";

const GAME_URL="http://127.0.0.1:5500/?autotest=1";
const startDraft=async(page:any)=>{
  await page.goto(GAME_URL,{waitUntil:"domcontentloaded"});
  await page.evaluate(()=>{(globalThis as any).quickStart();});
  await expect(page.locator("#draft")).toBeVisible();
};
const chooseOne=async(page:any)=>{
  await page.evaluate(()=>{(globalThis as any).roll();});
  await expect(page.locator("#optstage")).toBeVisible();
  await page.evaluate(()=>{const w=globalThis as any;w.choose(0);w.choose(0);});
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
    await page.evaluate(()=>{(globalThis as any).pcGo();});
    await expect(page.locator("#hub")).toBeVisible();
    await page.reload({waitUntil:"domcontentloaded"});
    await expect(page.locator("#hub")).toBeVisible();
    state=await page.evaluate(()=>{const w=globalThis as any;return{filled:w.picksBySlot.filter(Boolean).length,complete:w.hasCompleteStartingXI(),phase:w.CopaRunState.phase};});
    expect(state).toEqual({filled:11,complete:true,phase:"hub"});
  });

  test("an incomplete XI cannot kick off",async({page})=>{
    await startDraft(page);await page.evaluate(()=>{(globalThis as any).quickAll();});
    await expect(page.locator("#postClubName")).toBeVisible();await page.locator("#postClubName").fill("Guard FK");await page.evaluate(()=>{(globalThis as any).pcGo();});
    await expect(page.locator("#hub")).toBeVisible();
    const phase=await page.evaluate(()=>{const w=globalThis as any;w.picksBySlot[2]=null;w.playMatch();return w.CopaRunState.phase;});
    expect(phase).toBe("hub");await expect(page.locator("#modal")).toContainText(/Kadro tamamlanmadı|Squad incomplete/);
  });
});
