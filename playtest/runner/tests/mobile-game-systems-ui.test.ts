import {test,expect} from "@playwright/test";
import path from "node:path";
import fs from "node:fs";

const visualDir=path.resolve(__dirname,"../../../outputs/ui-visuals");
const mobileOnly=(name:string)=>name==="mobile-chromium";
const reset=async(page:any)=>{
  await page.addInitScript(()=>{
    for(const key of ["copa_run_v6","copa_run_v6_last_good","copa_run_v5","copa_run_v5_last_good"])localStorage.removeItem(key);
    sessionStorage.removeItem("copa_run");
  });
};
const capture=async(page:any,name:string)=>{
  fs.mkdirSync(visualDir,{recursive:true});
  await page.screenshot({path:path.join(visualDir,name),fullPage:true});
};
const expectSurfaceFit=async(page:any,selector:string)=>{
  const result=await page.locator(selector).evaluate((content:HTMLElement)=>{
    const shell=(content.closest(".sheet")||content) as HTMLElement;
    const rect=shell.getBoundingClientRect();
    const visible=(element:HTMLElement)=>{
      const style=getComputedStyle(element),box=element.getBoundingClientRect();
      return style.display!=="none"&&style.visibility!=="hidden"&&Number(style.opacity)>.1&&box.width>0&&box.height>0;
    };
    const clippedControls=Array.from(content.querySelectorAll<HTMLElement>("button,input,select,textarea,a"))
      .filter(visible)
      .map(element=>({label:(element.innerText||element.getAttribute("aria-label")||"").trim().slice(0,40),rect:element.getBoundingClientRect()}))
      .filter(item=>item.rect.left<-1||item.rect.right>innerWidth+1);
    return{
      shell:{left:rect.left,right:rect.right,top:rect.top,bottom:rect.bottom},
      viewport:{width:innerWidth,height:innerHeight},
      pageOverflow:document.documentElement.scrollWidth-innerWidth,
      clippedControls,
    };
  });
  expect(result.pageOverflow,`${selector} caused horizontal page overflow`).toBeLessThanOrEqual(1);
  expect(result.shell.left,`${selector} escaped the left viewport edge`).toBeGreaterThanOrEqual(-1);
  expect(result.shell.right,`${selector} escaped the right viewport edge`).toBeLessThanOrEqual(result.viewport.width+1);
  expect(result.shell.top,`${selector} escaped the top viewport edge`).toBeGreaterThanOrEqual(-1);
  expect(result.shell.bottom,`${selector} escaped the bottom viewport edge`).toBeLessThanOrEqual(result.viewport.height+1);
  expect(result.clippedControls,`${selector} has horizontally clipped controls`).toEqual([]);
};
const reachDraw=async(page:any)=>{
  await page.evaluate(async()=>{const game=globalThis as any;game.CopaMobileShell.newRun();await game.quickStart();if(game._countryDraftPromise)await game._countryDraftPromise;await game.quickAll();});
  await expect(page.locator("#postClubName")).toBeVisible();
  await expect(page.locator(".pc-insights article")).toHaveCount(3);
  await expect(page.locator(".pc-mini-pitch .pc-mini-player")).toHaveCount(11);
  await expect(page.locator(".pc-mini-pitch .pc-mini-player small")).toHaveCount(11);
  const playerLabels=await page.locator(".pc-mini-pitch .pc-mini-player small").allTextContents();
  expect(playerLabels.every((label:string)=>label.trim().length>0&&Array.from(label.trim()).length<=7)).toBe(true);
  expect(await page.locator(".pc-warning").count()).toBeGreaterThanOrEqual(1);
  await expectSurfaceFit(page,".postcard");
  const squadVisuals=await page.evaluate(()=>{
    const pitch=getComputedStyle(document.querySelector<HTMLElement>(".pc-mini-pitch")!);
    const warnings=[...document.querySelectorAll<HTMLElement>(".pc-warning")].map(node=>getComputedStyle(node).backgroundColor);
    const ratings=[...document.querySelectorAll<HTMLElement>(".pc-mini-player b")].map(node=>getComputedStyle(node).color);
    const insights=[...document.querySelectorAll<HTMLElement>(".pc-insights article")].map(node=>getComputedStyle(node).backgroundColor);
    const labels=[...document.querySelectorAll<HTMLElement>(".pc-mini-player small")].map(node=>({display:getComputedStyle(node).display,text:node.textContent||""}));
    return{pitch: `${pitch.backgroundColor} ${pitch.backgroundImage}`,warnings,ratings:[...new Set(ratings)],insights,labels};
  });
  expect(squadVisuals.pitch).toMatch(/31, 107, 69|radial-gradient/);
  expect(squadVisuals.warnings.every((value:string)=>value!=="rgba(0, 0, 0, 0)")).toBe(true);
  expect(squadVisuals.ratings.length).toBeGreaterThanOrEqual(1);
  expect(new Set(squadVisuals.insights).size).toBeGreaterThanOrEqual(2);
  expect(squadVisuals.labels.every((item:{display:string,text:string})=>item.display!=="none"&&item.text.trim())).toBe(true);
  await capture(page,"04-squad-ready.png");
  await page.locator("#postClubName").fill("Mobil Test FK");
  await page.evaluate(()=>(globalThis as any).pcGo());
  await expect(page.locator("#tournamentDraw")).toBeVisible();
};

