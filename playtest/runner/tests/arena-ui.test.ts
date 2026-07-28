import {test,expect} from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const output=path.resolve(__dirname,"../../../outputs/ui-visuals/arena");
const profile={publicId:"AC-QA",clubName:"Uzun Yolculuk Spor Kulübü",rating:1284,division:"gumus",seasonKey:"2026-Q3",seasonPoints:184,wins:12,draws:4,losses:7,streak:3,tokenProgress:16,cosmetics:["arena_badge_rookie","arena_frame_floodlights"]};
const self={owner:"self",clubName:profile.clubName,rating:1284,ready:false,setup:null,draft:[],market:null,training:null,tactics:[],connected:true};
const opponent={clubName:"Kuzey Yıldızları FK",rating:1271,ready:false,connected:true,setup:null,draftCount:0,draft:[],market:null,training:null,tacticLocked:false};
const slots=["GK","LB","CB1","CB2","RB","CM1","CM2","AM","LW","RW","ST"];
const squad=(prefix:string,offset=0)=>slots.map((slot,index)=>({id:`${prefix}-${slot}`,slot,line:slot==="GK"?"GK":slot.startsWith("CB")||["LB","RB"].includes(slot)?"DEF":slot==="ST"?"ST":slot.startsWith("W")?"WING":"MID",name:`${prefix} ${slot}`,position:slot.replace(/\d/g,""),power:68+((index+offset)%17),effectivePower:68+((index+offset)%17),cost:1,chemistry:0}));
const base={protocol:1,rulesVersion:"arena-rules-v8",catalogVersion:"qa-catalog",mode:"ranked",matchId:"AR-VISUALQA00000001",deadline:Date.now()+30_000,selfIndex:0,draftStep:0,window:0,liveStage:"decision",matchMinute:0,windowResult:null,score:[0,0],events:[],result:null,self,opponent,offers:null,draftStatus:{count:0,total:11,budget:48,power:0,recommendedReserve:14},team:null,opponentTeam:null};

async function boot(page:any,packaged=false){
  await page.addInitScript((mockProfile:any)=>{
    localStorage.clear();
    localStorage.setItem("copa_arena_terms_v1","arena-terms-v1");
    localStorage.setItem("copa_arena_club_v1","Uzun Yolculuk Spor Kulübü");
    localStorage.setItem("copa_arena_token_v1","CAR-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA");
    localStorage.setItem("copa_ghost_client_id_v1","GCL-AAAAAAAAAAAA");
    const original=globalThis.fetch.bind(globalThis);
    globalThis.fetch=(input:any,init?:RequestInit)=>{
      const url=String(typeof input==="string"?input:input&&input.url||"");
      if(!url.includes("/v1/arena/"))return original(input,init);
      if(url.includes("/profile"))return Promise.resolve(new Response(JSON.stringify({profile:mockProfile}),{status:200,headers:{"content-type":"application/json"}}));
      if(url.includes("/history"))return Promise.resolve(new Response(JSON.stringify({matches:[]}),{status:200,headers:{"content-type":"application/json"}}));
      if(url.includes("/leaderboard"))return Promise.resolve(new Response(JSON.stringify({season:"2026-Q3",entries:[{...mockProfile,rank:1}]}),{status:200,headers:{"content-type":"application/json"}}));
      if(url.includes("/events"))return Promise.resolve(new Response(null,{status:204}));
      return Promise.resolve(new Response(JSON.stringify({error:"qa_no_live_socket"}),{status:503,headers:{"content-type":"application/json"}}));
    };
  },profile);
  await page.route("**/v1/arena/**",async(route:any)=>{
    const url=new URL(route.request().url());
    if(url.pathname.endsWith("/profile"))return route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({profile})});
    if(url.pathname.endsWith("/history"))return route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({matches:[]})});
    if(url.pathname.endsWith("/leaderboard"))return route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({season:"2026-Q3",entries:[{...profile,rank:1}]})});
    if(url.pathname.endsWith("/events"))return route.fulfill({status:204});
    return route.fulfill({status:503,contentType:"application/json",body:JSON.stringify({error:"qa_no_live_socket"})});
  });
  const nonce=`${Date.now()}-${Math.random().toString(36).slice(2)}`;
  await page.goto(packaged?`/dist-android/index.html?arena-visual-qa=1&v=${nonce}`:`/?arena-visual-qa=1&v=${nonce}`,{waitUntil:"domcontentloaded"});
  if(packaged)await page.evaluate(()=>{const shell=(globalThis as any).CopaMobileShell;if(shell)shell.showLanding(null);});
  if(packaged)await expect(page.locator("#startBtn")).toHaveCount(1);
  else await expect(page.locator("#startBtn")).toBeVisible();
  await expect(page.locator("#arenaBtn:visible, [data-mobile-arena]:visible").first()).toBeVisible();
}

