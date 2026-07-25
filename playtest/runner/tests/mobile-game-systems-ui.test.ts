import {test,expect} from "@playwright/test";
import path from "node:path";
import fs from "node:fs";

const visualDir=path.resolve(__dirname,"../../../outputs/ui-visuals");
const mobileOnly=(name:string)=>name==="mobile-chromium";
const reset=async(page:any)=>{
  await page.addInitScript(()=>{
    for(const key of ["copa_run_v6","copa_run_v6_last_good","copa_run_v5","copa_run_v5_last_good"])localStorage.removeItem(key);
    sessionStorage.removeItem("copa_run");
  });
};
const capture=async(page:any,name:string)=>{
  fs.mkdirSync(visualDir,{recursive:true});
  await page.screenshot({path:path.join(visualDir,name),fullPage:true});
};
const reachDraw=async(page:any)=>{
  await page.evaluate(async()=>{const game=globalThis as any;game.CopaMobileShell.newRun();await game.quickStart();if(game._countryDraftPromise)await game._countryDraftPromise;await game.quickAll();});
  await expect(page.locator("#postClubName")).toBeVisible();
  await page.locator("#postClubName").fill("Mobil Test FK");
  await page.evaluate(()=>(globalThis as any).pcGo());
  await expect(page.locator("#tournamentDraw")).toBeVisible();
};

test("native landing and three-step setup read as a mobile game",async({page},testInfo)=>{
  test.skip(!mobileOnly(testInfo.project.name),"native phone presentation");
  await reset(page);
  await page.goto("/?native-game=1&visual=landing",{waitUntil:"domcontentloaded"});
  const landing=page.locator("#mobileGameLanding");
  await expect(landing).toBeVisible();
  await expect(landing).toContainText("Copa Life");
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  await capture(page,"01-native-landing.png");
  await page.locator('#mobileGameLanding button[onclick*="newRun"]').click();
  await expect(page.locator('#introSetup [data-mobile-step="1"]')).toBeVisible();
  await expect(page.locator('#introSetup [data-mobile-step="2"]')).toBeHidden();
  const next=page.locator("[data-step-next]");
  await expect(next).toHaveCount(1);
  await next.click();
  await expect(page.locator('#introSetup [data-mobile-step="2"]')).toBeVisible();
  await next.click();
  await expect(page.locator('#introSetup [data-mobile-step="3"]')).toBeVisible();
  await expect(page.locator("#startBtn")).toBeVisible();
  await capture(page,"02-native-setup-step3.png");
});

test("Phaser draw ceremony reveals a ball and preserves accessible controls",async({page},testInfo)=>{
  test.skip(!mobileOnly(testInfo.project.name),"native phone presentation");
  await reset(page);
  await page.goto("/?native-game=1&visual=draw",{waitUntil:"domcontentloaded"});
  await reachDraw(page);
  await expect(page.locator("#phaserDrawStage canvas")).toBeVisible({timeout:15_000});
  await expect(page.locator(".td-group")).toHaveCount(4);
  await expect(page.locator(".td-actions .btn-primary")).toBeVisible();
  await capture(page,"03-phaser-draw.png");
  await page.locator(".td-actions .btn-primary").click();
  await expect.poll(()=>page.locator(".td-progress").getAttribute("aria-valuenow")).toBe("1");
  await expect(page.locator("#tournamentDrawLive")).not.toHaveText(/Sıradaki top hazır|Next ball is ready/);
});

test("preparation, mobile routes and locker-room talk are playable",async({page},testInfo)=>{
  test.skip(!mobileOnly(testInfo.project.name),"native phone presentation");
  await reset(page);
  await page.goto("/?native-game=1&visual=systems",{waitUntil:"domcontentloaded"});
  await reachDraw(page);
  await page.evaluate(()=>{const game=globalThis as any;game.fastTournamentDraw();game.finishTournamentDraw();game.setCaptain(0);game.closeModal();});
  await expect(page.locator("#hub")).toBeVisible();
  await expect(page.locator("#nativeHubNav button")).toHaveCount(4);
  await expect(page.locator("#prepBtn")).toBeVisible();
  await page.locator("#prepBtn").click();
  await expect(page.locator(".prep-modal")).toBeVisible();
  await expect(page.locator(".prep-drill")).toHaveCount(7);
  await page.locator('.prep-drill[data-drill="finishing"] [data-prep-level="light"]').click();
  await expect(page.locator("[data-prep-status]")).toContainText(/1 (hazırlık puanı|preparation point)/i);
  await capture(page,"04-preparation-board.png");
  await page.locator(".prep-modal .btn-primary").click();
  await page.locator("#talkBtn").click();
  await expect(page.locator(".locker-room-modal")).toBeVisible();
  await page.locator('[data-talk-target="attack"]').click();
  await page.locator('[data-tone="believe"]').click();
  await expect(page.locator(".locker-result")).toBeVisible();
  await expect(page.locator(".locker-result-chips")).toContainText(/Odak|Focus/);
  await capture(page,"05-locker-room-result.png");
});

test("Phaser penalty canvas keeps ball and keeper directions tied to the core result",async({page},testInfo)=>{
  test.skip(!mobileOnly(testInfo.project.name),"native phone presentation");
  await reset(page);
  await page.goto("/?native-game=1&visual=penalties",{waitUntil:"domcontentloaded"});
  await page.evaluate(()=>{const game=globalThis as any;game.CopaMobileShell.newRun();game.quickStart();game._cheatPenaltyLaunch();});
  await expect(page.locator(".pen-modal")).toBeVisible({timeout:15_000});
  await expect(page.locator("#phaserPenaltyStage canvas")).toBeVisible({timeout:15_000});
  await page.locator('.pen-dir-btn[data-dir="L"]').click();
  const result=await page.evaluate(()=>{const state=(globalThis as any)._penState,reveal=state.reveal;return{type:reveal.type,shot:reveal.shot,keeper:reveal.keeper,consistent:reveal.type!=="save"||reveal.shot===reveal.keeper};});
  expect(result.consistent).toBe(true);
  if(result.type==="save")expect(result.shot).toBe(result.keeper);
  await capture(page,"06-phaser-penalty.png");
});
