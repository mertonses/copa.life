import {test,expect} from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const output=path.resolve(__dirname,"../../../outputs/ui-visuals/chairman-cards");

test.beforeEach(async({page})=>{
  await page.addInitScript(()=>{
    localStorage.clear();
    sessionStorage.clear();
  });
});

test("chairman cards match the compact premium reference",async({page},testInfo)=>{
  await page.goto("/?chairman-cards-visual-qa=1",{waitUntil:"domcontentloaded"});
  await page.evaluate(async()=>{
    const game=globalThis as any;
    game.setLang("tr");
    game._applyCheat();
    game.goSetup();
    await game.pickCountry("TR");
  });
  const surface=page.locator("#chairSelectionSurface");
  await expect(surface).toBeVisible();
  await expect(page.locator("#chairpick")).toHaveCount(0);
  await expect(surface.locator(".js-chair-selected-mark")).toBeVisible();
  await expect(surface.locator(".copa-chair-stage-actions button")).toHaveCount(2);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);

  fs.mkdirSync(output,{recursive:true});
  await page.waitForFunction(()=>{const image=document.querySelector<HTMLImageElement>("#chairSelectionSurface .js-chair-stage-image");return !!image&&image.complete&&image.naturalWidth>=2048},{timeout:20_000});
  await expect(surface.locator(".js-chair-stage-image")).toBeVisible();
  await page.waitForTimeout(60);
  await page.screenshot({path:path.join(output,`${testInfo.project.name}.png`),fullPage:false});

  await surface.locator(".js-chair-next").click();
  await expect(surface.locator(".js-chair-detail-index")).toHaveText("02 / 06");
  await expect(page.locator(".chair-picker-modal")).toBeHidden();
  await expect(surface.locator(".js-chair-stage-title")).toContainText("Diplomat");
  await page.screenshot({path:path.join(output,`profile-${testInfo.project.name}.png`),fullPage:false});
});

test("chairman hero keeps the full portrait across 2K and compact orientations",async({page},testInfo)=>{
  test.skip(testInfo.project.name!=="desktop-chromium","run the explicit viewport matrix once");
  for(const viewport of [
    {width:2560,height:1440,name:"2k-landscape"},
    {width:390,height:844,name:"portrait"},
    {width:844,height:390,name:"compact-landscape"},
  ]){
    await page.setViewportSize({width:viewport.width,height:viewport.height});
    await page.goto("/?chairman-cards-visual-qa=1",{waitUntil:"domcontentloaded"});
    await page.evaluate(()=>{if(typeof (globalThis as any).goSetup==="function"){(globalThis as any).goSetup();}});
    const start=page.getByText("COPA LIFE'I BAŞLAT",{exact:false});
    if(await start.isVisible())await start.click();
    const surface=page.locator("#chairSelectionSurface");
    await surface.scrollIntoViewIfNeeded();
    await expect(surface).toBeVisible();
    const metrics=await surface.evaluate(root=>{
      const frame=root.querySelector<HTMLElement>(".copa-chair-stage-frame")!;
      const image=root.querySelector<HTMLImageElement>(".js-chair-stage-image")!;
      const frameRect=frame.getBoundingClientRect();
      const imageRect=image.getBoundingClientRect();
      return{
        frame:{top:frameRect.top,bottom:frameRect.bottom,height:frameRect.height},
        image:{top:imageRect.top,bottom:imageRect.bottom,width:imageRect.width,height:imageRect.height},
        cropTop:imageRect.top-frameRect.top,
        cropBottom:frameRect.bottom-imageRect.bottom,
        pageOverflow:Math.max(0,document.documentElement.scrollWidth-innerWidth),
        stageOverflow:Math.max(0,(root.querySelector<HTMLElement>(".copa-chair-stage-panel")?.scrollWidth||0)-(root.querySelector<HTMLElement>(".copa-chair-stage-panel")?.clientWidth||0)),
        naturalWidth:image.naturalWidth,
        naturalHeight:image.naturalHeight,
      };
    });
    expect(metrics.naturalWidth).toBeGreaterThanOrEqual(2048);
    expect(metrics.naturalHeight).toBeGreaterThanOrEqual(2048);
    expect(metrics.cropTop).toBeGreaterThanOrEqual(-1);
    // The transparent portrait intentionally overhangs the frame.
    expect(metrics.cropBottom).toBeGreaterThanOrEqual(-22);
    expect(metrics.pageOverflow,viewport.name).toBe(0);
    // Portrait/shadow overhang may extend locally; the document must remain
    // scroll-safe, which is asserted separately above.
    expect(metrics.stageOverflow,viewport.name).toBeLessThanOrEqual(32);
    if(viewport.name==="compact-landscape")expect(metrics.frame.bottom).toBeLessThanOrEqual(viewport.height+1);
    await expect(page.locator("#chairSelectionSurface .js-chair-stage-image")).toBeVisible();
    await page.waitForTimeout(60);
    await page.screenshot({path:path.join(output,`hero-${viewport.name}.png`),fullPage:false});
  }
});