async function capture(page:any,name:string){
  fs.mkdirSync(output,{recursive:true});
  await page.screenshot({path:path.join(output,name),fullPage:true});
}

async function setRoom(page:any,room:any){
  await page.evaluate((next:any)=>{
    const arena=(globalThis as any).CopaArena;
    arena.state.screen="room";arena.state.room=next;arena.refresh();
  },room);
  await expect(page.locator("#arena")).toBeVisible();
}

async function audit(page:any){
  return page.evaluate(()=>{
    const root=document.querySelector<HTMLElement>("#arena")!;
    const visible=[...root.querySelectorAll<HTMLElement>("button,b,span,p,h1,h2,strong,small,label")].filter(node=>!!node.offsetParent&&node.textContent?.trim());
    return{
      pageOverflow:document.documentElement.scrollWidth-innerWidth,
      shellOverflow:root.scrollWidth-root.clientWidth,
      clipped:visible.filter(node=>node.scrollWidth>node.clientWidth+2&&getComputedStyle(node).whiteSpace!=="normal").map(node=>node.textContent?.trim()).slice(0,10),
      smallest:Math.min(...visible.map(node=>parseFloat(getComputedStyle(node).fontSize)||99))
    };
  });
}

test("Copa Arena keeps the singleplayer entry intact and renders every premium web state",async({page},testInfo)=>{
  test.skip(testInfo.project.name!=="desktop-chromium","desktop Arena visual matrix");
  await boot(page);
  const entries=await page.evaluate(()=>{
    const start=document.querySelector<HTMLElement>("#startBtn")!.getBoundingClientRect();
    const arena=document.querySelector<HTMLElement>("#arenaBtn")!.getBoundingClientRect();
    return{startWidth:start.width,arenaWidth:arena.width,overflow:document.documentElement.scrollWidth-innerWidth};
  });
  expect(Math.abs(entries.startWidth-entries.arenaWidth)).toBeLessThanOrEqual(2);
  expect(entries.overflow).toBeLessThanOrEqual(1);
  await capture(page,"01-web-opening-with-arena.png");
  await page.locator("#arenaBtn").click();
  await expect(page.locator(".arena-portal")).toBeVisible();
  await capture(page,"02-web-arena-hub.png");
  await page.evaluate(()=>(globalThis as any).setLang("de"));
  await expect(page.locator(".arena-play")).toContainText("MATCH FINDEN");
  await page.evaluate(()=>(globalThis as any).setLang("en"));

  await setRoom(page,{...base,phase:"setup"});
  await expect(page.locator(".arena-choice-grid.chairmen")).toHaveCount(0);
  await expect(page.locator(".arena-fixed-chairman")).toContainText("BABACAN");
  await page.locator('[data-arena-choice="formations:4-4-2"]').click();
  await page.locator('[data-arena-choice="styles:balanced"]').click();
  await expect(page.locator('[data-arena-action="submit-setup"]')).toBeEnabled();
  await expect(page.locator(".arena-choice-grid .is-selected")).toHaveCount(2);
  await capture(page,"03-web-arena-setup.png");
  await page.evaluate(()=>{
    const arena=(globalThis as any).CopaArena;
    arena.state.connection="reconnecting";arena.state.reconnectAt=Date.now()+4200;arena.refresh();
  });
  await expect(page.locator(".arena-reconnect-banner")).toContainText("RECONNECTING");
  await expect(page.locator("[data-arena-reconnect-countdown]")).toContainText(/4s|5s/);
  await page.evaluate(()=>{const arena=(globalThis as any).CopaArena;arena.state.connection="connected";arena.state.latency=96;arena.refresh();});
  await expect(page.locator(".arena-live-mark")).toContainText("96ms");

  const offers=[
    {id:"gk-0-a",line:"GK",name:"Doğan Alemdar",power:67,effectivePower:67,cost:1,chemistry:2,trait:"connector",sourceLeague:"TR",sourceLeagueLabel:{tr:"Türkiye ligi",en:"Türkiye league"},club:"Stade Rennais FC",position:"GK",positionFit:"natural",age:23},
    {id:"gk-0-b",line:"GK",name:"Joan García",power:75,effectivePower:75,cost:3,chemistry:1,trait:"reliable",sourceLeague:"ES",sourceLeagueLabel:{tr:"İspanya ligi",en:"Spain league"},club:"FC Barcelona",position:"GK",positionFit:"natural",age:25},
    {id:"gk-0-c",line:"GK",name:"Oliver Baumann",power:83,effectivePower:83,cost:6,chemistry:-1,trait:"star",sourceLeague:"DE",sourceLeagueLabel:{tr:"Almanya ligi",en:"Germany league"},club:"TSG Hoffenheim",position:"GK",positionFit:"natural",age:36,affordable:false}
  ];
  await setRoom(page,{...base,phase:"draft",draftStep:0,offers,self:{...self,draft:[offers[1]]},draftStatus:{count:1,total:11,budget:45,power:75}});
  await expect(page.locator(".arena-offers .is-selected")).toContainText("SELECTED");
  await expect(page.locator(".arena-offers .is-selected .arena-player-origin")).toContainText("Spain league");
  await expect(page.locator(".arena-offers .is-selected .arena-player-origin")).not.toContainText(/data source|veri kaynağı/i);
  await expect(page.locator(".arena-offers .is-selected .arena-player-club")).toContainText("FC Barcelona");
  await expect(page.locator(".arena-offers .is-unaffordable")).toBeDisabled();
  await expect(page.locator(".arena-budget-warning")).toContainText("Budget reserved");
  await expect(page.locator(".arena-draft-progress")).toContainText("1 / 11");
  await expect(page.locator(".arena-team-pulse")).toContainText("SUGGESTED RESERVE");
  await expect(page.locator(".arena-lineup-player")).toHaveCount(1);
  await expect(page.locator(".arena-lineup-player strong")).toContainText("75");
  await capture(page,"04-web-arena-draft.png");

  const market=[
    {id:"twelfth",cost:4,attack:1,defense:0,chemistry:1},
    {id:"counter",cost:3,attack:2,defense:0,chemistry:0},
    {id:"wall",cost:4,attack:0,defense:2,chemistry:0},
    {id:"none",cost:0,attack:0,defense:0,chemistry:0}
  ];
  await setRoom(page,{...base,phase:"market",offers:market,team:{budget:8,power:76,chemistry:3}});
  await capture(page,"05-web-arena-market.png");

  await setRoom(page,{...base,phase:"training",self:{...self,setup:{formation:"4-3-3",style:"control",chairman:"babacan"},draft:squad("COPA"),training:"chemistry"},opponent:{...opponent,setup:{formation:"4-2-3-1",style:"counter",chairman:"babacan"},draft:squad("NORTH",3),draftCount:11},team:{budget:8,power:76,chemistry:3},opponentTeam:{budget:7,power:75,chemistry:2}});
  await expect(page.locator(".arena-choice-grid .is-selected")).toContainText("SELECTED");
  await expect(page.locator(".arena-lineup-wrap.is-versus .arena-lineup-player")).toHaveCount(22);
  await expect(page.locator(".arena-lineup-wrap.is-versus")).toContainText("PRE-MATCH");
  await capture(page,"06-web-arena-training.png");
  await page.locator(".arena-lineup-wrap.is-versus").screenshot({path:path.join(output,"06b-web-arena-head-to-head-pitch.png")});

  await setRoom(page,{...base,phase:"live",window:1,liveStage:"reveal",matchMinute:60,score:[1,1],events:[{minute:14,type:"goal",side:"home"},{minute:33,type:"card",side:"away"},{minute:49,type:"goal",side:"away"}],windowResult:{window:1,startMinute:30,endMinute:60,homeGoals:0,awayGoals:1,homeXg:.61,awayXg:.73,tactics:["press","control"],advantage:"home"},self:{...self,setup:{formation:"4-4-2",style:"balanced",chairman:"diplomat"},tactics:["balanced","press"]},opponent:{...opponent,setup:{formation:"4-3-3",style:"counter",chairman:"patron"},tactics:["counter","control"]},team:{power:76},opponentTeam:{power:75}});
  await expect(page.locator(".arena-window-report")).toContainText("WINDOW REPORT");
  await capture(page,"07-web-arena-live.png");

  await setRoom(page,{...base,phase:"result",score:[2,1],events:[{minute:14,type:"goal",side:"home"},{minute:33,type:"card",side:"away"},{minute:71,type:"goal",side:"home"}],self:{...self,tactics:["press","balanced","counter"]},opponent:{...opponent,tactics:["control","balanced","press"]},result:{score:[2,1],penalty:null,outcomes:["win","loss"],teams:[{power:77,chemistry:4},{power:75,chemistry:2}],rewards:[{ratingBefore:1284,ratingDelta:14,seasonPoints:30,tokenProgress:3},{ratingBefore:1271,ratingDelta:-14,seasonPoints:5,tokenProgress:1}],profiles:[{...profile,rating:1298,seasonPoints:214,wins:13},{...profile,rating:1257}]}});
  await expect(page.locator(".arena-result-rewards")).toContainText("1284 → 1298");
  await expect(page.locator(".arena-result-events")).toContainText("71'");
  await capture(page,"08-web-arena-result.png");
  await setRoom(page,{...base,phase:"result",score:[3,0],result:{score:[3,0],penalty:null,outcomes:["win","loss"],forfeitIndex:1,voided:false}});
  await expect(page.locator(".arena-result>span")).toContainText("FORFEIT VICTORY");
  await capture(page,"09-web-arena-forfeit-result.png");
  await setRoom(page,{...base,phase:"result",score:[0,0],result:{score:[0,0],penalty:null,outcomes:["draw","draw"],forfeitIndex:null,voided:true}});
  await expect(page.locator(".arena-result>span")).toContainText("VOID MATCH");
  await capture(page,"10-web-arena-void-result.png");
  const layout=await audit(page);
  expect(layout.pageOverflow).toBeLessThanOrEqual(1);
  expect(layout.shellOverflow).toBeLessThanOrEqual(1);
  expect(layout.clipped).toEqual([]);
  expect(layout.smallest).toBeGreaterThanOrEqual(7);
});

