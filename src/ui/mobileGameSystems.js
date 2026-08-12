/* Mobile-native navigation, start flow, card sheets and locker-room presentation. */
(function(root){
  "use strict";
  const phone=()=>!!(root.matchMedia&&root.matchMedia("(max-width: 760px)").matches);
  const native=()=>!!(root.COPA_IS_NATIVE||root.Capacitor&&root.Capacitor.isNativePlatform&&root.Capacitor.isNativePlatform());
  const mobile=()=>phone()||native();
  const gameMode=()=>native()||new URLSearchParams(root.location.search).has("native-game");
  const tr=()=>root.LANG==="tr";
  const NAV_COPY={
    tr:{labels:{match:"MAÇ",market:"PAZAR",training:"ANTRENMAN",sidefield:"YAN SAHA",career:"KARİYER"},offers:"yeni alınabilir teklifler"},
    en:{labels:{match:"MATCH",market:"MARKET",training:"TRAINING",sidefield:"SIDE FIELD",career:"CAREER"},offers:"new affordable offers"},
    es:{labels:{match:"PARTIDO",market:"MERCADO",training:"ENTRENO",sidefield:"CAMPO LATERAL",career:"CARRERA"},offers:"nuevas ofertas asequibles"},
    de:{labels:{match:"SPIEL",market:"MARKT",training:"TRAINING",sidefield:"NEBENPLATZ",career:"KARRIERE"},offers:"neue bezahlbare Angebote"},
    it:{labels:{match:"PARTITA",market:"MERCATO",training:"ALLENAMENTO",sidefield:"CAMPO LATERALE",career:"CARRIERA"},offers:"nuove offerte accessibili"}
  };
  const navCopy=()=>NAV_COPY[root.LANG]||NAV_COPY.en;
  function matchAttendance(matchRound,homePower,awayPower){
    const bases=[8000,14000,22000,34000,52000,75000,90000],index=Math.max(0,Math.min(6,(Number(matchRound)||1)-1));
    return Math.round(bases[index]*(.65+Math.min(.33,Math.max(0,((Number(homePower)||0)-(Number(awayPower)||0))/100)))/1000)*1000;
  }
  const matchdayIncomeForAttendance=attendance=>Math.max(1,Math.min(4,Math.ceil((Number(attendance)||0)/20000)));
  const penaltyAtmosphereBonus=attendance=>Math.max(1,Math.min(5,Math.ceil((Number(attendance)||0)/18000)));
  function creditMatchdayIncome(matchRound,homePower,awayPower){
    const attendance=matchAttendance(matchRound,homePower,awayPower),stats=root.econStats||{},list=Array.isArray(stats.transactions)?stats.transactions:[],previous=list.find(item=>item&&item.tag==="matchday"&&Number(item.round)===Number(matchRound));
    if(previous)return{attendance,amount:Number(previous.amount)||0,credited:false};
    const amount=matchdayIncomeForAttendance(attendance);
    root.earn(amount,"earned");const transaction=stats.transactions&&stats.transactions.at(-1);if(transaction)transaction.tag="matchday";stats.matchday=(stats.matchday||0)+amount;
    if(typeof root.setBudget==="function")root.setBudget();
    if(typeof root.pushFeed==="function")root.pushFeed("🎟️ "+(tr()?"Maç günü geliri":"Matchday income")+": +€"+amount+"M · "+Math.round(attendance/1000)+"K","buy");
    return{attendance,amount,credited:true};
  }
  Object.assign(root,{matchAttendance,matchdayIncomeForAttendance,penaltyAtmosphereBonus,creditMatchdayIncome});
  let setupStep=1,activeRoute="match",activeCareerSection="career",pressTimer=0,pressedCard=null,seenMarketSignature="";
  const NAV_ICONS={
    match:'<svg class="hub-tab-svg hub-tab-svg-match" viewBox="0 0 36 36" aria-hidden="true"><rect class="hub-tab-icon-frame" x="4.5" y="6.5" width="27" height="23" rx="4"/><path d="M18 6.5v23M4.5 18h27"/><circle cx="18" cy="18" r="4.2"/><path class="hub-tab-motion" d="M9 25c3.2-1.2 5.3-3.2 7.1-6.1"/><circle class="hub-tab-token" cx="9" cy="25" r="2.1"/></svg>',
    market:'<svg class="hub-tab-svg hub-tab-svg-market" viewBox="0 0 36 36" aria-hidden="true"><path class="hub-tab-icon-frame" d="M6 14h24v16H6zM9 9h18l3 5H6z"/><path d="M12 19h6v7h-6m10-7h4m-4 4h4"/><path class="hub-tab-motion" d="M10 8h16"/><circle class="hub-tab-token" cx="25.5" cy="9" r="3"/></svg>',
    training:'<svg class="hub-tab-svg hub-tab-svg-training" viewBox="0 0 36 36" aria-hidden="true"><path class="hub-tab-icon-frame" d="M8 9h20v20H8z"/><path d="M12 14h12M12 19h8M12 24h5"/><path class="hub-tab-motion" d="M24 18v8m-4-4h8"/><circle class="hub-tab-token" cx="26.5" cy="10" r="3"/></svg>',
    sidefield:'<svg class="hub-tab-svg hub-tab-svg-sidefield" viewBox="0 0 36 36" aria-hidden="true"><path class="hub-tab-icon-frame" d="M18 4 29 10v13L18 32 7 23V10Z"/><path d="M18 9v18M11 13l14 10M25 13 11 23"/><circle class="hub-tab-token" cx="18" cy="18" r="3.2"/></svg>',
    career:'<svg class="hub-tab-svg hub-tab-svg-career" viewBox="0 0 36 36" aria-hidden="true"><path class="hub-tab-icon-frame" d="M9 5.5h18v25H9z"/><path d="M13 12h10m-10 6h10m-10 6h6"/><path class="hub-tab-motion" d="m20.5 25 2.2-4.5 2.3 4.5 5 .7-3.6 3.5.8 1.3"/><circle class="hub-tab-token" cx="23" cy="9" r="2.4"/></svg>'
  };
  function navMarkup(){
    const labels=navCopy().labels;
    const remaining=root.CopaPreparation&&typeof root.CopaPreparation.spent==="function"?Math.max(0,2-root.CopaPreparation.spent()):2;
    return Object.keys(labels).map(route=>`<button type="button" data-native-target="${route}" aria-label="${labels[route]}" data-tab-label="${labels[route]}">${NAV_ICONS[route]}<span class="native-hub-tab-label">${labels[route]}</span>${route==="market"?'<i class="native-hub-market-dot hidden" aria-hidden="true"></i>':""}${route==="sidefield"?'<i class="native-hub-sidefield-dot hidden" aria-hidden="true"></i>':""}${route==="training"?`<em class="native-hub-tab-count">${remaining}/2</em>`:""}</button>`).join("");
  }
  function updateTrainingBadge(){
    const badge=document.querySelector('[data-native-target="training"] .native-hub-tab-count');
    if(badge&&root.CopaPreparation&&typeof root.CopaPreparation.spent==="function")badge.textContent=`${Math.max(0,2-root.CopaPreparation.spent())}/2`;
  }
  function marketOfferState(){
    const cards=[...document.querySelectorAll("#shopcards .cardtile[data-card-key]")];
    const transfers=[...document.querySelectorAll("#freeAgentRow .free-agent-card[data-free-agent]")];
    const affordableCards=cards.filter(card=>!card.classList.contains("cant")&&!card.classList.contains("trade-missing"));
    const affordableTransfers=transfers.filter(card=>!card.dataset.lockReason);
    const snapshot=root.CopaPreparation&&typeof root.CopaPreparation.snapshot==="function"?root.CopaPreparation.snapshot():{};
    const signature=[
      Number(snapshot&&snapshot.round)||0,
      ...cards.map(card=>`c:${card.dataset.cardKey||""}:${card.querySelector(".ct-price")?.textContent.trim()||""}`),
      ...transfers.map(card=>`t:${card.getAttribute("title")||card.dataset.freeAgent||""}:${card.querySelector(".ct-price")?.textContent.trim()||""}`)
    ].join("|");
    return{signature,hasAffordable:affordableCards.length+affordableTransfers.length>0};
  }
  function updateMarketBadge(markSeen){
    const button=document.querySelector('[data-native-target="market"]'),dot=button&&button.querySelector(".native-hub-market-dot");
    if(!button||!dot)return false;
    const state=marketOfferState();
    if(markSeen&&state.signature)seenMarketSignature=state.signature;
    const show=activeRoute!=="market"&&state.hasAffordable&&!!state.signature&&state.signature!==seenMarketSignature;
    dot.classList.toggle("hidden",!show);
    button.classList.toggle("has-market-notice",show);
    const label=button.dataset.tabLabel||navCopy().labels.market;
    button.setAttribute("aria-label",show?`${label}, ${navCopy().offers}`:label);
    return show;
  }
  function updateSideFieldBadge(){
    const button=document.querySelector('[data-native-target="sidefield"]'),dot=button&&button.querySelector(".native-hub-sidefield-dot");
    if(!button||!dot)return false;
    const market=root.CopaSideField&&typeof root.CopaSideField.ensureCurrent==="function"?root.CopaSideField.ensureCurrent():null;
    const show=activeRoute!=="sidefield"&&!!market&&market.status==="open";
    dot.classList.toggle("hidden",!show);
    button.classList.toggle("has-sidefield-notice",show);
    return show;
  }
  function playRouteSound(route){
    if(route==="match"&&typeof sfxWhistle==="function")sfxWhistle();
    else if(route==="market"&&typeof sfxCoin==="function")sfxCoin();
    else if(route==="training"&&typeof sfxFormation==="function")sfxFormation();
    else if(route==="sidefield"&&typeof sfxTick==="function")sfxTick();
    else if(route==="career"&&typeof sfxJingle==="function")sfxJingle();
  }
  function landingPitch(){
    const players=[[50,90],[18,72],[39,73],[61,73],[82,72],[24,51],[50,54],[76,51],[18,28],[50,22],[82,28]];
    return `<svg class="mgl-tactical-board" viewBox="0 0 240 150" aria-hidden="true">
      <rect x="5" y="5" width="230" height="140" rx="10"/><path d="M5 75h230"/><circle cx="120" cy="75" r="18"/><circle cx="120" cy="75" r="1.5"/><path d="M75 5v22h90V5M75 145v-22h90v22"/>
      <g class="mgl-shape"><path d="M120 132 46 106 61 76 120 80 179 76 194 106Z"/><path d="M61 76 46 45 120 36 194 45 179 76"/></g>
      <g class="mgl-players">${players.map(([x,y],index)=>`<g style="--i:${index}"><circle cx="${x/100*230+5}" cy="${y/100*140+5}" r="${index===0?4.8:4}"/></g>`).join("")}</g>
    </svg>`;
  }
  function landingMeta(){
    const summary=root.CopaMeta&&typeof root.CopaMeta.careerSummary==="function"?root.CopaMeta.careerSummary():null;
    return{level:Math.max(1,Number(summary&&summary.level)||1),reputation:Math.max(0,Number(summary&&summary.reputation)||0),licenses:Math.max(0,Number(summary&&summary.licenses)||0)};
  }

  function savedSummary(saved){
    const picks=Array.isArray(saved&&saved.picks)?saved.picks.filter(Boolean):[];
    const power=picks.length?Math.round(picks.reduce((sum,p)=>sum+Number(p.eff||p.ov||0),0)/picks.length):"—";
    const opponent=saved&&saved.opponent&&saved.opponent.name||saved&&saved.fixtures&&saved.fixtures[Math.max(0,(saved.round||1)-1)]&&saved.fixtures[Math.max(0,(saved.round||1)-1)].opp||"—";
    return{club:saved&&saved.teamName||"Copa Life",round:Math.max(1,Number(saved&&saved.round)||1),power,opponent};
  }
  function shouldGateResume(saved){return gameMode()&&!!saved;}
  function showLanding(saved){
    if(!gameMode())return false;
    const intro=document.getElementById("intro"),land=document.getElementById("introLand"),setup=document.getElementById("introSetup");
    if(!intro||!land||!setup)return false;
    document.documentElement.classList.add("copa-mobile-game");
    document.body.classList.remove("mobile-game-setup-open","mobile-game-setup-final");
    document.body.classList.add("mobile-game-landing-open");
    setup.classList.add("hidden");
    let view=document.getElementById("mobileGameLanding");
    if(!view){view=document.createElement("div");view.id="mobileGameLanding";view.className="mobile-game-landing";land.prepend(view);}
    view._savedRun=saved||null;
    const data=saved?savedSummary(saved):null,meta=landingMeta();
    view.innerHTML=`<div class="mgl-atmosphere" aria-hidden="true"><span class="mgl-light mgl-light-l"></span><span class="mgl-light mgl-light-r"></span><span class="mgl-tunnel"></span></div><div class="mgl-content"><div class="mgl-brand"><small>${tr()?"KADERİNİ KUR":"BUILD YOUR FATE"}</small><h1>COPA LIFE</h1><p>${tr()?"Yedi maç. Tek kupa. Her seçim kulübünün hikâyesini değiştirir.":"Seven matches. One cup. Every choice changes your club's story."}</p></div><ol class="mgl-road" aria-label="${tr()?"Kupa yolu":"Cup journey"}"><li>${tr()?"KADRO":"SQUAD"}</li><li>${tr()?"GRUPLAR":"GROUPS"}</li><li>${tr()?"ELEMELER":"KNOCKOUT"}</li><li>${tr()?"KUPA":"CUP"}</li></ol><div class="mgl-board-wrap"><span>4–3–3 · ${tr()?"DENGELİ YERLEŞİM":"BALANCED SHAPE"}</span>${landingPitch()}</div><section class="mgl-meta" aria-label="${tr()?"Kariyer özeti":"Career summary"}"><div class="mgl-career"><span>${tr()?"KARİYER":"CAREER"}</span><b>${tr()?"SEVİYE":"LEVEL"} ${meta.level}</b><b>${meta.reputation} ${tr()?"İTİBAR":"REP"}</b><b>${meta.licenses} ${tr()?"LİSANS":"LICENCES"}</b></div><div class="mgl-world"><b>6 <small>${tr()?"ÜLKE":"COUNTRIES"}</small></b><b>11 <small>${tr()?"LİG":"LEAGUES"}</small></b><b>9.827 <small>${tr()?"OYUNCU":"PLAYERS"}</small></b><b>220 <small>${tr()?"KULÜP":"CLUBS"}</small></b></div></section><div class="mgl-bottom">${data?`<article class="mgl-save"><span>${tr()?"DEVAM EDEN KARİYER":"ACTIVE CAREER"}</span><h2>${escapeHtml(data.club)}</h2><div><b>${tr()?"MAÇ":"MATCH"} ${data.round}/7</b><b>${tr()?"GÜÇ":"POWER"} ${data.power}</b></div><p>${tr()?"Sıradaki rakip":"Next opponent"} · ${escapeHtml(data.opponent)}</p></article>`:""}<div class="mgl-actions">${data?`<button class="btn btn-go" onclick="CopaMobileShell.continueRun()">${tr()?"KARİYERE DEVAM ET":"CONTINUE CAREER"}</button>`:""}<button class="btn ${data?"btn-ghost":"btn-go"}" onclick="CopaMobileShell.newRun()">${tr()?"BAŞLA":"START"}</button><button class="arena-entry mgl-arena-entry" data-mobile-arena type="button" onclick="CopaLazy.openArena()" aria-label="Copa Arena"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 17V8l8-4 8 4v9M2 20h20M7 17v-5h10v5M9 9h6"/></svg><span>COPA ARENA</span><span class="arena-entry-live"><i></i> LIVE</span></button></div></div></div>`;
    view.querySelector("[data-mobile-arena]")?.remove();
    land.classList.remove("hidden");intro.classList.remove("hidden");
    return true;
  }
  function escapeHtml(value){const div=document.createElement("div");div.textContent=String(value||"");return div.innerHTML;}
  function continueRun(){
    document.body.classList.remove("mobile-game-landing-open","mobile-game-setup-open","mobile-game-setup-final");
    const view=document.getElementById("mobileGameLanding");if(view)view.remove();
    if(typeof root._tryRestoreState==="function")root._tryRestoreState();
    root.requestAnimationFrame(()=>root.scrollTo(0,0));
  }
  function newRun(){
    document.body.classList.remove("mobile-game-landing-open");
    document.body.classList.add("mobile-game-setup-open");
    if(typeof root._clearState==="function")root._clearState();
    const view=document.getElementById("mobileGameLanding");if(view)view.remove();
    const land=document.getElementById("introLand"),setup=document.getElementById("introSetup");
    if(land)land.classList.add("hidden");if(setup)setup.classList.remove("hidden");
    prepareStepper();setSetupStep(1);
  }
  function prepareStepper(){
    if(!gameMode())return;
    const setup=document.getElementById("introSetup"),country=document.getElementById("countryPick"),form=document.getElementById("formpick"),chair=document.getElementById("chairpick");
    if(!setup||!country||!form||!chair)return;
    const countryGroup=country.closest(".v7-setup-group"),two=form.closest(".v7-setup-twocol"),formCol=form.closest(".v7-setup-subcol"),chairCol=chair.closest(".v7-setup-subcol");
    if(countryGroup)countryGroup.dataset.mobileStep="1";if(formCol)formCol.dataset.mobileStep="2";if(chairCol)chairCol.dataset.mobileStep="3";if(two)two.classList.add("mobile-step-host");
    let nav=document.getElementById("mobileSetupNav");
    if(!nav){
      nav=document.createElement("div");nav.id="mobileSetupNav";nav.className="mobile-setup-nav";
      nav.innerHTML=`<div class="mobile-step-progress"><i></i><b>1/3</b></div><div class="mobile-step-buttons"><button type="button" class="btn btn-ghost" data-step-back onclick="CopaMobileShell.step(-1)">← ${tr()?"GERİ":"BACK"}</button><button type="button" class="btn btn-primary" data-step-next onclick="CopaMobileShell.step(1)">${tr()?"DEVAM":"NEXT"} →</button></div>`;
      setup.prepend(nav);
    }
    enhanceSetupChoices();
  }
  function enhanceSetupChoices(){
    document.querySelectorAll("#countryPick button").forEach(button=>{
      button.classList.add("mobile-country-card");
      const textNodes=[...button.childNodes].filter(node=>node.nodeType===Node.TEXT_NODE&&node.textContent.trim());
      let label=button.querySelector(".country-name");
      if(!label){label=document.createElement("span");label.className="country-name";button.appendChild(label);}
      if(textNodes.length)label.textContent=textNodes[textNodes.length-1].textContent.trim();
      textNodes.forEach(node=>node.remove());
    });
    document.querySelectorAll("#formpick .fbtn").forEach(button=>{
      button.classList.add("mobile-formation-card");
      button.querySelectorAll(".formation-card-kicker").forEach(node=>node.remove());
    });
    document.querySelectorAll("#chairpick .chairbtn").forEach(button=>{
      button.classList.add("mobile-chair-card");
      button.querySelector(".chair-mobile-meta")?.remove();
      if(!button.querySelector(".chair-detail-link"))button.insertAdjacentHTML("beforeend",`<span class="chair-detail-link">${tr()?"DETAY →":"DETAIL →"}</span>`);
    });
  }
  function setSetupStep(value){
    setupStep=Math.max(1,Math.min(3,Number(value)||1));prepareStepper();
    document.body.classList.toggle("mobile-game-setup-final",setupStep===3);
    const setup=document.getElementById("introSetup");if(setup)setup.dataset.mobileCurrentStep=String(setupStep);
    document.querySelectorAll("#introSetup [data-mobile-step]").forEach(node=>node.classList.toggle("is-mobile-step-active",Number(node.dataset.mobileStep)===setupStep));
    const nav=document.getElementById("mobileSetupNav"),cta=document.querySelector("#introSetup .v7-cta-stack");
    if(nav){const bar=nav.querySelector("i"),label=nav.querySelector("b"),back=nav.querySelector("[data-step-back]"),next=nav.querySelector("[data-step-next]");if(bar)bar.style.width=`${setupStep/3*100}%`;if(label)label.textContent=`${setupStep}/3`;if(back)back.disabled=setupStep===1;if(next)next.classList.toggle("hidden",setupStep===3);}
    if(cta)cta.classList.toggle("is-mobile-step-active",setupStep===3);
  }
  function step(delta){setSetupStep(setupStep+(Number(delta)||0));}
  function handleBack(){
    const setup=document.getElementById("introSetup");
    if(setup&&!setup.classList.contains("hidden")&&gameMode()){
      if(setupStep>1){step(-1);return true;}
      const land=document.getElementById("introLand");setup.classList.add("hidden");if(land)land.classList.remove("hidden");showLanding(null);return true;
    }
    const hub=document.getElementById("hub");
    if(hub&&!hub.classList.contains("hidden")&&hub.dataset.mobileRoute&&hub.dataset.mobileRoute!=="match"){activateRoute("match");return true;}
    return false;
  }
  function normalizePlayButton(){
    const play=document.getElementById("playBtn");if(!play)return;
    const fallback=tr()?"MAÇA ÇIK":"PLAY MATCH";
    const raw=(play.dataset.mobileLabel||play.textContent||fallback).replace(/[→›]+/g,"").trim();
    play.dataset.mobileLabel=raw||fallback;
    play.innerHTML=`<span>${escapeHtml(play.dataset.mobileLabel)}</span><span class="dock-play-arrow" aria-hidden="true">→</span>`;
  }

  function ensureSideFieldRoute(){
    if(root.CopaSideField){root.CopaSideField.ensureCurrent();root.CopaSideField.mount();return Promise.resolve(root.CopaSideField);}
    if(!root.CopaLazy||typeof root.CopaLazy.ensureSideField!=="function")return Promise.resolve(null);
    return root.CopaLazy.ensureSideField().then(api=>{api.ensureCurrent();api.mount();return api;}).catch(()=>null);
  }

  function activateRoute(route){
    const hub=document.getElementById("hub");if(!hub)return;
    const previousRoute=hub.dataset.mobileRoute||"";
    activeRoute=["match","market","training","sidefield","career"].includes(route)?route:"match";
    hub.dataset.mobileRoute=activeRoute;
    const actionDock=document.getElementById("mobileActionDock");
    if(actionDock)actionDock.classList.toggle("mobile-route-suppressed",activeRoute!=="match");
    const nav=document.getElementById("nativeHubNav");
    if(nav)nav.querySelectorAll("[data-native-target]").forEach(button=>{
      const selected=button.dataset.nativeTarget===activeRoute;
      button.classList.toggle("active",selected);
      button.setAttribute("aria-current",selected?"page":"false");
    });
    if(previousRoute&&previousRoute!==activeRoute)playRouteSound(activeRoute);
    normalizePlayButton();
    if(activeRoute==="training")renderTrainingRoute();
    if(activeRoute==="sidefield")ensureSideFieldRoute().then(()=>{if(activeRoute==="sidefield")document.getElementById("sideFieldRoute")?.scrollIntoView({block:"start",behavior:document.body.classList.contains("reduced-motion")?"auto":"smooth"});});
    if(activeRoute==="career")renderCareerRoute();
    updateTrainingBadge();
    updateMarketBadge(activeRoute==="market");
    updateSideFieldBadge();
    if(root.CopaMobileExperience&&typeof root.CopaMobileExperience.refresh==="function")root.CopaMobileExperience.refresh();
    const target=nav||(activeRoute==="market"?document.getElementById("shopcards"):activeRoute==="training"?document.getElementById("mobileTrainingRoute"):activeRoute==="sidefield"?document.getElementById("sideFieldRoute"):activeRoute==="career"?document.getElementById("mobileCareerRoute"):hub.querySelector(".vsbar"));
    if(target)target.scrollIntoView({block:"start",behavior:document.body.classList.contains("reduced-motion")?"auto":"smooth"});
  }
  function ensureRoutes(){
    const hub=document.getElementById("hub");if(!hub)return;
    const scouts=[...document.querySelectorAll("#scoutBtn")],scout=scouts.shift();
    scouts.forEach(node=>node.remove());
    let trainingRoute=document.getElementById("mobileTrainingRoute");
    if(!trainingRoute){trainingRoute=document.createElement("section");trainingRoute.id="mobileTrainingRoute";trainingRoute.className="mobile-training-route";hub.appendChild(trainingRoute);}
    if(scout&&scout.parentElement!==trainingRoute){
      trainingRoute.appendChild(scout);
    }
    ensureSideFieldRoute();
    const feed=document.getElementById("feedwrap"),matchColumn=hub.querySelector(".hcol-l");
    if(feed&&matchColumn&&feed.parentElement===matchColumn)matchColumn.appendChild(feed);
    let nav=document.getElementById("nativeHubNav");
    if(!nav){
      nav=document.createElement("nav");nav.id="nativeHubNav";nav.className="native-hub-nav";hub.prepend(nav);
      nav.innerHTML=navMarkup();
      nav.onclick=event=>{
        const button=event.target.closest("[data-native-target]");if(!button)return;
        const route=button.dataset.nativeTarget;
        activateRoute(route);
      };
    }
    const navKey=NAV_COPY[root.LANG]?root.LANG:"en";
    const targets=[...nav.querySelectorAll("[data-native-target]")].map(button=>button.dataset.nativeTarget).join("|");
    if(nav.dataset.markupKey!==navKey||targets!=="match|market|training|sidefield|career"){
      nav.innerHTML=navMarkup();
      nav.dataset.markupKey=navKey;
    }
    activateRoute(hub.dataset.mobileRoute||activeRoute);
  }
  function refreshLanguage(){
    const landing=document.getElementById("mobileGameLanding");
    if(landing&&!landing.classList.contains("hidden"))showLanding(landing._savedRun||null);
    prepareStepper();enhanceSetupChoices();
    const nav=document.getElementById("nativeHubNav");
    if(nav)nav.remove();
    if(document.getElementById("hub")&&!document.getElementById("hub").classList.contains("hidden"))enhanceHub();
  }
  function renderTrainingRoute(){
    const hub=document.getElementById("hub");if(!hub)return;
    let route=document.getElementById("mobileTrainingRoute");
    if(!route){route=document.createElement("section");route.id="mobileTrainingRoute";route.className="mobile-training-route";hub.appendChild(route);}
    if(!(root.CopaPreparation&&typeof root.CopaPreparation.open==="function")){
      route.innerHTML=`<div class="mobile-route-empty">${tr()?"Antrenman sistemi hazırlanıyor.":"Training is loading."}</div>`;return;
    }
    const snapshot=typeof root.CopaPreparation.snapshot==="function"?root.CopaPreparation.snapshot():{};
    root.CopaPreparation.open(snapshot.round,snapshot.opponent);
    const content=document.querySelector("#modal .prep-modal");
    if(!content)return;
    route.replaceChildren(content);
    if(typeof closeModal==="function")closeModal();
    const eyebrow=content.querySelector("header>span"),title=content.querySelector("h3"),apply=content.querySelector(".bact .btn");
    if(eyebrow)eyebrow.textContent=tr()?"ANTRENMAN":"TRAINING";
    if(title)title.textContent=tr()?"Antrenman Merkezi":"Training Centre";
    const opponentName=(document.getElementById("oppNm")||{}).textContent||snapshot.opponent&&snapshot.opponent.name||"—";
    const opponentPower=(document.getElementById("oppPw")||{}).textContent||"—";
    const scoutTitle=tr()?"Rakip Analizi":"Opponent Analysis";
    const analysis=document.createElement("section");
    analysis.className="mobile-opponent-analysis";
    analysis.innerHTML=`<div class="mobile-opponent-copy"><small>${tr()?"SIRADAKİ RAKİP":"NEXT OPPONENT"}</small><b>${escapeHtml(opponentName)}</b><span>${tr()?"GÜÇ":"POWER"} ${escapeHtml(opponentPower)}</span></div><button type="button" class="mobile-training-scout" aria-label="${scoutTitle}"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10" cy="10" r="6"/><path d="m14.5 14.5 5 5"/><path class="scout-scan" d="M6.5 10h7"/></svg><span>${scoutTitle}</span><i aria-hidden="true">→</i></button>`;
    const scout=analysis.querySelector(".mobile-training-scout");
    scout.addEventListener("click",event=>{
      event.preventDefault();
      event.stopPropagation();
      if(typeof root.openScout==="function")root.openScout();
    });
    const header=content.querySelector("header");
    if(header)header.insertAdjacentElement("afterend",analysis);else content.prepend(analysis);
    content.onclick=event=>{if(event.target.closest("[data-prep-level]"))root.requestAnimationFrame(updateTrainingBadge);};
    if(apply){
      apply.textContent=tr()?"PLANI UYGULA VE DÖN":"APPLY PLAN & RETURN";
      apply.onclick=()=>{
        activateRoute("match");
        if(typeof renderHub==="function")renderHub();
        if(root.CopaMobileExperience&&typeof root.CopaMobileExperience.refresh==="function")root.CopaMobileExperience.refresh();
      };
    }
  }
  function renderCareerRoute(){
    const hub=document.getElementById("hub");if(!hub)return;
    let panel=document.getElementById("mobileCareerRoute");
    if(!panel){panel=document.createElement("section");panel.id="mobileCareerRoute";panel.className="mobile-career-route";hub.appendChild(panel);}
    if(activeCareerSection==="world"&&panel.dataset.section==="world"&&panel.querySelector("#metaWorldPanel"))return;
    const summary=root.CopaMeta&&typeof root.CopaMeta.careerSummary==="function"?root.CopaMeta.careerSummary():null;
    const labels={career:tr()?"ÖZET":"OVERVIEW",directives:tr()?"YÖNERGELER":"DIRECTIVES",management:tr()?"YÖNETİM":"MANAGEMENT",history:tr()?"GEÇMİŞ":"HISTORY",trophies:tr()?"KUPALAR":"TROPHIES",finance:tr()?"FİNANS":"FINANCE",world:tr()?"DÜNYA":"WORLD"};
    const basePanel=root.CopaMeta&&typeof root.CopaMeta.renderPanelHTML==="function"?root.CopaMeta.renderPanelHTML(activeCareerSection):`<div class="mobile-career-metrics"><article><small>${tr()?"KULÜP SEVİYESİ":"CLUB LEVEL"}</small><b>${summary&&summary.level||1}</b></article><article><small>${tr()?"İTİBAR":"REPUTATION"}</small><b>${summary&&summary.reputation||0}</b></article><article><small>${tr()?"LİSANS":"LICENCES"}</small><b>${summary&&summary.licenses||0}</b></article></div>`;
    const fullPanel=basePanel;
    panel.innerHTML=`<div class="meta-progress-modal meta-tab-${activeCareerSection} mobile-career-inline"><header class="meta-progress-head"><div><div class="kithdr">${tr()?"Kulüp Kariyeri":"Club Career"}</div><div class="kitsub">${tr()?"Kariyerinin kalıcı arşivi":"Your permanent career archive"}</div></div><div class="meta-head-actions"><button class="meta-save-menu" type="button" onclick="CopaMeta.openExport()" aria-label="${tr()?"Kayıt seçenekleri":"Save options"}"><span aria-hidden="true">⇅</span><span>${tr()?"KAYIT":"SAVE"}</span></button></div></header><nav class="meta-tabs" aria-label="${tr()?"Kariyer bölümleri":"Career sections"}">${Object.keys(labels).map(id=>`<button type="button" class="${id===activeCareerSection?"active":""}" aria-current="${id===activeCareerSection?"page":"false"}" onclick="CopaMobileShell.openCareerSection('${id}')">${labels[id]}</button>`).join("")}</nav><div class="meta-tab-panel">${fullPanel}</div></div>`;
    panel.dataset.section=activeCareerSection;
    if(activeCareerSection==="world"&&root.GhostClubs&&typeof root.GhostClubs.renderLeaderboard==="function"){
      const world=panel.querySelector("#metaWorldPanel");if(world)root.GhostClubs.renderLeaderboard(world);
    }
  }
  function openCareerSection(section){activeCareerSection=["career","directives","management","history","trophies","finance","world"].includes(section)?section:"career";renderCareerRoute();const panel=document.getElementById("mobileCareerRoute");if(panel)panel.scrollIntoView({block:"start",behavior:"smooth"});}
  function refreshCareerSection(section=activeCareerSection){activeCareerSection=["career","directives","management","history","trophies","finance","world"].includes(section)?section:activeCareerSection;const panel=document.getElementById("mobileCareerRoute");if(panel)panel.dataset.section="";renderCareerRoute();}
  function isCareerRouteActive(){const hub=document.getElementById("hub"),panel=document.getElementById("mobileCareerRoute");return !!(hub&&panel&&!hub.classList.contains("hidden")&&hub.dataset.mobileRoute==="career");}
  function enhanceHub(){
    const hub=document.getElementById("hub");
    if(!hub||hub.classList.contains("hidden"))return;
    document.body.classList.remove("mobile-game-setup-open","mobile-game-setup-final");
    const panel=document.querySelector("#hub .hub-action-panel .actionbtns,#mobileActionDock .hub-action-panel .actionbtns");if(!panel)return;
    const oldPrep=document.getElementById("prepBtn");if(oldPrep)oldPrep.remove();
    const talkButton=document.getElementById("talkBtn");
    if(talkButton&&!talkButton.dataset.mobileTalkBound){
      talkButton.dataset.mobileTalkBound="1";
      talkButton.onclick=event=>{event.preventDefault();openTeamTalk();};
    }
    normalizePlayButton();
    const modeToggle=document.getElementById("matchModeToggle");
    if(modeToggle)modeToggle.remove();
    ensureRoutes();
  }

  function cashMoney(value){
    const amount=Math.round((Number(value)||0)*2)/2,shown=Number.isInteger(amount)?Math.abs(amount):Math.abs(amount).toFixed(1);
    return `${amount<0?"−":amount>0?"+":""}€${shown}M`;
  }
  function cashTone(value){return Number(value)<0?"negative":Number(value)>0?"positive":"neutral";}
  function openCashMechanics(){
    const title=tr()?"KASA VE EKONOMİ":"CASH & ECONOMY",close=tr()?"ANLADIM":"GOT IT";
    const rules=tr()?[
      ["Bütçe","Transfer, kart, tedavi ve başkan kararları kasadan düşer. Ödüller ve bazı kartlar gelir sağlar."],
      ["Borç limiti","Kasa eksiye inebilir. Başkanın aktif borç limitinin altına düşersen görevden alınırsın."],
      ["Başkan güveni","Güven yükseldikçe borç alanı genişleyebilir. Düşük güven güvenli harcama payını daraltır."],
      ["Miras bakiye","Varsa önce miras bakiyesi harcanır. Böylece ana kasa daha uzun süre korunur."]
    ]:[
      ["Budget","Transfers, cards, treatment and board decisions cost cash. Rewards and some cards create income."],
      ["Debt limit","Cash may go negative. Falling below the chairman's active debt limit ends the run."],
      ["Chairman trust","Higher trust may widen the debt range. Low trust reduces the safe spending buffer."],
      ["Legacy balance","Legacy funds are spent first when available, protecting the main cash balance."]
    ];
    root.showModal(`<div class="cash-mechanic-sheet"><header><svg viewBox="0 0 48 48" aria-hidden="true"><path d="M7 16h31v25H7zM10 16 30 8l4 8"/><path d="M31 25h10v9H31a4.5 4.5 0 1 1 0-9Z"/><circle cx="33" cy="29.5" r="1.3"/></svg><div><span>${tr()?"OYUN REHBERİ":"GAME GUIDE"}</span><h3>${title}</h3></div></header><div class="cash-mechanic-rules">${rules.map((item,index)=>`<article><i>0${index+1}</i><div><b>${item[0]}</b><p>${item[1]}</p></div></article>`).join("")}</div><aside>${tr()?"İpucu: Bir harcamadan önce “kasa sonrası” değerini kontrol et. Sınır ile kasa arasındaki fark gerçek güvenli payındır.":"Tip: Check “cash after” before spending. The distance between cash and the limit is your real safety buffer."}</aside><button class="btn btn-primary" onclick="closeModal()">${close}</button></div>`,{dismissOnOverlay:true,label:title});
  }
  function openCashDetails(data){
    const info=data||{},stats=info.stats||{},transactions=Array.isArray(stats.transactions)?stats.transactions:[],cash=Number(info.cash)||0,limit=Number(info.limit)||-28,start=Number(info.start)||30;
    const values=[start,...transactions.map(item=>Number(item.after)||0),cash],min=Math.min(limit,...values),max=Math.max(start,...values),range=Math.max(1,max-min);
    const points=values.map((value,index)=>`${(index/Math.max(1,values.length-1)*320).toFixed(1)},${(76-(value-min)/range*64).toFixed(1)}`).join(" ");
    const zeroY=(76-(0-min)/range*64).toFixed(1),limitY=(76-(limit-min)/range*64).toFixed(1),buffer=cash-limit,gauge=Math.max(0,Math.min(100,(cash-limit)/Math.max(1,start-limit)*100));
    const earned=Number(stats.earned)||0,spent=Number(stats.spent)||0,president=Number(stats.president)||0,net=earned-spent-president,worst=Math.min(cash,Number(stats.worstDebt)||0);
    const labels=tr()?{spent:"Harcama",earned:"Gelir",matchday:"Maç günü geliri",president:"Başkan işlemi",yan_saha:"Yan Saha",yanSahaPayout:"Yan Saha dönüşü",undo:"Transfer geri alındı",expense:"Gider",income:"Gelir"}:{spent:"Expense",earned:"Income",matchday:"Matchday income",president:"Board action",yan_saha:"Side Field",yanSahaPayout:"Side Field return",undo:"Transfer undone",expense:"Expense",income:"Income"};
    let history=transactions.slice().reverse();
    if(!history.length){
      if(spent)history.push({round:info.round,kind:"expense",tag:"spent",amount:spent,after:cash});
      if(earned)history.push({round:info.round,kind:"income",tag:"earned",amount:earned,after:cash});
    }
    const rows=history.length?history.map(item=>{
      const income=item.kind==="income",label=labels[item.tag]||labels[item.kind]||(tr()?"İşlem":"Transaction");
      return `<li class="${income?"is-income":"is-expense"}"><i>${income?"↗":"↘"}</i><div><b>${label}</b><span>${tr()?"Tur":"Round"} ${Math.max(1,Number(item.round)||1)}${item.legacy?` · ${tr()?"Miras":"Legacy"} €${item.legacy}M`:""}</span></div><strong>${income?"+":"−"}€${Math.abs(Number(item.amount)||0)}M<small>${tr()?"Kasa":"Cash"} ${cashMoney(item.after)}</small></strong></li>`;
    }).join(""):`<div class="cash-history-empty">${tr()?"Henüz kaydedilmiş bir kasa işlemi yok.":"No recorded cash transactions yet."}</div>`;
    const state=cash<0?(buffer<=5?(tr()?"KRİTİK BORÇ":"CRITICAL DEBT"):(tr()?"BORÇTA":"IN DEBT")):cash>=20?(tr()?"GÜÇLÜ KASA":"STRONG CASH"):(tr()?"DENGELİ":"BALANCED");
    root.showModal(`<div class="cash-detail-sheet is-${cashTone(cash)}"><header><div><span>${tr()?"FİNANS MERKEZİ":"FINANCE CENTRE"}</span><h3>${tr()?"Kasa detayları":"Cash details"}</h3></div><em>${state}</em></header><section class="cash-detail-hero"><div><small>${tr()?"MEVCUT KASA":"CURRENT CASH"}</small><b>${cashMoney(cash)}</b><p>${tr()?"Borç limitine güvenli mesafe":"Safe distance to debt limit"} <strong>${cashMoney(buffer)}</strong></p></div><svg viewBox="0 0 320 86" role="img" aria-label="${tr()?"Kasa değişim grafiği":"Cash balance chart"}"><path class="cash-chart-grid" d="M0 ${zeroY}H320M0 ${limitY}H320"/><polyline points="${points}"/><circle cx="320" cy="${(76-(cash-min)/range*64).toFixed(1)}" r="4"/></svg><div class="cash-gauge"><i style="width:${gauge.toFixed(1)}%"></i><span>${cashMoney(limit)} ${tr()?"LİMİT":"LIMIT"}</span><span>€0</span><span>${cashMoney(start)} ${tr()?"BAŞLANGIÇ":"START"}</span></div></section><section class="cash-detail-metrics"><article><span>${tr()?"Toplam harcama":"Total spent"}</span><b class="is-negative">−€${spent}M</b></article><article><span>${tr()?"Toplam gelir":"Total income"}</span><b class="is-positive">+€${earned}M</b></article><article><span>${tr()?"Net hareket":"Net movement"}</span><b class="is-${cashTone(net)}">${cashMoney(net)}</b></article><article><span>${tr()?"En düşük kasa":"Lowest cash"}</span><b class="is-${cashTone(worst)}">${cashMoney(worst)}</b></article></section><section class="cash-history"><div class="cash-history-head"><div><span>${tr()?"KASA DEFTERİ":"CASH LEDGER"}</span><b>${tr()?"Tüm işlemler":"All transactions"}</b></div><em>${history.length}</em></div><ol>${rows}</ol></section><button class="btn btn-primary" onclick="closeModal()">${tr()?"KAPAT":"CLOSE"}</button></div>`,{dismissOnOverlay:true,label:tr()?"Kasa detayları":"Cash details"});
  }

  function openCard(key,activeCards){
    if(!mobile()){if(typeof root.toggleCardActive==="function")root.toggleCardActive(key);return;}
    const defs=root.CARDDEFS||{},copy=typeof root.L==="function"?root.L():null,card=copy&&copy.cards&&copy.cards[key];
    const synergy=root.CopaCardSynergy&&root.CopaCardSynergy.preview(Array.isArray(activeCards)?activeCards:[],key);
    const name=card&&card.n||defs[key]&&defs[key].n||key;
    const desc=card&&card.d||"";
    root.showModal(`<div class="mobile-card-sheet"><div class="mobile-sheet-grip"></div><span>${tr()?"KART DETAYI":"CARD DETAIL"}</span><h3>${escapeHtml(name)}</h3><p>${desc}</p>${synergy?`<div class="mobile-card-synergy">${tr()?synergy.tr:synergy.en}</div>`:""}<div class="bact"><button class="btn btn-primary" onclick="closeModal();toggleCardActive('${key}')">${tr()?"AKTİF DURUMU DEĞİŞTİR":"TOGGLE ACTIVE"}</button><button class="btn btn-ghost" onclick="showCardPopup('${key}')">${tr()?"TÜM DETAY":"FULL DETAIL"}</button></div></div>`,{dismissOnOverlay:true,label:name});
  }
  function openMarketCard(trigger){
    const tile=trigger&&trigger.closest(".cardtile");if(!tile)return;
    const name=tile.querySelector(".ct-name")?.textContent.trim()||"",price=tile.querySelector(".ct-price")?.textContent.trim()||"",blocked=tile.classList.contains("cant")||tile.classList.contains("trade-missing");
    const art=tile.querySelector(".ct-art")?.innerHTML||"",impact=tile.querySelector(".market-card-impact")?.outerHTML||"",desc=tile.querySelector(".ct-desc")?.innerHTML||"",contract=tile.querySelector(".ct-contract")?.innerHTML||"",extra=tile.querySelector(".ct-detail-data")?.innerHTML||"";
    root.showModal(`<div class="market-card-detail${tile.classList.contains("is-dark")?" is-dark":""}"><div class="mobile-sheet-grip"></div><header><span>${tr()?"KART DETAYI":"CARD DETAIL"}</span><b>${escapeHtml(price)}</b></header><div class="market-detail-title"><i aria-hidden="true">${art}</i><h3>${escapeHtml(name)}</h3></div>${impact}<div class="market-detail-copy">${desc}</div><div class="market-detail-contract">${contract}</div>${extra}<div class="bact"><button class="btn btn-primary market-detail-buy" ${blocked?"disabled":""}>${blocked?(tr()?"ALINAMIYOR":"UNAVAILABLE"):(tr()?"SATIN AL":"BUY")}</button><button class="btn btn-ghost" onclick="closeModal()">${tr()?"KAPAT":"CLOSE"}</button></div></div>`,{dismissOnOverlay:true,label:name});
    const buy=document.querySelector(".market-detail-buy");if(buy&&!blocked)buy.onclick=()=>{root.closeModal();setTimeout(()=>tile.click(),0);};
  }
  function openFreeAgentProfile(trigger,index){
    const item=root._freeAgents&&root._freeAgents[index];if(item&&item.p&&root.PlayerProfiles)root.PlayerProfiles.open(item.p,trigger,"api");
  }
  function openFreeAgent(trigger,index){
    const item=root._freeAgents&&root._freeAgents[index];if(!item)return;
    const p=item.p||{},card=trigger.closest(".free-agent-card"),pos=(typeof root.L==="function"&&root.L().abbr[p.pos])||p.pos||"—",power=typeof root.effOf==="function"?root.effOf(p):p.ov||0,lockReason=card.dataset.lockReason||"",blocked=!!lockReason;
    const current=typeof root._freeAgentComparisonFor==="function"?root._freeAgentComparisonFor(p):null,currentPower=current?(typeof root.effOf==="function"?root.effOf(current):current.ov||0):0,delta=power-currentPower;
    const currentPos=current&&((typeof root.L==="function"&&root.L().abbr[current.pos])||current.pos||"—");
    const currentTone=typeof root.ovTextCol==="function"?root.ovTextCol(currentPower):"var(--color-slate)",candidateTone=typeof root.ovTextCol==="function"?root.ovTextCol(power):"var(--fa-tone)";
    const comparison=current?`<div class="free-agent-versus"><article class="is-current"><small>${tr()?"MEVCUT OYUNCU":"CURRENT PLAYER"}</small><b>${escapeHtml(current.name||"")}</b><span>${escapeHtml(currentPos)} · ${tr()?"Güç":"Power"} <strong style="--power-tone:${currentTone}">${currentPower}</strong></span></article><i aria-hidden="true">→</i><article class="is-candidate"><small>${tr()?"ADAY":"CANDIDATE"}</small><b>${escapeHtml(p.name||"")}</b><span>${escapeHtml(pos)} · ${tr()?"Güç":"Power"} <strong style="--power-tone:${candidateTone}">${power}</strong></span><em class="${delta>=0?"is-positive":"is-negative"}">${delta>=0?"+":""}${delta}</em></article></div>`:`<div class="free-agent-empty-compare">${tr()?"Karşılaştırılabilir kadro oyuncusu yok.":"No comparable squad player."}</div>`;
    const locked=blocked?`<div class="free-agent-detail-lock"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="10" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg><span>${escapeHtml(lockReason)}</span></div>`:"";
    const detailTone=typeof root.ovTextCol==="function"?root.ovTextCol(power):getComputedStyle(card).getPropertyValue("--fa-tone");
    root.showModal(`<div class="free-agent-detail" style="--fa-tone:${getComputedStyle(card).getPropertyValue("--fa-tone")}"><div class="mobile-sheet-grip"></div><header><span>${tr()?"SERBEST TRANSFER":"FREE AGENT"}</span><b>${item.fee?`€${item.fee}M`:(tr()?"ÜCRETSİZ":"FREE")}</b></header><div class="free-agent-detail-id"><i>${escapeHtml(typeof root._playerMonogram==="function"?root._playerMonogram(p.name):String(p.name||"FA").slice(0,2))}</i><div><h3>${escapeHtml(p.name||"")}</h3><p>${escapeHtml(pos)} · ${tr()?"Güç":"Power"} <b class="free-agent-power-value" style="--power-tone:${detailTone}">${power}</b></p></div></div><div class="free-agent-compare-title">${tr()?"KADRO KARŞILAŞTIRMASI":"SQUAD COMPARISON"}</div>${comparison}${locked}<div class="bact"><button class="btn btn-primary free-agent-transfer-next" ${blocked?"disabled":""}>${blocked?(tr()?"TRANSFER KİLİTLİ":"TRANSFER LOCKED"):(tr()?"SATIN AL":"BUY")}</button><button class="btn btn-ghost" onclick="closeModal()">${tr()?"KAPAT":"CLOSE"}</button></div></div>`,{dismissOnOverlay:true,label:p.name||""});
    const next=document.querySelector(".free-agent-transfer-next");if(next&&!blocked)next.onclick=()=>{root.closeModal();root._signFreeAgent(index);};
  }
  function bindCardUX(){
    document.addEventListener("pointerdown",event=>{
      if(event.target.closest(".ct-detail"))return;
      const card=event.target.closest(".collcard[data-card-key],.cardtile[data-card-key]");if(!card)return;
      pressedCard=card;clearTimeout(pressTimer);pressTimer=setTimeout(()=>{if(pressedCard&&pressedCard.dataset.cardKey&&typeof root.showCardPopup==="function"){root.showCardPopup(pressedCard.dataset.cardKey);pressedCard=null;}},520);
    },{passive:true});
    ["pointerup","pointercancel","pointermove"].forEach(type=>document.addEventListener(type,()=>{clearTimeout(pressTimer);pressedCard=null;},{passive:true}));
    document.addEventListener("dragstart",event=>{const card=event.target.closest(".collcard[data-card-key]");if(card&&event.dataTransfer){event.dataTransfer.setData("text/copa-card",card.dataset.cardKey);event.dataTransfer.effectAllowed="copy";}});
    document.addEventListener("dragover",event=>{if(event.target.closest("#cardrow"))event.preventDefault();});
    document.addEventListener("drop",event=>{if(!event.target.closest("#cardrow"))return;event.preventDefault();const key=event.dataTransfer&&event.dataTransfer.getData("text/copa-card");if(key&&typeof root.toggleCardActive==="function")root.toggleCardActive(key);});
  }

  const TONES={
    calm:{tr:"Sakinleştir",en:"Calm",safe:true,focus:1,pressure:-1,tempo:-1},
    believe:{tr:"İnandır",en:"Believe",focus:2,pressure:0,tempo:1},
    challenge:{tr:"Meydan oku",en:"Challenge",focus:2,pressure:1,tempo:2,risky:true},
    discipline:{tr:"Disiplin iste",en:"Demand discipline",focus:1,pressure:1,tempo:0,risky:true},
    tactical:{tr:"Taktiği hatırlat",en:"Tactical reminder",safe:true,focus:1,pressure:0,tempo:0}
  };
  const TARGETS={all:["Tüm takım","Whole team"],defence:["Savunma","Defence"],attack:["Hücum","Attack"],youth:["Gençler","Youth"],star:["Yıldız","Star"]};
  const TALK_QUOTES={
    all:{calm:"Beyler, sakin kalırsak maç bizde.",believe:"İnanmayan sahaya çıkmasın.",challenge:"Yüreğinizi koyun ortaya!",discipline:"Şımarmak yok.",tactical:"Plandan sapmıyoruz, gerisi gelir."},
    defence:{calm:"İlk müdahalede acele etmeyin.",believe:"Bu duvarı kimse aşamaz.",challenge:"Bir adım geri atan olmasın!",discipline:"Çizgiyi birlikte tutun.",tactical:"Arayı kapatın, merkezi bırakmayın."},
    attack:{calm:"Doğru anı bekleyin.",believe:"Bir gol, bütün maçı değiştirir.",challenge:"Kaleye her fırsatta gidin!",discipline:"Son pası savurmayın.",tactical:"Koşuyu görün, boşluğu kullanın."},
    youth:{calm:"Basit oynayın, keyfini çıkarın.",believe:"Bugün sizin sahneniz.",challenge:"Korkmadan sorumluluk alın!",discipline:"Heyecana kapılmayın.",tactical:"Önce yerinizi koruyun."},
    star:{calm:"Takımı oyunda tut, anın gelecek.",believe:"Bu maç senin maçın.",challenge:"Liderliğini şimdi göster!",discipline:"Herkes kadar koşacaksın.",tactical:"Seni boşlukta bulacağız."}
  };
  function talkIcon(key){
    const paths={calm:"M4 12h16M7 8h10M9 16h6",believe:"M12 3l2.2 4.5 5 .7-3.6 3.5.9 5-4.5-2.4-4.5 2.4.9-5L4.8 8.2l5-.7Z",challenge:"M5 19 9 5l3 7 3-7 4 14M7 15h10",discipline:"M6 4h12v16H6zM9 9h6m-6 4h6",tactical:"M4 18c4-8 8-8 16-12M15 5h5v5"};return`<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="${paths[key]}" fill="none" vector-effect="non-scaling-stroke"/></svg>`;
  }
  function openTeamTalk(){
    const toneCards=Object.keys(TONES).map(key=>`<button type="button" class="locker-tone tone-${key}" data-tone="${key}" onclick="CopaMobileShell.chooseTalkTone('${key}')">${talkIcon(key)}<span>${TONES[key][tr()?"tr":"en"]}</span><small data-talk-quote="${key}">${tr()?TALK_QUOTES.all[key]:"Choose the words this group needs."}</small></button>`).join("");
    const targets=Object.keys(TARGETS).map(key=>`<button type="button" class="locker-target${key==="all"?" active":""}" data-talk-target="${key}" onclick="CopaMobileShell.chooseTalkTarget('${key}')">${TARGETS[key][tr()?0:1]}</button>`).join("");
    root.showModal(`<div class="locker-room-modal"><div class="locker-scene" aria-hidden="true"><i></i><i></i><i class="captain"></i><i></i><i></i></div><header><span>${tr()?"SOYUNMA ODASI":"LOCKER ROOM"}</span><h3>${tr()?"Takımın tonunu belirle":"Set the team's tone"}</h3></header><div class="locker-targets">${targets}</div><div class="locker-tones">${toneCards}</div><p>${tr()?"Etki yalnız bu maç sürer.":"The effect lasts for this match only."}</p></div>`,{dismissOnOverlay:true,label:tr()?"Takım konuşması":"Team talk"});
    const modal=document.querySelector(".locker-room-modal");if(modal){modal.dataset.target="all";modal.dataset.tone="";}
  }
  function chooseTalkTarget(key){const modal=document.querySelector(".locker-room-modal");if(!modal)return;modal.dataset.target=key;modal.querySelectorAll("[data-talk-target]").forEach(button=>button.classList.toggle("active",button.dataset.talkTarget===key));modal.querySelectorAll("[data-talk-quote]").forEach(label=>{if(tr())label.textContent=TALK_QUOTES[key]&&TALK_QUOTES[key][label.dataset.talkQuote]||"";});const scene=modal.querySelector(".locker-scene");if(scene)scene.dataset.target=key;}
  function chooseTalkTone(key){const modal=document.querySelector(".locker-room-modal");if(!modal||!TONES[key])return;modal.dataset.tone=key;if(typeof root.applyModernTeamTalk==="function")root.applyModernTeamTalk(key,modal.dataset.target||"all");}
  function resolveTalk(tone,target,context,random){
    const def=TONES[tone]||TONES.calm,ctx=context||{},rng=typeof random==="function"?random:Math.random;
    let fit=0;
    if(tone==="calm"&&ctx.pressure)fit+=2;
    if(tone==="believe"&&ctx.under)fit+=2;
    if(tone==="challenge"&&!ctx.under)fit+=1;
    if(tone==="discipline"&&ctx.troubled)fit+=2;
    if(tone==="tactical")fit+=1;
    if(target==="youth"&&ctx.young)fit++;if(target==="star"&&ctx.star)fit++;if(target==="defence"&&ctx.defenceNeed)fit++;if(target==="attack"&&ctx.under)fit++;
    const recent=Array.isArray(ctx.history)?ctx.history.slice(-3):[],repeatCount=recent.filter(item=>item===tone).length;
    fit-=repeatCount;
    let delta=0;const roll=rng();
    if(def.safe)delta=roll<.85?1:0;
    else if(fit>=2)delta=roll<.45?2:roll<.85?1:roll<.95?0:-1;
    else delta=roll<.20?1:roll<.55?0:roll<.85?-1:-2;
    delta=Math.max(-2,Math.min(3,delta));
    return{tone,target,delta,fit,repeatCount,focus:def.focus+(delta>0?1:delta),pressure:def.pressure+(delta<0?1:0),tempo:def.tempo,injuryRisk:tone==="challenge"?.04:tone==="discipline"?.02:0,first20:Math.max(-2,Math.min(3,delta+(tone==="tactical"?1:0))),name:def[tr()?"tr":"en"],targetName:TARGETS[target]&&TARGETS[target][tr()?0:1]||TARGETS.all[tr()?0:1]};
  }
  function showTalkResult(result){
    const good=result.delta>=0;
    const captainAction=!good&&typeof root.canUseCaptainDecision==="function"&&root.canUseCaptainDecision()?`<button class="btn btn-primary" onclick="useCaptainDecision()">${tr()?"KAPTAN ARAYA GİRSİN":"LET THE CAPTAIN STEP IN"}</button>`:"";
    root.showModal(`<div class="locker-result ${good?"is-good":"is-bad"}"><div class="locker-reaction" aria-hidden="true">${good?"↑":"↓"}</div><span>${tr()?"SOYUNMA ODASI":"LOCKER ROOM"}</span><h3>${result.name} · ${result.targetName}</h3><div class="locker-result-chips"><b>${tr()?"Odak":"Focus"} ${result.focus>=0?"+":""}${result.focus}</b><b>${tr()?"İlk 20 dk":"First 20"} ${result.first20>=0?"+":""}${result.first20}</b>${result.injuryRisk?`<b>${tr()?"Sakatlık riski":"Injury risk"} +${Math.round(result.injuryRisk*100)}%</b>`:""}</div>${captainAction}<button class="btn ${captainAction?"btn-ghost":"btn-primary"}" onclick="closeModal();renderHub()">${tr()?"MAÇA HAZIR":"READY"}</button></div>`,{label:tr()?"Konuşma sonucu":"Talk result"});
  }
  function enhanceDraftControls(){
    const dock=document.getElementById("draftThumbDock"),rollButtons=document.getElementById("rollbtns");
    if(!dock||!rollButtons)return;
    if(!dock.dataset.ready){
      dock.dataset.ready="1";
      dock.innerHTML='<div class="draft-quick-actions"></div>';
    }
    const actions=dock.querySelector(".draft-quick-actions");
    ["allBtn","undoBtn"].forEach(id=>{const element=document.getElementById(id);if(element&&element.parentElement!==actions)actions.appendChild(element);});
    const optionStage=document.getElementById("optstage"),reroll=document.getElementById("rerollBtn");
    if(optionStage&&reroll&&dock.nextElementSibling!==reroll)optionStage.insertBefore(dock,reroll);
    const undo=document.getElementById("undoBtn"),auto=document.getElementById("allBtn");
    if(undo)undo.style.cssText="";if(auto)auto.style.cssText="";
    root._draftPositionFilter="ALL";
  }
  function init(){
    if(gameMode())document.documentElement.classList.add("copa-mobile-game");
    prepareStepper();bindCardUX();enhanceDraftControls();
    const settings=document.getElementById("settingsDrop");
    if(settings&&!settings.querySelector(".mobile-legal-links")){
      const advanced=document.createElement("div");advanced.className="sd-group settings-advanced-entry";
      advanced.innerHTML=`<div class="sd-hdr" id="settingsAdvancedHdr">${tr()?"OYUN AYARLARI":"GAME SETTINGS"}</div><button class="sdbtn sd-full settings-advanced-btn" type="button" onclick="CopaLazy.openAdvancedSettings()"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/></svg><span id="settingsAdvancedBtnLbl">${tr()?"GELİŞMİŞ AYARLAR":"ADVANCED SETTINGS"}</span><span aria-hidden="true">→</span></button>`;
      settings.appendChild(advanced);
      const group=document.createElement("div");group.className="sd-group mobile-legal-links";
      group.innerHTML=`<div class="sd-hdr">${tr()?"YASAL":"LEGAL"}</div><div class="sdgrid"><a class="sdbtn" href="privacy.html">${tr()?"Gizlilik":"Privacy"}</a><a class="sdbtn" href="terms.html">${tr()?"Koşullar":"Terms"}</a><a class="sdbtn" href="support.html">${tr()?"Destek":"Support"}</a></div>`;
      settings.appendChild(group);
    }
    const hub=document.getElementById("hub");
    if(hub){
      const observer=new MutationObserver(()=>{if(!hub.classList.contains("hidden"))enhanceHub();});
      observer.observe(hub,{attributes:true,attributeFilter:["class"]});
    }
    const setup=document.getElementById("introSetup");if(setup)new MutationObserver(()=>enhanceSetupChoices()).observe(setup,{childList:true,subtree:true});
    const draft=document.getElementById("draft");if(draft)new MutationObserver(()=>enhanceDraftControls()).observe(draft,{attributes:true,attributeFilter:["class"]});
  }
  root.CopaMobileShell={mobile,native,gameMode,shouldGateResume,showLanding,continueRun,newRun,prepareStepper,setSetupStep,step,handleBack,activateRoute,openCareerSection,refreshCareerSection,isCareerRouteActive,enhanceHub,enhanceDraftControls,openCashMechanics,openCashDetails,openCard,openMarketCard,openFreeAgent,openFreeAgentProfile,openTeamTalk,chooseTalkTarget,chooseTalkTone,resolveTalk,showTalkResult,updateMarketBadge,refreshLanguage,init};
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})(window);
