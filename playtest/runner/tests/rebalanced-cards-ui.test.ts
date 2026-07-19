import {test,expect,type Page} from "@playwright/test";

test.use({serviceWorkers:"block"});

async function openHub(page:Page){
  await page.goto("/?rebalanced-cards=1",{waitUntil:"domcontentloaded"});
  await page.evaluate(()=>{
    const game=globalThis as any;
    game.setLang("tr");
    game.quickStart();
    game.quickAll();
  });
  await page.locator("#postClubName").fill("Balance XI");
  await page.evaluate(()=>{
    const game=globalThis as any;
    game.pcGo();
    game.setCaptain(0);
    game.closeModal();
  });
  await expect(page.locator("#hub")).toBeVisible();
}

test("Son Dans uses the safer final-only COMMON and DARK values",async({page})=>{
  await openHub(page);
  const values=await page.evaluate(()=>{
    const game=globalThis as any;
    const healthy=game.picksBySlot.filter(Boolean).map((player:any)=>({...player,injured:false}));
    const injured=healthy.map((player:any,index:number)=>index===0?{...player,injured:true}:player);
    game.cardVariant.son_dans=0;
    const commonHealthy=game.cardEff("son_dans",healthy,6);
    const commonInjured=game.cardEff("son_dans",injured,6);
    const early=game.cardEff("son_dans",healthy,5);
    game.cardVariant.son_dans=1;
    const darkHealthy=game.cardEff("son_dans",healthy,6);
    const darkInjured=game.cardEff("son_dans",injured,6);
    return{commonHealthy,commonInjured,darkHealthy,darkInjured,early};
  });
  expect(values).toEqual({
    commonHealthy:7,
    commonInjured:3,
    darkHealthy:10,
    darkInjured:0,
    early:0,
  });
});

test("Piyango creates, persists and consumes the fixed two-round coupon",async({page})=>{
  await openHub(page);
  const state=await page.evaluate(()=>{
    const game=globalThis as any;
    game.round=6;
    game.chairmanMarketMod=()=>0;
    game.lotteryCouponAmount=0;
    game.lotteryCouponTurns=0;
    game.cardVariant.nasip_kismet=0;
    game.cardVariant.son_dans=1;
    const commonPrice=game.cardPrice("nasip_kismet");
    const priceBefore=game.cardPrice("son_dans");
    game.rand=()=>0.99;
    game.applyRiskCardGain("nasip_kismet");
    const priceWithCoupon=game.cardPrice("son_dans");
    game.renderHub();
    game._saveState();
    const saved=game.CopaRunPersistence.read().state;
    return{
      name:game.L().cards.nasip_kismet.n,
      commonPrice,
      priceBefore,
      priceWithCoupon,
      amount:game.lotteryCouponAmount,
      turns:game.lotteryCouponTurns,
      savedAmount:saved.lotteryCouponAmount,
      savedTurns:saved.lotteryCouponTurns,
    };
  });
  expect(state).toMatchObject({
    name:"Piyango",
    commonPrice:2,
    amount:5,
    turns:3,
    savedAmount:5,
    savedTurns:3,
  });
  expect(state.priceBefore-state.priceWithCoupon).toBe(5);
  await expect(page.locator(".lottery-coupon-banner")).toContainText("PİYANGO KUPONU");

  const purchase=await page.evaluate(()=>{
    const game=globalThis as any;
    const before=game.budget;
    game.cardsBoughtThisTurn=0;
    game.shopVariants.son_dans=1;
    game.buyCard("son_dans");
    return{
      spent:before-game.budget,
      couponAmount:game.lotteryCouponAmount,
      couponTurns:game.lotteryCouponTurns,
      owns:game.cardInv.son_dans,
    };
  });
  expect(purchase).toMatchObject({
    spent:state.priceWithCoupon,
    couponAmount:0,
    couponTurns:0,
    owns:1,
  });

  const dark=await page.evaluate(()=>{
    const game=globalThis as any;
    game.lotteryCouponAmount=0;
    game.lotteryCouponTurns=0;
    game.cardVariant.nasip_kismet=1;
    game.rand=()=>0;
    const before=game.budget;
    const price=game.cardPrice("nasip_kismet");
    game.applyRiskCardGain("nasip_kismet");
    return{
      price,
      expense:before-game.budget,
      amount:game.lotteryCouponAmount,
      turns:game.lotteryCouponTurns,
    };
  });
  expect(dark).toEqual({price:3,expense:3,amount:8,turns:3});
});

