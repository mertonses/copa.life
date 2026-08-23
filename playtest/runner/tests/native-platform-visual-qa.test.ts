import {test,expect} from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const output=path.resolve(__dirname,"../../../outputs/ui-visuals/native-platforms");
const platformFor=(project:string)=>project==="webkit-mobile"?"ios":"android";
const packagePath=(platform:string)=>platform==="ios"?"/dist-ios/index.html":"/dist-android/index.html";

async function clean(page:any){
  await page.addInitScript(()=>{
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem("copa_online_features_onboarding_v1",JSON.stringify({
      version:"online-features-v1",terms:true,matching:false,sharing:false,leaderboard:false,
      action:"native_visual_qa",accepted_at:new Date().toISOString(),
    }));
  });
}

async function capture(page:any,platform:string,name:string){
  fs.mkdirSync(output,{recursive:true});
  await page.screenshot({path:path.join(output,`${platform}-${name}.png`),fullPage:true});
}

async function openHub(page:any,platform:string){
  await page.goto(`${packagePath(platform)}?native-hub-visual-qa=1`,{waitUntil:"domcontentloaded"});
  await page.evaluate(async()=>{
    const game=globalThis as any;
    if(game.CopaMobileShellReady)await game.CopaMobileShellReady;
    game.setLang("tr");
    game.CopaMobileShell.newRun();
    await game.quickStart();
    if(game._countryDraftPromise)await game._countryDraftPromise;
    await game.quickAll();
  });
  await page.locator("#postClubName").fill(`${platform.toUpperCase()} QA`);
  await page.evaluate(()=>{
    const game=globalThis as any;
    game.pcGo();
    game.fastTournamentDraw();
    game.finishTournamentDraw();
    game.setCaptain(0);
    game.closeModal();
    game.CopaClubFiles.select("debt");
  });
  await expect(page.locator("#hub")).toBeVisible();
  const coachmark=page.locator(".copa-coachmark");
  if(await coachmark.isVisible())await coachmark.locator(".copa-coachmark-ok").click();
}

