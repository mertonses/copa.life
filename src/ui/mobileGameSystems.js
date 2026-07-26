/* Mobile-native navigation, start flow, card sheets and locker-room presentation. */
(function(root){
  "use strict";
  const phone=()=>!!(root.matchMedia&&root.matchMedia("(max-width: 760px)").matches);
  const native=()=>!!(root.COPA_IS_NATIVE||root.Capacitor&&root.Capacitor.isNativePlatform&&root.Capacitor.isNativePlatform());
  const mobile=()=>phone()||native();
  const gameMode=()=>native()||new URLSearchParams(root.location.search).has("native-game");
  const tr=()=>root.LANG==="tr";
  let setupStep=1,activeRoute="match",activeCareerSection="career",pressTimer=0,pressedCard=null;
  const NAV_ICONS={
    match:'<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M5 7h22v18H5zM16 7v18M5 16h22"/><circle cx="16" cy="16" r="4"/></svg>',
    market:'<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M5 11h22v16H5zM10 11V8h12v3"/><path d="M9 17h5v6H9m9-6h5m-5 4h5"/></svg>',
    career:'<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M8 5h16v22H8zM12 10h8m-8 5h8m-8 5h5"/><path d="M6 9H4v14h2"/></svg>'
  };
  function landingPitch(){
    const players=[[50,88],[24,72],[76,72],[37,55],[63,55],[20,36],[50,37],[80,36],[35,19],[65,19],[50,8]];
    return `<svg class="mgl-tactical-board" viewBox="0 0 240 150" aria-hidden="true">
      <defs><marker id="mglArrow" viewBox="0 0 8 8" refX="6" refY="4" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0 8 4 0 8Z"/></marker></defs>
      <rect x="5" y="5" width="230" height="140" rx="10"/><path d="M5 75h230M120 5v140"/><circle cx="120" cy="75" r="18"/><path d="M75 5v22h90V5M75 145v-22h90v22"/>
      <g class="mgl-routes"><path d="M50 121Q81 101 99 83T142 55" marker-end="url(#mglArrow)"/><path d="M62 94Q116 80 185 55" marker-end="url(#mglArrow)"/><path d="M120 65Q145 38 157 25" marker-end="url(#mglArrow)"/></g>
      <g class="mgl-players">${players.map(([x,y],index)=>`<g style="--i:${index}"><circle cx="${x/100*230+5}" cy="${y/100*140+5}" r="${index===6?5:4}"/><text x="${x/100*230+5}" y="${y/100*140+7}">${index+1}</text></g>`).join("")}</g>
    </svg>`;
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
    const data=saved?savedSummary(saved):null;
    view.innerHTML=`<div class="mgl-atmosphere" aria-hidden="true"><span class="mgl-light mgl-light-l"></span><span class="mgl-light mgl-light-r"></span><span class="mgl-tunnel"></span></div><div class="mgl-content"><div class="mgl-brand"><small>${tr()?"KADERİNİ KUR":"BUILD YOUR FATE"}</small><h1>${tr()?"COPA LİFE":"COPA LIFE"}</h1><p>${tr()?"Yedi maç. Tek kupa. Her seçim kulübünün hikâyesini değiştirir.":"Seven matches. One cup. Every choice changes your club's story."}</p></div><ol class="mgl-road" aria-label="${tr()?"Kupa yolu":"Cup journey"}"><li>${tr()?"KADRO":"SQUAD"}</li><li>${tr()?"GRUPLAR":"GROUPS"}</li><li>${tr()?"ELEMELER":"KNOCKOUT"}</li><li>${tr()?"KUPA":"CUP"}</li></ol><div class="mgl-board-wrap"><span>4–3–3 · ${tr()?"HÜCUM PLANI":"ATTACK PLAN"}</span>${landingPitch()}</div><div class="mgl-bottom">${data?`<article class="mgl-save"><span>${tr()?"DEVAM EDEN KARİYER":"ACTIVE CAREER"}</span><h2>${escapeHtml(data.club)}</h2><div><b>${tr()?"MAÇ":"MATCH"} ${data.round}/7</b><b>${tr()?"GÜÇ":"POWER"} ${data.power}</b></div><p>${tr()?"Sıradaki rakip":"Next opponent"} · ${escapeHtml(data.opponent)}</p></article>`:""}<div class="mgl-actions">${data?`<button class="btn btn-go" onclick="CopaMobileShell.continueRun()">${tr()?"KARİYERE DEVAM ET":"CONTINUE CAREER"}</button>`:""}<button class="btn ${data?"btn-ghost":"btn-go"}" onclick="CopaMobileShell.newRun()">${tr()?"BAŞLA":"START"}</button></div></div></div>`;
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
      if(button.querySelector(".chair-mobile-meta"))return;
      const id=button.dataset.chairId||"";
      const fx=root.COPA_CHAIR_FX&&root.COPA_CHAIR_FX[id];
      const lines=fx&&fx.pros&&fx.cons?[...(fx.pros[tr()?"tr":"en"]||[]),...(fx.cons[tr()?"tr":"en"]||[])]:[];
      const limit=(lines.join(" ").match(/€\d+M/)||[])[0]||"";
      const effect=lines[0]|| (tr()?"Karar ve bütçe profilini incele":"Review decisions and budget");
      button.insertAdjacentHTML("beforeend",`<span class="chair-mobile-meta"><b>${limit||(tr()?"ÖZEL PROFİL":"SPECIAL PROFILE")}</b><em>${escapeHtml(effect)}</em></span><span class="chair-detail-link">${tr()?"DETAY →":"DETAIL →"}</span>`);
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

  function activateRoute(route){
    const hub=document.getElementById("hub");if(!hub)return;
    activeRoute=["match","market","career"].includes(route)?route:"match";
    hub.dataset.mobileRoute=activeRoute;
    const actionDock=document.getElementById("mobileActionDock");
    if(actionDock)actionDock.classList.toggle("mobile-route-suppressed",activeRoute!=="match");
    const nav=document.getElementById("nativeHubNav");
    if(nav)nav.querySelectorAll("[data-native-target]").forEach(button=>button.classList.toggle("active",button.dataset.nativeTarget===activeRoute));
    if(activeRoute==="career")renderCareerRoute();
    const target=activeRoute==="market"?document.getElementById("shopcards"):activeRoute==="career"?document.getElementById("mobileCareerRoute"):hub.querySelector(".vsbar");
    if(target)target.scrollIntoView({block:"start",behavior:document.body.classList.contains("reduced-motion")?"auto":"smooth"});
  }
  function ensureRoutes(){
    if(!gameMode())return;
    const hub=document.getElementById("hub");if(!hub)return;
    let nav=document.getElementById("nativeHubNav");
    if(!nav){
      nav=document.createElement("nav");nav.id="nativeHubNav";nav.className="native-hub-nav";hub.prepend(nav);
      nav.innerHTML=`<button type="button" data-native-target="match">${NAV_ICONS.match}<span>${tr()?"MAÇ":"MATCH"}</span></button><button type="button" data-native-target="market">${NAV_ICONS.market}<span>${tr()?"PAZAR":"MARKET"}</span></button><button type="button" data-native-target="career">${NAV_ICONS.career}<span>${tr()?"KARİYER":"CAREER"}</span></button>`;
      nav.onclick=event=>{
        const button=event.target.closest("[data-native-target]");if(!button)return;
        const route=button.dataset.nativeTarget;
        activateRoute(route);
      };
    }
    activateRoute(hub.dataset.mobileRoute||activeRoute);
  }
  function renderCareerRoute(){
    const hub=document.getElementById("hub");if(!hub)return;
    let panel=document.getElementById("mobileCareerRoute");
    if(!panel){panel=document.createElement("section");panel.id="mobileCareerRoute";panel.className="mobile-career-route";hub.appendChild(panel);}
    const summary=root.CopaMeta&&typeof root.CopaMeta.careerSummary==="function"?root.CopaMeta.careerSummary():null;
    const labels={career:tr()?"KARİYER":"CAREER",mastery:tr()?"USTALIK":"MASTERY",museum:tr()?"MÜZE":"MUSEUM",world:tr()?"DÜNYA":"WORLD"};
    const fullPanel=root.CopaMeta&&typeof root.CopaMeta.renderPanelHTML==="function"?root.CopaMeta.renderPanelHTML(activeCareerSection):`<div class="mobile-career-metrics"><article><small>${tr()?"KULÜP SEVİYESİ":"CLUB LEVEL"}</small><b>${summary&&summary.level||1}</b></article><article><small>${tr()?"İTİBAR":"REPUTATION"}</small><b>${summary&&summary.reputation||0}</b></article><article><small>${tr()?"LİSANS":"LICENCES"}</small><b>${summary&&summary.licenses||0}</b></article></div>`;
    panel.innerHTML=`<header><span>${tr()?"KULÜP KARİYERİ":"CLUB CAREER"}</span><h2>${tr()?"Mirasın, tek ekranda.":"Your legacy, in one place."}</h2></header><nav class="mobile-career-tabs" aria-label="${tr()?"Kariyer bölümleri":"Career sections"}">${Object.keys(labels).map(id=>`<button type="button" class="${id===activeCareerSection?"active":""}" onclick="CopaMobileShell.openCareerSection('${id}')">${labels[id]}</button>`).join("")}</nav><div class="mobile-career-panel">${fullPanel}</div>`;
    if(activeCareerSection==="world"&&root.GhostClubs&&typeof root.GhostClubs.renderLeaderboard==="function"){
      const world=panel.querySelector("#metaWorldPanel");if(world)root.GhostClubs.renderLeaderboard(world);
    }
  }
  function openCareerSection(section){activeCareerSection=["career","mastery","museum","world"].includes(section)?section:"career";renderCareerRoute();const panel=document.getElementById("mobileCareerRoute");if(panel)panel.scrollIntoView({block:"start",behavior:"smooth"});}
  function enhanceHub(){
    document.body.classList.remove("mobile-game-setup-open","mobile-game-setup-final");
    const panel=document.querySelector("#hub .hub-action-panel .actionbtns");if(!panel)return;
    if(!document.getElementById("prepBtn")){
      const button=document.createElement("button");button.type="button";button.id="prepBtn";button.className="btn btn-prep";
      button.onclick=()=>typeof root.openPreparation==="function"&&root.openPreparation();
      panel.insertBefore(button,document.getElementById("talkBtn"));
    }
    const talkButton=document.getElementById("talkBtn");
    if(talkButton&&!talkButton.dataset.mobileTalkBound){
      talkButton.dataset.mobileTalkBound="1";
      talkButton.onclick=event=>{event.preventDefault();openTeamTalk();};
    }
    const prep=document.getElementById("prepBtn"),points=root.CopaPreparation?2-root.CopaPreparation.spent():2;
    if(prep){
      const markup=`<span aria-hidden="true">⌁</span><b>${tr()?"HAZIRLIK":"PREP"}</b><em>${points}/2</em>`;
      if(prep.innerHTML!==markup)prep.innerHTML=markup;
    }
    ensureRoutes();
  }

  function openCard(key,activeCards){
    if(!mobile()){if(typeof root.toggleCardActive==="function")root.toggleCardActive(key);return;}
    const defs=root.CARDDEFS||{},copy=typeof root.L==="function"?root.L():null,card=copy&&copy.cards&&copy.cards[key];
    const synergy=root.CopaCardSynergy&&root.CopaCardSynergy.preview(Array.isArray(activeCards)?activeCards:[],key);
    const name=card&&card.n||defs[key]&&defs[key].n||key;
    const desc=card&&card.d||"";
    root.showModal(`<div class="mobile-card-sheet"><div class="mobile-sheet-grip"></div><span>${tr()?"KART DETAYI":"CARD DETAIL"}</span><h3>${escapeHtml(name)}</h3><p>${desc}</p>${synergy?`<div class="mobile-card-synergy">${tr()?synergy.tr:synergy.en}</div>`:""}<div class="bact"><button class="btn btn-primary" onclick="closeModal();toggleCardActive('${key}')">${tr()?"AKTİF DURUMU DEĞİŞTİR":"TOGGLE ACTIVE"}</button><button class="btn btn-ghost" onclick="showCardPopup('${key}')">${tr()?"TÜM DETAY":"FULL DETAIL"}</button></div></div>`,{dismissOnOverlay:true,label:name});
  }
  function bindCardUX(){
    document.addEventListener("pointerdown",event=>{
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
    const paths={calm:"M4 12h16M7 8h10M9 16h6",believe:"M12 3l2.2 4.5 5 .7-3.6 3.5.9 5-4.5-2.4-4.5 2.4.9-5L4.8 8.2l5-.7Z",challenge:"M5 19 9 5l3 7 3-7 4 14M7 15h10",discipline:"M6 4h12v16H6zM9 9h6m-6 4h6",tactical:"M4 18c4-8 8-8 16-12M15 5h5v5"};return`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${paths[key]}"/></svg>`;
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
    let delta=0;const roll=rng();
    if(def.safe)delta=roll<.8?1:0;
    else if(fit>=2)delta=roll<.55?2:roll<.85?1:-1;
    else delta=roll<.25?1:roll<.7?0:(roll<.9?-1:-2);
    delta=Math.max(-2,Math.min(3,delta));
    return{tone,target,delta,fit,focus:def.focus+(delta>0?1:delta),pressure:def.pressure+(delta<0?1:0),tempo:def.tempo,injuryRisk:tone==="challenge"?.04:tone==="discipline"?.02:0,first20:Math.max(-2,Math.min(3,delta+(tone==="tactical"?1:0))),name:def[tr()?"tr":"en"],targetName:TARGETS[target]&&TARGETS[target][tr()?0:1]||TARGETS.all[tr()?0:1]};
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
    const undo=document.getElementById("undoBtn"),auto=document.getElementById("allBtn");
    if(undo)undo.style.cssText="";if(auto)auto.style.cssText="";
    root._draftPositionFilter="ALL";
  }
  function init(){
    if(gameMode())document.documentElement.classList.add("copa-mobile-game");
    prepareStepper();bindCardUX();enhanceDraftControls();
    const settings=document.getElementById("settingsDrop");
    if(settings&&!settings.querySelector(".mobile-legal-links")){
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
  root.CopaMobileShell={mobile,native,gameMode,shouldGateResume,showLanding,continueRun,newRun,prepareStepper,setSetupStep,step,handleBack,activateRoute,openCareerSection,enhanceHub,enhanceDraftControls,openCard,openTeamTalk,chooseTalkTarget,chooseTalkTone,resolveTalk,showTalkResult,init};
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})(window);
