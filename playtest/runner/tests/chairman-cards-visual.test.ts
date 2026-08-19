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
    game._applyCheat();
    await game.pickCountry("TR");
  });
  await page.waitForFunction(()=>document.querySelectorAll("#chairpick .chairbtn").length===6,{timeout:20_000});
  const cards=page.locator("#chairpick .chair-card");
  await expect(cards).toHaveCount(6);
  await expect(page.locator("#chairpick")).toBeVisible();
  await page.locator("#chairpick").scrollIntoViewIfNeeded();

  const layout=await cards.evaluateAll(nodes=>nodes.map(node=>{
    const card=node as HTMLElement;
    const rect=card.getBoundingClientRect();
    const image=card.querySelector<HTMLElement>(".portrait")!.getBoundingClientRect();
    const copy=card.querySelector<HTMLElement>(".card-copy")!.getBoundingClientRect();
    const roleNode=card.querySelector<HTMLElement>(".chairbtn-role")!;
    const roleRect=roleNode.getBoundingClientRect();
    const footers=[...card.querySelectorAll<HTMLElement>(".card-foot")].filter(item=>getComputedStyle(item).display!=="none");
    const footerRect=footers[0]?.getBoundingClientRect();
    const legacyDetails=[...card.querySelectorAll<HTMLElement>(".chair-detail-link")].filter(item=>getComputedStyle(item).display!=="none");
    return{
      left:rect.left,right:rect.right,top:rect.top,bottom:rect.bottom,
      imageHeight:image.height,copyHeight:copy.height,footerCount:footers.length,
      roleRect:{top:roleRect.top,height:roleRect.height,display:getComputedStyle(roleNode).display,color:getComputedStyle(roleNode).color},
      footerRect:footerRect?{top:footerRect.top,height:footerRect.height}:null,
      name:card.querySelector<HTMLElement>(".chairbtn-name")?.textContent?.trim(),
      role:card.querySelector<HTMLElement>(".chairbtn-role")?.textContent?.trim(),
      detail:footers[0]?.textContent?.replace(/\s+/g," ").trim()||"",
      legacyDetails:legacyDetails.length,
      overflow:card.scrollWidth-card.clientWidth,
    };
  }));
  expect(layout.every(card=>card.imageHeight>100&&card.copyHeight>30&&card.footerCount===0&&card.legacyDetails===0&&card.name&&card.role&&card.roleRect.height>0&&card.roleRect.display!=="none"&&!card.detail&&card.overflow<=1),JSON.stringify(layout)).toBe(true);
  const expectedImageHeight=testInfo.project.name.includes("mobile")?104:205;
  expect(layout.every(card=>Math.abs(card.imageHeight-expectedImageHeight)<=1),JSON.stringify(layout)).toBe(true);
  if(testInfo.project.name.includes("mobile")){
    const rail=await page.locator("#chairpick").evaluate(node=>({display:getComputedStyle(node).display,overflowX:getComputedStyle(node).overflowX,scrollWidth:node.scrollWidth,clientWidth:node.clientWidth,cardWidth:(node.querySelector(".chair-card") as HTMLElement)?.getBoundingClientRect().width||0}));
    expect(rail.display).toBe("flex");
    expect(["auto","scroll"]).toContain(rail.overflowX);
    expect(rail.scrollWidth).toBeGreaterThan(rail.clientWidth);
    expect(rail.cardWidth).toBeLessThanOrEqual(0.7*await page.evaluate(()=>innerWidth));
  }
  expect(Math.max(...layout.map(card=>card.bottom-card.top))-Math.min(...layout.map(card=>card.bottom-card.top))).toBeLessThanOrEqual(2);
  const rows=[...new Set(layout.map(card=>Math.round(card.top)))].map(top=>layout.filter(card=>Math.abs(card.top-top)<=2).sort((a,b)=>a.left-b.left));
  expect(rows.every(row=>row.slice(1).every((card,index)=>card.left>=row[index].right-1))).toBe(true);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);

  fs.mkdirSync(output,{recursive:true});
  await page.waitForFunction(()=>{const image=document.querySelector<HTMLImageElement>("#chairSelectionSurface .js-chair-stage-image");return !!image&&image.complete&&image.naturalWidth>=2048},{timeout:20_000});
  await expect(page.locator("#chairSelectionSurface .js-chair-stage-image")).toBeVisible();
  await page.waitForTimeout(60);
  await page.screenshot({path:path.join(output,`${testInfo.project.name}.png`),fullPage:false});

  // Rail cards only select the chairman; profile data remains on the main surface.
  await cards.first().click();
  await expect(page.locator(".chair-picker-modal")).toBeHidden();
  await page.waitForFunction(()=>{const image=document.querySelector<HTMLImageElement>("#chairSelectionSurface .js-chair-stage-image");return !!image&&image.complete&&image.naturalWidth>=2048},{timeout:20_000});
  await expect(page.locator("#chairSelectionSurface .js-chair-stage-title")).toContainText("Patron");
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
    game._applyCheat();
    await game.pickCountry("TR");
  });
  await page.waitForFunction(()=>document.querySelectorAll("#chairpick .chairbtn").length===6,{timeout:20_000});
  const surface=page.locator("#chairSelectionSurface");
  await surface.scrollIntoViewIfNeeded();
  const ids=["babacan","leydi","pinti","sansasyoncu","torpilci","cilgin"];
  const measurements=[] as Array<Record<string,any>>;
  for(const id of ids){
    await page.locator(`#chairpick [data-chair-id="${id}"]`).click();
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
  expect(Math.max(...measurements.map(item=>item.imageBottom))-Math.min(...measurements.map(item=>item.imageBottom))).toBeLessThanOrEqual(2);
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
    await game.pickCountry("TR");
  });
  await page.waitForFunction(()=>document.querySelectorAll("#chairpick .chairbtn").length===6,{timeout:20_000});
  const surface=page.locator("#chairSelectionSurface");
  await surface.scrollIntoViewIfNeeded();

  await surface.locator(".js-chair-primary").click();
  await expect(page.locator("#chairpick [data-chair-id=\"babacan\"]")).toHaveAttribute("aria-selected","true");
  await expect(page.locator("#toastContainer .toast")).toContainText("Patron Başkan seçildi.");

  const pintiCard=page.locator("#chairpick [data-chair-id=\"pinti\"]");
  await pintiCard.scrollIntoViewIfNeeded();
  await pintiCard.click({force:true});
  const modal=page.locator(".chair-picker-modal");
  await expect(modal).toBeHidden();
  await expect(page.locator("#chairpick [data-chair-id=\"pinti\"]")).toHaveAttribute("aria-selected","true");
  await expect(page.locator("#chairSelectionSurface .js-chair-stage-title")).toContainText("Pinti");
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
  fs.mkdirSync(output,{recursive:true});
  await page.screenshot({path:path.join(output,`selection-feedback-${testInfo.project.name}.png`),fullPage:false});
});

