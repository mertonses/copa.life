import { test, expect } from "@playwright/test";

test.beforeEach(async({page})=>{
  await page.addInitScript(()=>localStorage.setItem("copa.guide.context.v2",JSON.stringify({setup:1,draft:1,hub:1})));
  await page.goto("/?fixture-road=1",{waitUntil:"domcontentloaded"});
  await page.evaluate(()=>{
    (globalThis as any).setLang("tr");
    document.getElementById("intro")?.classList.add("hidden");
    document.getElementById("hub")?.classList.remove("hidden");
    (0,eval)(`fixtures=[
      {opp:"A Spor",res:"W",gf:2,ga:0,events:[{min:71,type:"goal",name:"Uçan"}]},
      {opp:"B Spor",res:"D",gf:1,ga:1,events:[{min:88,type:"goal",name:"Demir"}]},
      {opp:"C Spor",res:null,gf:null,ga:null},
      {opp:"D Spor",res:null,gf:null,ga:null},
      {opp:"E Spor",res:null,gf:null,ga:null},
      {opp:"F Spor",res:null,gf:null,ga:null}
    ];round=3;selectedCountry="TR";`);
    (globalThis as any).lastMatchReportData={penalty:[5,4]};
    (globalThis as any).renderFixtures();
  });
  await expect(page.locator("#fixbar.fixture-road-v2")).toBeVisible();
});

test("fixture road shows text outcomes, active match, locked futures and rich details",async({page})=>{
  await expect(page.locator(".fixture-node")).toHaveCount(6);
  await expect(page.locator(".fixture-node").nth(0)).toContainText("W · Kazandı");
  await expect(page.locator(".fixture-node").nth(1)).toContainText("D · Berabere");
  await expect(page.locator(".fixture-node.is-active")).toContainText("Sıradaki maç");
  await expect(page.locator(".fixture-node.is-locked").first()).toContainText("Rakip tur sonrası belli olur");
  await expect(page.locator("#fixbar")).not.toContainText("???");

  await page.locator(".fixture-node").nth(1).click();
  await expect(page.locator("#fixtureDetail")).toContainText("B Spor");
  await expect(page.locator("#fixtureDetail")).toContainText("1–1");
  await expect(page.locator("#fixtureDetail")).toContainText("5–4");
  await expect(page.locator("#fixtureDetail")).toContainText("88' Gol");

  await page.locator(".fixture-node.is-active").click();
  await expect(page.locator("#fixtureDetail")).toContainText("C Spor");
  await expect(page.locator(".fixture-node.is-active")).toHaveAttribute("aria-expanded","true");
});

test("fixture road supports arrow-key navigation",async({page})=>{
  const first=page.locator(".fixture-node").first();
  await first.focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.locator(".fixture-node").nth(1)).toBeFocused();
});

test("mobile road snaps and automatically centers the active round",async({page},testInfo)=>{
  test.skip(!testInfo.project.name.includes("mobile"),"mobile layout contract");
  await page.evaluate(()=>(0,eval)("round=5;fixtures[2].res='W';fixtures[2].gf=3;fixtures[2].ga=1;fixtures[3].res='W';fixtures[3].gf=1;fixtures[3].ga=0;renderFixtures();"));
  await expect(page.locator(".fixture-node.is-active")).toBeVisible();
  await page.waitForTimeout(500);
  const metrics=await page.evaluate(()=>{
    const track=document.querySelector(".fixture-track") as HTMLElement;
    const active=track.querySelector(".fixture-node.is-active") as HTMLElement;
    return {
      snap:getComputedStyle(track).scrollSnapType,
      scrollLeft:track.scrollLeft,
      activeCenter:active.offsetLeft+active.offsetWidth/2-track.scrollLeft,
      viewportCenter:track.clientWidth/2,
    };
  });
  expect(metrics.snap).toContain("x mandatory");
  expect(metrics.scrollLeft).toBeGreaterThan(0);
  expect(Math.abs(metrics.activeCenter-metrics.viewportCenter)).toBeLessThan(18);
  await expect(page.locator(".fixture-trophy")).toHaveClass(/is-near/);
});

test("winning the final lights the trophy node",async({page})=>{
  await page.evaluate(()=>(0,eval)(`fixtures.forEach((item,index)=>{item.res="W";item.gf=2;item.ga=index===5?1:0;});round=6;renderFixtures();`));
  await expect(page.locator(".fixture-trophy")).toHaveClass(/is-champion/);
  await expect(page.locator(".fixture-trophy")).toHaveAttribute("aria-label","Şampiyon");
});
