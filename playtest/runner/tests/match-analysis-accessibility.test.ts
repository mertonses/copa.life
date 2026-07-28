import { test, expect } from "@playwright/test";

test("mobile result analysis shows exactly three reasons and closes safely",async({page},testInfo)=>{
  test.skip(testInfo.project.name!=="mobile-chromium","Android-sized interaction contract");
  await page.goto("/?match-analysis-accessibility=1",{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>Boolean((globalThis as any).LastMatchReport&&(globalThis as any).CopaMatchAnalysis));

  await page.evaluate(()=>{
    const game=globalThis as any;
    const players=Array.from({length:11},(_,index)=>({
      name:`Player ${index+1}`,
      pos:index===0?"GK":index<5?"CB":index<8?"CM":"ST",
      ov:72+index,
    }));
    game.LastMatchReport.capture({
      round:4,
      homeName:"KOPA XI",
      awayName:"RIVAL XI",
      homeFormation:"4-3-3",
      awayFormation:"4-3-3",
      homePlayers:players,
      awayPlayers:players.map((player,index)=>({...player,name:`Rival ${index+1}`})),
      score:[1,2],
      homePower:82,
      awayPower:79,
      homeWon:false,
      analysis:{
        power:82,
        oppPower:79,
        xg:[2.4,1.3],
        shots:[12,7],
        saves:[2,5],
        talk:{delta:-2,backfire:true},
      },
    });
    document.querySelector("#intro")?.classList.add("hidden");
    document.querySelector("#result")?.classList.remove("hidden");
    game.CopaMatchAnalysis.mountResultEntry();
  });

  const trigger=page.locator("#matchAnalysisEntry .match-analysis-trigger");
  await expect(trigger).toBeVisible();
  await expect(trigger).toHaveAttribute("aria-haspopup","dialog");
  expect(await trigger.evaluate(node=>node.getBoundingClientRect().height)).toBeGreaterThanOrEqual(48);
  await trigger.click();

  const layer=page.locator("#matchAnalysisLayer");
  await expect(layer).toHaveAttribute("aria-hidden","false");
  await expect(layer.locator('[role="dialog"]')).toBeVisible();
  await expect(layer.locator(".match-analysis-reason")).toHaveCount(3);
  await expect(layer.locator(".match-analysis-close")).toBeFocused();
  await expect(page.locator(".wrap")).toHaveAttribute("aria-hidden","true");
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);

  await page.keyboard.press("Escape");
  await expect(layer).toHaveAttribute("aria-hidden","true");
  await expect(page.locator(".wrap")).not.toHaveAttribute("aria-hidden","true");
  await expect(trigger).toBeFocused();
});

test("Android comfort text sizes persist and settings controls are easy to tap",async({page},testInfo)=>{
  test.skip(testInfo.project.name!=="mobile-chromium","Android-sized interaction contract");
  await page.goto("/?android-comfort-text=1",{waitUntil:"domcontentloaded"});
  const settings=page.locator("#settingsBtn");
  await settings.click();
  await expect(settings).toHaveAttribute("aria-expanded","true");

  const scaleButtons=page.locator("[data-mobile-text-scale]");
  await expect(scaleButtons).toHaveCount(3);
  const sizes=await scaleButtons.evaluateAll(nodes=>nodes.map(node=>{
    const rect=node.getBoundingClientRect();
    return{width:rect.width,height:rect.height};
  }));
  expect(sizes.every(size=>size.width>=44&&size.height>=48)).toBe(true);

  for(const scale of ["100","115","130"]){
    await page.locator(`[data-mobile-text-scale="${scale}"]`).click();
    await expect(page.locator("html")).toHaveAttribute("data-copa-text-scale",scale);
    await expect(page.locator(`[data-mobile-text-scale="${scale}"]`)).toHaveAttribute("aria-pressed","true");
    const layout=await page.evaluate(()=>({
      pageOverflow:document.documentElement.scrollWidth-innerWidth,
      clipped:[...document.querySelectorAll<HTMLElement>("#settingsMenu button")].filter(button=>button.scrollWidth>button.clientWidth+1||button.scrollHeight>button.clientHeight+1).map(button=>button.id||button.textContent?.trim())
    }));
    expect(layout.pageOverflow).toBeLessThanOrEqual(1);
    expect(layout.clipped).toEqual([]);
  }
  await expect(page.locator("html")).toHaveAttribute("data-copa-text-scale","130");
  await expect(page.locator('[data-mobile-text-scale="130"]')).toHaveAttribute("aria-pressed","true");
  expect(await page.evaluate(()=>localStorage.getItem("copa_mobile_text_scale"))).toBe("130");

  await page.reload({waitUntil:"domcontentloaded"});
  await expect(page.locator("html")).toHaveAttribute("data-copa-text-scale","130");
  await page.locator("#settingsBtn").click();
  expect(await page.evaluate(()=>(globalThis as any).CopaMobileExperience.handleBack())).toBe(true);
  await expect(page.locator("#settingsBtn")).toHaveAttribute("aria-expanded","false");
  await expect(page.locator("#settingsBtn")).toBeFocused();
});
