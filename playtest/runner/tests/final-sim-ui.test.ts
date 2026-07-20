import { test, expect } from "@playwright/test";

const openFinalReadyHub=async(page:any)=>{
  await page.goto("/?autotest=1",{waitUntil:"domcontentloaded"});
  await page.evaluate(()=>{
    const global=globalThis as any;
    const input=document.querySelector("#seedInput") as HTMLInputElement;
    input.value="COPAFINALE2026";
    global.normalStart();
    global.pickStyle("gegen");
  });
  await expect(page.locator("#postClubName")).toBeVisible();
  await page.locator("#postClubName").fill("Final Test FK");
  await page.evaluate(()=>{(globalThis as any).pcGo();});
  await expect(page.locator("#hub")).toBeVisible();
};

test("final seed creates a complete, deterministic final-ready hub",async({page},testInfo)=>{
  test.skip(!testInfo.project.name.includes("mobile"),"real final engine regression runs once");
  await openFinalReadyHub(page);
  const state=await page.evaluate(()=>{
    const global=globalThis as any;
    const bar=document.querySelector(".vsbar") as HTMLElement;
    const opponentName=document.querySelector("#oppNm") as HTMLElement;
    const barRect=bar.getBoundingClientRect();
    const opponentRect=opponentName.getBoundingClientRect();
    return{
      phase:global.CopaRunState.phase,
      round:global.round,
      complete:global.hasCompleteStartingXI(),
      opponent:global.opponent?.name,
      finalOpponent:global.bracket?.[5]?.name,
      previousResults:global.fixtures?.slice(0,5).map((fixture:any)=>fixture.res),
      matchupOverflow:bar.scrollWidth-bar.clientWidth,
      opponentInsideMatchup:opponentRect.left>=barRect.left-1&&opponentRect.right<=barRect.right+1,
    };
  });
  expect(state.finalOpponent).toBeTruthy();
  expect(state).toEqual({
    phase:"hub",
    round:6,
    complete:true,
    opponent:state.finalOpponent,
    finalOpponent:state.finalOpponent,
    previousResults:["W","W","W","W","W"],
    matchupOverflow:0,
    opponentInsideMatchup:true,
  });
});

