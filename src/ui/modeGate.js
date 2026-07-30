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
  function setVisible(visible){
    const element=gate();if(!element)return;
    const hidden=!visible;
    if(element.hidden!==hidden)element.hidden=hidden;
    if(document.documentElement.classList.contains("mode-gate-active")!==visible)document.documentElement.classList.toggle("mode-gate-active",visible);
    if(document.body.classList.contains("mode-gate-active")!==visible)document.body.classList.toggle("mode-gate-active",visible);
    if(visible)element.scrollTop=0;
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
      return !!root.navigator.webdriver&&!params.has("arena-visual-qa");
    }catch(_){return false;}
  }
  function shouldYieldToGame(){
    return shouldBypassForAutomation()||hasRestorableSession()||!!document.querySelector("#modal:not(.hidden),#finalSim:not(.hidden),.final-sim-screen:not(.hidden)");
  }
  document.addEventListener("click",event=>{
    const button=event.target.closest("[data-mode-choice]");if(button){root.sfxModeChoice?.(button.dataset.modeChoice);choose(button.dataset.modeChoice);}
  });
  root.CopaModeGate=Object.freeze({show:()=>setVisible(true),hide:()=>setVisible(false),choose,returnToModes,refreshCopy});
  document.addEventListener("DOMContentLoaded",()=>{
    refreshCopy();
    setVisible(!shouldYieldToGame());
    new MutationObserver(()=>{if(shouldYieldToGame())setVisible(false);syncLifeBack();})
      .observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:["class","hidden","data-copa-mode"]});
  });
})(window);
