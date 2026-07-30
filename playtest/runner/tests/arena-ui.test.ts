import {test,expect} from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const output=path.resolve(__dirname,"../../../outputs/ui-visuals/arena");
const profile={publicId:"AC-QA",clubName:"Uzun Yolculuk Spor Kulübü",rating:1284,division:"gumus",seasonKey:"2026-Q3",seasonPoints:184,wins:12,draws:4,losses:7,streak:3,tokenProgress:16,cosmetics:["arena_badge_rookie","arena_frame_floodlights"]};
const self={owner:"self",clubName:profile.clubName,rating:1284,ready:false,setup:null,draft:[],market:null,training:null,tactics:[],connected:true};
const opponent={clubName:"Kuzey Yıldızları FK",rating:1271,ready:false,connected:true,setup:null,draftCount:0,draft:[],market:null,training:null,tacticLocked:false};
const slots=["GK","LB","CB1","CB2","RB","CM1","CM2","AM","LW","RW","ST"];
const squad=(prefix:string,offset=0)=>slots.map((slot,index)=>({id:`${prefix}-${slot}`,slot,line:slot==="GK"?"GK":slot.startsWith("CB")||["LB","RB"].includes(slot)?"DEF":slot==="ST"?"ST":slot.startsWith("W")?"WING":"MID",name:`${prefix} ${slot}`,position:slot.replace(/\d/g,""),power:68+((index+offset)%17),effectivePower:68+((index+offset)%17),cost:1,chemistry:0}));
const liveSegments=[{startMinute:0,endMinute:20,prompt:"opening"},{startMinute:20,endMinute:45,prompt:"control"},{startMinute:45,endMinute:70,prompt:"response"},{startMinute:70,endMinute:90,prompt:"finish"}];
const base={protocol:1,rulesVersion:"arena-rules-v10",catalogVersion:"qa-catalog",mode:"ranked",matchId:"AR-VISUALQA00000001",deadline:Date.now()+30_000,selfIndex:0,draftStep:0,window:0,liveStage:"decision",matchMinute:0,windowResult:null,liveSegments,penalty:null,score:[0,0],events:[],result:null,emotes:{self:null,opponent:null},self,opponent,offers:null,draftStatus:{count:0,total:11,budget:48,power:0,recommendedReserve:14},team:null,opponentTeam:null};

async function boot(page:any,packaged=false){
  await page.addInitScript((mockProfile:any)=>{
    localStorage.clear();
    localStorage.setItem("copa_arena_terms_v1","arena-terms-v1");
    localStorage.setItem("copa_arena_club_v1","Uzun Yolculuk Spor Kulübü");
    localStorage.setItem("copa_arena_token_v1","CAR-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA");
    localStorage.setItem("copa_arena_google_user_v1",JSON.stringify({name:"Arena QA",email:"qa@copa.life"}));
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
  await expect(page.locator('[data-mode-choice="arena"]:visible').first()).toBeVisible();
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
      smallest:Math.min(...visible.map(node=>parseFloat(getComputedStyle(node).fontSize)||99)),
      undersized:visible.filter(node=>(parseFloat(getComputedStyle(node).fontSize)||99)<7).map(node=>`${node.className||node.tagName}: ${node.textContent?.trim()}`).slice(0,10)
    };
  });
}

