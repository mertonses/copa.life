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
  await page.evaluate(async()=>{const game=globalThis as any;await game.quickStart();await game.quickAll();});
  await expect(page.locator("#postClubName")).toBeVisible();
  await page.locator("#postClubName").fill("Dock Test FK");
  await page.evaluate(()=>{const w=globalThis as any;w.pcGo();w.fastTournamentDraw();w.finishTournamentDraw();});
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
  await expect(page.locator(".hidden-player-confirm,.hidden-player-reveal")).toHaveCount(0);
});

test("desktop keeps primary actions in their original layout",async({page},testInfo)=>{
  test.skip(testInfo.project.name!=="desktop-chromium","desktop layout contract");
  await page.goto("/?desktop-experience=1",{waitUntil:"domcontentloaded"});
  await expect(page.locator("#mobileActionDock")).toBeHidden();
  await expect(page.locator(".v7-cta-stack #startBtn")).toHaveCount(1);
  await expect(page.locator("#nativeHubNav,#nativeBenchTrigger,#nativeBenchBackdrop")).toHaveCount(0);
});

test("native phone hub exposes section navigation and a back-safe bench sheet",async({page},testInfo)=>{
  test.skip(!mobileOnly(testInfo.project.name),"native phone interaction contract");
  await page.goto("/?native-hub-navigation=1",{waitUntil:"domcontentloaded"});
  await page.evaluate(()=>{
    const game=globalThis as any;
    game.COPA_IS_NATIVE=true;game.COPA_PLATFORM="android";
    document.documentElement.dataset.copaPlatform="android";
    document.querySelector("#intro")?.classList.add("hidden");
    document.querySelector("#hub")?.classList.remove("hidden");
    const bench=document.getElementById("hubBenchSection")!;
    bench.innerHTML='<div class="bench-head"><span class="bench-head-label">YEDEKLER</span></div><div class="bench-list"><button class="bench-row" type="button"><span class="bench-name">Test Yedek</span><b class="bench-power">72</b></button></div>';
    game.CopaMobileExperience.enhance();
  });
  const nav=page.locator("#nativeHubNav");
  await expect(nav).toBeVisible();
  await expect(nav.locator("button")).toHaveCount(3);
  const trigger=page.locator("#nativeBenchTrigger");
  await expect(trigger).toBeVisible();
  await expect(trigger).toContainText("1");
  await expect(page.locator("#hubBenchSection")).toBeHidden();
  await trigger.click();
  await expect(page.locator("html")).toHaveClass(/native-bench-open/);
  await expect(page.locator("#hubBenchSection")).toBeVisible();
  expect(await page.locator("#hubBenchSection").evaluate(element=>element.parentElement===document.body)).toBe(true);
  const handled=await page.evaluate(()=>(globalThis as any).CopaMobileExperience.handleBack());
  expect(handled).toBe(true);
  await expect(page.locator("html")).not.toHaveClass(/native-bench-open/);
  await expect(page.locator("#hubBenchSection")).toBeHidden();
  expect(await page.locator("#hubBenchSection").evaluate(element=>element.parentElement?.id)).toBe("hubBenchStack");
});

