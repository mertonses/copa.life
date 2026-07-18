(function mobileExperienceModule(global){
  "use strict";

  const PHONE_QUERY="(max-width: 760px) and (hover: none), (max-width: 760px) and (pointer: coarse)";
  const phoneMedia=global.matchMedia?global.matchMedia(PHONE_QUERY):{matches:false};
  let dock=null;
  let dockInner=null;
  let mounted=null;
  let syncFrame=0;
  let enhanceFrame=0;
  let modalWasOpen=false;
  let modalScrollY=0;
  let lastEventCount=0;
  let unreadEventCount=0;
  let smartSpeedTimer=0;
  let requestedSmartSpeed=10;
  let lastFeedCount=0;
  let unreadFeedCount=0;
  let hadSavedRunOnInit=false;
  let draftConfirm=null;
  const approvedDraftChoices=new WeakSet();
  const PREF_KEYS={
    haptics:"copa_mobile_haptics",
    battery:"copa_mobile_battery",
    smartSpeed:"copa_mobile_smart_speed",
    confirmPick:"copa_mobile_confirm_pick",
    fieldFocus:"copa_mobile_field_focus",
  };

  function languageIsTurkish(){
    return global.LANG!=="en";
  }

  function copy(){
    return languageIsTurkish()?{
      actions:"Ana aksiyonlar",field:"SAHA",events:"OLAYLAR",stats:"İSTATİSTİK",
      matchView:"Maç görünümü",offline:"Bağlantı yok · kayıtlı oyun güvende",
      online:"Bağlantı geri geldi",retry:"Yeniden dene",settings:"MOBİL DENEYİM",
      haptics:"DOKUNUŞ TİTREŞİMİ",battery:"PİL TASARRUFU",
      smartSpeed:"AKILLI MAÇ HIZI",confirmPick:"OYUNCU SEÇİMİNİ ONAYLA",
      fieldFocus:"YATAYDA SAHA ODAĞI",
      on:"AÇIK",off:"KAPALI",
      draft:"DRAFT DURUMU",remaining:"Kadro",budget:"Kasa",deadline:"Süre",
      candidates:"Aday seçimi",squadAverage:"Kadro ort.",cashAfter:"Kasa sonra",
      economical:"Bütçe",balanced:"Dengeli",strong:"Güçlü",elite:"Elit",
      addPlayer:"KADROYA EKLE",cancel:"VAZGEÇ",
      feedMore:"TÜM GELİŞMELER",feedLess:"ÖZETİ GÖSTER",newEvent:"Yeni olay",
      newFeed:"YENİ",lineupWarning:"Kadro uyarısı var · maça çıkmadan kontrol et",
      tacticMore:"Yüklen: hücum etkisi artar, savunma riski yükselir.",
      tacticPush:"Önde bas: rakip kurulumu zorlanır, enerji tüketimi artar.",
      tacticCalm:"Tempoyu düşür: top kontrolü artar, hücum sıklığı azalır.",
      tacticHold:"Skoru koru: savunma güvenliği artar, ileri çıkışlar azalır.",
      tacticApplied:"Komut sahaya iletildi",criticalSpeed:"Kritik an · hız 1×",
      skipTitle:"Maçı geç?",skipBody:"Kalan süre anında tamamlanacak. Maç sonucu yine aynı oyun çekirdeğiyle hesaplanır.",
      skipConfirm:"MAÇI TAMAMLA",penaltyHint:"Yönünü tek dokunuşla seç. Seri, kapanırsa aynı atıştan devam eder.",
      profileOverview:"ÖZET",profileInsights:"GÜÇLÜ / RİSK",profileAnalysis:"ANALİZ",
      resultMatch:"MAÇ RAPORU",resultStory:"SEZON HİKÂYESİ",
      resultEconomy:"EKONOMİ",resultLineups:"KADROLAR",
      nativeShare:"PAYLAŞ",resumed:"Kaldığın yerden devam edildi.",
      matchPaused:"Maç duraklatıldı. Tekrar geri tuşu uygulamayı küçültür.",
      swipe:"Yatay kaydırılabilir",
    }:{
      actions:"Primary actions",field:"PITCH",events:"EVENTS",stats:"STATS",
      matchView:"Match view",offline:"Offline · your saved run is safe",
      online:"Connection restored",retry:"Retry",settings:"MOBILE EXPERIENCE",
      haptics:"TOUCH HAPTICS",battery:"BATTERY SAVER",
      smartSpeed:"SMART MATCH SPEED",confirmPick:"CONFIRM PLAYER PICKS",
      fieldFocus:"LANDSCAPE PITCH FOCUS",
      on:"ON",off:"OFF",
      draft:"DRAFT STATUS",remaining:"Squad",budget:"Cash",deadline:"Time",
      candidates:"Candidate choice",squadAverage:"Squad avg.",cashAfter:"Cash after",
      economical:"Budget",balanced:"Balanced",strong:"Strong",elite:"Elite",
      addPlayer:"ADD TO SQUAD",cancel:"CANCEL",
      feedMore:"ALL DEVELOPMENTS",feedLess:"SHOW SUMMARY",newEvent:"New event",
      newFeed:"NEW",lineupWarning:"Squad warning · review before playing",
      tacticMore:"Go for it: attacking impact rises with more defensive risk.",
      tacticPush:"Press high: disrupt build-up at a higher energy cost.",
      tacticCalm:"Lower tempo: improve control while reducing attack frequency.",
      tacticHold:"Protect lead: improve defensive security and limit forward runs.",
      tacticApplied:"Instruction sent to the pitch",criticalSpeed:"Key moment · speed 1×",
      skipTitle:"Skip match?",skipBody:"The remaining time will finish instantly. The result still uses the same game core.",
      skipConfirm:"FINISH MATCH",penaltyHint:"Choose a direction with one tap. If closed, the shootout resumes from the same kick.",
      profileOverview:"OVERVIEW",profileInsights:"STRENGTH / RISK",profileAnalysis:"ANALYSIS",
      resultMatch:"MATCH REPORT",resultStory:"SEASON STORY",
      resultEconomy:"ECONOMY",resultLineups:"LINEUPS",
      nativeShare:"SHARE",resumed:"Your saved run has resumed.",
      matchPaused:"Match paused. Press Back again to minimise the app.",
      swipe:"Horizontally scrollable",
    };
  }

  function readPreference(key){
    try{return localStorage.getItem(PREF_KEYS[key])==="1";}catch(_){return false;}
  }

  function writePreference(key,value){
    try{localStorage.setItem(PREF_KEYS[key],value?"1":"0");}catch(_){}
    applyPreferences();
  }

  function haptic(pattern){
    if(!readPreference("haptics"))return;
    const fallback=()=>{
      if(!global.navigator||typeof global.navigator.vibrate!=="function")return;
      try{global.navigator.vibrate(pattern||12);}catch(_){}
    };
    const plugins=global.Capacitor&&global.Capacitor.Plugins;
    const nativeHaptics=plugins&&plugins.Haptics;
    if(nativeHaptics&&typeof nativeHaptics.impact==="function"){
      const values=Array.isArray(pattern)?pattern:[pattern||12],strength=Math.max(...values.map(value=>Number(value)||0));
      try{
        const result=nativeHaptics.impact({style:strength>=30?"HEAVY":strength>=18?"MEDIUM":"LIGHT"});
        if(result&&typeof result.catch==="function")result.catch(fallback);
        return;
      }catch(_){}
    }
    fallback();
  }

  function isVisible(element){
    return !!element&&!element.classList.contains("hidden");
  }

  function isPhoneInteraction(){
    return !!phoneMedia.matches;
  }

  function ensureDock(){
    if(dock)return dock;
    dock=document.createElement("div");
    dock.id="mobileActionDock";
    dock.className="mobile-action-dock hidden";
    dock.setAttribute("aria-label",copy().actions);
    dock.innerHTML='<div class="mobile-action-dock-inner"></div>';
    dockInner=dock.firstElementChild;
    document.body.appendChild(dock);
    return dock;
  }

  function restoreMounted(){
    if(!mounted)return;
    const {node,placeholder}=mounted;
    if(placeholder.parentNode){
      placeholder.parentNode.insertBefore(node,placeholder);
      placeholder.remove();
    }else if(dockInner&&dockInner.contains(node))node.remove();
    mounted=null;
  }

  function dockCandidate(){
    const modal=document.getElementById("modal");
    if(isVisible(modal))return null;
    const intro=document.getElementById("intro");
    if(isVisible(intro))return{node:document.getElementById("startBtn"),kind:"intro"};
    const hub=document.getElementById("hub");
    if(isVisible(hub))return{node:hub.querySelector(".hub-action-panel"),kind:"hub"};
    const sim=document.getElementById("sim");
    if(isVisible(sim)){
      const penaltyButton=sim.querySelector(".final-penalty-btn");
      if(penaltyButton)return{node:penaltyButton,kind:"penalty"};
    }
    const result=document.getElementById("result");
    if(isVisible(result))return{node:document.getElementById("againBtn"),kind:"result"};
    return null;
  }

  function updateDockHeight(){
    if(!dock||dock.classList.contains("hidden"))return;
    const height=Math.ceil(dock.getBoundingClientRect().height);
    document.documentElement.style.setProperty("--mobile-dock-height",height+"px");
  }

  function mountDock(candidate){
    ensureDock();
    if(mounted&&mounted.node===candidate.node){
      dock.dataset.dockKind=candidate.kind;
      dock.classList.remove("hidden");
      document.documentElement.classList.add("mobile-dock-active");
      requestAnimationFrame(updateDockHeight);
      return;
    }
    restoreMounted();
    if(!candidate.node||!candidate.node.parentNode)return;
    const placeholder=document.createComment("copa-mobile-action-origin");
    candidate.node.parentNode.insertBefore(placeholder,candidate.node);
    dockInner.appendChild(candidate.node);
    mounted={node:candidate.node,placeholder};
    dock.dataset.dockKind=candidate.kind;
    dock.classList.remove("hidden");
    document.documentElement.classList.add("mobile-dock-active");
    requestAnimationFrame(updateDockHeight);
  }

  function hideDock(){
    restoreMounted();
    if(dock){
      dock.classList.add("hidden");
      dock.removeAttribute("data-dock-kind");
    }
    document.documentElement.classList.remove("mobile-dock-active");
    document.documentElement.style.removeProperty("--mobile-dock-height");
  }

  function ensureSimTabs(){
    const sim=document.getElementById("sim");
    if(!sim)return null;
    let nav=sim.querySelector(".mobile-sim-tabs");
    if(nav)return nav;
    nav=document.createElement("nav");
    nav.className="mobile-sim-tabs";
    nav.setAttribute("aria-label",copy().matchView);
    nav.innerHTML=[
      '<button type="button" data-sim-view="field" aria-selected="true"><span class="mobile-tab-label">SAHA</span></button>',
      '<button type="button" data-sim-view="events" aria-selected="false"><span class="mobile-tab-label">OLAYLAR</span><span class="mobile-tab-badge hidden" aria-label="0"></span></button>',
      '<button type="button" data-sim-view="stats" aria-selected="false"><span class="mobile-tab-label">İSTATİSTİK</span></button>',
    ].join("");
    const stats=document.getElementById("simStats");
    if(stats)stats.before(nav);
    nav.addEventListener("click",event=>{
      const button=event.target.closest("[data-sim-view]");
      if(!button)return;
      setSimView(button.dataset.simView);
    });
    return nav;
  }

  function syncSimLanguage(nav){
    if(!nav)return;
    const c=copy(),labels={field:c.field,events:c.events,stats:c.stats};
    nav.querySelectorAll("[data-sim-view]").forEach(button=>{
      let label=button.querySelector(".mobile-tab-label");
      if(!label){
        label=document.createElement("span");
        label.className="mobile-tab-label";
        label.textContent=button.textContent;
        button.textContent="";
        button.appendChild(label);
        if(button.dataset.simView==="events"){
          const badge=document.createElement("span");
          badge.className="mobile-tab-badge hidden";
          badge.setAttribute("aria-label","0");
          button.appendChild(badge);
        }
      }
      label.textContent=labels[button.dataset.simView]||label.textContent;
    });
    nav.setAttribute("aria-label",c.matchView);
  }

  function setSimView(view){
    const sim=document.getElementById("sim");
    const nav=ensureSimTabs();
    if(!sim||!nav)return;
    const allowed=["field","events","stats"];
    const next=allowed.includes(view)?view:"field";
    sim.dataset.mobileView=next;
    nav.querySelectorAll("[data-sim-view]").forEach(button=>{
      button.setAttribute("aria-selected",button.dataset.simView===next?"true":"false");
    });
    if(next==="events"){
      unreadEventCount=0;
      updateEventBadge();
    }
  }

  function showToast(message,options){
    if(typeof global.showToast==="function")global.showToast(message,options||{type:"info"});
  }

  function applyPreferences(){
    const root=document.documentElement;
    root.classList.toggle("copa-battery-saver",readPreference("battery"));
    root.classList.toggle("copa-smart-speed",readPreference("smartSpeed"));
    root.classList.toggle("copa-confirm-picks",readPreference("confirmPick"));
    root.classList.toggle("copa-field-focus",readPreference("fieldFocus"));
    const c=copy();
    [
      ["haptics","mobileHapticBtn"],
      ["battery","mobileBatteryBtn"],
      ["smartSpeed","mobileSmartSpeedBtn"],
      ["confirmPick","mobileConfirmPickBtn"],
      ["fieldFocus","mobileFieldFocusBtn"],
    ].forEach(([key,id])=>{
      const button=document.getElementById(id);
      if(!button)return;
      const active=readPreference(key);
      button.classList.toggle("on",active);
      button.setAttribute("aria-pressed",active?"true":"false");
      const state=button.querySelector(".mobile-pref-state");
      if(state)state.textContent=active?c.on:c.off;
    });
  }

  function ensurePreferences(){
    const settings=document.getElementById("settingsDrop");
    if(!settings||settings.querySelector(".mobile-pref-group"))return;
    const c=copy(),group=document.createElement("div");
    group.className="sd-group mobile-pref-group";
    group.innerHTML='<div class="sd-hdr mobile-pref-hdr"></div>';
    const header=group.querySelector(".mobile-pref-hdr");
    if(header)header.textContent=c.settings;
    [
      ["haptics","mobileHapticBtn",c.haptics],
      ["battery","mobileBatteryBtn",c.battery],
      ["smartSpeed","mobileSmartSpeedBtn",c.smartSpeed],
      ["confirmPick","mobileConfirmPickBtn",c.confirmPick],
      ["fieldFocus","mobileFieldFocusBtn",c.fieldFocus],
    ].forEach(([key,id,label])=>{
      const button=document.createElement("button");
      button.type="button";
      button.id=id;
      button.className="sdbtn sd-full mobile-pref-btn";
      button.innerHTML='<span class="mobile-pref-label"></span><span class="mobile-pref-state"></span>';
      button.querySelector(".mobile-pref-label").textContent=label;
      button.addEventListener("click",()=>{
        const next=!readPreference(key);
        writePreference(key,next);
        if(key==="haptics"&&next)haptic(18);
      });
      group.appendChild(button);
    });
    settings.appendChild(group);
    applyPreferences();
  }

  function syncPreferenceLanguage(){
    const c=copy(),labels={
      mobileHapticBtn:c.haptics,
      mobileBatteryBtn:c.battery,
      mobileSmartSpeedBtn:c.smartSpeed,
      mobileConfirmPickBtn:c.confirmPick,
      mobileFieldFocusBtn:c.fieldFocus,
    };
    const header=document.querySelector(".mobile-pref-hdr");
    if(header)header.textContent=c.settings;
    Object.entries(labels).forEach(([id,label])=>{
      const node=document.querySelector("#"+id+" .mobile-pref-label");
      if(node)node.textContent=label;
    });
    applyPreferences();
  }

  function ensureNetworkBanner(){
    let banner=document.getElementById("mobileNetworkBanner");
    if(banner)return banner;
    banner=document.createElement("div");
    banner.id="mobileNetworkBanner";
    banner.className="mobile-network-banner hidden";
    banner.setAttribute("role","status");
    banner.setAttribute("aria-live","polite");
    banner.innerHTML='<span></span><button type="button"></button>';
    banner.querySelector("button").addEventListener("click",()=>{
      if(global.navigator.onLine)global.location.reload();
      else syncNetworkState();
    });
    document.body.appendChild(banner);
    return banner;
  }

  function syncNetworkState(restored){
    const banner=ensureNetworkBanner(),c=copy(),online=global.navigator.onLine!==false;
    banner.classList.toggle("is-online",online);
    banner.querySelector("span").textContent=online?c.online:c.offline;
    banner.querySelector("button").textContent=c.retry;
    if(!online){
      banner.classList.remove("hidden");
      return;
    }
    if(restored){
      banner.classList.remove("hidden");
      setTimeout(()=>banner.classList.add("hidden"),2200);
    }else banner.classList.add("hidden");
  }

  function updateScrollableState(element){
    if(!element)return;
    const overflow=element.scrollWidth-element.clientWidth>4;
    element.classList.toggle("mobile-scroll-affordance",overflow);
    element.classList.toggle("is-scroll-start",element.scrollLeft<=3);
    element.classList.toggle("is-scroll-end",element.scrollLeft+element.clientWidth>=element.scrollWidth-3);
    if(overflow){
      element.tabIndex=element.tabIndex<0?0:element.tabIndex;
      element.setAttribute("aria-label",copy().swipe);
    }
  }

  function ensureScrollAffordances(){
    ["#hub .hub-stat-row","#chairpick","#fixbar",".shopcards",".final-pills"].forEach(selector=>{
      document.querySelectorAll(selector).forEach(element=>{
        if(!element.dataset.mobileScrollBound){
          element.dataset.mobileScrollBound="1";
          element.addEventListener("scroll",()=>updateScrollableState(element),{passive:true});
        }
        updateScrollableState(element);
      });
    });
  }

  function ensureIntroGuide(){
    const mechanics=document.getElementById("mechSection");
    if(!mechanics)return;
    mechanics.classList.remove("mobile-collapsed");
    document.getElementById("mobileMechanicsToggle")?.remove();
  }

  function ensureDraftContext(){
    const draft=document.getElementById("draft");
    const hint=document.getElementById("rollHint");
    if(!draft||!hint)return null;
    let bar=document.getElementById("mobileDraftContext");
    if(!bar){
      bar=document.createElement("div");
      bar.id="mobileDraftContext";
      bar.className="mobile-draft-context";
      bar.setAttribute("role","status");
      bar.setAttribute("aria-live","polite");
      bar.innerHTML='<span class="mobile-draft-kicker"></span><div><b data-draft-context="squad"></b><b data-draft-context="cash"></b><b data-draft-context="time"></b></div>';
      hint.before(bar);
    }
    const c=copy(),squad=(document.getElementById("ddSub")||{}).textContent||"—";
    const cash=(document.getElementById("budgetV")||{}).textContent||"—";
    const deadline=(document.getElementById("ddClock")||{}).textContent||"—";
    bar.querySelector(".mobile-draft-kicker").textContent=c.draft;
    bar.querySelector('[data-draft-context="squad"]').textContent=c.remaining+" · "+squad.replace(/^.*?\s(?=\d+\/\d+$)/,"");
    bar.querySelector('[data-draft-context="cash"]').textContent=c.budget+" · "+cash;
    bar.querySelector('[data-draft-context="time"]').textContent=c.deadline+" · "+deadline;
    return bar;
  }

  function numericText(element){
    const match=String(element&&element.textContent||"").replace(",",".").match(/-?\d+(?:\.\d+)?/);
    return match?Number(match[0]):null;
  }

  function enhanceDraftCandidates(){
    const options=[...document.querySelectorAll("#opts .opt")];
    if(!options.length)return;
    const c=copy(),cash=numericText(document.getElementById("budgetV"));
    const squadValues=[...document.querySelectorAll("#draftExtra .de-row.de-filled .de-ov")]
      .map(numericText).filter(Number.isFinite);
    const average=squadValues.length?Math.round(squadValues.reduce((a,b)=>a+b,0)/squadValues.length):null;
    options.forEach(option=>{
      let impact=option.querySelector(".mobile-candidate-impact");
      if(!impact){
        impact=document.createElement("span");
        impact.className="mobile-candidate-impact";
        const middle=option.querySelector(".mid")||option;
        middle.appendChild(impact);
      }
      const rating=numericText(option.querySelector(".ovb"));
      const price=numericText(option.querySelector(".price .p"));
      const parts=[];
      if(Number.isFinite(rating)&&Number.isFinite(average)){
        const delta=Math.round(rating-average);
        parts.push(c.squadAverage+" "+(delta>=0?"+":"")+delta);
      }
      if(Number.isFinite(cash)&&Number.isFinite(price))parts.push(c.cashAfter+" €"+Math.round((cash-price)*10)/10+"M");
      impact.textContent=parts.join(" · ");
    });
  }

  function ensureAutoFillPresets(){
    const wrap=document.querySelector(".autofill-wrap");
    if(!wrap||wrap.querySelector(".mobile-autofill-presets"))return;
    const c=copy(),presets=[[12,c.economical],[20,c.balanced],[32,c.strong],[48,c.elite]];
    const group=document.createElement("div");
    group.className="mobile-autofill-presets";
    group.setAttribute("aria-label",languageIsTurkish()?"Otomatik kadro bütçe hedefleri":"Automatic squad budget targets");
    presets.forEach(([value,label])=>{
      const button=document.createElement("button");
      button.type="button";
      button.textContent=label;
      button.addEventListener("click",()=>{
        const slider=document.getElementById("autoFillSlider");
        if(slider){slider.value=String(value);slider.dispatchEvent(new Event("input",{bubbles:true}));}
        if(typeof global.autoFillUpdate==="function")global.autoFillUpdate(value);
      });
      group.appendChild(button);
    });
    wrap.appendChild(group);
  }

  function closeDraftConfirmation(){
    if(!draftConfirm)return false;
    draftConfirm.remove();
    draftConfirm=null;
    return true;
  }

  function requestDraftConfirmation(option){
    closeDraftConfirmation();
    const c=copy(),name=(option.querySelector(".pn")||{}).textContent||c.candidates;
    const meta=(option.querySelector(".mobile-candidate-impact")||{}).textContent||"";
    const bar=document.createElement("div");
    bar.id="mobileDraftConfirm";
    bar.className="mobile-draft-confirm";
    bar.setAttribute("role","dialog");
    bar.setAttribute("aria-label",c.candidates);
    bar.innerHTML='<div class="mobile-draft-confirm-copy"><strong></strong><span></span></div><button type="button" data-draft-confirm></button><button type="button" data-draft-cancel></button>';
    bar.querySelector("strong").textContent=name.trim();
    bar.querySelector("span").textContent=meta;
    bar.querySelector("[data-draft-confirm]").textContent=c.addPlayer;
    bar.querySelector("[data-draft-cancel]").textContent=c.cancel;
    bar.querySelector("[data-draft-confirm]").addEventListener("click",()=>{
      approvedDraftChoices.add(option);
      closeDraftConfirmation();
      option.click();
      queueMicrotask(()=>approvedDraftChoices.delete(option));
      haptic(18);
    });
    bar.querySelector("[data-draft-cancel]").addEventListener("click",closeDraftConfirmation);
    document.body.appendChild(bar);
    draftConfirm=bar;
    bar.querySelector("[data-draft-confirm]").focus({preventScroll:true});
  }

  function ensureFeedSummary(){
    const feed=document.getElementById("feed");
    if(!feed)return;
    const count=feed.children.length;
    if(count<lastFeedCount)unreadFeedCount=0;
    else if(count>lastFeedCount)unreadFeedCount+=count-lastFeedCount;
    lastFeedCount=count;
    const header=document.getElementById("feedHdr");
    let badge=header&&header.querySelector(".mobile-feed-unread");
    if(header&&!badge){
      badge=document.createElement("span");
      badge.className="mobile-feed-unread hidden";
      header.appendChild(badge);
    }
    if(badge){
      badge.textContent=copy().newFeed+(unreadFeedCount>1?" "+unreadFeedCount:"");
      badge.classList.toggle("hidden",unreadFeedCount<1);
    }
    let toggle=document.getElementById("mobileFeedToggle");
    if(count<=3){
      if(toggle)toggle.classList.add("hidden");
      feed.classList.remove("mobile-feed-expanded");
      return;
    }
    if(!toggle){
      toggle=document.createElement("button");
      toggle.id="mobileFeedToggle";
      toggle.type="button";
      toggle.className="mobile-feed-toggle";
      toggle.addEventListener("click",()=>{
        const expanded=feed.classList.toggle("mobile-feed-expanded");
        unreadFeedCount=0;
        const unread=document.querySelector(".mobile-feed-unread");
        if(unread)unread.classList.add("hidden");
        toggle.setAttribute("aria-expanded",expanded?"true":"false");
        toggle.textContent=expanded?copy().feedLess:copy().feedMore;
      });
      feed.after(toggle);
    }
    toggle.classList.remove("hidden");
    toggle.setAttribute("aria-expanded",feed.classList.contains("mobile-feed-expanded")?"true":"false");
    toggle.textContent=feed.classList.contains("mobile-feed-expanded")?copy().feedLess:copy().feedMore;
  }

  function ensureHubPreflight(){
    const play=document.getElementById("playBtn"),injury=document.getElementById("injbar");
    if(!play||!injury)return;
    const warned=!injury.classList.contains("hidden")&&!!injury.textContent.trim();
    play.classList.toggle("mobile-has-warning",warned);
    if(warned){
      play.setAttribute("aria-describedby","injbar");
      play.title=copy().lineupWarning;
    }else{
      play.removeAttribute("aria-describedby");
      if(play.title===copy().lineupWarning)play.removeAttribute("title");
    }
  }

  function ensureCupPosition(){
    const road=document.getElementById("fixbar"),current=road&&road.querySelector(".fix.cur");
    if(!road||!current)return;
    const key=String(current.textContent||"").trim();
    if(road.dataset.mobileCentered===key)return;
    road.dataset.mobileCentered=key;
    requestAnimationFrame(()=>{
      road.scrollLeft=Math.max(0,current.offsetLeft-(road.clientWidth-current.clientWidth)/2);
      updateScrollableState(road);
    });
  }

  function ensureProfileNav(){
    const layer=document.querySelector(".player-profile-layer.is-sheet:not(.hidden)");
    const content=layer&&layer.querySelector(".player-profile-content");
    if(!content||content.querySelector(".mobile-profile-nav")||!content.querySelector(".player-profile-overview"))return;
    const c=copy(),nav=document.createElement("nav");
    nav.className="mobile-profile-nav";
    nav.setAttribute("aria-label",languageIsTurkish()?"Profil bölümleri":"Profile sections");
    [
      [".player-profile-radar",c.profileOverview],
      [".player-profile-insight-grid",c.profileInsights],
      [".player-profile-analysis",c.profileAnalysis],
    ].forEach(([selector,label])=>{
      if(!content.querySelector(selector))return;
      const button=document.createElement("span");
      button.tabIndex=-1;
      button.className="mobile-profile-jump";
      button.setAttribute("role","button");
      button.textContent=label;
      button.addEventListener("click",()=>{
        const target=content.querySelector(selector);
        if(target)target.scrollIntoView({behavior:readPreference("battery")?"auto":"smooth",block:"start"});
      });
      nav.appendChild(button);
    });
    const details=content.querySelector(".player-profile-details");
    if(details)details.after(nav);
    else content.querySelector(".player-profile-head")?.after(nav);
  }

  function wrapResultDisclosure(node,label,open){
    if(!node||node.closest(".mobile-result-disclosure"))return;
    const details=document.createElement("details");
    details.className="mobile-result-disclosure";
    details.open=!!open;
    const summary=document.createElement("summary");
    summary.textContent=label;
    node.before(details);
    details.append(summary,node);
    details.addEventListener("toggle",()=>{
      if(!isPhoneInteraction()||!details.open)return;
      document.querySelectorAll("#result .mobile-result-disclosure").forEach(other=>{
        if(other!==details)other.open=false;
      });
    });
  }

  function ensureResultDisclosures(){
    if(!isPhoneInteraction()){
      document.querySelectorAll("#result .mobile-result-disclosure").forEach(details=>{
        const content=details.querySelector(":scope > :not(summary)");
        if(content)details.before(content);
        details.remove();
      });
      return;
    }
    const c=copy();
    wrapResultDisclosure(document.getElementById("finalReport"),c.resultMatch,true);
    wrapResultDisclosure(document.getElementById("storyTile"),c.resultStory,false);
    wrapResultDisclosure(document.getElementById("econTile"),c.resultEconomy,false);
    wrapResultDisclosure(document.getElementById("lineups"),c.resultLineups,false);
    document.querySelectorAll("#result .mobile-result-disclosure").forEach(details=>{
      const content=details.querySelector(":scope > :not(summary)");
      details.classList.toggle("hidden",!!(content&&content.classList.contains("hidden")));
    });
  }

  function ensurePenaltyCoach(){
    const modal=document.querySelector(".pen-modal");
    if(!modal)return;
    const c=copy();
    if(!modal.querySelector(".mobile-penalty-coach")){
      const coach=document.createElement("p");
      coach.className="mobile-penalty-coach";
      coach.textContent=c.penaltyHint;
      const head=modal.querySelector(".pen-head");
      if(head)head.after(coach);
      else modal.prepend(coach);
    }
    modal.querySelectorAll(".pen-dir-btn").forEach(button=>{
      if(!button.getAttribute("aria-label"))button.setAttribute("aria-label",button.textContent.trim());
    });
  }

  function updateEventBadge(){
    const badge=document.querySelector('[data-sim-view="events"] .mobile-tab-badge');
    const button=document.querySelector('[data-sim-view="events"]');
    if(!badge||!button)return;
    badge.textContent=unreadEventCount>9?"9+":String(unreadEventCount);
    badge.classList.toggle("hidden",unreadEventCount<1);
    badge.setAttribute("aria-label",unreadEventCount+" "+copy().newEvent);
    button.setAttribute("aria-label",unreadEventCount?copy().events+" · "+unreadEventCount+" "+copy().newEvent:copy().events);
  }

  function smartSlowdown(){
    if(!readPreference("smartSpeed")||typeof global.setSpeed!=="function")return;
    const active=document.querySelector(".spd[data-s].on");
    const current=Number(active&&active.dataset.s)||10;
    if(current<=10)return;
    requestedSmartSpeed=current;
    global.setSpeed(10);
    const status=document.getElementById("mobileTacticStatus");
    if(status)status.textContent=copy().criticalSpeed;
    clearTimeout(smartSpeedTimer);
    smartSpeedTimer=setTimeout(()=>{
      if(!document.getElementById("sim")?.classList.contains("hidden"))global.setSpeed(requestedSmartSpeed);
    },3400);
  }

  function syncMatchEvents(){
    const list=document.getElementById("simGoals");
    if(!list)return;
    const count=list.children.length;
    if(count<lastEventCount){
      unreadEventCount=0;
      lastEventCount=count;
      updateEventBadge();
      return;
    }
    if(count>lastEventCount){
      const added=[...list.children].slice(lastEventCount);
      if(document.getElementById("sim")?.dataset.mobileView!=="events")unreadEventCount+=count-lastEventCount;
      if(added.some(node=>node.matches(".event-goal,.event-red-card,.event-yellow-card,.event-danger,.event-post"))){
        smartSlowdown();
        haptic(added.some(node=>node.matches(".event-goal"))?[24,30,36]:16);
      }
    }
    lastEventCount=count;
    updateEventBadge();
  }

  function ensureTacticStatus(){
    const row=document.getElementById("shoutrow");
    if(!row)return;
    let status=document.getElementById("mobileTacticStatus");
    if(!status){
      status=document.createElement("div");
      status.id="mobileTacticStatus";
      status.className="mobile-tactic-status";
      status.setAttribute("role","status");
      status.setAttribute("aria-live","polite");
      row.after(status);
    }
  }

  function ensureSkipButton(){
    const button=document.querySelector(".speedrow .btn-mini");
    if(button&&!button.id)button.id="mobileSkipBtn";
  }

  function ensureNativeShare(){
    const modal=document.querySelector("#modal .share-modal");
    if(!modal||modal.querySelector(".mobile-native-share")||!global.navigator||typeof global.navigator.share!=="function")return;
    const actions=modal.querySelector(".share-actions");
    if(!actions)return;
    const button=document.createElement("button");
    button.type="button";
    button.className="btn btn-primary mobile-native-share";
    button.textContent=copy().nativeShare;
    button.addEventListener("click",()=>{
      const title=document.title||"copa.life";
      const result=(document.getElementById("rFinish")||{}).textContent||"";
      const score=(document.getElementById("rLn")||{}).textContent||"";
      global.navigator.share({title,text:[result,score].filter(Boolean).join(" · "),url:global.location.href}).catch(()=>{});
    });
    actions.prepend(button);
  }

  function handleBack(){
    if(global.PlayerProfiles&&global.PlayerProfiles.isOpen()){global.PlayerProfiles.close();return true;}
    const consent=document.getElementById("ghostConsentDialog");
    if(consent){consent.remove();return true;}
    const settings=document.getElementById("settingsDrop");
    if(settings&&!settings.classList.contains("hidden")){settings.classList.add("hidden");return true;}
    if(closeDraftConfirmation())return true;
    const modal=document.getElementById("modal");
    if(isVisible(modal)&&typeof global.closeModal==="function"){global.closeModal();return true;}
    const cancel=document.querySelector(".tap-helper:not(.hidden) .tap-cancel");
    if(cancel){cancel.click();return true;}
    const sim=document.getElementById("sim"),pause=document.getElementById("pauseBtn");
    if(isVisible(sim)&&pause&&!pause.classList.contains("pause")&&typeof global.simPause==="function"){
      global.simPause();
      showToast(copy().matchPaused,{type:"info",duration:2600});
      return true;
    }
    return false;
  }

  function pauseForSkipPrompt(){
    const simElement=document.getElementById("sim");
    const pauseButton=document.getElementById("pauseBtn");
    if(isVisible(simElement)&&pauseButton&&!pauseButton.classList.contains("pause")&&typeof global.simPause==="function"){
      global.simPause();
    }
  }

  function cancelSkip(){
    if(typeof global.closeModal==="function")global.closeModal();
  }

  function confirmSkip(){
    try{localStorage.setItem("copa_mobile_skip_confirmed","1");}catch(_){}
    if(typeof global.closeModal==="function")global.closeModal();
    if(typeof global.simSkip==="function")global.simSkip();
  }

  function setAsyncState(target,state,message){
    const element=typeof target==="string"?document.querySelector(target):target;
    if(!element)return;
    ["is-loading","is-empty","is-error","is-offline"].forEach(name=>element.classList.remove(name));
    if(state&&state!=="ready")element.classList.add("is-"+state);
    element.setAttribute("aria-busy",state==="loading"?"true":"false");
    if(message)element.setAttribute("data-state-message",message);
    else element.removeAttribute("data-state-message");
  }

  function syncOverlayScroll(){
    const modal=document.getElementById("modal"),open=isVisible(modal);
    if(open&&!modalWasOpen)modalScrollY=global.scrollY;
    if(!open&&modalWasOpen&&Math.abs(global.scrollY-modalScrollY)>2){
      requestAnimationFrame(()=>global.scrollTo({top:modalScrollY,behavior:"auto"}));
    }
    modalWasOpen=open;
  }

  function showResumeNotice(){
    if(!hadSavedRunOnInit)return;
    const phase=["draft","hub"].find(id=>isVisible(document.getElementById(id)));
    if(!phase)return;
    let shown=false;
    try{shown=sessionStorage.getItem("copa_mobile_resume_notice")==="1";}catch(_){}
    if(shown)return;
    try{sessionStorage.setItem("copa_mobile_resume_notice","1");}catch(_){}
    showToast(copy().resumed,{type:"info",duration:2600});
  }

  function enhance(){
    enhanceFrame=0;
    if(!isPhoneInteraction())return;
    ensurePreferences();
    syncPreferenceLanguage();
    ensureNetworkBanner();
    ensureIntroGuide();
    ensureDraftContext();
    enhanceDraftCandidates();
    ensureAutoFillPresets();
    ensureScrollAffordances();
    ensureFeedSummary();
    ensureHubPreflight();
    ensureCupPosition();
    ensureProfileNav();
    ensureResultDisclosures();
    ensurePenaltyCoach();
    ensureTacticStatus();
    ensureSkipButton();
    ensureNativeShare();
    syncMatchEvents();
    syncOverlayScroll();
  }

  function scheduleEnhance(){
    if(enhanceFrame)return;
    enhanceFrame=requestAnimationFrame(enhance);
  }

  function sync(){
    syncFrame=0;
    const nav=ensureSimTabs();
    syncSimLanguage(nav);
    const sim=document.getElementById("sim");
    if(sim&&!sim.dataset.mobileView)setSimView("field");
    if(!isPhoneInteraction()){
      hideDock();
      return;
    }
    if(dock)dock.setAttribute("aria-label",copy().actions);
    const candidate=dockCandidate();
    if(candidate)mountDock(candidate);
    else hideDock();
    scheduleEnhance();
  }

  function scheduleSync(){
    if(syncFrame)return;
    syncFrame=requestAnimationFrame(sync);
  }

  function updateKeyboardState(){
    const active=document.activeElement;
    const editable=active&&(
      /^(INPUT|TEXTAREA|SELECT)$/.test(active.tagName)||
      active.getAttribute("contenteditable")==="true"
    );
    const viewport=global.visualViewport;
    const keyboardOpen=!!(editable&&viewport&&global.innerHeight-viewport.height>120);
    document.documentElement.classList.toggle("mobile-keyboard-open",keyboardOpen);
  }

  function mutationNeedsEnhance(mutation){
    const target=mutation.target&&mutation.target.nodeType===1?mutation.target:mutation.target&&mutation.target.parentElement;
    if(!target)return false;
    if(target.closest&&target.closest(".mobile-action-dock,.mobile-pref-group,.mobile-draft-context,.mobile-profile-nav,.mobile-tactic-status,.mobile-result-disclosure>summary,.mobile-network-banner,.mobile-draft-confirm"))return false;
    return !!(target.matches&&target.matches("#opts,#feed,#simGoals,#modal,#roundtag,#powV,#chemV,#kasaV,#ddSub,#ddClock,#budgetV,#result,#fixbar,#shopcards,.player-profile-content,.autofill-wrap")||
      target.closest&&target.closest("#opts,#feed,#simGoals,#modal,#roundtag,#result,.player-profile-content"));
  }

  function handleDocumentCapture(event){
    if(!isPhoneInteraction())return;
    const target=event.target&&event.target.closest?event.target.closest("button,[role='button']"):null;
    if(!target)return;
    const option=target.closest("#opts .opt");
    if(option&&readPreference("confirmPick")&&!option.classList.contains("tooexp")&&!approvedDraftChoices.has(option)){
      event.preventDefault();
      event.stopImmediatePropagation();
      requestDraftConfirmation(option);
      return;
    }
    if(target.id==="mobileSkipBtn"){
      let confirmed=false;
      try{confirmed=localStorage.getItem("copa_mobile_skip_confirmed")==="1";}catch(_){}
      if(!confirmed&&typeof global.showModal==="function"){
        event.preventDefault();
        event.stopImmediatePropagation();
        const c=copy();
        pauseForSkipPrompt();
        global.showModal('<div class="mobile-skip-confirm"><div class="kithdr">'+c.skipTitle+'</div><p>'+c.skipBody+'</p><div class="bact"><button class="btn btn-primary" onclick="CopaMobileExperience.confirmSkip()">'+c.skipConfirm+'</button><button class="btn btn-ghost" onclick="CopaMobileExperience.cancelSkip()">'+c.cancel+'</button></div></div>',{dismissOnOverlay:true,label:c.skipTitle});
      }
    }
  }

  function handleDocumentClick(event){
    if(!isPhoneInteraction())return;
    const target=event.target&&event.target.closest?event.target.closest("button,[role='button'],.shopcard"):null;
    if(!target)return;
    if(target.id==="startBtn"||target.id==="quickStartBtn"){
      try{localStorage.setItem("copa_mobile_seen","1");}catch(_){}
    }
    const shout=target.closest(".shoutbtn");
    if(shout){
      const result=global._lastShoutResult;
      if(!result||!result.ok)return;
      const map={shMore:"tacticMore",shPush:"tacticPush",shCalm:"tacticCalm",shHold:"tacticHold"};
      const key=map[shout.id],status=document.getElementById("mobileTacticStatus"),c=copy();
      if(key&&status)status.textContent=c[key]+" "+c.tacticApplied+" · "+result.usesLeft+" / 3.";
      haptic(14);
    }
    const speed=target.closest(".spd[data-s]");
    if(speed)requestedSmartSpeed=Number(speed.dataset.s)||10;
    if(target.closest("#opts .opt,.shopcard,.pen-dir-btn,#playBtn,#againBtn,#quickBtn"))haptic(12);
  }

  function checkpoint(){
    try{if(typeof global._saveState==="function")global._saveState();}catch(_){}
    try{if(global.sim&&typeof global.sim.checkpoint==="function")global.sim.checkpoint();}catch(_){}
  }

  function init(){
    try{hadSavedRunOnInit=!!localStorage.getItem("copa_run_v5");}catch(_){}
    ensureDock();
    ensureSimTabs();
    const observed=["intro","draft","hub","sim","result","modal"]
      .map(id=>document.getElementById(id))
      .filter(Boolean);
    const observer=new MutationObserver(scheduleSync);
    observed.forEach(element=>observer.observe(element,{attributes:true,attributeFilter:["class"]}));
    const simRadio=document.getElementById("simRadio");
    if(simRadio)observer.observe(simRadio,{childList:true,subtree:true});
    const enhancementObserver=new MutationObserver(mutations=>{
      if(mutations.some(mutationNeedsEnhance))scheduleEnhance();
    });
    enhancementObserver.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:["class","aria-hidden"]});
    if(phoneMedia.addEventListener)phoneMedia.addEventListener("change",scheduleSync);
    else if(phoneMedia.addListener)phoneMedia.addListener(scheduleSync);
    global.addEventListener("orientationchange",()=>{scheduleSync();scheduleEnhance();},{passive:true});
    global.addEventListener("resize",()=>{scheduleSync();scheduleEnhance();},{passive:true});
    global.addEventListener("offline",()=>syncNetworkState(false));
    global.addEventListener("online",()=>syncNetworkState(true));
    if(global.visualViewport){
      global.visualViewport.addEventListener("resize",()=>{
        updateKeyboardState();
        scheduleSync();
      },{passive:true});
      global.visualViewport.addEventListener("scroll",updateKeyboardState,{passive:true});
    }
    document.addEventListener("focusin",updateKeyboardState);
    document.addEventListener("focusout",()=>setTimeout(updateKeyboardState,0));
    document.addEventListener("click",handleDocumentCapture,true);
    document.addEventListener("click",handleDocumentClick);
    document.addEventListener("visibilitychange",()=>{if(document.hidden)checkpoint();});
    global.addEventListener("pagehide",checkpoint,{passive:true});
    applyPreferences();
    syncNetworkState(false);
    scheduleSync();
    scheduleEnhance();
    setTimeout(showResumeNotice,700);
  }

  global.CopaMobileExperience={
    refresh:scheduleSync,
    setSimView,
    isPhoneInteraction,
    handleBack,
    cancelSkip,
    confirmSkip,
    setAsyncState,
    haptic,
  };

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});
  else init();
})(window);
