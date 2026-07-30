import { test, expect } from "@playwright/test";

const seenTips={setup:1,draft:1,hub:1};

test.beforeEach(async({page})=>{
  await page.addInitScript(value=>localStorage.setItem("copa.guide.context.v2",JSON.stringify(value)),seenTips);
});

test("guide offers Life and Arena quick starts, searchable topics, glossary and screen-aware actions",async({page})=>{
  await page.goto("/?howto-guide=desktop",{waitUntil:"domcontentloaded"});
  await page.evaluate(()=>(globalThis as any).openHowtoModal());
  await expect(page.locator(".howto-guide-v2")).toBeVisible();
  await expect(page.locator(".howto-guide-v2")).toHaveClass(/is-life/);
  await expect(page.locator("[data-guide-product='life'] .howto-product-brand-life svg")).toBeVisible();
  await expect(page.locator(".howto-mode-tabs [data-guide-mode='quick']")).toHaveAttribute("aria-selected","true");
  await expect(page.locator("[data-guide-product='life']")).toHaveAttribute("aria-selected","true");
  await expect(page.locator(".howto-quick-card")).toHaveCount(3);
  await expect(page.locator("[data-guide-action='formation']").first()).toBeEnabled();
  await expect(page.locator("[data-guide-action='market']").first()).toBeDisabled();
  await expect(page.locator("[data-guide-action='market']").first().locator("xpath=..").locator("small")).not.toBeEmpty();

  await page.locator("[data-guide-mode='detail']").click();
  await expect(page.locator(".howto-topic")).toHaveCount(10);
  await page.locator("[data-guide-step-select]").evaluate((select:HTMLSelectElement)=>{select.value="2";select.dispatchEvent(new Event("change",{bubbles:true}));});
  await expect(page.locator(".howto-step-kicker")).toHaveText("03 / 10");
  await expect(page.locator(".howto-example")).toContainText("+3");
  await expect(page.locator(".howto-step-description")).toContainText(/Son 16|round of 16/);
  await page.locator("[data-guide-term='chemistry']").click();
  await expect(page.locator("[data-guide-term-detail]")).not.toBeEmpty();
  await expect(page.locator("[data-guide-term='chemistry']")).toHaveAttribute("aria-expanded","true");

  await page.locator("[data-guide-search]").fill("injur");
  await expect(page.locator(".howto-topic:visible")).toHaveCount(1);
  await page.locator("[data-guide-product='arena']").click();
  await expect(page.locator(".howto-guide-v2")).toHaveClass(/is-arena/);
  await expect(page.locator(".howto-guide-v2")).toHaveAttribute("data-guide-product-theme","arena");
  await expect(page.locator("[data-guide-product='arena'] .howto-product-brand-arena svg")).toBeVisible();
  await expect(page.locator("[data-guide-product='arena']")).toHaveAttribute("aria-selected","true");
  await expect(page.locator(".howto-topic")).toHaveCount(6);
  await expect(page.locator(".howto-step-description")).toContainText(/Antrenman|Practice/);
  const arenaTheme=await page.evaluate(()=>{
    const root=document.querySelector(".howto-guide-v2") as HTMLElement;
    const accent=document.querySelector(".howto-product-brand-arena em") as HTMLElement;
    return {surface:getComputedStyle(root).backgroundColor,accent:getComputedStyle(accent).color};
  });
  expect(arenaTheme.surface).toBe("rgb(7, 19, 29)");
  expect(arenaTheme.accent).not.toBe("rgb(242, 74, 40)");
});

test("guide defaults to the product for the current game area instead of the last visited tab",async({page})=>{
  await page.goto("/?howto-current-area=1",{waitUntil:"domcontentloaded"});
  await page.evaluate(()=>(globalThis as any).openHowtoModal("life"));
  await page.locator("[data-guide-product='arena']").click();
  await page.evaluate(()=>(globalThis as any).closeModal());

  await page.evaluate(()=>(globalThis as any).openHowtoModal());
  await expect(page.locator(".howto-guide-v2")).toHaveClass(/is-life/);
  await expect(page.locator("[data-guide-product='life']")).toHaveAttribute("aria-selected","true");
  await page.evaluate(()=>(globalThis as any).closeModal());

  await page.evaluate(()=>{
    document.body.classList.add("arena-active");
    (globalThis as any).openHowtoModal();
  });
  await expect(page.locator(".howto-guide-v2")).toHaveClass(/is-arena/);
  await expect(page.locator("[data-guide-product='arena']")).toHaveAttribute("aria-selected","true");
});

