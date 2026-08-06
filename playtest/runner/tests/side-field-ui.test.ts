import {test,expect} from "@playwright/test";

async function reachHub(page:any){
  await page.addInitScript(()=>{for(const key of ["copa_run_v6","copa_run_v6_last_good","copa_run_v5","copa_run_v5_last_good"])localStorage.removeItem(key);sessionStorage.removeItem("copa_run");});
  await page.goto("/?autotest=1&groups=1&visual=side-field",{waitUntil:"domcontentloaded"});
  await page.evaluate(async()=>{const game=globalThis as any;await game.quickStart();if(game._countryDraftPromise)await game._countryDraftPromise;await game.quickAll();});
  await expect(page.locator("#postClubName")).toBeVisible();
  await page.locator("#postClubName").fill("Yan Saha FK");
  await page.evaluate(()=>{const game=globalThis as any;game.pcGo();game.fastTournamentDraw();game.finishTournamentDraw();game.setCaptain(0);game.closeModal();game.budget=30;game.setBudget();game.CopaSideField.reset();game.CopaSideField.ensureCurrent();game.CopaMobileShell.enhanceHub();});
  await expect(page.locator("#hub")).toBeVisible();
}

test("Yan Saha freezes non-player markets, persists picks and settles once",async({page})=>{
  await reachHub(page);
  await page.locator('#nativeHubNav [data-native-target="sidefield"]').click();
  await expect(page.locator("#sideFieldRoute")).toBeVisible();
  await expect(page.locator(".ys-match-card")).toHaveCount(15);
  const contract=await page.evaluate(()=>{const game=globalThis as any,market=game.CopaSideFieldEngine.currentMarket(game.sideFieldState,game.tournament),navButtons=[...document.querySelectorAll<HTMLElement>("#nativeHubNav [data-native-target]")],navRows=new Set(navButtons.map(node=>Math.round(node.getBoundingClientRect().top)));return{quotes:market.quotes.length,hasPlayer:market.quotes.some((quote:any)=>quote.homeId==="player"||quote.awayId==="player"),riskLimit:market.riskLimit,nav:navButtons.map(node=>node.dataset.nativeTarget),navRows:navRows.size,overflow:document.documentElement.scrollWidth-innerWidth};});
  expect(contract).toEqual({quotes:15,hasPlayer:false,riskLimit:5,nav:["match","market","training","sidefield","career"],navRows:1,overflow:0});
  await expect(page.locator(".ys-risk-strip")).toContainText(/TUR BÜTÇESİ|ROUND BUDGET/);

  await page.locator(".ys-odds button:not([disabled])").first().click();
  await expect(page.locator(".ys-slip")).toBeVisible();
  await page.locator(".ys-seal").click();
  await expect(page.locator(".ys-ticket-line")).toHaveCount(1);
  await expect(page.locator(".ys-unavailable-reason").first()).toContainText(/Bu maç için seçim yaptın|already picked this fixture/);
  const saved=await page.evaluate(()=>{const game=globalThis as any;game._saveState();const run=JSON.parse(localStorage.getItem("copa_run_v6")||"{}"),ticket=game.sideFieldState.tickets[0];return{cash:game.budget,stake:ticket.stake,tickets:game.sideFieldState.tickets.length,savedTickets:run.sideField&&run.sideField.tickets.length,pick:ticket.pick};});
  expect(saved.cash).toBe(30-saved.stake);expect(saved.tickets).toBe(1);expect(saved.savedTickets).toBe(1);expect(["H","D","A"]).toContain(saved.pick);

  const settlement=await page.evaluate(()=>{const game=globalThis as any,key=game.CopaSideField.currentKey();game.CopaSideField.lockCurrent();game.CopaTournamentRuntime.completePlayer(1,0,{playerWon:true,decidedBy:"regulation"});const first=game.CopaSideField.settleMarket(key),cashAfter=game.budget,second=game.CopaSideField.settleMarket(key);return{firstCount:first.settled.length,secondCount:second.settled.length,secondPayout:second.payout,cashAfter,cashFinal:game.budget,status:game.sideFieldState.tickets[0].status};});
  expect(settlement.firstCount).toBe(1);expect(settlement.secondCount).toBe(0);expect(settlement.secondPayout).toBe(0);expect(settlement.cashFinal).toBe(settlement.cashAfter);expect(["won","lost"]).toContain(settlement.status);
  await page.locator(".ys-tabs button").filter({hasText:/SONUÇLAR|RESULTS/}).click();
  await expect(page.locator(".ys-results-list article")).toHaveCount(15);
});
