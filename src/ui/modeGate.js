(function(root){
  "use strict";
  const gate=()=>document.getElementById("modeGate");
  const lifeBack=()=>document.getElementById("lifeModeBack");
  const COPY={
    tr:{slogan:"HİKÂYENİ SEÇ. SAHAYA ÇIK.",kicker:"OYUN MODU",title:"Nasıl oynamak istersin?",intro:"Tek oyunculu hikâyeni yaşa veya Arena'da rakiplere meydan oku.",solo:"TEK OYUNCULU",lifeDesc:"Kadronu kur, seçimlerini yap ve kendi futbol hikâyeni yaz.",lifeMeta:"KLASİK DENEYİM",lifeCta:"OYNA →",multiplayer:"ÇOK OYUNCULU",arenaDesc:"Canlı eşleşmeler, dereceli yolculuk ve rövanş heyecanı.",arenaMeta:"REKABETÇİ · CANLI",arenaCta:"ARENA'YA GİR →",note:"LIFE tek oyunculu yolculuk; ARENA süreli kararlar ve canlı rekabet sunar."},
    en:{slogan:"CHOOSE YOUR STORY. TAKE THE FIELD.",kicker:"GAME MODE",title:"How do you want to play?",intro:"Write your solo story or challenge opponents in the Arena.",solo:"SINGLE PLAYER",lifeDesc:"Build your squad, make your choices and write your own football story.",lifeMeta:"CLASSIC EXPERIENCE",lifeCta:"PLAY →",multiplayer:"MULTIPLAYER",arenaDesc:"Live matchmaking, a ranked journey and rematch drama.",arenaMeta:"COMPETITIVE · LIVE",arenaCta:"ENTER ARENA →",note:"LIFE is a solo journey; ARENA adds timed decisions and live competition."},
    es:{slogan:"ELIGE TU HISTORIA. SALTA AL CAMPO.",kicker:"MODO DE JUEGO",title:"¿Cómo quieres jugar?",intro:"Vive tu historia en solitario o desafía a rivales en la Arena.",solo:"UN JUGADOR",lifeDesc:"Crea tu plantilla, decide y escribe tu propia historia de fútbol.",lifeMeta:"EXPERIENCIA CLÁSICA",lifeCta:"JUGAR →",multiplayer:"MULTIJUGADOR",arenaDesc:"Emparejamiento en vivo, camino clasificatorio y emoción de revancha.",arenaMeta:"COMPETITIVO · EN VIVO",arenaCta:"ENTRAR EN ARENA →",note:"LIFE es un viaje individual; ARENA añade decisiones cronometradas y competición en vivo."},
    de:{slogan:"WÄHLE DEINE STORY. AB AUFS FELD.",kicker:"SPIELMODUS",title:"Wie möchtest du spielen?",intro:"Erlebe deine Solo-Story oder fordere Gegner in der Arena heraus.",solo:"EINZELSPIELER",lifeDesc:"Baue deinen Kader, entscheide und schreibe deine eigene Fußballgeschichte.",lifeMeta:"KLASSISCHES ERLEBNIS",lifeCta:"SPIELEN →",multiplayer:"MEHRSPIELER",arenaDesc:"Live-Matchmaking, Ranglistenreise und Revanche-Spannung.",arenaMeta:"WETTKAMPF · LIVE",arenaCta:"ARENA BETRETEN →",note:"LIFE ist eine Solo-Reise; ARENA bringt Zeitentscheidungen und Live-Wettkampf."},
    it:{slogan:"SCEGLI LA TUA STORIA. SCENDI IN CAMPO.",kicker:"MODALITÀ DI GIOCO",title:"Come vuoi giocare?",intro:"Vivi la storia in singolo o sfida gli avversari nell'Arena.",solo:"GIOCATORE SINGOLO",lifeDesc:"Crea la rosa, scegli e scrivi la tua storia di calcio.",lifeMeta:"ESPERIENZA CLASSICA",lifeCta:"GIOCA →",multiplayer:"MULTIGIOCATORE",arenaDesc:"Matchmaking live, percorso classificato ed emozione della rivincita.",arenaMeta:"COMPETITIVO · LIVE",arenaCta:"ENTRA NELL'ARENA →",note:"LIFE è un viaggio in singolo; ARENA aggiunge decisioni a tempo e competizione live."}
  };
  Object.assign(COPY.tr,{storyMode:"HİKÂYE MODU",lifeFeatureStory:"HİKÂYE",lifeFeatureLength:"7 MAÇ",lifeFeatureSave:"OTOMATİK KAYIT",arenaFeatureRanked:"DERECELİ",arenaFeatureLive:"CANLI EŞLEŞME",arenaFeatureSeason:"SEZON YOLU",lifeStatusLabel:"KARİYER DURUMU",arenaStatusLabel:"ARENA DURUMU",lifeCta:"COPA LIFE'I BAŞLAT",arenaCta:"ARENA'YA GİR",selectionLabel:"Oyun modu seçimi",lifeFeatures:"Copa Life özellikleri",arenaFeatures:"Copa Arena özellikleri",newCareer:"YENİ KARİYER · 7 MAÇ",continueCareer:"KALDIĞIN YERDEN · MAÇ {round}/7",arenaReady:"SERVİS HAZIR · DERECELİ",arenaClub:"{club} · DERECELİ",arenaOffline:"ÇEVRİMDIŞI · ANTRENMAN AÇIK",continueCta:"KARİYERE DEVAM ET"});
  Object.assign(COPY.en,{storyMode:"STORY MODE",lifeFeatureStory:"STORY",lifeFeatureLength:"7 MATCHES",lifeFeatureSave:"AUTO SAVE",arenaFeatureRanked:"RANKED",arenaFeatureLive:"LIVE MATCH",arenaFeatureSeason:"SEASON TRACK",lifeStatusLabel:"CAREER STATUS",arenaStatusLabel:"ARENA STATUS",lifeCta:"START COPA LIFE",arenaCta:"ENTER ARENA",selectionLabel:"Game mode selection",lifeFeatures:"Copa Life features",arenaFeatures:"Copa Arena features",newCareer:"NEW CAREER · 7 MATCHES",continueCareer:"CONTINUE · MATCH {round}/7",arenaReady:"SERVICE READY · RANKED",arenaClub:"{club} · RANKED",arenaOffline:"OFFLINE · PRACTICE OPEN",continueCta:"CONTINUE CAREER"});
  Object.assign(COPY.es,{storyMode:"MODO HISTORIA",lifeFeatureStory:"HISTORIA",lifeFeatureLength:"7 PARTIDOS",lifeFeatureSave:"AUTOGUARDADO",arenaFeatureRanked:"CLASIFICATORIO",arenaFeatureLive:"PARTIDA EN VIVO",arenaFeatureSeason:"RUTA DE TEMPORADA",lifeStatusLabel:"ESTADO DE CARRERA",arenaStatusLabel:"ESTADO DE ARENA",lifeCta:"INICIAR COPA LIFE",arenaCta:"ENTRAR EN ARENA",selectionLabel:"Selección de modo de juego",lifeFeatures:"Características de Copa Life",arenaFeatures:"Características de Copa Arena",newCareer:"NUEVA CARRERA · 7 PARTIDOS",continueCareer:"CONTINUAR · PARTIDO {round}/7",arenaReady:"SERVICIO LISTO · CLASIFICATORIO",arenaClub:"{club} · CLASIFICATORIO",arenaOffline:"SIN CONEXIÓN · PRÁCTICA ABIERTA",continueCta:"CONTINUAR CARRERA"});
  Object.assign(COPY.de,{storyMode:"STORY-MODUS",lifeFeatureStory:"STORY",lifeFeatureLength:"7 SPIELE",lifeFeatureSave:"AUTOSAVE",arenaFeatureRanked:"RANGLISTE",arenaFeatureLive:"LIVE-SPIEL",arenaFeatureSeason:"SAISONPFAD",lifeStatusLabel:"KARRIERESTATUS",arenaStatusLabel:"ARENASTATUS",lifeCta:"COPA LIFE STARTEN",arenaCta:"ARENA BETRETEN",selectionLabel:"Spielmodusauswahl",lifeFeatures:"Copa-Life-Funktionen",arenaFeatures:"Copa-Arena-Funktionen",newCareer:"NEUE KARRIERE · 7 SPIELE",continueCareer:"FORTSETZEN · SPIEL {round}/7",arenaReady:"DIENST BEREIT · RANGLISTE",arenaClub:"{club} · RANGLISTE",arenaOffline:"OFFLINE · TRAINING OFFEN",continueCta:"KARRIERE FORTSETZEN"});
  Object.assign(COPY.it,{storyMode:"MODALITÀ STORIA",lifeFeatureStory:"STORIA",lifeFeatureLength:"7 PARTITE",lifeFeatureSave:"SALVATAGGIO AUTO",arenaFeatureRanked:"CLASSIFICATA",arenaFeatureLive:"PARTITA LIVE",arenaFeatureSeason:"PERCORSO STAGIONE",lifeStatusLabel:"STATO CARRIERA",arenaStatusLabel:"STATO ARENA",lifeCta:"AVVIA COPA LIFE",arenaCta:"ENTRA NELL'ARENA",selectionLabel:"Selezione modalità di gioco",lifeFeatures:"Funzioni Copa Life",arenaFeatures:"Funzioni Copa Arena",newCareer:"NUOVA CARRIERA · 7 PARTITE",continueCareer:"CONTINUA · PARTITA {round}/7",arenaReady:"SERVIZIO PRONTO · CLASSIFICATA",arenaClub:"{club} · CLASSIFICATA",arenaOffline:"OFFLINE · ALLENAMENTO APERTO",continueCta:"CONTINUA CARRIERA"});
  const format=(template,values)=>String(template||"").replace(/\{(\w+)\}/g,(_,key)=>values[key]??"");
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
  function choose(mode){
    if(mode==="classic"){
      setVisible(false);
      document.body.dataset.copaMode="classic";
      document.getElementById("intro")?.classList.remove("hidden");
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
