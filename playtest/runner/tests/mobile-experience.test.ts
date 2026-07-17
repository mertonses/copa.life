import { test, expect } from "@playwright/test";

const mobileOnly=(projectName:string)=>projectName==="mobile-chromium";

test("mobile primary actions use one safe-area aware dock without cloning controls",async({page},testInfo)=>{
  test.skip(!mobileOnly(testInfo.project.name),"phone interaction contract");
  await page.goto("/?mobile-experience=1",{waitUntil:"domcontentloaded"});

  const dock=page.locator("#mobileActionDock");
  await expect(dock).toBeVisible();
  await expect(dock.locator("#startBtn")).toHaveCount(1);
  await expect(page.locator("#startBtn")).toHaveCount(1);
  await expect(dock).toHaveAttribute("data-dock-kind","intro");

  const metrics=await page.locator("#startBtn").evaluate(element=>{
    const rect=element.getBoundingClientRect();
    const dockElement=element.closest("#mobileActionDock") as HTMLElement;
    const style=getComputedStyle(dockElement);
    return{
      height:rect.height,
      bottom:Math.round(innerHeight-rect.bottom),
      safeAreaPadding:style.paddingBottom,
    };
  });
  expect(metrics.height).toBeGreaterThanOrEqual(48);
  expect(metrics.bottom).toBeGreaterThanOrEqual(6);
  expect(metrics.safeAreaPadding).not.toBe("");

  await page.evaluate(()=>{(globalThis as any).quickStart();});
  await expect(page.locator("#draft")).toBeVisible();
  await expect(dock).toBeHidden();
});

test("mobile preferences stay opt-in and draft choices expose decision context",async({page},testInfo)=>{
  test.skip(!mobileOnly(testInfo.project.name),"phone interaction contract");
  await page.goto("/?mobile-preferences=1",{waitUntil:"domcontentloaded"});
  await page.locator("#settingsBtn").click();
  const preferences=page.locator(".mobile-pref-group .mobile-pref-btn");
  await expect(preferences).toHaveCount(5);
  await expect(page.locator("#mobileHapticBtn")).toHaveAttribute("aria-pressed","false");
  await expect(page.locator("#mobileSmartSpeedBtn")).toHaveAttribute("aria-pressed","false");
  await page.locator("#mobileConfirmPickBtn").click();
  await expect(page.locator("#mobileConfirmPickBtn")).toHaveAttribute("aria-pressed","true");
  await page.locator("#settingsBtn").click();

  await page.evaluate(()=>{(globalThis as any).quickStart();});
  await expect(page.locator("#mobileDraftContext")).toBeVisible();
  await page.evaluate(()=>{(globalThis as any).roll();});
  await expect(page.locator("#optstage")).toBeVisible();
  await expect(page.locator("#opts .mobile-candidate-impact")).toHaveCount(3);
  const choice=page.locator("#opts .opt:not(.tooexp)").first();
  await choice.click();
  await expect(page.locator("#mobileDraftConfirm")).toBeVisible();
  await expect(page.locator("#mobileDraftConfirm")).toContainText(/Kasa sonra|Cash after/);
  await page.locator("[data-draft-confirm]").click();
  await expect(page.locator("#mobileDraftConfirm")).toHaveCount(0);
  await expect(page.locator("#rollstage")).toBeVisible();
});

test("desktop keeps primary actions in their original layout",async({page},testInfo)=>{
  test.skip(testInfo.project.name!=="desktop-chromium","desktop layout contract");
  await page.goto("/?desktop-experience=1",{waitUntil:"domcontentloaded"});
  await expect(page.locator("#mobileActionDock")).toBeHidden();
  await expect(page.locator(".v7-cta-stack #startBtn")).toHaveCount(1);
});

