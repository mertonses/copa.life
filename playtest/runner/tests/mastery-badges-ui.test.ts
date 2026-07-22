import { test, expect } from "@playwright/test";

test.use({serviceWorkers:"block"});

test.beforeEach(async({page})=>{
  await page.addInitScript(()=>{
    localStorage.setItem("copa_meta_progression_v1",JSON.stringify({
      version:2,
      career:{reputation:0,licenses:0,unlockWindowOpen:false},
      mastery:{
        formations:{"4-4-2":8,"4-3-3":3},
        styles:{gegen:6,kontra:3,tiki:1,uzun:12,blok:2},
        chairmen:{babacan:17,leydi:4,pinti:1,sansasyoncu:4,torpilci:1,cilgin:6}
      },
      badges:[],archive:[],museum:{memories:[],hall:[]}
    }));
  });
  await page.goto("/?mastery-badge-ui=1",{waitUntil:"domcontentloaded"});
  await page.evaluate(async()=>{
    const w=globalThis as any;
    w.setLang("tr");
    await w.CopaLazy.ensureMetaProgression();
    w.buildFormButtons();
  });
});

test("formation and play-style mastery stay compact while full tiers remain accessible",async({page})=>{
  const formationBadges=page.locator("#formpick .setup-mastery");
  await expect(formationBadges).toHaveCount(2);
  await expect(formationBadges).toHaveText(["★8","★3"]);
  await expect(page.locator("#formpick")).not.toContainText(/Yeni|Deneyimli|Uzman|Usta|Efsane/);

  const masteredFormation=page.locator("#formpick .fbtn").filter({hasText:"4-4-2"});
  await expect(masteredFormation).toHaveAttribute("aria-label",/4-4-2, Ustalık: Uzman · 8/);
  await expect(masteredFormation).toHaveAttribute("title","Ustalık: Uzman · 8");

  const chairmanBadges=page.locator("#chairpick .setup-mastery");
  await expect(chairmanBadges).toHaveCount(6);
  await expect(chairmanBadges).toHaveText(["★17","★4","★1","★4","★1","★6"]);
  await expect(page.locator("#chairpick")).not.toContainText(/Yeni|Deneyimli|Uzman|Usta|Efsane/);
  const patron=page.locator("#chairpick .chairbtn").first();
  await expect(patron).toHaveAttribute("aria-label",/Ustalık: Usta · 17/);
  await expect(patron).toHaveAttribute("title","Ustalık: Usta · 17");

  await page.evaluate(()=>(globalThis as any).normalStart());
  const styleBadges=page.locator("#modal .style-mastery");
  await expect(styleBadges).toHaveCount(5);
  await expect(styleBadges).toHaveText(["★6","★3","★1","★12","★2"]);
  await expect(page.locator("#modal .stylelist")).not.toContainText(/Yeni|Deneyimli|Uzman|Usta|Efsane/);

  const gegen=page.locator("#modal .stylebtn[data-style='gegen']");
  await expect(gegen).toHaveAttribute("role","button");
  await expect(gegen).toHaveAttribute("tabindex","0");
  await expect(gegen).toHaveAttribute("aria-label",/Ustalık: Uzman · 6/);
  const badgeColor=await gegen.locator(".style-mastery").evaluate(element=>getComputedStyle(element).color);
  expect(badgeColor).not.toBe("rgb(242, 74, 40)");
});
