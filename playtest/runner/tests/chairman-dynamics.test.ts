import {test,expect,type Page} from "@playwright/test";

test.use({serviceWorkers:"block"});

async function openHub(page:Page){
  await page.goto("/?chairman-dynamics=1",{waitUntil:"domcontentloaded"});
  await page.evaluate(()=>{
    const game=globalThis as any;
    game.setLang("tr");
    game.quickStart();
    game.quickAll();
  });
  await page.locator("#postClubName").fill("Chairman XI");
  await page.evaluate(()=>{
    const game=globalThis as any;
    game.pcGo();game.fastTournamentDraw();game.finishTournamentDraw();
    game.setCaptain(0);game.closeModal();
  });
  await expect(page.locator("#hub")).toBeVisible();
}

test("Showman spotlight is mandatory, resolved once, and persisted",async({page})=>{
  await openHub(page);
  const before=await page.evaluate(()=>{
    const game=globalThis as any;
    game.closeModal();
    game.eval("chairman=Object.assign({},chairman,{id:'sansasyoncu'}); chairTrust=2; round=1; chairmanEventRunId='spotlight-test'; pendingChairmanEvent=null; chairmanEventSeen={}; riskPowerMod=0; sansSpotlightIdx=-1;");
    const event=game.prepareChairmanRoundEvent();
    game.playMatch();
    return{type:event?.type,phase:game.CopaRunState.phase,pending:game.pendingChairmanEvent?.status};
  });
  expect(before).toEqual({type:"spotlight",phase:"hub",pending:"pending"});
  await expect(page.locator(".spotlight-modal")).toBeVisible();
  await page.locator(".spot-card").first().click();
  await expect.poll(()=>page.evaluate(()=>(globalThis as any).pendingChairmanEvent)).toBeNull();
  const after=await page.evaluate(()=>{
    const game=globalThis as any,state=game.CopaRunPersistence.read().state;
    return{
      pending:game.pendingChairmanEvent,
      boost:game.riskPowerMod,
      index:game.sansSpotlightIdx,
      savedPending:state?.pendingChairmanEvent||null,
      savedIndex:state?.sansSpotlightIdx,
    };
  });
  expect(after.pending).toBeNull();
  expect(after.boost).toBe(3);
  expect(after.index).toBeGreaterThanOrEqual(0);
  expect(after.savedPending).toBeNull();
  expect(after.savedIndex).toBe(after.index);
});

test("positive chairman transfers never weaken the starting XI",async({page})=>{
  await openHub(page);
  const result=await page.evaluate(()=>{
    const game=globalThis as any;
    game.picksBySlot.forEach((p:any)=>{p.ov=95;p.train=0;p.dev=0;p.backupBoost=0;p.injured=false;});
    game.bench=[];
    const before=game.picksBySlot.map((p:any)=>({name:p.name,eff:game.effOf(p)}));
    game.eval("takeUnique=(pos)=>fabPlayer(pos,60,60)");
    const info=game.upgradeSlot(91,99,0);
    return{
      mode:info.mode,
      unchanged:game.picksBySlot.every((p:any,i:number)=>p.name===before[i].name&&game.effOf(p)===before[i].eff),
      bench:game.bench.length,
    };
  });
  expect(result).toEqual({mode:"bench",unchanged:true,bench:1});
});

test("Miser charges at most one trust and checks the projected debt limit",async({page})=>{
  await openHub(page);
  const result=await page.evaluate(()=>{
    const game=globalThis as any;
    game.eval("chairman=Object.assign({},chairman,{id:'pinti'}); chairTrust=3; budget=0; legacyCash=0;");
    game.chairmanReactToSpend(14,"card",{card:"kara_borsa",variant:1});
    const afterCombinedRule=game.chairTrust;
    game.eval("chairTrust=1; budget=0; legacyCash=0;");
    return{
      afterCombinedRule,
      oldLimitWouldAllow:game.budgetAfterCost(12)>=game.chairmanSackLimit(),
      projectedRuleAllows:game.canAffordChairmanSpend(12,"card",{card:"kara_borsa",variant:1}),
    };
  });
  expect(result).toEqual({afterCombinedRule:2,oldLimitWouldAllow:true,projectedRuleAllows:false});
});