test("all chairman portraits use the same overhang baseline without a shelf",async({page},testInfo)=>{
  test.skip(testInfo.project.name!=="desktop-chromium","pixel-level chairman rail audit runs on the desktop viewport");
  await page.setViewportSize({width:2560,height:1440});
  await page.goto("/?chairman-cards-visual-qa=1",{waitUntil:"domcontentloaded"});
  await page.evaluate(async()=>{
    const game=globalThis as any;
    game.setLang("tr");
    game._applyCheat();
    game.goSetup();
    await game.pickCountry("TR");
  });
  const surface=page.locator("#chairSelectionSurface");
  await expect(surface).toBeVisible();
  await surface.scrollIntoViewIfNeeded();
  const ids=["babacan","leydi","pinti","sansasyoncu","torpilci","cilgin"];
  const measurements=[] as Array<Record<string,any>>;
  for(const [index,id] of ids.entries()){
    if(index>0)await surface.locator(".js-chair-next").click();
    await page.waitForFunction(expected=>{
      const image=document.querySelector<HTMLImageElement>("#chairSelectionSurface .js-chair-stage-image");
      return !!image&&image.complete&&image.naturalWidth>=2048&&image.currentSrc.includes(`/chairs_profile_hd/${expected}.webp`);
    },id);
    const metric=await surface.evaluate((root,chairId)=>{
      const frame=root.querySelector<HTMLElement>(".copa-chair-stage-frame")!;
      const portrait=root.querySelector<HTMLElement>(".copa-chair-stage-portrait")!;
      const image=root.querySelector<HTMLImageElement>(".js-chair-stage-image")!;
      const support=root.querySelector<HTMLElement>(".copa-chair-stage-support");
      const frameRect=frame.getBoundingClientRect();
      const portraitRect=portrait.getBoundingClientRect();
      const imageRect=image.getBoundingClientRect();
      return{
        id:chairId,
        frameTop:frameRect.top,frameBottom:frameRect.bottom,
        imageBottom:imageRect.bottom,portraitBottom:portraitRect.bottom,
        supportPresent:!!support,
        naturalWidth:image.naturalWidth,naturalHeight:image.naturalHeight,
        pageOverflow:Math.max(0,document.documentElement.scrollWidth-innerWidth),
        stageOverflow:Math.max(0,(root.querySelector<HTMLElement>(".copa-chair-stage-panel")?.scrollWidth||0)-(root.querySelector<HTMLElement>(".copa-chair-stage-panel")?.clientWidth||0)),
      };
    },id);
    measurements.push(metric);
    expect(metric.naturalWidth, id).toBeGreaterThanOrEqual(2048);
    expect(metric.naturalHeight, id).toBeGreaterThanOrEqual(2048);
    expect(metric.imageBottom, id).toBeGreaterThan(metric.frameBottom);
    expect(metric.supportPresent, id).toBe(false);
    expect(metric.pageOverflow, id).toBe(0);
    expect(metric.stageOverflow, id).toBeLessThanOrEqual(32);
    if(id==="leydi"||id==="pinti"){
      await expect(page.locator("#chairSelectionSurface .js-chair-stage-image")).toBeVisible();
      await page.waitForTimeout(60);
      await page.screenshot({path:path.join(output,`${id}-overhang-2k.png`),fullPage:false});
    }
  }
  fs.mkdirSync(output,{recursive:true});
  await expect(page.locator("#chairSelectionSurface .js-chair-stage-image")).toBeVisible();
  await page.waitForTimeout(60);
  await page.screenshot({path:path.join(output,"all-portraits-supported-2k.png"),fullPage:false});
});

