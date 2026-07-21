import { test, expect, Page } from "@playwright/test";

const profile={
  name:"Sander van de Streek",ov:78,age:32,club:"Antalyaspor",
  natPos:"OOS (M)",pos:"OOS (M)",profileKey:"TR|sander van de streek|32|antalyaspor",
};

async function setTheme(page:Page,theme:"light"|"dark"){
  await page.evaluate(value=>{
    const global=globalThis as any;
    if(typeof global.setTheme==="function")global.setTheme(value);
    else document.documentElement.dataset.theme=value;
  },theme);
  await expect(page.locator("html")).toHaveAttribute("data-theme",theme);
  await page.waitForTimeout(220);
}

async function contrastFailures(page:Page){
  return page.evaluate(()=>{
    const parse=(value:string)=>{
      const match=value.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?/);
      return match?[Number(match[1]),Number(match[2]),Number(match[3]),match[4]===undefined?1:Number(match[4])]:null;
    };
    const mix=(top:number[],bottom:number[])=>{
      const alpha=top[3]+bottom[3]*(1-top[3]);
      return alpha?[0,1,2].map(index=>(top[index]*top[3]+bottom[index]*bottom[3]*(1-top[3]))/alpha).concat(alpha):bottom;
    };
    const linear=(value:number)=>{const channel=value/255;return channel<=.04045?channel/12.92:((channel+.055)/1.055)**2.4;};
    const luminance=(color:number[])=>.2126*linear(color[0])+.7152*linear(color[1])+.0722*linear(color[2]);
    const contrast=(a:number[],b:number[]) => (Math.max(luminance(a),luminance(b))+.05)/(Math.min(luminance(a),luminance(b))+.05);
    const failures:any[]=[];
    for(const element of Array.from(document.querySelectorAll<HTMLElement>("body *"))){
      const rect=element.getBoundingClientRect(),style=getComputedStyle(element);
      if(element.closest('[aria-hidden="true"]')||rect.width<1||rect.height<1||rect.bottom<=0||rect.right<=0||rect.top>=innerHeight||rect.left>=innerWidth||style.visibility==="hidden"||style.display==="none"||Number(style.opacity)<.5)continue;
      const text=Array.from(element.childNodes).filter(node=>node.nodeType===3).map(node=>node.textContent?.trim()||"").filter(Boolean).join(" ");
      if(!text)continue;
      const foreground=parse(style.color);
      if(!foreground)continue;
      let background=[0,0,0,0],parent:HTMLElement|null=element,gradient=false;
      while(parent){
        const parentStyle=getComputedStyle(parent);
        if(parentStyle.backgroundImage!=="none")gradient=true;
        const color=parse(parentStyle.backgroundColor);
        if(color&&color[3]>0)background=mix(color,background);
        if(background[3]>.98)break;
        parent=parent.parentElement;
      }
      if(gradient)continue;
      if(background[3]<.98)background=mix(parse(getComputedStyle(document.documentElement).backgroundColor)||[16,29,40,1],background);
      const fontSize=Number(style.fontSize.replace("px","")),bold=Number(style.fontWeight)>=700;
      const minimum=fontSize>=24||(fontSize>=18.66&&bold)?3:4.5;
      const ratio=contrast(foreground,background);
      if(ratio+.05<minimum)failures.push({text:text.slice(0,60),ratio:Number(ratio.toFixed(2)),fontSize,className:element.className,parentClass:element.parentElement?.className||""});
    }
    return failures.slice(0,30);
  });
}

async function expectReadable(page:Page,label:string){
  const failures=await contrastFailures(page);
  expect(failures,`${label}: ${JSON.stringify(failures,null,2)}`).toEqual([]);
}

