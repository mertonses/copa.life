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
  await expect(page.locator("#resultActionCopy")).toBeVisible();
  await expect(page.locator("#resultDetails")).toHaveCount(0);
  const layout=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth-innerWidth,board:document.querySelector("#result .scoreboard")!.getBoundingClientRect().height,stats:[...document.querySelectorAll("#result .statline .stat")].map(node=>node.getBoundingClientRect().width)}));
  expect(layout.overflow).toBeLessThanOrEqual(1);
  expect(layout.board).toBeGreaterThan(100);
  expect(layout.stats).toHaveLength(4);
  fs.mkdirSync(output,{recursive:true});
  await page.screenshot({path:path.join(output,file),fullPage:false});
}

test("result states use the compact mockup summary hierarchy",async({page})=>{
  await boot(page);
  await page.evaluate(()=>{(globalThis as any).endRun(false,null,"knockout_eliminated");});
  await assertSummary(page,"eliminated","ELENDİN","—",`${test.info().project.name}-eliminated.png`);

  await boot(page);
  await page.evaluate(()=>{(globalThis as any)._runSeedResultCheat("sacked");});
  await assertSummary(page,"sacked","KOVULDUN","—",`${test.info().project.name}-sacked.png`);

  await boot(page);
  await page.evaluate(()=>{(globalThis as any).endRun(true,"2–1","champion");});
  await assertSummary(page,"champion","ŞAMPİYON","2–1",`${test.info().project.name}-champion.png`);
});
