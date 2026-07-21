import {test,expect,type Page} from "@playwright/test";

async function openFaq(page:Page,path="/"){
  const errors:string[]=[];
  page.on("pageerror",error=>errors.push(error.message));
  await page.goto(path,{waitUntil:"domcontentloaded"});
  await page.locator("#footerFaqBtn").click();
  await expect(page.locator(".faq-modal")).toBeVisible();
  return errors;
}

async function assertAccordion(page:Page){
  const modal=page.locator(".faq-modal");
  const items=modal.locator(".faq-item");
  await expect(items).toHaveCount(6);
  await expect(items.first()).toHaveAttribute("open","");
  await items.nth(1).locator("summary").click();
  await expect(items.nth(1)).toHaveAttribute("open","");
  await expect(items.first()).not.toHaveAttribute("open","");
  const overflow=await modal.evaluate(element=>({
    horizontal:(element as HTMLElement).scrollWidth-(element as HTMLElement).clientWidth,
    viewportRight:Math.round(element.getBoundingClientRect().right-window.innerWidth),
  }));
  expect(overflow.horizontal).toBeLessThanOrEqual(2);
  expect(overflow.viewportRight).toBeLessThanOrEqual(0);
}

test("footer opens a compact accessible FAQ accordion",async({page},testInfo)=>{
  test.skip(testInfo.project.name!=="desktop-chromium","desktop contract");
  const errors=await openFaq(page,"/?faq-modal=1");
  await assertAccordion(page);
  await expect(page.locator(".faq-modal-actions a")).toHaveAttribute("href",/faq\.html\?lang=/);
  await page.keyboard.press("Escape");
  await expect(page.locator(".faq-modal")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("FAQ modal is translated in all five game languages",async({page},testInfo)=>{
  test.skip(testInfo.project.name!=="desktop-chromium","one browser is enough for copy coverage");
  await page.goto("/?faq-locales=1",{waitUntil:"domcontentloaded"});
  const expected:{[key:string]:[string,string]}={
    tr:["SSS","Sık Sorulan Sorular"],
    en:["FAQ","Frequently Asked Questions"],
    es:["FAQ","Preguntas frecuentes"],
    de:["FAQ","Häufig gestellte Fragen"],
    it:["FAQ","Domande frequenti"],
  };
  for(const [language,[short,title]] of Object.entries(expected)){
    await page.evaluate(lang=>{(globalThis as any).setLang(lang);},language);
    await expect(page.locator("#footerFaqBtn")).toHaveText(short);
    await page.locator("#footerFaqBtn").click();
    await expect(page.locator(".faq-modal h2")).toHaveText(title);
    await expect(page.locator(".faq-item")).toHaveCount(6);
    await page.evaluate(()=>{(globalThis as any).closeModal();});
  }
});

test("shareable FAQ page switches language without layout overflow",async({page},testInfo)=>{
  test.skip(testInfo.project.name!=="mobile-chromium","mobile page contract");
  const errors:string[]=[];
  page.on("pageerror",error=>errors.push(error.message));
  await page.goto("/faq.html?lang=tr",{waitUntil:"domcontentloaded"});
  await expect(page.locator(".faq-page-main .faq-item")).toHaveCount(9);
  await page.locator('[data-lang="en"]').click();
  await expect(page.locator("h1")).toHaveText("Frequently Asked Questions");
  await expect(page).toHaveURL(/lang=en/);
  await page.locator(".faq-page-main .faq-item").nth(2).locator("summary").click();
  await expect(page.locator(".faq-page-main .faq-item").nth(2)).toHaveAttribute("open","");
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(2);
  expect(errors).toEqual([]);
});

test("Android and iOS packages retain the native-safe FAQ",async({page},testInfo)=>{
  const path=testInfo.project.name==="mobile-chromium"
    ?"/dist-android/index.html?faq-native=android"
    :testInfo.project.name==="webkit-mobile"
      ?"/dist-ios/index.html?faq-native=ios"
      :"";
  test.skip(!path,"native mobile package contract");
  const errors=await openFaq(page,path);
  await assertAccordion(page);
  const fullPage=path.startsWith("/dist-android")?"/dist-android/faq.html?lang=en":"/dist-ios/faq.html?lang=en";
  await page.goto(fullPage,{waitUntil:"domcontentloaded"});
  await expect(page.locator("h1")).toHaveText("Frequently Asked Questions");
  expect(errors).toEqual([]);
});