test("portable save code excludes device-bound online identity and detects corruption",async({page},testInfo)=>{
  test.skip(!mobileOnly(testInfo.project.name),"portable mobile transfer contract");
  await page.goto("/?portable-save-transfer=1",{waitUntil:"domcontentloaded"});
  const result=await page.evaluate(()=>{
    localStorage.setItem("copa_theme","dark");
    localStorage.setItem("copa_ghost_client_id_v1","DEVICE-BOUND");
    const api=(globalThis as any).CopaTransferSave;
    const code=api.exportCode(),decoded=api.decode(code);
    let corruptRejected=false;
    try{api.decode(code.slice(0,-1)+(code.endsWith("A")?"B":"A"));}catch(_){corruptRejected=true;}
    return{prefix:code.slice(0,6),theme:decoded.preferences.copa_theme,identity:decoded.preferences.copa_ghost_client_id_v1||"",corruptRejected};
  });
  expect(result).toEqual({prefix:"COPA1-",theme:"dark",identity:"",corruptRejected:true});
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
  await page.evaluate(()=>{const w=globalThis as any;w.pcGo();w.fastTournamentDraw();w.finishTournamentDraw();});
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
  await expect(page.locator(".mobile-profile-nav")).toHaveCount(0);
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
  await page.evaluate(()=>{const w=globalThis as any;w.pcGo();w.fastTournamentDraw();w.finishTournamentDraw();});
  await expect(page.locator("#hub")).toBeVisible();
  await expect(page.locator("#mobileRoundDigest")).toHaveCount(0);
  await page.evaluate(()=>{
    const global=globalThis as any;
    global.pushFeed("Mobil gelişme 1","form");
    global.pushFeed("Mobil gelişme 2","form");
    global.pushFeed("Mobil gelişme 3","form");
  });
  await expect(page.locator("#feed .feeditem").filter({hasText:"Mobil"})).toHaveCount(3);
  await page.evaluate(()=>{
    const global=globalThis as any;
    global.setCaptain(0);
    global.closeModal();
    const home=global.picksBySlot.filter(Boolean).slice(0,11);
    const away=home.map((player:any,index:number)=>({...player,name:`Mobil Rakip ${index+1}`}));
    global.LastMatchReport.capture({
      round:5,
      homeName:"Mobile Result FK",
      awayName:"Mobil Rakip FK",
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
      seed:32714,
    });
    global.endRun(false);
  });
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
  await page.locator(".mobile-result-disclosure>summary").filter({hasText:/KADROLAR|LINEUPS/}).click();
  await expect(page.locator("#lineups .lmr-pitch > .lmr-pitch-score")).toBeVisible();
  await expect(page.locator("#lineups .lmr-header,#lineups .lmr-summary")).toHaveCount(0);
  await expect(page.locator("#lineups .lmr-pitch > .lmr-highlights")).toBeVisible();
  const mobileScore=await page.locator("#lineups .lmr-pitch > .lmr-pitch-score").evaluate(element=>{
    const score=element.getBoundingClientRect();
    const pitchElement=element.parentElement!;
    const pitch=pitchElement.getBoundingClientRect();
    const highlights=pitchElement.querySelector(".lmr-highlights")!.getBoundingClientRect();
    const highlightPlayerOverlaps=Array.from(pitchElement.querySelectorAll(".lmr-player")).filter(node=>{
      const player=node.getBoundingClientRect();
      return!(player.right<highlights.left||player.left>highlights.right||player.bottom<highlights.top||player.top>highlights.bottom);
    }).length;
    return{
      centered:Math.abs((score.left+score.width/2)-(pitch.left+pitch.width/2)),
      inside:score.top>=pitch.top&&score.right<=pitch.right+1,
      widthRatio:score.width/pitch.width,
      radius:Number.parseFloat(getComputedStyle(element).borderRadius),
      highlightsBelowScore:highlights.top>=score.bottom,
      highlightPlayerOverlaps,
    };
  });
  expect(mobileScore.centered).toBeLessThanOrEqual(1);
  expect(mobileScore.inside).toBe(true);
  expect(mobileScore.widthRatio).toBeLessThanOrEqual(.98);
  expect(mobileScore.radius).toBeGreaterThan(12);
  expect(mobileScore.highlightsBelowScore).toBe(true);
  expect(mobileScore.highlightPlayerOverlaps).toBe(0);
});