test("chairman selection confirms from the surface without opening a detail modal",async({page},testInfo)=>{
  await page.goto("/?chairman-cards-visual-qa=1",{waitUntil:"domcontentloaded"});
  await page.evaluate(async()=>{
    const game=globalThis as any;
    game.setLang("tr");
    game._applyCheat();
    game.goSetup();
    await game.pickCountry("TR");
  });
  const surface=page.locator("#chairSelectionSurface");
  await expect(surface).toBeVisible();
  await surface.scrollIntoViewIfNeeded();

  await expect(surface.locator(".js-chair-selected-mark")).toBeVisible();

  await surface.locator(".js-chair-next").click();
  await surface.locator(".js-chair-next").click();
  const modal=page.locator(".chair-picker-modal");
  await expect(modal).toBeHidden();
  await expect(surface.locator(".js-chair-selected-mark")).toBeVisible();
  await expect(page.locator("#chairSelectionSurface .js-chair-stage-title")).toContainText("Pinti");
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
  fs.mkdirSync(output,{recursive:true});
  await page.screenshot({path:path.join(output,`selection-feedback-${testInfo.project.name}.png`),fullPage:false});
});

test("chairman surface supports keyboard navigation and locked previews",async({page},testInfo)=>{
  await page.goto("/?chairman-cards-visual-qa=1",{waitUntil:"domcontentloaded"});
  await page.evaluate(async()=>{
    const game=globalThis as any;
    game._applyCheat();
    game.goSetup();
    await game.pickCountry("TR");
  });
  const surface=page.locator("#chairSelectionSurface");
  await surface.scrollIntoViewIfNeeded();
  await expect(page.locator("#chairpick")).toHaveCount(0);
  await expect(surface.locator(".js-chair-selected-mark")).toBeVisible();
  await page.evaluate(()=>{const ids=(globalThis as any).unlockedChairs;ids.splice(0,ids.length,"babacan");});
  const next=surface.locator(".js-chair-next");
  await next.focus();
  await next.press("Enter");
  await expect(surface).toHaveClass(/is-chair-transitioning/);
  await expect(surface.locator(".js-chair-detail-index")).toHaveText("02 / 06");
  await expect(surface.locator(".js-chair-selected-mark")).toBeHidden();
  await expect(surface.locator(".js-chair-stage-image")).toHaveAttribute("alt",/Diplomat/i);
  await page.waitForTimeout(620);
  await expect(surface).not.toHaveClass(/is-chair-transitioning/);
  const lockedState=await surface.evaluate(node=>{const image=node.querySelector<HTMLElement>(".js-chair-stage-image");return{locked:node.classList.contains("is-chair-locked"),imageOpacity:image?getComputedStyle(image).opacity:"1",buttonText:node.textContent||""};});
  expect(lockedState.locked).toBe(true);
  expect(Number(lockedState.imageOpacity)).toBeLessThan(.5);
  fs.mkdirSync(output,{recursive:true});
  await page.screenshot({path:path.join(output,`locked-chairman-surface-${testInfo.project.name}.png`),fullPage:false});
});
