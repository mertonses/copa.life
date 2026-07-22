import { test, expect } from "@playwright/test";

test("game shell boots without uncaught errors",async({page})=>{
  const errors:string[]=[];
  page.on("pageerror",error=>errors.push(error.message));
  await page.goto("/?autotest=1",{waitUntil:"domcontentloaded"});
  await expect(page.locator("#intro")).toBeVisible();
  await expect(page.locator("#startBtn")).toBeEnabled();
  await expect(page.locator("#quickStartBtn")).toHaveCount(0);
  expect(errors).toEqual([]);
});