test("mobile match segments switch presentation without pausing the simulation",async({page},testInfo)=>{
  test.skip(!mobileOnly(testInfo.project.name),"phone interaction contract");
  await page.goto("/?mobile-segments=1",{waitUntil:"domcontentloaded"});
  await page.evaluate(()=>{
    document.querySelector("#intro")?.classList.add("hidden");
    document.querySelector("#sim")?.classList.remove("hidden");
    (globalThis as any).CopaMobileExperience?.refresh();
  });

  const nav=page.locator(".mobile-sim-tabs");
  await expect(nav).toBeVisible();
  await expect(nav.locator("button")).toHaveCount(3);
  await expect(nav.locator('[data-sim-view="field"]')).toHaveAttribute("aria-selected","true");
  await expect(page.locator("#sim .fieldframe")).toBeVisible();
  await expect(page.locator("#sim .eventpanel")).toBeHidden();

  const hitAreas=await nav.locator("button").evaluateAll(elements=>elements.map(element=>{
    const rect=element.getBoundingClientRect();
    return[Math.round(rect.width),Math.round(rect.height)];
  }));
  for(const [width,height] of hitAreas){
    expect(width).toBeGreaterThanOrEqual(44);
    expect(height).toBeGreaterThanOrEqual(44);
  }

  await nav.locator('[data-sim-view="events"]').click();
  await expect(page.locator("#sim .eventpanel")).toBeVisible();
  await expect(page.locator("#sim .fieldframe")).toBeHidden();
  await nav.locator('[data-sim-view="stats"]').click();
  await expect(page.locator("#simStats")).toBeVisible();
  await expect(page.locator("#sim .simstage")).toBeHidden();
});

test("mobile player profile uses a near-full-height sheet with persistent controls",async({page},testInfo)=>{
  test.skip(!mobileOnly(testInfo.project.name),"phone interaction contract");
  await page.goto("/?mobile-profile-sheet=1",{waitUntil:"domcontentloaded"});
  await page.evaluate(()=>{
    (globalThis as any).PlayerProfiles.open({
      name:"Joshua Kimmich",ov:87,age:30,club:"FC Bayern München",
      natPos:"SĞB",pos:"SĞB",profileKey:"DE|joshua kimmich|30|fc bayern munchen",
    },document.querySelector("#intro"),"keyboard");
  });

  const card=page.locator(".player-profile-card");
  await expect(page.locator(".player-profile-layer")).toHaveClass(/is-sheet/);
  const dimensions=await card.evaluate(element=>{
    const rect=element.getBoundingClientRect();
    const close=element.querySelector(".player-profile-close") as HTMLElement;
    return{
      height:rect.height,
      viewport:innerHeight,
      closeHeight:close.getBoundingClientRect().height,
      closePosition:getComputedStyle(close).position,
    };
  });
  expect(dimensions.height/dimensions.viewport).toBeGreaterThanOrEqual(.89);
  expect(dimensions.closeHeight).toBeGreaterThanOrEqual(44);
  expect(["absolute","sticky"]).toContain(dimensions.closePosition);
});

test("single tap keeps placement active while the peek detail opens and closes safely",async({page},testInfo)=>{
  test.skip(!mobileOnly(testInfo.project.name),"phone interaction contract");
  await page.goto("/?mobile-player-peek=1",{waitUntil:"domcontentloaded"});
  await page.evaluate(()=>{(globalThis as any).quickStart();(globalThis as any).quickAll();});
  await expect(page.locator("#postClubName")).toBeVisible();
  await page.locator("#postClubName").fill("Peek Test FK");
  await page.evaluate(()=>{(globalThis as any).pcGo();});
  await expect(page.locator("#hub")).toBeVisible();
  await page.evaluate(()=>{(globalThis as any).setCaptain(0);(globalThis as any).closeModal();});

  const player=page.locator("#hubPitch .roundel.full").first();
  await player.click();
  await expect(player).toHaveClass(/tap-selected/);
  await expect(page.locator("#tapHelperBar")).toBeVisible();
  await expect(page.locator("#tapHelperMeta")).toContainText(/OVR/);
  await expect(page.locator("#tapDetailBtn")).toBeVisible();
  await page.locator("#tapDetailBtn").click();
  await expect(page.locator(".player-profile-layer")).toHaveAttribute("aria-hidden","false");
  await expect(page.locator(".mobile-profile-nav")).toBeVisible();
  await page.locator(".player-profile-close").click();
  await expect(page.locator(".player-profile-layer")).toHaveAttribute("aria-hidden","true");
  await expect(player).toHaveClass(/tap-selected/);
  await page.locator(".tap-cancel").click();
  await expect(player).not.toHaveClass(/tap-selected/);
});