for(const theme of ["light","dark"] as const){
  test(`${theme} theme keeps settings, popups, tooltips and profiles readable`,async({page})=>{
    const errors:string[]=[];
    page.on("pageerror",error=>errors.push(error.message));
    await page.goto(`/?theme-audit=${theme}`,{waitUntil:"domcontentloaded"});
    await setTheme(page,theme);
    const tokens=await page.evaluate(()=>{
      const style=getComputedStyle(document.documentElement);
      return {
        navy:style.getPropertyValue("--brand-navy").trim(),
        orange:style.getPropertyValue("--brand-orange").trim(),
        red:style.getPropertyValue("--brand-red").trim(),
        burgundy:style.getPropertyValue("--brand-burgundy").trim(),
        paper:style.getPropertyValue("--brand-paper").trim(),
        success:style.getPropertyValue("--status-success").trim(),
      };
    });
    expect(tokens).toEqual({
      navy:"#101D28",orange:"#F24A28",red:"#DA3D2E",
      burgundy:"#420102",paper:"#F3F5F4",success:"#4E9B65",
    });
    const ratingScale=await page.evaluate(()=>{
      const global=globalThis as any;
      return [95,85,75,65,55].map(value=>[global.ovCol(value),global.ovOnCol(value)]);
    });
    expect(ratingScale).toEqual([
      ["var(--rating-elite-bg)","var(--rating-on-elite)"],
      ["var(--rating-good-bg)","var(--rating-on-good)"],
      ["var(--rating-average-bg)","var(--rating-on-average)"],
      ["var(--rating-weak-bg)","var(--rating-on-weak)"],
      ["var(--rating-worst-bg)","var(--rating-on-worst)"],
    ]);
    await expectReadable(page,`${theme} intro`);

    const formation=page.locator("#formpick .fbtn:not(.sel):not(.locked)").first();
    await formation.hover();
    await page.waitForTimeout(220);
    const formationColors=await formation.evaluate(element=>{
      const button=getComputedStyle(element);
      const preview=element.querySelector<HTMLElement>(".form-dot-preview");
      const previewStyle=preview?getComputedStyle(preview):null;
      return {
        buttonBorder:button.borderTopColor,
        previewBackground:previewStyle?.backgroundColor,
        previewColor:previewStyle?.color,
      };
    });
    expect(formationColors.buttonBorder).toBe("rgb(242, 74, 40)");
    expect(formationColors.previewColor).toBe("rgb(243, 245, 244)");
    expect(formationColors.previewBackground).toBe(theme==="light"?"rgb(16, 29, 40)":"rgb(48, 60, 68)");
    await expectReadable(page,`${theme} formation hover`);

    await page.locator("#settingsBtn").click();
    await expect(page.locator("#settingsDrop")).toBeVisible();
    await expectReadable(page,`${theme} settings`);
    await page.keyboard.press("Escape");

    await page.evaluate(()=>{
      (globalThis as any).showModal(`
        <section style="padding:16px">
          <h2 style="margin:0 0 8px">Tema okunurluk kontrolü</h2>
          <p style="color:var(--text-secondary)">Modal, alanlar ve yardımcı katmanlar aynı semantik renkleri kullanır.</p>
          <label style="display:grid;gap:4px;margin:12px 0">Kulüp adı<input value="Copa Test"></label>
          <div class="tooltip" role="tooltip" style="position:static;display:block;padding:8px">Kısa ve anlaşılır tooltip metni</div>
          <button class="btn btn-primary" type="button">Devam</button>
        </section>`,{dismissOnOverlay:true,label:"Tema okunurluk kontrolü"});
    });
    await expect(page.locator("#modal")).toBeVisible();
    const primary=page.locator("#modal .btn-primary");
    await expect(primary).toHaveCount(1);
    await page.mouse.move(0,0);
    await page.waitForTimeout(100);
    const normalButtonBg=await primary.evaluate(element=>getComputedStyle(element).backgroundColor);
    await primary.hover();
    await page.waitForTimeout(180);
    const hoverButtonBg=await primary.evaluate(element=>getComputedStyle(element).backgroundColor);
    expect(hoverButtonBg).not.toBe(normalButtonBg);
    await primary.focus();
    const focusStyle=await primary.evaluate(element=>{
      const style=getComputedStyle(element);
      return {outline:style.outlineColor,shadow:style.boxShadow};
    });
    expect(focusStyle.outline).toBe("rgb(242, 74, 40)");
    expect(focusStyle.shadow).not.toBe("none");
    await expectReadable(page,`${theme} modal and tooltip`);
    await page.evaluate(()=>(globalThis as any).closeModal());

    await page.evaluate(async()=>{const global=globalThis as any;await global.CopaLazy.ensureChairPicker();global.showChairPopup("babacan");});
    const disadvantage=page.locator(".chair-picker-modal .cp-hl-con");
    await expect(disadvantage).toContainText("−2");
    const disadvantageStyle=await disadvantage.evaluate(element=>{const style=getComputedStyle(element);return{color:style.color,background:style.backgroundColor,border:style.borderTopColor};});
    expect(disadvantageStyle.background).not.toBe("rgba(0, 0, 0, 0)");
    expect(disadvantageStyle.color).not.toBe(disadvantageStyle.background);
    expect(disadvantageStyle.border).not.toBe(disadvantageStyle.background);
    await expectReadable(page,`${theme} chairman disadvantage`);
    await page.evaluate(()=>(globalThis as any).closeModal());

    await page.evaluate(()=>{const global=globalThis as any;global.showModal(global.suspendedBlockModalHTML("T. Arslan"));});
    await expect(page.locator(".suspended-modal-head h4")).toContainText(/Cezalı oyuncu sahada|Suspended player in lineup/);
    await expect(page.locator(".suspended-modal-note")).toBeVisible();
    await expectReadable(page,`${theme} suspended-player warning`);
    await page.evaluate(()=>(globalThis as any).closeModal());

    await page.evaluate(async()=>{const global=globalThis as any;await global.CopaLazy.ensureMetaProgression();global.showModal(`<div class="meta-progress-modal" style="min-width:0;padding:16px"><article class="meta-run-row is-out"><span class="meta-run-main"><b>TEST FK</b><small>21 Tem · 4-3-3</small></span><span class="meta-run-result"><b>Elendi</b><small>4/6 · +46 itibar</small></span></article></div>`);});
    await expect(page.locator(".meta-run-row.is-out .meta-run-result>b")).toHaveText("Elendi");
    await expectReadable(page,`${theme} career eliminated status`);
    await page.evaluate(()=>(globalThis as any).closeModal());

    await page.evaluate(value=>{
      const global=globalThis as any;
      global.pickCountry("TR");
      global.PlayerProfiles.open(value,document.querySelector("#intro")||document.body,"keyboard");
    },profile);
    await expect(page.locator(".player-profile-layer")).toHaveAttribute("aria-hidden","false");
    await expectReadable(page,`${theme} player profile`);
    await page.locator(".player-profile-close").click();

    await page.locator("#advancedToggle").click();
    await expect(page.locator("[data-advanced-settings]")).toBeVisible();
    await expectReadable(page,`${theme} advanced settings`);
    expect(errors).toEqual([]);
  });
}

