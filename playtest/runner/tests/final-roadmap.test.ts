import {test,expect} from "@playwright/test";

const primaryProject=(name:string)=>name==="mobile-chromium";

const openFinalReadyHub=async(page:any)=>{
  await page.goto("/?autotest=1",{waitUntil:"domcontentloaded"});
  await page.evaluate(async()=>{
    const global=globalThis as any;
    await global.quickStart();
    await global.quickAll();
  });
  await page.locator("#postClubName").fill("Checkpoint FK");
  await page.evaluate(()=>{
    const global=globalThis as any;
    global.pcGo();
    global.fastTournamentDraw();
    global.finishTournamentDraw();
    global.setCaptain(0);
    global.closeModal();
    global.round=6;
    global.opponent={...global.bracket[5]};
    global.CopaRunState.transition("hub",{force:true,reason:"penalty_checkpoint_test"});
    global._saveState("hub");
  });
  await expect(page.locator("#hub")).toBeVisible();
};

test("penalty checkpoint preserves directions, score, order and RNG position",async({page},testInfo)=>{
  test.skip(!primaryProject(testInfo.project.name),"checkpoint contract runs once");
  await page.goto("/?penalty-checkpoint=1",{waitUntil:"domcontentloaded"});
  const result=await page.evaluate(()=>{
    const global=globalThis as any;
    global.CopaPenaltyPersistence.clear();
    const state={
      phase:"shoot",round:3,homeGoals:1,awayGoals:1,
      homeShots:[
        {type:"goal",shot:"L",keeper:"R"},
        {type:"save",shot:"C",keeper:"C"},
      ],
      awayShots:[
        {type:"goal",shot:"R",keeper:"L"},
        {type:"miss",shot:"L",keeper:"C"},
      ],
      log:[],home:"COPA",away:"RAKİP",mode:"final",
      homeShooters:[{name:"A",pos:"ST",eff:80},{name:"B",pos:"OS",eff:78}],
      awayShooters:[{name:"C",pos:"ST",eff:79},{name:"D",pos:"OS",eff:77}],
      homeKeeper:{name:"K1",pos:"KL",eff:81},awayKeeper:{name:"K2",pos:"KL",eff:80},
      reveal:null,sudden:false,suddenAnnounced:false,
    };
    const ok=global.CopaPenaltyPersistence.persist({
      runSeed:2026,runRound:6,rngCalls:417,state,context:{finalPenaltyScore:"1–1"},
    });
    const saved=global.CopaPenaltyPersistence.read().state;
    return{
      ok,
      source:global.CopaPenaltyPersistence.read().source,
      rngCalls:saved?.rngCalls,
      homeGoals:saved?.state.homeGoals,
      awayGoals:saved?.state.awayGoals,
      homeDirections:saved?.state.homeShots.map((shot:any)=>shot.shot),
      awayDirections:saved?.state.awayShots.map((shot:any)=>shot.shot),
      shooterOrder:saved?.state.homeShooters.map((player:any)=>player.name),
    };
  });
  expect(result.ok).toBe(true);
  expect(["primary","session"]).toContain(result.source);
  expect(result).toMatchObject({
    rngCalls:417,homeGoals:1,awayGoals:1,
    homeDirections:["L","C"],awayDirections:["R","L"],shooterOrder:["A","B"],
  });
});

test("an interrupted live shootout reopens at the exact deterministic checkpoint",async({page},testInfo)=>{
  test.skip(!primaryProject(testInfo.project.name),"live checkpoint restart runs once");
  await openFinalReadyHub(page);
  await page.evaluate(()=>{
    const global=globalThis as any;
    global._finalPenaltyScore="1–1";
    global._finalPenPower={home:78,away:78};
    global.showPenaltyShootout("final");
    global._takePenalty("L");
    global._takePenalty("R");
  });
  await expect(page.locator(".pen-modal")).toBeVisible();
  const snapshot=await page.evaluate(()=>{
    const global=globalThis as any;
    const primary=localStorage.getItem(global.CopaPenaltyPersistence.KEYS.primary);
    const session=sessionStorage.getItem(global.CopaPenaltyPersistence.KEYS.session);
    return{primary,session,state:JSON.stringify(global._penState),rngCalls:global.runRngCalls};
  });
  expect(snapshot.primary).toBeTruthy();

  const expected=await page.evaluate(()=>{
    const global=globalThis as any;
    global._takePenalty("C");
    return{state:JSON.stringify(global._penState),rngCalls:global.runRngCalls};
  });
  await page.evaluate(({primary,session})=>{
    const global=globalThis as any;
    localStorage.setItem(global.CopaPenaltyPersistence.KEYS.primary,primary);
    sessionStorage.setItem(global.CopaPenaltyPersistence.KEYS.session,session);
  },{primary:snapshot.primary as string,session:snapshot.session as string});

  await page.reload({waitUntil:"domcontentloaded"});
  await expect(page.locator(".pen-modal")).toBeVisible({timeout:15_000});
  const restored=await page.evaluate(()=>{
    const global=globalThis as any;
    const before={state:JSON.stringify(global._penState),rngCalls:global.runRngCalls};
    global._takePenalty("C");
    return{before,after:{state:JSON.stringify(global._penState),rngCalls:global.runRngCalls}};
  });
  expect(restored.before).toEqual({state:snapshot.state,rngCalls:snapshot.rngCalls});
  expect(restored.after).toEqual(expected);
});

test("weekly calibration stores anonymous aggregates and evaluates thresholds",async({page},testInfo)=>{
  test.skip(!primaryProject(testInfo.project.name),"calibration contract runs once");
  await page.goto("/?final-calibration=1",{waitUntil:"domcontentloaded"});
  const stored=await page.evaluate(()=>{
    const global=globalThis as any;
    global.CopaFinalCalibration.clear();
    for(let index=0;index<24;index++){
      global.CopaFinalCalibration.record({
        model_version:"copa-final-core-v2",
        power_gap:["away_4_11","even","home_4_11"][index%3],
        tactic:["balanced","push","calm","hold"][index%4],
        end_type:index%8===0?"penalties":index%5===0?"golden_goal":"regulation",
        outcome:index%2===0?"win":"loss",
        seed:`must-not-be-stored-${index}`,
        team:`must-not-be-stored-${index}`,
      });
    }
    const raw=localStorage.getItem(global.CopaFinalCalibration.KEY)||"";
    const data=global.CopaFinalCalibration.load();
    const key=Object.keys(data.weeks)[0];
    global.openFinalCalibration();
    return{raw,total:data.weeks[key].total};
  });
  expect(stored.total).toBe(24);
  expect(stored.raw).not.toContain("must-not-be-stored");
  await expect(page.locator(".calibration-dashboard")).toBeVisible();
  await expect(page.locator(".calibration-check")).toHaveCount(6);
  await expect(page.locator(".calibration-dashboard")).toContainText("n=24");
});
