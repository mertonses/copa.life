import {test,expect} from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const visualDir=path.resolve(__dirname,"../../../outputs/ui-visuals");

async function openMatchReadyHub(page:any,packaged:boolean){
  await page.addInitScript(()=>{
    localStorage.clear();
    localStorage.setItem("copa_match_presentation","quick");
    localStorage.setItem("copa_online_features_onboarding_v1",JSON.stringify({
      version:"online-features-v1",terms:true,matching:false,sharing:false,leaderboard:false,
      action:"match_presentation_qa",accepted_at:new Date().toISOString(),
    }));
  });
  await page.goto(packaged?"/dist-android/index.html?match-presentation-qa=1":"/?match-presentation-qa=1",{waitUntil:"domcontentloaded"});
  await page.evaluate(async()=>{
    const game=globalThis as any;
    game.setLang("tr");
    game.CopaMobileShell.newRun();
    await game.quickStart();
    if(game._countryDraftPromise)await game._countryDraftPromise;
    await game.quickAll();
  });
  await page.locator("#postClubName").fill("Sunum FK");
  await page.evaluate(()=>{
    const game=globalThis as any;
    game.pcGo();
    game.fastTournamentDraw();
    game.finishTournamentDraw();
    game.setCaptain(0);
    game.closeModal();
    game.CopaClubFiles.select("debt");
    game.eventSeen[game.round]="done";
    game.pendingChairmanEvent=null;
    game._matchPresentationDurationOverride=8_000;
  });
  await expect(page.locator("#hub")).toBeVisible();
}

test("clear match-risk summary remains a single line at compact widths",async({page})=>{
  await page.setViewportSize({width:540,height:380});
  await page.goto("/?match-risk-clear-line=1",{waitUntil:"domcontentloaded"});
  await page.evaluate(()=>{
    const game=globalThis as any;
    game.setLang("tr");
    game.riskSummary=()=>[];
    game.showMatchModePicker(80);
  });
  const clear=page.locator(".match-mode-clear");
  await expect(clear).toContainText("Belirgin risk yok");
  const layout=await clear.locator("b").evaluate((label:HTMLElement)=>{
    const range=document.createRange();
    range.selectNodeContents(label);
    return{
      lines:range.getClientRects().length,
      whiteSpace:getComputedStyle(label).whiteSpace,
      overflow:label.scrollWidth-label.clientWidth
    };
  });
  expect(layout).toEqual({lines:1,whiteSpace:"nowrap",overflow:0});
});

test("MAÇA ÇIK always asks for presentation and WATCH reuses final UI inside the modal",async({page},testInfo)=>{
  const packaged=testInfo.project.name==="mobile-chromium";
  test.skip(!["mobile-chromium","desktop-chromium"].includes(testInfo.project.name),"visual QA runs on Chromium phone and web");
  await openMatchReadyHub(page,packaged);
  fs.mkdirSync(visualDir,{recursive:true});

  await page.locator("#playBtn").click();
  await expect(page.locator(".match-mode-modal")).toBeVisible();
  await expect(page.getByRole("button",{name:/İZLE/})).toBeVisible();
  await expect(page.getByRole("button",{name:/HIZLI OYNA/})).toBeVisible();
  const modeLayout=await page.locator(".match-mode-options").evaluate(element=>{
    const root=element as HTMLElement;
    const bounds=root.getBoundingClientRect();
    const buttons=[...root.querySelectorAll<HTMLElement>("button")].map(button=>{
      const rect=button.getBoundingClientRect();
      return{left:rect.left,right:rect.right,width:rect.width,height:rect.height};
    });
    return{bounds:{left:bounds.left,right:bounds.right},buttons};
  });
  expect(modeLayout.buttons).toHaveLength(2);
  expect(Math.abs(modeLayout.buttons[0].width-modeLayout.buttons[1].width)).toBeLessThanOrEqual(1);
  expect(modeLayout.buttons.every(button=>button.height>=44)).toBe(true);
  expect(modeLayout.buttons.every(button=>button.left>=modeLayout.bounds.left-1&&button.right<=modeLayout.bounds.right+1)).toBe(true);
  await page.screenshot({path:path.join(visualDir,packaged?"android-match-mode-picker.png":"web-match-mode-picker.png"),fullPage:true});

  await page.getByRole("button",{name:/İZLE/}).click();
  await expect(page.locator(".normal-match-live-sheet")).toBeVisible();
  await expect(page.locator("#modal #sim.normal-match-popup")).toBeVisible();
  await expect(page.locator("#modal #simEventMap svg")).toBeVisible();
  await expect(page.locator("#modal #simTimeline svg")).toBeVisible();
  await expect(page.locator("#modal #sim .board")).toBeVisible();
  await expect(page.locator("#modal #simBroadcastState")).toBeVisible();
  await expect(page.locator("#modal #simBroadcastStateText")).not.toHaveText("—");

  const layout=await page.evaluate(()=>{
    const modal=document.querySelector<HTMLElement>(".normal-match-live-sheet")!;
    const sim=document.querySelector<HTMLElement>("#modal #sim")!;
    const footer=document.querySelector<HTMLElement>(".normal-match-live-shell>footer")!;
    return{
      horizontalOverflow:document.documentElement.scrollWidth-innerWidth,
      modal:{left:modal.getBoundingClientRect().left,right:modal.getBoundingClientRect().right,top:modal.getBoundingClientRect().top,bottom:modal.getBoundingClientRect().bottom},
      simWidth:sim.scrollWidth-sim.clientWidth,
      footerBottom:footer.getBoundingClientRect().bottom,
      viewport:{width:innerWidth,height:innerHeight},
    };
  });
  expect(layout.horizontalOverflow).toBeLessThanOrEqual(1);
  expect(layout.modal.left).toBeGreaterThanOrEqual(-1);
  expect(layout.modal.right).toBeLessThanOrEqual(layout.viewport.width+1);
  expect(layout.modal.top).toBeGreaterThanOrEqual(-1);
  expect(layout.modal.bottom).toBeLessThanOrEqual(layout.viewport.height+1);
  expect(layout.simWidth).toBeLessThanOrEqual(1);

  const pending=await page.evaluate(()=>{
    const game=globalThis as any;
    return{score:[game.pendingMatchResolution.gf,game.pendingMatchResolution.ga],round:game.pendingMatchResolution.round};
  });
  await page.waitForTimeout(1_100);
  await expect(page.locator("#simClk")).not.toHaveText("00'");
  await page.screenshot({path:path.join(visualDir,packaged?"android-normal-match-live-popup.png":"web-normal-match-live-popup.png"),fullPage:true});

  await page.getByRole("button",{name:/SONUCA GEÇ/}).click();
  await expect(page.locator(".tele")).toBeVisible();
  const result=await page.locator(".tscore .tn").allTextContents();
  expect(result.map(Number)).toEqual(pending.score);
  await expect(page.locator("#sim")).toBeHidden();
  expect(await page.locator("#modal #sim").count()).toBe(0);
  expect(await page.locator("#sim").evaluate(node=>node.parentElement?.id)).not.toBe("modal");
});