test("native landing and three-step setup read as a mobile game",async({page},testInfo)=>{
  test.skip(!mobileOnly(testInfo.project.name),"native phone presentation");
  await reset(page);
  await page.addInitScript(()=>localStorage.setItem("copa_meta_progression_v1",JSON.stringify({
    version:2,
    career:{reputation:632,licenses:1,unlockWindowOpen:true},
    mastery:{styles:{},formations:{},chairmen:{}},
    badges:[],archive:[],museum:{memories:[],hall:[]},
  })));
  await page.goto("/?native-game=1&visual=landing",{waitUntil:"domcontentloaded"});
  const landing=page.locator("#mobileGameLanding");
  await expect(landing).toBeVisible();
  await expect(landing).toContainText(/COPA LİFE|COPA LIFE/i);
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  await capture(page,"01-native-landing.png");
  await page.locator('#mobileGameLanding button[onclick*="newRun"]').click();
  await expect(page.locator('#introSetup [data-mobile-step="1"]')).toBeVisible();
  await expect(page.locator('#introSetup [data-mobile-step="2"]')).toBeHidden();
  await expect(page.locator("#countryPick .country-name")).toHaveCount(6);
  await expect(page.locator("#countryPick [data-country='JP'] .country-new-ribbon")).toHaveCount(0);
  expect(await page.locator("#countryPick button").evaluateAll(buttons=>buttons.every(button=>button.querySelectorAll(".country-name").length===1))).toBe(true);
  const next=page.locator("[data-step-next]");
  await expect(next).toHaveCount(1);
  await next.click();
  await expect(page.locator('#introSetup [data-mobile-step="2"]')).toBeVisible();
  await expect(page.locator(".formation-card-kicker")).toHaveCount(0);
  await expect(page.locator("#formpick .fbtn.sel .formation-card-name")).toBeVisible();
  await expect(page.locator("#introSetup .v7-cta-stack")).toBeHidden();
  await expect(page.locator("#introSetup>.metaline")).toBeHidden();
  await expect(page.locator("#introSetup>.v7-footer-block")).toBeHidden();
  await page.locator("#formpick .fbtn.locked").first().click();
  await expect(page.locator(".formation-unlock-modal")).toBeVisible();
  await expect(page.locator("#introSetup .v7-cta-stack")).toBeHidden();
  await expect(page.locator("#introSetup>.metaline")).toBeHidden();
  await page.locator(".formation-unlock-modal .btn-primary").click();
  await expect(page.locator(".formation-unlock-modal")).toBeHidden();
  await expect(page.locator('#introSetup [data-mobile-step="2"]')).toBeVisible();
  await expect(page.locator("#introSetup .v7-cta-stack")).toBeHidden();
  await expect(page.locator("#introSetup>.metaline")).toBeHidden();
  await next.click();
  await expect(page.locator('#introSetup [data-mobile-step="3"]')).toBeVisible();
  await expect(page.locator("#startBtn")).toBeVisible();
  await page.evaluate(()=>{const modal=document.getElementById("modal");if(modal&&!modal.classList.contains("hidden"))(globalThis as any).closeModal();document.querySelector(".copa-coachmark")?.remove();});
  await capture(page,"02-native-chairman.png");
  await page.locator("#startBtn").click();
  await expect(page.locator(".style-select-modal")).toBeVisible();
  await expect(page.locator(".style-impact-grid span")).toHaveCount(10);
  expect(await page.locator(".style-impact-grid span").evaluateAll(nodes=>nodes.every(node=>getComputedStyle(node).backgroundColor!=="rgba(0, 0, 0, 0)"))).toBe(true);
  expect(await page.locator(".style-impact-grid span").evaluateAll(nodes=>nodes.every(node=>node.getBoundingClientRect().width<node.parentElement!.getBoundingClientRect().width*.8))).toBe(true);
  await expectSurfaceFit(page,".style-select-modal");
  await capture(page,"02b-style-selection.png");
  await page.evaluate(()=>(globalThis as any).closeModal());
  await page.evaluate(()=>(globalThis as any).showModal(`<div class="formation-unlock-modal"><div class="kithdr">TAKTİK LİSANSI</div><div class="kitsub">5-3-2 dizilişini kalıcı aç. İki tur arasında yalnız bir lisans kullanılabilir.</div><div class="bact"><button class="btn btn-primary">DİZİLİŞİ AÇ</button><button class="btn btn-ghost">VAZGEÇ</button></div></div>`));
  await expectSurfaceFit(page,".formation-unlock-modal");
  const licenseControls=await page.locator(".formation-unlock-modal").evaluate((modal:HTMLElement)=>{
    const copy=modal.querySelector(".kitsub")!.getBoundingClientRect(),buttons=[...modal.querySelectorAll("button")].map(node=>node.getBoundingClientRect());
    return{separated:buttons[0].top>=copy.bottom,nonOverlapping:buttons[1].top>=buttons[0].bottom};
  });
  expect(licenseControls).toEqual({separated:true,nonOverlapping:true});
  await capture(page,"02-native-setup-step3.png");
});

test("native landing remains centered at tablet portrait width",async({page},testInfo)=>{
  test.skip(!mobileOnly(testInfo.project.name),"native tablet presentation");
  await reset(page);
  await page.setViewportSize({width:760,height:1365});
  await page.goto("/?native-game=1&visual=tablet-landing",{waitUntil:"domcontentloaded"});
  await expect(page.locator("#mobileGameLanding")).toBeVisible();
  const layout=await page.evaluate(()=>{
    const rect=(selector:string)=>document.querySelector<HTMLElement>(selector)!.getBoundingClientRect();
    const content=rect(".mgl-content"),actions=rect(".mgl-actions");
    const sections=[".mgl-brand",".mgl-road",".mgl-board-wrap",".mgl-meta",".mgl-bottom"].map(rect);
    const center=(box:DOMRect)=>box.left+box.width/2;
    return{
      contentCenterDelta:Math.abs(center(content)-innerWidth/2),
      actionCenterDelta:Math.abs(center(actions)-innerWidth/2),
      widthDelta:Math.abs(content.width-actions.width),
      sectionEdgeDeltas:sections.map(box=>({
        left:Math.abs(box.left-content.left),
        right:Math.abs(box.right-content.right),
      })),
      pageOverflow:document.documentElement.scrollWidth-innerWidth,
    };
  });
  expect(layout.contentCenterDelta).toBeLessThanOrEqual(1);
  expect(layout.actionCenterDelta).toBeLessThanOrEqual(1);
  expect(layout.widthDelta).toBeLessThanOrEqual(1);
  expect(Math.max(...layout.sectionEdgeDeltas.flatMap(edge=>[edge.left,edge.right]))).toBeLessThanOrEqual(1);
  expect(layout.pageOverflow).toBeLessThanOrEqual(1);
  await capture(page,"01b-native-tablet-landing.png");
});