test("chair rail supports keyboard, touch drag, centering and locked silhouettes",async({page},testInfo)=>{
  await page.goto("/?chairman-cards-visual-qa=1",{waitUntil:"domcontentloaded"});
  await page.evaluate(async()=>{
    const game=globalThis as any;
    game._applyCheat();
    await game.pickCountry("TR");
  });
  await page.waitForFunction(()=>document.querySelectorAll("#chairpick .chair-card").length===6,{timeout:20_000});
  const surface=page.locator("#chairSelectionSurface");
  const rail=page.locator("#chairpick");
  await surface.scrollIntoViewIfNeeded();

  const first=page.locator('#chairpick [data-chair-id="babacan"]');
  await first.focus();
  await first.press("ArrowRight");
  await expect(page.locator('#chairpick [data-chair-id="leydi"]')).toHaveAttribute("aria-selected","true");
  await expect(surface).toHaveClass(/is-chair-transitioning/);
  await expect(page.locator('#chairpick [data-chair-id="leydi"]')).toHaveAttribute("aria-current","true");
  await page.waitForTimeout(620);
  await expect(surface).not.toHaveClass(/is-chair-transitioning/);

  const lockedState=await page.evaluate(()=>{
    const unlocked=(globalThis as any).unlockedChairs;
    unlocked.splice(1);
    (globalThis as any).buildChairButtons();
    const card=document.querySelector<HTMLElement>('#chairpick [data-chair-id="leydi"]');
    const image=card?.querySelector<HTMLElement>(".chairthumb");
    return card&&image?{locked:card.classList.contains("locked"),opacity:getComputedStyle(card).opacity,imageOpacity:getComputedStyle(image).opacity,filter:getComputedStyle(image).filter,border:getComputedStyle(card).borderTopColor}:null;
  });
  expect(lockedState?.locked).toBe(true);
  expect(lockedState?.opacity).toBe("1");
  expect(Number(lockedState?.imageOpacity||"1")).toBeLessThan(.5);
  expect(lockedState?.filter).toContain("grayscale");
  fs.mkdirSync(output,{recursive:true});
  await page.screenshot({path:path.join(output,`locked-rail-${testInfo.project.name}.png`),fullPage:false});

  if(testInfo.project.name.includes("mobile")){
    await page.evaluate(()=>{const ids=(globalThis as any).unlockedChairs;ids.splice(0,ids.length,"babacan","leydi","pinti","sansasyoncu","torpilci","cilgin");(globalThis as any).buildChairButtons();});
    const last=page.locator('#chairpick [data-chair-id="cilgin"]');
    await last.click();
    await page.waitForTimeout(260);
    const centered=await rail.evaluate(node=>{const railRect=node.getBoundingClientRect(),card=node.querySelector<HTMLElement>('[data-chair-id="cilgin"]')!.getBoundingClientRect();return{scrollable:node.scrollWidth>node.clientWidth+2,delta:Math.abs((card.left+card.width/2)-(railRect.left+railRect.width/2)),cardWidth:card.width,scrollLeft:node.scrollLeft};});
    expect(centered.scrollable).toBe(true);
    expect(centered.delta).toBeLessThanOrEqual(centered.cardWidth?centered.cardWidth/2+8:120);
      const box=await rail.boundingBox();
      if(box){
        const before=await rail.evaluate(node=>node.scrollLeft);
        const max=await rail.evaluate(node=>node.scrollWidth-node.clientWidth);
        const fromX=before>max/2?box.x+24:box.x+180;
        const toX=before>max/2?box.x+180:box.x+24;
        const y=box.y+box.height/2;
        await rail.evaluate((node,{fromX,toX,y})=>{
          const init=(x)=>({bubbles:true,cancelable:true,clientX:x,clientY:y,pointerId:17,pointerType:"touch",isPrimary:true});
          node.dispatchEvent(new PointerEvent("pointerdown",init(fromX)));
          node.dispatchEvent(new PointerEvent("pointermove",init(toX)));
          node.dispatchEvent(new PointerEvent("pointerup",init(toX)));
        },{fromX,toX,y});
        const after=await rail.evaluate(node=>node.scrollLeft);
        expect(Math.abs(after-before)).toBeGreaterThan(4);
        await page.screenshot({path:path.join(output,`interactive-rail-${testInfo.project.name}.png`),fullPage:false});
      }
  }
});
