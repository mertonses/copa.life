import {test,expect} from "@playwright/test";

async function reachHub(page:any){
  await page.addInitScript(()=>{localStorage.clear();sessionStorage.clear();});
  await page.goto("/?autotest=1&groups=1&visual=navigation-contract",{waitUntil:"domcontentloaded"});
  await page.evaluate(async()=>{const game=globalThis as any;await game.quickStart();if(game._countryDraftPromise)await game._countryDraftPromise;await game.quickAll();});
  await page.locator("#postClubName").fill("Kırılım FK");
  await page.evaluate(()=>{const game=globalThis as any;game.pcGo();game.fastTournamentDraw();game.finishTournamentDraw();game.setCaptain(0);game.pendingChairmanEvent=null;game.closeModal();game.CopaMobileShell.enhanceHub();});
  await expect(page.locator("#hub")).toBeVisible();
}

async function dismissIncidentalGameModal(page:any){
  const modal=page.locator("#modal");
  if(await modal.isVisible())await page.evaluate(()=>{const game=globalThis as any;game.closeModal();});
  await expect(modal).toBeHidden();
}

test("hub navigation stays on one row on desktop, narrow desktop and mobile",async({page})=>{
  await reachHub(page);
  const matrix=[
    {name:"desktop",width:1440,height:900,locale:"tr"},
    {name:"narrow desktop",width:820,height:900,locale:"de"},
    {name:"mobile",width:390,height:844,locale:"es"}
  ];
  for(const viewport of matrix){
    await page.setViewportSize({width:viewport.width,height:viewport.height});
    await page.evaluate(locale=>{const game=globalThis as any;game.LANG=locale;game.CopaMobileShell.refreshLanguage();},viewport.locale);
    const nav=page.locator("#nativeHubNav");
    await expect(nav,viewport.name).toBeVisible();
    await expect(nav.locator("[data-native-target]"),viewport.name).toHaveCount(5);
    const layout=await nav.evaluate((node:HTMLElement)=>{
      const buttons=[...node.querySelectorAll<HTMLElement>("[data-native-target]")],rect=node.getBoundingClientRect();
      return{
        rows:new Set(buttons.map(button=>Math.round(button.getBoundingClientRect().top))).size,
        targets:buttons.map(button=>button.dataset.nativeTarget),
        contained:buttons.every(button=>{const box=button.getBoundingClientRect();return box.left>=rect.left-1&&box.right<=rect.right+1;}),
        overflow:node.scrollWidth-node.clientWidth,
        pageOverflow:document.documentElement.scrollWidth-window.innerWidth
      };
    });
    expect(layout,viewport.name).toEqual({rows:1,targets:["match","market","training","sidefield","career"],contained:true,overflow:0,pageOverflow:0});
    await dismissIncidentalGameModal(page);
    await nav.locator('[data-native-target="sidefield"]').click();
    await expect(page.locator("#sideFieldRoute"),viewport.name).toBeVisible();
    await dismissIncidentalGameModal(page);
    await nav.locator('[data-native-target="match"]').click();
    await expect(page.locator('#nativeHubNav [data-native-target="match"]'),viewport.name).toHaveClass(/active/);
  }
});
