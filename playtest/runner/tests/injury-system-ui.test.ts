import {test,expect} from "@playwright/test";

async function openHub(page:any){
  await page.goto("/?injury-system=1",{waitUntil:"domcontentloaded"});
  await page.evaluate(async()=>{const game=globalThis as any;await game.quickStart();await game.quickAll();});
  await expect(page.locator("#postClubName")).toBeVisible();
  await page.locator("#postClubName").fill("Injury QA");
  await page.evaluate(()=>{const game=globalThis as any;game.pcGo();game.fastTournamentDraw();game.finishTournamentDraw();game.setCaptain(0);game.closeModal();});
  await expect(page.locator("#hub")).toBeVisible();
}

test("injury decision is explicit, priced by severity and cannot be skipped",async({page})=>{
  await openHub(page);
  await page.evaluate(()=>{const game=globalThis as any;game.picksBySlot[0].age=25;game.budget=30;game.assignPlayerInjury(game.picksBySlot[0],1);game.renderHub();});
  const bar=page.locator("#injbar");
  await expect(bar).toBeVisible();
  await expect(bar).toContainText(/Hafif|Mild/);
  await expect(bar.locator(".inj-heal-btn")).toContainText("€3M");
  await expect(bar.locator(".inj-play-btn")).toContainText(/%15|15%/);
  await page.evaluate(()=>{(globalThis as any).playMatch("quick");});
  expect(await page.evaluate(()=>({phase:(globalThis as any).CopaRunState.phase,pending:(globalThis as any).pendingMatchResolution}))).toEqual({phase:"hub",pending:null});
  await bar.locator(".inj-play-btn").click();
  await expect(bar).toBeHidden();
  expect(await page.evaluate(()=>{const game=globalThis as any,p=game.picksBySlot[0];return{decisionRecorded:p.injuryDecisionRound===game.round,playedRecorded:p.injuryPlayedRound===game.round,injured:p.injured};})).toEqual({decisionRecorded:true,playedRecorded:true,injured:true});
});

test("bench replacement keeps injury and resting heals it",async({page})=>{
  await openHub(page);
  const originalId=await page.evaluate(()=>{const game=globalThis as any,p=game.picksBySlot[0];game.assignPlayerInjury(p,1);game.renderHub();return p.playerId;});
  await page.locator("#injbar .inj-bench-btn").click();
  await expect(page.locator(".backup-modal")).toBeVisible();
  await page.locator(".backup-card").first().click();
  await page.locator("#backupApplyBtn").click();
  const substituted=await page.evaluate(id=>{const game=globalThis as any,p=game.bench.find((item:any)=>item.playerId===id);return{injured:p?.injured,remaining:p?.injuryMatchesRemaining,onPitch:game.picksBySlot.some((item:any)=>item?.playerId===id)};},originalId);
  expect(substituted).toEqual({injured:true,remaining:1,onPitch:false});
  await page.evaluate(()=>{const game=globalThis as any;game.resolvePostMatchStateBeforeReward();});
  const recovered=await page.evaluate(id=>{const game=globalThis as any,p=game.bench.find((item:any)=>item.playerId===id);return{injured:p?.injured,remaining:p?.injuryMatchesRemaining,level:p?.injuryLevel};},originalId);
  expect(recovered).toEqual({injured:false,remaining:0,level:0});
});

test("34+ treatment charges the visible surcharge and clears all injury metadata",async({page})=>{
  await openHub(page);
  await page.evaluate(()=>{const game=globalThis as any,p=game.picksBySlot[0];p.age=35;game.budget=30;game.assignPlayerInjury(p,2);game.renderHub();});
  const heal=page.locator("#injbar .inj-heal-btn");
  await expect(heal).toContainText("€6M");
  await expect(heal).toContainText(/34\+/);
  await heal.click();
  await expect(page.locator("#injbar")).toBeHidden();
  expect(await page.evaluate(()=>{const game=globalThis as any,p=game.picksBySlot[0];return{budget:game.budget,injured:p.injured,level:p.injuryLevel,remaining:p.injuryMatchesRemaining,decision:p.injuryDecisionRound,played:p.injuryPlayedRound};})).toEqual({budget:24,injured:false,level:0,remaining:0,decision:0,played:0});
});

test("injury recovery state survives save and reload",async({page})=>{
  await openHub(page);
  const playerId=await page.evaluate(()=>{const game=globalThis as any,p=game.picksBySlot[0];game.assignPlayerInjury(p,3);game._saveState();return p.playerId;});
  await page.reload({waitUntil:"domcontentloaded"});
  await expect(page.locator("#hub")).toBeVisible();
  expect(await page.evaluate(id=>{const game=globalThis as any,p=game.picksBySlot.find((item:any)=>item?.playerId===id);return{injured:p?.injured,level:p?.injuryLevel,remaining:p?.injuryMatchesRemaining};},playerId)).toEqual({injured:true,level:3,remaining:2});
  await expect(page.locator("#injbar")).toBeVisible();
});