test("draft transfer affordability and undo use the same chairman transaction",async({page})=>{
  await openHub(page);
  const result=await page.evaluate(()=>{
    const game=globalThis as any;
    game.closeModal();
    game.CopaRunState.transition("draft",{force:true,reason:"chairman_undo_test"});
    game.eval("chairman=Object.assign({},chairman,{id:'pinti'}); chairTrust=3; budget=30; legacyCash=5; riskPowerMod=0; sansStarBonusRound=0;");
    const spentBefore=game.econStats.spent,feedBefore=game.feed.length;
    game.picksBySlot[0]=null;game.picksBySlot[1]=null;game.filled[0]=false;game.filled[1]=false;game.remaining=2;game.currentSlot=0;
    const player=game.fabPlayer(game.slots[0][0],74,74);player.price=14;
    game.currentOpts=[player];
    game.choose(0);
    const afterPick={trust:game.chairTrust,budget:game.budget,legacy:game.legacyCash};
    game.undoPick();
    const state=game.CopaRunPersistence.read().state;
    return{
      afterPick,
      restored:{trust:game.chairTrust,budget:game.budget,legacy:game.legacyCash,spent:game.econStats.spent,feed:game.feed.length,empty:game.picksBySlot[0]===null},
      baseline:{spent:spentBefore,feed:feedBefore},
      savedEmpty:state?.picks?.[0]===null,
    };
  });
  expect(result.afterPick).toEqual({trust:2,budget:21,legacy:0});
  expect(result.restored).toEqual({trust:3,budget:30,legacy:5,spent:result.baseline.spent,feed:result.baseline.feed,empty:true});
  expect(result.savedEmpty).toBe(true);
});

test("Fixer acceptance targets a chosen weak player and persists the full cost",async({page})=>{
  await openHub(page);
  const result=await page.evaluate(()=>{
    const game=globalThis as any;
    game.closeModal();
    game.eval("chairman=Object.assign({},chairman,{id:'torpilci'}); chairTrust=2; budget=20; round=3; chairmanEventRunId='nephew-test'; pendingChairmanEvent=null; chairmanEventSeen={}; finalPenalty=0; eventSeen={};");
    game.picksBySlot.forEach((p:any,i:number)=>{p.ov=80+i;p.train=0;p.dev=0;p.backupBoost=0;p.injured=false;});
    const weakest=game.picksBySlot.map((p:any,i:number)=>({i,eff:game.effOf(p)})).sort((a:any,b:any)=>a.eff-b.eff)[0].i;
    const oldName=game.picksBySlot[weakest].name;
    const event=game.prepareChairmanRoundEvent("nephew");
    const oc={id:"nephew",down:[62,68]};
    game._torpilNephewChoice(oc,event);
    game._acceptNephew(weakest);
    const state=game.CopaRunPersistence.read().state;
    return{
      weakest,
      replaced:game.picksBySlot[weakest].name!==oldName,
      nephew:game.picksBySlot[weakest].isNephew,
      ov:game.picksBySlot[weakest].ov,
      budget:game.budget,
      penalty:game.finalPenalty,
      pending:game.pendingChairmanEvent,
      savedBudget:state?.budget,
      savedPenalty:state?.finalPenalty,
    };
  });
  expect(result.replaced).toBe(true);
  expect(result.nephew).toBe(true);
  expect(result.ov).toBeGreaterThanOrEqual(62);
  expect(result.ov).toBeLessThanOrEqual(68);
  expect(result.budget).toBe(23);
  expect(result.penalty).toBe(1);
  expect(result.pending).toBeNull();
  expect(result.savedBudget).toBe(23);
  expect(result.savedPenalty).toBe(1);
});

test("management replacement cashes Miser savings and saves the new identity",async({page})=>{
  await openHub(page);
  const result=await page.evaluate(()=>{
    const game=globalThis as any;
    game.closeModal();
    game.eval("chairman=Object.assign({},chairman,{id:'pinti'}); chairTrust=2; budget=10; pintiSavings=5; pendingChairmanEvent=null; unlockedChairs=CHAIRMEN.map(c=>c.id);");
    const next=game.availableChairmanReplacements()[0];
    game._pendingManagementChairmanId="pinti";
    game._chooseManagementReplacement(next.id);
    const state=game.CopaRunPersistence.read().state;
    return{
      requested:next.id,
      active:game.eval("chairman.id"),
      trust:game.chairTrust,
      budget:game.budget,
      savings:game.pintiSavings,
      savedChairman:state?.chairId,
      savedBudget:state?.budget,
    };
  });
  expect(result.active).toBe(result.requested);
  expect(result.trust).toBe(1);
  expect(result.budget).toBe(15);
  expect(result.savings).toBe(0);
  expect(result.savedChairman).toBe(result.requested);
  expect(result.savedBudget).toBe(15);
});

test("chairman consult payment and charge are saved before the delayed result",async({page})=>{
  await openHub(page);
  const result=await page.evaluate(()=>{
    const game=globalThis as any;
    game.closeModal();
    game.eval("round=4; presCharges=1; budget=20; chairman=Object.assign({},chairman,{id:'leydi'});");
    game.consultPresident();
    const state=game.CopaRunPersistence.read().state;
    return{charges:game.eval("presCharges"),budget:game.budget,savedCharges:state?.presCharges,savedBudget:state?.budget};
  });
  expect(result).toEqual({charges:0,budget:17,savedCharges:0,savedBudget:17});
});
