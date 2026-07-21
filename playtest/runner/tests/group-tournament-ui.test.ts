import {test,expect} from "@playwright/test";

const startDraw=async(page:any)=>{
  await page.addInitScript(()=>{localStorage.removeItem("copa_run_v6");localStorage.removeItem("copa_run_v5");sessionStorage.removeItem("copa_run");});
  await page.goto("/?autotest=1&groups=1",{waitUntil:"domcontentloaded"});
  await page.evaluate(async()=>{const w=globalThis as any;await w.quickStart();if(w._countryDraftPromise)await w._countryDraftPromise;await w.quickAll();});
  await expect(page.locator("#postClubName")).toBeVisible();
  await page.locator("#postClubName").fill("Group Test FK");
  await page.evaluate(()=>(globalThis as any).pcGo());
  await expect(page.locator("#tournamentDraw")).toBeVisible();
};

const finishDraw=async(page:any)=>{
  await page.evaluate(()=>{const w=globalThis as any;w.fastTournamentDraw();w.finishTournamentDraw();});
  await expect(page.locator("#hub")).toBeVisible();
};

test("manual draw is resumable and quick draw preserves the predetermined groups",async({page})=>{
  await startDraw(page);
  const original=await page.evaluate(()=>JSON.stringify((globalThis as any).tournament.draw.entries));
  await page.evaluate(()=>{const w=globalThis as any;w.revealTournamentBall();w.revealTournamentBall();w.revealTournamentBall();});
  await expect(page.locator(".td-progress")).toHaveAttribute("aria-valuenow","3");
  await page.reload({waitUntil:"domcontentloaded"});
  await expect(page.locator("#tournamentDraw")).toBeVisible();
  await expect(page.locator(".td-progress")).toHaveAttribute("aria-valuenow","3");
  expect(await page.evaluate(()=>JSON.stringify((globalThis as any).tournament.draw.entries))).toBe(original);
  await finishDraw(page);
  await expect(page.locator("#tournamentHubPanel .tg-table tbody tr")).toHaveCount(4);
  await expect(page.locator("#tournamentHubPanel")).toContainText(/Group Test FK/i);
});

test("group draw and loss award points correctly and continue the run",async({page})=>{
  await startDraw(page);await finishDraw(page);
  await page.evaluate(()=>{const w=globalThis as any;w.setCaptain(0);w.closeModal();(0,eval)("budget=10;chairTrust=1");});
  const playResult=async(gf:number,ga:number)=>{
    await page.evaluate(({gf,ga})=>{
      const w=globalThis as any;
      w.CopaRunState.transition("match",{reason:"group_test"});
      (0,eval)(`lastMatchPerf={power:72,oppPower:70,gf:${gf},ga:${ga},win:${gf>ga},draw:${gf===ga},note:"Test",why:"Test"};lastMatchEvents=[];pendingMatchResolution={round,advance:${gf>ga},draw:${gf===ga},gf:${gf},ga:${ga},stage:"group"};fixtures[round-1]={...fixtures[round-1],res:"${gf>ga?"W":gf===ga?"D":"L"}",gf:${gf},ga:${ga},events:[]};`);
      w.afterMatch(gf>ga);
    },{gf,ga});
  };
  await playResult(1,1);
  await expect(page.locator("#hub")).toBeVisible();
  let state=await page.evaluate(()=>{const w=globalThis as any,row=w.CopaTournamentEngine.getPlayerGroup(w.tournament).table.find((item:any)=>item.teamId==="player");return{round:w.round,matchday:w.tournament.group.matchday,points:row.points,phase:w.CopaRunState.phase};});
  expect(state).toMatchObject({round:2,matchday:2,points:1,phase:"hub"});
  await playResult(0,2);
  await expect(page.locator("#hub")).toBeVisible();
  state=await page.evaluate(()=>{const w=globalThis as any,row=w.CopaTournamentEngine.getPlayerGroup(w.tournament).table.find((item:any)=>item.teamId==="player");return{round:w.round,matchday:w.tournament.group.matchday,points:row.points,phase:w.CopaRunState.phase};});
  expect(state).toMatchObject({round:3,matchday:3,points:1,phase:"hub"});
  await playResult(0,2);
  await expect(page.locator("#result")).toBeVisible();
  expect(await page.evaluate(()=>{const w=globalThis as any;return{endType:w.lastResult.endType,rank:w.lastResult.tournament.group.rank,qualified:w.lastResult.tournament.group.qualified};})).toMatchObject({endType:"group_eliminated",qualified:false});
  await page.evaluate(()=>(globalThis as any).showSeasonStats());
  await expect(page.locator("#modal .ss-group-recap")).toBeVisible();
  await expect(page.locator("#modal .ss-group-recap tbody tr")).toHaveCount(4);
});

