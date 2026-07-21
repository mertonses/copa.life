import { test, expect } from "@playwright/test";

const GAME_URL="http://127.0.0.1:5500/?hidden-player=1";

test("mystery player reveals inline without interrupting the dice flow and blocks undo with a toast",async({page})=>{
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
  await expect(page.locator("#modal")).toBeHidden();
  await expect(page.locator("#rollstage")).toBeVisible();
  await expect(page.locator("#pitch .roundel:not(.empty)")).toContainText(playerName.split(" ").at(-1)!);
  const revealed=await page.evaluate(()=>{
    const game=globalThis as any;
    const player=game.picksBySlot.find(Boolean);
    return{filled:game.picksBySlot.filter(Boolean).length,hidden:player.hidden,trait:player.trait,undoBlocked:game.undoData?.blockedByHidden};
  });
  expect(revealed).toEqual({filled:1,hidden:false,trait:"lider",undoBlocked:true});

  await page.locator("#undoBtn").click();
  await expect(page.locator("#toastContainer .toast")).toContainText("Undo cannot be used after selecting a Mystery Player.");
  expect(await page.evaluate(()=>(globalThis as any).picksBySlot.filter(Boolean).length)).toBe(1);
  await expect(page.locator("#undoBtn")).toBeHidden();

  await page.evaluate(()=>{const game=globalThis as any;game.roll();});
  await expect(page.locator("#optstage")).toBeVisible();
  await page.evaluate(()=>{
    const game=globalThis as any;
    game.currentOpts[0].hidden=false;
    game.currentOpts[0].price=0;
    game.renderOpts();
  });
  await page.locator("#opts .opt").first().click();
  await expect(page.locator("#rollstage")).toBeVisible();
  await expect(page.locator("#undoBtn")).toBeVisible();
  expect(await page.evaluate(()=>(globalThis as any).picksBySlot.filter(Boolean).length)).toBe(2);

  await page.locator("#undoBtn").click();
  expect(await page.evaluate(()=>(globalThis as any).picksBySlot.filter(Boolean).length)).toBe(1);
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