test("draft candidates keep only the two useful quick actions",async({page},testInfo)=>{
  test.skip(!mobileOnly(testInfo.project.name),"native phone presentation");
  await reset(page);
  await page.goto("/?native-game=1&visual=draft-controls",{waitUntil:"domcontentloaded"});
  await page.evaluate(async()=>{const game=globalThis as any;game.CopaMobileShell.newRun();await game.quickStart();if(game._countryDraftPromise)await game._countryDraftPromise;});
  await expect(page.locator("#draftThumbDock")).toBeHidden();
  await expect(page.locator("#mobileDraftContext")).toHaveCount(0);
  await expect(page.locator("#draftThumbDock .draft-thumb-head,#draftThumbDock [data-draft-filter]")).toHaveCount(0);
  await expect(page.locator("#draftThumbDock button")).toHaveCount(2);
  await expect(page.locator("#draftThumbDock #allBtn")).toBeHidden();
  await expect(page.locator("#draftThumbDock #undoBtn")).toBeHidden();
  const cashSurfaces=await page.locator("#draftKasaTile").evaluate((tile:HTMLElement)=>{
    const states=["kasa-rich","kasa-positive","kasa-zero","kasa-debt","kasa-deep-debt"];
    return states.map(state=>{
      tile.classList.remove(...states);tile.classList.add(state);
      const style=getComputedStyle(tile);
      return style.backgroundImage+"|"+style.backgroundColor;
    });
  });
  expect(new Set(cashSurfaces).size).toBe(5);
  await page.evaluate(()=>(globalThis as any).setBudget());
  await page.locator("#rollBtn").click();
  await expect(page.locator("#opts .opt")).toHaveCount(3);
  await expect(page.locator("#opts .opt-forecast")).toHaveCount(3);
  await expect(page.locator("#draftThumbDock")).toBeVisible();
  await expect(page.locator("#draftThumbDock #allBtn")).toBeVisible();
  await expect(page.locator("#rollBtn")).toBeDisabled();
  const lockedRoll=await page.evaluate(()=>{
    const game=globalThis as any,beforeDeadline=document.getElementById("ddClock")!.textContent,beforeOptions=document.getElementById("opts")!.textContent,result=game.roll();
    return{result,options:document.getElementById("opts")!.textContent===beforeOptions,deadline:document.getElementById("ddClock")!.textContent===beforeDeadline};
  });
  expect(lockedRoll).toEqual({result:false,options:true,deadline:true});
  const controlOrder=await page.evaluate(()=>{
    const opts=document.getElementById("opts")!.getBoundingClientRect(),auto=document.getElementById("allBtn")!.getBoundingClientRect(),reroll=document.getElementById("rerollBtn")!.getBoundingClientRect();
    return{autoAfterCandidates:auto.top>=opts.bottom-1,rerollAfterAuto:reroll.top>=auto.bottom-1};
  });
  expect(controlOrder).toEqual({autoAfterCandidates:true,rerollAfterAuto:true});
  expect(await page.evaluate(()=>(globalThis as any)._draftPositionFilter)).toBe("ALL");
  const gallery=await page.locator("#opts").evaluate((element:HTMLElement)=>({overflow:element.scrollWidth-element.clientWidth,pageOverflow:document.documentElement.scrollWidth-innerWidth,columns:getComputedStyle(element).gridAutoColumns}));
  expect(gallery.overflow).toBeGreaterThan(0);
  expect(gallery.pageOverflow).toBeLessThanOrEqual(1);
  await page.locator("#opts .opt").first().click();
  await expect(page.locator("#draftThumbDock #undoBtn")).toBeVisible();
  await expect(page.locator("#draftThumbDock #allBtn")).toBeVisible();
  await expect(page.locator("#draftThumbDock #undoBtn")).toContainText(/geri al|undo/i);
  await expect(page.locator("#draftThumbDock")).toHaveClass(/has-undo/);
  const rollQuickActions=await page.locator("#draftThumbDock .draft-quick-actions").evaluate((actions:HTMLElement)=>{
    const auto=actions.querySelector<HTMLElement>("#allBtn")!.getBoundingClientRect();
    const undo=actions.querySelector<HTMLElement>("#undoBtn")!.getBoundingClientRect();
    return{sameRow:Math.abs(auto.top-undo.top)<=1,overflow:actions.scrollWidth-actions.clientWidth};
  });
  expect(rollQuickActions).toEqual({sameRow:true,overflow:0});
  await capture(page,"03-draft-candidate-gallery.png");
});

test("captain recommendation has contextual ratings and a distinct animated highlight",async({page},testInfo)=>{
  test.skip(!mobileOnly(testInfo.project.name),"native phone presentation");
  await reset(page);
  await page.goto("/?native-game=1&visual=captain",{waitUntil:"domcontentloaded"});
  await page.evaluate(async()=>{
    const game=globalThis as any;
    await game.quickStart();
    if(game._countryDraftPromise)await game._countryDraftPromise;
    await game.quickAll();
    game.closeModal();
    game.pickCaptain();
  });
  await expect(page.locator(".captain-picker")).toBeVisible();
  await expect(page.locator(".cap-card")).toHaveCount(11);
  await expect(page.locator(".cap-card-suggest")).toHaveCount(1);
  const captainVisuals=await page.evaluate(()=>{
    const card=document.querySelector<HTMLElement>(".cap-card-suggest")!,badge=card.querySelector<HTMLElement>(".cap-card-badge")!;
    const powers=[...document.querySelectorAll<HTMLElement>(".cap-card-power")].map(node=>getComputedStyle(node).color);
    const cardStyle=getComputedStyle(card),badgeStyle=getComputedStyle(badge);
    return{powerColors:[...new Set(powers)],cardBackground:cardStyle.backgroundImage,badgeBackground:badgeStyle.backgroundColor,badgeColor:badgeStyle.color,animation:cardStyle.animationName};
  });
  expect(captainVisuals.powerColors.length).toBeGreaterThanOrEqual(2);
  expect(captainVisuals.cardBackground).toContain("linear-gradient");
  expect(captainVisuals.badgeBackground).toBe("rgb(10, 17, 24)");
  expect(captainVisuals.badgeColor).toBe("rgb(255, 255, 255)");
  expect(captainVisuals.animation).toContain("capRecommendGlow");
  await expectSurfaceFit(page,".captain-picker");
  await capture(page,"03e-captain-picker.png");
});

test("compact draw ceremony reveals a ball and preserves accessible controls",async({page},testInfo)=>{
  test.skip(!mobileOnly(testInfo.project.name),"native phone presentation");
  await reset(page);
  await page.goto("/?native-game=1&visual=draw",{waitUntil:"domcontentloaded"});
  await reachDraw(page);
  const foreignClubs=await page.evaluate(()=>{
    const game=globalThis as any,data=game.countryGameData(game.selectedCountry);
    const domestic=new Set((data[1]||[]).map((name:any)=>String(name).trim().toLocaleLowerCase()));
    for(const player of data[0]||[]){
      const club=Array.isArray(player)?player[3]:player?.club||player?.team;
      if(club)domestic.add(String(club).trim().toLocaleLowerCase());
    }
    const label=game.countryDisplayName(game.selectedCountry,game.LANG).toLocaleLowerCase();
    return Object.values(game.tournament.teams).filter((team:any)=>team.id!=="player").map((team:any)=>team.name).filter((name:string)=>!domestic.has(name.trim().toLocaleLowerCase())&&!name.toLocaleLowerCase().startsWith(label+" "));
  });
  expect(foreignClubs).toEqual([]);
  await expect(page.locator("#phaserDrawStage canvas")).toBeHidden();
  await expect(page.locator(".td-machine>.td-pot-card")).toBeVisible();
  await expect(page.locator(".td-pot-card>.td-ball")).toBeVisible();
  await expect(page.locator(".td-group")).toHaveCount(8);
  await expect(page.locator(".td-group.is-eligible")).toHaveCount(8);
  await expect(page.locator("[data-hold-draw]")).toContainText(/basılı tut|hold/i);
  await expect(page.locator(".td-actions .btn-primary")).toBeVisible();
  expect(await page.evaluate(()=>getComputedStyle(document.body).overflowY)).toBe("hidden");
  expect(await page.evaluate(()=>getComputedStyle(document.documentElement).overflowY)).toBe("hidden");
  await page.locator("[data-hold-draw]").click();
  await page.waitForTimeout(120);
  await expect(page.locator(".td-progress")).toHaveAttribute("aria-valuenow","0");
  await capture(page,"03-phaser-draw.png");
  await page.locator(".td-actions .btn-primary").click();
  await expect.poll(()=>page.locator(".td-progress").getAttribute("aria-valuenow")).toBe("1");
  await expect(page.locator(".td-transfer-band")).toBeVisible();
  const drawSummaryLayout=await page.evaluate(()=>{
    const pot=document.querySelector<HTMLElement>(".td-pot-card")!,ball=document.querySelector<HTMLElement>(".td-pot-card>.td-ball")!,band=document.querySelector<HTMLElement>(".td-transfer-band")!;
    const parts=[...band.children].map(node=>(node as HTMLElement).getBoundingClientRect());
    const potRect=pot.getBoundingClientRect(),ballRect=ball.getBoundingClientRect();
    const centers=parts.map(rect=>rect.top+rect.height/2);
    return{ballAtRight:potRect.right-ballRect.right<14,sameRow:Math.max(...centers)-Math.min(...centers)<2};
  });
  expect(drawSummaryLayout).toEqual({ballAtRight:true,sameRow:true});
  await expect(page.locator(".td-group.is-target")).toHaveCount(1);
  await capture(page,"03b-draw-after-ball.png");
  await expect(page.locator("#tournamentDrawLive")).not.toHaveText(/Sıradaki top hazır|Next ball is ready/);
});