test("Copa Arena keeps the singleplayer entry intact and renders every premium web state",async({page},testInfo)=>{
  test.skip(testInfo.project.name!=="desktop-chromium","desktop Arena visual matrix");
  await boot(page);
  const entries=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth-innerWidth}));
  expect(entries.overflow).toBeLessThanOrEqual(1);
  expect(await page.evaluate(()=>({music:localStorage.getItem("copa_music"),sfx:localStorage.getItem("copa_sfx")}))).toEqual({music:"0",sfx:"1"});
  const gateLabels={tr:"ÇOK OYUNCULU",en:"MULTIPLAYER",es:"MULTIJUGADOR",de:"MEHRSPIELER",it:"MULTIGIOCATORE"};
  for(const [language,label] of Object.entries(gateLabels)){
    await page.evaluate((next)=>(globalThis as any).setLang(next),language);
    await expect(page.locator('[data-mode-copy="multiplayer"]')).toHaveText(label);
  }
  await page.evaluate(()=>(globalThis as any).setLang("en"));
  await page.locator(".mode-settings-button").click();
  await expect(page.locator("#settingsDrop")).toBeVisible();
  await page.keyboard.press("Escape");
  await capture(page,"01-web-opening-with-arena.png");
  await page.locator('[data-mode-choice="arena"]').click();
  await expect(page.locator(".arena-portal")).toBeVisible();
  await page.locator(".arena-settings-button").click();
  await expect(page.locator("#settingsDrop")).toBeVisible();
  await page.keyboard.press("Escape");
  await page.evaluate(()=>(globalThis as any).toggleMute());
  expect(await page.evaluate(()=>localStorage.getItem("copa_sfx"))).toBe("0");
  await page.evaluate(()=>(globalThis as any).toggleMute());
  await capture(page,"02-web-arena-hub.png");
  await page.evaluate(()=>(globalThis as any).setLang("de"));
  await expect(page.locator(".arena-play")).toContainText("MATCH FINDEN");
  await expect(page.locator(".arena-topbar>div:first-of-type>span")).toHaveText("MEHRSPIELER");
  await page.evaluate(()=>(globalThis as any).setLang("tr"));
  await expect(page.locator(".arena-topbar>div:first-of-type>span")).toHaveText("ÇOK OYUNCULU");
  await page.evaluate(()=>(globalThis as any).setLang("en"));
  await expect(page.locator(".arena-topbar>div:first-of-type>span")).toHaveText("MULTIPLAYER");

  await setRoom(page,{...base,phase:"setup",emotes:{self:null,opponent:{id:"fire",sequence:7,at:Date.now()}}});
  await expect(page.locator(".arena-emote-trigger")).toBeVisible();
  await expect(page.locator(".arena-emote-reaction.is-opponent")).toContainText("Let's go!");
  const emotePlacement=await page.evaluate(()=>{
    const name=document.querySelector(".arena-versus .is-self .arena-club-line>b")!.getBoundingClientRect();
    const trigger=document.querySelector(".arena-emote-trigger")!.getBoundingClientRect();
    return{afterName:trigger.left>=name.right-1};
  });
  expect(emotePlacement.afterName).toBe(true);
  await page.locator(".arena-emote-trigger").click();
  await expect(page.locator(".arena-emote-picker button")).toHaveCount(7);
  await expect(page.locator('[data-arena-emote="hello"]')).toContainText("Hello");
  await expect(page.locator('[data-arena-emote="applause"]')).toContainText("Nice play");
  await expect(page.locator('[data-arena-emote="respect"]')).toContainText("Good game");
  await expect(page.locator('[data-arena-emote="easy"]')).toContainText("Too easy");
  await expect(page.locator('[data-arena-emote="comeOn"]')).toContainText("Come on");
  await expect(page.locator('[data-arena-emote="yawn"]')).toContainText("Yawn");
  await page.waitForTimeout(250);
  await capture(page,"03a-web-arena-emotes.png");
  await page.evaluate(()=>{
    (globalThis as any).__arenaEmoteMessages=[];
    (globalThis as any).CopaArena.state.socket={readyState:1,send:(message:string)=>(globalThis as any).__arenaEmoteMessages.push(JSON.parse(message)),close:()=>{}};
  });
  await page.locator('[data-arena-emote="applause"]').click();
  const sentEmote=await page.evaluate(()=>(globalThis as any).__arenaEmoteMessages.at(-1));
  expect(sentEmote).toMatchObject({type:"emote",emote:"applause"});
  await page.evaluate(()=>{const arena=(globalThis as any).CopaArena;arena.state.socket=null;arena.state.emoteReadyAt=0;arena.refresh();});
  await expect(page.locator(".arena-forfeit-trigger")).toBeVisible();
  await page.locator(".arena-forfeit-trigger").click();
  await expect(page.locator(".arena-forfeit-dialog")).toBeVisible();
  await expect(page.locator('[data-arena-action="confirm-forfeit"]')).toBeDisabled();
  await page.locator("[data-arena-forfeit-check]").check();
  await expect(page.locator('[data-arena-action="confirm-forfeit"]')).toBeEnabled();
  await capture(page,"03b-web-arena-forfeit-confirm.png");
  await page.locator('[data-arena-action="cancel-forfeit"]').click();
  await page.evaluate(()=>{const arena=(globalThis as any).CopaArena;arena.state.room={...arena.state.room,self:{...arena.state.room.self,missedDecisions:2}};arena.refresh();});
  await expect(page.locator(".arena-inactivity-warning")).toContainText("FINAL WARNING");
  await expect(page.locator(".arena-choice-grid.chairmen")).toHaveCount(0);
  await expect(page.locator(".arena-fixed-chairman")).toContainText("BABACAN");
  await page.locator('[data-arena-choice="formations:4-4-2"]').click();
  await page.locator('[data-arena-choice="styles:balanced"]').click();
  await expect(page.locator('[data-arena-action="submit-setup"]')).toBeEnabled();
  await expect(page.locator(".arena-choice-grid .is-selected")).toHaveCount(2);
  await page.evaluate(()=>{
    const arena=(globalThis as any).CopaArena;
    arena.state.room={...arena.state.room,self:{...arena.state.room.self,setup:null}};
    arena.refresh();
  });
  await expect(page.locator(".arena-choice-grid .is-selected")).toHaveCount(2);
  await expect(page.locator('[data-arena-choice="formations:4-4-2"]')).toHaveAttribute("aria-pressed","true");
  await expect(page.locator('[data-arena-choice="styles:balanced"]')).toHaveAttribute("aria-pressed","true");
  await expect(page.locator('[data-arena-action="submit-setup"]')).toBeEnabled();
  await capture(page,"03-web-arena-setup.png");
  await page.evaluate(()=>{
    const arena=(globalThis as any).CopaArena;
    arena.state.connection="reconnecting";arena.state.reconnectAt=Date.now()+4200;arena.refresh();
  });
  await expect(page.locator(".arena-reconnect-banner")).toContainText("RECONNECTING");
  await expect(page.locator("[data-arena-reconnect-countdown]")).toContainText(/4s|5s/);
  await expect(page.locator(".arena-choice-grid .is-selected")).toHaveCount(2);
  await page.evaluate(()=>{const arena=(globalThis as any).CopaArena;arena.state.connection="connected";arena.state.latency=96;arena.refresh();});
  await expect(page.locator(".arena-live-mark")).toContainText("96ms");
  await expect(page.locator(".arena-choice-grid .is-selected")).toHaveCount(2);

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
  await expect(page.locator(".arena-offers .arena-player-price")).toHaveCount(3);
  await expect(page.locator('[data-arena-choice="draft:gk-0-a"] .arena-player-price')).toHaveClass(/is-value/);
  await expect(page.locator('[data-arena-choice="draft:gk-0-b"] .arena-player-price')).toHaveClass(/is-standard/);
  await expect(page.locator('[data-arena-choice="draft:gk-0-c"] .arena-player-price')).toHaveClass(/is-unavailable/);
  await expect(page.locator('[data-arena-choice="draft:gk-0-a"] .arena-player-chem')).toContainText("CHEMISTRY+2");
  await expect(page.locator('[data-arena-choice="draft:gk-0-c"] .arena-player-chem')).toHaveClass(/is-negative/);
  await expect(page.locator(".arena-offers")).not.toContainText(/Connector|Reliable|Star|Chemistry focused|Balanced contribution|Power focused/i);
  await expect(page.locator(".arena-budget-warning")).toContainText("Budget reserved");
  await expect(page.locator(".arena-draft-progress")).toContainText("1 / 11");
  await expect(page.locator(".arena-team-pulse")).toContainText("SUGGESTED RESERVE");
  await expect(page.locator(".arena-team-pulse .arena-context-budget")).toHaveClass(/budget-elite/);
  await expect(page.locator(".arena-team-pulse .arena-context-power")).toHaveClass(/power-average/);
  await expect(page.locator('[data-arena-choice="draft:gk-0-a"] .arena-context-power')).toHaveClass(/power-weak/);
  await expect(page.locator('[data-arena-choice="draft:gk-0-b"] .arena-context-power')).toHaveClass(/power-average/);
  await expect(page.locator('[data-arena-choice="draft:gk-0-c"] .arena-context-power')).toHaveClass(/power-good/);
  await expect(page.locator(".arena-lineup-player")).toHaveCount(1);
  await expect(page.locator(".arena-lineup-player strong")).toContainText("75");
  await capture(page,"04-web-arena-draft.png");
  const boundaryOffers=(powers:number[])=>offers.map((item,index)=>({...item,power:powers[index],effectivePower:powers[index]}));
  await setRoom(page,{...base,phase:"draft",draftStep:0,offers:boundaryOffers([60,61,71]),draftStatus:{count:0,total:11,budget:13,power:71}});
  await expect(page.locator('[data-arena-choice="draft:gk-0-a"] .arena-context-power')).toHaveClass(/power-worst/);
  await expect(page.locator('[data-arena-choice="draft:gk-0-b"] .arena-context-power')).toHaveClass(/power-weak/);
  await expect(page.locator('[data-arena-choice="draft:gk-0-c"] .arena-context-power')).toHaveClass(/power-average/);
  await expect(page.locator(".arena-team-pulse .arena-context-budget")).toHaveClass(/budget-average/);
  await setRoom(page,{...base,phase:"draft",draftStep:0,offers:boundaryOffers([81,91,71]),draftStatus:{count:0,total:11,budget:5,power:91}});
  await expect(page.locator('[data-arena-choice="draft:gk-0-a"] .arena-context-power')).toHaveClass(/power-good/);
  await expect(page.locator('[data-arena-choice="draft:gk-0-b"] .arena-context-power')).toHaveClass(/power-elite/);
  await expect(page.locator(".arena-team-pulse .arena-context-power")).toHaveClass(/power-elite/);
  await expect(page.locator(".arena-team-pulse .arena-context-budget")).toHaveClass(/budget-worst/);

  const market=[
    {id:"twelfth",category:"momentum",activation:"second_half",cost:4,attack:0,defense:0,chemistry:1,projected:{power:77,chemistry:4,budget:4}},
    {id:"counter",category:"doctrine",activation:"trailing",cost:3,attack:1,defense:0,chemistry:0,projected:{power:76,chemistry:3,budget:5}},
    {id:"wall",category:"defense",activation:"leading",cost:4,attack:0,defense:1,chemistry:0,projected:{power:77,chemistry:3,budget:4}},
    {id:"none",category:"reserve",activation:"none",cost:0,attack:0,defense:0,chemistry:0,projected:{power:76,chemistry:3,budget:8}}
  ];
  await setRoom(page,{...base,phase:"market",offers:market,team:{budget:8,power:76,chemistry:3}});
  await expect(page.locator(".arena-team-pulse .arena-context-budget")).toHaveClass(/budget-weak/);
  await expect(page.locator(".arena-team-pulse .arena-context-budget")).toHaveCSS("animation-name","arenaBudgetPulse");
  await expect(page.locator(".arena-team-pulse .arena-context-power")).toHaveClass(/power-average/);
  await expect(page.locator(".arena-card")).toHaveCount(4);
  await expect(page.locator(".arena-card-trigger").first()).toContainText("Second wave");
  await expect(page.locator(".arena-card-preview").first()).toContainText("77");
  const noCard=page.locator('[data-arena-choice="market:none"]');
  await expect(noCard).toContainText("Keeps the budget");
  await expect(noCard.locator(".arena-card-stats,.arena-card-preview,.arena-card-fit")).toHaveCount(0);
  await expect(noCard).not.toContainText(/ATK|DEF|POWER|CHEMISTRY|BALANCED FIT/i);
  await capture(page,"05-web-arena-market.png");

  await setRoom(page,{...base,phase:"training",self:{...self,setup:{formation:"4-3-3",style:"control",chairman:"babacan"},draft:squad("COPA"),training:null},opponent:{...opponent,setup:{formation:"4-2-3-1",style:"counter",chairman:"babacan"},draft:squad("NORTH",3),draftCount:11},team:{budget:8,power:76,chemistry:3},opponentTeam:{budget:7,power:75,chemistry:2}});
  await expect(page.locator(".arena-plan-visual")).toHaveCount(7);
  for(const visual of ["finishing","shape","chemistry","recovery","adaptive","protect","brave"]){
    await expect(page.locator(`.arena-plan-visual.is-${visual}`)).toBeVisible();
  }
  await expect(page.locator(".arena-plan-visual.is-finishing .plan-ball")).toHaveCSS("animation-name","arenaPlanStrike");
  await expect(page.locator(".arena-plan-visual.is-recovery .plan-orbit")).toHaveCSS("animation-name","arenaPlanOrbit");
  await expect(page.locator(".arena-plan-visual.is-brave .plan-rush").first()).toHaveCSS("animation-name","arenaPlanRush");
  await page.locator('[data-arena-plan="focus:chemistry"]').click();
  await page.locator('[data-arena-plan="scenario:adaptive"]').click();
  await expect(page.locator(".arena-plan-grid .is-selected")).toHaveCount(2);
  await expect(page.locator('[data-arena-action="submit-plan"]')).toBeEnabled();
  await expect(page.locator(".arena-lineup-wrap.is-versus .arena-lineup-player")).toHaveCount(22);
  await expect(page.locator(".arena-lineup-wrap.is-versus")).toContainText("PRE-MATCH");
  await expect(page.locator(".arena-final-summary .arena-context-power")).toHaveClass(/power-average/);
  await expect(page.locator(".arena-final-summary .arena-context-budget")).toHaveClass(/budget-weak/);
  await capture(page,"06-web-arena-training.png");
  await page.locator(".arena-lineup-wrap.is-versus").screenshot({path:path.join(output,"06b-web-arena-head-to-head-pitch.png")});

  await setRoom(page,{...base,phase:"live",window:0,liveStage:"decision",matchMinute:0,deadline:Date.now()+24000,score:[0,0],events:[],self:{...self,tactics:[]},opponent:{...opponent,tactics:[],tacticLocked:false},team:{power:76},opponentTeam:{power:75}});
  await expect(page.locator(".arena-choice-grid.tactics button")).toHaveCount(4);
  await expect(page.locator('[data-arena-choice="tactics:press"]')).toContainText("High Press");
  await expect(page.locator('[data-arena-choice="tactics:press"]')).toContainText("Strong against Possession Play");
  await expect(page.locator('[data-arena-choice="tactics:balanced"]')).toContainText("Balanced Block");
  await expect(page.locator('[data-arena-choice="tactics:counter"]')).toContainText("Fast Transition");
  await expect(page.locator('[data-arena-choice="tactics:control"]')).toContainText("Possession Play");
  await capture(page,"07-web-arena-tactics.png");

  await setRoom(page,{...base,phase:"live",window:1,liveStage:"reveal",matchMinute:45,deadline:Date.now()+6500,score:[1,1],events:[{minute:14,type:"goal",side:"home"},{minute:24,type:"goal",side:"away"},{minute:33,type:"shot",side:"away"},{minute:41,type:"save",side:"home"}],windowResult:{window:1,startMinute:20,endMinute:45,homeGoals:0,awayGoals:1,homeXg:.61,awayXg:.73,tactics:["press","control"],advantage:"home"},self:{...self,setup:{formation:"4-4-2",style:"balanced",chairman:"diplomat"},tactics:["balanced","press"]},opponent:{...opponent,setup:{formation:"4-3-3",style:"counter",chairman:"patron"},tactics:["counter","control"]},team:{power:76},opponentTeam:{power:75}});
  await expect(page.locator(".arena-window-report")).toContainText("WINDOW REPORT");
  await expect(page.locator(".arena-tactic-window")).toContainText("2 / 4");
  await expect(page.locator(".arena-pitch-live")).toHaveClass(/is-playing/);
  await expect(page.locator("[data-arena-live-score]")).toContainText("1–0");
  expect(await page.evaluate(()=>(globalThis as any).CopaArena.state.liveEventCues.size)).toBe(0);
  await expect(page.locator("[data-arena-live-score]")).toContainText("1–1",{timeout:2500});
  expect(await page.evaluate(()=>(globalThis as any).CopaArena.state.liveEventCues.size)).toBe(1);
  await capture(page,"07-web-arena-live.png");

  const shootout={stage:"choice",kick:4,round:3,turn:0,firstShooter:0,score:[2,1],kicks:[2,2],history:[
    {kick:0,round:1,shooter:0,goal:true,outcome:"goal",shooterZone:"leftHigh",keeperZone:"rightLow"},
    {kick:1,round:1,shooter:1,goal:true,outcome:"goal",shooterZone:"center",keeperZone:"leftLow"},
    {kick:2,round:2,shooter:0,goal:true,outcome:"goal",shooterZone:"rightLow",keeperZone:"leftHigh"},
    {kick:3,round:2,shooter:1,goal:false,outcome:"save",shooterZone:"leftLow",keeperZone:"leftLow"}
  ],selfRole:"shooter",selfLocked:false,opponentLocked:true};
  await setRoom(page,{...base,phase:"penalty",score:[1,1],penalty:shootout,self:{...self,setup:{formation:"4-4-2",style:"balanced",chairman:"babacan"},draft:squad("COPA")},opponent:{...opponent,setup:{formation:"4-3-3",style:"counter",chairman:"babacan"},draft:squad("NORTH",2)}});
  await expect(page.locator(".arena-penalty-zones button")).toHaveCount(5);
  await expect(page.locator(".arena-penalty")).toContainText("PENALTY SHOOTOUT");
  await expect(page.locator(".arena-penalty>footer")).not.toContainText("BOTH CHOICES SEALED");
  await expect(page.locator(".arena-penalty>footer span")).toHaveCount(2);
  expect(await page.evaluate(()=>(globalThis as any).CopaArena.state.audioClockActive)).toBe(true);
  await capture(page,"08-web-arena-penalty.png");
  await setRoom(page,{...base,phase:"penalty",score:[1,1],penalty:{...shootout,stage:"reveal",score:[3,1],kicks:[3,2],selfLocked:true,opponentLocked:true,history:[...shootout.history,{kick:4,round:3,shooter:0,goal:true,outcome:"goal",shooterZone:"rightLow",keeperZone:"leftHigh"}]}});
  await expect(page.locator(".arena-penalty")).toHaveClass(/is-reveal/);
  await expect(page.locator(".arena-penalty-call")).toContainText("GOAL");
  const goalAudio=await page.evaluate(()=>{
    const state=(globalThis as any).CopaArena.state;
    return{cue:state.lastAudioCue,count:state.audioCueCount,clock:state.audioClockActive};
  });
  expect(goalAudio).toMatchObject({cue:"penalty:goal",clock:false});
  await page.evaluate(()=>(globalThis as any).CopaArena.refresh());
  expect(await page.evaluate(()=>(globalThis as any).CopaArena.state.audioCueCount)).toBe(goalAudio.count);
  await expect(page.locator(".arena-goal")).toHaveAttribute("style",/--ball-x:82%;--ball-y:10%;--keeper-x:20%;--keeper-y:44%;--keeper-rotate:-68deg/);
  await expect(page.locator(".arena-ball")).toHaveCSS("animation-name","arenaPenaltyKick");
  await expect(page.locator(".arena-keeper")).toHaveCSS("animation-name","arenaKeeperDive");
  await page.waitForTimeout(1400);
  const penaltyMotion=await page.evaluate(()=>{
    const goal=document.querySelector(".arena-goal")!.getBoundingClientRect();
    const ball=document.querySelector(".arena-ball")!.getBoundingClientRect();
    const keeper=document.querySelector(".arena-keeper")!.getBoundingClientRect();
    return {
      ballX:(ball.left+ball.width/2-goal.left)/goal.width,
      ballY:(ball.top+ball.height/2-goal.top)/goal.height,
      keeperX:(keeper.left+keeper.width/2-goal.left)/goal.width,
      keeperY:(keeper.top+keeper.height/2-goal.top)/goal.height
    };
  });
  expect(penaltyMotion.ballX).toBeGreaterThan(.7);
  expect(penaltyMotion.ballY).toBeGreaterThan(.68);
  expect(penaltyMotion.keeperX).toBeLessThan(.35);
  expect(penaltyMotion.keeperY).toBeLessThan(.61);
  await capture(page,"09-web-arena-penalty-reveal.png");
  for(const [index,outcome] of ["save","post","miss"].entries()){
    const kick=5+index;
    await setRoom(page,{...base,phase:"penalty",score:[1,1],penalty:{...shootout,stage:"reveal",kick,history:[...shootout.history,{kick,round:3+index,shooter:index%2,goal:false,outcome,shooterZone:"leftHigh",keeperZone:"leftLow"}],selfLocked:true,opponentLocked:true}});
    expect(await page.evaluate(()=>(globalThis as any).CopaArena.state.lastAudioCue)).toBe(`penalty:${outcome}`);
  }
  await setRoom(page,{...base,phase:"penalty",score:[1,1],penalty:{...shootout,kick:8,selfLocked:false}});
  await page.evaluate(()=>{(globalThis as any).muted=true;(globalThis as any).CopaArena.refresh();});
  expect(await page.evaluate(()=>(globalThis as any).CopaArena.state.audioClockActive)).toBe(false);
  await page.evaluate(()=>{(globalThis as any).muted=false;});

  await setRoom(page,{...base,phase:"result",score:[2,2],events:[{minute:14,type:"goal",side:"home"},{minute:33,type:"card",side:"away"},{minute:71,type:"goal",side:"home"}],rematch:{available:true,requested:false,opponentRequested:true,launched:false},self:{...self,tactics:["press","balanced","counter"]},opponent:{...opponent,tactics:["control","balanced","press"]},result:{score:[2,2],penalty:[5,4],outcomes:["win","loss"],teams:[{power:77,chemistry:4},{power:75,chemistry:2}],rewards:[{ratingBefore:1284,ratingDelta:14,seasonPoints:30,tokenProgress:3},{ratingBefore:1271,ratingDelta:-14,seasonPoints:5,tokenProgress:1}],profiles:[{...profile,rating:1298,seasonPoints:214,wins:13},{...profile,rating:1257}]}});
  await expect(page.locator(".arena-result-rewards")).toContainText("1284 → 1298");
  await expect(page.locator(".arena-result-events")).toContainText("71'");
  await expect(page.locator(".arena-rematch")).toContainText("OPPONENT WANTS A REMATCH");
  await capture(page,"10-web-arena-result.png");
  await setRoom(page,{...base,phase:"result",score:[3,0],result:{score:[3,0],penalty:null,outcomes:["win","loss"],forfeitIndex:1,voided:false}});
  await expect(page.locator(".arena-result>span")).toContainText("FORFEIT VICTORY");
  await capture(page,"11-web-arena-forfeit-result.png");
  await setRoom(page,{...base,phase:"result",score:[0,0],result:{score:[0,0],penalty:null,outcomes:["draw","draw"],forfeitIndex:null,voided:true}});
  await expect(page.locator(".arena-result>span")).toContainText("VOID MATCH");
  await capture(page,"12-web-arena-void-result.png");
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
    expect(await page.evaluate(()=>({music:localStorage.getItem("copa_music"),sfx:localStorage.getItem("copa_sfx")})),viewport.name).toEqual({music:"0",sfx:"1"});
    await page.evaluate((scale:string)=>(globalThis as any).CopaMobileExperience?.setTextScale(scale),viewport.scale);
    await expect(page.locator("html")).toHaveAttribute("data-copa-text-scale",viewport.scale);
    await capture(page,`android-${viewport.name}-opening.png`);
    await page.locator('[data-mode-choice="arena"]:visible').first().click();
    await expect(page.locator(".arena-portal")).toBeVisible();
    const portal=await audit(page);
    expect(portal.pageOverflow,viewport.name).toBeLessThanOrEqual(1);
    expect(portal.shellOverflow,viewport.name).toBeLessThanOrEqual(1);
    await capture(page,`android-${viewport.name}-hub.png`);
    await setRoom(page,{...base,phase:"setup",emotes:{self:null,opponent:{id:"applause",sequence:9,at:Date.now()}}});
    await page.locator(".arena-emote-trigger").click();
    await expect(page.locator(".arena-emote-picker button")).toHaveCount(7);
    await expect(page.locator(".arena-emote-reaction.is-opponent")).toBeVisible();
    const emotes=await audit(page);
    expect(emotes.pageOverflow,viewport.name).toBeLessThanOrEqual(1);
    expect(emotes.shellOverflow,viewport.name).toBeLessThanOrEqual(1);
    await page.waitForTimeout(250);
    await capture(page,`android-${viewport.name}-emotes.png`);
    await page.locator(".arena-emote-trigger").click();
    await expect(page.locator(".arena-emote-picker")).toHaveCount(0);
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
    await expect(page.locator(".arena-offers .arena-player-price")).toHaveCount(3);
    await expect(page.locator(".arena-offers .arena-player-chem")).toHaveCount(3);
    await expect(page.locator(".arena-offers")).not.toContainText(/Connector|Reliable|Star|Chemistry focused|Balanced contribution|Power focused/i);
    const draft=await audit(page);
    expect(draft.pageOverflow,viewport.name).toBeLessThanOrEqual(1);
    expect(draft.shellOverflow,viewport.name).toBeLessThanOrEqual(1);
    expect(draft.smallest,viewport.name).toBeGreaterThanOrEqual(7);
    await capture(page,`android-${viewport.name}-draft.png`);
    const mobileMarket=[
      {id:"twelfth",category:"momentum",activation:"second_half",cost:4,attack:0,defense:0,chemistry:1,projected:{power:77,chemistry:4,budget:4}},
      {id:"counter",category:"doctrine",activation:"trailing",cost:3,attack:1,defense:0,chemistry:0,projected:{power:76,chemistry:3,budget:5}},
      {id:"wall",category:"defense",activation:"leading",cost:4,attack:0,defense:1,chemistry:0,projected:{power:77,chemistry:3,budget:4}},
      {id:"none",category:"reserve",activation:"none",cost:0,attack:0,defense:0,chemistry:0,projected:{power:76,chemistry:3,budget:8}}
    ];
    await setRoom(page,{...base,phase:"market",offers:mobileMarket,team:{budget:8,power:76,chemistry:3}});
    await expect(page.locator(".arena-card")).toHaveCount(4);
    await expect(page.locator('[data-arena-choice="market:none"] .arena-card-stats,[data-arena-choice="market:none"] .arena-card-preview,[data-arena-choice="market:none"] .arena-card-fit')).toHaveCount(0);
    const market=await audit(page);
    expect(market.pageOverflow,viewport.name).toBeLessThanOrEqual(1);
    expect(market.shellOverflow,viewport.name).toBeLessThanOrEqual(1);
    expect(market.undersized,viewport.name).toEqual([]);
    await capture(page,`android-${viewport.name}-market.png`);
    await setRoom(page,{...base,phase:"training",self:{...self,setup:{formation:"4-3-3",style:"control",chairman:"babacan"},draft:squad("COPA"),training:null},opponent:{...opponent,setup:{formation:"4-2-3-1",style:"counter",chairman:"babacan"},draft:squad("NORTH",3),draftCount:11},team:{budget:8,power:76,chemistry:3},opponentTeam:{budget:7,power:75,chemistry:2}});
    await expect(page.locator(".arena-plan-visual")).toHaveCount(7);
    await page.locator('[data-arena-plan="focus:chemistry"]').click();
    await page.locator('[data-arena-plan="scenario:adaptive"]').click();
    await expect(page.locator(".arena-plan-grid .is-selected")).toHaveCount(2);
    const plan=await audit(page);
    expect(plan.pageOverflow,viewport.name).toBeLessThanOrEqual(1);
    expect(plan.shellOverflow,viewport.name).toBeLessThanOrEqual(1);
    expect(plan.smallest,viewport.name).toBeGreaterThanOrEqual(7);
    await capture(page,`android-${viewport.name}-training.png`);
    await setRoom(page,{...base,phase:"live",window:0,liveStage:"decision",matchMinute:0,deadline:Date.now()+24000,score:[0,0],events:[],self:{...self,tactics:[]},opponent:{...opponent,tactics:[],tacticLocked:false},team:{power:76},opponentTeam:{power:75}});
    await expect(page.locator(".arena-choice-grid.tactics button")).toHaveCount(4);
    await expect(page.locator('[data-arena-choice="tactics:control"]')).toContainText("Possession Play");
    const tactics=await audit(page);
    expect(tactics.pageOverflow,viewport.name).toBeLessThanOrEqual(1);
    expect(tactics.shellOverflow,viewport.name).toBeLessThanOrEqual(1);
    const tacticOverflow=await page.locator(".arena-choice-grid.tactics button").evaluateAll(buttons=>buttons.map(button=>({
      vertical:button.scrollHeight-button.clientHeight,
      horizontal:button.scrollWidth-button.clientWidth
    })));
    expect(tacticOverflow.every(item=>item.vertical<=1&&item.horizontal<=1),viewport.name).toBe(true);
    await capture(page,`android-${viewport.name}-tactics.png`);
    await setRoom(page,{...base,phase:"penalty",score:[1,1],penalty:{stage:"choice",kick:0,round:1,turn:0,firstShooter:0,score:[0,0],kicks:[0,0],history:[],selfRole:"shooter",selfLocked:false,opponentLocked:false}});
    await expect(page.locator(".arena-penalty-zones button")).toHaveCount(5);
    expect(await page.evaluate(()=>(globalThis as any).CopaArena.state.audioClockActive),viewport.name).toBe(true);
    const penalties=await audit(page);
    expect(penalties.pageOverflow,viewport.name).toBeLessThanOrEqual(1);
    expect(penalties.shellOverflow,viewport.name).toBeLessThanOrEqual(1);
    await capture(page,`android-${viewport.name}-penalty.png`);
    await setRoom(page,{...base,phase:"penalty",score:[1,1],penalty:{stage:"reveal",kick:0,round:1,turn:0,firstShooter:0,score:[1,0],kicks:[1,0],history:[{kick:0,round:1,shooter:0,goal:true,outcome:"goal",shooterZone:"rightLow",keeperZone:"leftHigh"}],selfRole:"shooter",selfLocked:true,opponentLocked:true}});
    expect(await page.evaluate(()=>(globalThis as any).CopaArena.state.lastAudioCue),viewport.name).toBe("penalty:goal");
    expect(await page.evaluate(()=>(globalThis as any).CopaArena.state.audioClockActive),viewport.name).toBe(false);
    await expect(page.locator(".arena-goal")).toHaveAttribute("style",/--ball-x:82%;--ball-y:10%;--keeper-x:20%;--keeper-y:44%;--keeper-rotate:-68deg/);
    await expect(page.locator(".arena-ball")).toHaveCSS("width","26px");
    await expect(page.locator(".arena-keeper")).toHaveCSS("animation-name","arenaKeeperDive");
    await page.waitForTimeout(1400);
    const mobileMotion=await page.evaluate(()=>{
      const goal=document.querySelector(".arena-goal")!.getBoundingClientRect();
      const ball=document.querySelector(".arena-ball")!.getBoundingClientRect();
      const keeper=document.querySelector(".arena-keeper")!.getBoundingClientRect();
      return {
        ballX:(ball.left+ball.width/2-goal.left)/goal.width,
        ballY:(ball.top+ball.height/2-goal.top)/goal.height,
        keeperX:(keeper.left+keeper.width/2-goal.left)/goal.width,
        keeperY:(keeper.top+keeper.height/2-goal.top)/goal.height
      };
    });
    expect(mobileMotion.ballX,viewport.name).toBeGreaterThan(.7);
    expect(mobileMotion.ballY,viewport.name).toBeGreaterThan(.68);
    expect(mobileMotion.keeperX,viewport.name).toBeLessThan(.35);
    expect(mobileMotion.keeperY,viewport.name).toBeLessThan(.61);
    await capture(page,`android-${viewport.name}-penalty-reveal.png`);
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
  await page.locator('[data-mode-choice="arena"]').click();
  await page.context().setOffline(true);
  await page.locator('[data-arena-action="queue"]').click();
  await expect(page.locator(".arena-error")).toContainText("offline");
  await page.context().setOffline(false);
});

