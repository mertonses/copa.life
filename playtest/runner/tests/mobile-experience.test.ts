import { test, expect } from "@playwright/test";

const mobileOnly=(projectName:string)=>projectName==="mobile-chromium";

test("mobile primary actions use one safe-area aware dock without cloning controls",async({page},testInfo)=>{
  test.skip(!mobileOnly(testInfo.project.name),"phone interaction contract");
  await page.goto("/?mobile-experience=1",{waitUntil:"domcontentloaded"});

  const dock=page.locator("#mobileActionDock");
  await expect(dock).toBeVisible();
  await expect(dock.locator("#startBtn")).toHaveCount(1);
  await expect(page.locator("#startBtn")).toHaveCount(1);
  await expect(dock).toHaveAttribute("data-dock-kind","intro");

  const metrics=await page.locator("#startBtn").evaluate(element=>{
    const rect=element.getBoundingClientRect();
    const dockElement=element.closest("#mobileActionDock") as HTMLElement;
    const style=getComputedStyle(dockElement);
    return{
      height:rect.height,
      bottom:Math.round(innerHeight-rect.bottom),
      safeAreaPadding:style.paddingBottom,
    };
  });
  expect(metrics.height).toBeGreaterThanOrEqual(48);
  expect(metrics.bottom).toBeGreaterThanOrEqual(6);
  expect(metrics.safeAreaPadding).not.toBe("");

  await page.evaluate(()=>{(globalThis as any).quickStart();});
  await expect(page.locator("#draft")).toBeVisible();
  await expect(dock).toBeHidden();
});

test("narrow hub keeps the action dock at the viewport bottom and clickable after modal cycles",async({page},testInfo)=>{
  test.skip(!["desktop-chromium","webkit-mobile"].includes(testInfo.project.name),"narrow viewport and iOS contract");
  if(testInfo.project.name==="desktop-chromium")await page.setViewportSize({width:430,height:932});
  await page.goto("/?mobile-hub-dock=1",{waitUntil:"domcontentloaded"});
  await page.evaluate(()=>{(globalThis as any).quickStart();(globalThis as any).quickAll();});
  await expect(page.locator("#postClubName")).toBeVisible();
  await page.locator("#postClubName").fill("Dock Test FK");
  await page.evaluate(()=>{(globalThis as any).pcGo();});
  await expect(page.locator("#hub")).toBeVisible();
  await page.evaluate(()=>{(globalThis as any).setCaptain(0);(globalThis as any).closeModal();});

  const dock=page.locator("#mobileActionDock");
  await expect(dock).toBeVisible();
  await expect(dock).toHaveAttribute("data-dock-kind","hub");
  const dockMetrics=await dock.evaluate(element=>{
    const rect=element.getBoundingClientRect();
    const talk=document.getElementById("talkBtn") as HTMLElement;
    const talkRect=talk.getBoundingClientRect();
    const hit=document.elementFromPoint(talkRect.left+talkRect.width/2,talkRect.top+talkRect.height/2);
    return{
      position:getComputedStyle(element).position,
      viewportBottom:Math.round(innerHeight-rect.bottom),
      pointerEvents:getComputedStyle(element).pointerEvents,
      hitId:(hit&&hit.closest("button") as HTMLElement|null)?.id||"",
    };
  });
  expect(dockMetrics).toEqual({
    position:"fixed",
    viewportBottom:0,
    pointerEvents:"auto",
    hitId:"talkBtn",
  });

  await page.locator("#talkBtn").click();
  await expect(page.locator("#modal")).toBeVisible();
  await page.evaluate(()=>{(globalThis as any).closeModal();});
  await expect(dock).toBeVisible();
  await expect(dock).toHaveAttribute("data-dock-kind","hub");
  const remountHit=await page.locator("#presBtn").evaluate(element=>{
    const rect=element.getBoundingClientRect();
    const centerHit=(value:DOMRect)=>{
      const hit=document.elementFromPoint(value.left+value.width/2,value.top+value.height/2);
      return(hit&&hit.closest("button") as HTMLElement|null)?.id||"";
    };
    const playRect=document.getElementById("playBtn")!.getBoundingClientRect();
    const talkRect=document.getElementById("talkBtn")!.getBoundingClientRect();
    return{
      hitIds:[centerHit(rect),centerHit(talkRect),centerHit(playRect)],
      pres:[rect.left,rect.top,rect.right,rect.bottom].map(Math.round),
      play:[playRect.left,playRect.top,playRect.right,playRect.bottom].map(Math.round),
      talk:[talkRect.left,talkRect.top,talkRect.right,talkRect.bottom].map(Math.round),
    };
  });
  expect(remountHit.hitIds,JSON.stringify(remountHit)).toEqual(["presBtn","talkBtn","playBtn"]);
  await page.locator("#talkBtn").click();
  await expect(page.locator("#modal")).toBeVisible();
});