test("holding quick draw completes the ceremony and reduced motion stays explicit",async({page},testInfo)=>{
  test.skip(!mobileOnly(testInfo.project.name),"native phone presentation");
  await reset(page);
  await page.goto("/?native-game=1&visual=hold-draw",{waitUntil:"domcontentloaded"});
  await reachDraw(page);
  await page.evaluate(()=>{document.body.classList.add("reduced-motion");const game=globalThis as any;game.CopaTournamentUI.renderDraw(document.getElementById("tournamentDrawApp"),game.tournament,game.CopaTournamentRuntime.copy());});
  await expect(page.locator(".td-motion-note")).toBeVisible();
  const quick=page.locator("[data-hold-draw]");
  await quick.dispatchEvent("pointerdown",{pointerType:"touch",button:0});
  await page.waitForTimeout(760);
  await expect(page.locator(".td-progress")).toHaveAttribute("aria-valuenow","32");
  const completedBallAlignment=await page.locator(".td-pot-card>.td-ball").evaluate((ball:HTMLElement)=>{
    const mark=ball.querySelector<HTMLElement>("span")!,outer=ball.getBoundingClientRect(),inner=mark.getBoundingClientRect();
    return{horizontal:Math.abs((outer.left+outer.width/2)-(inner.left+inner.width/2)),vertical:Math.abs((outer.top+outer.height/2)-(inner.top+inner.height/2))};
  });
  expect(completedBallAlignment.horizontal).toBeLessThanOrEqual(1);
  expect(completedBallAlignment.vertical).toBeLessThanOrEqual(1);
});

