import { test, expect } from "@playwright/test";

const GAME_URL="http://127.0.0.1:5500/?hidden-player=1";

test("mystery player requires commitment, localizes the scout signal, and reveals before continuing",async({page})=>{
  await page.goto(GAME_URL,{waitUntil:"domcontentloaded"});
  await page.evaluate(()=>{const game=globalThis as any;game.setLang("tr");game.quickStart();game.roll();});
  await expect(page.locator("#optstage")).toBeVisible();

  const playerName=await page.evaluate(()=>{
    const game=globalThis as any;
    const player=game.currentOpts[0];
    player.hidden=true;
    player.hiddenOutcome="gem";
    player.hiddenTier="gem";
    player.scoutSignal="positive";
    player.price=5;
    player.trait="lider";
    delete player.scoutHint;
    game.renderOpts();
    return player.name;
  });

  await expect(page.locator("#opts .opt").first()).toContainText("Tavan yüksek");
  await page.evaluate(()=>(globalThis as any).setLang("en"));
  await expect(page.locator("#opts .opt").first()).toContainText("High ceiling");

  await page.locator("#opts .opt").first().click();
  await expect(page.locator("#modal")).toContainText("Scout note: high ceiling");
  await expect(page.locator("#modal")).toContainText("This transfer cannot be undone after the reveal.");
  expect(await page.evaluate(()=>(globalThis as any).picksBySlot.filter(Boolean).length)).toBe(0);

  await page.getByRole("button",{name:"SIGN & REVEAL"}).click();
  await expect(page.locator("#modal")).toContainText(playerName);
  await expect(page.locator("#modal")).toContainText("GEM");
  await expect(page.locator("#modal")).toContainText("Leader");
  const revealed=await page.evaluate(()=>{
    const game=globalThis as any;
    const player=game.picksBySlot.find(Boolean);
    return{filled:game.picksBySlot.filter(Boolean).length,hidden:player.hidden,trait:player.trait,undo:game.undoData};
  });
  expect(revealed).toEqual({filled:1,hidden:false,trait:"lider",undo:null});

  await page.getByRole("button",{name:"CONTINUE"}).click();
  await expect(page.locator("#rollstage")).toBeVisible();
});

test("auto-fill uses draft option generation and records mystery-player offers",async({page})=>{
  await page.goto(GAME_URL,{waitUntil:"domcontentloaded"});
  const result=await page.evaluate(async()=>{
    const game=globalThis as any;
    localStorage.removeItem("copa_balance_telemetry_v1");
    game.quickStart();
    game.deadlineH=6;
    await game.quickAll();
    const telemetry=game.getBalanceTelemetry().hiddenDraft||{};
    return{
      filled:game.picksBySlot.filter(Boolean).length,
      autoOffers:Number(telemetry.autoOffered)||0,
      hiddenSigned:game.picksBySlot.filter((player:any)=>player&&player.hidden).length,
    };
  });
  expect(result.filled).toBe(11);
  expect(result.autoOffers).toBeGreaterThan(0);
  expect(result.hiddenSigned).toBe(0);
  await expect(page.locator("#postClubName")).toBeVisible();
});