test("mobile preferences stay opt-in and draft choices expose decision context",async({page},testInfo)=>{
  test.skip(!mobileOnly(testInfo.project.name),"phone interaction contract");
  await page.goto("/?mobile-preferences=1",{waitUntil:"domcontentloaded"});
  await page.locator("#settingsBtn").click();
  const preferences=page.locator(".mobile-pref-group .mobile-pref-btn");
  await expect(preferences).toHaveCount(5);
  await expect(page.locator("#mobileHapticBtn")).toHaveAttribute("aria-pressed","false");
  await expect(page.locator("#mobileSmartSpeedBtn")).toHaveAttribute("aria-pressed","false");
  await page.locator("#mobileConfirmPickBtn").click();
  await expect(page.locator("#mobileConfirmPickBtn")).toHaveAttribute("aria-pressed","true");
  await page.locator("#settingsBtn").click();

  await page.evaluate(()=>{(globalThis as any).quickStart();});
  await expect(page.locator("#mobileDraftContext")).toBeVisible();
  await page.evaluate(()=>{(globalThis as any).roll();});
  await expect(page.locator("#optstage")).toBeVisible();
  await expect(page.locator("#opts .mobile-candidate-impact")).toHaveCount(3);
  const choice=page.locator("#opts .opt:not(.tooexp)").first();
  await choice.click();
  await expect(page.locator("#mobileDraftConfirm")).toBeVisible();
  await expect(page.locator("#mobileDraftConfirm")).toContainText(/Kasa sonra|Cash after/);
  await page.locator("[data-draft-confirm]").click();
  await expect(page.locator("#mobileDraftConfirm")).toHaveCount(0);
  await expect(page.locator("#rollstage")).toBeVisible();
});

test("desktop keeps primary actions in their original layout",async({page},testInfo)=>{
  test.skip(testInfo.project.name!=="desktop-chromium","desktop layout contract");
  await page.goto("/?desktop-experience=1",{waitUntil:"domcontentloaded"});
  await expect(page.locator("#mobileActionDock")).toBeHidden();
  await expect(page.locator(".v7-cta-stack #startBtn")).toHaveCount(1);
});

test("mobile match segments switch presentation without pausing the simulation",async({page},testInfo)=>{
  test.skip(!mobileOnly(testInfo.project.name),"phone interaction contract");
  await page.goto("/?mobile-segments=1",{waitUntil:"domcontentloaded"});
  await page.evaluate(()=>{
    document.querySelector("#intro")?.classList.add("hidden");
    document.querySelector("#sim")?.classList.remove("hidden");
    (globalThis as any).CopaMobileExperience?.refresh();
  });

  const nav=page.locator(".mobile-sim-tabs");
  await expect(nav).toBeVisible();
  await expect(nav.locator("button")).toHaveCount(3);
  await expect(nav.locator('[data-sim-view="field"]')).toHaveAttribute("aria-selected","true");
  await expect(page.locator("#sim .fieldframe")).toBeVisible();
  await expect(page.locator("#sim .eventpanel")).toBeHidden();

  const hitAreas=await nav.locator("button").evaluateAll(elements=>elements.map(element=>{
    const rect=element.getBoundingClientRect();
    return[Math.round(rect.width),Math.round(rect.height)];
  }));
  for(const [width,height] of hitAreas){
    expect(width).toBeGreaterThanOrEqual(44);
    expect(height).toBeGreaterThanOrEqual(44);
  }

  await nav.locator('[data-sim-view="events"]').click();
  await expect(page.locator("#sim .eventpanel")).toBeVisible();
  await expect(page.locator("#sim .fieldframe")).toBeHidden();
  await nav.locator('[data-sim-view="stats"]').click();
  await expect(page.locator("#simStats")).toBeVisible();
  await expect(page.locator("#sim .simstage")).toBeHidden();
});

