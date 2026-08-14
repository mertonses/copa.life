import {test,expect} from "@playwright/test";
import path from "node:path";
import fs from "node:fs";

const visualDir=path.resolve(__dirname,"../../../outputs/ui-visuals/career-polish");
const capture=async(page:any,name:string)=>{
  fs.mkdirSync(visualDir,{recursive:true});
  await page.screenshot({path:path.join(visualDir,name),fullPage:true});
};

test("mode titles keep equal hierarchy with distinct Life and Arena material",async({page},testInfo)=>{
  await page.goto("/?arena-visual-qa=1&career-polish=mode",{waitUntil:"domcontentloaded"});
  await expect(page.locator("#modeGate")).toBeVisible();
  await expect(page.locator(".mode-title-crown")).toHaveCount(1);
  const titles=await page.locator(".mode-title").evaluateAll((nodes:HTMLElement[])=>nodes.map(node=>{
    const rect=node.getBoundingClientRect(),line=getComputedStyle(node,"::after"),sweep=getComputedStyle(node,"::before");
    return{
      text:node.textContent?.replace(/\s+/g," ").trim(),
      width:rect.width,
      height:rect.height,
      fontSize:getComputedStyle(node).fontSize,
      lineWidth:line.width,
      lineHeight:line.height,
      animation:sweep.animationName,
      letterSpacing:getComputedStyle(node).letterSpacing,
    };
  }));
  expect(titles).toHaveLength(2);
  expect(titles[0].fontSize).toBe(titles[1].fontSize);
  expect(Math.abs(titles[0].height-titles[1].height)).toBeLessThanOrEqual(2);
  expect(titles[0].lineHeight).not.toBe("0px");
  expect(titles[1].lineHeight).not.toBe("0px");
  expect(titles[1].animation).toContain("modeArenaTitleSweep");
  expect(titles[0].text).not.toContain("PREMIUM");
  expect(titles[1].text).not.toContain("PREMIUM");
  expect(parseFloat(titles[1].letterSpacing)).toBeGreaterThan(parseFloat(titles[0].letterSpacing));
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
  await capture(page,`mode-titles-${testInfo.project.name}.png`);
});

test("training recommendation, three-line preview and help remain compact",async({page},testInfo)=>{
  await page.goto("/?career-polish=training",{waitUntil:"domcontentloaded"});
  await page.evaluate(()=>{
    const game=globalThis as any;
    game.setLang("tr");
    game.CopaPreparation.restore({round:4,fatigue:22,lastPlan:[{id:"finishing",intensity:"light"}],opponent:{name:"Pres FK",style:"press"}});
    game.CopaPreparation.open(4,{name:"Pres FK",style:"press"});
  });
  await expect(page.locator(".prep-modal")).toBeVisible();
  await expect(page.locator(".prep-preview-row")).toHaveCount(3);
  await expect(page.locator(".prep-recommended-action")).toBeVisible();
  await expect(page.locator(".prep-plan-warning")).toBeVisible();
  await page.locator(".prep-recommended-action").click();
  await expect(page.locator(".prep-drill.active")).toHaveCount(2);
  const fit=await page.locator(".prep-modal").evaluate((modal:HTMLElement)=>({
    overflow:modal.scrollWidth-modal.clientWidth,
    pageOverflow:document.documentElement.scrollWidth-innerWidth,
    labels:[...modal.querySelectorAll<HTMLElement>(".prep-preview-row small")].map(node=>node.textContent?.trim()),
  }));
  expect(fit.overflow).toBeLessThanOrEqual(1);
  expect(fit.pageOverflow).toBeLessThanOrEqual(1);
  expect(fit.labels).toEqual(["MAÇ ETKİSİ","YORGUNLUK","SAKATLIK RİSKİ"]);
  await page.locator(".prep-help").click();
  await expect(page.locator(".prep-help-modal article")).toHaveCount(6);
  const help=await page.locator(".prep-help-modal").evaluate((modal:HTMLElement)=>({
    overflow:modal.scrollWidth-modal.clientWidth,
    text:modal.innerText,
    tones:new Set([...modal.querySelectorAll<HTMLElement>("article")].map(card=>getComputedStyle(card).borderColor)).size,
  }));
  expect(help.overflow).toBeLessThanOrEqual(1);
  expect(help.text).not.toContain(";");
  expect(help.text).toContain("Yorgunluk ve sakatlık");
  expect(help.tones).toBeGreaterThanOrEqual(4);
  await capture(page,`training-help-${testInfo.project.name}.png`);
});

