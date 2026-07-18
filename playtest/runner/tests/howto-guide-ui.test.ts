import { test, expect } from "@playwright/test";

const seenTips={setup:1,draft:1,hub:1};

test.beforeEach(async({page})=>{
  await page.addInitScript(value=>localStorage.setItem("copa.guide.context.v2",JSON.stringify(value)),seenTips);
});

test("guide offers quick start, detailed path, glossary and screen-aware actions",async({page})=>{
  await page.goto("/?howto-guide=desktop",{waitUntil:"domcontentloaded"});
  await page.evaluate(()=>(globalThis as any).openHowtoModal());
  await expect(page.locator(".howto-guide-v2")).toBeVisible();
  await expect(page.locator(".howto-mode-tabs [data-guide-mode='quick']")).toHaveAttribute("aria-selected","true");
  await expect(page.locator(".howto-quick-card")).toHaveCount(3);
  await expect(page.locator("[data-guide-action='formation']").first()).toBeEnabled();
  await expect(page.locator("[data-guide-action='market']").first()).toBeDisabled();

  await page.locator("[data-guide-mode='detail']").click();
  await expect(page.locator(".howto-path-step")).toHaveCount(6);
  await page.locator("[data-guide-step='2']").click();
  await expect(page.locator(".howto-step-kicker")).toHaveText("03 / 06");
  await expect(page.locator(".howto-example")).toContainText("+3");
  await page.locator("[data-guide-term='chemistry']").click();
  await expect(page.locator("[data-guide-term-detail]")).not.toBeEmpty();
  await expect(page.locator("[data-guide-term='chemistry']")).toHaveAttribute("aria-expanded","true");
});

test("mobile guide uses a single column, expandable copy and a snap path",async({page},testInfo)=>{
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
  await page.locator("[data-guide-mode='detail']").click();
  const path=page.locator(".howto-path-wrap");
  await expect(path).toHaveCSS("scroll-snap-type",/x mandatory/);
  await expect(page.locator(".howto-step-details summary")).toBeVisible();
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
