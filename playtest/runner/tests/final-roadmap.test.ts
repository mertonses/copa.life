import {test,expect} from "@playwright/test";

const primaryProject=(name:string)=>name==="mobile-chromium";

const openFinalReadyHub=async(page:any)=>{
  await page.goto("/?autotest=1",{waitUntil:"domcontentloaded"});
  await page.evaluate(()=>{
    const global=globalThis as any;
    (document.querySelector("#seedInput") as HTMLInputElement).value="COPAFINALE2026";
    global.normalStart();
    global.pickStyle("gegen");
  });
  await page.locator("#postClubName").fill("Checkpoint FK");
  await page.evaluate(()=>{(globalThis as any).pcGo();});
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

test("real match replay is read-only, seekable, keyboard accessible and narratable",async({page},testInfo)=>{
  test.skip(!primaryProject(testInfo.project.name),"replay interaction contract runs once");
  await page.emulateMedia({reducedMotion:"reduce"});
  await page.goto("/?final-replay-viewer=1",{waitUntil:"domcontentloaded"});
  await page.evaluate(()=>{
    const global=globalThis as any;
    Object.defineProperty(global,"speechSynthesis",{configurable:true,value:{spoken:"",cancel(){},speak(value:any){this.spoken=value.text;}}});
    Object.defineProperty(global,"SpeechSynthesisUtterance",{configurable:true,value:class{ text:string;lang="";constructor(text:string){this.text=text;} }});
    global.CopaFinalReplay.openViewer({
      v:2,savedAt:Date.now(),modelVersion:"copa-final-core-v2",code:"test",
      teams:["COPA","RAKİP"],score:[2,1],stats:{shots:[9,7],xg:[1.6,1.1]},
      timeline:[
        {minute:12,type:"danger",side:"A",label:"12' COPA tehlikeli atak",x:.55,y:.7},
        {minute:33,type:"goal",side:"A",label:"33' COPA gol",x:.5,y:.9},
        {minute:61,type:"goal",side:"B",label:"61' Rakip gol",x:.5,y:.1},
        {minute:84,type:"goal",side:"A",label:"84' COPA gol",x:.48,y:.88},
      ],
    });
  });

  const viewer=page.locator("#finalReplayViewer");
  await expect(viewer).toBeVisible();
  await expect(page.locator("#finalReplayPlay")).toBeFocused();
  await expect(page.locator("#finalReplayCounter")).toHaveText("1 / 4");
  await page.keyboard.press("ArrowRight");
  await expect(page.locator("#finalReplayCounter")).toHaveText("2 / 4");
  await expect(page.locator("#finalReplayScore")).toHaveText("1 – 0");
  await page.locator("#finalReplayRange").fill("3");
  await expect(page.locator("#finalReplayCounter")).toHaveText("4 / 4");
  await expect(page.locator("#finalReplayScore")).toHaveText("2 – 1");
  await page.locator(".final-replay-speak").click();
  const spoken=await page.evaluate(()=>(globalThis as any).speechSynthesis.spoken);
  expect(spoken).toContain("2–1");
  expect(await page.locator("#finalReplayEvent").getAttribute("aria-live")).toBe("polite");
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