test("Copa Arena starts with a blank standalone club name",async({page},testInfo)=>{
  const packaged=testInfo.project.name==="mobile-chromium";
  await boot(page,packaged);
  await page.evaluate(()=>{
    localStorage.removeItem("copa_arena_club_v1");
    localStorage.removeItem("copa_arena_terms_v1");
  });
  await page.locator('[data-mode-choice="arena"]:visible').first().click();
  await expect(page.locator("[data-arena-club]")).toBeVisible();
  await expect(page.locator("[data-arena-club]")).toHaveValue("");
  await expect(page.locator('[data-arena-action="accept"]')).toBeVisible();
});

test("guest entry opens Arena immediately with a device-local identity",async({page})=>{
  await boot(page,false);
  await page.evaluate(()=>{
    localStorage.removeItem("copa_arena_google_user_v1");
    localStorage.removeItem("copa_arena_club_v1");
    localStorage.removeItem("copa_arena_terms_v1");
  });
  await page.locator('[data-mode-choice="arena"]:visible').click();
  const guest=page.locator('[data-arena-action="guest"]');
  await expect(guest).toBeVisible();
  await expect(guest).toContainText(/MİSAFİR OLARAK DEVAM ET|CONTINUE AS GUEST/);
  await guest.click();
  await expect(page.locator(".arena-portal")).toBeVisible();
  const saved=await page.evaluate(()=>({
    user:JSON.parse(localStorage.getItem("copa_arena_google_user_v1")||"null"),
    club:localStorage.getItem("copa_arena_club_v1"),
    terms:localStorage.getItem("copa_arena_terms_v1")
  }));
  expect(saved.user).toMatchObject({guest:true});
  expect(saved.club).toMatch(/^(Misafir|Guest) [A-Z0-9]{4}$/);
  expect(saved.terms).toBe("arena-terms-v1");
});