test("preparation, mobile routes and locker-room talk are playable",async({page},testInfo)=>{
  test.skip(!mobileOnly(testInfo.project.name),"native phone presentation");
  await reset(page);
  await page.goto("/?native-game=1&visual=systems",{waitUntil:"domcontentloaded"});
  await reachDraw(page);
  await page.evaluate(()=>{const game=globalThis as any;game.fastTournamentDraw();game.finishTournamentDraw();game.setCaptain(0);game.closeModal();});
  await expect(page.locator("#hub")).toBeVisible();
  const metricSurfaces=await page.locator("#hub .hub-stat-row").evaluate((row:HTMLElement)=>
    [...row.children].map(node=>{
      const style=getComputedStyle(node);
      return{backgroundColor:style.backgroundColor,backgroundImage:style.backgroundImage};
    })
  );
  expect(metricSurfaces.every(surface=>surface.backgroundColor!=="rgba(0, 0, 0, 0)")).toBe(true);
  expect(new Set(metricSurfaces.map(surface=>surface.backgroundImage)).size).toBeGreaterThanOrEqual(3);
  await capture(page,"03b-context-metrics.png");
  await expect(page.locator("#feedwrap")).toBeVisible();
  expect(await page.locator("#feedwrap").evaluate(node=>node.parentElement?.classList.contains("hcol-l"))).toBe(true);
  const versusLayout=await page.locator(".vsbar").evaluate((bar:HTMLElement)=>{
    const youCrest=bar.querySelector<HTMLElement>(".you .vs-crest")!.getBoundingClientRect(),youText=bar.querySelector<HTMLElement>(".you .vs-ti")!.getBoundingClientRect();
    const oppCrest=bar.querySelector<HTMLElement>(".opp .vs-crest")!.getBoundingClientRect(),oppText=bar.querySelector<HTMLElement>(".opp .vs-ti")!.getBoundingClientRect();
    return{youOrdered:youCrest.right<=youText.left+1,oppOrdered:oppText.right<=oppCrest.left+1,scoutInMiddle:!!bar.querySelector(".mid>.vsscout")};
  });
  expect(versusLayout).toEqual({youOrdered:true,oppOrdered:true,scoutInMiddle:false});
  expect(await page.locator(".context-metric").evaluateAll(nodes=>nodes.every(node=>getComputedStyle(node).backgroundColor!=="rgba(0, 0, 0, 0)"||getComputedStyle(node).backgroundImage!=="none"))).toBe(true);
  await expect(page.locator("#nativeHubNav button")).toHaveCount(4);
  const coachmark=page.locator(".copa-coachmark");
  if(await coachmark.isVisible())await coachmark.locator(".copa-coachmark-ok").click();
  await page.locator(".kasa-detail-btn").click();
  await expect(page.locator(".cash-mechanic-sheet")).toBeVisible();
  await expect(page.locator(".cash-mechanic-rules article")).toHaveCount(4);
  await page.setViewportSize({width:760,height:390});
  const cashGuideLayout=await page.locator(".cash-mechanic-sheet").evaluate((sheet:HTMLElement)=>{
    const parse=(value:string)=>(value.match(/[\d.]+/g)||[]).slice(0,3).map(Number);
    const luminance=(rgb:number[])=>{
      const channels=rgb.map(value=>{const n=value/255;return n<=.03928?n/12.92:Math.pow((n+.055)/1.055,2.4);});
      return channels[0]*.2126+channels[1]*.7152+channels[2]*.0722;
    };
    const contrast=(foreground:string,background:string)=>{
      const a=luminance(parse(foreground)),b=luminance(parse(background));
      return(Math.max(a,b)+.05)/(Math.min(a,b)+.05);
    };
    const header=sheet.querySelector<HTMLElement>("header")!,icon=header.querySelector<SVGElement>("svg")!,copy=header.querySelector<HTMLElement>("div")!;
    const articles=[...sheet.querySelectorAll<HTMLElement>(".cash-mechanic-rules article")];
    const firstText=articles[0].querySelector<HTMLElement>("p")!;
    const firstNumber=articles[0].querySelector<HTMLElement>("i")!;
    const sheetRect=sheet.getBoundingClientRect(),iconRect=icon.getBoundingClientRect(),copyRect=copy.getBoundingClientRect();
    return{
      headerOrdered:iconRect.right<=copyRect.left,
      leftInset:Math.min(...articles.map(article=>article.getBoundingClientRect().left-sheetRect.left)),
      rightInset:Math.min(...articles.map(article=>sheetRect.right-article.getBoundingClientRect().right)),
      textContrast:contrast(getComputedStyle(firstText).color,getComputedStyle(articles[0]).backgroundColor),
      numberContrast:contrast(getComputedStyle(firstNumber).color,getComputedStyle(firstNumber).backgroundColor),
      pageOverflow:document.documentElement.scrollWidth-innerWidth,
    };
  });
  expect(cashGuideLayout.headerOrdered).toBe(true);
  expect(cashGuideLayout.leftInset).toBeGreaterThanOrEqual(12);
  expect(cashGuideLayout.rightInset).toBeGreaterThanOrEqual(12);
  expect(cashGuideLayout.textContrast).toBeGreaterThanOrEqual(4.5);
  expect(cashGuideLayout.numberContrast).toBeGreaterThanOrEqual(4.5);
  expect(cashGuideLayout.pageOverflow).toBeLessThanOrEqual(1);
  await expectSurfaceFit(page,".cash-mechanic-sheet");
  await capture(page,"03c-cash-guide.png");
  await page.evaluate(()=>(globalThis as any).closeModal());
  await page.setViewportSize({width:447,height:799});
  await page.locator(".kasa-detail-link").click();
  await expect(page.locator(".cash-detail-sheet")).toBeVisible();
  await expect(page.locator(".cash-detail-metrics article")).toHaveCount(4);
  const cashDetailLayout=await page.locator(".cash-detail-sheet").evaluate((sheet:HTMLElement)=>{
    const parse=(value:string)=>(value.match(/[\d.]+/g)||[]).slice(0,3).map(Number);
    const luminance=(rgb:number[])=>{
      const channels=rgb.map(value=>{const n=value/255;return n<=.03928?n/12.92:Math.pow((n+.055)/1.055,2.4);});
      return channels[0]*.2126+channels[1]*.7152+channels[2]*.0722;
    };
    const contrast=(foreground:string,background:string)=>{
      const a=luminance(parse(foreground)),b=luminance(parse(background));
      return(Math.max(a,b)+.05)/(Math.min(a,b)+.05);
    };
    const header=sheet.querySelector<HTMLElement>("header")!;
    const title=header.querySelector<HTMLElement>("div")!;
    const status=header.querySelector<HTMLElement>("em")!;
    const hero=sheet.querySelector<HTMLElement>(".cash-detail-hero")!;
    const amount=hero.querySelector<HTMLElement>("div:first-child > b")!;
    const history=sheet.querySelector<HTMLElement>(".cash-history")!;
    const historyAmount=history.querySelector<HTMLElement>("li > strong")!;
    const polyline=hero.querySelector<SVGPolylineElement>("polyline")!;
    const titleRect=title.getBoundingClientRect(),statusRect=status.getBoundingClientRect();
    return{
      headerOrdered:titleRect.right<=statusRect.left,
      kickerFits:title.querySelector<HTMLElement>("span")!.scrollWidth<=title.querySelector<HTMLElement>("span")!.clientWidth+1,
      amountContrast:contrast(getComputedStyle(amount).color,getComputedStyle(hero).backgroundColor),
      historyContrast:contrast(getComputedStyle(historyAmount).color,getComputedStyle(history).backgroundColor),
      chartStroke:getComputedStyle(polyline).stroke,
      pageOverflow:document.documentElement.scrollWidth-innerWidth,
    };
  });
  expect(cashDetailLayout.headerOrdered).toBe(true);
  expect(cashDetailLayout.kickerFits).toBe(true);
  expect(cashDetailLayout.amountContrast).toBeGreaterThanOrEqual(4.5);
  expect(cashDetailLayout.historyContrast).toBeGreaterThanOrEqual(4.5);
  expect(cashDetailLayout.chartStroke).not.toBe("none");
  expect(cashDetailLayout.chartStroke).not.toBe("rgb(0, 0, 0)");
  expect(cashDetailLayout.pageOverflow).toBeLessThanOrEqual(1);
  await expectSurfaceFit(page,".cash-detail-sheet");
  await capture(page,"03d-cash-details.png");
  await page.evaluate(()=>(globalThis as any).closeModal());
  await page.setViewportSize({width:430,height:932});
  await page.locator("#presBtn").evaluate((button:HTMLButtonElement)=>button.click());
  await expect(page.locator("#toastContainer")).toContainText(/quarter-final|çeyrek final/i);
  await page.locator('#nativeHubNav [data-native-target="match"]').click();
  await expect(page.locator("#hubPitch")).toBeVisible();
  await expect(page.locator("#hubPitch .roundel.full")).toHaveCount(11);
  const actionLayout=await page.locator("#mobileActionDock .actionbtns").evaluate((panel:HTMLElement)=>{
    const controls=["presBtn","talkBtn","playBtn"].map(id=>document.getElementById(id)!.getBoundingClientRect());
    return{
      rows:new Set(controls.map(rect=>Math.round(rect.top))).size,
      panelOverflow:panel.scrollWidth-panel.clientWidth,
      widths:controls.map(rect=>Math.round(rect.width)),
    };
  });
  expect(actionLayout.rows).toBe(1);
  expect(actionLayout.panelOverflow).toBeLessThanOrEqual(1);
  expect(actionLayout.widths.every(width=>width>=44)).toBe(true);
  await expect(page.locator("#playBtn svg")).toHaveCount(0);
  await expect(page.locator("#playBtn .dock-play-arrow")).toHaveText("→");
  await expect(page.locator("#matchModeToggle")).toHaveCount(0);
  expect(await page.locator("#playBtn").evaluate((button:HTMLElement)=>getComputedStyle(button).backgroundColor)).toBe("rgb(242, 74, 40)");
  await capture(page,"03e-match-action-dock.png");
  await page.evaluate(()=>(globalThis as any).showMatchModePicker((globalThis as any).squadPower((globalThis as any).round)));
  await expect(page.locator(".match-mode-modal")).toBeVisible();
  const matchModeLayout=await page.locator(".match-mode-modal").evaluate((modal:HTMLElement)=>{
    const buttons=[...modal.querySelectorAll<HTMLElement>(".match-mode-options button")].map(button=>button.getBoundingClientRect());
    const back=modal.querySelector<HTMLElement>(".match-mode-back")!;
    const memory=modal.querySelector<HTMLElement>(".match-mode-memory")!;
    return{
      background:getComputedStyle(modal).backgroundColor,
      warningBackground:getComputedStyle(modal.querySelector<HTMLElement>(".match-mode-warnings span,.match-mode-clear")!).backgroundColor,
      buttonBackgrounds:[...modal.querySelectorAll<HTMLElement>(".match-mode-options button")].map(button=>getComputedStyle(button).backgroundColor),
      aligned:Math.abs(buttons[0].top-buttons[1].top)<=1&&Math.abs(buttons[0].height-buttons[1].height)<=1,
      memoryGap:memory.getBoundingClientRect().top-buttons[0].bottom,
      backGap:back.getBoundingClientRect().top-memory.getBoundingClientRect().bottom,
      backHeight:back.getBoundingClientRect().height,
    };
  });
  expect(matchModeLayout.background).toBe("rgb(39, 52, 60)");
  expect(matchModeLayout.warningBackground).not.toBe("rgba(0, 0, 0, 0)");
  expect(matchModeLayout.buttonBackgrounds.every(color=>color==="rgb(23, 36, 45)")).toBe(true);
  expect(matchModeLayout.aligned).toBe(true);
  expect(matchModeLayout.memoryGap).toBeGreaterThanOrEqual(8);
  expect(matchModeLayout.backGap).toBeGreaterThanOrEqual(8);
  expect(matchModeLayout.backHeight).toBeGreaterThanOrEqual(40);
  await expectSurfaceFit(page,".match-mode-modal");
  await capture(page,"03g-match-mode-modal.png");
  await page.evaluate(()=>(globalThis as any).closeModal());
  await expect(page.locator("#prepBtn")).toHaveCount(0);
  await page.locator('#nativeHubNav [data-native-target="market"]').click();
  await expect(page.locator("#marketDecisionHeader")).toBeVisible();
  await expect(page.locator("#marketDecisionHeader .market-money span")).toHaveCount(2);
  await expect(page.locator("#marketDecisionHeader [role='meter']")).toBeVisible();
  await expect(page.locator("#marketDecisionHeader .market-filters")).toHaveCount(0);
  await expect(page.locator("#marketDecisionHeader")).not.toContainText(/BU TUR|THIS ROUND|HARCANAN|SPENT/i);
  await expect(page.locator("#shopcards")).not.toContainText(/KASA SONRASI|CASH AFTER/i);
  await expect(page.locator("#freeAgentRow")).not.toContainText(/KASA SONRASI|CASH AFTER/i);
  await capture(page,"03h-compact-market.png");
  await expect(page.locator("#freeAgentRow .free-agent-card")).toHaveCount(2);
  expect(await page.locator("#freeAgentRow .free-agent-actions").evaluateAll(rows=>rows.every(row=>row.querySelectorAll("button").length===1))).toBe(true);
  await page.locator("#freeAgentRow .free-agent-review").first().click();
  await expect(page.locator(".free-agent-detail")).toBeVisible();
  await expect(page.locator(".free-agent-versus")).toBeVisible();
  await expect(page.locator(".free-agent-versus article")).toHaveCount(2);
  await expectSurfaceFit(page,".free-agent-detail");
  await capture(page,"03i-free-agent-comparison.png");
  await page.evaluate(()=>(globalThis as any).closeModal());
  await page.locator('#nativeHubNav [data-native-target="training"]').click();
  await page.waitForTimeout(300);
  const trainingTabStyle=await page.locator('#nativeHubNav [data-native-target="training"]').evaluate((tab:HTMLElement)=>({
    color:getComputedStyle(tab).color,
    theme:document.documentElement.dataset.theme||"light",
  }));
  expect(trainingTabStyle.color).toBe(trainingTabStyle.theme==="dark"?"rgb(125, 211, 252)":"rgb(39, 106, 139)");
  await expect(page.locator("#mobileTrainingRoute .prep-modal")).toBeVisible();
  await expect(page.locator("#mobileTrainingRoute h3")).toHaveText(/Antrenman Merkezi|Training Centre/);
  await expect(page.locator(".prep-drill")).toHaveCount(7);
  await expectSurfaceFit(page,".prep-modal");
  await expect(page.locator(".mobile-opponent-analysis .mobile-training-scout")).toBeVisible();
  await page.locator(".mobile-opponent-analysis .mobile-training-scout").click();
  await expect(page.locator(".scout-report-modal")).toBeVisible();
  await page.evaluate(()=>(globalThis as any).closeModal());
  const drillSounds=await page.evaluate(()=>{
    const game=globalThis as any,heard:string[]=[];
    const hooks:{[key:string]:string}={sfxKick:"kick",sfxStamp:"stamp",sfxWhistle:"whistle",sfxTick:"tick",sfxSeat:"seat",sfxSave:"save",sfxFormation:"formation"};
    Object.entries(hooks).forEach(([name,label])=>game[name]=()=>heard.push(label));
    game.CopaPreparation.reset();
    ["finishing","defence","setpieces","penalties","cohesion","recovery","analysis"].forEach(id=>{
      game.CopaPreparation.select(id,"light",1);
      game.CopaPreparation.clear(id);
    });
    return heard;
  });
  expect(drillSounds).toEqual(["kick","stamp","whistle","tick","seat","save","formation"]);
  await page.locator('.prep-drill[data-drill="finishing"] [data-prep-level="light"]').click();
  await expect(page.locator("[data-prep-status]")).toContainText(/1 (hazırlık puanı|preparation point|training points)/i);
  await capture(page,"04-preparation-board.png");
  await page.locator(".prep-modal .btn-primary").click();
  await expect(page.locator('#nativeHubNav [data-native-target="match"]')).toHaveClass(/active/);
  await page.locator("#talkBtn").evaluate((button:HTMLButtonElement)=>button.click());
  await expect(page.locator(".locker-room-modal")).toBeVisible();
  await expectSurfaceFit(page,".locker-room-modal");
  await capture(page,"05-locker-room.png");
  await page.locator('[data-talk-target="attack"]').click();
  await page.locator('[data-tone="believe"]').click();
  await expect(page.locator(".locker-result")).toBeVisible();
  await expectSurfaceFit(page,".locker-result");
  await expect(page.locator(".locker-result-chips")).toContainText(/Odak|Focus/);
  await capture(page,"06-locker-room-result.png");
  await page.evaluate(()=>(globalThis as any).closeModal());
  await page.evaluate(async()=>{
    const game=globalThis as any;
    game.setTheme("dark");
    await game.CopaLazy.openMetaProgression();
  });
  await expect(page.locator(".meta-progress-modal")).toBeVisible();
  await expectSurfaceFit(page,".meta-progress-modal");
  await capture(page,"07-club-career-dark.png");
  await page.evaluate(()=>(globalThis as any).setTheme("light"));
  await expect(page.locator("html")).toHaveAttribute("data-theme","dark");
  await expect(page.locator("#themeSetting")).toHaveCount(0);
  await expectSurfaceFit(page,".meta-progress-modal");
  await capture(page,"08-club-career-dark-only.png");
});