test("Kara Borsa COMMON burns one card and grants one of three COMMON offers",async({page})=>{
  await openHub(page);
  const setup=await page.evaluate(()=>{
    const game=globalThis as any;
    game.round=4;
    game.chairmanMarketMod=()=>0;
    game.cards=[];
    game.cardInv={};
    game.cardVariant={};
    game.rand=()=>0.42;
    game.addCard("taraftar",0,{silent:true});
    return{
      commonPrice:(game.cardVariant.kara_borsa=0,game.cardPrice("kara_borsa")),
      darkPrice:(game.cardVariant.kara_borsa=1,game.cardPrice("kara_borsa")),
      earlyFinals:game.eligibleMarketCardPool(4).filter((key:string)=>game.cardKind(key)==="final"),
    };
  });
  expect(setup).toEqual({commonPrice:3,darkPrice:7,earlyFinals:[]});

  await page.evaluate(()=>(globalThis as any).openBlackMarketTrade(0));
  await page.locator('.black-market-card[data-card="taraftar"]').click();
  await page.locator("[data-black-market-burn]").click();
  await page.locator(".black-market-confirm .black-market-burn").click();

  const offers=page.locator(".black-market-reward-card");
  await expect(offers).toHaveCount(3);
  await expect(offers.locator(".var-badge.var-0")).toHaveCount(3);
  const offered=await offers.evaluateAll(nodes=>nodes.map(node=>(node as HTMLElement).dataset.card));
  await offers.first().click();
  await expect(page.locator("[data-black-market-take]")).toBeEnabled();
  await page.locator("[data-black-market-take]").click();

  const result=await page.evaluate((keys)=>{
    const game=globalThis as any;
    return{
      burned:game.cardInv.taraftar||0,
      acquired:keys.filter((key:string)=>game.cardInv[key]>0),
    };
  },offered);
  expect(result.burned).toBe(0);
  expect(result.acquired).toHaveLength(1);
});

test("Kara Borsa DARK shows four variants and grants exactly two selected cards",async({page})=>{
  await openHub(page);
  await page.evaluate(()=>{
    const game=globalThis as any;
    game.round=5;
    game.cards=[];
    game.cardInv={};
    game.cardVariant={};
    game.rand=()=>0.9;
    game.addCard("taraftar",0,{silent:true});
    game.openBlackMarketTrade(1);
  });
  await page.locator('.black-market-card[data-card="taraftar"]').click();
  await page.locator("[data-black-market-burn]").click();
  await page.locator(".black-market-confirm .black-market-burn").click();

  const offers=page.locator(".black-market-reward-card");
  await expect(offers).toHaveCount(4);
  await expect(offers.locator(".black-market-card-costs")).toHaveCount(4);
  const offered=await offers.evaluateAll(nodes=>nodes.map(node=>(node as HTMLElement).dataset.card));
  await offers.nth(0).click();
  await expect(page.locator("[data-black-market-take]")).toBeDisabled();
  await offers.nth(1).click();
  await expect(page.locator("[data-black-market-take]")).toBeEnabled();
  await page.evaluate(()=>(globalThis as any).rand=()=>0.99);
  await page.locator("[data-black-market-take]").click();

  const result=await page.evaluate((keys)=>{
    const game=globalThis as any;
    return{
      burned:game.cardInv.taraftar||0,
      acquired:keys.filter((key:string)=>game.cardInv[key]>0),
    };
  },offered);
  expect(result.burned).toBe(0);
  expect(result.acquired).toHaveLength(2);
});

test("Kara Borsa DARK applies its 25 percent branch as an eight million fine",async({page})=>{
  await openHub(page);
  const result=await page.evaluate(()=>{
    const game=globalThis as any;
    game.cards=[];
    game.cardInv={};
    game.cardVariant={};
    game.BLACK_MARKET_REWARD={
      burnName:"Test Kartı",
      variant:1,
      required:1,
      offers:[{key:"taraftar",variant:0}],
      selected:["taraftar"],
    };
    game.rand=()=>0;
    const before=game.budget;
    const completed=game.completeBlackMarketTrade();
    return{
      completed,
      expense:before-game.budget,
      acquired:game.cardInv.taraftar||0,
    };
  });
  expect(result).toEqual({completed:true,expense:8,acquired:1});
});