test("desktop result keeps season story, economy and lineups in the document flow",async({page},testInfo)=>{
  test.skip(testInfo.project.name!=="desktop-chromium","desktop result contract");
  await page.goto("/?desktop-result-sections=1",{waitUntil:"domcontentloaded"});
  await page.evaluate(()=>{(globalThis as any).quickStart();(globalThis as any).quickAll();});
  await expect(page.locator("#postClubName")).toBeVisible();
  await page.locator("#postClubName").fill("Desktop Result FK");
  await page.evaluate(()=>{const w=globalThis as any;w.pcGo();w.fastTournamentDraw();w.finishTournamentDraw();});
  await expect(page.locator("#hub")).toBeVisible();
  await page.evaluate(()=>{
    const global=globalThis as any;
    global.setCaptain(0);
    global.closeModal();
    const home=global.picksBySlot.filter(Boolean).slice(0,11).map((player:any)=>({...player}));
    const away=home.map((player:any,index:number)=>({...player,name:`Rakip Oyuncu ${index+1}`}));
    home[0].name="Yeğen Demir 1";
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
      score:[2,3],
      homeWon:false,
      events:[
        {m:21,home:true,name:"1",type:"goal"},
        {m:64,home:true,name:"1",type:"goal"},
      ],
      homeRatings:[{name:"Yeğen Demir 1",rating:8.8}],
      motm:"Yeğen Demir 1",
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
  await expect(page.locator("#lineups .lmr-header,#lineups .lmr-summary")).toHaveCount(0);
  await expect(page.locator("#lineups .lmr-pitch > .lmr-pitch-score")).toBeVisible();
  await expect(page.locator("#lineups .lmr-pitch > .lmr-highlights")).toBeVisible();
  const generatedScorer=page.locator('#lineups .lmr-player[data-lmr-team="home"][data-lmr-index="0"]');
  await expect(generatedScorer.locator(".lmr-name")).toHaveText("Demir #1");
  await expect(generatedScorer.locator(".lmr-goal-ball")).toHaveCount(2);
  await expect(generatedScorer.locator(".lmr-events>i")).toHaveCount(1);
  const scorerBadgeLayout=await generatedScorer.evaluate(element=>{
    const name=element.querySelector(".lmr-name")!.getBoundingClientRect();
    const events=element.querySelector(".lmr-events")!.getBoundingClientRect();
    return{eventsBelowName:events.top>=name.bottom-1};
  });
  expect(scorerBadgeLayout.eventsBelowName).toBe(true);
  const desktopScore=await page.locator("#lineups .lmr-pitch > .lmr-pitch-score").evaluate(element=>{
    const score=element.getBoundingClientRect();
    const pitchElement=element.parentElement!;
    const pitch=pitchElement.getBoundingClientRect();
    const highlights=pitchElement.querySelector(".lmr-highlights")!.getBoundingClientRect();
    return{
      centered:Math.abs((score.left+score.width/2)-(pitch.left+pitch.width/2)),
      inside:score.top>=pitch.top&&score.right<=pitch.right+1,
      widthRatio:score.width/pitch.width,
      highlightsBelowScore:highlights.top>=score.bottom,
    };
  });
  expect(desktopScore.centered).toBeLessThanOrEqual(1);
  expect(desktopScore.inside).toBe(true);
  expect(desktopScore.widthRatio).toBeLessThanOrEqual(.73);
  expect(desktopScore.highlightsBelowScore).toBe(true);
});

test("widening a mobile result restores every result section to the desktop flow",async({page},testInfo)=>{
  test.skip(testInfo.project.name!=="desktop-chromium","responsive desktop transition contract");
  await page.setViewportSize({width:430,height:932});
  await page.goto("/?result-resize-cleanup=1",{waitUntil:"domcontentloaded"});
  await page.evaluate(()=>{
    document.getElementById("intro")?.classList.add("hidden");
    const result=document.getElementById("result")!;
    result.classList.remove("hidden");
    for(const [id,text] of [["econTile","Ekonomi"],["lineups","Son maç"]] as const){
      const section=document.getElementById(id)!;
      section.classList.remove("hidden");
      section.textContent=text;
    }
    window.dispatchEvent(new Event("resize"));
  });

  await expect(page.locator("#result .mobile-result-disclosure")).toHaveCount(4);
  await expect(page.locator("#storyTile")).toBeHidden();

  await page.setViewportSize({width:1440,height:900});

  await expect(page.locator("#result .mobile-result-disclosure")).toHaveCount(0);
  await expect(page.locator("#storyTile")).toBeVisible();
  await expect(page.locator("#econTile")).toBeVisible();
  await expect(page.locator("#lineups")).toBeVisible();
  await expect(page.locator("#finalRow > #storyTile")).toHaveCount(1);
  await expect(page.locator("#finalRow > #econTile")).toHaveCount(1);
  await expect(page.locator("#result > #lineups")).toHaveCount(1);
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
  const phoneProject=testInfo.project.name.includes("mobile");
  await page.goto("/?backup-picker-layout=1",{waitUntil:"domcontentloaded"});
  await page.evaluate(()=>{(globalThis as any).quickStart();(globalThis as any).quickAll();});
  await expect(page.locator("#postClubName")).toBeVisible();
  await page.locator("#postClubName").fill("Backup Test FK");
  await page.evaluate(()=>{const w=globalThis as any;w.pcGo();w.fastTournamentDraw();w.finishTournamentDraw();w.setCaptain(0);w.closeModal();});
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
  expect(injuryLayout.height).toBeLessThanOrEqual(phoneProject?170:58);
  expect(injuryLayout.actions).toHaveLength(2);
  expect(injuryLayout.actions.every(action=>action.width>0&&action.height>=(phoneProject?44:30))).toBe(true);
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
      const ratingLabel=element.querySelector(".bk-rating span") as HTMLElement;
      return{width:rect.width,height:rect.height,ratingLabelDisplay:getComputedStyle(ratingLabel).display};
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
  expect(layout.columns).toBe(phoneProject?1:2);
  if(phoneProject){
    expect(Math.max(...layout.cards.map(card=>card.height))).toBeLessThanOrEqual(95);
    expect(layout.cards.every(card=>card.ratingLabelDisplay==="none")).toBe(true);
  }

  const darkHeader=await page.evaluate(()=>{
    document.documentElement.dataset.theme="dark";
    const title=document.querySelector(".backup-titleblock h4") as HTMLElement;
    const head=document.querySelector(".backup-head") as HTMLElement;
    const titleStyle=getComputedStyle(title),headStyle=getComputedStyle(head);
    const rgb=(value:string)=>(value.match(/[\d.]+/g)||[]).slice(0,3).map(Number);
    const luminance=(value:string)=>{
      const channels=rgb(value).map(channel=>{
        const normalized=channel/255;
        return normalized<=.04045?normalized/12.92:Math.pow((normalized+.055)/1.055,2.4);
      });
      return .2126*channels[0]+.7152*channels[1]+.0722*channels[2];
    };
    const lighter=Math.max(luminance(titleStyle.color),luminance(headStyle.backgroundColor));
    const darker=Math.min(luminance(titleStyle.color),luminance(headStyle.backgroundColor));
    return{
      contrast:(lighter+.05)/(darker+.05),
      titleBackground:titleStyle.backgroundColor,
      titleBackgroundImage:titleStyle.backgroundImage,
    };
  });
  expect(darkHeader.contrast).toBeGreaterThanOrEqual(4.5);
  expect(darkHeader.titleBackground).toBe("rgba(0, 0, 0, 0)");
  expect(darkHeader.titleBackgroundImage).toBe("none");

  const firstCard=page.locator(".backup-card").first();
  await firstCard.click();
  await expect(firstCard).toHaveAttribute("aria-pressed","true");
  await expect(page.locator("#backupApplyBtn")).toBeEnabled();
  await expect(page.locator("#backupApplyBtn")).toContainText(/SEÇİLİ YEDEĞİ AL|CONFIRM REPLACEMENT/);
});

test("bench stays compact, draggable and height-bounded on wide screens and returns to flow on phones",async({page},testInfo)=>{
  const isPhone=mobileOnly(testInfo.project.name);
  test.skip(!["desktop-chromium","mobile-chromium"].includes(testInfo.project.name),"responsive bench contract");
  await page.goto("/?bench-corner-layout=1",{waitUntil:"domcontentloaded"});
  await page.evaluate(async()=>{const game=globalThis as any;await game.quickStart();await game.quickAll();});
  await expect(page.locator("#postClubName")).toBeVisible();
  await page.locator("#postClubName").fill("Bench Layout FK");
  await page.evaluate(()=>{const game=globalThis as any;game.pcGo();game.fastTournamentDraw();game.finishTournamentDraw();game.setCaptain(0);game.closeModal();});
  await expect(page.locator("#hub")).toBeVisible();
  await expect(page.locator("#hubBenchSection .bench-row")).toHaveCount(4);

  const chemistry=await page.evaluate(()=>{
    const game=globalThis as any,value=Number(document.querySelector("#chemV")?.textContent||0);
    return{scale:[-5,-2,0,2,5].map(game.chemMetricTone),visibleTone:(document.querySelector("#chemTile") as HTMLElement)?.dataset.metricTone,expectedTone:game.chemMetricTone(value)};
  });
  expect(chemistry.scale).toEqual(["worst","weak","average","good","elite"]);
  expect(chemistry.visibleTone).toBe(chemistry.expectedTone);

  const metrics=await page.evaluate(()=>{
    const pitch=document.querySelector("#hubPitch") as HTMLElement;
    const bench=document.querySelector("#hubBenchSection") as HTMLElement;
    const row=bench.querySelector(".bench-row") as HTMLElement;
    const pitchRect=pitch.getBoundingClientRect();
    const benchRect=bench.getBoundingClientRect();
    const rowRect=row.getBoundingClientRect();
    return{
      parentClass:bench.parentElement?.parentElement?.className||"",
      position:getComputedStyle(bench).position,
      pitchTop:Math.round(pitchRect.top),
      pitchRight:Math.round(pitchRect.right),
      pitchBottom:Math.round(pitchRect.bottom),
      benchTop:Math.round(benchRect.top),
      benchRight:Math.round(benchRect.right),
      benchWidth:Math.round(benchRect.width),
      rowHeight:Math.round(rowRect.height),
      pageOverflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,
    };
  });
  expect(metrics.parentClass).toContain("pitch-area");
  expect(metrics.pageOverflow).toBeLessThanOrEqual(1);
  if(isPhone){
    expect(metrics.position).toBe("static");
    expect(metrics.benchTop).toBeGreaterThanOrEqual(metrics.pitchBottom);
    await expect(page.locator("#hubBenchSection")).not.toHaveClass(/bench-panel-draggable/);
    await expect(page.locator("#hubBenchSection .bench-head")).not.toHaveAttribute("tabindex","0");
  }else{
    expect(metrics.position).toBe("absolute");
    expect(metrics.benchTop-metrics.pitchTop).toBeGreaterThanOrEqual(8);
    expect(metrics.benchTop-metrics.pitchTop).toBeLessThanOrEqual(12);
    expect(metrics.pitchRight-metrics.benchRight).toBeGreaterThanOrEqual(8);
    expect(metrics.pitchRight-metrics.benchRight).toBeLessThanOrEqual(12);
    expect(metrics.benchWidth).toBeLessThanOrEqual(234);
    expect(metrics.rowHeight).toBeLessThanOrEqual(28);
    const panel=page.locator("#hubBenchSection"),handle=panel.locator(".bench-head");
    await expect(panel).toHaveClass(/bench-panel-draggable/);
    await expect(handle).toHaveAttribute("tabindex","0");
    const before=await panel.boundingBox();const grip=await handle.boundingBox();
    expect(before).not.toBeNull();expect(grip).not.toBeNull();
    await page.mouse.move(grip!.x+grip!.width/2,grip!.y+grip!.height/2);
    await page.mouse.down();await page.mouse.move(grip!.x+grip!.width/2-120,grip!.y+grip!.height/2+72,{steps:8});await page.mouse.up();
    const dragged=await page.evaluate(()=>{const pitch=document.querySelector("#hubPitch")!.getBoundingClientRect(),bench=document.querySelector("#hubBenchSection")!.getBoundingClientRect();return{pitch:{left:pitch.left,top:pitch.top,right:pitch.right,bottom:pitch.bottom},bench:{left:bench.left,top:bench.top,right:bench.right,bottom:bench.bottom}};});
    expect(dragged.bench.left).toBeLessThan(before!.x-80);
    expect(dragged.bench.top).toBeGreaterThan(before!.y+45);
    expect(dragged.bench.left).toBeGreaterThanOrEqual(dragged.pitch.left+8);
    expect(dragged.bench.top).toBeGreaterThanOrEqual(dragged.pitch.top+8);
    expect(dragged.bench.right).toBeLessThanOrEqual(dragged.pitch.right-8);
    expect(dragged.bench.bottom).toBeLessThanOrEqual(dragged.pitch.bottom-8);

    await page.evaluate(()=>{const game=globalThis as any,seed=game.bench.find((player:any)=>player&&!player.used);for(let i=0;i<24;i++)game.bench.push({...seed,id:`bench-overflow-${i}`,name:`Extra Bench ${i}`,used:false,bench:true});game.renderHub();});
    await expect(page.locator("#hubBenchSection .bench-row")).toHaveCount(28);
    const overflow=await panel.evaluate((element:any)=>({clientHeight:element.clientHeight,scrollHeight:element.scrollHeight,pitchHeight:element.closest(".pitch-area").clientHeight}));
    expect(overflow.clientHeight).toBeLessThanOrEqual(overflow.pitchHeight-18);
    expect(overflow.scrollHeight).toBeGreaterThan(overflow.clientHeight);
  }
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