test("the tournament overview is responsive and exposes all groups semantically",async({page})=>{
  await startDraw(page);await finishDraw(page);
  await page.locator("#tournamentHubPanel button").click();
  await expect(page.locator(".tg-overview")).toBeVisible();
  await expect(page.locator(".tg-all-groups table")).toHaveCount(4);
  await expect(page.locator(".tg-all-groups tbody tr")).toHaveCount(16);
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});

test("three group wins build a valid quarter-final path and the run can reach the trophy",async({page})=>{
  await startDraw(page);await finishDraw(page);
  await page.evaluate(()=>{const w=globalThis as any;w.setCaptain(0);w.closeModal();(0,eval)("budget=30;chairTrust=2");});
  const forceWinWithReward=async()=>{
    await page.evaluate(()=>{
      const w=globalThis as any,stage=w.CopaTournamentRuntime.stage();
      w.CopaRunState.transition("match",{reason:"forced_tournament_win"});
      (0,eval)(`lastMatchPerf={power:78,oppPower:72,gf:2,ga:0,win:true,draw:false,note:"Test win",why:"Test"};lastMatchEvents=[];pendingMatchResolution={round,advance:true,draw:false,gf:2,ga:0,stage:"${stage}"};fixtures[round-1]={...fixtures[round-1],res:"W",gf:2,ga:0,events:[]};`);
      w.afterMatch(true);
    });
    await expect(page.locator("#modal .reward-modal")).toBeVisible();
    await page.evaluate(()=>{const w=globalThis as any;w.finishRoundReward("cash");w.closeModal();});
    await expect(page.locator("#hub")).toBeVisible();
  };
  await forceWinWithReward();await forceWinWithReward();await forceWinWithReward();
  let state=await page.evaluate(()=>{const w=globalThis as any;return{round:w.round,phase:w.tournament.phase,stage:w.tournament.knockout.round,rank:w.tournament.group.rank,qualified:w.tournament.group.qualified,opponent:w.opponent&&w.opponent.name};});
  expect(state).toMatchObject({round:4,phase:"knockout",stage:"quarterfinal",rank:1,qualified:true});
  expect(state.opponent).toBeTruthy();
  const ghostSwap=await page.evaluate(()=>{const w=globalThis as any,ok=w.CopaTournamentRuntime.replaceCurrentOpponent({name:"Community Ghost",power:81,ghost:true,ghostId:"G-TOURNAMENTTEST",ghostMeta:{formation:"4-2-3-1"},ghostProfile:{lineup:[]}});return{ok,name:w.opponent.name,ghost:w.opponent.ghost,formation:w.opponent.formation,valid:w.CopaTournamentEngine.validate(w.tournament).ok};});
  expect(ghostSwap).toEqual({ok:true,name:"Community Ghost",ghost:true,formation:"4-2-3-1",valid:true});
  await forceWinWithReward();await forceWinWithReward();
  state=await page.evaluate(()=>{const w=globalThis as any;return{round:w.round,phase:w.tournament.phase,stage:w.tournament.knockout.round,current:w.CopaTournamentRuntime.currentMatch()?.id};});
  expect(state).toEqual({round:6,phase:"knockout",stage:"final",current:"F1"});
  await page.evaluate(()=>{const w=globalThis as any;w.endRun(true,"2–0","champion");});
  await expect(page.locator("#result")).toBeVisible();
  expect(await page.evaluate(()=>{const w=globalThis as any;return{champion:w.lastResult.tournament.player.champion,phase:w.lastResult.tournament.phase,schedule:w.CopaTournamentEngine.playerSchedule(w.lastResult.tournament).length};})).toEqual({champion:true,phase:"complete",schedule:6});
});