test("market identity, free-agent comparison and relationship sheet stay compact",async({page},testInfo)=>{
  test.skip(!mobileOnly(testInfo.project.name),"native phone presentation");
  await reset(page);
  await page.goto("/?native-game=1&visual=market-relationships",{waitUntil:"domcontentloaded"});
  await reachDraw(page);
  await page.evaluate(()=>{const game=globalThis as any;game.fastTournamentDraw();game.finishTournamentDraw();game.setCaptain(0);game.closeModal();game.CopaMobileExperience.refresh();});
  await expect(page.locator("#hub")).toBeVisible();
  await expect(page.locator('#nativeHubNav [data-native-target="market"] .native-hub-market-dot')).toBeVisible();
  const navBadges=await page.evaluate(()=>{
    const training=document.querySelector<HTMLElement>('#nativeHubNav [data-native-target="training"]')!;
    const count=training.querySelector<HTMLElement>(".native-hub-tab-count")!;
    const market=document.querySelector<HTMLElement>('#nativeHubNav [data-native-target="market"]')!;
    const dot=market.querySelector<HTMLElement>(".native-hub-market-dot")!;
    const trainingBox=training.getBoundingClientRect(),countBox=count.getBoundingClientRect(),dotBox=dot.getBoundingClientRect();
    const countStyle=getComputedStyle(count),dotStyle=getComputedStyle(dot);
    return{
      countText:count.textContent?.trim(),
      countTopGap:Math.round(countBox.top-trainingBox.top),
      countRightGap:Math.round(trainingBox.right-countBox.right),
      countBackground:countStyle.backgroundColor,
      countBorderRadius:parseFloat(countStyle.borderRadius),
      dotRoundness:Math.abs(dotBox.width-dotBox.height),
      dotAnimation:dotStyle.animationName,
    };
  });
  expect(navBadges.countText).toBe("2/2");
  expect(navBadges.countTopGap).toBeGreaterThanOrEqual(4);
  expect(navBadges.countRightGap).toBeGreaterThanOrEqual(4);
  expect(navBadges.countBackground).not.toBe("rgba(0, 0, 0, 0)");
  expect(navBadges.countBorderRadius).toBeGreaterThanOrEqual(6);
  expect(navBadges.dotRoundness).toBeLessThanOrEqual(1);
  expect(navBadges.dotAnimation).toContain("hubMarketNoticePulse");
  await page.locator('#nativeHubNav [data-native-target="market"]').click();
  await expect(page.locator('#nativeHubNav [data-native-target="market"] .native-hub-market-dot')).toBeHidden();
  await expect(page.locator("#marketDecisionHeader .market-condition small")).toBeVisible();
  await expect(page.locator("#marketDecisionHeader .market-money span")).toHaveCount(2);
  await expect(page.locator("#freeAgentRow .free-agent-card")).toHaveCount(2);
  expect(await page.locator("#freeAgentRow .free-agent-actions").evaluateAll(rows=>rows.every(row=>row.querySelectorAll("button").length===1))).toBe(true);
  const marketSurfaces=await page.evaluate(()=>{
    const style=(selector:string)=>getComputedStyle(document.querySelector<HTMLElement>(selector)!);
    const card=style("#freeAgentRow .free-agent-card");
    const head=style("#freeAgentRow .free-agent-card .ct-head");
    const impact=style("#freeAgentRow .free-agent-impact span");
    const actions=style("#freeAgentRow .free-agent-actions");
    const cash=style("#marketDecisionHeader .market-cash-panel");
    return{
      cardBackground:card.backgroundColor,
      cardBorder:card.borderLeftStyle,
      headBackground:head.backgroundColor,
      impactBackground:impact.backgroundColor,
      actionsBackground:actions.backgroundColor,
      cashBackground:cash.backgroundColor,
    };
  });
  for(const [surface,value] of Object.entries(marketSurfaces)){
    if(surface==="cardBorder")expect(value).toBe("solid");
    else expect(value,`${surface} must be opaque`).not.toBe("rgba(0, 0, 0, 0)");
  }
  await capture(page,"06-market-opaque-surfaces.png");
  await page.locator("#freeAgentRow .free-agent-review").first().click();
  await expect(page.locator(".free-agent-detail")).toBeVisible();
  await expect(page.locator(".free-agent-versus article")).toHaveCount(2);
  await expectSurfaceFit(page,".free-agent-detail");
  await capture(page,"03i-free-agent-comparison.png");
  await page.evaluate(()=>{
    const game=globalThis as any;game.closeModal();
    game.CopaRelationships.restore({bonds:{"test oyuncu|CM":3},seenPlayers:[],pending:{key:"test oyuncu|CM",name:"Test Oyuncu",pos:"CM",personality:"professional",bond:3,type:"permission",round:2},eventCount:1,matchPower:0,startToken:1});
    game.CopaRelationships.showPending();
  });
  await expect(page.locator(".relationship-modal")).toBeVisible();
  await expect(page.locator(".relationship-choices button")).toHaveCount(3);
  await expectSurfaceFit(page,".relationship-modal");
  await capture(page,"03j-player-relationship.png");
  await page.evaluate(()=>{
    const game=globalThis as any;game.closeModal();
    const styles=["gegen","kontra","tiki"],chairs=["babacan","leydi","pinti"];
    styles.forEach((style,index)=>game.CopaMeta.recordRun({
      seed:9100+index,metaRun:100+index,country:"TR",team:`Müze ${index+1}`,formation:"4-4-2",style,chairman:chairs[index],identity:"test",
      round:7,playedMatches:7,wins:index===2?7:4,draws:0,won:index===2,power:80+index,cards:3,cash:2,score:"2-1",
      players:[0,1].map(offset=>({name:`Müze Oyuncu ${index*2+offset+1}`,pos:offset?"CM":"GK",ov:72+index+offset,age:24+offset}))
    }));
    const memories=game.CopaMeta.getState().museum.memories;
    memories.flatMap((memory:any)=>memory.players.map((player:any)=>[memory.id,player.id])).slice(0,5).forEach(([runId,playerId]:string[])=>game.CopaMeta.toggleHallPlayer(runId,playerId));
    game.CopaMeta.openProgression("museum");
  });
  await expect(page.locator(".meta-collection-grid article")).toHaveCount(8);
  await expect(page.locator(".meta-collection-grid article.is-complete")).toHaveCount(4);
  await expect(page.locator(".meta-token-bank")).toBeVisible();
  await expectSurfaceFit(page,".meta-progress-modal");
  await capture(page,"03k-museum-collections.png");
});