test("real final engine pause, resume, speed, shout and skip controls remain coherent",async({page},testInfo)=>{
  test.skip(!testInfo.project.name.includes("mobile"),"real final engine regression runs once");
  const errors:string[]=[];
  page.on("pageerror",error=>errors.push(error.message));
  await openFinalReadyHub(page);
  await page.evaluate(()=>{(globalThis as any).startFinalSim2();});
  await expect(page.locator("#sim")).toBeVisible();
  await page.evaluate(()=>{
    const game=globalThis as any;
    game.sim.pause();
    game._setFinalPauseUi(true);
    game.setSpeed(10);
  });
  await expect(page.locator("#simEventMap svg")).toBeVisible();
  await expect(page.locator("#pauseBtn")).toHaveAttribute("aria-pressed","true");
  await expect(page.locator("#mobileSkipBtn")).toBeVisible();
  await page.locator("#mobileSkipBtn").click();
  await expect(page.locator(".mobile-skip-confirm")).toBeVisible();
  await expect(page.locator("#pauseBtn")).toHaveAttribute("aria-pressed","true");
  await page.locator(".mobile-skip-confirm .btn-ghost").click();
  await expect(page.locator("#modal")).toBeHidden();
  await page.locator('[data-sim-view="stats"]').click();
  await expect(page.locator("#pauseBtn")).toBeVisible();

  await expect.poll(()=>page.locator("#pauseBtn").evaluate(element=>element.classList.contains("pause"))).toBe(true);
  await expect(page.locator("#pauseBtn")).toHaveAttribute("aria-pressed","true");
  const pausedClock=await page.locator("#simClk").textContent();
  await page.waitForTimeout(500);
  await expect(page.locator("#simClk")).toHaveText(pausedClock||"");

  await page.locator("#pauseBtn").click();
  await expect.poll(()=>page.locator("#pauseBtn").evaluate(element=>element.classList.contains("pause"))).toBe(false);
  await expect(page.locator("#pauseBtn")).toHaveAttribute("aria-pressed","false");
  await expect.poll(()=>page.locator("#simClk").textContent()).not.toBe(pausedClock);

  await page.locator('.spd[data-s="80"]').click();
  await expect(page.locator('.spd[data-s="80"]')).toHaveAttribute("aria-pressed","true");
  await expect(page.locator('.spd[data-s="10"]')).toHaveAttribute("aria-pressed","false");
  await page.locator("#shPush").click();
  await expect(page.locator("#shPush")).toHaveAttribute("aria-pressed","true");
  await expect(page.locator("#mobileTacticStatus")).toContainText(/Önde bas|Press high/i);
  await expect(page.locator("#simGoals")).toContainText(/TACTIC.*HIGH PRESS/is);
  await expect(page.locator("#simGoals .event-tactic")).toHaveAttribute("data-event-type","tactic");
  await expect(page.locator('[data-sim-view="events"] .mobile-tab-badge')).toBeVisible();
  const mobileControls=await page.locator("#sim .speedrow button").evaluateAll(elements=>elements.map(element=>{
    const rect=element.getBoundingClientRect();
    return{width:rect.width,height:rect.height};
  }));
  expect(mobileControls.every(control=>control.width>=44&&control.height>=44)).toBe(true);
  await page.evaluate(()=>{(globalThis as any).CopaMobileExperience.setSimView("events");});
  await expect(page.locator("#sim .eventpanel")).toBeVisible();
  const eventHeight=await page.locator("#simGoals .event-tactic").evaluate(element=>element.getBoundingClientRect().height);
  expect(eventHeight).toBeGreaterThanOrEqual(48);
  const runningClock=await page.locator("#simClk").textContent();
  await expect.poll(()=>page.locator("#simClk").textContent()).not.toBe(runningClock);
  await page.evaluate(()=>{(globalThis as any).CopaMobileExperience.setSimView("field");});
  await expect(page.locator("#sim .fieldframe")).toBeVisible();

  const statText=await page.locator("#simStats").innerText();
  expect(statText).not.toMatch(/NaN|undefined|null/);
  await expect.poll(()=>page.locator("#simClk").textContent().then(value=>Number.parseInt(value||"0",10)),{timeout:10_000}).toBeGreaterThanOrEqual(50);
  await page.evaluate(()=>{(globalThis as any).CopaMobileExperience.setSimView("stats");});
  await page.locator('.spd[data-s="20"]').click();
  await page.waitForTimeout(1_000);
  await expect(page.locator("#simState")).not.toHaveText(/HALF TIME|DEVRE ARASI/i);
  await page.locator('.spd[data-s="80"]').click();
  await page.locator("#mobileSkipBtn").click();
  await expect(page.locator(".mobile-skip-confirm")).toBeVisible();
  await page.locator(".mobile-skip-confirm .btn-primary").click();
  await expect.poll(()=>page.evaluate(()=>{
    const global=globalThis as any;
    const resultVisible=!document.querySelector("#result")?.classList.contains("hidden");
    const finalPenalties=global._penaltyModalReady&&global._penState?.mode==="final";
    return resultVisible||finalPenalties;
  }),{timeout:15_000}).toBe(true);

  const audit=await page.evaluate(()=>{
    const global=globalThis as any;
    const value=global.finalSimAudit||{};
    return{
      sequences:(value.wide||0)+(value.central||0)+(value.recycle||0)+(value.longBall||0)+(value.counter||0),
      planned:value.plannedSequences||0,
      shots:(global.shotsA||0)+(global.shotsB||0),
      xg:[global.xgA,global.xgB],
    };
  });
  expect(audit.sequences).toBeGreaterThan(0);
  expect(audit.planned).toBeGreaterThan(0);
  expect(audit.shots).toBeGreaterThan(0);
  expect(audit.xg.every((value:any)=>Number.isFinite(Number(value)))).toBe(true);
  expect(errors).toEqual([]);
});

test("mobile penalty decisions keep one clear status and remove the obsolete history control",async({page},testInfo)=>{
  test.skip(!testInfo.project.name.includes("mobile"),"mobile penalty presentation regression");
  await openFinalReadyHub(page);
  await page.evaluate(()=>{(globalThis as any).showPenaltyShootout("final");});
  await expect(page.locator(".pen-modal")).toBeVisible();
  await expect(page.locator(".mobile-penalty-coach")).toBeVisible();
  await expect(page.locator(".pen-dir-btn")).toHaveCount(3);
  const controls=await page.locator(".pen-dir-btn").evaluateAll(elements=>elements.map(element=>{
    const rect=element.getBoundingClientRect();
    return{width:rect.width,height:rect.height};
  }));
  expect(controls.every(control=>control.width>=44&&control.height>=48)).toBe(true);
  expect(await page.locator(".pen-head").evaluate(element=>getComputedStyle(element).position)).toBe("sticky");
  expect(await page.locator(".pen-action-dock").evaluate(element=>getComputedStyle(element).position)).toBe("sticky");
  await expect(page.locator(".pen-phase-badge")).toHaveCount(0);
  await expect(page.locator(".pen-phase span")).toHaveCount(0);
  await expect(page.locator(".pen-phase b")).toHaveText(/ŞUT SENDE|YOUR KICK/);
  const headContrast=await page.locator(".pen-head").evaluate(element=>{
    const head=getComputedStyle(element);
    const score=getComputedStyle(element.querySelector(".pen-score b") as HTMLElement);
    return{headColor:head.color,background:head.backgroundColor,scoreColor:score.color};
  });
  expect(headContrast.headColor).not.toBe(headContrast.background);
  expect(headContrast.scoreColor).not.toBe(headContrast.background);

  await page.locator('.pen-dir-btn[data-dir="L"]').click();
  await expect(page.locator(".pen-log,.pen-log-toggle")).toHaveCount(0);
});

