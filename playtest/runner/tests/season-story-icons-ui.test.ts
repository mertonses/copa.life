import {test,expect} from "@playwright/test";

test.use({serviceWorkers:"block"});

test("all season-story events use distinct contextual animated SVG icons",async({page},testInfo)=>{
  test.skip(!["desktop-chromium","mobile-chromium"].includes(testInfo.project.name),"desktop and mobile Chromium cover the icon-system contract");
  const errors:string[]=[];
  page.on("pageerror",error=>errors.push(error.message));
  await page.goto("/?season-story-icons=1",{waitUntil:"domcontentloaded"});
  await page.locator("#loader").waitFor({state:"detached"});
  const kinds=["economy","transfer","path","critical","card","injury","risk","star","chair","win","exit","note"];
  await page.evaluate(iconKinds=>{
    const game=globalThis as any;
    const gallery=document.createElement("div");
    gallery.id="storyIconGallery";
    gallery.className="result storyflow";
    gallery.innerHTML=iconKinds.map((kind,index)=>`<div class="storyevent story-${kind}"><div class="storymark"><span class="storyicon">${game.storyIcon(kind)}</span><span class="storynum">${String(index+1).padStart(2,"0")}</span></div><div class="storycopy"><b>${kind}</b></div></div>`).join("");
    document.body.appendChild(gallery);
  },kinds);

  const gallery=page.locator("#storyIconGallery");
  await expect(gallery.locator(".story-svg-icon")).toHaveCount(kinds.length);
  for(const kind of kinds)await expect(gallery.locator(`[data-story-icon="${kind}"]`)).toHaveCount(1);

  const state=await gallery.evaluate(element=>{
    const icons=[...element.querySelectorAll(".story-svg-icon")] as SVGElement[];
    return{
      unique:new Set(icons.map(icon=>icon.innerHTML)).size,
      animations:icons.map(icon=>getComputedStyle(icon.querySelector(".story-icon-motion") as Element).animationName),
      horizontal:(element as HTMLElement).scrollWidth-(element as HTMLElement).clientWidth,
    };
  });
  expect(state.unique).toBe(kinds.length);
  expect(state.animations.every(name=>name&&name!=="none")).toBe(true);
  expect(state.horizontal).toBeLessThanOrEqual(2);

  await page.evaluate(()=>document.body.classList.add("reduced-motion"));
  const reduced=await gallery.locator(".story-icon-motion").evaluateAll(nodes=>nodes.map(node=>getComputedStyle(node).animationName));
  expect(reduced.every(name=>name==="none")).toBe(true);
  expect(errors).toEqual([]);
});