test("Doping Söylentisi uses the new prices, power and two-fine cap",async({page})=>{
  await openHub(page);
  const result=await page.evaluate(()=>{
    const game=globalThis as any;
    game.round=2;
    game.cards=["doping"];
    game.cardInv={doping:1};
    game.cardVariant={doping:0};
    game.chairmanMarketMod=()=>0;
    game.installmentTurns=0;
    game.kumarbazInstallmentTurns=0;
    game.lastCreditActive=0;
    game.dopingInvestigationResolved=0;
    game.rand=()=>0;
    game.budget=100;
    const commonPower=game.cardEff("doping",game.picksBySlot.filter(Boolean),2);
    game.processRiskCards();
    const afterCommon=game.budget;
    game.processRiskCards();
    const afterRepeat=game.budget;
    game.processRiskCards();
    const afterCap=game.budget;
    game._saveState();
    const savedResolved=game.CopaRunPersistence.read().state.dopingInvestigationResolved;

    game.cardVariant.doping=1;
    game.dopingInvestigationResolved=0;
    game.budget=100;
    const darkPower=game.cardEff("doping",game.picksBySlot.filter(Boolean),2);
    const darkPrice=game.cardPrice("doping");
    game.processRiskCards();
    return{
      commonPower,
      commonFine:100-afterCommon,
      repeatFine:afterCommon-afterRepeat,
      cappedFine:afterRepeat-afterCap,
      savedResolved,
      darkPower,
      darkPrice,
      darkFine:100-game.budget,
      darkResolved:game.dopingInvestigationResolved,
      finalPenalty:game.KARA_PEN.doping,
    };
  });
  expect(result).toEqual({
    commonPower:6,
    commonFine:10,
    repeatFine:10,
    cappedFine:0,
    savedResolved:2,
    darkPower:9,
    darkPrice:9,
    darkFine:18,
    darkResolved:1,
    finalPenalty:8,
  });
});

test("İvme now starts behind 12. Adam and peaks later",async({page})=>{
  await openHub(page);
  const result=await page.evaluate(()=>{
    const game=globalThis as any;
    const squad=game.picksBySlot.filter(Boolean);
    game.chairmanMarketMod=()=>0;
    game.cardVariant.ch_momentum=0;
    const common=[1,2,3,4,5,6].map(round=>game.cardEff("ch_momentum",squad,round));
    const commonPrice=game.cardPrice("ch_momentum");
    game.cardVariant.ch_momentum=1;
    const dark=[1,2,3,4,5,6].map(round=>game.cardEff("ch_momentum",squad,round));
    const darkPrice=game.cardPrice("ch_momentum");
    return{common,dark,commonPrice,darkPrice,finalPenalty:game.KARA_PEN.ch_momentum};
  });
  expect(result).toEqual({
    common:[1,1,3,3,5,5],
    dark:[2,2,5,5,8,8],
    commonPrice:4,
    darkPrice:6,
    finalPenalty:6,
  });
});

test("Kriz Yönetimi applies percentage relief without exceeding its caps",async({page})=>{
  await openHub(page);
  const result=await page.evaluate(()=>{
    const game=globalThis as any;
    game.chairmanMarketMod=()=>0;
    game.cardVariant.kriz=0;
    const commonPrice=game.cardPrice("kriz");
    game.finalPenalty=30;
    game.krizActive=true;
    game.krizVariant=0;
    game.applyKriz();
    const commonCleared=30-game.finalPenalty;

    game.cardVariant.kriz=1;
    const darkPrice=game.cardPrice("kriz");
    game.finalPenalty=30;
    game.krizActive=true;
    game.krizVariant=1;
    game.applyKriz();
    const darkCleared=30-game.finalPenalty;

    game.finalPenalty=7;
    game.krizActive=true;
    game.krizVariant=1;
    game.applyKriz();
    const proportionalDarkCleared=7-game.finalPenalty;
    return{commonPrice,darkPrice,commonCleared,darkCleared,proportionalDarkCleared};
  });
  expect(result).toEqual({
    commonPrice:9,
    darkPrice:12,
    commonCleared:6,
    darkCleared:10,
    proportionalDarkCleared:5,
  });
});