test("Android and iOS setup states stay contextual, readable and bounded",async({page},testInfo)=>{
  test.skip(!["mobile-chromium","webkit-mobile"].includes(testInfo.project.name),"native package visual matrix");
  const platform=platformFor(testInfo.project.name);
  await clean(page);

  for(const viewport of [
    {width:360,height:800,name:"phone-small"},
    {width:430,height:932,name:"phone"},
    {width:768,height:1024,name:"tablet"},
  ]){
    await page.setViewportSize({width:viewport.width,height:viewport.height});
    await page.goto(`${packagePath(platform)}?native-setup-${viewport.name}=1`,{waitUntil:"domcontentloaded"});
    await expect(page.locator("html")).toHaveAttribute("data-copa-platform",platform);
    await expect(page.locator("#mobileGameLanding")).toBeVisible();
    await expect(page.locator("#loader")).toBeHidden({timeout:10_000});
    if(platform==="android"){
      expect(await page.locator(".mode-gate-app-promo,.mode-gate-mobile-app-cta").evaluateAll(nodes=>nodes.filter((node:any)=>node.offsetParent).length)).toBe(0);
      await expect(page.locator(".global-footer-bar")).toBeHidden();
    }
    const landing=await page.evaluate(()=>({
      overflow:document.documentElement.scrollWidth-innerWidth,
      actions:[...document.querySelectorAll<HTMLElement>(".mgl-actions button")]
        .filter(button=>button.offsetParent)
        .map(button=>{const rect=button.getBoundingClientRect();return{left:rect.left,right:rect.right,height:rect.height};}),
    }));
    expect(landing.overflow,`${platform} ${viewport.name}`).toBeLessThanOrEqual(1);
    expect(landing.actions.every(action=>action.left>=0&&action.right<=viewport.width+1&&action.height>=44)).toBe(true);
    await capture(page,platform,`${viewport.name}-landing`);

    await page.locator("#settingsBtn").click();
    await expect(page.locator("#settingsDrop")).toBeVisible();
    const settings=await page.locator("#settingsDrop").evaluate((menu:HTMLElement)=>{
      const rect=menu.getBoundingClientRect();
      return{left:rect.left,right:rect.right,top:rect.top,bottom:rect.bottom,width:rect.width,viewportWidth:innerWidth,viewportHeight:innerHeight};
    });
    expect(settings.left,`${platform} ${viewport.name} settings ${JSON.stringify(settings)}`).toBeGreaterThanOrEqual(0);
    expect(settings.right,`${platform} ${viewport.name} settings ${JSON.stringify(settings)}`).toBeLessThanOrEqual(viewport.width+1);
    expect(settings.top,`${platform} ${viewport.name} settings ${JSON.stringify(settings)}`).toBeGreaterThanOrEqual(0);
    expect(settings.width,`${platform} ${viewport.name} settings ${JSON.stringify(settings)}`).toBeGreaterThanOrEqual(Math.min(300,viewport.width-20));
    await capture(page,platform,`${viewport.name}-settings`);
    await page.locator("#settingsBtn").click();
    await expect(page.locator("#settingsDrop")).toBeHidden();

    if(viewport.width>760&&platform!=="android")continue;
    await page.evaluate(()=>(globalThis as any).CopaMobileShell.newRun());
    await expect(page.locator("body")).toHaveClass(/mobile-game-setup-open/);
    await expect(page.locator('#introSetup [data-mobile-step="1"]').first()).toBeVisible();
    await expect(page.locator("[data-step-back]")).toBeHidden();
    await expect.poll(()=>page.locator("#chairSelectionSurface .js-chair-stage-image").evaluate((image:HTMLImageElement)=>image.naturalWidth)).toBeGreaterThan(0);
    const leakedStep2=await page.locator('#introSetup [data-mobile-step="2"]').evaluateAll(nodes=>nodes.filter((node:any)=>node.offsetParent).map((node:any)=>({tag:node.tagName,id:node.id,cls:node.className,display:getComputedStyle(node).display})));
    expect(leakedStep2,`${platform} ${viewport.name} leaked step 2`).toEqual([]);
    await expect(page.locator("#mobileActionDock")).toBeHidden();
    const chairmanFirst=await page.evaluate(()=>({
      overflow:document.documentElement.scrollWidth-innerWidth,
      surface:document.querySelector<HTMLElement>("#chairSelectionSurface")!.getBoundingClientRect(),
      previous:document.querySelector<HTMLElement>("#chairSelectionSurface .js-chair-prev")!.getBoundingClientRect(),
      next:document.querySelector<HTMLElement>("#chairSelectionSurface .js-chair-next")!.getBoundingClientRect(),
    }));
    expect(chairmanFirst.overflow,`${platform} ${viewport.name} chairman`).toBeLessThanOrEqual(1);
    expect(chairmanFirst.surface.left).toBeGreaterThanOrEqual(0);
    expect(chairmanFirst.surface.right).toBeLessThanOrEqual(viewport.width+1);
    expect(chairmanFirst.previous.height).toBeGreaterThanOrEqual(44);
    expect(chairmanFirst.next.height).toBeGreaterThanOrEqual(44);
    await capture(page,platform,`${viewport.name}-setup-first`);
    await page.locator("[data-step-next]").click();
    await expect(page.locator("[data-step-back]")).toBeVisible();
    await expect(page.locator('#introSetup [data-mobile-step="2"]').first()).toBeVisible();
    const leakedStep1=await page.locator('#introSetup [data-mobile-step="1"]').evaluateAll(nodes=>nodes.filter((node:any)=>node.offsetParent).map((node:any)=>({tag:node.tagName,id:node.id,cls:node.className,display:getComputedStyle(node).display})));
    expect(leakedStep1,`${platform} ${viewport.name} leaked step 1`).toEqual([]);
    await expect(page.locator("#mobileActionDock")).toBeHidden();
    const roster=await page.evaluate(() => ({
      overflow:document.documentElement.scrollWidth-innerWidth,
      formations:[...document.querySelectorAll<HTMLElement>("#formpick .mobile-formation-card")].map(button=>button.getBoundingClientRect()),
      countries:[...document.querySelectorAll<HTMLElement>("#countryPick button")].map(button=>button.getBoundingClientRect()),
      start:document.querySelector<HTMLElement>("#startBtn")!.getBoundingClientRect(),
    }));
    expect(roster.overflow,`${platform} ${viewport.name} roster`).toBeLessThanOrEqual(1);
    expect(roster.formations.every(card=>card.left>=0&&card.right<=viewport.width+1&&card.height>=44)).toBe(true);
    expect(roster.countries.every(card=>card.left>=0&&card.right<=viewport.width+1&&card.height>=44)).toBe(true);

    await expect(page.locator("#startBtn")).toBeVisible();
    await page.locator('#countryPick button[data-country="IT"]').click();
    await expect(page.locator('#countryPick button[data-country="IT"]')).toHaveAttribute("aria-pressed","true");
    await expect(page.locator('#countryPick button[data-country="TR"]')).toHaveAttribute("aria-pressed","false");
    const start=await page.locator("#startBtn").boundingBox();
    expect(start).not.toBeNull();
    expect(start!.width).toBeGreaterThanOrEqual(viewport.width-(viewport.width>760?80:40));
    expect(start!.height).toBeGreaterThanOrEqual(44);
    await capture(page,platform,`${viewport.name}-setup-final`);
  }
});

