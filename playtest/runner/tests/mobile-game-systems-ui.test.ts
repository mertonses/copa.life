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
const expectSurfaceFit=async(page:any,selector:string)=>{
  const result=await page.locator(selector).evaluate((content:HTMLElement)=>{
    const shell=(content.closest(".sheet")||content) as HTMLElement;
    const rect=shell.getBoundingClientRect();
    const visible=(element:HTMLElement)=>{
      const style=getComputedStyle(element),box=element.getBoundingClientRect();
      return style.display!=="none"&&style.visibility!=="hidden"&&Number(style.opacity)>.1&&box.width>0&&box.height>0;
    };
    const clippedControls=Array.from(content.querySelectorAll<HTMLElement>("button,input,select,textarea,a"))
      .filter(visible)
      .map(element=>({label:(element.innerText||element.getAttribute("aria-label")||"").trim().slice(0,40),rect:element.getBoundingClientRect()}))
      .filter(item=>item.rect.left<-1||item.rect.right>innerWidth+1);
    return{
      shell:{left:rect.left,right:rect.right,top:rect.top,bottom:rect.bottom},
      viewport:{width:innerWidth,height:innerHeight},
      pageOverflow:document.documentElement.scrollWidth-innerWidth,
      clippedControls,
    };
  });
  expect(result.pageOverflow,`${selector} caused horizontal page overflow`).toBeLessThanOrEqual(1);
  expect(result.shell.left,`${selector} escaped the left viewport edge`).toBeGreaterThanOrEqual(-1);
  expect(result.shell.right,`${selector} escaped the right viewport edge`).toBeLessThanOrEqual(result.viewport.width+1);
  expect(result.shell.top,`${selector} escaped the top viewport edge`).toBeGreaterThanOrEqual(-1);
  expect(result.shell.bottom,`${selector} escaped the bottom viewport edge`).toBeLessThanOrEqual(result.viewport.height+1);
  expect(result.clippedControls,`${selector} has horizontally clipped controls`).toEqual([]);
};
const reachDraw=async(page:any)=>{
  await page.evaluate(async()=>{const game=globalThis as any;game.CopaMobileShell.newRun();await game.quickStart();if(game._countryDraftPromise)await game._countryDraftPromise;await game.quickAll();});
  await expect(page.locator("#postClubName")).toBeVisible();
  await expect(page.locator(".pc-insights article")).toHaveCount(3);
  await expect(page.locator(".pc-mini-pitch .pc-mini-player")).toHaveCount(11);
  expect(await page.locator(".pc-warning").count()).toBeGreaterThanOrEqual(1);
  await expectSurfaceFit(page,".postcard");
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
  await expect(landing).toContainText(/COPA LİFE|COPA LIFE/i);
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

test("draft candidates compare three options inside a one-thumb control zone",async({page},testInfo)=>{
  test.skip(!mobileOnly(testInfo.project.name),"native phone presentation");
  await reset(page);
  await page.goto("/?native-game=1&visual=draft-controls",{waitUntil:"domcontentloaded"});
  await page.evaluate(async()=>{const game=globalThis as any;game.CopaMobileShell.newRun();await game.quickStart();if(game._countryDraftPromise)await game._countryDraftPromise;});
  await expect(page.locator("#draftThumbDock")).toBeVisible();
  await expect(page.locator("#draftThumbDock [data-draft-filter]")).toHaveCount(6);
  await expect(page.locator("#draftThumbDock #allBtn")).toBeVisible();
  await expect(page.locator("#draftThumbDock #undoBtn")).toBeHidden();
  await page.locator('[data-draft-filter="FWD"]').click();
  await page.locator("#rollBtn").click();
  await expect(page.locator("#opts .opt")).toHaveCount(3);
  await expect(page.locator("#opts .opt-forecast")).toHaveCount(3);
  expect(await page.evaluate(()=>{const game=globalThis as any;return game.posGroup(game.slots[game.currentSlot][0]);})).toBe("FWD");
  const gallery=await page.locator("#opts").evaluate((element:HTMLElement)=>({overflow:element.scrollWidth-element.clientWidth,pageOverflow:document.documentElement.scrollWidth-innerWidth,columns:getComputedStyle(element).gridAutoColumns}));
  expect(gallery.overflow).toBeGreaterThan(0);
  expect(gallery.pageOverflow).toBeLessThanOrEqual(1);
  await capture(page,"03-draft-candidate-gallery.png");
});

test("Phaser draw ceremony reveals a ball and preserves accessible controls",async({page},testInfo)=>{
  test.skip(!mobileOnly(testInfo.project.name),"native phone presentation");
  await reset(page);
  await page.goto("/?native-game=1&visual=draw",{waitUntil:"domcontentloaded"});
  await reachDraw(page);
  await expect(page.locator("#phaserDrawStage canvas")).toBeVisible({timeout:15_000});
  await expect(page.locator(".td-group")).toHaveCount(8);
  await expect(page.locator(".td-group.is-eligible")).toHaveCount(8);
  await expect(page.locator("[data-hold-draw]")).toContainText(/basılı tut|hold/i);
  await expect(page.locator(".td-actions .btn-primary")).toBeVisible();
  expect(await page.evaluate(()=>getComputedStyle(document.body).overflowY)).toBe("hidden");
  expect(await page.evaluate(()=>getComputedStyle(document.documentElement).overflowY)).toBe("hidden");
  await page.locator("[data-hold-draw]").click();
  await page.waitForTimeout(120);
  await expect(page.locator(".td-progress")).toHaveAttribute("aria-valuenow","0");
  await capture(page,"03-phaser-draw.png");
  await page.locator(".td-actions .btn-primary").click();
  await expect.poll(()=>page.locator(".td-progress").getAttribute("aria-valuenow")).toBe("1");
  await expect(page.locator(".td-transfer-band")).toBeVisible();
  await expect(page.locator(".td-group.is-target")).toHaveCount(1);
  await expect(page.locator("#tournamentDrawLive")).not.toHaveText(/Sıradaki top hazır|Next ball is ready/);
});

test("holding quick draw completes the ceremony and reduced motion stays explicit",async({page},testInfo)=>{
  test.skip(!mobileOnly(testInfo.project.name),"native phone presentation");
  await reset(page);
  await page.goto("/?native-game=1&visual=hold-draw",{waitUntil:"domcontentloaded"});
  await reachDraw(page);
  await page.evaluate(()=>{document.body.classList.add("reduced-motion");const game=globalThis as any;game.CopaTournamentUI.renderDraw(document.getElementById("tournamentDrawApp"),game.tournament,game.CopaTournamentRuntime.copy());});
  await expect(page.locator(".td-motion-note")).toBeVisible();
  const quick=page.locator("[data-hold-draw]");
  await quick.dispatchEvent("pointerdown",{pointerType:"touch",button:0});
  await page.waitForTimeout(760);
  await expect(page.locator(".td-progress")).toHaveAttribute("aria-valuenow","32");
});

test("preparation, mobile routes and locker-room talk are playable",async({page},testInfo)=>{
  test.skip(!mobileOnly(testInfo.project.name),"native phone presentation");
  await reset(page);
  await page.goto("/?native-game=1&visual=systems",{waitUntil:"domcontentloaded"});
  await reachDraw(page);
  await page.evaluate(()=>{const game=globalThis as any;game.fastTournamentDraw();game.finishTournamentDraw();game.setCaptain(0);game.closeModal();});
  await expect(page.locator("#hub")).toBeVisible();
  await expect(page.locator("#nativeHubNav button")).toHaveCount(3);
  const coachmark=page.locator(".copa-coachmark");
  if(await coachmark.isVisible())await coachmark.locator(".copa-coachmark-ok").click();
  await page.locator('#nativeHubNav [data-native-target="match"]').click();
  await expect(page.locator("#hubPitch")).toBeVisible();
  await expect(page.locator("#hubPitch .roundel.full")).toHaveCount(11);
  const actionLayout=await page.locator("#mobileActionDock .actionbtns").evaluate((panel:HTMLElement)=>{
    const controls=["prepBtn","presBtn","talkBtn","playBtn"].map(id=>document.getElementById(id)!.getBoundingClientRect());
    return{
      rows:new Set(controls.map(rect=>Math.round(rect.top))).size,
      panelOverflow:panel.scrollWidth-panel.clientWidth,
      widths:controls.map(rect=>Math.round(rect.width)),
    };
  });
  expect(actionLayout.rows).toBe(1);
  expect(actionLayout.panelOverflow).toBeLessThanOrEqual(1);
  expect(actionLayout.widths.every(width=>width>=44)).toBe(true);
  await expect(page.locator("#prepBtn")).toBeVisible();
  await page.locator("#prepBtn").click();
  await expect(page.locator(".prep-modal")).toBeVisible();
  await expect(page.locator(".prep-drill")).toHaveCount(7);
  await expectSurfaceFit(page,".prep-modal");
  await page.locator('.prep-drill[data-drill="finishing"] [data-prep-level="light"]').click();
  await expect(page.locator("[data-prep-status]")).toContainText(/1 (hazırlık puanı|preparation point)/i);
  await capture(page,"04-preparation-board.png");
  await page.locator(".prep-modal .btn-primary").click();
  await page.locator("#talkBtn").click();
  await expect(page.locator(".locker-room-modal")).toBeVisible();
  await expectSurfaceFit(page,".locker-room-modal");
  await capture(page,"05-locker-room.png");
  await page.locator('[data-talk-target="attack"]').click();
  await page.locator('[data-tone="believe"]').click();
  await expect(page.locator(".locker-result")).toBeVisible();
  await expectSurfaceFit(page,".locker-result");
  await expect(page.locator(".locker-result-chips")).toContainText(/Odak|Focus/);
  await capture(page,"06-locker-room-result.png");
  await page.evaluate(()=>(globalThis as any).closeModal());
  await page.evaluate(async()=>{
    const game=globalThis as any;
    game.setTheme("dark");
    await game.CopaLazy.openMetaProgression();
  });
  await expect(page.locator(".meta-progress-modal")).toBeVisible();
  await expectSurfaceFit(page,".meta-progress-modal");
  await capture(page,"07-club-career-dark.png");
  await page.evaluate(()=>(globalThis as any).setTheme("light"));
  await expect(page.locator("html")).toHaveAttribute("data-theme","light");
  await expectSurfaceFit(page,".meta-progress-modal");
  await capture(page,"08-club-career-light.png");
});

test("Phaser penalty canvas keeps ball and keeper directions tied to the core result",async({page},testInfo)=>{
  test.skip(!mobileOnly(testInfo.project.name),"native phone presentation");
  await reset(page);
  await page.goto("/?native-game=1&visual=penalties",{waitUntil:"domcontentloaded"});
  await page.evaluate(()=>{const game=globalThis as any;game.CopaMobileShell.newRun();game.quickStart();game._cheatPenaltyLaunch();});
  await expect(page.locator(".pen-modal")).toBeVisible({timeout:15_000});
  await expect(page.locator("#phaserPenaltyStage canvas")).toBeVisible({timeout:15_000});
  await expectSurfaceFit(page,".pen-modal");
  const directionLayout=await page.locator(".pen-dir-grid").evaluate((grid:HTMLElement)=>{
    const rects=[...grid.querySelectorAll<HTMLElement>(".pen-dir-btn")].map(button=>button.getBoundingClientRect());
    return{
      columns:getComputedStyle(grid).gridTemplateColumns.split(" ").length,
      rows:new Set(rects.map(rect=>Math.round(rect.top))).size,
      overflow:grid.scrollWidth-grid.clientWidth,
    };
  });
  expect(directionLayout.columns).toBe(3);
  expect(directionLayout.rows).toBe(1);
  expect(directionLayout.overflow).toBeLessThanOrEqual(1);
  await page.locator('.pen-dir-btn[data-dir="L"]').click();
  const result=await page.evaluate(()=>{
    const state=(globalThis as any)._penState,reveal=state.reveal;
    const outcome=document.querySelector<HTMLElement>(".pen-outcome");
    return{
      type:reveal.type,shot:reveal.shot,keeper:reveal.keeper,byUser:reveal.byUser,
      consistent:reveal.type!=="save"||reveal.shot===reveal.keeper,
      favorable:reveal.type==="goal"?!reveal.byUser:!!reveal.byUser,
      outcomeClass:outcome?.className||"",
      outcomeBackground:outcome?getComputedStyle(outcome).backgroundColor:"",
      success:getComputedStyle(document.documentElement).getPropertyValue("--status-success").trim(),
      risk:getComputedStyle(document.documentElement).getPropertyValue("--status-risk").trim(),
    };
  });
  expect(result.consistent).toBe(true);
  if(result.type==="save")expect(result.shot).toBe(result.keeper);
  expect(result.outcomeClass).toContain(result.favorable?"is-positive":"is-negative");
  if(result.favorable)expect(result.outcomeBackground).toBe("rgb(78, 155, 101)");
  else expect(result.outcomeBackground).toBe("rgb(218, 61, 46)");
  await capture(page,"09-phaser-penalty.png");
});

test("native run restart returns to the redesigned Copa Life landing",async({page},testInfo)=>{
  test.skip(!mobileOnly(testInfo.project.name),"native phone presentation");
  await reset(page);
  await page.goto("/?native-game=1&visual=restart-landing",{waitUntil:"domcontentloaded"});
  await page.evaluate(()=>{const game=globalThis as any;game.CopaMobileShell.newRun();game.restart();});
  await expect(page.locator("#mobileGameLanding")).toBeVisible();
  await expect(page.locator("#introSetup")).toBeHidden();
  await expect(page.locator(".mgl-road li")).toHaveCount(4);
  await expect(page.locator(".mgl-brand")).toContainText(/COPA LİFE|COPA LIFE/i);
});

test("web preparation board stays inside its modal shell",async({page})=>{
  await reset(page);
  await page.goto("/?autotest=1&groups=1&visual=prep-fit",{waitUntil:"domcontentloaded"});
  await reachDraw(page);
  await page.evaluate(()=>{const game=globalThis as any;game.fastTournamentDraw();game.finishTournamentDraw();game.setCaptain(0);game.closeModal();game.openPreparation();});
  await expect(page.locator(".prep-modal")).toBeVisible();
  await expect(page.locator(".prep-drill")).toHaveCount(7);
  await expectSurfaceFit(page,".prep-modal");
  const fit=await page.locator(".prep-modal").evaluate((panel:HTMLElement)=>{
    const shell=panel.closest(".sheet") as HTMLElement,panelRect=panel.getBoundingClientRect(),shellRect=shell.getBoundingClientRect();
    return{
      panelOverflow:panel.scrollWidth-panel.clientWidth,
      shellOverflow:shell.scrollWidth-shell.clientWidth,
      panelLeft:panelRect.left,
      panelRight:panelRect.right,
      shellLeft:shellRect.left,
      shellRight:shellRect.right
    };
  });
  expect(fit.panelOverflow).toBeLessThanOrEqual(1);
  expect(fit.shellOverflow).toBeLessThanOrEqual(1);
  expect(fit.panelLeft).toBeGreaterThanOrEqual(fit.shellLeft-1);
  expect(fit.panelRight).toBeLessThanOrEqual(fit.shellRight+1);
});
