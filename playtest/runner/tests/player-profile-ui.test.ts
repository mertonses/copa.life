import { test, expect } from "@playwright/test";

const player={
  name:"Sander van de Streek",
  ov:78,
  age:32,
  club:"Antalyaspor",
  natPos:"OOS (M)",
  pos:"OOS (M)",
  profileKey:"TR|sander van de streek|32|antalyaspor",
};

test("player profile summary, six copa dimensions and insights stay responsive",async({page},testInfo)=>{
  const errors:string[]=[];
  page.on("pageerror",error=>errors.push(error.message));
  await page.goto("/?autotest=1",{waitUntil:"domcontentloaded"});
  await page.evaluate(value=>{
    (globalThis as any).pickCountry("TR");
    const anchor=document.querySelector("#intro")||document.body;
    (globalThis as any).PlayerProfiles.open(value,anchor,"keyboard");
  },player);

  const layer=page.locator(".player-profile-layer");
  const card=page.locator(".player-profile-card");
  const content=page.locator(".player-profile-content");
  const radar=page.locator(".player-profile-radar svg");
  await expect(layer).toHaveAttribute("aria-hidden","false");
  await expect(page.locator(".player-profile-ov")).toHaveText("78");
  await expect(page.locator("[data-profile-club-logo]")).toHaveAttribute("src",/Antalyaspor\.png$/);
  await expect(page.locator(".player-profile-detail.is-country")).not.toContainText(/^Ana$/);
  await expect(page.locator(".player-profile-radar-scores span")).toHaveCount(6);
  await expect(page.locator(".player-profile-fit")).toContainText("75%");
  await expect(page.locator(".player-profile-model-note")).toContainText("0–100");
  await expect(page.locator(".player-profile-insights.is-positive")).toBeVisible();
  await expect(page.locator(".player-profile-insights.is-negative")).toBeVisible();
  await expect(page.locator(".player-profile-insights.is-tendency")).toBeVisible();
  await expect(page.locator("[data-profile-attributes]")).toHaveCount(0);
  await expect(page.locator(".player-profile-attribute-panel")).toHaveCount(0);
  const radarWidth=await radar.evaluate(element=>element.getBoundingClientRect().width);
  if(testInfo.project.name.includes("mobile")){
    expect(radarWidth).toBeGreaterThanOrEqual(260);
    expect(radarWidth).toBeLessThanOrEqual(286);
    await expect(layer).toHaveClass(/is-sheet/);
    const box=await card.boundingBox();
    expect(box?.width).toBeGreaterThan(400);
  }else{
    expect(radarWidth).toBeGreaterThanOrEqual(300);
    expect(radarWidth).toBeLessThanOrEqual(310);
    await expect(layer).not.toHaveClass(/is-sheet/);
  }

  const scrollMetrics=await content.evaluate(element=>({client:element.clientHeight,scroll:element.scrollHeight,overflow:getComputedStyle(element).overflowY}));
  if(testInfo.project.name.includes("mobile"))expect(scrollMetrics.scroll).toBeGreaterThan(scrollMetrics.client);
  else expect(scrollMetrics.scroll).toBeGreaterThanOrEqual(scrollMetrics.client);
  expect(scrollMetrics.overflow).toBe("auto");

  await page.evaluate(()=>document.documentElement.setAttribute("data-theme","dark"));
  await expect(page.locator(".player-profile-radar-area")).toBeVisible();
  const background=await card.evaluate(element=>getComputedStyle(element).backgroundColor);
  expect(background).not.toBe("rgba(0, 0, 0, 0)");
  expect(errors).toEqual([]);
});

test("player profile data falls back when the JSON request fails",async({page})=>{
  await page.addInitScript(()=>{
    const realFetch=globalThis.fetch.bind(globalThis);
    (globalThis as any).__profileFetchFailures=0;
    globalThis.fetch=((input:RequestInfo|URL,init?:RequestInit)=>{
      if(String(input).includes("assets/data/copa/player_profiles.json")){
        (globalThis as any).__profileFetchFailures++;
        return Promise.reject(new TypeError("forced profile JSON failure"));
      }
      return realFetch(input,init);
    }) as typeof fetch;
  });
  await page.goto("/?profile-fallback-test=1",{waitUntil:"domcontentloaded"});
  const result=await page.evaluate(async()=>{
    const global=globalThis as any;
    const data=await global.loadPlayerProfiles({force:true});
    const profile=await global.playerProfileByKeyAsync("DE|joshua kimmich|30|fc bayern munchen");
    return{
      failures:global.__profileFetchFailures,
      records:Object.keys(data.records||{}).length,
      scores:[
        profile?.copa_impact,
        profile?.copa_build_up,
        profile?.copa_space_control,
        profile?.copa_duels,
        profile?.copa_engine,
        profile?.copa_pressure_decision,
      ],
      state:global.playerProfileLoadState(),
    };
  });
  expect(result.failures).toBe(2);
  expect(result.records).toBe(8866);
  expect(result.scores).toEqual([76,85,81,72,82,88]);
  expect(result.state).toMatchObject({loaded:true,loading:false,error:null,attempts:2});
});