test("Yerli Blok DARK reaches plus eight while COMMON remains capped at five",async({page})=>{
  await openHub(page);
  const result=await page.evaluate(()=>{
    const game=globalThis as any;
    game.chairmanMarketMod=()=>0;
    const squad=(locals:number)=>Array.from({length:11},(_,index)=>({tr:index<locals}));
    game.cardVariant.yerli_blok=0;
    const common=[3,4,5].map(locals=>game.cardEff("yerli_blok",squad(locals),3));
    const commonPrice=game.cardPrice("yerli_blok");
    game.cardVariant.yerli_blok=1;
    const dark=[3,4,5].map(locals=>game.cardEff("yerli_blok",squad(locals),3));
    const darkPrice=game.cardPrice("yerli_blok");
    return{common,dark,commonPrice,darkPrice,finalPenalty:game.KARA_PEN.yerli_blok};
  });
  expect(result).toEqual({
    common:[3,4,5],
    dark:[6,8,8],
    commonPrice:6,
    darkPrice:8,
    finalPenalty:3,
  });
});

test("Mükâfat keeps its save key while using the reduced contract values and final debt",async({page})=>{
  await openHub(page);
  const result=await page.evaluate(()=>{
    const game=globalThis as any;
    game.chairmanMarketMod=()=>0;
    game.cardPriceMod=1;
    game.shopPriceChaos={};
    game.cardVariant.sahte_evrak=0;
    const commonPrice=game.cardPrice("sahte_evrak");
    const commonPower=game.cardEff("sahte_evrak",game.picksBySlot.filter(Boolean),game.round);
    game.chairTrust=2;
    game.rand=()=>0;
    game.applyRiskCardGain("sahte_evrak");
    const commonTrust=game.chairTrust;

    game.cardVariant.sahte_evrak=1;
    const darkPrice=game.cardPrice("sahte_evrak");
    const darkPower=game.cardEff("sahte_evrak",game.picksBySlot.filter(Boolean),game.round);
    game.chairTrust=2;
    game.applyRiskCardGain("sahte_evrak");
    return{
      keyStillStable:Object.hasOwn(game.CARDDEFS,"sahte_evrak"),
      name:game.T.tr.cards.sahte_evrak.n,
      localizedNames:["tr","en","es","de","it"].map(language=>game.T[language].cards.sahte_evrak.n),
      commonPrice,commonPower,commonTrust,
      darkPrice,darkPower,darkTrust:game.chairTrust,
      finalPenalty:game.KARA_PEN.sahte_evrak,
    };
  });
  expect(result).toEqual({
    keyStillStable:true,
    name:"Mükâfat",
    localizedNames:["Mükâfat","Reward","Recompensa","Belohnung","Ricompensa"],
    commonPrice:6,
    commonPower:5,
    commonTrust:1,
    darkPrice:8,
    darkPower:8,
    darkTrust:1,
    finalPenalty:8,
  });
});

test("Riziko is free, consumes the purchase turn and applies the new delayed costs",async({page})=>{
  await openHub(page);
  const result=await page.evaluate(()=>{
    const game=globalThis as any;
    game.chairmanMarketMod=()=>0;
    game.cardPriceMod=1;
    game.shopPriceChaos={};
    game.cardsBoughtThisTurn=0;
    game.riskPowerMod=0;
    game.deferredBudgetPenalty=0;
    game.shopVariants.primler_yatinca=0;
    game.buyCard("primler_yatinca");
    const common={
      price:game.cardPrice("primler_yatinca"),
      bought:game.cardsBoughtThisTurn,
      power:game.riskPowerMod,
      delayedCost:game.deferredBudgetPenalty,
    };

    game.riskPowerMod=0;
    game.deferredBudgetPenalty=0;
    game.cardVariant.primler_yatinca=1;
    game.applyRiskCardGain("primler_yatinca");
    return{
      name:game.T.tr.cards.primler_yatinca.n,
      localizedNames:["tr","en","es","de","it"].map(language=>game.T[language].cards.primler_yatinca.n),
      common,
      dark:{
        price:game.cardPrice("primler_yatinca"),
        power:game.riskPowerMod,
        delayedCost:game.deferredBudgetPenalty,
      },
      badgeCommon:game.cardCostBadge("primler_yatinca",0),
      badgeDark:game.cardCostBadge("primler_yatinca",1),
    };
  });
  expect(result).toEqual({
    name:"Riziko",
    localizedNames:["Riziko","Risk","Riesgo","Risiko","Rischio"],
    common:{price:0,bought:1,power:5,delayedCost:6},
    dark:{price:0,power:9,delayedCost:12},
    badgeCommon:"Sonraki tur -€6M",
    badgeDark:"Sonraki tur -€12M",
  });
});

