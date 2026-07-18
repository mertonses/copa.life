import { test, expect } from "@playwright/test";

test.beforeEach(async({page})=>{
  await page.addInitScript(()=>localStorage.setItem("copa.guide.context.v2",JSON.stringify({setup:1,draft:1,hub:1})));
  await page.goto("/?free-agent-pricing=1",{waitUntil:"domcontentloaded"});
  await page.evaluate(()=>{
    (globalThis as any).setLang("tr");
    document.getElementById("intro")?.classList.add("hidden");
    document.getElementById("hub")?.classList.remove("hidden");
    (0,eval)(`budget=50;legacyCash=0;round=3;`);
    const game=globalThis as any;
    game._freeAgents=[
      {p:{name:"Denge Oyuncusu",ov:64,pos:"CM",natPos:"CM",age:25,club:""},fee:game.clampFreeAgentFee(64,3,game.playerMarketValue(64,"free_agent",3))},
      {p:{name:"Üst Bant Oyuncusu",ov:73,pos:"ST",natPos:"ST",age:27,club:""},fee:game.clampFreeAgentFee(73,3,game.playerMarketValue(73,"free_agent",3))}
    ];
    game._renderFreeAgents();
  });
});

test("free-agent cards show the enforced round and power-band prices",async({page})=>{
  const cards=page.locator("#freeAgentRow .free-agent-card");
  await expect(cards).toHaveCount(2);
  await expect(cards.nth(0).locator(".ct-price")).toHaveText("€4M");
  await expect(cards.nth(1).locator(".ct-price")).toHaveText("€7M");
  await expect(cards.nth(0)).toContainText("Güç64");
  await expect(cards.nth(1)).toContainText("Güç73");
});

test("free-agent price headers remain visible on mobile",async({page},testInfo)=>{
  test.skip(!testInfo.project.name.includes("mobile"),"mobile layout contract");
  await expect(page.locator("#freeAgentRow .ct-price")).toHaveCount(2);
  const overflow=await page.locator("#freeAgentRow").evaluate(node=>(node as HTMLElement).scrollWidth-(node as HTMLElement).clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});