test("Android and iOS hub routes keep navigation, feedback and actions unobstructed",async({page},testInfo)=>{
  test.skip(!["mobile-chromium","webkit-mobile"].includes(testInfo.project.name),"native package hub parity");
  const platform=platformFor(testInfo.project.name);
  await clean(page);
  await page.setViewportSize({width:430,height:932});
  await openHub(page,platform);

  await page.locator('#nativeHubNav [data-native-target="match"]').click();
  await expect(page.locator("#mobileActionDock")).toBeVisible();
  await page.evaluate(()=>(globalThis as any).showToast("Native visual QA",{type:"info",duration:5000}));
  const match=await page.evaluate(()=>{
    const dock=document.getElementById("mobileActionDock")!;
    const toast=[...document.querySelectorAll<HTMLElement>(".toast")].find(item=>item.offsetParent)!;
    const actionRoot=dock.querySelector<HTMLElement>(".actionbtns")!;
    const buttons=[...actionRoot.querySelectorAll<HTMLElement>("button")].filter(button=>button.offsetParent);
    const nav=document.getElementById("nativeHubNav")!;
    return{
      overflow:document.documentElement.scrollWidth-innerWidth,
      navCount:nav.querySelectorAll("button").length,
      talkStyle:(()=>{const talk=nav.ownerDocument.querySelector<HTMLElement>("#mobileActionDock #talkBtn")!;const play=nav.ownerDocument.querySelector<HTMLElement>("#mobileActionDock #playBtn")!;const talkRect=talk.getBoundingClientRect();const playRect=play.getBoundingClientRect();const content=[...play.children].map(node=>(node as HTMLElement).getBoundingClientRect());const contentLeft=Math.min(...content.map(rect=>rect.left));const contentRight=Math.max(...content.map(rect=>rect.right));return{background:getComputedStyle(talk).backgroundColor,color:getComputedStyle(talk).color,centerDelta:Math.abs((contentLeft+contentRight)/2-(playRect.left+playRect.right)/2),verticalCenterDelta:Math.abs((talkRect.top+talkRect.bottom)/2-(playRect.top+playRect.bottom)/2)}})(),
      kasa:(()=>{const card=document.getElementById("kasaTile")!;const label=card.querySelector<HTMLElement>(".kasa-compact-debt-label")!;const value=card.querySelector<HTMLElement>(".kasa-compact-debt-value")!;const detail=card.querySelector<HTMLElement>(".kasa-detail-link")!;const labelRect=label.getBoundingClientRect();const valueRect=value.getBoundingClientRect();const cardRect=card.getBoundingClientRect();const detailRect=detail.getBoundingClientRect();const siblingHeights=["chemTile","powTile","trustTile"].map(id=>document.getElementById(id)!.getBoundingClientRect().height);return{hasDetailText:/detay/i.test(card.textContent||""),height:cardRect.height,siblingHeights,label:label.textContent?.trim(),value:value.textContent?.trim(),labelFont:Number.parseFloat(getComputedStyle(label).fontSize),valueFont:Number.parseFloat(getComputedStyle(value).fontSize),overlap:labelRect.right>valueRect.left+1&&labelRect.bottom>valueRect.top+1&&labelRect.top<valueRect.bottom-1,detailOverlap:labelRect.right>detailRect.left+1&&labelRect.left<detailRect.right-1&&labelRect.bottom>detailRect.top+1&&labelRect.top<detailRect.bottom-1,detailRight:detailRect.right,detailBottom:detailRect.bottom,cardRight:cardRect.right,cardBottom:cardRect.bottom,detailPosition:getComputedStyle(detail).position}})(),
      visibleToasts:[...document.querySelectorAll<HTMLElement>(".toast")].filter(item=>item.offsetParent).length,
      navBottom:nav.getBoundingClientRect().bottom,
      toast:{top:toast.getBoundingClientRect().top,bottom:toast.getBoundingClientRect().bottom},
      dockTop:dock.getBoundingClientRect().top,
      clipped:buttons.filter(button=>button.scrollWidth>button.clientWidth+1).map(button=>button.id),
      tiny:buttons.filter(button=>button.getBoundingClientRect().height<44).map(button=>button.id),
    };
  });
  expect(match.overflow).toBeLessThanOrEqual(1);
  expect(match.navCount).toBe(5);
  expect(match.talkStyle.background).toBe("rgb(31, 107, 69)");
  expect(match.talkStyle.color).toBe("rgb(243, 245, 244)");
  expect(match.talkStyle.centerDelta).toBeLessThanOrEqual(2);
  expect(match.talkStyle.verticalCenterDelta).toBeLessThanOrEqual(1);
  expect(match.kasa.hasDetailText).toBe(false);
  expect(match.kasa.label).toBe("LİMİT");
  expect(match.kasa.value).toMatch(/€/);
  expect(match.kasa.labelFont).toBeGreaterThanOrEqual(7);
  expect(match.kasa.valueFont).toBeGreaterThanOrEqual(9);
  expect(match.kasa.siblingHeights.every(height=>Math.abs(height-match.kasa.height)<=1),JSON.stringify(match.kasa)).toBe(true);
  expect(match.kasa.overlap).toBe(false);
  expect(match.kasa.detailOverlap).toBe(false);
  expect(match.kasa.detailRight).toBeLessThanOrEqual(match.kasa.cardRight+1);
  expect(match.kasa.detailBottom).toBeLessThanOrEqual(match.kasa.cardBottom+1);
  expect(match.kasa.detailPosition).toBe("absolute");
  expect(match.visibleToasts).toBe(1);
  expect(match.toast.top).toBeGreaterThan(match.navBottom);
  expect(match.toast.bottom).toBeLessThanOrEqual(match.dockTop-8);
  expect(match.clipped).toEqual([]);
  expect(match.tiny).toEqual([]);
  await capture(page,platform,"hub-match");

  await page.locator('#nativeHubNav [data-native-target="market"]').click();
  await expect(page.locator("#shopcards>.cardtile")).toHaveCount(3);
  const marketGrid=await page.locator("#shopcards").evaluate((root:HTMLElement)=>({
    columns:getComputedStyle(root).gridTemplateColumns.split(" ").length,
    rows:[...root.children].map(child=>(child as HTMLElement).getBoundingClientRect().top),
  }));
  expect(marketGrid.columns).toBe(2);
  expect(new Set(marketGrid.rows).size).toBe(2);
  const marketCards=await page.evaluate(()=>[...document.querySelectorAll<HTMLElement>("#shopcards>.market-card")].map(card=>{
    const face=card.querySelector<HTMLElement>(".market-card-face")!;
    const rect=(selector:string)=>face.querySelector<HTMLElement>(selector)!.getBoundingClientRect();
    const cardRect=card.getBoundingClientRect(),faceRect=face.getBoundingClientRect(),impact=rect(".market-card-impact"),title=rect(".market-card-title"),desc=rect(".market-card-desc"),bottom=rect(".market-card-bottom");
    return{inside:faceRect.left>=cardRect.left-1&&faceRect.right<=cardRect.right+1&&faceRect.top>=cardRect.top-1&&faceRect.bottom<=cardRect.bottom+1,order:impact.bottom<=title.top+1&&title.bottom<=desc.top+1&&desc.bottom<=bottom.top+1,cardHeight:cardRect.height};
  }));
  expect(marketCards.every(card=>card.inside),JSON.stringify(marketCards)).toBe(true);
  expect(marketCards.every(card=>card.order),JSON.stringify(marketCards)).toBe(true);
  expect(marketCards.every(card=>card.cardHeight>=270),JSON.stringify(marketCards)).toBe(true);
  await expect(page.locator("#freeAgentRow .free-agent-card")).toHaveCount(4);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
  await capture(page,platform,"hub-market");

  await page.locator('#nativeHubNav [data-native-target="sidefield"]').click();
  await expect(page.locator("#sideFieldRoute")).toBeVisible();
  const sidefield=await page.evaluate(()=>{
    const route=document.getElementById("sideFieldRoute")!;
    const hero=route.querySelector<HTMLElement>(".ys-hero")!;
    const buttons=[...route.querySelectorAll<HTMLElement>("button")].filter(button=>button.offsetParent);
    return{
      overflow:document.documentElement.scrollWidth-innerWidth,
      heading:route.querySelector("h1")?.textContent?.trim(),
      heroVisible:hero.getBoundingClientRect().height>0,
      offscreen:buttons.filter(button=>{const rect=button.getBoundingClientRect();return rect.left<0||rect.right>innerWidth+1;}).map(button=>button.textContent?.trim()),
      clipped:buttons.filter(button=>button.scrollWidth>button.clientWidth+1).map(button=>button.textContent?.trim()),
    };
  });
  expect(sidefield.overflow).toBeLessThanOrEqual(1);
  expect(sidefield.heading).toBe("RİSK");
  expect(sidefield.heroVisible).toBe(true);
  expect(sidefield.offscreen).toEqual([]);
  expect(sidefield.clipped).toEqual([]);
  await capture(page,platform,"hub-sidefield");

  await page.locator('#nativeHubNav [data-native-target="training"]').click();
  await expect(page.locator("#mobileTrainingRoute")).toBeVisible();
  const training=await page.evaluate(()=>{
    const route=document.getElementById("mobileTrainingRoute")!;
    const drills=[...route.querySelectorAll<HTMLElement>(".prep-drill")];
    const cta=route.querySelector<HTMLElement>(".bact .btn")!;
    const rect=cta.getBoundingClientRect();
    return{
      overflow:document.documentElement.scrollWidth-innerWidth,
      visible:drills.filter(drill=>drill.offsetParent).length,
      total:drills.length,
      cta:{left:rect.left,right:rect.right,height:rect.height},
    };
  });
  expect(training.overflow).toBeLessThanOrEqual(1);
  expect(training.visible).toBe(training.total);
  expect(training.total).toBeGreaterThanOrEqual(7);
  expect(training.cta.left).toBeGreaterThanOrEqual(0);
  expect(training.cta.right).toBeLessThanOrEqual(431);
  expect(training.cta.height).toBeGreaterThanOrEqual(44);
  await capture(page,platform,"hub-training");

  await page.locator('#nativeHubNav [data-native-target="career"]').click();
  await expect(page.locator("#mobileCareerRoute")).toBeVisible();
  const career=await page.evaluate(()=>{
    const route=document.getElementById("mobileCareerRoute")!;
    const header=route.querySelector<HTMLElement>(".meta-progress-head")!;
    const actions=route.querySelector<HTMLElement>(".meta-head-actions")!;
    const tabs=route.querySelector<HTMLElement>(".meta-tabs")!;
    const routeRect=route.getBoundingClientRect(),headerRect=header.getBoundingClientRect(),actionRect=actions.getBoundingClientRect(),tabsRect=tabs.getBoundingClientRect();
    return{
      overflow:document.documentElement.scrollWidth-innerWidth,
      hidden:[...document.querySelectorAll<HTMLElement>(".meta-tabs button")]
        .filter(tab=>{const rect=tab.getBoundingClientRect();return rect.left<0||rect.right>innerWidth;})
        .map(tab=>tab.textContent),
      routeHeight:routeRect.height,
      snapshotBottom:document.querySelector<HTMLElement>(".meta-overview-snapshot")?.getBoundingClientRect().bottom||0,
      routeBottom:routeRect.bottom,
      inlineOverflow:getComputedStyle(document.querySelector<HTMLElement>(".mobile-career-inline")!).overflow,
      layout:{
        header:{left:headerRect.left,right:headerRect.right,bottom:headerRect.bottom},
        actions:{left:actionRect.left,right:actionRect.right,top:actionRect.top},
        tabs:{left:tabsRect.left,right:tabsRect.right,top:tabsRect.top},
        tabRects:[...tabs.querySelectorAll<HTMLElement>("button")].map(button=>{const rect=button.getBoundingClientRect();return{left:rect.left,right:rect.right,top:rect.top,bottom:rect.bottom};}),
      },
    };
  });
  expect(career.overflow).toBeLessThanOrEqual(1);
  expect(career.hidden).toEqual([]);
  expect(career.routeHeight).toBeGreaterThan(0);
  expect(career.snapshotBottom).toBeLessThanOrEqual(career.routeBottom+1);
  expect(career.inlineOverflow).toBe("visible");
  expect(career.layout.actions.left,JSON.stringify(career.layout)).toBeGreaterThanOrEqual(career.layout.header.left);
  expect(career.layout.actions.left,JSON.stringify(career.layout)).toBeGreaterThanOrEqual(career.layout.header.right-64);
  expect(career.layout.actions.right,JSON.stringify(career.layout)).toBeLessThanOrEqual(career.layout.header.right+1);
  expect(career.layout.tabs.top,JSON.stringify(career.layout)).toBeGreaterThanOrEqual(career.layout.header.bottom-1);
  expect(career.layout.tabRects.every((rect,index,all)=>index===0||rect.left>=all[index-1].right-1),JSON.stringify(career.layout)).toBe(true);
  await capture(page,platform,"hub-career");

  for(const viewport of [
    {width:760,height:390,name:"landscape"},
    {width:768,height:1024,name:"tablet"},
  ]){
    await page.setViewportSize({width:viewport.width,height:viewport.height});
    await openHub(page,platform);
    await page.locator('#nativeHubNav [data-native-target="market"]').click();
    await expect(page.locator("#shopcards>.market-card")).toHaveCount(3);
    const tabletCards=await page.evaluate(()=>[...document.querySelectorAll<HTMLElement>("#shopcards>.market-card")].map(card=>{
      const face=card.querySelector<HTMLElement>(".market-card-face")!,impact=face.querySelector<HTMLElement>(".market-card-impact")!,title=face.querySelector<HTMLElement>(".market-card-title")!,desc=face.querySelector<HTMLElement>(".market-card-desc")!,bottom=face.querySelector<HTMLElement>(".market-card-bottom")!;
      return{height:card.getBoundingClientRect().height,order:impact.getBoundingClientRect().bottom<=title.getBoundingClientRect().top+1&&title.getBoundingClientRect().bottom<=desc.getBoundingClientRect().top+1&&desc.getBoundingClientRect().bottom<=bottom.getBoundingClientRect().top+1};
    }));
    expect(tabletCards.every(card=>card.height>=270&&card.order),`${platform} ${viewport.name} market ${JSON.stringify(tabletCards)}`).toBe(true);
    await page.locator('#nativeHubNav [data-native-target="match"]').click();
    const layout=await page.evaluate(()=>{
      const controls=[...document.querySelectorAll<HTMLElement>("#hub button")]
        .filter(button=>button.offsetParent)
        .map(button=>{
          let parent=button.parentElement,intentionalScroll=false;
          while(parent&&parent.id!=="hub"){
            if(parent.scrollWidth>parent.clientWidth+2){intentionalScroll=true;break;}
            parent=parent.parentElement;
          }
          return{id:button.id,text:button.textContent?.trim().slice(0,28)||"",rect:button.getBoundingClientRect(),intentionalScroll};
        });
      const dock=document.getElementById("mobileActionDock");
      const dockRect=dock?.offsetParent?dock.getBoundingClientRect():null;
      const actionRoot=document.querySelector<HTMLElement>("#hub .hub-action-panel .actionbtns");
      const actionParent=actionRoot?.parentElement;
      const actionButtons=actionRoot?[...actionRoot.querySelectorAll<HTMLElement>("button")].filter(button=>button.offsetParent):[];
      const metricHeights=["chemTile","powTile","trustTile","kasaTile"].map(id=>document.getElementById(id)!.getBoundingClientRect().height);
      return{
        overflow:document.documentElement.scrollWidth-innerWidth,
        metricHeights,
        offscreen:controls.filter(({rect,intentionalScroll})=>!intentionalScroll&&(rect.left<0||rect.right>innerWidth+1))
          .map(({id,text,rect})=>({id,text,left:rect.left,right:rect.right})),
        dock:dockRect?{left:dockRect.left,right:dockRect.right,bottom:dockRect.bottom}:null,
        action:actionRoot&&actionParent?{
          width:actionRoot.getBoundingClientRect().width,
          parentWidth:actionParent.getBoundingClientRect().width,
          clipped:actionButtons.filter(button=>button.scrollWidth>button.clientWidth+1).map(button=>button.id),
        }:null,
      };
    });
    expect(layout.overflow,`${platform} ${viewport.name}`).toBeLessThanOrEqual(1);
    expect(Math.max(...layout.metricHeights)-Math.min(...layout.metricHeights),`${platform} ${viewport.name}: ${JSON.stringify(layout.metricHeights)}`).toBeLessThanOrEqual(1);
    expect(layout.offscreen,`${platform} ${viewport.name}: ${JSON.stringify(layout.offscreen)}`).toEqual([]);
    if(layout.dock){
      expect(layout.dock.left).toBeGreaterThanOrEqual(0);
      expect(layout.dock.right).toBeLessThanOrEqual(viewport.width+1);
      expect(layout.dock.bottom).toBeLessThanOrEqual(viewport.height+1);
    }
    if(viewport.name==="tablet"&&layout.action){
      expect(layout.action.width).toBeGreaterThan(layout.action.parentWidth*.9);
      expect(layout.action.clipped).toEqual([]);
    }
    await capture(page,platform,`hub-${viewport.name}`);
  }
});