test("hub context and result details stay compact without hiding information",async({page},testInfo)=>{
  test.skip(!mobileOnly(testInfo.project.name),"phone interaction contract");
  await page.goto("/?mobile-result-disclosures=1",{waitUntil:"domcontentloaded"});
  await page.evaluate(()=>{(globalThis as any).quickStart();(globalThis as any).quickAll();});
  await expect(page.locator("#postClubName")).toBeVisible();
  await page.locator("#postClubName").fill("Mobile Result FK");
  await page.evaluate(()=>{(globalThis as any).pcGo();});
  await expect(page.locator("#hub")).toBeVisible();
  await expect(page.locator("#mobileRoundDigest")).toBeVisible();
  await page.evaluate(()=>{
    const global=globalThis as any;
    global.pushFeed("Mobil gelişme 1","form");
    global.pushFeed("Mobil gelişme 2","form");
    global.pushFeed("Mobil gelişme 3","form");
  });
  await expect(page.locator("#mobileFeedToggle")).toBeVisible();
  await page.evaluate(()=>{(globalThis as any).setCaptain(0);(globalThis as any).closeModal();(globalThis as any).endRun(false);});
  await expect(page.locator("#result")).toBeVisible();
  await expect(page.locator("#result .scoreboard")).toBeVisible();
  const disclosures=page.locator("#result .mobile-result-disclosure:not(.hidden)");
  expect(await disclosures.count()).toBeGreaterThanOrEqual(2);
  const story=page.locator("#storyTile");
  await expect(story).toBeHidden();
  await page.locator(".mobile-result-disclosure>summary").filter({hasText:/SEZON HİKÂYESİ|SEASON STORY/}).click();
  await expect(story).toBeVisible();
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});

test("phone portrait and landscape matrices stay inside the viewport with usable hit areas",async({page},testInfo)=>{
  test.skip(!mobileOnly(testInfo.project.name),"phone interaction contract");
  const sizes=[
    {width:360,height:800},
    {width:390,height:844},
    {width:430,height:932},
    {width:740,height:390},
  ];
  for(const size of sizes){
    await page.setViewportSize(size);
    await page.goto("/?mobile-matrix="+size.width+"x"+size.height,{waitUntil:"domcontentloaded"});
    const audit=await page.evaluate(()=>{
      const interactive=[...document.querySelectorAll("button,select,a[href],[role='button'],[role='option'],[role='radio']")]
        .filter(element=>{
          const rect=element.getBoundingClientRect();
          const style=getComputedStyle(element);
          return rect.width>0&&rect.height>0&&style.visibility!=="hidden"&&style.display!=="none";
        })
        .map(element=>{
          const rect=element.getBoundingClientRect();
          return{
            label:element.getAttribute("aria-label")||element.textContent?.trim().slice(0,30)||element.tagName,
            width:Math.round(rect.width),
            height:Math.round(rect.height),
          };
        });
      return{
        overflow:document.documentElement.scrollWidth-innerWidth,
        undersized:interactive.filter(item=>item.width<44||item.height<44),
      };
    });
    expect(audit.overflow,`${size.width}x${size.height} horizontal overflow`).toBeLessThanOrEqual(1);
    expect(audit.undersized,`${size.width}x${size.height} undersized controls`).toEqual([]);
  }
});
