(function(root){
  "use strict";
  if(root.COPA_PLATFORM!=="android"||!root.Capacitor)return;
  const capacitor=root.Capacitor,plugins=capacitor.Plugins||{};
  const resolvePlugin=name=>plugins[name]||(typeof capacitor.registerPlugin==="function"?capacitor.registerPlugin(name):null);
  const App=resolvePlugin("App"),StatusBar=resolvePlugin("StatusBar"),SplashScreen=resolvePlugin("SplashScreen");
  if(!App||!StatusBar||!SplashScreen)return;
  function addNativeListener(name,handler){try{const result=App.addListener(name,handler);if(result&&typeof result.catch==="function")result.catch(()=>{});}catch(_){}}
  function checkpoint(){
    try{if(typeof root._saveState==="function")root._saveState();}catch(_){}
    try{if(root.sim&&typeof root.sim.checkpoint==="function")root.sim.checkpoint();}catch(_){}
  }
  function closeOverlay(){
    if(root.PlayerProfiles&&root.PlayerProfiles.isOpen()){root.PlayerProfiles.close();return true;}
    const consent=document.getElementById("ghostConsentDialog");if(consent){consent.remove();return true;}
    const settings=document.getElementById("settingsDrop");if(settings&&!settings.classList.contains("hidden")){settings.classList.add("hidden");return true;}
    const modal=document.getElementById("modal");if(modal&&!modal.classList.contains("hidden")&&typeof root.closeModal==="function"){root.closeModal();return true;}
    return false;
  }
  addNativeListener("appStateChange",state=>{if(!state.isActive)checkpoint();root.dispatchEvent(new CustomEvent("copa:native-state",{detail:{active:!!state.isActive}}));});
  addNativeListener("pause",checkpoint);
  addNativeListener("backButton",event=>{if(closeOverlay())return;checkpoint();if(event&&event.canGoBack){root.history.back();return;}App.minimizeApp().catch(()=>App.exitApp().catch(()=>{}));});
  root.addEventListener("pagehide",checkpoint,{passive:true});
  Promise.allSettled([StatusBar.setStyle({style:"LIGHT"}),StatusBar.setOverlaysWebView({overlay:false}),StatusBar.setBackgroundColor({color:"#f5f0e8"})]).finally(()=>SplashScreen.hide().catch(()=>{}));
})(window);
