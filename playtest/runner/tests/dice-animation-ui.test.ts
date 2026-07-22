import {test,expect} from "@playwright/test";

test.beforeEach(async({page})=>{
  await page.addInitScript(()=>localStorage.setItem("copa.guide.context.v2",JSON.stringify({setup:1,draft:1,hub:1,bench:1,injury:1,table:1})));
});

async function openDraft(page:any){
  await page.goto("/?dice-animation=1",{waitUntil:"domcontentloaded"});
  await page.evaluate(async()=>{await (globalThis as any).quickStart();});
  await expect(page.locator("#draft")).toBeVisible();
  await expect(page.locator("#rollBtn")).toBeVisible();
}

test("dice roll remains visibly animated before candidates appear",async({page})=>{
  await openDraft(page);
  await page.locator("#rollBtn").click();
  const box=page.locator("#dicebox");
  await expect(box).toBeVisible();
  await expect(box).toHaveAttribute("aria-busy","true");
  await expect(page.locator("#fxCap")).toContainText(/ZAR DÖNÜYOR|ROLLING/i);
  await expect(page.locator("#fxDie")).toHaveCSS("animation-name","copaDiceTumble");
  await expect(page.locator("#optstage")).toBeVisible({timeout:1800});
  await expect(box).toBeHidden();
});

test("reduced motion keeps clear roll feedback without tumbling",async({page})=>{
  await page.emulateMedia({reducedMotion:"reduce"});
  await openDraft(page);
  await page.locator("#rollBtn").click();
  const box=page.locator("#dicebox");
  await expect(box).toBeVisible();
  await expect(box).toHaveClass(/is-reduced/);
  await expect(page.locator("#fxCap")).toContainText(/MEVKİ BELİRLENDİ|POSITION SET/i);
  await expect(page.locator("#fxDie")).toHaveCSS("animation-name","none");
  await expect(page.locator("#optstage")).toBeVisible({timeout:1000});
  await expect(box).toBeHidden();
});
