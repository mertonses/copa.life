import { test, expect } from "@playwright/test";

test("TR, EN, ES, DE and IT render the intro, guide, draft and fixture chrome",async({page},testInfo)=>{
  test.skip(testInfo.project.name!=="desktop-chromium","single-browser locale contract");
  const expected:{[key:string]:{guide:string}}={
    tr:{guide:"COPA REHBERİ"},
    en:{guide:"COPA GUIDE"},
    es:{guide:"GUÍA COPA"},
    de:{guide:"COPA-GUIDE"},
    it:{guide:"GUIDA COPA"},
  };
  for(const [language,copy] of Object.entries(expected)){
    const errors:string[]=[];
    page.removeAllListeners("pageerror");
    page.on("pageerror",error=>errors.push(error.message));
    await page.goto(`/?locale-smoke=${language}`,{waitUntil:"domcontentloaded"});
    await page.evaluate(lang=>(globalThis as any).setLang(lang),language);
    await expect(page.locator("html")).toHaveAttribute("lang",language);
    const intro=await page.evaluate(()=>({
      start:(document.querySelector("#startBtn") as HTMLElement)?.innerText.trim(),
      expectedStart:(globalThis as any).L().startBtn.replace(/<[^>]+>/g,"").trim(),
      auto:(document.querySelector("#allBtn") as HTMLElement)?.innerText.trim(),
      expectedAuto:(globalThis as any).L().allBtn.replace(/<[^>]+>/g,"").trim(),
    }));
    expect(intro.start.toLocaleUpperCase(language)).toContain(intro.expectedStart.toLocaleUpperCase(language));
    expect(intro.auto.toLocaleUpperCase(language)).toContain(intro.expectedAuto.toLocaleUpperCase(language));
    await page.evaluate(()=>(globalThis as any).openHowtoModal());
    await expect(page.locator(".howto-mhdr-title")).toHaveText(copy.guide);
    await page.locator("[data-guide-mode='detail']").click();
    await expect(page.locator(".howto-path-step")).toHaveCount(6);
    await page.evaluate(()=>(globalThis as any).closeModal());
    await page.evaluate(async()=>{
      const game=globalThis as any;
      await game.quickStart();
      if(game._countryDraftPromise)await game._countryDraftPromise;
      game.renderFixtures();
    });
    await expect(page.locator("#draft")).toBeVisible();
    await expect(page.locator("#pickhdr")).toHaveText(await page.evaluate(()=>(globalThis as any).L().pickhdr));
    await expect(page.locator("#fixbar .fr").first()).toHaveText(await page.evaluate(()=>(globalThis as any).L().rounds[0]));
    const visibleText=await page.locator("body").innerText();
    expect(visibleText).not.toMatch(/\b(?:undefined|null|NaN)\b/i);
    expect(errors).toEqual([]);
  }
});