test("rewarded treatment is capped at two completed views per run",async({page})=>{
  await openHub(page);
  await page.evaluate(()=>{const game=globalThis as any;Object.defineProperty(game,"CopaAds",{configurable:true,value:{canReward:()=>true,showRewardedInjury:async()=>({earned:true})}});game.assignPlayerInjury(game.picksBySlot[0],2);game.renderHub();});
  const bar=page.locator("#injbar"),reward=bar.locator(".inj-reward-btn");
  await expect(reward).toContainText("2/2");
  await reward.click();
  await expect(bar).toBeHidden();
  await page.evaluate(()=>{const game=globalThis as any;game.assignPlayerInjury(game.picksBySlot[0],2);game.renderHub();});
  await expect(reward).toContainText("1/2");
  await reward.click();
  await expect(bar).toBeHidden();
  await page.evaluate(()=>{const game=globalThis as any;game.assignPlayerInjury(game.picksBySlot[0],2);game.renderHub();});
  await expect(bar).toBeVisible();
  await expect(bar.locator(".inj-reward-btn")).toHaveCount(1);
  await expect(bar.locator(".inj-reward-btn")).toBeDisabled();
  await expect(bar.locator(".inj-reward-btn")).toContainText(/2 hak kullanıldı|2 uses spent/);
  expect(await page.evaluate(()=>(globalThis as any).rewardedInjuryHealsEarned)).toBe(2);
});

test("rewarded treatment stays visible when ads are unavailable",async({page})=>{
  await openHub(page);
  await page.evaluate(()=>{const game=globalThis as any;Object.defineProperty(game,"CopaAds",{configurable:true,value:{canReward:()=>false}});game.assignPlayerInjury(game.picksBySlot[0],2);game.renderHub();});
  const reward=page.locator("#injbar .inj-reward-btn");
  await expect(reward).toBeVisible();
  await expect(reward).toBeDisabled();
  await expect(reward).toContainText(/Hazır değil|Not ready/);
  await expect(reward.locator(".inj-reward-badge")).toContainText(/ÜCRETSİZ|FREE/);
  const visual=await page.locator("#injbar").evaluate((bar:HTMLElement)=>{const reward=getComputedStyle(bar.querySelector(".inj-reward-btn")!),bench=getComputedStyle(bar.querySelector(".inj-bench-btn")!);return{rewardBorder:reward.borderColor,benchBorder:bench.borderColor,rewardBackground:reward.backgroundImage,rewardOpacity:Number(reward.opacity)};});
  expect(visual.rewardBorder).not.toBe(visual.benchBorder);
  expect(visual.rewardBackground).not.toBe("none");
  expect(visual.rewardOpacity).toBeGreaterThanOrEqual(.7);
});

test("desktop bench keeps its pitch overlay position while injury notice is visible",async({page},testInfo)=>{
  test.skip((testInfo.project.use.viewport?.width||0)<981,"desktop overlay contract");
  await openHub(page);
  const bench=page.locator("#hubBenchSection"),pitch=page.locator("#hubPitch");
  const measure=async()=>{const [b,p]=await Promise.all([bench.evaluate((element:HTMLElement)=>{const r=element.getBoundingClientRect();return{top:r.top,right:r.right,width:r.width,position:getComputedStyle(element).position};}),pitch.evaluate((element:HTMLElement)=>{const r=element.getBoundingClientRect();return{top:r.top,right:r.right};})]);return{top:b.top-p.top,right:p.right-b.right,width:b.width,position:b.position};};
  const before=await measure();
  await page.evaluate(()=>{const game=globalThis as any;game.assignPlayerInjury(game.picksBySlot[0],2);game.renderHub();});
  const after=await measure();
  expect(before.position).toBe("absolute");
  expect(after.position).toBe("absolute");
  expect(Math.abs(after.top-before.top)).toBeLessThanOrEqual(1);
  expect(Math.abs(after.right-before.right)).toBeLessThanOrEqual(1);
  expect(Math.abs(after.width-before.width)).toBeLessThanOrEqual(1);
});

test("injury actions remain bounded on phone and desktop",async({page},testInfo)=>{
  await openHub(page);
  await page.evaluate(()=>{const game=globalThis as any;game.assignPlayerInjury(game.picksBySlot[0],3);game.renderHub();});
  const bounds=await page.locator("#injbar").evaluate((bar:HTMLElement)=>({
    overflow:bar.scrollWidth-bar.clientWidth,
    pageOverflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,
    buttons:[...bar.querySelectorAll("button")].map(button=>{const r=button.getBoundingClientRect();return{w:r.width,h:r.height,top:r.top,bottom:r.bottom};}),
    powerCenters:[...bar.querySelectorAll(".inj-power-change > *")].map(item=>{const r=item.getBoundingClientRect();return r.top+r.height/2;})
  }));
  expect(bounds.overflow).toBeLessThanOrEqual(1);
  expect(bounds.pageOverflow).toBeLessThanOrEqual(1);
  expect(bounds.buttons.length).toBe(4);
  expect(bounds.buttons.every(button=>button.w>0&&button.h>=40)).toBe(true);
  expect(Math.max(...bounds.powerCenters)-Math.min(...bounds.powerCenters)).toBeLessThanOrEqual(1);
  await page.screenshot({path:testInfo.outputPath("injury-panel.png"),fullPage:true});
});