test("Android hub routes scroll down and back up without horizontal drift or layout jitter",async({page},testInfo)=>{
  test.skip(testInfo.project.name!=="mobile-chromium","Android scroll regression matrix");
  await clean(page);
  await page.setViewportSize({width:360,height:800});
  await openHub(page,"android");

  for(const target of ["match","market","training","sidefield","career"]){
    await page.locator(`#nativeHubNav [data-native-target="${target}"]`).click();
    await page.waitForTimeout(700);
    const audit=await page.evaluate(async route=>{
      const settle=()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())));
      const visible=(node:HTMLElement)=>!!node.offsetParent||node===document.body||node===document.documentElement;
      const scrolling=document.scrollingElement as HTMLElement;
      const candidates=[scrolling,...document.querySelectorAll<HTMLElement>("body *")]
        .filter((node,index,list)=>list.indexOf(node)===index&&visible(node))
        .filter(node=>{
          if(node===scrolling)return node.scrollHeight>node.clientHeight+4;
          const overflow=getComputedStyle(node).overflowY;
          return /(auto|scroll|overlay)/.test(overflow)&&node.scrollHeight>node.clientHeight+4;
        })
        .sort((a,b)=>(b.scrollHeight-b.clientHeight)-(a.scrollHeight-a.clientHeight));
      const host=candidates[0]||scrolling;
      const max=Math.max(0,host.scrollHeight-host.clientHeight);
      const previousScrollBehavior=host.style.scrollBehavior;
      host.style.scrollBehavior="auto";
      const nav=document.getElementById("nativeHubNav")!;
      const routeRoot=(route==="training"?document.getElementById("mobileTrainingRoute"):route==="sidefield"?document.getElementById("sideFieldRoute"):route==="career"?document.getElementById("mobileCareerRoute"):document.getElementById("hub"))!;
      const measure=()=>({
        left:routeRoot.getBoundingClientRect().left,
        width:routeRoot.getBoundingClientRect().width,
        navLeft:nav.getBoundingClientRect().left,
        navWidth:nav.getBoundingClientRect().width,
        pageOverflow:document.documentElement.scrollWidth-innerWidth,
      });
      host.scrollTop=0;await settle();
      const start=measure();
      host.scrollTop=max;const assigned=host.scrollTop;host.dispatchEvent(new Event("scroll"));await settle();
      const bottom=host.scrollTop,atBottom=measure();
      host.scrollTop=Math.floor(max/2);host.dispatchEvent(new Event("scroll"));await settle();
      const middle=measure();
      host.scrollTop=0;host.dispatchEvent(new Event("scroll"));await settle();
      const top=host.scrollTop,end=measure();
      host.style.scrollBehavior=previousScrollBehavior;
      return{
        host:host===scrolling?"document":host.id||host.className||host.tagName,
        max,assigned,bottom,top,
        hostLayout:{clientHeight:host.clientHeight,scrollHeight:host.scrollHeight,rectHeight:host.getBoundingClientRect().height,overflowY:getComputedStyle(host).overflowY,position:getComputedStyle(host).position},
        samples:[start,atBottom,middle,end],
      };
    },target);
    expect(audit.samples.every(sample=>sample.pageOverflow<=1),`${target}: ${JSON.stringify(audit)}`).toBe(true);
    expect(Math.max(...audit.samples.map(sample=>sample.width))-Math.min(...audit.samples.map(sample=>sample.width)),`${target} route width`).toBeLessThanOrEqual(1);
    expect(Math.max(...audit.samples.map(sample=>sample.navWidth))-Math.min(...audit.samples.map(sample=>sample.navWidth)),`${target} nav width`).toBeLessThanOrEqual(1);
    expect(Math.max(...audit.samples.map(sample=>sample.navLeft))-Math.min(...audit.samples.map(sample=>sample.navLeft)),`${target} nav left`).toBeLessThanOrEqual(1);
    if(audit.max>4){
      expect(audit.bottom,`${target} failed to reach bottom via ${audit.host}: ${JSON.stringify(audit)}`).toBeGreaterThan(0);
      expect(audit.top,`${target} failed to return to top via ${audit.host}`).toBe(0);
    }
  }
});