test("Google sign-in stays inside the Arena account card on narrow phones",async({page},testInfo)=>{
  test.skip(testInfo.project.name!=="mobile-chromium","phone-width Google sign-in contract");
  await boot(page,false);
  await page.evaluate(()=>{
    localStorage.removeItem("copa_arena_google_user_v1");
    localStorage.removeItem("copa_arena_terms_v1");
    (globalThis as any).google={accounts:{id:{
      initialize(){},
      renderButton(slot:HTMLElement,options:{width:number}){
        (globalThis as any).__arenaGoogleWidth=options.width;
        const frame=document.createElement("iframe");
        frame.style.width=`${options.width}px`;
        frame.style.height="44px";
        slot.appendChild(frame);
      }
    }}};
  });
  await page.locator('[data-mode-choice="arena"]:visible').click();
  await expect(page.locator(".arena-google-auth")).toBeVisible();
  await expect(page.locator(".arena-google-slot iframe")).toBeVisible();
  const sizes=await page.evaluate(()=>{
    const auth=document.querySelector<HTMLElement>(".arena-google-auth")!;
    const slot=document.querySelector<HTMLElement>(".arena-google-slot")!;
    const frame=slot.querySelector<HTMLElement>("iframe")!;
    return{
      requested:(globalThis as any).__arenaGoogleWidth,
      authWidth:auth.getBoundingClientRect().width,
      slotWidth:slot.getBoundingClientRect().width,
      frameRight:frame.getBoundingClientRect().right,
      authRight:auth.getBoundingClientRect().right
    };
  });
  expect(sizes.requested).toBeLessThanOrEqual(Math.floor(sizes.slotWidth));
  expect(sizes.frameRight).toBeLessThanOrEqual(sizes.authRight+1);
  const guest=page.locator('[data-arena-action="guest"]');
  await expect(guest).toBeVisible();
  const guestInside=await guest.evaluate(button=>{
    const auth=button.closest(".arena-google-auth")!.getBoundingClientRect(),rect=button.getBoundingClientRect();
    return rect.left>=auth.left-1&&rect.right<=auth.right+1;
  });
  expect(guestInside).toBe(true);
});