test("final resumes from a process-death checkpoint at the same match state",async({page},testInfo)=>{
  test.skip(!testInfo.project.name.includes("mobile"),"process-death final regression runs once");
  await openFinalReadyHub(page);
  await page.evaluate(()=>{(globalThis as any).startFinalSim2();});
  await expect(page.locator("#sim")).toBeVisible();
  await page.evaluate(()=>{
    const game=globalThis as any;
    game.sim.pause();
    game._setFinalPauseUi(true);
    game.setSpeed(10);
  });
  await page.locator('[data-sim-view="stats"]').click();
  await expect(page.locator("#pauseBtn")).toHaveAttribute("aria-pressed","true");
  await page.locator('.spd[data-s="80"]').click();
  await page.locator("#shPush").click();
  await page.locator("#pauseBtn").click();
  await expect.poll(()=>page.locator("#simClk").textContent().then(value=>Number.parseInt(value||"0",10)),{timeout:10_000}).toBeGreaterThanOrEqual(20);
  await page.locator("#pauseBtn").click();
  const before=await page.evaluate(()=>{
    const global=globalThis as any;
    global.sim.pause();global.sim.checkpoint();
    const state=global.sim.getState();
    return{minute:state.matchTime,score:state.score,rngState:state.rngState,decisionLog:state.decisionLog};
  });
  expect(before.decisionLog.at(-1)?.tactic).toBe("push");
  await page.reload({waitUntil:"domcontentloaded"});
  await expect(page.locator("#sim")).toBeVisible({timeout:15_000});
  const after=await page.evaluate(()=>{
    const global=globalThis as any;
    global.sim.pause();
    const state=global.sim.getState();
    const saved=global.CopaFinalSimPersistence.read().state;
    return{
      phase:global.CopaRunState.phase,
      minute:state.matchTime,score:state.score,decisionLog:state.decisionLog,
      savedMinute:saved&&saved.match.matchTime,
      model:saved&&saved.modelVersion
    };
  });
  expect(after.phase).toBe("match");
  expect(after.minute).toBeGreaterThanOrEqual(before.minute);
  expect(after.minute-before.minute).toBeLessThan(20);
  expect(after.score).toEqual(before.score);
  expect(after.decisionLog.at(-1)?.tactic).toBe("push");
  expect(after.savedMinute).toBeGreaterThanOrEqual(before.minute);
  expect(after.model).toBe("copa-final-core-v3");
});

test("shareable final code can be imported and deterministically verified",async({page},testInfo)=>{
  test.skip(!testInfo.project.name.includes("mobile"),"replay import regression runs once");
  await page.goto("/?autotest=1",{waitUntil:"domcontentloaded"});
  await page.evaluate(()=>{(globalThis as any).openFinalReplayImport();});
  await expect(page.locator("#finalReplayImportValue")).toBeVisible();
  const code=await page.evaluate(()=>{
    const core=(globalThis as any).CopaFinalSimCore;
    return core.createReplayCode({seed:20260717,homePower:78,awayPower:74,tactic:"push",cards:["kontra"],decisions:[{minute:60,tactic:"hold"}]});
  });
  await page.locator("#finalReplayImportValue").fill(code);
  await page.getByRole("button",{name:/TEKRARI DOĞRULA|VERIFY REPLAY/}).click();
  await expect(page.locator(".scoutmodal")).toContainText("copa-final-core-v3");
  await expect(page.locator(".scoutmodal")).toContainText(/Skor|Score/);
  const replayed=await page.evaluate((value)=>{
    const replay=(globalThis as any).CopaFinalReplay.inspect(value);
    return{score:replay.score,winner:replay.winner,code:replay.replayCode};
  },code);
  expect(replayed.score.every((value:number)=>Number.isInteger(value))).toBe(true);
  expect([0,1]).toContain(replayed.winner);
  expect(replayed.code).toBe(code);
});