test("mobile player profile uses a near-full-height sheet with persistent controls",async({page},testInfo)=>{
  test.skip(!mobileOnly(testInfo.project.name),"phone interaction contract");
  await page.goto("/?mobile-profile-sheet=1",{waitUntil:"domcontentloaded"});
  await page.evaluate(()=>{
    (globalThis as any).PlayerProfiles.open({
      name:"Joshua Kimmich",ov:87,age:30,club:"FC Bayern München",
      natPos:"SĞB",pos:"SĞB",profileKey:"DE|joshua kimmich|30|fc bayern munchen",
    },document.querySelector("#intro"),"keyboard");
  });

  const card=page.locator(".player-profile-card");
  await expect(page.locator(".player-profile-layer")).toHaveClass(/is-sheet/);
  const dimensions=await card.evaluate(element=>{
    const rect=element.getBoundingClientRect();
    const close=element.querySelector(".player-profile-close") as HTMLElement;
    return{
      height:rect.height,
      viewport:innerHeight,
      closeHeight:close.getBoundingClientRect().height,
      closePosition:getComputedStyle(close).position,
    };
  });
  expect(dimensions.height/dimensions.viewport).toBeGreaterThanOrEqual(.89);
  expect(dimensions.closeHeight).toBeGreaterThanOrEqual(44);
  expect(["absolute","sticky"]).toContain(dimensions.closePosition);
});

test("single tap keeps placement active while the peek detail opens and closes safely",async({page},testInfo)=>{
  test.skip(!mobileOnly(testInfo.project.name),"phone interaction contract");
  await page.goto("/?mobile-player-peek=1",{waitUntil:"domcontentloaded"});
  await page.evaluate(()=>{(globalThis as any).quickStart();(globalThis as any).quickAll();});
  await expect(page.locator("#postClubName")).toBeVisible();
  await page.locator("#postClubName").fill("Peek Test FK");
  await page.evaluate(()=>{(globalThis as any).pcGo();});
  await expect(page.locator("#hub")).toBeVisible();
  await page.evaluate(()=>{(globalThis as any).setCaptain(0);(globalThis as any).closeModal();});

  const player=page.locator("#hubPitch .roundel.full").first();
  await player.click();
  await expect(player).toHaveClass(/tap-selected/);
  await expect(page.locator("#tapHelperBar")).toBeVisible();
  await expect(page.locator("#tapHelperMeta")).toContainText(/OVR/);
  await expect(page.locator("#tapDetailBtn")).toBeVisible();
  await page.locator("#tapDetailBtn").click();
  await expect(page.locator(".player-profile-layer")).toHaveAttribute("aria-hidden","false");
  await expect(page.locator(".mobile-profile-nav")).toBeVisible();
  await page.locator(".player-profile-close").click();
  await expect(page.locator(".player-profile-layer")).toHaveAttribute("aria-hidden","true");
  await expect(player).toHaveClass(/tap-selected/);
  await page.locator(".tap-cancel").click();
  await expect(player).not.toHaveClass(/tap-selected/);
});

