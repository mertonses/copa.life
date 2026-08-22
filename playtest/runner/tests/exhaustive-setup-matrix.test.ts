import {expect,test} from "@playwright/test";

const URL="/?autotest=1&setup-matrix=1";
const formations=["4-4-2","4-3-3","4-2-3-1","3-5-2","5-3-2","3-4-3","4-5-1","4-3-2-1","4-1-4-1","3-4-1-2"];
const chairmen=["babacan","leydi","pinti","sansasyoncu","torpilci","cilgin"];
const styles=["gegen","kontra","tiki","uzun","blok"];

test("every formation, chairman and play style is operable in all 300 setup combinations",async({page},testInfo)=>{
  test.skip(testInfo.project.name!=="desktop-chromium","one exhaustive browser matrix is sufficient");
  await page.addInitScript(()=>{
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.goto(URL,{waitUntil:"domcontentloaded"});
  await page.evaluate(async()=>{
    const game=globalThis as any;
    game._applyCheat();
    await game.pickCountry("TR");
  });

  await expect(page.locator("#formpick .fbtn")).toHaveCount(formations.length);
  for(const formation of formations){
    const button=page.locator("#formpick .fbtn",{hasText:formation});
    await button.click();
    await expect(button).toHaveAttribute("aria-pressed","true");
    expect(await page.evaluate(()=>({name:(globalThis as any).formName,slots:(globalThis as any).slots.length}))).toEqual({name:formation,slots:11});
  }

  await expect(page.locator("#chairpick")).toHaveCount(0);
  const chairSurface=page.locator("#chairSelectionSurface");
  await expect(chairSurface).toBeVisible();
  for(let index=0;index<chairmen.length;index++){
    const chairman=chairmen[index];
    await expect(chairSurface).toHaveAttribute("data-chair-id",chairman);
    await expect(chairSurface.locator(".js-chair-selected-mark")).toBeVisible();
    expect(await page.evaluate(()=>(globalThis as any).selectedChairId)).toBe(chairman);
    if(index<chairmen.length-1)await chairSurface.locator(".js-chair-next").click();
  }

  await page.evaluate(()=>{(globalThis as any).normalStart();});
  await expect(page.locator(".style-select-modal [data-style]")).toHaveCount(styles.length);
  for(const style of styles)await expect(page.locator(`.style-select-modal [data-style="${style}"]`)).toBeVisible();
  await page.evaluate(()=>{(globalThis as any).closeModal();});

  const matrix=await page.evaluate(async({formations,chairmen,styles})=>{
    const game=globalThis as any,failures:any[]=[];
    for(const formation of formations)for(const chairman of chairmen)for(const style of styles){
      game.pickForm(formation);
      game.confirmChair(chairman);
      game.pickStyle(style);
      await game.beginDraft();
      const actual=game.eval("({chair:chairman&&chairman.id,formation:formName,style,slots:slots.length,picks:picksBySlot.length,remaining,phase:CopaRunState.phase})");
      const valid=actual.chair===chairman&&actual.formation===formation&&actual.style===style&&
        actual.slots===11&&actual.picks===11&&actual.remaining===11&&actual.phase==="draft";
      if(!valid)failures.push({
        formation,chairman,style,actual
      });
    }
    return {tested:formations.length*chairmen.length*styles.length,failures};
  },{formations,chairmen,styles});
  expect(matrix.tested).toBe(300);
  expect(matrix.failures).toEqual([]);
});
