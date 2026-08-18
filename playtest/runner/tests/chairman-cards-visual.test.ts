import {test,expect} from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const output=path.resolve(__dirname,"../../../outputs/ui-visuals/chairman-cards");

test.beforeEach(async({page})=>{
  await page.addInitScript(()=>{
    localStorage.clear();
    sessionStorage.clear();
  });
});

test("chairman cards match the compact premium reference",async({page},testInfo)=>{
  await page.goto("/?chairman-cards-visual-qa=1",{waitUntil:"domcontentloaded"});
  await page.evaluate(async()=>{
    const game=globalThis as any;
    game._applyCheat();
    await game.pickCountry("TR");
  });
  await page.waitForFunction(()=>document.querySelectorAll("#chairpick .chairbtn").length===6,{timeout:20_000});
  const cards=page.locator("#chairpick .chair-card");
  await expect(cards).toHaveCount(6);
  await expect(page.locator("#chairpick")).toBeVisible();
  await page.locator("#chairpick").scrollIntoViewIfNeeded();

  const layout=await cards.evaluateAll(nodes=>nodes.map(node=>{
    const card=node as HTMLElement;
    const rect=card.getBoundingClientRect();
    const image=card.querySelector<HTMLElement>(".portrait")!.getBoundingClientRect();
    const copy=card.querySelector<HTMLElement>(".card-copy")!.getBoundingClientRect();
    const roleNode=card.querySelector<HTMLElement>(".chairbtn-role")!;
    const roleRect=roleNode.getBoundingClientRect();
    const footers=[...card.querySelectorAll<HTMLElement>(".card-foot")].filter(item=>getComputedStyle(item).display!=="none");
    const footerRect=footers[0]?.getBoundingClientRect();
    const legacyDetails=[...card.querySelectorAll<HTMLElement>(".chair-detail-link")].filter(item=>getComputedStyle(item).display!=="none");
    return{
      left:rect.left,right:rect.right,top:rect.top,bottom:rect.bottom,
      imageHeight:image.height,copyHeight:copy.height,footerCount:footers.length,
      roleRect:{top:roleRect.top,height:roleRect.height,display:getComputedStyle(roleNode).display,color:getComputedStyle(roleNode).color},
      footerRect:footerRect?{top:footerRect.top,height:footerRect.height}:null,
      name:card.querySelector<HTMLElement>(".chairbtn-name")?.textContent?.trim(),
      role:card.querySelector<HTMLElement>(".chairbtn-role")?.textContent?.trim(),
      detail:footers[0]?.textContent?.replace(/\s+/g," ").trim(),
      legacyDetails:legacyDetails.length,
      overflow:card.scrollWidth-card.clientWidth,
    };
  }));
  expect(layout.every(card=>card.imageHeight>100&&card.copyHeight>30&&card.footerCount===1&&card.legacyDetails===0&&card.name&&card.role&&card.roleRect.height>0&&card.roleRect.display!=="none"&&/^(DETAY|DETAILS) →$/.test(card.detail||"")&&card.overflow<=1),JSON.stringify(layout)).toBe(true);
  const expectedImageHeight=testInfo.project.name.includes("mobile")?150:205;
  expect(layout.every(card=>Math.abs(card.imageHeight-expectedImageHeight)<=1),JSON.stringify(layout)).toBe(true);
  expect(Math.max(...layout.map(card=>card.bottom-card.top))-Math.min(...layout.map(card=>card.bottom-card.top))).toBeLessThanOrEqual(2);
  const rows=[...new Set(layout.map(card=>Math.round(card.top)))].map(top=>layout.filter(card=>Math.abs(card.top-top)<=2).sort((a,b)=>a.left-b.left));
  expect(rows.every(row=>row.slice(1).every((card,index)=>card.left>=row[index].right-1))).toBe(true);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);

  fs.mkdirSync(output,{recursive:true});
  await page.screenshot({path:path.join(output,`${testInfo.project.name}.png`),fullPage:false});

  // Mockup behavior parity: opening a card must produce the profile-card flow,
  // while retaining the selection state in the game.
  await cards.first().click();
  await expect(page.locator(".chair-picker-modal")).toBeVisible();
  await expect(page.locator(".chair-picker-modal .chairpopup-name")).toContainText("Patron");
  await page.screenshot({path:path.join(output,`profile-${testInfo.project.name}.png`),fullPage:false});
});
