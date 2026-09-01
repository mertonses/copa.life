import {test,expect} from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const responsiveVisualDir=path.resolve(__dirname,"../../../artifacts/screenshots/injury-responsive-qa");

async function openHub(page:any,entry="/?injury-system=1"){
  await page.goto(entry,{waitUntil:"domcontentloaded"});
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

test("injury panel stays internally aligned across Android phone, tablet and landscape widths",async({page},testInfo)=>{
  test.skip(testInfo.project.name!=="mobile-chromium","Android responsive matrix");
  test.setTimeout(90_000);
  await page.setViewportSize({width:430,height:932});
  await openHub(page,"/?injury-system=1&responsive-matrix=1");
  await page.locator('link[href*="webOnly.css"]').evaluate((link:HTMLLinkElement)=>link.remove());
  await page.addStyleTag({url:"/src/styles/nativeOnly.css"});
  await page.evaluate(()=>{
    const game=globalThis as any;
    game.COPA_IS_NATIVE=true;
    game.COPA_PLATFORM="android";
    document.documentElement.dataset.copaPlatform="android";
    game.assignPlayerInjury(game.picksBySlot[0],3);
    game.renderHub();
  });
  await expect(page.locator("html")).toHaveAttribute("data-copa-platform","android");
  fs.mkdirSync(responsiveVisualDir,{recursive:true});
  const viewports=[
    {name:"phone-320",width:320,height:720},
    {name:"phone-360",width:360,height:800},
    {name:"phone-393",width:393,height:873},
    {name:"phone-412",width:412,height:915},
    {name:"tablet-600",width:600,height:960},
    {name:"tablet-768",width:768,height:1024},
    {name:"tablet-900",width:900,height:1200},
    {name:"transition-901",width:901,height:1200},
    {name:"transition-978",width:978,height:1200},
    {name:"tablet-landscape-1024",width:1024,height:768},
    {name:"tablet-landscape-1280",width:1280,height:800},
  ];
  for(const viewport of viewports){
    await page.setViewportSize({width:viewport.width,height:viewport.height});
    await page.waitForTimeout(80);
    await page.evaluate(()=>{
      const game=globalThis as any;
      if(typeof game.closeModal==="function")game.closeModal();
      document.documentElement.classList.remove("native-bench-open");
    });
    await page.mouse.move(1,1);
    const bar=page.locator("#injbar");
    await expect(bar,viewport.name).toBeVisible();
    await bar.scrollIntoViewIfNeeded();
    const layout=await bar.evaluate((element:HTMLElement)=>{
      const rect=(node:Element)=>{const value=node.getBoundingClientRect();return{left:value.left,right:value.right,top:value.top,bottom:value.bottom,width:value.width,height:value.height};};
      const barRect=rect(element),summary=rect(element.querySelector(".inj-summary")!),actions=rect(element.querySelector(".inj-btns")!);
      const buttons=[...element.querySelectorAll("button")].map(rect);
      return{
        bar:barRect,
        summary,
        actions,
        buttons,
        barOverflow:element.scrollWidth-element.clientWidth,
        pageOverflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,
      };
    });
    const within=(child:any,parent:any)=>child.left>=parent.left-1&&child.right<=parent.right+1&&child.top>=parent.top-1&&child.bottom<=parent.bottom+1;
    expect(layout.barOverflow,`${viewport.name}: panel overflow`).toBeLessThanOrEqual(1);
    expect(layout.pageOverflow,`${viewport.name}: page overflow`).toBeLessThanOrEqual(1);
    expect(within(layout.summary,layout.bar),`${viewport.name}: summary inside panel`).toBe(true);
    expect(within(layout.actions,layout.bar),`${viewport.name}: actions inside panel`).toBe(true);
    expect(layout.buttons,`${viewport.name}: four actions`).toHaveLength(4);
    expect(layout.buttons.every(button=>within(button,layout.actions)),`${viewport.name}: buttons inside action grid`).toBe(true);
    expect(layout.buttons.every(button=>button.width>0&&button.height>=40),`${viewport.name}: usable actions`).toBe(true);
    if(viewport.width<=1180)expect(layout.actions.top,`${viewport.name}: actions below summary`).toBeGreaterThanOrEqual(layout.summary.bottom-1);
    else expect(layout.actions.left,`${viewport.name}: actions beside summary`).toBeGreaterThanOrEqual(layout.summary.right-1);
    await bar.screenshot({path:path.join(responsiveVisualDir,`${viewport.name}.png`)});
  }
});