test("hub context and result details stay compact without hiding information",async({page},testInfo)=>{
  test.skip(!mobileOnly(testInfo.project.name),"phone interaction contract");
  await page.goto("/?mobile-result-disclosures=1",{waitUntil:"domcontentloaded"});
  await page.evaluate(()=>{(globalThis as any).quickStart();(globalThis as any).quickAll();});
  await expect(page.locator("#postClubName")).toBeVisible();
  await page.locator("#postClubName").fill("Mobile Result FK");
  await page.evaluate(()=>{(globalThis as any).pcGo();});
  await expect(page.locator("#hub")).toBeVisible();
  await expect(page.locator("#mobileRoundDigest")).toHaveCount(0);
  await page.evaluate(()=>{
    const global=globalThis as any;
    global.pushFeed("Mobil gelişme 1","form");
    global.pushFeed("Mobil gelişme 2","form");
    global.pushFeed("Mobil gelişme 3","form");
  });
  await expect(page.locator("#mobileFeedToggle")).toBeVisible();
  await page.evaluate(()=>{(globalThis as any).setCaptain(0);(globalThis as any).closeModal();(globalThis as any).endRun(false);});
  await expect(page.locator("#result")).toBeVisible();
  await expect(page.locator("#result .scoreboard")).toBeVisible();
  const resultActions=page.locator("#result .result-row .btn");
  await expect(resultActions).toHaveCount(2);
  const resultActionLayout=await resultActions.evaluateAll(elements=>elements.map(element=>{
    const rect=element.getBoundingClientRect();
    const label=element.querySelector(".result-action-label") as HTMLElement;
    const labelRect=label.getBoundingClientRect();
    const style=getComputedStyle(element);
    return{
      top:Math.round(rect.top),
      height:Math.round(rect.height),
      width:Math.round(rect.width),
      alignItems:style.alignItems,
      justifyContent:style.justifyContent,
      labelCenter:Math.round(labelRect.top+labelRect.height/2),
      buttonCenter:Math.round(rect.top+rect.height/2),
    };
  }));
  expect(new Set(resultActionLayout.map(item=>item.top)).size).toBe(1);
  expect(new Set(resultActionLayout.map(item=>item.height)).size).toBe(1);
  expect(resultActionLayout.every(item=>item.width>0&&item.alignItems==="center"&&item.justifyContent==="center")).toBe(true);
  expect(resultActionLayout.every(item=>Math.abs(item.labelCenter-item.buttonCenter)<=12)).toBe(true);
  const disclosures=page.locator("#result .mobile-result-disclosure:not(.hidden)");
  expect(await disclosures.count()).toBeGreaterThanOrEqual(2);
  const story=page.locator("#storyTile");
  await expect(story).toBeHidden();
  await page.locator(".mobile-result-disclosure>summary").filter({hasText:/SEZON HİKÂYESİ|SEASON STORY/}).click();
  await expect(story).toBeVisible();
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});

test("desktop result keeps season story, economy and lineups in the document flow",async({page},testInfo)=>{
  test.skip(testInfo.project.name!=="desktop-chromium","desktop result contract");
  await page.goto("/?desktop-result-sections=1",{waitUntil:"domcontentloaded"});
  await page.evaluate(()=>{(globalThis as any).quickStart();(globalThis as any).quickAll();});
  await expect(page.locator("#postClubName")).toBeVisible();
  await page.locator("#postClubName").fill("Desktop Result FK");
  await page.evaluate(()=>{(globalThis as any).pcGo();});
  await expect(page.locator("#hub")).toBeVisible();
  await page.evaluate(()=>{
    const global=globalThis as any;
    global.setCaptain(0);
    global.closeModal();
    const home=global.picksBySlot.filter(Boolean).slice(0,11);
    const away=home.map((player:any,index:number)=>({...player,name:`Rakip Oyuncu ${index+1}`}));
    global.LastMatchReport.capture({
      round:5,
      homeName:"Desktop Result FK",
      awayName:"Rakip FK",
      homeFormation:global.formName,
      awayFormation:"4-3-3",
      homeSlots:global.slots,
      awaySlots:global.FORMATIONS["4-3-3"],
      homePlayers:home,
      awayPlayers:away,
      homePower:80,
      awayPower:81,
      score:[1,2],
      homeWon:false,
      seed:32713,
    });
    global.endRun(false);
  });

  await expect(page.locator("#result")).toBeVisible();
  await expect(page.locator("#result .mobile-result-disclosure")).toHaveCount(0);
  await expect(page.locator("#storyTile")).toBeVisible();
  await expect(page.locator("#rStory")).not.toHaveText("—");
  await expect(page.locator("#econTile")).toBeVisible();
  await expect(page.locator("#econTile .econsum")).toBeVisible();
  await expect(page.locator("#lineups")).toBeVisible();
  await expect(page.locator("#lineups .last-match-report")).toBeVisible();
});