test("Copa Arena Android package remains compact at phone and tablet widths",async({page},testInfo)=>{
  test.skip(testInfo.project.name!=="mobile-chromium","Android package matrix");
  for(const viewport of [{width:360,height:800,name:"phone-small",scale:"130"},{width:430,height:932,name:"phone",scale:"115"},{width:768,height:1024,name:"tablet",scale:"100"}]){
    await page.setViewportSize({width:viewport.width,height:viewport.height});
    await boot(page,true);
    await page.evaluate((scale:string)=>(globalThis as any).CopaMobileExperience?.setTextScale(scale),viewport.scale);
    await expect(page.locator("html")).toHaveAttribute("data-copa-text-scale",viewport.scale);
    await capture(page,`android-${viewport.name}-opening.png`);
    await page.locator("#arenaBtn:visible, [data-mobile-arena]:visible").first().click();
    await expect(page.locator(".arena-portal")).toBeVisible();
    const portal=await audit(page);
    expect(portal.pageOverflow,viewport.name).toBeLessThanOrEqual(1);
    expect(portal.shellOverflow,viewport.name).toBeLessThanOrEqual(1);
    await capture(page,`android-${viewport.name}-hub.png`);
    const mobileOffers=[
      {id:"st-a",line:"ST",name:"Kenan Yıldız",power:68,effectivePower:68,cost:1,chemistry:2,trait:"connector",sourceLeague:"TR",sourceLeagueLabel:{tr:"Türkiye ligi",en:"Türkiye league"},club:"Juventus FC",position:"ST",positionFit:"natural",age:21},
      {id:"st-b",line:"ST",name:"Lorenzo Lucca",power:76,effectivePower:76,cost:3,chemistry:1,trait:"reliable",sourceLeague:"IT",sourceLeagueLabel:{tr:"İtalya ligi",en:"Italy league"},club:"SSC Napoli",position:"ST",positionFit:"natural",age:25},
      {id:"st-c",line:"ST",name:"Ollie Watkins",power:84,effectivePower:84,cost:6,chemistry:-1,trait:"star",sourceLeague:"ENG",sourceLeagueLabel:{tr:"İngiltere ligi",en:"England league"},club:"Aston Villa FC",position:"ST",positionFit:"natural",age:30}
    ];
    const mobileDraft=squad("MOBILE").slice(0,10).concat({...mobileOffers[1],slot:"ST"} as any);
    await setRoom(page,{...base,phase:"draft",draftStep:10,offers:mobileOffers,self:{...self,draft:mobileDraft},draftStatus:{count:11,total:11,budget:32,power:73}});
    await expect(page.locator(".arena-draft-progress")).toContainText("11 / 11");
    await expect(page.locator(".arena-offers .is-selected")).toBeVisible();
    await expect(page.locator(".arena-offers .is-selected .arena-player-origin")).toContainText("Italy league");
    await expect(page.locator(".arena-offers .is-selected .arena-player-origin")).not.toContainText(/data source|veri kaynağı/i);
    const draft=await audit(page);
    expect(draft.pageOverflow,viewport.name).toBeLessThanOrEqual(1);
    expect(draft.shellOverflow,viewport.name).toBeLessThanOrEqual(1);
    expect(draft.smallest,viewport.name).toBeGreaterThanOrEqual(7);
    await capture(page,`android-${viewport.name}-draft.png`);
    await setRoom(page,{...base,phase:"result",score:[3,0],result:{score:[3,0],penalty:null,outcomes:["win","loss"],forfeitIndex:1,voided:false}});
    const result=await audit(page);
    expect(result.pageOverflow,viewport.name).toBeLessThanOrEqual(1);
    expect(result.shellOverflow,viewport.name).toBeLessThanOrEqual(1);
    await capture(page,`android-${viewport.name}-forfeit-result.png`);
  }
});

test("Copa Arena blocks ranked queue cleanly while offline",async({page},testInfo)=>{
  test.skip(testInfo.project.name!=="desktop-chromium","single offline behavior check");
  await boot(page);
  await page.locator("#arenaBtn").click();
  await page.context().setOffline(true);
  await page.locator('[data-arena-action="queue"]').click();
  await expect(page.locator(".arena-error")).toContainText("offline");
  await page.context().setOffline(false);
});
