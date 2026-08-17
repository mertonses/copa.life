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
  await expect(cards.nth(0).locator(".free-agent-impact span").filter({hasText:"GÜÇ"}).locator("b")).toHaveText("64");
  await expect(cards.nth(1).locator(".free-agent-impact span").filter({hasText:"GÜÇ"}).locator("b")).toHaveText("73");
  const actionFit=await page.locator("#freeAgentRow .free-agent-card").evaluateAll(cards=>cards.every(card=>{
    const button=card.querySelector<HTMLElement>(".free-agent-review");
    if(!button)return false;
    const cardRect=card.getBoundingClientRect(),buttonRect=button.getBoundingClientRect();
    return buttonRect.top>=cardRect.top-1&&buttonRect.bottom<=cardRect.bottom+1;
  }));
  expect(actionFit).toBe(true);
});

test("free-agent price headers remain visible on mobile",async({page},testInfo)=>{
  test.skip(!testInfo.project.name.includes("mobile"),"mobile layout contract");
  await expect(page.locator("#freeAgentRow .ct-price")).toHaveCount(2);
  const overflow=await page.locator("#freeAgentRow").evaluate(node=>(node as HTMLElement).scrollWidth-(node as HTMLElement).clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});

test("free-agent cards use the physical Copa shell and role motion",async({page})=>{
  const cards=page.locator("#freeAgentRow .free-agent-card");
  await expect(cards).toHaveCount(2);
  for(const card of await cards.all()){
    await expect(card.locator(".free-agent-edge")).toHaveCount(1);
    await expect(card.locator(".free-agent-face")).toHaveCount(1);
    await expect(card.locator(".free-agent-motion")).toHaveCount(1);
    await expect(card.locator(".free-agent-stamp")).toHaveText("SERBEST");
    await expect(card.locator(".ct-price")).toHaveCount(1);
    const shell=await card.evaluate(node=>{
      const cardRect=node.getBoundingClientRect();
      const button=node.querySelector<HTMLElement>(".free-agent-review")?.getBoundingClientRect();
      const motion=node.querySelector<HTMLElement>(".free-agent-motion");
      return {role:(node as HTMLElement).dataset.freeAgentRole||"",commonDark:/COMMON|DARK/i.test(node.textContent||""),buttonFit:!!button&&button.top>=cardRect.top-1&&button.bottom<=cardRect.bottom+1,animation:motion?getComputedStyle(motion).animationName:"none"};
    });
    expect(shell.role).toBeTruthy();
    expect(shell.commonDark).toBe(false);
    expect(shell.buttonFit).toBe(true);
    expect(shell.animation).not.toBe("none");
  }
});
