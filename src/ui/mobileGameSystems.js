/* Mobile-native navigation, start flow, card sheets and locker-room presentation. */
(function(root){
  "use strict";
  const phone=()=>!!(root.matchMedia&&root.matchMedia("(max-width: 760px)").matches);
  const native=()=>!!(root.COPA_IS_NATIVE||root.Capacitor&&root.Capacitor.isNativePlatform&&root.Capacitor.isNativePlatform());
  const mobile=()=>phone()||native();
  const gameMode=()=>native()||new URLSearchParams(root.location.search).has("native-game");
  const tr=()=>root.LANG==="tr";
  let setupStep=1,activeRoute="match",pressTimer=0,pressedCard=null;

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
    document.body.classList.add("mobile-game-landing-open");
    setup.classList.add("hidden");
    let view=document.getElementById("mobileGameLanding");
    if(!view){view=document.createElement("div");view.id="mobileGameLanding";view.className="mobile-game-landing";land.prepend(view);}
    const data=saved?savedSummary(saved):null;
    view.innerHTML=`<div class="mgl-atmosphere" aria-hidden="true"><i></i><i></i><i></i><span></span></div><div class="mgl-content"><div class="mgl-brand"><small>${tr()?"KADERİNİ KUR":"BUILD YOUR FATE"}</small><h1>Copa <em>Life</em></h1></div>${data?`<article class="mgl-save"><span>${tr()?"SON KOŞU":"LAST RUN"}</span><h2>${escapeHtml(data.club)}</h2><div><b>${tr()?"MAÇ":"MATCH"} ${data.round}/6</b><b>${tr()?"GÜÇ":"POWER"} ${data.power}</b></div><p>${tr()?"Sıradaki":"Next"} · ${escapeHtml(data.opponent)}</p></article>`:""}<div class="mgl-actions">${data?`<button class="btn btn-go" onclick="CopaMobileShell.continueRun()">${tr()?"DEVAM ET":"CONTINUE"}</button>`:""}<button class="btn btn-ghost" onclick="CopaMobileShell.newRun()">${tr()?"YENİ KOŞU":"NEW RUN"}</button></div></div>`;
    land.classList.remove("hidden");intro.classList.remove("hidden");
    return true;
  }
  function escapeHtml(value){const div=document.createElement("div");div.textContent=String(value||"");return div.innerHTML;}
  function continueRun(){
    document.body.classList.remove("mobile-game-landing-open");
    const view=document.getElementById("mobileGameLanding");if(view)view.remove();
    if(typeof root._tryRestoreState==="function")root._tryRestoreState();
  }
  function newRun(){
    document.body.classList.remove("mobile-game-landing-open");
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
  }
  function setSetupStep(value){
    setupStep=Math.max(1,Math.min(3,Number(value)||1));prepareStepper();
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
    activeRoute=["squad","match","market"].includes(route)?route:"match";
    hub.dataset.mobileRoute=activeRoute;
    const nav=document.getElementById("nativeHubNav");
    if(nav)nav.querySelectorAll("[data-native-target]").forEach(button=>button.classList.toggle("active",button.dataset.nativeTarget===activeRoute));
    const target=activeRoute==="squad"?hub.querySelector(".pitch-area"):activeRoute==="market"?document.getElementById("shopcards"):hub.querySelector(".vsbar");
    if(target)target.scrollIntoView({block:"start",behavior:document.body.classList.contains("reduced-motion")?"auto":"smooth"});
  }
  function ensureRoutes(){
    if(!gameMode())return;
    const hub=document.getElementById("hub");if(!hub)return;
    let nav=document.getElementById("nativeHubNav");
    if(!nav){
      nav=document.createElement("nav");nav.id="nativeHubNav";nav.className="native-hub-nav";hub.prepend(nav);
      nav.innerHTML=`<button type="button" data-native-target="squad">${tr()?"KADRO":"SQUAD"}</button><button type="button" data-native-target="match">${tr()?"MAÇ":"MATCH"}</button><button type="button" data-native-target="market">${tr()?"PAZAR":"MARKET"}</button><button type="button" data-native-target="career">${tr()?"KARİYER":"CAREER"}</button>`;
      nav.onclick=event=>{
        const button=event.target.closest("[data-native-target]");if(!button)return;
        const route=button.dataset.nativeTarget;
        if(route==="career"){if(root.CopaLazy)root.CopaLazy.openMetaProgression();return;}
        activateRoute(route);
      };
    }
    activateRoute(hub.dataset.mobileRoute||activeRoute);
  }
  function enhanceHub(){
    const panel=document.querySelector("#hub .hub-action-panel .actionbtns");if(!panel)return;
    if(!document.getElementById("prepBtn")){
      const button=document.createElement("button");button.type="button";button.id="prepBtn";button.className="btn btn-prep";
      button.onclick=()=>typeof root.openPreparation==="function"&&root.openPreparation();
      panel.insertBefore(button,document.getElementById("talkBtn"));
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
  function openTeamTalk(){
    const toneCards=Object.keys(TONES).map(key=>`<button type="button" class="locker-tone" data-tone="${key}" onclick="CopaMobileShell.chooseTalkTone('${key}')"><span>${TONES[key][tr()?"tr":"en"]}</span><small>${TONES[key].safe?(tr()?"Güvenli":"Safe"):(tr()?"Bağlama duyarlı":"Contextual")}</small></button>`).join("");
    const targets=Object.keys(TARGETS).map(key=>`<button type="button" class="locker-target${key==="all"?" active":""}" data-talk-target="${key}" onclick="CopaMobileShell.chooseTalkTarget('${key}')">${TARGETS[key][tr()?0:1]}</button>`).join("");
    root.showModal(`<div class="locker-room-modal"><div class="locker-scene" aria-hidden="true"><i></i><i></i><i class="captain"></i><i></i><i></i></div><header><span>${tr()?"SOYUNMA ODASI":"LOCKER ROOM"}</span><h3>${tr()?"Takımın tonunu belirle":"Set the team's tone"}</h3></header><div class="locker-targets">${targets}</div><div class="locker-tones">${toneCards}</div><p>${tr()?"Etki yalnız bu maç sürer.":"The effect lasts for this match only."}</p></div>`,{dismissOnOverlay:true,label:tr()?"Takım konuşması":"Team talk"});
    const modal=document.querySelector(".locker-room-modal");if(modal){modal.dataset.target="all";modal.dataset.tone="";}
  }
  function chooseTalkTarget(key){const modal=document.querySelector(".locker-room-modal");if(!modal)return;modal.dataset.target=key;modal.querySelectorAll("[data-talk-target]").forEach(button=>button.classList.toggle("active",button.dataset.talkTarget===key));}
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
  function init(){
    if(gameMode())document.documentElement.classList.add("copa-mobile-game");
    prepareStepper();bindCardUX();
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
  }
  root.CopaMobileShell={mobile,native,gameMode,shouldGateResume,showLanding,continueRun,newRun,prepareStepper,setSetupStep,step,handleBack,activateRoute,enhanceHub,openCard,openTeamTalk,chooseTalkTarget,chooseTalkTone,resolveTalk,showTalkResult,init};
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})(window);
