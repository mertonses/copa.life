import { test, expect } from "@playwright/test";

test("iOS store artifact boots with the shared game and native-safe visuals",async({page})=>{
  const errors:string[]=[];
  page.on("pageerror",error=>errors.push(error.message));
  await page.goto("/dist-ios/index.html?autotest=1",{waitUntil:"domcontentloaded"});
  await expect(page.locator("#intro")).toBeVisible();
  const platform=await page.evaluate(()=>({
    declared:(window as any).COPA_PLATFORM,
    native:(window as any).COPA_IS_NATIVE,
    data:document.documentElement.dataset.copaPlatform,
  }));
  expect(platform).toEqual({declared:"ios",native:true,data:"ios"});
  const ghostDefaults=await page.evaluate(()=>({
    matching:(window as any).GhostClubs.enabled(),
    sharing:(window as any).GhostClubs.sharingEnabled(),
  }));
  expect(ghostDefaults).toEqual({matching:false,sharing:false});
  await expect(page.locator('script[src*="src/data/logos.js"]')).toHaveCount(0);
  await expect(page.locator('img[src^="assets/flags/"]')).toHaveCount(0);
  expect(await page.locator(".generic-country-code").count()).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});