test("club files stay opt-in and never interrupt another hub route",async({page},testInfo)=>{
  test.skip(!mobileOnly(testInfo.project.name),"native phone presentation");
  await reset(page);
  await page.goto("/?native-game=1&visual=club-files",{waitUntil:"domcontentloaded"});
  await reachDraw(page);
  await page.evaluate(()=>{const game=globalThis as any;game.fastTournamentDraw();game.finishTournamentDraw();game.setCaptain(0);game.closeModal();});
  await page.locator('#nativeHubNav [data-native-target="market"]').click();
  await page.waitForTimeout(2500);
  await expect(page.locator("#modal")).toHaveClass(/hidden/);
  await page.locator('#nativeHubNav [data-native-target="career"]').click();
  const prompt=page.locator(".club-file-panel-pending");
  await expect(prompt).toBeVisible();
  await prompt.click();
  await expect(page.locator(".club-file-select")).toBeVisible();
  await page.locator(".club-file-options button").first().click();
  await expect(page.locator("#modal")).toHaveClass(/hidden/);
  expect(await page.evaluate(()=>(globalThis as any).CopaClubFiles.snapshot().selected)).toBe("debt");
});

test("Phaser penalty canvas keeps ball and keeper directions tied to the core result",async({page},testInfo)=>{
  test.skip(!mobileOnly(testInfo.project.name),"native phone presentation");
  await reset(page);
  await page.goto("/?native-game=1&visual=penalties",{waitUntil:"domcontentloaded"});
  await page.evaluate(async()=>{const game=globalThis as any;game.CopaMobileShell.newRun();await game.quickStart();game._cheatPenaltyLaunch();});
  await expect(page.locator(".pen-modal")).toBeVisible({timeout:15_000});
  await expect(page.locator("#phaserPenaltyStage canvas")).toBeVisible({timeout:15_000});
  await expectSurfaceFit(page,".pen-modal");
  const directionLayout=await page.locator(".pen-dir-grid").evaluate((grid:HTMLElement)=>{
    const rects=[...grid.querySelectorAll<HTMLElement>(".pen-dir-btn")].map(button=>button.getBoundingClientRect());
    return{
      columns:getComputedStyle(grid).gridTemplateColumns.split(" ").length,
      rows:new Set(rects.map(rect=>Math.round(rect.top))).size,
      overflow:grid.scrollWidth-grid.clientWidth,
    };
  });
  expect(directionLayout.columns).toBe(3);
  expect(directionLayout.rows).toBe(1);
  expect(directionLayout.overflow).toBeLessThanOrEqual(1);
  await page.locator('.pen-dir-btn[data-dir="L"]').click();
  const result=await page.evaluate(()=>{
    const state=(globalThis as any)._penState,reveal=state.reveal;
    const outcome=document.querySelector<HTMLElement>(".pen-outcome");
    return{
      type:reveal.type,shot:reveal.shot,keeper:reveal.keeper,byUser:reveal.byUser,
      consistent:reveal.type!=="save"||reveal.shot===reveal.keeper,
      favorable:reveal.type==="goal"?!reveal.byUser:!!reveal.byUser,
      outcomeClass:outcome?.className||"",
      outcomeBackground:outcome?getComputedStyle(outcome).backgroundColor:"",
      success:getComputedStyle(document.documentElement).getPropertyValue("--status-success").trim(),
      risk:getComputedStyle(document.documentElement).getPropertyValue("--status-risk").trim(),
    };
  });
  expect(result.consistent).toBe(true);
  if(result.type==="save")expect(result.shot).toBe(result.keeper);
  expect(result.outcomeClass).toContain(result.favorable?"is-positive":"is-negative");
  if(result.favorable)expect(result.outcomeBackground).toBe("rgb(78, 155, 101)");
  else expect(result.outcomeBackground).toBe("rgb(218, 61, 46)");
  await capture(page,"09-phaser-penalty.png");
});

