import {test,expect} from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const visualDir=path.resolve(__dirname,"../../../outputs/ui-visuals");

async function reachNativeHub(page:any){
  await page.addInitScript(()=>{
    localStorage.clear();
    localStorage.setItem("copa_online_features_onboarding_v1",JSON.stringify({
      version:"online-features-v1",terms:true,matching:false,sharing:false,leaderboard:false,
      action:"drag_stability_test",accepted_at:new Date().toISOString(),
    }));
  });
  await page.goto("/dist-android/index.html?drag-stability=1",{waitUntil:"domcontentloaded"});
  await expect(page.locator("html")).toHaveAttribute("data-copa-platform","android");
  await page.evaluate(async()=>{
    const game=globalThis as any;
    game.setLang("tr");
    game.CopaMobileShell.newRun();
    await game.quickStart();
    if(game._countryDraftPromise)await game._countryDraftPromise;
    await game.quickAll();
  });
  await page.locator("#postClubName").fill("Denge FK");
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
  await page.locator('#nativeHubNav [data-native-target="match"]').click();
}

test("native lineup drag keeps the viewport, targets and tactical HUD stable",async({page},testInfo)=>{
  test.skip(testInfo.project.name!=="mobile-chromium","native drag stability");
  await reachNativeHub(page);

  const layout=await page.evaluate(()=>{
    const strip=document.querySelector<HTMLElement>(".pitch-tactical-strip")!.getBoundingClientRect();
    const pitch=document.getElementById("hubPitch")!.getBoundingClientRect();
    const players=[...document.querySelectorAll<HTMLElement>("#hubPitch .roundel.full")].map(node=>node.getBoundingClientRect());
    return{
      stripBottom:strip.bottom,
      pitchTop:pitch.top,
      overlaps:players.filter(rect=>strip.left<rect.right&&strip.right>rect.left&&strip.top<rect.bottom&&strip.bottom>rect.top).length,
    };
  });
  expect(layout.stripBottom).toBeLessThanOrEqual(layout.pitchTop+1);
  expect(layout.overlaps).toBe(0);

  await page.locator("#nativeBenchTrigger").click();
  await expect(page.locator("#hubBenchSection.native-bench-sheet")).toBeVisible();
  const benchScroll=await page.locator("#hubBenchSection .bench-list").evaluate(node=>{
    const style=getComputedStyle(node);
    return{overflowY:style.overflowY,overscroll:style.overscrollBehaviorY,touchAction:style.touchAction};
  });
  expect(benchScroll.overflowY).toBe("auto");
  expect(benchScroll.overscroll).toBe("contain");
  expect(benchScroll.touchAction).toContain("pan-y");

  const before=await page.evaluate(()=>({
    y:scrollY,
    slots:[...document.querySelectorAll<HTMLElement>("#hubPitch .roundel")].map(node=>{
      const rect=node.getBoundingClientRect();return{x:rect.x,y:rect.y};
    }),
  }));
  const benchPlayer=page.locator("#hubBenchSection .bench-row").first();
  await benchPlayer.evaluate(node=>{
    const event=new DragEvent("dragstart",{bubbles:true,cancelable:true,dataTransfer:new DataTransfer()});
    node.dispatchEvent(event);
  });
  const during=await page.evaluate(()=>({
    locked:document.documentElement.classList.contains("hub-player-dragging"),
    bodyPosition:getComputedStyle(document.body).position,
    preview:(()=>{
      const node=document.querySelector<HTMLElement>(".hub-player-drag-preview");
      if(!node)return null;
      const rect=node.getBoundingClientRect();return{width:rect.width,height:rect.height};
    })(),
    slots:[...document.querySelectorAll<HTMLElement>("#hubPitch .roundel")].map(node=>{
      const rect=node.getBoundingClientRect();return{x:rect.x,y:rect.y};
    }),
  }));
  expect(during.locked).toBe(true);
  expect(during.bodyPosition).toBe("fixed");
  expect(during.preview).not.toBeNull();
  expect(during.preview!.width).toBeLessThanOrEqual(64);
  expect(during.preview!.height).toBeLessThanOrEqual(68);
  expect(during.slots).toEqual(before.slots);

  await benchPlayer.evaluate(node=>node.dispatchEvent(new DragEvent("dragend",{bubbles:true,cancelable:true,dataTransfer:new DataTransfer()})));
  await page.waitForTimeout(50);
  const after=await page.evaluate(()=>({
    y:scrollY,
    locked:document.documentElement.classList.contains("hub-player-dragging"),
    preview:!!document.querySelector(".hub-player-drag-preview"),
    slots:[...document.querySelectorAll<HTMLElement>("#hubPitch .roundel")].map(node=>{
      const rect=node.getBoundingClientRect();return{x:rect.x,y:rect.y};
    }),
  }));
  expect(after.locked).toBe(false);
  expect(after.preview).toBe(false);
  expect(Math.abs(after.y-before.y)).toBeLessThanOrEqual(1);
  expect(after.slots).toEqual(before.slots);

  await page.evaluate(()=>(globalThis as any)._tapSelectBench(0));
  const targetStates=await page.evaluate(()=>[...document.querySelectorAll<HTMLElement>("#hubPitch .roundel")]
    .filter(node=>["tap-good","tap-warn","tap-off"].some(name=>node.classList.contains(name)))
    .map(node=>({classes:node.className,outline:getComputedStyle(node).outlineColor})));
  expect(targetStates.some(state=>state.classes.includes("tap-good"))).toBe(true);
  expect(targetStates.every(state=>!["rgb(242, 74, 40)","rgb(218, 61, 46)"].includes(state.outline))).toBe(true);
  await page.evaluate(()=>(globalThis as any)._tapCancel());

  await benchPlayer.evaluate(node=>{
    const start=new Event("touchstart",{bubbles:true,cancelable:true});
    Object.defineProperty(start,"touches",{value:[{clientX:48,clientY:320}]});
    node.dispatchEvent(start);
  });
  await page.waitForTimeout(360);
  expect(await page.locator("html").evaluate(node=>node.classList.contains("hub-player-dragging"))).toBe(true);
  await expect(page.locator(".touch-drag-ghost")).toHaveCount(1);
  await benchPlayer.evaluate(node=>node.dispatchEvent(new Event("touchcancel",{bubbles:true,cancelable:true})));
  expect(await page.locator("html").evaluate(node=>node.classList.contains("hub-player-dragging"))).toBe(false);
  await expect(page.locator(".touch-drag-ghost")).toHaveCount(0);

  await page.locator(".native-bench-close").click();
  await page.evaluate(()=>document.getElementById("hubPitch")!.scrollIntoView({block:"center"}));
  const scrollBeforeModal=await page.evaluate(()=>scrollY);
  await page.locator("#powTile .mtile-info").click();
  await expect(page.locator(".mechanic-info-modal")).toBeVisible();
  expect(Math.abs((await page.evaluate(()=>scrollY))-scrollBeforeModal)).toBeLessThanOrEqual(1);
  await page.locator(".mechanic-info-close").click();
  await page.waitForTimeout(50);
  expect(Math.abs((await page.evaluate(()=>scrollY))-scrollBeforeModal)).toBeLessThanOrEqual(1);

  fs.mkdirSync(visualDir,{recursive:true});
  await page.screenshot({path:path.join(visualDir,"android-lineup-drag-stability.png"),fullPage:true});
});
