import {test,expect,Page} from "@playwright/test";

async function bootNative(page:Page){
  await page.addInitScript(()=>{
    localStorage.clear();
    localStorage.setItem("copa_online_features_onboarding_v1",JSON.stringify({
      version:"online-features-v1",terms:true,matching:false,sharing:false,leaderboard:false,
      action:"android_scroll_regression",accepted_at:new Date().toISOString(),
    }));
  });
  await page.goto("/dist-android/index.html?android-scroll-regression=1",{waitUntil:"domcontentloaded"});
  await expect(page.locator("html")).toHaveAttribute("data-copa-platform","android");
}

async function physicalSwipe(page:Page,direction:"up"|"down"){
  const session=await page.context().newCDPSession(page);
  // Stay inside the route content and away from the fixed bottom action dock.
  const x=215,startY=direction==="up"?640:190,endY=direction==="up"?190:640;
  await session.send("Input.dispatchTouchEvent",{type:"touchStart",touchPoints:[{x,y:startY,radiusX:8,radiusY:8,force:.7,id:1}]});
  for(let step=1;step<=7;step++){
    const y=Math.round(startY+(endY-startY)*(step/7));
    await session.send("Input.dispatchTouchEvent",{type:"touchMove",touchPoints:[{x,y,radiusX:8,radiusY:8,force:.7,id:1}]});
  }
  await session.send("Input.dispatchTouchEvent",{type:"touchEnd",touchPoints:[]});
  await page.waitForTimeout(350);
  await session.detach();
}

async function expectDocumentScrollable(page:Page,label:string){
  const before=await page.evaluate(()=>{
    const api=(globalThis as any).CopaMobileExperience;
    return api.scrollDiagnostics("test-before");
  });
  expect(before.bodyOverflow,`${label}: body overflow`).not.toBe("hidden");
  expect(before.rootOverflow,`${label}: root overflow`).not.toBe("hidden");
  expect(before.scrollHeight,`${label}: fixture must be taller than viewport`).toBeGreaterThan(before.viewportHeight+40);
  const start=await page.evaluate(()=>scrollY);
  await physicalSwipe(page,"up");
  const down=await page.evaluate(()=>scrollY);
  expect(down,`${label}: upward finger swipe must scroll page down`).toBeGreaterThan(start+8);
  await physicalSwipe(page,"down");
  const up=await page.evaluate(()=>scrollY);
  expect(up,`${label}: downward finger swipe must scroll page up`).toBeLessThan(down-8);
}

async function reachHub(page:Page){
  await page.evaluate(async()=>{await (globalThis as any).quickAll();});
  await page.locator("#postClubName").fill("Scroll Test");
  await page.evaluate(()=>{
    const game=globalThis as any;
    game.pcGo();game.fastTournamentDraw();game.finishTournamentDraw();game.setCaptain(0);game.closeModal();
    game.CopaClubFiles.select("debt");
  });
  await expect(page.locator("#hub")).toBeVisible();
}

test("manual draft releases setup body lock and accepts physical swipes",async({page},testInfo)=>{
  test.skip(testInfo.project.name!=="mobile-chromium","Android touch regression");
  await bootNative(page);
  await page.evaluate(async()=>{
    const game=globalThis as any;
    game.setLang("tr");game.CopaMobileShell.newRun();await game.quickStart();
    if(game._countryDraftPromise)await game._countryDraftPromise;
  });
  await expect(page.locator("#draft")).toBeVisible();
  const classes=await page.evaluate(()=>({body:[...document.body.classList],root:[...document.documentElement.classList]}));
  expect(classes.body).not.toContain("mobile-game-setup-open");
  expect(classes.body).not.toContain("mobile-game-setup-final");
  await expectDocumentScrollable(page,"draft");
});

test("hub routes, overlays and stale locks preserve bidirectional scrolling",async({page},testInfo)=>{
  test.skip(testInfo.project.name!=="mobile-chromium","Android touch regression");
  await bootNative(page);
  await page.evaluate(async()=>{
    const game=globalThis as any;
    game.setLang("tr");game.CopaMobileShell.newRun();await game.quickStart();
    if(game._countryDraftPromise)await game._countryDraftPromise;
  });
  await reachHub(page);
  // Keep every route taller than the viewport so the same physical gesture
  // gate catches document locks even when a particular test fixture is sparse.
  await page.evaluate(()=>{
    const hub=document.getElementById("hub")!;
    document.body.style.setProperty("min-height","2200px","important");
    const tail=document.createElement("div");
    tail.id="androidScrollLongContentFixture";
    tail.style.cssText="display:block;height:1200px;pointer-events:none";
    hub.appendChild(tail);
  });

  for(const route of ["match","market","training","sidefield","career"]){
    await page.evaluate(value=>(globalThis as any).CopaMobileShell.activateRoute(value),route);
    await page.waitForTimeout(route==="sidefield"?500:180);
    await page.evaluate(()=>scrollTo({top:0,behavior:"auto"}));
    await expectDocumentScrollable(page,`hub:${route}`);
  }

  await page.evaluate(()=>{
    document.body.classList.add("mobile-game-setup-open","player-profile-open","advanced-settings-open","tournament-draw-open");
    document.documentElement.classList.add("match-analysis-open","native-bench-open","tournament-draw-open","hub-player-dragging","hub-global-drag-lock");
    document.body.style.setProperty("overflow","hidden","important");
    document.documentElement.style.setProperty("overflow","hidden","important");
    (globalThis as any).CopaMobileExperience.releaseStaleScrollLocks("forced-stale-fixture");
  });
  const recovered=await page.evaluate(()=>(globalThis as any).CopaMobileExperience.scrollDiagnostics("test-after-recovery"));
  expect(recovered.bodyOverflow).not.toBe("hidden");
  expect(recovered.rootOverflow).not.toBe("hidden");
  expect(recovered.bodyClasses).not.toContain("mobile-game-setup-open");
  expect(recovered.rootClasses).not.toContain("hub-global-drag-lock");
  await page.evaluate(()=>scrollTo({top:0,behavior:"auto"}));
  await expectDocumentScrollable(page,"hub:stale-lock-recovery");
});
