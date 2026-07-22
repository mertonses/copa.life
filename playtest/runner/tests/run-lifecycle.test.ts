import { test, expect } from "@playwright/test";

const GAME_URL="/?autotest=1";
const setupHub=async(page:any)=>{
  await page.goto(GAME_URL,{waitUntil:"domcontentloaded"});
  await page.evaluate(async()=>{const game=globalThis as any;await game.quickStart();if(game._countryDraftPromise)await game._countryDraftPromise;await game.quickAll();});
  await expect(page.locator("#postClubName")).toBeVisible();
  await page.locator("#postClubName").fill("Lifecycle FK");
  await page.evaluate(()=>{const w=globalThis as any;w.pcGo();w.fastTournamentDraw();w.finishTournamentDraw();w.setCaptain(0);w.closeModal();});
  await expect(page.locator("#hub")).toBeVisible();
};

test.describe("run lifecycle and recovery",()=>{
  test("play styles expose their real tradeoffs and use the rebalanced weather effects",async({page})=>{
    await page.goto(GAME_URL,{waitUntil:"domcontentloaded"});
    await page.evaluate(()=>{(globalThis as any).setLang("tr");(globalThis as any).normalStart();});
    await expect(page.locator('[data-style="gegen"] .ssd')).toContainText("+%3,5");
    await expect(page.locator('[data-style="kontra"] .ssd')).toContainText("yağmurda +1");
    await expect(page.locator('[data-style="tiki"] .ssd')).toContainText("yağmurda -1");
    const balance=await page.evaluate(()=>{
      style="kontra";currentWeather={id:"rain"};const counterRain=weatherPowerBonus();
      currentWeather={id:"wind"};const counterWind=weatherPowerBonus();
      style="tiki";currentWeather={id:"rain"};const possessionRain=weatherPowerBonus();
      currentWeather={id:"wind"};const possessionWind=weatherPowerBonus();
      style="gegen";currentWeather={id:"sun"};const gegenRisk=injuryRiskFor(70);
      style="tiki";const baselineRisk=injuryRiskFor(70);
      return{counterRain,counterWind,possessionRain,possessionWind,injuryRiskDelta:Number((gegenRisk-baselineRisk).toFixed(3))};
    });
    expect(balance).toEqual({counterRain:1,counterWind:0,possessionRain:-1,possessionWind:0,injuryRiskDelta:.035});
  });

  test("complete run traverses hub, match, reward and result phases",async({page})=>{
    await setupHub(page);
    for(let expectedRound=2;expectedRound<=6;expectedRound++){
      const reward=await page.evaluate(()=>{const w=globalThis as any;const moved=w.CopaRunState.transition("match",{reason:"browser_lifecycle_test"});if(!moved.ok)return moved;w.showRewardChoice();return{ok:true,phase:w.CopaRunState.phase};});
      expect(reward).toEqual({ok:true,phase:"reward"});
      await expect(page.locator("#modal")).toBeVisible();
      await page.evaluate(()=>{(globalThis as any).finishRoundReward("cash");});
      await expect(page.locator("#hub")).toBeVisible();
      const state=await page.evaluate(()=>{const w=globalThis as any;return{round:w.round,phase:w.CopaRunState.phase,complete:w.hasCompleteStartingXI()};});
      expect(state).toEqual({round:expectedRound,phase:"hub",complete:true});
    }
    await page.evaluate(()=>{(globalThis as any).endRun(true,"2–1");});
    await expect(page.locator("#result")).toBeVisible();
    await expect(page.locator("#rCareerProgress")).toBeVisible();
    await expect(page.locator("#rCareerProgress")).toContainText(/CLUB CAREER|KULÜP KARİYERİ/);
    expect(await page.locator("#rCareerProgress").evaluate(element=>element.previousElementSibling?.classList.contains("statline"))).toBe(true);
    await expect(page.locator("#modal")).toBeHidden();
    const result=await page.evaluate(()=>{const w=globalThis as any;const career=w.CopaMeta.getState();return{phase:w.CopaRunState.phase,ended:w.runEnded,won:w.lastResult&&w.lastResult.won,save:localStorage.getItem("copa_run_v6"),reputation:career.career.reputation,memories:career.museum.memories.length,licenses:career.career.licenses};});
    expect(result).toMatchObject({phase:"result",ended:true,won:true,save:null,memories:1});
    expect(result.reputation).toBeGreaterThan(0);
    expect(result.licenses).toBeGreaterThan(0);
    await page.locator(".career-open-link").click();
    await expect(page.locator(".meta-progress-modal")).toBeVisible();
    await expect(page.locator(".meta-tabs button")).toHaveCount(4);
    await page.locator(".meta-tabs button").nth(2).click();
    await expect(page.locator(".meta-memory-card")).toHaveCount(1);
  });

  test("club career keeps one scroll hierarchy and progressively discloses history",async({page})=>{
    await page.goto(GAME_URL,{waitUntil:"domcontentloaded"});
    await page.evaluate(async()=>{
      const w=globalThis as any;
      await w.CopaLazy.ensureMetaProgression();
      for(let index=0;index<8;index++)w.CopaMeta.recordRun({
        seed:5000+index,metaRun:index+1,team:`Archive ${index+1}`,country:"TR",
        formation:index%2?"4-3-3":"4-4-2",style:index%2?"kontra":"gegen",chairman:"babacan",
        won:index===7,round:index===7?6:3,power:70+index,cards:2,cash:index,playedMatches:index===7?6:3,wins:index===7?6:2,
        players:[{id:`player-${index}`,name:`Player ${index+1}`,pos:"CM",power:72+index,club:`Archive ${index+1}`,age:24}]
      });
      w.CopaMeta.openProgression("career");
    });
    await expect(page.locator(".meta-progress-modal")).toBeVisible();
    await expect(page.locator(".meta-progress-actions")).toHaveCount(0);
    await expect(page.locator(".meta-close")).toBeVisible();
    await expect(page.locator(".meta-run-row")).toHaveCount(5);
    if(!(await page.locator(".meta-see-all").isVisible()))await page.locator(".meta-archive > summary").click();
    await page.locator(".meta-see-all").click();
    await expect(page.locator(".meta-history-modal .meta-run-row")).toHaveCount(8);
    await page.locator(".meta-history-back").click();
    await page.locator(".meta-tabs button").nth(1).click();
    await expect(page.locator(".meta-mastery-row")).toHaveCount(5);
    await expect(page.locator(".meta-mastery-track")).toHaveCount(5);
    await page.locator(".meta-tabs button").nth(2).click();
    await expect(page.locator(".meta-memory-card")).toHaveCount(8);
  });

  test("reload during reward resumes the same unresolved reward",async({page})=>{
    await setupHub(page);
    expect(await page.evaluate(()=>JSON.parse(localStorage.getItem("copa_run_v6")||"null")?.phase)).toBe("hub");
    await page.evaluate(()=>{const w=globalThis as any;w.CopaRunState.transition("match",{reason:"reload_test"});w.showRewardChoice();});
    await expect(page.locator("#modal")).toBeVisible();
    await page.reload({waitUntil:"domcontentloaded"});
    await expect(page.locator("#hub")).toBeVisible();
    await expect(page.locator("#modal .reward-modal")).toBeVisible();
    expect(await page.evaluate(()=>({phase:(globalThis as any).CopaRunState.phase,round:(globalThis as any).round}))).toEqual({phase:"reward",round:1});
    await page.evaluate(()=>{(globalThis as any).finishRoundReward("cash");});
    expect(await page.evaluate(()=>({phase:(globalThis as any).CopaRunState.phase,round:(globalThis as any).round}))).toEqual({phase:"hub",round:2});
    await page.evaluate(()=>{(globalThis as any).finishRoundReward("cash");});
    expect(await page.evaluate(()=>({phase:(globalThis as any).CopaRunState.phase,round:(globalThis as any).round}))).toEqual({phase:"hub",round:2});
  });

  test("reload after a revealed loss resumes that exact terminal result",async({page})=>{
    await setupHub(page);
    await page.evaluate(()=>{
      const w=globalThis as any;
      w.CopaRunState.transition("match",{reason:"revealed_loss_test"});
      (0,eval)('lastMatchPerf={power:72,oppPower:75,gf:0,ga:1,win:false,draw:false,note:"Test loss",why:"Locked result"};lastMatchEvents=[];pendingMatchResolution={round,advance:false,draw:false,gf:0,ga:1};fixtures[round-1]={...fixtures[round-1],res:"L",gf:0,ga:1,events:[],note:"Test loss"};');
      w._saveState("match");
      w._showPendingMatchResult();
    });
    await expect(page.locator("#modal .tele-lose")).toBeVisible();
    await page.reload({waitUntil:"domcontentloaded"});
    await expect(page.locator("#modal .tele-lose")).toBeVisible();
    expect(await page.evaluate(()=>({phase:(globalThis as any).CopaRunState.phase,pending:(globalThis as any).pendingMatchResolution}))).toMatchObject({phase:"match",pending:{advance:false,draw:false,gf:0,ga:1}});
  });

  test("corrupt primary checkpoint falls back without losing the run",async({page})=>{
    await setupHub(page);
    await page.evaluate(()=>{const w=globalThis as any;w._saveState();w._saveState();localStorage.setItem("copa_run_v6","{broken");});
    await page.reload({waitUntil:"domcontentloaded"});
    await expect(page.locator("#hub")).toBeVisible();
    expect(await page.evaluate(()=>({phase:(globalThis as any).CopaRunState.phase,complete:(globalThis as any).hasCompleteStartingXI()}))).toEqual({phase:"hub",complete:true});
  });

  test("mobile back respects locked critical modals",async({page},testInfo)=>{
    test.skip(!testInfo.project.name.includes("mobile"),"Mobile back policy coverage.");
    await page.goto(GAME_URL,{waitUntil:"domcontentloaded"});
    const locked=await page.evaluate(()=>{
      const w=globalThis as any;
      w.showModal('<button type="button">Locked</button>',{dismissOnEscape:false});
      const handled=w.CopaMobileExperience.handleBack();
      return{handled,visible:!document.getElementById("modal")?.classList.contains("hidden")};
    });
    expect(locked).toEqual({handled:true,visible:true});
  });

  test("installed game shell reopens offline",async({page},testInfo)=>{
    test.skip(testInfo.project.name!=="mobile-chromium","Offline PWA coverage runs once.");
    await page.goto(GAME_URL,{waitUntil:"domcontentloaded"});
    await page.evaluate(()=>navigator.serviceWorker.ready);
    if(!await page.evaluate(()=>!!navigator.serviceWorker.controller))await page.reload({waitUntil:"domcontentloaded"});
    await expect.poll(()=>page.evaluate(()=>!!navigator.serviceWorker.controller)).toBe(true);
    await expect.poll(()=>page.evaluate(async()=>!!(await caches.match(location.href,{ignoreSearch:true})))).toBe(true);
    await page.context().setOffline(true);
    await page.reload({waitUntil:"domcontentloaded"});
    await expect(page.locator("#intro")).toBeVisible();
    await page.context().setOffline(false);
  });
});
