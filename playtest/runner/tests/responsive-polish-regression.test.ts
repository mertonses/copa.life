import {test,expect} from "@playwright/test";

test.beforeEach(async({page})=>{
  await page.addInitScript(()=>{localStorage.clear();sessionStorage.clear();});
  await page.goto("/?responsive-polish-regression=1",{waitUntil:"domcontentloaded"});
  await page.evaluate(()=>document.querySelector(".copa-coachmark")?.remove());
});

test("a locked chairman preview blocks start and announces the correction",async({page})=>{
  await page.locator(".js-chair-next").click();
  await expect(page.locator("#chairSelectionSurface")).toHaveClass(/is-chair-locked/);
  await page.evaluate(()=>(globalThis as any).normalStart());
  await expect(page.locator(".style-select-modal")).toHaveCount(0);
  await expect(page.locator(".js-chair-lock-warning")).toBeVisible();
  await expect(page.locator(".js-chair-lock-warning")).toContainText(/KİLİTLİ|LOCKED/);
});

test("draft selection commits synchronously without a scan state",async({page})=>{
  const result=await page.evaluate(()=>{
    const card=document.createElement("button");document.body.appendChild(card);
    let committed=false;
    const started=performance.now();
    (globalThis as any)._draftChooseWithFeedback(card,()=>{committed=true;});
    return{committed,elapsed:performance.now()-started,selecting:card.classList.contains("is-selecting"),busy:card.hasAttribute("aria-busy")};
  });
  expect(result.committed).toBe(true);
  expect(result.elapsed).toBeLessThan(30);
  expect(result.selecting).toBe(false);
  expect(result.busy).toBe(false);
});

test("risk icons have no active SVG animation",async({page})=>{
  const names=await page.evaluate(()=>{
    const host=document.createElement("div");host.className="risk-offer-icon";host.innerHTML='<svg class="risk-svg"><circle class="risk-icon-orbit"/><path class="risk-bolt"/></svg>';document.body.appendChild(host);
    return [...host.querySelectorAll<SVGElement>("*")].map(node=>getComputedStyle(node).animationName);
  });
  expect(names.every(name=>name==="none")).toBe(true);
});

test("positive Professor outcomes use the success palette",async({page})=>{
  const colors=await page.evaluate(()=>{
    (globalThis as any)._showKaosResult({good:true,type:"pow",label:"+4 GÜÇ",desc:"Bu maç güç bonusu"});
    const label=document.querySelector<HTMLElement>(".kaos-result.kr-good .kr-label")!;
    const reference=document.createElement("span");
    reference.style.color="var(--status-positive-text)";
    document.body.appendChild(reference);
    return{label:getComputedStyle(label).color,success:getComputedStyle(reference).color};
  });
  expect(colors.label).toBe(colors.success);
});

test("match recap excludes shot events",async({page})=>{
  const source=await page.evaluate(()=>String((globalThis as any).makeCoreMatchEvents));
  expect(source).not.toContain('"shot"');
  expect(source).toContain('"goal"');
  expect(source).toContain('"yellow"');
  expect(source).toContain('"red"');
});

test("settings can be toggled repeatedly without accumulating document listeners",async({page})=>{
  await page.addInitScript(()=>{
    const active={click:new Set<EventListenerOrEventListenerObject>(),keydown:new Set<EventListenerOrEventListenerObject>()};
    const add=EventTarget.prototype.addEventListener,remove=EventTarget.prototype.removeEventListener;
    EventTarget.prototype.addEventListener=function(type,listener,options){
      if(this===document&&(type==="click"||type==="keydown")&&listener)active[type].add(listener);
      return add.call(this,type,listener,options);
    };
    EventTarget.prototype.removeEventListener=function(type,listener,options){
      if(this===document&&(type==="click"||type==="keydown")&&listener)active[type].delete(listener);
      return remove.call(this,type,listener,options);
    };
    (globalThis as any).__documentListenerCounts=()=>({click:active.click.size,keydown:active.keydown.size});
  });
  await page.reload({waitUntil:"domcontentloaded"});
  const listenerCounts=()=>page.evaluate(()=>(globalThis as any).__documentListenerCounts());
  const settings=page.locator("#settingsBtn");
  // Warm up settings-only lazy initialization before taking the leak baseline.
  await settings.click();
  await page.waitForTimeout(20);
  await settings.click();
  await page.waitForTimeout(20);
  const before=await listenerCounts();
  for(let index=0;index<10;index++){
    await settings.click();
    await page.waitForTimeout(5);
    await settings.click();
  }
  await page.waitForTimeout(20);
  const after=await listenerCounts();
  expect(after.click).toBe(before.click);
  expect(after.keydown).toBe(before.keydown);
});