test("native run restart returns to the redesigned Copa Life landing",async({page},testInfo)=>{
  test.skip(!mobileOnly(testInfo.project.name),"native phone presentation");
  await reset(page);
  await page.goto("/?native-game=1&visual=restart-landing",{waitUntil:"domcontentloaded"});
  await page.evaluate(()=>{const game=globalThis as any;game.CopaMobileShell.newRun();game.restart();});
  await expect(page.locator("#mobileGameLanding")).toBeVisible();
  await expect(page.locator("#introSetup")).toBeHidden();
  await expect(page.locator(".mgl-road li")).toHaveCount(4);
  await expect(page.locator(".mgl-brand")).toContainText(/COPA LİFE|COPA LIFE/i);
});

test("web preparation board stays inside its modal shell",async({page})=>{
  await reset(page);
  await page.goto("/?autotest=1&groups=1&visual=prep-fit",{waitUntil:"domcontentloaded"});
  await reachDraw(page);
  await page.evaluate(()=>{const game=globalThis as any;game.fastTournamentDraw();game.finishTournamentDraw();game.setCaptain(0);game.closeModal();game.openPreparation();});
  await expect(page.locator(".prep-modal")).toBeVisible();
  await expect(page.locator(".prep-drill")).toHaveCount(7);
  await expectSurfaceFit(page,".prep-modal");
  const fit=await page.locator(".prep-modal").evaluate((panel:HTMLElement)=>{
    const shell=panel.closest(".sheet") as HTMLElement,panelRect=panel.getBoundingClientRect(),shellRect=shell.getBoundingClientRect();
    return{
      panelOverflow:panel.scrollWidth-panel.clientWidth,
      shellOverflow:shell.scrollWidth-shell.clientWidth,
      panelLeft:panelRect.left,
      panelRight:panelRect.right,
      shellLeft:shellRect.left,
      shellRight:shellRect.right
    };
  });
  expect(fit.panelOverflow).toBeLessThanOrEqual(1);
  expect(fit.shellOverflow).toBeLessThanOrEqual(1);
  expect(fit.panelLeft).toBeGreaterThanOrEqual(fit.shellLeft-1);
  expect(fit.panelRight).toBeLessThanOrEqual(fit.shellRight+1);
});

test("match result events keep card consequences on one aligned row",async({page})=>{
  await reset(page);
  await page.setViewportSize({width:430,height:932});
  await page.goto("/?autotest=1&visual=result-events",{waitUntil:"domcontentloaded"});
  await page.evaluate(()=>{
    const game=globalThis as any;
    document.documentElement.dataset.theme="dark";
    (0,eval)("LANG='tr'");
    const events=[
      {m:7,type:"near",home:true,name:"Arda Erdursun"},
      {m:7,type:"red",home:true,name:"Arda Erdursun"},
      {m:20,type:"goal",home:true,name:"Semedo"},
      {m:50,type:"yellow",home:true,name:"Arda Erdursun"},
    ];
    game.showModal(`<div class="tele tele-win"><div class="thead">MAÇ SONUCU</div><div class="tele-body">${game.matchEventsHTML(events)}</div></div>`);
  });
  await expect(page.locator(".tele .goalsum>div")).toHaveCount(4);
  const eventLayout=await page.locator(".tele .goalsum").evaluate((list:HTMLElement)=>{
    const rows=[...list.children].map(row=>(row as HTMLElement).getBoundingClientRect());
    const red=list.querySelector<HTMLElement>(".event-red")!,impact=red.querySelector<HTMLElement>(".event-impact")!;
    const redRect=red.getBoundingClientRect(),impactRect=impact.getBoundingClientRect();
    return{
      maxHeight:Math.max(...rows.map(row=>row.height)),
      impactInside:impactRect.top>=redRect.top&&impactRect.bottom<=redRect.bottom,
      overflow:list.scrollWidth-list.clientWidth,
      impactText:impact.textContent,
      redCardFill:getComputedStyle(red.querySelector<SVGRectElement>(".event-icon rect")!).fill,
    };
  });
  expect(eventLayout.maxHeight).toBeLessThanOrEqual(52);
  expect(eventLayout.impactInside).toBe(true);
  expect(eventLayout.overflow).toBeLessThanOrEqual(1);
  expect(eventLayout.impactText).toContain("−1");
  expect(eventLayout.redCardFill).toBe("rgb(218, 61, 46)");
  await expectSurfaceFit(page,".tele");
  await capture(page,"10-match-result-events.png");
});
