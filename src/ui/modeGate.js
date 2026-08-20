(function(root){
  "use strict";
  const gate=()=>document.getElementById("modeGate");
  const lifeBack=()=>document.getElementById("lifeModeBack");
  const COPY={
    tr:{slogan:"HİKÂYENİ SEÇ · SAHAYA ÇIK",kicker:"OYUN MODU",title:"Nasıl oynamak istersin?",intro:"Kendi hikâyeni kur veya canlı rekabete katıl.",solo:"TEK OYUNCULU YOLCULUK",lifeDesc:"Kadronu kur, kararlarını ver ve yedi maçlık kendi futbol hikâyeni yaz.",lifeMeta:"KARİYER ODAKLI",lifeCta:"COPA LIFE'A BAŞLA",multiplayer:"CANLI REKABET",arenaDesc:"Canlı maçlara gir, sıralamada yüksel ve doğru anda rövanşı al.",arenaMeta:"DERECELİ · CANLI",arenaCta:"ARENA'YA GİR",note:"Aynı kadro kurma temeli, iki farklı mücadele: kariyer veya canlı rekabet."},
    en:{slogan:"CHOOSE YOUR STORY · TAKE THE FIELD",kicker:"GAME MODE",title:"How do you want to play?",intro:"Build your own story or step into live competition.",solo:"SINGLE-PLAYER JOURNEY",lifeDesc:"Build your squad, make the calls and write a seven-match football story.",lifeMeta:"CAREER-FOCUSED",lifeCta:"START COPA LIFE",multiplayer:"LIVE COMPETITION",arenaDesc:"Enter live matches, climb the table and take your rematch when it matters.",arenaMeta:"RANKED · LIVE",arenaCta:"ENTER ARENA",note:"One squad-building foundation, two ways to compete: career or live play."},
    es:{slogan:"ELIGE TU HISTORIA · SALTA AL CAMPO",kicker:"MODO DE JUEGO",title:"¿Cómo quieres jugar?",intro:"Construye tu historia o entra en la competición en vivo.",solo:"VIAJE EN SOLITARIO",lifeDesc:"Crea tu plantilla, decide y escribe una historia de fútbol de siete partidos.",lifeMeta:"ENFOCADO EN CARRERA",lifeCta:"EMPEZAR HISTORIA",multiplayer:"COMPETICIÓN EN VIVO",arenaDesc:"Juega partidos en directo, sube en la tabla y busca la revancha.",arenaMeta:"CLASIFICADO · EN VIVO",arenaCta:"ENTRAR EN ARENA",note:"Una misma base para crear tu plantilla, dos formas de competir: carrera o directo."},
    de:{slogan:"WÄHLE DEINE STORY · AB AUFS FELD",kicker:"SPIELMODUS",title:"Wie möchtest du spielen?",intro:"Baue deine Story auf oder stell dich dem Live-Wettkampf.",solo:"SOLO-KARRIERE",lifeDesc:"Baue deinen Kader, entscheide und schreibe eine Fußballstory über sieben Spiele.",lifeMeta:"KARRIEREFOKUS",lifeCta:"STORY STARTEN",multiplayer:"LIVE-WETTBEWERB",arenaDesc:"Spiele live, klettere in der Tabelle und hole dir deine Revanche.",arenaMeta:"RANGLISTE · LIVE",arenaCta:"ARENA BETRETEN",note:"Eine gemeinsame Kaderbasis, zwei Wege zu spielen: Karriere oder live."},
    it:{slogan:"SCEGLI LA TUA STORIA · SCENDI IN CAMPO",kicker:"MODALITÀ DI GIOCO",title:"Come vuoi giocare?",intro:"Costruisci la tua storia o entra nella competizione live.",solo:"VIAGGIO IN SINGOLO",lifeDesc:"Crea la rosa, scegli e scrivi una storia di calcio in sette partite.",lifeMeta:"FOCUS CARRIERA",lifeCta:"INIZIA LA STORIA",multiplayer:"COMPETIZIONE LIVE",arenaDesc:"Gioca dal vivo, scala la classifica e cerca la tua rivincita.",arenaMeta:"CLASSIFICATA · LIVE",arenaCta:"ENTRA NELL'ARENA",note:"Una base comune per creare la rosa, due modi di competere: carriera o live."}
  };
  Object.assign(COPY.tr,{multiplayer:"ÇOK OYUNCULU"});
  Object.assign(COPY.en,{multiplayer:"MULTIPLAYER"});
  Object.assign(COPY.es,{multiplayer:"MULTIJUGADOR"});
  Object.assign(COPY.de,{multiplayer:"MEHRSPIELER"});
  Object.assign(COPY.it,{multiplayer:"MULTIGIOCATORE"});
  COPY.tr.arenaDesc="Canlı maçlara gir, sıralamada yüksel ve doğru anda rövanşı al.";
  COPY.en.arenaDesc="Enter live matches, climb the table and take your rematch when it matters.";
  COPY.en.arenaMeta="COMPETITIVE · LIVE";COPY.en.arenaReady="ARENA READY · RANKED";
  COPY.es.arenaDesc="Partidos en directo, ascenso en la tabla y emoción de revancha.";
  COPY.de.arenaDesc="Live-Spiele, der Aufstieg in der Tabelle und Revanche-Spannung.";
  COPY.it.arenaDesc="Partite dal vivo, scalata in classifica ed emozione della rivincita.";
  Object.assign(COPY.tr,{storyMode:"HİKÂYE MODU",lifeFeatureStory:"HİKÂYE",lifeFeatureLength:"7 MAÇ",lifeFeatureSave:"OTOMATİK KAYIT",arenaFeatureRanked:"DERECELİ",arenaFeatureLive:"CANLI EŞLEŞME",arenaFeatureSeason:"SEZON YOLU",lifeStatusLabel:"MEVCUT KARİYERİN",arenaStatusLabel:"ARENA PROFİLİN",lifeCta:"COPA LIFE'A BAŞLA",arenaCta:"ARENA'YA GİR",selectionLabel:"Oyun modu seçimi",lifeFeatures:"Copa Life özellikleri",arenaFeatures:"Copa Arena özellikleri",newCareer:"YENİ KARİYER · 7 MAÇ",continueCareer:"KALDIĞIN YERDEN · MAÇ {round}/7",arenaReady:"SERVİS HAZIR · DERECELİ",arenaClub:"{club} · DERECELİ",arenaOffline:"ÇEVRİMDIŞI · ANTRENMAN AÇIK",continueCta:"KARİYERE DEVAM ET",appKicker:"MOBİLDE DE OYNA",appTitle:"Kariyerine telefondan devam et",appDescription:"Kadron ve ilerlemen yanında.",appCta:"GOOGLE PLAY'DEN İNDİR",appLabel:"Google Play'den Copa Life uygulamasını indir",appNew:"YENİ",appMobileCta:"TELEFONDA OYNA"});
  Object.assign(COPY.en,{storyMode:"STORY MODE",lifeFeatureStory:"STORY",lifeFeatureLength:"7 MATCHES",lifeFeatureSave:"AUTO SAVE",arenaFeatureRanked:"RANKED",arenaFeatureLive:"LIVE MATCH",arenaFeatureSeason:"SEASON TRACK",lifeStatusLabel:"YOUR CAREER",arenaStatusLabel:"YOUR ARENA PROFILE",lifeCta:"START COPA LIFE",arenaCta:"ENTER ARENA",selectionLabel:"Game mode selection",lifeFeatures:"Copa Life features",arenaFeatures:"Copa Arena features",newCareer:"NEW CAREER · 7 MATCHES",continueCareer:"CONTINUE · MATCH {round}/7",arenaReady:"SERVICE READY · RANKED",arenaClub:"{club} · RANKED",arenaOffline:"OFFLINE · PRACTICE OPEN",continueCta:"CONTINUE CAREER",appKicker:"PLAY ON MOBILE",appTitle:"Continue your career on your phone",appDescription:"Your squad and progress stay with you.",appCta:"GET IT ON GOOGLE PLAY",appLabel:"Get Copa Life on Google Play",appNew:"NEW",appMobileCta:"PLAY ON MOBILE"});
  Object.assign(COPY.es,{storyMode:"MODO HISTORIA",lifeFeatureStory:"HISTORIA",lifeFeatureLength:"7 PARTIDOS",lifeFeatureSave:"AUTOGUARDADO",arenaFeatureRanked:"CLASIFICATORIO",arenaFeatureLive:"PARTIDA EN VIVO",arenaFeatureSeason:"RUTA DE TEMPORADA",lifeStatusLabel:"ESTADO DE CARRERA",arenaStatusLabel:"ESTADO DE ARENA",lifeCta:"INICIAR COPA LIFE",arenaCta:"ENTRAR EN ARENA",selectionLabel:"Selección de modo de juego",lifeFeatures:"Características de Copa Life",arenaFeatures:"Características de Copa Arena",newCareer:"NUEVA CARRERA · 7 PARTIDOS",continueCareer:"CONTINUAR · PARTIDO {round}/7",arenaReady:"SERVICIO LISTO · CLASIFICATORIO",arenaClub:"{club} · CLASIFICATORIO",arenaOffline:"SIN CONEXIÓN · PRÁCTICA ABIERTA",continueCta:"CONTINUAR CARRERA"});
  Object.assign(COPY.de,{storyMode:"STORY-MODUS",lifeFeatureStory:"STORY",lifeFeatureLength:"7 SPIELE",lifeFeatureSave:"AUTOSAVE",arenaFeatureRanked:"RANGLISTE",arenaFeatureLive:"LIVE-SPIEL",arenaFeatureSeason:"SAISONPFAD",lifeStatusLabel:"KARRIERESTATUS",arenaStatusLabel:"ARENASTATUS",lifeCta:"COPA LIFE STARTEN",arenaCta:"ARENA BETRETEN",selectionLabel:"Spielmodusauswahl",lifeFeatures:"Copa-Life-Funktionen",arenaFeatures:"Copa-Arena-Funktionen",newCareer:"NEUE KARRIERE · 7 SPIELE",continueCareer:"FORTSETZEN · SPIEL {round}/7",arenaReady:"DIENST BEREIT · RANGLISTE",arenaClub:"{club} · RANGLISTE",arenaOffline:"OFFLINE · TRAINING OFFEN",continueCta:"KARRIERE FORTSETZEN"});
  Object.assign(COPY.it,{storyMode:"MODALITÀ STORIA",lifeFeatureStory:"STORIA",lifeFeatureLength:"7 PARTITE",lifeFeatureSave:"SALVATAGGIO AUTO",arenaFeatureRanked:"CLASSIFICATA",arenaFeatureLive:"PARTITA LIVE",arenaFeatureSeason:"PERCORSO STAGIONE",lifeStatusLabel:"STATO CARRIERA",arenaStatusLabel:"STATO ARENA",lifeCta:"AVVIA COPA LIFE",arenaCta:"ENTRA NELL'ARENA",selectionLabel:"Selezione modalità di gioco",lifeFeatures:"Funzioni Copa Life",arenaFeatures:"Funzioni Copa Arena",newCareer:"NUOVA CARRIERA · 7 PARTITE",continueCareer:"CONTINUA · PARTITA {round}/7",arenaReady:"SERVIZIO PRONTO · CLASSIFICATA",arenaClub:"{club} · CLASSIFICATA",arenaOffline:"OFFLINE · ALLENAMENTO APERTO",continueCta:"CONTINUA CARRIERA"});
  const format=(template,values)=>String(template||"").replace(/\{(\w+)\}/g,(_,key)=>values[key]??"");
  let modeTransitionPending=false;
  function runState(){try{return root.CopaRunPersistence?.read?.().state||null;}catch(_){return null;}}
  function arenaClub(){try{return root.localStorage.getItem("copa_arena_club_v1")||"";}catch(_){return "";}}
  function refreshState(copy){
    const element=gate();if(!element)return;
    const run=runState(),life=element.querySelector('[data-mode-state="life"]'),lifeCta=element.querySelector('.mode-card-classic [data-mode-copy="lifeCta"]');
    if(life)life.textContent=run?format(copy.continueCareer,{round:Math.max(1,Math.min(7,Number(run.round)||1))}):copy.newCareer;
    if(lifeCta)lifeCta.textContent=run?copy.continueCta:copy.lifeCta;
    const arena=element.querySelector('[data-mode-state="arena"]'),club=arenaClub();
    if(arena)arena.textContent=!root.navigator.onLine?copy.arenaOffline:(club?format(copy.arenaClub,{club}):copy.arenaReady);
  }
  function selectCard(card,focus=false){
    const element=gate();if(!element||!card)return;
    element.querySelectorAll(".mode-card").forEach(item=>item.classList.toggle("is-selected",item===card));
    if(focus)card.focus({preventScroll:true});
  }
  function setVisible(visible){
    const element=gate();if(!element)return;
    const hidden=!visible;
    if(element.hidden!==hidden)element.hidden=hidden;
    if(document.documentElement.classList.contains("mode-gate-active")!==visible)document.documentElement.classList.toggle("mode-gate-active",visible);
    if(document.body.classList.contains("mode-gate-active")!==visible)document.body.classList.toggle("mode-gate-active",visible);
    if(visible){element.scrollTop=0;refreshCopy();}
    syncLifeBack();
  }
  function syncLifeBack(){
    const button=lifeBack(),intro=document.getElementById("intro"),element=gate();if(!button)return;
    const visible=document.body.dataset.copaMode==="classic"&&!document.body.classList.contains("run-active")&&intro&&!intro.classList.contains("hidden")&&element?.hidden;
    const hidden=!visible;if(button.hidden!==hidden)button.hidden=hidden;
  }
  function returnToModes(){
    delete document.body.dataset.copaMode;
    setVisible(true);
  }
  function restoreLifeSetup(){
    const land=document.getElementById("introLand"),setup=document.getElementById("introSetup");
    land?.classList.remove("hidden");
    if(!root.CopaMobileShell?.gameMode?.())setup?.classList.remove("hidden");
    root.requestAnimationFrame(()=>root.scrollTo(0,0));
  }
  function nativeLifeMode(){
    const platform=(document.querySelector('meta[name="copa-platform"]')||{}).content||document.documentElement.dataset.copaPlatform||"web";
    return String(platform).toLowerCase()!=="web"||!!root.COPA_IS_NATIVE;
  }
  function waitForMobileShell(){
    if(root.CopaMobileShell?.showLanding)return Promise.resolve(root.CopaMobileShell);
    return new Promise(resolve=>{
      const started=Date.now();
      let readyObserved=false;
      const check=()=>{
        if(root.CopaMobileShell?.showLanding){resolve(root.CopaMobileShell);return;}
        if(!readyObserved&&root.CopaMobileShellReady&&typeof root.CopaMobileShellReady.finally==="function"){
          readyObserved=true;
          root.CopaMobileShellReady.finally(check);
          return;
        }
        if(Date.now()-started>=8000){resolve(null);return;}
        root.setTimeout(check,16);
      };
      check();
    });
  }
  function setTransitionState(active,button){
    const element=gate();if(!element)return;
    element.classList.toggle("is-transitioning",active);
    element.toggleAttribute("aria-busy",active);
    element.querySelectorAll("[data-mode-choice]").forEach(card=>{
      card.classList.toggle("is-launching",active&&card===button);
      card.toggleAttribute("aria-disabled",active);
    });
  }
  function openClassicMode(){
    setVisible(false);
    document.body.dataset.copaMode="classic";
    document.getElementById("intro")?.classList.remove("hidden");
    const shell=root.CopaMobileShell;
    if(nativeLifeMode()&&shell?.showLanding){
      shell.showLanding(runState());
      root.requestAnimationFrame(()=>root.scrollTo(0,0));
      return;
    }
    restoreLifeSetup();
  }
  function choose(mode){
    if(mode==="classic"){
      if(modeTransitionPending)return;
      if(nativeLifeMode()&&!root.CopaMobileShell?.showLanding){
        modeTransitionPending=true;
        const button=gate()?.querySelector('[data-mode-choice="classic"]');
        setTransitionState(true,button);
        waitForMobileShell().then(shell=>{
          if(shell?.showLanding)openClassicMode();
        }).finally(()=>{
          modeTransitionPending=false;
          setTransitionState(false,button);
        });
        return;
      }
      openClassicMode();
      return;
    }
    if(mode==="arena"){
      setVisible(false);
      document.body.dataset.copaMode="arena";
      root.CopaLazy?.openArena().catch(()=>setVisible(true));
    }
  }
  function refreshCopy(){
    const element=gate();if(!element)return;
    const copy=COPY[root.LANG]||COPY.en;
    const title=element.querySelector("#modeGateTitle");if(title)title.textContent=copy.title;
    element.querySelectorAll("[data-mode-copy]").forEach(node=>{const value=copy[node.dataset.modeCopy];if(value)node.textContent=value;});
    element.querySelectorAll("[data-mode-aria]").forEach(node=>{const value=copy[node.dataset.modeAria];if(value)node.setAttribute("aria-label",value);});
    element.querySelectorAll("[data-mode-badge]").forEach(node=>{node.hidden=node.dataset.modeBadge!==((root.LANG||"en")==="tr"?"tr":"en");});
    refreshState(copy);
    const settings=element.querySelector(".mode-settings-button");
    if(settings){const label={tr:"Ayarlar",en:"Settings",es:"Ajustes",de:"Einstellungen",it:"Impostazioni"}[root.LANG]||"Settings";settings.title=label;settings.setAttribute("aria-label",label);}
    const button=lifeBack();
    if(button){const label={tr:"GERİ",en:"BACK",es:"VOLVER",de:"ZURÜCK",it:"INDIETRO"}[root.LANG]||"BACK";button.querySelector("span").textContent=label;button.setAttribute("aria-label",label);}
  }
  function hasRestorableSession(){
    try{
      const run=root.CopaRunPersistence?.read?.().state;
      const final=root.CopaFinalSimPersistence?.read?.().state;
      const penalty=root.CopaPenaltyPersistence?.read?.().state;
      return !!(run||final||penalty||document.body.classList.contains("run-active"));
    }catch(_){return document.body.classList.contains("run-active");}
  }
  function shouldBypassForAutomation(){
    try{
      const params=new URLSearchParams(root.location.search);
      const modeGateQa=params.get("visual")==="restart-landing"||params.has("mode-gate-qa");
      return !!root.navigator.webdriver&&!params.has("arena-visual-qa")&&!modeGateQa;
    }catch(_){return false;}
  }
  function shouldYieldToGame(){
    return shouldBypassForAutomation()||hasRestorableSession()||!!document.querySelector("#modal:not(.hidden),#finalSim:not(.hidden),.final-sim-screen:not(.hidden)");
  }
  document.addEventListener("click",event=>{
    const button=event.target.closest("[data-mode-choice]");if(button){root.sfxModeChoice?.(button.dataset.modeChoice);choose(button.dataset.modeChoice);}
  });
  document.addEventListener("pointerover",event=>{const card=event.target.closest?.(".mode-card");if(card&&gate()?.contains(card))selectCard(card);});
  document.addEventListener("focusin",event=>{const card=event.target.closest?.(".mode-card");if(card&&gate()?.contains(card))selectCard(card);});
  document.addEventListener("keydown",event=>{
    if(!gate()||gate().hidden||!["ArrowLeft","ArrowRight","ArrowUp","ArrowDown"].includes(event.key))return;
    const cards=[...gate().querySelectorAll(".mode-card")],focused=document.activeElement?.closest?.(".mode-card"),current=cards.indexOf(focused);
    event.preventDefault();selectCard(cards[current===0?1:0]||cards[0],true);
  });
  root.addEventListener("online",refreshCopy);root.addEventListener("offline",refreshCopy);
  root.CopaModeGate=Object.freeze({show:()=>setVisible(true),hide:()=>setVisible(false),choose,returnToModes,refreshCopy});
  document.addEventListener("DOMContentLoaded",()=>{
    refreshCopy();
    setVisible(!shouldYieldToGame());
    new MutationObserver(()=>{if(shouldYieldToGame())setVisible(false);syncLifeBack();})
      .observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:["class","hidden","data-copa-mode"]});
  });
})(window);