test("mobile guide uses a single column, expandable copy and compact previous-next navigation",async({page},testInfo)=>{
  test.skip(!testInfo.project.name.includes("mobile"),"mobile layout contract");
  await page.goto("/?howto-guide=mobile",{waitUntil:"domcontentloaded"});
  await page.evaluate(()=>(globalThis as any).openHowtoModal());
  await expect(page.locator(".howto-guide-v2")).toBeVisible();
  const layout=await page.evaluate(()=>{
    const list=document.querySelector(".howto-quick-list") as HTMLElement;
    const modal=document.querySelector(".howto-guide-v2") as HTMLElement;
    return {
      columns:getComputedStyle(list).gridTemplateColumns.split(" ").length,
      modalOverflow:modal.scrollWidth-modal.clientWidth,
    };
  });
  expect(layout.columns).toBe(1);
  expect(layout.modalOverflow).toBeLessThanOrEqual(1);
  await page.locator("[data-guide-product='arena']").click();
  const arenaOverflow=await page.locator(".howto-guide-v2").evaluate((modal:HTMLElement)=>modal.scrollWidth-modal.clientWidth);
  expect(arenaOverflow).toBeLessThanOrEqual(1);
  await page.locator("[data-guide-product='life']").click();
  await page.locator("[data-guide-mode='detail']").click();
  await expect(page.locator(".howto-step-nav")).toBeVisible();
  await expect(page.locator(".howto-topic-grid")).toBeHidden();
  await page.locator("[data-guide-nav='1']").click();
  await expect(page.locator(".howto-step-kicker")).toHaveText("02 / 10");
  await expect(page.locator(".howto-step-details summary")).toBeVisible();
  await expect(page.locator(".howto-detail-open-label")).toBeVisible();
});

test("first-run setup tip records itself and does not reopen after reload",async({browser},testInfo)=>{
  test.skip(testInfo.project.name!=="desktop-chromium","single browser persistence check");
  const context=await browser.newContext({viewport:{width:1280,height:800}});
  const page=await context.newPage();
  await page.goto("/?howto-tip=first",{waitUntil:"domcontentloaded"});
  await expect(page.locator(".copa-coachmark")).toBeVisible({timeout:6000});
  await expect(page.locator("#formpick")).toHaveClass(/guide-focus/);
  await page.locator(".copa-coachmark-ok").click();
  await page.reload({waitUntil:"domcontentloaded"});
  await page.waitForTimeout(2800);
  await expect(page.locator(".copa-coachmark")).toHaveCount(0);
  await context.close();
});

test("mobile draft opens at the page top with one contextual first-run tip",async({page},testInfo)=>{
  test.skip(!testInfo.project.name.includes("mobile"),"mobile draft scroll contract");
  await page.goto("/?draft-scroll-top=1",{waitUntil:"domcontentloaded"});
  const before=await page.evaluate(()=>{
    localStorage.setItem("copa.guide.context.v2",JSON.stringify({setup:1,hub:1}));
    (globalThis as any).setLang("tr");
    window.scrollTo(0,document.documentElement.scrollHeight);
    (globalThis as any).normalStart();
    return window.scrollY;
  });
  expect(before).toBeGreaterThan(0);
  await expect(page.locator("#modal")).toBeVisible();
  await page.waitForTimeout(100);
  await page.locator('.stylebtn[data-style="gegen"]').click();
  await expect(page.locator("#draft")).toBeVisible();
  await expect.poll(()=>page.evaluate(()=>window.scrollY)).toBe(0);
  await page.waitForTimeout(1000);
  await expect(page.locator(".copa-coachmark")).toBeVisible();
  await expect(page.locator("#rollBtn")).toHaveClass(/guide-focus/);
  let contextState=await page.evaluate(()=>JSON.parse(localStorage.getItem("copa.guide.context.v2")||"{}"));
  expect(contextState.draft).toBeFalsy();
  await page.locator(".copa-coachmark-ok").click();
  contextState=await page.evaluate(()=>JSON.parse(localStorage.getItem("copa.guide.context.v2")||"{}"));
  expect(contextState.draft).toBeTruthy();
});

