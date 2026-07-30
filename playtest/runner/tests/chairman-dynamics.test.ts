import {test,expect,type Page} from "@playwright/test";
import path from "node:path";
import fs from "node:fs";

test.use({serviceWorkers:"block"});
const visualDir=path.resolve(__dirname,"../../../outputs/ui-visuals");

async function openHub(page:Page){
  await page.goto("/?chairman-dynamics=1",{waitUntil:"domcontentloaded"});
  await page.evaluate(async()=>{
    const game=globalThis as any;
    game.setLang("tr");
    await game.quickStart();
    if(game._countryDraftPromise)await game._countryDraftPromise;
    await game.quickAll();
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
    game.eval("chairman=Object.assign({},chairman,{id:'pinti'}); chairTrust=3; budget=0; legacyCash=0; resetChairTrustRoundLedger(chairTrust);");
    game.chairmanReactToSpend(14,"card",{card:"kara_borsa",variant:1});
    const afterCombinedRule=game.chairTrust;
    game.eval("chairTrust=1; budget=0; legacyCash=0; resetChairTrustRoundLedger(chairTrust);");
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
    game.eval("chairman=Object.assign({},chairman,{id:'pinti'}); chairTrust=3; budget=30; legacyCash=5; riskPowerMod=0; sansStarBonusRound=0; resetChairTrustRoundLedger(chairTrust);");
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
      restored:{trust:game.chairTrust,budget:game.budget,legacy:game.legacyCash,ledgerDelta:game.chairTrustRoundDelta,spent:game.econStats.spent,feed:game.feed.length,empty:game.picksBySlot[0]===null},
      baseline:{spent:spentBefore,feed:feedBefore},
      savedEmpty:state?.picks?.[0]===null,
    };
  });
  expect(result.afterPick).toEqual({trust:2,budget:21,legacy:0});
  expect(result.restored).toEqual({trust:3,budget:30,legacy:5,ledgerDelta:0,spent:result.baseline.spent,feed:result.baseline.feed,empty:true});
  expect(result.savedEmpty).toBe(true);
});

