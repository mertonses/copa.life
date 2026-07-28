import {test,expect} from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const output=path.resolve(__dirname,"../../../outputs/ui-visuals/arena");
const profile={publicId:"AC-QA",clubName:"Uzun Yolculuk Spor Kulübü",rating:1284,division:"gumus",seasonKey:"2026-Q3",seasonPoints:184,wins:12,draws:4,losses:7,streak:3,tokenProgress:16,cosmetics:["arena_badge_rookie","arena_frame_floodlights"]};
const self={owner:"self",clubName:profile.clubName,rating:1284,ready:false,setup:null,draft:[],market:null,training:null,tactics:[],connected:true};
const opponent={clubName:"Kuzey Yıldızları FK",rating:1271,ready:false,connected:true,setup:null,draftCount:0,draft:[],market:null,training:null,tacticLocked:false};
const base={protocol:1,rulesVersion:"arena-rules-v3",matchId:"AR-VISUALQA00000001",deadline:Date.now()+30_000,selfIndex:0,draftStep:0,window:0,score:[0,0],events:[],result:null,self,opponent,offers:null,draftStatus:{count:0,total:11,budget:48,power:0},team:null,opponentTeam:null};

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
  if(packaged)await page.evaluate(()=>(globalThis as any).CopaMobileShell.showLanding(null));
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

  const offers=[
    {id:"gk-0-a",line:"GK",name:"Arda Aydın",power:67,cost:1,chemistry:2,trait:"connector"},
    {id:"gk-0-b",line:"GK",name:"Diego Carlos",power:75,cost:3,chemistry:1,trait:"reliable"},
    {id:"gk-0-c",line:"GK",name:"Muhammed Emin Uzunyol",power:83,cost:6,chemistry:-1,trait:"star"}
  ];
  await setRoom(page,{...base,phase:"draft",draftStep:0,offers,self:{...self,draft:[offers[1]]},draftStatus:{count:1,total:11,budget:45,power:75}});
  await expect(page.locator(".arena-offers .is-selected")).toContainText("SELECTED");
  await expect(page.locator(".arena-draft-progress")).toContainText("1 / 11");
  await capture(page,"04-web-arena-draft.png");

  const market=[
    {id:"twelfth",cost:4,attack:1,defense:0,chemistry:1},
    {id:"counter",cost:3,attack:2,defense:0,chemistry:0},
    {id:"wall",cost:4,attack:0,defense:2,chemistry:0},
    {id:"none",cost:0,attack:0,defense:0,chemistry:0}
  ];
  await setRoom(page,{...base,phase:"market",offers:market,team:{budget:8,power:76,chemistry:3}});
  await capture(page,"05-web-arena-market.png");

  await setRoom(page,{...base,phase:"training",self:{...self,training:"chemistry"},team:{budget:8,power:76,chemistry:3}});
  await expect(page.locator(".arena-choice-grid .is-selected")).toContainText("SELECTED");
  await capture(page,"06-web-arena-training.png");

  await setRoom(page,{...base,phase:"live",window:1,score:[1,1],events:[{minute:14,type:"goal",side:"home"},{minute:33,type:"card",side:"away"},{minute:49,type:"goal",side:"away"}],self:{...self,setup:{formation:"4-4-2",style:"balanced",chairman:"diplomat"},tactics:["press"]},opponent:{...opponent,setup:{formation:"4-3-3",style:"counter",chairman:"patron"}},team:{power:76},opponentTeam:{power:75}});
  await capture(page,"07-web-arena-live.png");

  await setRoom(page,{...base,phase:"result",score:[2,1],result:{score:[2,1],penalty:null,outcomes:["win","loss"]}});
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
  for(const viewport of [{width:360,height:800,name:"phone-small"},{width:430,height:932,name:"phone"},{width:768,height:1024,name:"tablet"}]){
    await page.setViewportSize({width:viewport.width,height:viewport.height});
    await boot(page,true);
    await capture(page,`android-${viewport.name}-opening.png`);
    await page.locator("#arenaBtn:visible, [data-mobile-arena]:visible").first().click();
    await expect(page.locator(".arena-portal")).toBeVisible();
    const portal=await audit(page);
    expect(portal.pageOverflow,viewport.name).toBeLessThanOrEqual(1);
    expect(portal.shellOverflow,viewport.name).toBeLessThanOrEqual(1);
    await capture(page,`android-${viewport.name}-hub.png`);
    const mobileOffers=[
      {id:"st-a",line:"ST",name:"Can Kaya",power:68,cost:1,chemistry:2,trait:"connector"},
      {id:"st-b",line:"ST",name:"Luca Rossi",power:76,cost:3,chemistry:1,trait:"reliable"},
      {id:"st-c",line:"ST",name:"Abdurrahman Demircioğlu",power:84,cost:6,chemistry:-1,trait:"star"}
    ];
    const mobileDraft=[...Array(10)].map((_,index)=>({id:`pick-${index}`,line:"MID",name:`Player ${index}`,power:72,cost:1,chemistry:0})).concat(mobileOffers[1]);
    await setRoom(page,{...base,phase:"draft",draftStep:10,offers:mobileOffers,self:{...self,draft:mobileDraft},draftStatus:{count:11,total:11,budget:32,power:73}});
    await expect(page.locator(".arena-draft-progress")).toContainText("11 / 11");
    await expect(page.locator(".arena-offers .is-selected")).toBeVisible();
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
