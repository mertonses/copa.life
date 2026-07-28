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
  const flagAssets=await page.locator("#countryPick").evaluate((picker:HTMLElement)=>({
    assets:[...picker.querySelectorAll<HTMLImageElement>('img[src^="assets/flags/"]')]
      .map(image=>({complete:image.complete,width:image.naturalWidth,height:image.naturalHeight})),
  }));
  expect(flagAssets.assets).toHaveLength(6);
  expect(flagAssets.assets.every(flag=>flag.complete&&flag.width>0&&flag.height>0)).toBe(true);
  expect(errors).toEqual([]);
});
