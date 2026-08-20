import {test,expect} from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const output=path.resolve(__dirname,"../../../outputs/ui-visuals/native-platforms");

async function boot(page:any){
  await page.addInitScript(()=>{localStorage.clear();sessionStorage.clear();});
  await page.goto(`/?arena-visual-qa=1&mode-gate-qa=${Date.now()}`,{waitUntil:"domcontentloaded"});
  await expect(page.locator("#modeGate")).toBeVisible();
}

test("mode gate presents an abstract, informative and keyboard-ready desktop choice",async({page},testInfo)=>{
  test.skip(testInfo.project.name!=="desktop-chromium","desktop mode-gate contract");
  await boot(page);
  await expect(page.locator(".mode-card")).toHaveCount(2);
  await expect(page.locator('[data-mode-copy="lifeCta"]')).toHaveText(/COPA LIFE/);
  await expect(page.locator('[data-mode-copy="arenaCta"]')).toHaveText(/ARENA/);
  await expect(page.locator(".mode-card-classic .mode-card-features>span")).toHaveCount(3);
  await expect(page.locator(".mode-card-arena .mode-card-features>span")).toHaveCount(3);
  const audit=await page.evaluate(()=>{
    const gate=document.querySelector<HTMLElement>("#modeGate")!;
    const cards=[...document.querySelectorAll<HTMLElement>(".mode-card")];
    return{
      pageOverflow:document.documentElement.scrollWidth-innerWidth,
      gateOverflow:gate.scrollWidth-gate.clientWidth,
      cards:cards.map(card=>({width:card.getBoundingClientRect().width,height:card.getBoundingClientRect().height})),
      backdrops:cards.map(card=>getComputedStyle(card.querySelector<HTMLElement>(".mode-card-backdrop")!).backgroundImage)
    };
  });
  expect(audit.pageOverflow).toBeLessThanOrEqual(1);
  expect(audit.gateOverflow).toBeLessThanOrEqual(1);
  expect(audit.cards.every(card=>card.width>500&&card.height>=400)).toBe(true);
  expect(audit.backdrops.every(backdrop=>backdrop.includes("gradient")&&!backdrop.includes("url("))).toBe(true);
  await page.locator(".mode-card-classic").focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.locator(".mode-card-arena")).toBeFocused();
  await expect(page.locator(".mode-card-arena")).toHaveClass(/is-selected/);
});

test("mode gate remains complete and unclipped on mobile",async({page},testInfo)=>{
  test.skip(testInfo.project.name!=="mobile-chromium","mobile mode-gate contract");
  await boot(page);
  const audit=await page.evaluate(()=>{
    const gate=document.querySelector<HTMLElement>("#modeGate")!;
    const cards=[...gate.querySelectorAll<HTMLElement>(".mode-card")];
    const clipped=[...gate.querySelectorAll<HTMLElement>("span,b,small,p,h1")].filter(node=>node.offsetParent&&node.scrollWidth>node.clientWidth+2&&getComputedStyle(node).whiteSpace!=="normal");
    return{viewportWidth:innerWidth,pageOverflow:document.documentElement.scrollWidth-innerWidth,gateOverflow:gate.scrollWidth-gate.clientWidth,cardWidths:cards.map(card=>card.getBoundingClientRect().width),cardHeights:cards.map(card=>card.getBoundingClientRect().height),clipped:clipped.map(node=>node.textContent?.trim())};
  });
  expect(audit.pageOverflow).toBeLessThanOrEqual(1);
  expect(audit.gateOverflow).toBeLessThanOrEqual(1);
  expect(audit.cardWidths.every(width=>width<=audit.viewportWidth)).toBe(true);
  expect(audit.cardHeights.every(height=>height>=228)).toBe(true);
  expect(audit.clipped).toEqual([]);
});

test("mode choices preserve sound, return and reset behavior",async({page},testInfo)=>{
  if(testInfo.project.name==="desktop-chromium")await page.setViewportSize({width:2048,height:1080});
  await boot(page);
  await page.evaluate(()=>{
    (globalThis as any).__modeSounds=[];
    (globalThis as any).sfxModeChoice=(mode:string)=>(globalThis as any).__modeSounds.push(mode);
  });
  await page.locator(".mode-card-classic").click();
  await expect(page.locator("#modeGate")).toBeHidden();
  await expect(page.locator("#lifeModeBack")).toBeVisible();
  await expect(page.locator("#introSetup")).toBeVisible();
  await expect(page.locator("#startBtn")).toBeVisible();
  await expect.poll(()=>page.evaluate(()=>(globalThis as any).__modeSounds.join(","))).toBe("classic");
  await page.locator("#lifeModeBack").click();
  await expect(page.locator("#modeGate")).toBeVisible();
  await page.locator(".mode-card-classic").click();
  await page.evaluate(()=>(globalThis as any).restart());
  await expect(page.locator("#modeGate")).toBeVisible();
  await expect(page.locator("#introSetup")).toBeHidden();
  await page.locator(".mode-card-classic").click();
  await expect(page.locator("#introLand")).toBeVisible();
  await expect(page.locator("#introSetup")).toBeVisible();
  await expect(page.locator("#startBtn")).toBeVisible();
});

test("first Android COPA LIFE choice waits for the native landing instead of exposing a blank setup",async({page},testInfo)=>{
  test.skip(testInfo.project.name!=="mobile-chromium","Android cold-start race regression");
  await page.addInitScript(()=>{localStorage.clear();sessionStorage.clear();});
  await page.goto(`/dist-android/index.html?mode-gate-qa=${Date.now()}`,{waitUntil:"domcontentloaded"});
  const gate=page.locator("#modeGate");
  await expect(gate).toBeVisible();
  await page.evaluate(()=>{
    const scope=globalThis as any;
    scope.__savedMobileShell=scope.CopaMobileShell;
    delete scope.CopaMobileShell;
    scope.CopaMobileShellReady=new Promise<void>(resolve=>setTimeout(()=>{
      scope.CopaMobileShell=scope.__savedMobileShell;
      resolve();
    },900));
  });
  await page.locator('[data-mode-choice="classic"]').click();
  await expect(gate).toBeVisible();
  await expect(gate).toHaveAttribute("aria-busy","");
  await expect(page.locator("#introSetup")).toBeHidden();
  await expect(gate).toBeHidden({timeout:10_000});
  await expect(page.locator("#mobileGameLanding")).toBeVisible();
  await expect(page.locator("#introLand")).toBeVisible();
  await expect(page.locator("#introSetup")).toBeHidden();
  const audit=await page.evaluate(()=>{
    const landing=document.getElementById("mobileGameLanding")!;
    const rect=landing.getBoundingClientRect();
    return{
      text:(landing.textContent||"").trim(),
      width:rect.width,
      height:rect.height,
      pageOverflow:document.documentElement.scrollWidth-innerWidth,
    };
  });
  expect(audit.text).toContain("COPA LIFE");
  expect(audit.width).toBeGreaterThan(300);
  expect(audit.height).toBeGreaterThan(500);
  expect(audit.pageOverflow).toBeLessThanOrEqual(1);
  fs.mkdirSync(output,{recursive:true});
  await page.screenshot({path:path.join(output,"android-first-copa-life.png"),fullPage:true});
});