test("museum and World surfaces keep deliberate spacing on both viewports",async({page},testInfo)=>{
  await page.addInitScript(data=>{
    const original=globalThis.fetch.bind(globalThis);
    globalThis.fetch=async(input:any,init?:RequestInit)=>{
      const url=String(typeof input==="string"?input:input?.url||"");
      if(url.includes("/v1/leaderboard?limit=100"))return new Response(JSON.stringify(data),{status:200,headers:{"content-type":"application/json"}});
      return original(input,init);
    };
  },{
      season:"2026-07",
      clubs:[1,2,3,4].map(rank=>({
        rank,
        public_club_id:`G-TEST${rank}`,
        club_name:`KULÜP ${rank}`,
        country:"TR",
        career_level:8-rank,
        total_champions:4-rank,
        season_score:600-rank*70,
      })),
  });
  await page.goto("/?career-polish=meta",{waitUntil:"domcontentloaded"});
  await page.evaluate(async()=>{
    const game=globalThis as any;
    game.setLang("tr");
    await game.CopaLazy.ensureMetaProgression();
    game.CopaMeta.openProgression("museum");
  });
  await expect(page.locator(".meta-progress-modal.meta-tab-trophies")).toBeVisible();
  await expect(page.locator(".meta-collection-grid article")).toHaveCount(8);
  const museum=await page.locator(".meta-progress-modal").evaluate((modal:HTMLElement)=>({
    overflow:modal.scrollWidth-modal.clientWidth,
    summaryHeight:modal.querySelector<HTMLElement>(".meta-museum-summary")!.getBoundingClientRect().height,
    collectionOverflow:modal.querySelector<HTMLElement>(".meta-collection-grid")!.scrollWidth-modal.querySelector<HTMLElement>(".meta-collection-grid")!.clientWidth,
  }));
  expect(museum.overflow).toBeLessThanOrEqual(1);
  expect(museum.collectionOverflow).toBeLessThanOrEqual(1);
  expect(museum.summaryHeight).toBeGreaterThanOrEqual(56);
  await capture(page,`museum-${testInfo.project.name}.png`);

  await page.evaluate(()=>(globalThis as any).CopaMeta.openProgression("world"));
  await expect(page.locator(".world-rank-row")).toHaveCount(4);
  const world=await page.locator(".meta-progress-modal").evaluate((modal:HTMLElement)=>({
    overflow:modal.scrollWidth-modal.clientWidth,
    medalShapes:[...modal.querySelectorAll<HTMLElement>(".world-rank-row>b")].slice(0,3).map(node=>getComputedStyle(node).borderRadius),
    rowBackgrounds:[...modal.querySelectorAll<HTMLElement>(".world-rank-row")].slice(0,3).map(node=>getComputedStyle(node).backgroundImage),
  }));
  expect(world.overflow).toBeLessThanOrEqual(1);
  expect(world.medalShapes.every(value=>value!=="0px")).toBe(true);
  expect(new Set(world.rowBackgrounds).size).toBeGreaterThanOrEqual(3);
  await capture(page,`world-${testInfo.project.name}.png`);
});