test("closing a contextual tip without acknowledgement keeps it available",async({browser},testInfo)=>{
  test.skip(testInfo.project.name!=="desktop-chromium","single browser persistence check");
  const context=await browser.newContext({viewport:{width:1280,height:800}});
  const page=await context.newPage();
  await page.goto("/?howto-tip=dismiss",{waitUntil:"domcontentloaded"});
  await expect(page.locator(".copa-coachmark")).toBeVisible({timeout:6000});
  await page.locator(".copa-coachmark-x").click();
  const state=await page.evaluate(()=>JSON.parse(localStorage.getItem("copa.guide.context.v2")||"{}"));
  expect(state.setup).toBeFalsy();
  await context.close();
});

test("guide remembers the selected product, view and topic",async({page},testInfo)=>{
  test.skip(testInfo.project.name!=="desktop-chromium","single browser persistence check");
  await page.goto("/?howto-memory=1",{waitUntil:"domcontentloaded"});
  await page.evaluate(()=>(globalThis as any).openHowtoModal());
  await page.locator("[data-guide-product='arena']").click();
  await page.locator("[data-guide-mode='detail']").click();
  await page.locator("[data-guide-step='4']").click();
  await page.evaluate(()=>(globalThis as any).closeModal());
  await page.evaluate(()=>(globalThis as any).openHowtoModal("arena"));
  await expect(page.locator("[data-guide-product='arena']")).toHaveAttribute("aria-selected","true");
  await expect(page.locator("[data-guide-mode='detail']")).toHaveAttribute("aria-selected","true");
  await expect(page.locator(".howto-step-kicker")).toHaveText("05 / 06");
});

test("Arena keeps a permanent guide entry and opens the Arena product",async({page},testInfo)=>{
  test.skip(testInfo.project.name!=="desktop-chromium","single browser Arena entry check");
  await page.goto("/?arena-guide=1",{waitUntil:"domcontentloaded"});
  await page.evaluate(()=>(globalThis as any).CopaLazy.openArena());
  await expect(page.locator("[data-arena-action='guide']")).toBeVisible();
  await page.locator("[data-arena-action='guide']").click();
  await expect(page.locator(".howto-guide-v2")).toBeVisible();
  await expect(page.locator(".howto-guide-v2")).toHaveClass(/is-arena/);
  await expect(page.locator("[data-guide-product='arena'] .howto-product-brand-arena svg")).toBeVisible();
  await expect(page.locator("[data-guide-product='arena']")).toHaveAttribute("aria-selected","true");
});

test("Android guide uses the full safe viewport and hardware Back closes it",async({page},testInfo)=>{
  test.skip(!testInfo.project.name.includes("mobile"),"Android-sized mobile contract");
  await page.goto("/?native-game=1",{waitUntil:"domcontentloaded"});
  await expect(page.locator("html")).toHaveClass(/copa-mobile-game/);
  await page.evaluate(()=>(globalThis as any).openHowtoModal("life"));
  await expect(page.locator(".howto-guide-v2")).toBeVisible();
  const layout=await page.evaluate(()=>{
    const modal=document.querySelector(".howto-guide-v2") as HTMLElement;
    const rect=modal.getBoundingClientRect();
    return {width:rect.width,height:rect.height,viewportWidth:innerWidth,viewportHeight:innerHeight,overflow:modal.scrollWidth-modal.clientWidth};
  });
  expect(Math.abs(layout.width-layout.viewportWidth)).toBeLessThanOrEqual(1);
  expect(Math.abs(layout.height-layout.viewportHeight)).toBeLessThanOrEqual(1);
  expect(layout.overflow).toBeLessThanOrEqual(1);
  const handled=await page.evaluate(()=>(globalThis as any).CopaMobileExperience.handleBack());
  expect(handled).toBeTruthy();
  await expect(page.locator("#modal")).toBeHidden();
});