test("footer keeps its link rail separate from the independent-project note",async({page},testInfo)=>{
  await page.goto("/?footer-layout=1",{waitUntil:"domcontentloaded"});
  const layout=await page.evaluate(()=>{
    const row=document.querySelector(".footer-links-row") as HTMLElement;
    const note=document.querySelector(".rights-note") as HTMLElement;
    const rowRect=row.getBoundingClientRect();
    const noteRect=note.getBoundingClientRect();
    const links=[...row.querySelectorAll(".footer-link")].map(link=>{
      const rect=link.getBoundingClientRect();
      return{width:Math.round(rect.width),height:Math.round(rect.height)};
    });
    return{
      rowBottom:Math.round(rowRect.bottom),
      noteTop:Math.round(noteRect.top),
      rowScrollWidth:row.scrollWidth,
      rowClientWidth:row.clientWidth,
      pageOverflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,
      noteText:note.textContent?.trim(),
      links,
    };
  });
  expect(layout.noteText).toBe("copa.life, bağımsız bir futbol yönetim oyunudur.");
  expect(layout.noteTop).toBeGreaterThanOrEqual(layout.rowBottom);
  expect(layout.pageOverflow).toBeLessThanOrEqual(1);
  if(mobileOnly(testInfo.project.name))expect(layout.links.every(link=>link.width>=44&&link.height>=44)).toBe(true);
  expect(layout.rowScrollWidth).toBeGreaterThanOrEqual(layout.rowClientWidth);
});