test("Fixer offer presents consequences as a compact vertical decision",async({page})=>{
  await page.setViewportSize({width:700,height:650});
  await openHub(page);
  await page.evaluate(()=>{
    const game=globalThis as any;
    game.closeModal();
    game.eval("chairman=Object.assign({},chairman,{id:'torpilci'}); chairTrust=2; budget=20; round=3; chairmanEventRunId='nephew-ui-test'; pendingChairmanEvent=null; chairmanEventSeen={}; finalPenalty=0; eventSeen={};");
    const event=game.prepareChairmanRoundEvent("nephew");
    game._torpilNephewChoice({id:"nephew",down:[62,68]},event);
  });
  const modal=page.locator(".nephew-offer-modal");
  await expect(modal).toBeVisible();
  await expect(modal.locator(".nephew-choice-list article")).toHaveCount(2);
  await expect(modal.locator(".nephew-choice-list li")).toHaveCount(6);
  await expect(modal.locator(".nephew-offer-actions .btn")).toHaveCount(2);
  const layout=await modal.evaluate((panel:HTMLElement)=>{
    const cards=[...panel.querySelectorAll<HTMLElement>(".nephew-choice-list article")].map(card=>card.getBoundingClientRect());
    const actions=[...panel.querySelectorAll<HTMLElement>(".nephew-offer-actions .btn")].map(button=>button.getBoundingClientRect());
    const shell=(panel.closest(".sheet")||panel) as HTMLElement,shellRect=shell.getBoundingClientRect();
    return{
      background:getComputedStyle(panel).backgroundColor,
      cardsStacked:cards[1].top>cards[0].bottom,
      actionsStacked:actions[1].top>actions[0].bottom,
      overflow:panel.scrollWidth-panel.clientWidth,
      shell:{left:shellRect.left,right:shellRect.right,top:shellRect.top,bottom:shellRect.bottom},
      viewport:{width:innerWidth,height:innerHeight},
    };
  });
  expect(layout.background).toBe("rgb(39, 52, 60)");
  expect(layout.cardsStacked).toBe(true);
  expect(layout.actionsStacked).toBe(true);
  expect(layout.overflow).toBeLessThanOrEqual(1);
  expect(layout.shell.left).toBeGreaterThanOrEqual(-1);
  expect(layout.shell.right).toBeLessThanOrEqual(layout.viewport.width+1);
  expect(layout.shell.top).toBeGreaterThanOrEqual(-1);
  expect(layout.shell.bottom).toBeLessThanOrEqual(layout.viewport.height+1);
  fs.mkdirSync(visualDir,{recursive:true});
  await page.screenshot({path:path.join(visualDir,"11-nephew-offer.png"),fullPage:true});
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

test("chairman picker shows contextual numbers and three contract rows without overflow",async({page},testInfo)=>{
  await page.goto("/",{waitUntil:"domcontentloaded"});
  await page.evaluate(()=>{
    const game=globalThis as any;
    game.setLang("tr");
    game.eval("unlockedChairs=CHAIRMEN.map(item=>item.id); buildChairButtons(); showChairPopup('babacan');");
  });
  const modal=page.locator(".chair-picker-modal");
  await expect(modal).toBeVisible();
  await expect(modal.locator(".cp-contract-row")).toHaveCount(3);
  await expect(modal.locator(".cp-contract-row>span")).toHaveText(["ANA AVANTAJ","TETİKLEYİCİ","KIRMIZI ÇİZGİ"]);
  const chairmanPanelsWithSemicolons=await page.evaluate(()=>{
    const game=globalThis as any;
    const ids=game.eval("CHAIRMEN.map(item=>item.id)") as string[];
    const invalid:string[]=[];
    ids.forEach(id=>{
      game.eval(`showChairPopup('${id}')`);
      const text=[...document.querySelectorAll(".cp-contract-row>p")].map(item=>item.textContent||"").join(" ");
      if(text.includes(";"))invalid.push(id);
      game.closeModal();
    });
    game.eval("showChairPopup('babacan')");
    return invalid;
  });
  expect(chairmanPanelsWithSemicolons).toEqual([]);
  const layout=await modal.evaluate((panel:HTMLElement)=>{
    const shell=(panel.closest(".sheet")||panel) as HTMLElement;
    const shellRect=shell.getBoundingClientRect();
    const paragraphs=[...panel.querySelectorAll<HTMLElement>(".cp-contract-row>p")];
    return{
      overflowX:panel.scrollWidth-panel.clientWidth,
      shell:{left:shellRect.left,right:shellRect.right,top:shellRect.top,bottom:shellRect.bottom},
      viewport:{width:innerWidth,height:innerHeight},
      paragraphColors:[...new Set(paragraphs.map(item=>getComputedStyle(item).color))],
      hasTurkishSemicolon:paragraphs.some(item=>item.textContent?.includes(";")),
      numericSpans:panel.querySelectorAll(".cp-context-number").length,
      positiveNumbers:panel.querySelectorAll(".cp-context-number.is-positive").length,
      negativeNumbers:panel.querySelectorAll(".cp-context-number.is-negative").length,
      overlaps:[...panel.querySelectorAll<HTMLElement>(".cp-contract-row")].some((row,index,rows)=>{
        if(index===0)return false;
        return row.getBoundingClientRect().top<(rows[index-1] as HTMLElement).getBoundingClientRect().bottom;
      })
    };
  });
  expect(layout.overflowX).toBeLessThanOrEqual(1);
  expect(layout.shell.left).toBeGreaterThanOrEqual(-1);
  expect(layout.shell.right).toBeLessThanOrEqual(layout.viewport.width+1);
  expect(layout.shell.top).toBeGreaterThanOrEqual(-1);
  expect(layout.shell.bottom).toBeLessThanOrEqual(layout.viewport.height+1);
  expect(layout.paragraphColors).toHaveLength(1);
  expect(layout.hasTurkishSemicolon).toBe(false);
  expect(layout.numericSpans).toBeGreaterThanOrEqual(3);
  expect(layout.positiveNumbers).toBeGreaterThanOrEqual(2);
  expect(layout.negativeNumbers).toBeGreaterThanOrEqual(1);
  expect(layout.overlaps).toBe(false);
  fs.mkdirSync(visualDir,{recursive:true});
  await page.screenshot({path:path.join(visualDir,`12-chair-contract-${testInfo.project.name}.png`),fullPage:true});
});

test("trust changes once per round and the highest-priority reason wins",async({page})=>{
  await openHub(page);
  const result=await page.evaluate(()=>{
    const game=globalThis as any;
    game.eval("round=2; chairTrust=2; resetChairTrustRoundLedger(chairTrust);");
    const loss=game.requestChairTrustChange(-1,"match_loss",30);
    const debt=game.requestChairTrustChange(-1,"debt_pressure",60);
    const dark=game.requestChairTrustChange(-1,"dark_card",70);
    const lateWin=game.requestChairTrustChange(1,"match_win",20);
    const first={trust:game.chairTrust,delta:game.chairTrustLastDelta,reason:game.chairTrustLastReason,loss,debt,dark,lateWin};
    game.eval("round=3");
    const nextRound=game.requestChairTrustChange(1,"match_win",20);
    return{first,next:{trust:game.chairTrust,delta:game.chairTrustLastDelta,reason:game.chairTrustLastReason,nextRound}};
  });
  expect(result.first).toEqual({trust:1,delta:-1,reason:"dark_card",loss:true,debt:true,dark:true,lateWin:false});
  expect(result.next).toEqual({trust:2,delta:1,reason:"match_win",nextRound:true});
});

test("chairman panel explains the last trust change and active threshold",async({page})=>{
  await openHub(page);
  await page.evaluate(()=>{
    const game=globalThis as any;
    game.closeModal();
    game.eval("round=2; chairman=Object.assign({},chairman,{id:'leydi'}); chairTrust=2; resetChairTrustRoundLedger(chairTrust); requestChairTrustChange(-1,'match_loss',30);");
    game.openPresident();
  });
  const line=page.locator(".chair-profile .chair-trust-change");
  await expect(line).toBeVisible();
  await expect(line).toContainText("Son değişim: Mağlubiyet −1");
  await expect(line).toContainText("Sonraki eşik: −€21M");
  await expect(line.locator("span")).toHaveCount(0);
});

test("chairman red lines override match results without stacking trust",async({page})=>{
  await openHub(page);
  const result=await page.evaluate(()=>{
    const game=globalThis as any;
    game.eval("round=2; chairman=Object.assign({},chairman,{id:'sansasyoncu'}); chairTrust=2; resetChairTrustRoundLedger(chairTrust); riskPowerMod=0; sansStarBonusRound=0;");
    game.requestChairTrustChange(-1,"match_loss",30);
    game.chairmanReactToSpend(8,"transfer",{ov:90});
    const showman={trust:game.chairTrust,reason:game.chairTrustLastReason,power:game.riskPowerMod};
    game.eval("round=3; chairman=Object.assign({},chairman,{id:'pinti'}); chairTrust=2; resetChairTrustRoundLedger(chairTrust);");
    game.requestChairTrustChange(1,"match_win",20);
    game.chairmanReactToSpend(14,"card",{card:"kara_borsa",variant:1});
    return{showman,miser:{trust:game.chairTrust,reason:game.chairTrustLastReason}};
  });
  expect(result.showman).toEqual({trust:3,reason:"showman_star_transfer",power:3});
  expect(result.miser).toEqual({trust:1,reason:"miser_spending"});
});

test("Showman and Professor respect their signature-event budgets",async({page})=>{
  await openHub(page);
  const result=await page.evaluate(()=>{
    const game=globalThis as any;
    game.closeModal();
    game.eval("chairman=Object.assign({},chairman,{id:'sansasyoncu'}); chairmanEventRunId='budget-showman'; pendingChairmanEvent=null; chairmanEventSeen={};");
    const showman:any[]=[];
    for(const value of [1,2,3,4,5]){
      game.eval(`round=${value}; pendingChairmanEvent=null`);
      const event=game.prepareChairmanRoundEvent();
      showman.push(event?.type||null);
      if(event)game._resolvePendingChairmanEvent(event.type,"test");
    }
    game.eval("chairman=Object.assign({},chairman,{id:'cilgin'}); chairTrust=0; chairmanEventRunId='budget-professor'; pendingChairmanEvent=null; chairmanEventSeen={}; professorChaosOffers=0;");
    const professor:any[]=[];
    for(const value of [2,3,4]){
      game.eval(`round=${value}; pendingChairmanEvent=null`);
      const event=game.prepareChairmanRoundEvent();
      professor.push(event?.type||null);
      if(event)game._resolvePendingChairmanEvent(event.type,"test");
    }
    game.eval("professorBudgetCrises=0");
    game.cilginCrisisClone({id:"cut"},10);
    game.cilginCrisisClone({id:"tax"},8);
    return{showman,professor,offers:game.professorChaosOffers,crises:game.professorBudgetCrises};
  });
  expect(result.showman).toEqual(["spotlight",null,null,"spotlight",null]);
  expect(result.professor).toEqual(["chaos","chaos",null]);
  expect(result.offers).toBe(2);
  expect(result.crises).toBe(1);
});

test("Professor chaos is optional unless trust is zero",async({page})=>{
  await openHub(page);
  await page.evaluate(()=>{
    const game=globalThis as any;
    game.closeModal();
    game.eval("chairman=Object.assign({},chairman,{id:'cilgin'}); chairTrust=2; round=2; chairmanEventRunId='optional-chaos'; pendingChairmanEvent=null; chairmanEventSeen={}; professorChaosOffers=0; rand=()=>0;");
    game.prepareChairmanRoundEvent("chaos");
    game.showPendingChairmanEvent();
  });
  await expect(page.locator(".kaos-modal")).toBeVisible();
  await expect(page.locator(".kaos-modal .btn-ghost")).toHaveText("PAS GEÇ");
  await page.locator(".kaos-modal .btn-ghost").click();
  await expect.poll(()=>page.evaluate(()=>(globalThis as any).pendingChairmanEvent)).toBeNull();
  await page.evaluate(()=>{
    const game=globalThis as any;
    game.eval("chairTrust=0; round=3; pendingChairmanEvent=null;");
    game.prepareChairmanRoundEvent("chaos");
    game.showPendingChairmanEvent();
  });
  await expect(page.locator(".kaos-modal")).toBeVisible();
  await expect(page.locator(".kaos-modal .btn-ghost")).toHaveCount(0);
});

test("Patron positive support no longer creates final power debt",async({page})=>{
  await openHub(page);
  const result=await page.evaluate(()=>{
    const game=globalThis as any;
    game.closeModal();
    game.eval("chairman=Object.assign({},chairman,{id:'babacan'}); finalPenalty=0; chairSupportDebt=0; budget=10;");
    game.eval("_resolvePresidentOc(POUT.find(item=>item.id==='generous'))");
    return{penalty:game.finalPenalty,supportDebt:game.chairSupportDebt,budget:game.budget};
  });
  expect(result.penalty).toBe(0);
  expect(result.supportDebt).toBe(0);
  expect(result.budget).toBeGreaterThan(10);
});
