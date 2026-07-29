import {test,expect} from "@playwright/test";

test.use({serviceWorkers:"block"});

const seededMeta={
  version:5,
  career:{reputation:2400,licenses:0,unlockWindowOpen:false,selectedStylePlan:"gegen",prestige:1},
  mastery:{styles:{gegen:6,kontra:5},formations:{"4-4-2":6},chairmen:{babacan:6}},
  badges:[],archive:[],
  museum:{
    memories:[],hall:[],
    collections:{
      claimed:[],stories:[],
      kits:["kit_youth_march"],
      crests:["crest_clean_cup","crest_prestige_1"],
      tokens:0,selectedKit:"",selectedCrest:""
    }
  },
  clubFiles:{completed:{debt:0,youth:0,tactics:0},claimed:[]},
  chairHistory:{},
  directives:{selected:"clean_cup",completed:[]}
};

async function openMeta(page:any,tab:"career"|"mastery"|"museum"){
  await page.evaluate(async(activeTab)=>{
    const game=globalThis as any;
    await game.CopaLazy.ensureMetaProgression();
    game.CopaMeta.openProgression(activeTab);
  },tab);
  await expect(page.locator(".meta-progress-modal")).toBeVisible();
}

test("career directives, specialist plans and prestige cosmetics remain usable and responsive",async({page})=>{
  await page.addInitScript(value=>localStorage.setItem("copa_meta_progression_v1",JSON.stringify(value)),seededMeta);
  await page.goto("/?autotest=1",{waitUntil:"domcontentloaded"});

  await openMeta(page,"career");
  await expect(page.locator(".meta-directive")).toHaveCount(3);
  await expect(page.locator(".meta-directive.is-selected")).toHaveCount(1);

  await openMeta(page,"mastery");
  await expect(page.locator(".meta-plan-toggle")).toHaveCount(2);
  await expect(page.locator(".meta-plan-toggle").filter({hasText:/AKTİF|ACTIVE/})).toHaveCount(1);

  await openMeta(page,"museum");
  await expect(page.locator(".meta-owned-cosmetic")).toHaveCount(3);
  await expect(page.locator(".meta-cosmetic-vault")).toContainText(/KAZANILAN TASARIMLAR|EARNED DESIGNS/);
  const fit=await page.locator(".meta-progress-modal").evaluate((shell:HTMLElement)=>({
    pageOverflow:document.documentElement.scrollWidth-innerWidth,
    left:shell.getBoundingClientRect().left,
    right:shell.getBoundingClientRect().right,
    width:innerWidth,
    clipped:[...shell.querySelectorAll<HTMLElement>("button")].filter(button=>{
      const rect=button.getBoundingClientRect();
      return rect.left<-1||rect.right>innerWidth+1;
    }).length
  }));
  expect(fit.pageOverflow).toBeLessThanOrEqual(1);
  expect(fit.left).toBeGreaterThanOrEqual(-1);
  expect(fit.right).toBeLessThanOrEqual(fit.width+1);
  expect(fit.clipped).toBe(0);

  const firstCosmetic=page.locator(".meta-owned-cosmetic").filter({hasText:/TEMİZ KUPA|CLEAN CUP/});
  await expect(firstCosmetic).toHaveCount(1);
  await firstCosmetic.click();
  await expect(page.locator(".meta-owned-cosmetic.is-equipped")).toHaveCount(1);
});