test("both themes remain readable on the mobile hub and decision modal",async({page},testInfo)=>{
  test.skip(testInfo.project.name!=="mobile-chromium","phone theme audit");
  await page.goto("/?mobile-theme-audit=1",{waitUntil:"domcontentloaded"});
  await page.evaluate(()=>{(globalThis as any).quickStart();(globalThis as any).quickAll();});
  await expect(page.locator("#postClubName")).toBeVisible();
  await page.locator("#postClubName").fill("Tema Test FK");
  await page.evaluate(()=>{const w=globalThis as any;w.pcGo();w.fastTournamentDraw();w.finishTournamentDraw();});
  await expect(page.locator("#hub")).toBeVisible();
  await page.evaluate(()=>{(globalThis as any).setCaptain(0);(globalThis as any).closeModal();});

  for(const theme of ["light","dark"] as const){
    await setTheme(page,theme);
    await expectReadable(page,`${theme} mobile hub`);
    await page.evaluate(()=>{(globalThis as any).showPowerInfo();});
    await expect(page.locator("#modal")).toBeVisible();
    await expectReadable(page,`${theme} mobile power popup`);
    await page.evaluate(()=>{(globalThis as any).closeModal();});
    await page.evaluate(()=>{(globalThis as any).showTrustInfo();});
    await expect(page.locator("#modal")).toBeVisible();
    await expectReadable(page,`${theme} mobile trust popup`);
    await page.evaluate(()=>{(globalThis as any).closeModal();});
  }
});

for(const theme of ["light","dark"] as const){
  test(`${theme} semantic metrics and football fields keep their intended meaning`,async({page},testInfo)=>{
    test.skip(testInfo.project.name==="mobile-chromium","desktop semantic audit");
    await page.goto(`/?semantic-audit=${theme}`,{waitUntil:"domcontentloaded"});
    await setTheme(page,theme);
    await page.evaluate(()=>{
      document.body.insertAdjacentHTML("beforeend",`
        <section id="semanticAudit" style="position:fixed;inset:12px;z-index:20000;padding:16px;background:var(--surface-elevated)">
          <p><b class="bd-value-positive">+€22M gelir</b></p>
          <p><b class="bd-value-negative">-€27M borç</b></p>
          <div class="result"><div class="scoreboard elendi"><div class="big">ELENDİN</div></div></div>
          <div class="last-match-report"><div class="lmr-pitch" style="height:120px"></div></div>
          <div class="pen-modal"><div class="pen-goal" style="height:120px!important"></div></div>
        </section>`);
    });
    const semantics=await page.evaluate(()=>{
      const root=getComputedStyle(document.documentElement);
      const style=(selector:string)=>getComputedStyle(document.querySelector<HTMLElement>(selector)!);
      const resolve=(token:string)=>{
        const probe=document.createElement("i");
        probe.style.color=`var(${token})`;
        document.body.appendChild(probe);
        const color=getComputedStyle(probe).color;
        probe.remove();
        return color;
      };
      return {
        positive:style("#semanticAudit .bd-value-positive").color,
        positiveToken:resolve("--status-positive-text"),
        negative:style("#semanticAudit .bd-value-negative").color,
        negativeToken:resolve("--status-negative-text"),
        fieldGrass:root.getPropertyValue("--field-grass").trim(),
        action:root.getPropertyValue("--action-primary").trim(),
        reportPitch:style("#semanticAudit .lmr-pitch").backgroundImage,
        penaltyPitch:style("#semanticAudit .pen-goal").backgroundImage,
      };
    });
    expect(semantics.fieldGrass).not.toBe(semantics.action);
    expect(semantics.positive).toBe(semantics.positiveToken);
    expect(semantics.negative).toBe(semantics.negativeToken);
    expect(semantics.reportPitch).not.toContain("242, 74, 40");
    expect(semantics.penaltyPitch).not.toContain("242, 74, 40");
    await expectReadable(page,`${theme} semantic states and fields`);
  });
}
