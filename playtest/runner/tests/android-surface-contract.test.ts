import {test,expect} from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const visualDir=path.resolve(__dirname,"../../../outputs/ui-visuals");

function alpha(color:string){
  const match=color.match(/rgba?\(([^)]+)\)/i);
  if(!match)return 1;
  const values=match[1].split(",").map(value=>Number.parseFloat(value.trim()));
  return values.length>3?values[3]:1;
}

test("packaged Android UI keeps structural and contextual surfaces opaque",async({page},testInfo)=>{
  test.skip(testInfo.project.name!=="mobile-chromium","Android phone surface contract");
  await page.addInitScript(()=>{
    localStorage.clear();
    localStorage.setItem("copa_online_features_onboarding_v1",JSON.stringify({
      version:"online-features-v1",
      terms:true,
      matching:false,
      sharing:false,
      leaderboard:false,
      action:"android_surface_test",
      accepted_at:new Date().toISOString(),
    }));
  });
  await page.goto("/dist-android/index.html?android-surface-contract=1",{waitUntil:"domcontentloaded"});
  await expect(page.locator("html")).toHaveAttribute("data-copa-platform","android");
  expect(await page.evaluate(()=>[...document.styleSheets].some(sheet=>String(sheet.href||"").includes("androidSurfaces.css")))).toBe(true);

  const base=await page.evaluate(()=>({
    html:getComputedStyle(document.documentElement).backgroundColor,
    body:getComputedStyle(document.body).backgroundColor,
  }));
  expect(alpha(base.html)).toBe(1);
  expect(alpha(base.body)).toBe(1);

  const landingPitch=await page.locator(".mgl-board-wrap").evaluate((board:HTMLElement)=>{
    const svg=board.querySelector<SVGElement>(".mgl-tactical-board")!;
    const field=svg.querySelector<SVGGeometryElement>("rect")!;
    const player=svg.querySelector<SVGCircleElement>(".mgl-players circle")!;
    const boardStyle=getComputedStyle(board),fieldStyle=getComputedStyle(field),playerStyle=getComputedStyle(player);
    return{
      background:boardStyle.backgroundColor,
      border:boardStyle.borderTopColor,
      fieldStroke:fieldStyle.stroke,
      playerStroke:playerStyle.stroke,
    };
  });
  expect(alpha(landingPitch.background)).toBe(1);
  expect(landingPitch.border).not.toBe("rgba(0, 0, 0, 0)");
  expect(landingPitch.fieldStroke).not.toBe("none");
  expect(landingPitch.playerStroke).not.toBe("none");

  await page.evaluate(async()=>{
    const game=globalThis as any;
    game.setLang("tr");
    game.CopaMobileShell.newRun();
    await game.quickStart();
    if(game._countryDraftPromise)await game._countryDraftPromise;
    await game.quickAll();
  });
  await page.locator("#postClubName").fill("Android FK");
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

  const metricSurfaces=await page.locator("#hub .hub-stat-row").evaluate((row:HTMLElement)=>
    [...row.children].map(node=>{
      const style=getComputedStyle(node);
      return{
        color:style.backgroundColor,
        image:style.backgroundImage,
        border:style.borderTopColor,
      };
    })
  );
  expect(metricSurfaces).toHaveLength(4);
  expect(metricSurfaces.every(surface=>alpha(surface.color)===1)).toBe(true);
  expect(metricSurfaces.every(surface=>surface.image!=="none")).toBe(true);
  expect(new Set(metricSurfaces.map(surface=>surface.image)).size).toBeGreaterThanOrEqual(3);
  expect(metricSurfaces.every(surface=>surface.border!=="rgba(0, 0, 0, 0)")).toBe(true);

  fs.mkdirSync(visualDir,{recursive:true});
  await page.screenshot({path:path.join(visualDir,"android-native-context-metrics.png"),fullPage:true});
  await page.locator('#nativeHubNav [data-native-target="market"]').click();
  await expect(page.locator("#freeAgentRow .free-agent-card")).toHaveCount(4);
  const marketSurfaces=await page.evaluate(()=>{
    const selectors=[
      "#marketDecisionHeader",
      "#marketDecisionHeader .market-cash-panel",
      "#freeAgentRow .free-agent-card",
      "#freeAgentRow .free-agent-card .ct-head",
      "#freeAgentRow .free-agent-impact span",
      "#freeAgentRow .free-agent-actions",
      "#freeAgentRow .free-agent-actions button",
    ];
    return selectors.map(selector=>{
      const style=getComputedStyle(document.querySelector<HTMLElement>(selector)!);
      return{selector,color:style.backgroundColor,border:style.borderTopColor};
    });
  });
  expect(marketSurfaces.every(surface=>alpha(surface.color)===1)).toBe(true);
  expect(marketSurfaces.every(surface=>surface.border!=="rgba(0, 0, 0, 0)")).toBe(true);
  expect(await page.locator("#freeAgentRow .free-agent-actions").evaluateAll(rows=>rows.every(row=>row.querySelectorAll("button").length===1))).toBe(true);
  await page.screenshot({path:path.join(visualDir,"android-market-opaque-surfaces.png"),fullPage:true});
  await page.locator('#nativeHubNav [data-native-target="match"]').click();
  await page.locator(".kasa-detail-btn").click();
  await expect(page.locator(".cash-mechanic-sheet")).toBeVisible();
  const modalSurfaces=await page.locator(".cash-mechanic-sheet").evaluate((sheet:HTMLElement)=>{
    const nodes=[sheet,...sheet.querySelectorAll<HTMLElement>(".cash-mechanic-rules article")];
    return nodes.map(node=>({
      color:getComputedStyle(node).backgroundColor,
      border:getComputedStyle(node).borderTopColor,
    }));
  });
  expect(modalSurfaces.every(surface=>alpha(surface.color)===1)).toBe(true);
  expect(modalSurfaces.every(surface=>surface.border!=="rgba(0, 0, 0, 0)")).toBe(true);

  const modalBackdrop=await page.locator("#modal").evaluate(node=>getComputedStyle(node).backgroundColor);
  expect(alpha(modalBackdrop)).toBeGreaterThanOrEqual(.85);
  const globalContract=await page.evaluate(()=>{
    const game=globalThis as any;
    game.CopaSurfaceContract.audit();
    return game.CopaSurfaceContract.report();
  });
  expect(globalContract.candidates).toBeGreaterThan(20);
  expect(globalContract.transparent).toEqual([]);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);

  await page.screenshot({path:path.join(visualDir,"android-native-surfaces.png"),fullPage:true});
});
