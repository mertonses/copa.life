import {test,expect} from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const visualDir=path.resolve(__dirname,"../../../outputs/ui-visuals/ios-webkit");

const capture=async(page:any,name:string)=>{
  fs.mkdirSync(visualDir,{recursive:true});
  await page.screenshot({path:path.join(visualDir,name),fullPage:true});
};

test("iOS package visual walkthrough",async({page},testInfo)=>{
  test.skip(testInfo.project.name!=="webkit-mobile","iOS WebKit visual contract");
  await page.addInitScript(()=>{
    for(const key of ["copa_run_v6","copa_run_v6_last_good","copa_run_v5","copa_run_v5_last_good"])localStorage.removeItem(key);
    sessionStorage.removeItem("copa_run");
  });
  await page.goto("/dist-ios/index.html?ios-visual-qa=1",{waitUntil:"domcontentloaded"});
  await expect(page.locator("#mobileGameLanding")).toBeVisible();
  await capture(page,"01-ios-landing.png");

  await page.locator('#mobileGameLanding button[onclick*="newRun"]').click();
  await expect(page.locator('#introSetup [data-mobile-step="1"]')).toBeVisible();
  await capture(page,"02-ios-country.png");
  const next=page.locator("[data-step-next]");
  await next.click();
  await expect(page.locator('#introSetup [data-mobile-step="2"]')).toBeVisible();
  await capture(page,"03-ios-formation.png");
  await next.click();
  await expect(page.locator("#startBtn")).toBeVisible();
  await capture(page,"04-ios-chairman.png");
});
