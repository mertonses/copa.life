import {test,expect,type Page} from "@playwright/test";

test.use({serviceWorkers:"block"});

async function openHub(page:Page){
  await page.goto("/?reward-risk-flow=1",{waitUntil:"domcontentloaded"});
  await page.evaluate(()=>{
    const game=globalThis as any;
    game.setLang("tr");
    game.quickStart();
    game.quickAll();
  });
  await page.locator("#postClubName").fill("Reward XI");
  await page.evaluate(()=>{
    const game=globalThis as any;
    game.pcGo();game.fastTournamentDraw();game.finishTournamentDraw();
    game.setCaptain(0);
    game.closeModal();
  });
  await expect(page.locator("#hub")).toBeVisible();
}

async function enterReward(page:Page){
  await page.evaluate(()=>{
    const game=globalThis as any;
    const moved=game.CopaRunState.transition("match",{reason:"reward_risk_flow_test"});
    if(!moved.ok)throw new Error(`reward setup failed: ${moved.error||"transition"}`);
    game.showRewardChoice();
  });
}

test("reward screen shows real cash and a chemistry-safe +2 loan preview",async({page})=>{
  await openHub(page);
  await page.evaluate(()=>{(globalThis as any).kaosHalfReward=true;});
  await enterReward(page);
  const preview=await page.evaluate(()=>{
    const game=globalThis as any;
    const offer=game.pendingLoanReward;
    return{
      gain:offer.after-offer.before,
      clubInherited:offer.player.club===offer.displaced.club,
      localInherited:offer.player.tr===offer.displaced.tr,
      weakIsEffectiveMinimum:game.picksBySlot
        .map((player:any,index:number)=>({player,index}))
        .filter(({player}:any)=>player&&!player.injured)
        .sort((a:any,b:any)=>game.effOf(a.player)-game.effOf(b.player))[0].index===offer.weakIdx,
    };
  });

  await expect(page.getByRole("button",{name:/Kasa Primi/})).toContainText("Kasa +€2M");
  await expect(page.getByRole("button",{name:/Kiralık Oyuncu/})).toContainText(/Takım gücü \d+ → \d+/);
  expect(preview).toMatchObject({
    gain:2,
    clubInherited:true,
    localInherited:true,
    weakIsEffectiveMinimum:true,
  });
});

test("loan keeps the +2 squad guarantee even at the 99 OV ceiling",async({page})=>{
  await openHub(page);
  const result=await page.evaluate(()=>{
    const game=globalThis as any;
    game.picksBySlot.forEach((player:any)=>{
      player.ov=99;
      player.train=0;
      player.dev=0;
      player.backupBoost=0;
      player.injured=false;
    });
    game.pendingLoanReward=null;
    const offer=game.prepareLoanReward();
    return{
      before:offer.before,
      after:offer.after,
      playerOv:offer.player.ov,
      guarantee:offer.player.teamPowerBoost,
    };
  });
  expect(result.playerOv).toBe(99);
  expect(result.after-result.before).toBe(2);
  expect(result.guarantee).toBeGreaterThan(0);
});

test("Medical Team lists every injury, heals the selected player and protects the next match",async({page})=>{
  await openHub(page);
  await page.evaluate(()=>{
    const game=globalThis as any;
    game.picksBySlot[0].injured=true;
    game.picksBySlot[0].injuryLevel=2;
    game.picksBySlot[1].injured=true;
    game.picksBySlot[1].injuryLevel=3;
    game.syncInjuredIdx();
  });
  await enterReward(page);
  const names=await page.evaluate(()=>{
    const game=globalThis as any;
    return[game.shortName(game.picksBySlot[0]),game.shortName(game.picksBySlot[1])];
  });

  await page.getByRole("button",{name:/Sağlık Ekibi/}).click();
  const patients=page.locator(".swap-list .swap-card-btn");
  await expect(patients).toHaveCount(2);
  await expect(patients.nth(0)).toContainText(names[0]);
  await expect(patients.nth(1)).toContainText(names[1]);
  await patients.nth(1).click();

  const result=await page.evaluate(()=>{
    const game=globalThis as any;
    return{
      firstStillInjured:game.picksBySlot[0].injured,
      selectedHealed:game.picksBySlot[1].injured,
      validPointer:game.injuredSlotIndices().includes(game.injuredIdx),
      protection:game.medicalProtectionTurns,
      protectedChance:game.injuryChanceWithMedicalProtection(1),
    };
  });
  expect(result).toEqual({
    firstStillInjured:true,
    selectedHealed:false,
    validPointer:true,
    protection:1,
    protectedChance:0.5,
  });
});

