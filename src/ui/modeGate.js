(function(root){
  "use strict";
  const gate=()=>document.getElementById("modeGate");
  function setVisible(visible){
    const element=gate();if(!element)return;
    const hidden=!visible;
    if(element.hidden!==hidden)element.hidden=hidden;
    if(document.documentElement.classList.contains("mode-gate-active")!==visible)document.documentElement.classList.toggle("mode-gate-active",visible);
    if(document.body.classList.contains("mode-gate-active")!==visible)document.body.classList.toggle("mode-gate-active",visible);
    if(visible)element.scrollTop=0;
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
    const tr=root.LANG!=="en";
    const heading=element.querySelector(".mode-gate-heading");
    if(!heading)return;
    heading.innerHTML=tr
      ?'<span>OYUN MODU</span><h1 id="modeGateTitle">Nasıl oynamak istersin?</h1><p>Tek oyunculu hikâyeni yaşa veya Arena\'da gerçek rakiplere meydan oku.</p>'
      :'<span>GAME MODE</span><h1 id="modeGateTitle">How do you want to play?</h1><p>Write your solo story or challenge real opponents in the Arena.</p>';
  }
  function hasRestorableSession(){
    try{
      const run=root.CopaRunPersistence?.read?.().state;
      const final=root.CopaFinalSimPersistence?.read?.().state;
      const penalty=root.CopaPenaltyPersistence?.read?.().state;
      return !!(run||final||penalty||document.body.classList.contains("run-active"));
    }catch(_){return document.body.classList.contains("run-active");}
  }
  function isNativeGame(){
    try{return !!(root.COPA_IS_NATIVE||root.Capacitor?.isNativePlatform?.()||new URLSearchParams(root.location.search).has("native-game"));}catch(_){return false;}
  }
  function shouldBypassForAutomation(){
    try{
      const params=new URLSearchParams(root.location.search);
      return !!root.navigator.webdriver&&!params.has("arena-visual-qa");
    }catch(_){return false;}
  }
  function shouldYieldToGame(){
    return shouldBypassForAutomation()||isNativeGame()||hasRestorableSession()||!!document.querySelector("#modal:not(.hidden),#finalSim:not(.hidden),.final-sim-screen:not(.hidden)");
  }
  document.addEventListener("click",event=>{
    const button=event.target.closest("[data-mode-choice]");if(button)choose(button.dataset.modeChoice);
  });
  root.CopaModeGate=Object.freeze({show:()=>setVisible(true),hide:()=>setVisible(false),choose,refreshCopy});
  document.addEventListener("DOMContentLoaded",()=>{
    refreshCopy();
    setVisible(!shouldYieldToGame());
    new MutationObserver(()=>{if(shouldYieldToGame())setVisible(false);})
      .observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:["class","hidden"]});
  });
})(window);
