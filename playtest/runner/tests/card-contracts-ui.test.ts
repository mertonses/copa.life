import {test,expect,type Page} from "@playwright/test";

test.use({serviceWorkers:"block"});

async function openHub(page:Page){
  await page.goto("/?card-contracts=1",{waitUntil:"domcontentloaded"});
  await page.evaluate(()=>{
    const game=globalThis as any;
    game.setLang("tr");
    game.quickStart();
    game.quickAll();
  });
  await page.locator("#postClubName").fill("Contract XI");
  await page.evaluate(()=>{
    const game=globalThis as any;
    game.pcGo();
    game.setCaptain(0);
    game.closeModal();
  });
  await expect(page.locator("#hub")).toBeVisible();
}

test("Maç Sözü resolves clean-sheet rewards, DARK failure and commitment lock",async({page})=>{
  await openHub(page);
  await page.evaluate(()=>(globalThis as any).addCard("mac_sozu",0,{silent:true}));
  expect(await page.evaluate(()=>(globalThis as any).showMatchPromiseModal())).toBe(true);
  await expect(page.locator(".match-promise-modal")).toContainText("GOL YEMEYECEĞİZ");
  await page.getByRole("button",{name:"SÖZ VER"}).click();
  let state=await page.evaluate(()=>{
    const game=globalThis as any;
    return{
      active:game.matchPromiseState,
      locked:game.cardHasLockedCommitment("mac_sozu"),
      secondDeclaration:game.declareCleanSheetPromise(),
    };
  });
  expect(state.active).toMatchObject({round:1,variant:0});
  expect(state.locked).toBe(true);
  expect(state.secondDeclaration).toBe(false);

  const common=await page.evaluate(()=>{
    const game=globalThis as any;
    game.finishCardMatchCommitments(2,0,1);
    game.round=2;
    const withReward=game.squadPower(2);
    const saved=game.matchPromiseReward;
    game.matchPromiseReward=null;
    const withoutReward=game.squadPower(2);
    game.matchPromiseReward=saved;
    return{
      reward:saved,
      cardBonusDelta:withReward.cardBonus-withoutReward.cardBonus,
      powerDelta:withReward.power-withoutReward.power,
    };
  });
  expect(common.reward).toMatchObject({round:2,delta:3,sourceRound:1});
  expect(common.cardBonusDelta).toBe(3);
  expect(common.powerDelta).toBe(3);

  const dark=await page.evaluate(()=>{
    const game=globalThis as any;
    game.finishCardMatchCommitments(1,1,2);
    game.round=3;
    game.cardVariant.mac_sozu=1;
    game.matchPromisePromptedRound=0;
    game.declareCleanSheetPromise();
    game.finishCardMatchCommitments(1,2,3);
    return{
      reward:game.matchPromiseReward,
      value:game.matchPromisePowerForRound(4),
      locked:game.cardHasLockedCommitment("mac_sozu"),
    };
  });
  expect(dark.reward).toMatchObject({round:4,delta:-3,sourceRound:3});
  expect(dark.value).toBe(-3);
  expect(dark.locked).toBe(true);
});

test("Kaptanın Kararı appears after a negative talk and applies COMMON/DARK costs once",async({page})=>{
  await openHub(page);
  await page.evaluate(()=>{
    const game=globalThis as any;
    game.addCard("kaptanin_karari",0,{silent:true});
    game.talkUsed=false;
    game.talkDelta=()=>-2;
    game.rand=()=>0.99;
    game.pickTalk("gaz");
  });
  const captainButton=page.getByRole("button",{name:"KAPTAN ARAYA GİRSİN"});
  await expect(captainButton).toBeVisible();
  await captainButton.click();
  const common=await page.evaluate(()=>{
    const game=globalThis as any;
    const active={...game.captainDecisionActive};
    const withPenalty=game.squadPower(game.round);
    game.captainDecisionActive=null;
    const withoutPenalty=game.squadPower(game.round);
    game.captainDecisionActive=active;
    game._saveState();
    const saved=game.CopaRunPersistence.read().state;
    return{
      talk:game.talkMod.all,
      result:saved.lastTalkResult,
      penalty:game.captainDecisionPlayerPenaltyForRound(game.round,game.picksBySlot.filter(Boolean)),
      avgLoss:withoutPenalty.avg-withPenalty.avg,
      chemDelta:withPenalty.chem-withoutPenalty.chem,
      canReuse:game.canUseCaptainDecision(),
      savedUsed:saved.captainDecisionUsed,
      savedActive:saved.captainDecisionActive,
    };
  });
  expect(common.talk).toBe(0);
  expect(common.result).toMatchObject({delta:0,originalDelta:-2,captainIntervened:true});
  expect(common.penalty).toBe(-2);
  expect(common.avgLoss).toBeCloseTo(2/11,5);
  expect(common.chemDelta).toBe(0);
  expect(common.canReuse).toBe(false);
  expect(common.savedUsed).toBe(true);
  expect(common.savedActive).toMatchObject({round:1,variant:0,penalty:2,chem:0});

  const dark=await page.evaluate(()=>{
    const game=globalThis as any;
    game.captainDecisionUsed=false;
    game.captainDecisionActive=null;
    game.cardVariant.kaptanin_karari=1;
    game.talkUsed=false;
    game.pickTalk("gaz");
    const baseChem=game.squadPower(game.round).chem;
    const used=game.useCaptainDecision();
    const after=game.squadPower(game.round);
    return{
      used,
      talk:game.talkMod.all,
      penalty:game.captainDecisionPlayerPenaltyForRound(game.round,game.picksBySlot.filter(Boolean)),
      chemistryBonus:game.captainDecisionChemistryForRound(game.round),
      chemistryChange:after.chem-baseChem,
      recordedChemistry:after.captainChem,
      canReuse:game.canUseCaptainDecision(),
    };
  });
  expect(dark.used).toBe(true);
  expect(dark.talk).toBe(0);
  expect(dark.penalty).toBe(-3);
  expect(dark.chemistryBonus).toBe(1);
  expect(dark.recordedChemistry).toBe(1);
  expect(dark.chemistryChange).toBeGreaterThanOrEqual(0);
  expect(dark.canReuse).toBe(false);
});
