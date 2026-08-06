import {test,expect} from "@playwright/test";

async function reachDraft(page:any){
  await page.addInitScript(()=>{for(const key of ["copa_run_v6","copa_run_v6_last_good","copa_run_v5","copa_run_v5_last_good"])localStorage.removeItem(key);sessionStorage.removeItem("copa_run");});
  await page.goto("/?autotest=1&visual=premium-cash",{waitUntil:"domcontentloaded"});
  await page.evaluate(async()=>{const game=globalThis as any;await game.quickStart();if(game._countryDraftPromise)await game._countryDraftPromise;});
  await expect(page.locator("#draft")).toBeVisible();
  await expect(page.locator("#draftKasaTile")).toHaveClass(/cash-premium/);
}

test("premium vault animates and sounds once per committed cash transaction",async({page})=>{
  await reachDraft(page);
  await page.evaluate(()=>{const game=globalThis as any;game.legacyCash=4;game.setBudget();});
  await expect(page.locator("#draftKasaV .cash-legacy-inline")).toContainText(/MİRAS|LEGACY/);
  await expect(page.locator("#draftKasaV .cash-legacy-inline")).toContainText("+€4M");
  const baseline=await page.evaluate(()=>{const game=globalThis as any;return{cash:game.budget,history:game.CopaCashDisplay.recentTransactions().length,sfx:game._copaCashSfxCount||0};});
  await page.evaluate(()=>{const game=globalThis as any;game.earn(1.5,"earned");});
  await expect(page.locator("#draftKasaV .cash-display")).toHaveAttribute("aria-label",new RegExp(`31\\.5M$`));
  await expect(page.locator("#draftKasaV .cash-digit.is-rolling").first()).toBeAttached();
  await expect(page.locator("#draftKasaTile .cash-delta-toast")).toContainText("+€1.5M");
  const committed=await page.evaluate(()=>{const game=globalThis as any;return{cash:game.budget,history:game.CopaCashDisplay.recentTransactions().length,sfx:game._copaCashSfxCount||0,last:game.CopaCashDisplay.lastTransaction()};});
  expect(committed.cash).toBe(baseline.cash+1.5);expect(committed.history).toBe(baseline.history+1);expect(committed.sfx).toBe(baseline.sfx+1);expect(committed.last.delta).toBe(1.5);
  await page.waitForTimeout(600);
  await expect(page.locator("#draftKasaV .cash-digit.is-rolling")).toHaveCount(0);
  await expect(page.locator("#draftKasaV .cash-display")).toContainText("€31.5M");

  const repeated=await page.evaluate(()=>{const game=globalThis as any;game.setBudget();game.setBudget();return{history:game.CopaCashDisplay.recentTransactions().length,sfx:game._copaCashSfxCount||0};});
  expect(repeated).toEqual({history:committed.history,sfx:committed.sfx});

  const restored=await page.evaluate((cash:number)=>{const game=globalThis as any;game.CopaCashDisplay.sync(cash);game.budget=cash;game.setBudget();return{history:game.CopaCashDisplay.recentTransactions().length,sfx:game._copaCashSfxCount||0,rolling:!!document.querySelector("#draftKasaV .is-rolling")};},committed.cash);
  expect(restored).toEqual({history:committed.history,sfx:committed.sfx,rolling:false});

  await page.waitForTimeout(700);
  const silent=await page.evaluate(()=>{const game=globalThis as any;game.budget+=.5;game.setBudget();return{history:game.CopaCashDisplay.recentTransactions().length,sfx:game._copaCashSfxCount||0,label:document.querySelector("#draftKasaV .cash-display")?.getAttribute("aria-label")};});
  expect(silent.history).toBe(committed.history);expect(silent.sfx).toBe(committed.sfx);expect(silent.label).toMatch(/32M$/);
  await expect(page.locator("#draftKasaTile .cash-delta-toast")).toHaveCount(0);

  await page.evaluate(()=>{const game=globalThis as any;document.body.classList.add("reduced-motion");game.spend(1,"spent");});
  await expect(page.locator("#draftKasaV .cash-display")).not.toHaveClass(/is-rolling/);
  await expect(page.locator("#draftKasaV .cash-legacy-inline")).toContainText("+€3M");
  await expect(page.locator("#draftKasaTile")).toHaveClass(/cash-loss/);
});

test("match hub vault keeps the same compact footprint as the other metrics",async({page})=>{
  await reachDraft(page);
  await page.evaluate(async()=>{const game=globalThis as any;await game.quickAll();});
  await expect(page.locator("#postClubName")).toBeVisible();
  await page.locator("#postClubName").fill("Cash XI");
  await page.evaluate(()=>{const game=globalThis as any;game.pcGo();game.fastTournamentDraw();game.finishTournamentDraw();game.setCaptain(0);game.closeModal();});
  await expect(page.locator("#hub")).toBeVisible();
  await page.evaluate(()=>{const game=globalThis as any;game.legacyCash=4;game.setBudget();game.renderHub();});
  await expect(page.locator("#kasaTile")).toHaveClass(/kasa-compact/);
  await expect(page.locator("#kasaV .cash-display")).toBeVisible();
  await expect(page.locator("#kasaV .cash-legacy-inline")).toContainText(/4M/);
  await expect(page.locator("#kasaTile .kasa-compact-foot")).toBeVisible();

  const boxes=await page.locator("#chemTile,#powTile,#trustTile,#kasaTile").evaluateAll(nodes=>nodes.map(node=>{
    const box=node.getBoundingClientRect();return{id:(node as HTMLElement).id,width:box.width,height:box.height};
  }));
  const reference=boxes[0];
  for(const box of boxes.slice(1)){
    expect(Math.abs(box.width-reference.width),`${box.id} width`).toBeLessThanOrEqual(1);
    expect(Math.abs(box.height-reference.height),`${box.id} height`).toBeLessThanOrEqual(1);
  }
});