test("an existing injury no longer blocks an additional injury",async({page})=>{
  await openHub(page);
  const result=await page.evaluate(()=>{
    const game=globalThis as any;
    game.picksBySlot.forEach((player:any)=>{player.injured=false;});
    game.picksBySlot[0].injured=true;
    game.picksBySlot[0].injuryLevel=2;
    game.medicalProtectionTurns=0;
    game.rand=()=>0;
    const added=game.applyRandomInjury(1);
    return{
      added:!!added,
      count:game.injuredSlotIndices().length,
      pointer:game.injuredIdx,
    };
  });
  expect(result.added).toBe(true);
  expect(result.count).toBe(2);
  expect(result.pointer).toBe(1);
});

test("an injured loan expires without leaving a stale injury pointer",async({page})=>{
  await openHub(page);
  const result=await page.evaluate(()=>{
    const game=globalThis as any;
    const offer=game.prepareLoanReward();
    const otherIdx=offer.weakIdx===0?1:0;
    offer.player.turnsLeft=1;
    offer.player.slotIdx=offer.weakIdx;
    offer.player.displaced=offer.displaced;
    offer.player.injured=true;
    offer.player.injuryLevel=3;
    game.picksBySlot[offer.weakIdx]=offer.player;
    game.picksBySlot[otherIdx].injured=true;
    game.picksBySlot[otherIdx].injuryLevel=2;
    game.loanPlayer=offer.player;
    game.injuredIdx=offer.weakIdx;
    game.expireRewardLoanBeforeChoice();
    return{
      loanCleared:game.loanPlayer===null,
      displacedRestored:game.picksBySlot[offer.weakIdx]===offer.displaced,
      pointer:game.injuredIdx,
      remaining:game.injuredSlotIndices(),
      otherIdx,
    };
  });
  expect(result.loanCleared).toBe(true);
  expect(result.displacedRestored).toBe(true);
  expect(result.remaining).toEqual([result.otherIdx]);
  expect(result.pointer).toBe(result.otherIdx);
});

test("risky offers use the new names and preserve the intended packages",async({page})=>{
  await openHub(page);
  await page.evaluate(()=>(globalThis as any).showDraftEvent());
  await expect(page.getByRole("button",{name:/Vadeli Kudret/})).toBeVisible();
  await expect(page.getByRole("button",{name:/Kör Talih/})).toContainText("+€12M");
  await expect(page.getByRole("button",{name:/Dişini Sık/})).toContainText("+5 güç");
  await expect(page.getByRole("button",{name:/Pas Geç/})).toContainText("Etki yok");

  const result=await page.evaluate(()=>{
    const game=globalThis as any;
    const offers=game._draftEvents;
    const byName=(name:string)=>offers.find((offer:any)=>offer.n===name);

    game.riskPowerMod=0;
    game.draftFatigueTurns=0;
    const cashBeforePress=game.budget;
    byName("Vadeli Kudret").go();
    const press={power:game.riskPowerMod,cost:cashBeforePress-game.budget,fatigue:game.draftFatigueTurns};

    game.rand=()=>0.99;
    const cashBeforeBlind=game.budget;
    byName("Kör Talih").go();
    const blindSafe=game.budget-cashBeforeBlind;
    game.rand=()=>0;
    const cashBeforeClawback=game.budget;
    byName("Kör Talih").go();
    const blindClawback=game.budget-cashBeforeClawback;

    game.riskPowerMod=0;
    game.draftPendingInjury=0;
    game.picksBySlot[0].injured=true;
    byName("Dişini Sık").go();
    const grit={power:game.riskPowerMod,pending:game.draftPendingInjury};

    game.draftDebtTurns=1;
    byName("Kupaya Senet").go();
    const stackedDebtTurns=game.draftDebtTurns;

    const beforePass={power:game.riskPowerMod,budget:game.budget};
    byName("Pas Geç").go();
    const passUnchanged=beforePass.power===game.riskPowerMod&&beforePass.budget===game.budget;
    return{press,blindSafe,blindClawback,grit,stackedDebtTurns,passUnchanged};
  });

  expect(result).toEqual({
    press:{power:6,cost:8,fatigue:1},
    blindSafe:12,
    blindClawback:-8,
    grit:{power:5,pending:1},
    stackedDebtTurns:3,
    passUnchanged:true,
  });
});

test("Card Swap offers two eligible cards and discloses retained final debt",async({page})=>{
  await openHub(page);
  await enterReward(page);
  const setup=await page.evaluate(()=>{
    const game=globalThis as any;
    game.round=2;
    game.cards=[];
    game.cardInv={};
    game.cardVariant={};
    game.addCard("taraftar",1,{silent:true});
    game.doCardSwap("taraftar");
    const eligible=game.eligibleMarketCardPool(3,{persistentOnly:true,exclude:["taraftar"]});
    return{
      offers:game.rewardCardSwapState.offers.map((offer:any)=>offer.key),
      eligible,
    };
  });

  const offers=page.locator(".swap-list .swap-card-btn");
  await expect(offers).toHaveCount(2);
  await expect(page.locator(".black-market-warning")).toContainText("-6 final borcu");
  expect(setup.offers).toHaveLength(2);
  expect(setup.offers.every((key:string)=>setup.eligible.includes(key))).toBe(true);
});
