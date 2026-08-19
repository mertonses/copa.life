import {test,expect,type Page} from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const output=path.resolve(__dirname,"../../../outputs/ui-visuals/results");

async function boot(page:Page){
  await page.goto("/?result-summary-visual-qa=1",{waitUntil:"domcontentloaded"});
  await page.evaluate(async()=>{
    const game=globalThis as any;
    game.setLang("tr");
    await game.quickStart();
    if(game._countryDraftPromise)await game._countryDraftPromise;
    await game.quickAll();
  });
  await page.locator("#postClubName").fill("Kompakt FK");
  await page.evaluate(()=>{
    const game=globalThis as any;
    game.pcGo();game.fastTournamentDraw();game.finishTournamentDraw();game.setCaptain(0);game.closeModal();
  });
}

async function assertSummary(page:Page,kind:string,title:string,score:string,file:string){
  await expect(page.locator("#result")).toBeVisible();
  await expect(page.locator("#result")).toHaveAttribute("data-result-kind",kind);
  await expect(page.locator("#rFinish")).toHaveText(title);
  await expect(page.locator("#rScore")).toHaveText(score);
  await expect(page.locator("#resultFx")).toHaveCount(0);
  await expect(page.locator("#resultStatusMark")).toHaveCount(0);
  await expect(page.locator("#resultActionCopy")).toBeVisible();
  await expect(page.locator("#resultDetails")).toHaveCount(0);
  const layout=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth-innerWidth,board:document.querySelector("#result .scoreboard")!.getBoundingClientRect().height,stats:[...document.querySelectorAll("#result .statline .stat")].map(node=>node.getBoundingClientRect().width),actions:[...document.querySelectorAll<HTMLElement>("#result .result-actions .result-action")].map(node=>{const box=node.getBoundingClientRect();return{width:Math.round(box.width),height:Math.round(box.height)}})}));
  expect(layout.overflow).toBeLessThanOrEqual(1);
  expect(layout.board).toBeGreaterThan(100);
  expect(layout.stats).toHaveLength(4);
  expect(layout.actions[0].width).toBe(layout.actions[1].width);
  expect(layout.actions[2].width).toBeGreaterThan(layout.actions[0].width);
  expect(new Set(layout.actions.map(item=>item.height)).size).toBe(1);
  expect(layout.actions[0].height).toBe(50);
  fs.mkdirSync(output,{recursive:true});
  await page.screenshot({path:path.join(output,file),fullPage:false});
}

test("result states use the compact mockup summary hierarchy",async({page})=>{
  await boot(page);
  await page.evaluate(()=>{(globalThis as any).endRun(false,null,"knockout_eliminated");});
  await assertSummary(page,"eliminated","ELENDİN","GRUP · 1. MAÇ",`${test.info().project.name}-eliminated.png`);
  await page.locator("#resultMoreBtn").click();
  await expect(page.locator("#resultDatahub")).toBeVisible();
  await expect(page.locator("#resultDatahub .result-data-card[data-result-panel='summary']")).toBeVisible();
  await expect(page.locator("#resultDatahub .result-data-card[data-result-panel='impact']")).toBeVisible();
  if(test.info().project.name==="desktop-chromium")await page.screenshot({path:path.join(output,"desktop-chromium-datahub-summary.png"),fullPage:false});
  await page.locator("#resultDatahub .result-data-tab[data-result-tab='performance']").click();
  await expect(page.locator("#resultDatahub .result-data-card[data-result-panel='performance']")).toBeVisible();
  await expect(page.locator("#resultDatahub .result-data-card[data-result-panel='summary']")).toBeHidden();
  if(test.info().project.name==="desktop-chromium")await page.screenshot({path:path.join(output,"desktop-chromium-datahub-performance.png"),fullPage:false});
  await page.locator("#resultMoreBtn").click();
  await page.locator("#squadResultBtn").click();
  await expect(page.locator(".result-squad-modal")).toBeVisible();
  await expect(page.locator(".result-squad-player")).toHaveCount(11);
  await expect(page.locator(".result-squad-formation")).toContainText("4-4-2");
  await expect(page.locator(".result-squad-list-head")).toContainText("GÜÇ");
  await expect(page.locator(".result-squad-scroll-hint")).toBeVisible();
  await expect(page.locator(".result-squad-meter[role='progressbar']")).toHaveCount(11);
  if(test.info().project.name==="desktop-chromium")await page.screenshot({path:path.join(output,"desktop-chromium-squad-modal.png"),fullPage:false});
  await page.locator(".result-squad-modal .result-modal-close").click();
  await expect(page.locator("#shareCardBtn")).toHaveCount(0);
  await expect(page.locator(".share-modal")).toHaveCount(0);
  await page.locator("#againBtn").click();
  await expect(page.locator(".result-new-run-confirm")).toBeVisible();
  if(test.info().project.name==="desktop-chromium")await page.screenshot({path:path.join(output,"desktop-chromium-new-run-confirm.png"),fullPage:false});
  await page.locator(".result-new-run-confirm .btn-ghost").click();

  await boot(page);
  await page.evaluate(()=>{(globalThis as any)._runSeedResultCheat("sacked");});
  await assertSummary(page,"sacked","KOVULDUN","KOVULMA",`${test.info().project.name}-sacked.png`);

  await boot(page);
  await page.evaluate(()=>{(globalThis as any).endRun(true,"2–1","champion");});
  await assertSummary(page,"champion","ŞAMPİYON","2–1",`${test.info().project.name}-champion.png`);
});

test("result surface stays readable across compact phone widths",async({page},testInfo)=>{
  test.skip(testInfo.project.name!=="mobile-chromium","mobile result width matrix");
  for(const viewport of [{width:360,height:800},{width:390,height:844},{width:414,height:896},{width:430,height:932}]){
    await page.setViewportSize(viewport);
    await boot(page);
    await page.evaluate(()=>{(globalThis as any).endRun(false,null,"knockout_eliminated");});
    const layout=await page.evaluate(()=>{
      const rect=(selector:string)=>document.querySelector<HTMLElement>(selector)!.getBoundingClientRect();
      const title=rect("#rFinish"),score=rect("#rScore"),shell=rect("#result .result-shell");
      return{
        overflow:document.documentElement.scrollWidth-innerWidth,
        shellInside:shell.left>=-1&&shell.right<=innerWidth+1,
        heroHeight:document.querySelector<HTMLElement>("#result .result-hero")!.getBoundingClientRect().height,
        titleScoreOverlap:!(title.right<=score.left||score.right<=title.left||title.bottom<=score.top||score.bottom<=title.top),
        storyWidth:document.querySelector<HTMLElement>("#resultStoryTitle")!.getBoundingClientRect().width,
      };
    });
    expect(layout.overflow,`${viewport.width}px overflow`).toBeLessThanOrEqual(1);
    expect(layout.shellInside,`${viewport.width}px shell`).toBe(true);
    expect(layout.heroHeight,`${viewport.width}px hero`).toBeGreaterThan(190);
    expect(layout.titleScoreOverlap,`${viewport.width}px hero overlap`).toBe(false);
    expect(layout.storyWidth,`${viewport.width}px story`).toBeGreaterThan(0);
  }
});