test("backup picker stays readable and bounded on desktop and mobile",async({page},testInfo)=>{
  await page.goto("/?backup-picker-layout=1",{waitUntil:"domcontentloaded"});
  await page.evaluate(()=>{(globalThis as any).quickStart();(globalThis as any).quickAll();});
  await expect(page.locator("#postClubName")).toBeVisible();
  await page.locator("#postClubName").fill("Backup Test FK");
  await page.evaluate(()=>{(globalThis as any).pcGo();(globalThis as any).setCaptain(0);(globalThis as any).closeModal();});
  await page.evaluate(()=>{
    const global=globalThis as any;
    global.injuredIdx=0;
    global.picksBySlot[0].injured=true;
    global.picksBySlot[0].injuryLevel=2;
    global.renderInjbar();
  });
  await expect(page.locator("#injbar")).toBeVisible();
  await expect(page.locator("#injbar")).toContainText(/sakatlandı|injured/);
  const injuryLayout=await page.evaluate(()=>{
    const injury=document.querySelector("#injbar") as HTMLElement;
    const bench=document.querySelector("#hubBenchSection") as HTMLElement;
    const stack=document.querySelector("#hubBenchStack") as HTMLElement;
    const shop=document.querySelector("#shopLbl") as HTMLElement;
    const injuryRect=injury.getBoundingClientRect();
    const benchRect=bench.getBoundingClientRect();
    const shopRect=shop.getBoundingClientRect();
    return{
      parentId:injury.parentElement?.id,
      nextId:injury.nextElementSibling?.id,
      height:injuryRect.height,
      beforeBench:injuryRect.bottom<=benchRect.top,
      beforeShop:injuryRect.top<shopRect.top,
      stackOrder:getComputedStyle(stack).order,
      actions:[...injury.querySelectorAll("button")].map(button=>{
        const rect=button.getBoundingClientRect();
        return{width:rect.width,height:rect.height};
      }),
      pageOverflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,
    };
  });
  expect(injuryLayout.parentId).toBe("hubBenchStack");
  expect(injuryLayout.nextId).toBe("hubBenchSection");
  expect(injuryLayout.beforeBench).toBe(true);
  expect(injuryLayout.height).toBeLessThanOrEqual(58);
  expect(injuryLayout.actions).toHaveLength(2);
  expect(injuryLayout.actions.every(action=>action.width>0&&action.height>=30)).toBe(true);
  expect(injuryLayout.pageOverflow).toBeLessThanOrEqual(1);
  if(mobileOnly(testInfo.project.name)){
    expect(injuryLayout.beforeShop).toBe(true);
    expect(injuryLayout.stackOrder).toBe("5");
  }

  await page.evaluate(()=>{(globalThis as any).openBackup(0);});
  await expect(page.locator(".backup-modal")).toBeVisible();
  await expect(page.locator(".backup-titleblock")).toContainText(/YEDEK SEÇ|CHOOSE A REPLACEMENT/);
  await expect(page.locator(".backup-card")).toHaveCount(4);

  const layout=await page.evaluate(()=>{
    const modal=document.querySelector(".backup-modal") as HTMLElement;
    const sheet=modal.parentElement as HTMLElement;
    const grid=document.querySelector(".backup-grid") as HTMLElement;
    const actions=document.querySelector(".backup-actions") as HTMLElement;
    const modalRect=modal.getBoundingClientRect();
    const sheetRect=sheet.getBoundingClientRect();
    const cards=[...document.querySelectorAll(".backup-card")].map(element=>{
      const rect=element.getBoundingClientRect();
      return{width:rect.width,height:rect.height};
    });
    const buttons=[...actions.querySelectorAll("button")].map(element=>{
      const rect=element.getBoundingClientRect();
      return{width:rect.width,height:rect.height};
    });
    return{
      modalLeft:modalRect.left,
      modalRight:modalRect.right,
      sheetLeft:sheetRect.left,
      sheetRight:sheetRect.right,
      columns:getComputedStyle(grid).gridTemplateColumns.trim().split(/\s+/).length,
      cards,
      buttons,
      pageOverflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,
    };
  });
  expect(layout.modalLeft).toBeGreaterThanOrEqual(layout.sheetLeft-1);
  expect(layout.modalRight).toBeLessThanOrEqual(layout.sheetRight+1);
  expect(layout.pageOverflow).toBeLessThanOrEqual(1);
  expect(layout.buttons).toHaveLength(2);
  expect(layout.buttons.every(button=>button.height>=44&&button.width>0)).toBe(true);
  expect(layout.columns).toBe(mobileOnly(testInfo.project.name)?1:2);

  const firstCard=page.locator(".backup-card").first();
  await firstCard.click();
  await expect(firstCard).toHaveAttribute("aria-pressed","true");
  await expect(page.locator("#backupApplyBtn")).toBeEnabled();
  await expect(page.locator("#backupApplyBtn")).toContainText(/SEÇİLİ YEDEĞİ AL|CONFIRM REPLACEMENT/);
});

test("phone portrait and landscape matrices stay inside the viewport with usable hit areas",async({page},testInfo)=>{
  test.skip(!mobileOnly(testInfo.project.name),"phone interaction contract");
  const sizes=[
    {width:360,height:800},
    {width:390,height:844},
    {width:430,height:932},
    {width:740,height:390},
  ];
  for(const size of sizes){
    await page.setViewportSize(size);
    await page.goto("/?mobile-matrix="+size.width+"x"+size.height,{waitUntil:"domcontentloaded"});
    const audit=await page.evaluate(()=>{
      const interactive=[...document.querySelectorAll("button,select,a[href],[role='button'],[role='option'],[role='radio']")]
        .filter(element=>{
          const rect=element.getBoundingClientRect();
          const style=getComputedStyle(element);
          return rect.width>0&&rect.height>0&&style.visibility!=="hidden"&&style.display!=="none";
        })
        .map(element=>{
          const rect=element.getBoundingClientRect();
          return{
            label:element.getAttribute("aria-label")||element.textContent?.trim().slice(0,30)||element.tagName,
            width:Math.round(rect.width),
            height:Math.round(rect.height),
          };
        });
      return{
        overflow:document.documentElement.scrollWidth-innerWidth,
        undersized:interactive.filter(item=>item.width<44||item.height<44),
      };
    });
    expect(audit.overflow,`${size.width}x${size.height} horizontal overflow`).toBeLessThanOrEqual(1);
    expect(audit.undersized,`${size.width}x${size.height} undersized controls`).toEqual([]);
  }
});
