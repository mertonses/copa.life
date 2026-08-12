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
    const landing=await page.evaluate(()=>({
      overflow:document.documentElement.scrollWidth-innerWidth,
      actions:[...document.querySelectorAll<HTMLElement>(".mgl-actions button")]
        .filter(button=>button.offsetParent)
        .map(button=>{const rect=button.getBoundingClientRect();return{left:rect.left,right:rect.right,height:rect.height};}),
    }));
    expect(landing.overflow,`${platform} ${viewport.name}`).toBeLessThanOrEqual(1);
    expect(landing.actions.every(action=>action.left>=0&&action.right<=viewport.width+1&&action.height>=44)).toBe(true);
    await capture(page,platform,`${viewport.name}-landing`);

    if(viewport.width>760)continue;
    await page.evaluate(()=>(globalThis as any).CopaMobileShell.newRun());
    await expect(page.locator("body")).toHaveClass(/mobile-game-setup-open/);
    await expect(page.locator('#introSetup [data-mobile-step="1"]')).toBeVisible();
    await expect(page.locator("#mobileActionDock")).toBeHidden();
    const stepOne=await page.evaluate(()=>({
      overflow:document.documentElement.scrollWidth-innerWidth,
      cards:[...document.querySelectorAll<HTMLElement>("#countryPick button")].map(button=>{
        const rect=button.getBoundingClientRect();return{left:rect.left,right:rect.right,height:rect.height};
      }),
    }));
    expect(stepOne.overflow,`${platform} ${viewport.name} country`).toBeLessThanOrEqual(1);
    expect(stepOne.cards.every(card=>card.left>=0&&card.right<=viewport.width+1&&card.height>=44)).toBe(true);

    await page.locator("[data-step-next]").click();
    await expect(page.locator('#introSetup [data-mobile-step="2"]')).toBeVisible();
    await expect(page.locator("#mobileActionDock")).toBeHidden();
    const formation=await page.evaluate(()=>({
      overflow:document.documentElement.scrollWidth-innerWidth,
      lockedOpacity:[...document.querySelectorAll<HTMLElement>("#formpick .mobile-formation-card.locked")]
        .map(card=>Number(getComputedStyle(card).opacity)),
      cards:[...document.querySelectorAll<HTMLElement>("#formpick .mobile-formation-card")].map(card=>{
        const rect=card.getBoundingClientRect();return{left:rect.left,right:rect.right,width:rect.width};
      }),
    }));
    expect(formation.overflow,`${platform} ${viewport.name} formation`).toBeLessThanOrEqual(1);
    expect(formation.cards.every(card=>card.left>=0&&card.right<=viewport.width+1&&card.width>=140)).toBe(true);
    expect(formation.lockedOpacity.every(opacity=>opacity>=.65)).toBe(true);

    await page.locator("[data-step-next]").click();
    await expect(page.locator('#introSetup [data-mobile-step="3"]')).toBeVisible();
    await expect(page.locator("#mobileActionDock")).toBeVisible();
    const chairman=await page.evaluate(()=>({
      overflow:document.documentElement.scrollWidth-innerWidth,
      lockedOpacity:[...document.querySelectorAll<HTMLElement>("#chairpick .mobile-chair-card.locked")]
        .map(card=>Number(getComputedStyle(card).opacity)),
      dock:document.getElementById("mobileActionDock")!.getBoundingClientRect().top,
      activeCard:document.querySelector<HTMLElement>("#chairpick .mobile-chair-card.sel")!.getBoundingClientRect().bottom,
    }));
    expect(chairman.overflow,`${platform} ${viewport.name} chairman`).toBeLessThanOrEqual(1);
    expect(chairman.lockedOpacity.every(opacity=>opacity>=.65)).toBe(true);
    expect(chairman.activeCard).toBeLessThan(chairman.dock);
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
      kasa:(()=>{const card=document.getElementById("kasaTile")!;const label=card.querySelector<HTMLElement>(".kasa-compact-debt-label")!;const value=card.querySelector<HTMLElement>(".kasa-compact-debt-value")!;const labelRect=label.getBoundingClientRect();const valueRect=value.getBoundingClientRect();return{hasDetailText:/detay/i.test(card.textContent||""),label:label.textContent?.trim(),value:value.textContent?.trim(),labelFont:Number.parseFloat(getComputedStyle(label).fontSize),valueFont:Number.parseFloat(getComputedStyle(value).fontSize),overlap:labelRect.right>valueRect.left+1}})(),
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
  expect(match.kasa.label).toBe("BORÇ LİMİTİ");
  expect(match.kasa.value).toMatch(/€/);
  expect(match.kasa.labelFont).toBeGreaterThanOrEqual(7);
  expect(match.kasa.valueFont).toBeGreaterThanOrEqual(9);
  expect(match.kasa.overlap).toBe(false);
  expect(match.visibleToasts).toBe(1);
  expect(match.toast.top).toBeGreaterThan(match.navBottom);
  expect(match.toast.bottom).toBeLessThanOrEqual(match.dockTop-8);
  expect(match.clipped).toEqual([]);
  expect(match.tiny).toEqual([]);
  await capture(page,platform,"hub-match");

  await page.locator('#nativeHubNav [data-native-target="market"]').click();
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
  expect(sidefield.heading).toBe("YAN SAHA");
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
  const career=await page.evaluate(()=>({
    overflow:document.documentElement.scrollWidth-innerWidth,
    hidden:[...document.querySelectorAll<HTMLElement>(".mobile-career-tabs button")]
      .filter(tab=>{const rect=tab.getBoundingClientRect();return rect.left<0||rect.right>innerWidth;})
      .map(tab=>tab.textContent),
  }));
  expect(career.overflow).toBeLessThanOrEqual(1);
  expect(career.hidden).toEqual([]);
  await capture(page,platform,"hub-career");

  for(const viewport of [
    {width:760,height:390,name:"landscape"},
    {width:768,height:1024,name:"tablet"},
  ]){
    await page.setViewportSize({width:viewport.width,height:viewport.height});
    await openHub(page,platform);
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
      return{
        overflow:document.documentElement.scrollWidth-innerWidth,
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