test("Fedailer compares total squad power and uses the new four branches",async({page})=>{
  await openHub(page);
  const result=await page.evaluate(()=>{
    const game=globalThis as any;
    game.chairmanMarketMod=()=>0;
    game.cardPriceMod=1;
    game.shopPriceChaos={};
    const play=(variant:number,stronger:boolean,roll:number)=>{
      game.cardVariant.deplasman_kafilesi=variant;
      game.riskPowerMod=0;
      const current=game.squadPower(game.round).power;
      game.opponent={...(game.opponent||{}),power:current+(stronger?1:-1)};
      game.rand=()=>roll;
      game.applyRiskCardGain("deplasman_kafilesi");
      return game.riskPowerMod;
    };
    game.cardVariant.deplasman_kafilesi=0;
    const commonPrice=game.cardPrice("deplasman_kafilesi");
    game.cardVariant.deplasman_kafilesi=1;
    const darkPrice=game.cardPrice("deplasman_kafilesi");
    return{
      name:game.T.tr.cards.deplasman_kafilesi.n,
      localizedNames:["tr","en","es","de","it"].map(language=>game.T[language].cards.deplasman_kafilesi.n),
      commonPrice,darkPrice,
      commonStrong:play(0,true,0.9),
      commonOther:play(0,false,0.9),
      darkStrong:play(1,true,0.9),
      darkLucky:play(1,false,0),
      darkUnlucky:play(1,false,0.9),
    };
  });
  expect(result).toEqual({
    name:"Fedailer",
    localizedNames:["Fedailer","Devotees","Los Devotos","Die Getreuen","I Fedeli"],
    commonPrice:4,
    darkPrice:6,
    commonStrong:6,
    commonOther:2,
    darkStrong:9,
    darkLucky:4,
    darkUnlucky:-2,
  });
});

test("Duvar! uses the adjusted five and six million prices",async({page})=>{
  await openHub(page);
  const result=await page.evaluate(()=>{
    const game=globalThis as any;
    game.chairmanMarketMod=()=>0;
    game.cardPriceMod=1;
    game.shopPriceChaos={};
    game.cardVariant.tecrubeli_omurga=0;
    const common=game.cardPrice("tecrubeli_omurga");
    game.cardVariant.tecrubeli_omurga=1;
    const dark=game.cardPrice("tecrubeli_omurga");
    return{
      common,dark,
      localizedNames:["tr","en","es","de","it"].map(language=>game.T[language].cards.tecrubeli_omurga.n),
    };
  });
  expect(result).toEqual({
    common:5,
    dark:6,
    localizedNames:["Duvar!","The Wall!","¡El Muro!","Die Mauer!","Il Muro!"],
  });
});

test("Barikat, Son Koz and Joker are permanent localized names on stable save keys",async({page})=>{
  await openHub(page);
  const result=await page.evaluate(()=>{
    const game=globalThis as any;
    const languages=["tr","en","es","de","it"];
    const names=(key:string)=>languages.map(language=>game.T[language].cards[key].n);
    return{
      stableKeys:["gec_gec","final_provasi","bu_adam"].every(key=>Object.hasOwn(game.CARDDEFS,key)),
      barricade:names("gec_gec"),
      lastResort:names("final_provasi"),
      joker:names("bu_adam"),
    };
  });
  expect(result).toEqual({
    stableKeys:true,
    barricade:["Barikat","Barricade","Barricada","Barrikade","Barricata"],
    lastResort:["Son Koz","Last Resort","Último Recurso","Letzter Trumpf","Ultima Risorsa"],
    joker:["Joker","Joker","Comodín","Joker","Jolly"],
  });
});

test("Lokomotif is the permanent localized name on the stable star-card key",async({page})=>{
  await openHub(page);
  const result=await page.evaluate(()=>{
    const game=globalThis as any;
    return{
      stableKey:Object.hasOwn(game.CARDDEFS,"yildiz"),
      localizedNames:["tr","en","es","de","it"].map(language=>game.T[language].cards.yildiz.n),
    };
  });
  expect(result).toEqual({
    stableKey:true,
    localizedNames:["Lokomotif","Locomotive","Locomotora","Lokomotive","Locomotiva"],
  });
});