test("career path summary keeps one visible target and progress hierarchy",async({page},testInfo)=>{
  await page.goto("/?career-polish=meta",{waitUntil:"domcontentloaded"});
  await page.evaluate(async()=>{
    const game=globalThis as any;
    game.setLang("tr");
    await game.CopaLazy.ensureMetaProgression();
    game.CopaMeta.openProgression("career");
  });
  await expect(page.locator(".meta-progress-modal.meta-tab-career")).toBeVisible();
  await expect(page.locator(".meta-career-path")).toHaveCount(1);
  await expect(page.locator(".meta-career-path-target b")).toBeVisible();
  const worldTab=page.locator(".meta-tabs button").filter({hasText:"DÜNYA"});
  await expect(worldTab).toBeVisible();
  const worldBox=await worldTab.boundingBox();
  expect(worldBox).not.toBeNull();
  const viewportWidth=await page.evaluate(()=>innerWidth);
  expect((worldBox?.x||0)+(worldBox?.width||0)).toBeLessThanOrEqual(viewportWidth);
  const fit=await page.locator(".meta-progress-modal").evaluate((modal:HTMLElement)=>({
    overflow:modal.scrollWidth-modal.clientWidth,
    pathHeight:modal.querySelector<HTMLElement>(".meta-career-path")!.getBoundingClientRect().height,
    target:modal.querySelector<HTMLElement>(".meta-career-path-target b")!.textContent?.trim(),
  }));
  expect(fit.overflow).toBeLessThanOrEqual(1);
  expect(fit.pathHeight).toBeGreaterThan(60);
  expect(fit.target).toBeTruthy();
  await capture(page,`career-path-${testInfo.project.name}.png`);
});

test("career navigation is reduced to overview, progress and world",async({page},testInfo)=>{
  await page.goto("/?career-polish=meta",{waitUntil:"domcontentloaded"});
  await page.evaluate(async()=>{
    const game=globalThis as any;
    game.setLang("tr");
    await game.CopaLazy.ensureMetaProgression();
    game.CopaMeta.openProgression("growth");
  });
  await expect(page.locator(".meta-progress-modal .meta-tabs button")).toHaveCount(3);
  await expect(page.locator(".meta-progress-modal .meta-tabs")).toContainText("GENEL BAKIŞ");
  await expect(page.locator(".meta-progress-modal .meta-tabs")).toContainText("GELİŞİM");
  await expect(page.locator(".meta-progress-modal .meta-tabs")).toContainText("DÜNYA");
  await expect(page.locator(".meta-growth-intro")).toBeVisible();
  await expect(page.locator(".meta-directive")).toHaveCount(3);
  await expect(page.locator(".meta-mastery-section").first()).toBeVisible();
  await capture(page,`career-growth-${testInfo.project.name}.png`);
  await page.locator(".meta-tabs button").filter({hasText:"DÜNYA"}).click();
  await expect(page.locator(".meta-progress-modal.meta-tab-world")).toBeVisible();
  await capture(page,`career-world-${testInfo.project.name}.png`);
});

test("relationship journal stays readable and compact in player profiles",async({page},testInfo)=>{
  await page.goto("/?career-polish=relationships",{waitUntil:"domcontentloaded"});
  await page.evaluate(()=>{
    const game=globalThis as any;
    game.setLang("tr");
    game.selectedCountry="TR";
    game.CopaRelationships.restore({
      version:3,
      bonds:{"arda yıldız|CM":4},
      journal:{"arda yıldız|CM":[
        {round:5,label:"Kaptanlık sözü tutuldu",reason:"Güven güçlendi"},
        {round:4,label:"İlk 11 sözü verildi",reason:"Oyuncuya rol sözü verildi"},
      ]},
      groupMood:{captain:1,youth:1,stars:0,local:1},
    });
    game.PlayerProfiles.open({name:"Arda Yıldız",age:21,ov:83,pos:"CM",nat:"TR"},document.querySelector("#intro")||document.body,"keyboard");
  });
  const journal=page.locator(".player-relationship-journal");
  await expect(journal).toBeVisible();
  await expect(journal.locator("li")).toHaveCount(2);
  await expect(journal).toContainText("BAĞ 4/7");
  await expect(journal).toContainText("Gençler");
  await expect(journal).toContainText("Yerli çekirdek");
  const fit=await journal.evaluate((node:HTMLElement)=>({
    overflow:node.scrollWidth-node.clientWidth,
    pageOverflow:document.documentElement.scrollWidth-innerWidth,
  }));
  expect(fit.overflow).toBeLessThanOrEqual(1);
  expect(fit.pageOverflow).toBeLessThanOrEqual(1);
  await capture(page,`relationship-journal-${testInfo.project.name}.png`);
});
