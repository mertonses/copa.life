(function(root){
  "use strict";
  if(!root.COPA_IS_NATIVE||root.COPA_PLATFORM!=="android"||!root.Capacitor)return;
  const capacitor=root.Capacitor,plugins=capacitor.Plugins||{};
  const Ads=plugins.CopaAds||(typeof capacitor.registerPlugin==="function"?capacitor.registerPlugin("CopaAds"):null);
  if(!Ads)return;

  let privacyOptionsRequired=false;
  let privacyButton=null;
  function label(){return root.LANG==="tr"?"REKLAM GİZLİLİĞİ":"AD PRIVACY";}
  function syncPrivacyButton(status){
    if(status&&typeof status.privacyOptionsRequired==="boolean")privacyOptionsRequired=status.privacyOptionsRequired;
    const settings=document.getElementById("settingsDrop");
    if(!settings)return;
    if(!privacyButton){
      const group=document.createElement("div");group.className="sd-group native-ad-privacy-group";
      privacyButton=document.createElement("button");privacyButton.type="button";privacyButton.className="sdbtn sd-full";
      privacyButton.addEventListener("click",()=>Ads.showPrivacyOptions().catch(()=>{}));
      group.appendChild(privacyButton);settings.appendChild(group);
    }
    privacyButton.textContent=label();
    privacyButton.hidden=!privacyOptionsRequired;
    privacyButton.parentElement.hidden=!privacyOptionsRequired;
  }
  function initialize(){
    if(typeof Ads.addListener==="function"){
      const listener=Ads.addListener("privacyOptionsChanged",syncPrivacyButton);
      if(listener&&typeof listener.catch==="function")listener.catch(()=>{});
    }
    Ads.initialize().then(syncPrivacyButton).catch(()=>syncPrivacyButton({privacyOptionsRequired:false}));
  }
  function scheduleInitialize(){
    const defer=()=>setTimeout(initialize,8000);
    if(document.readyState==="complete")defer();
    else root.addEventListener("load",defer,{once:true});
  }
  function showRunEnd(runKey){
    const key=String(runKey||"").trim();if(!key)return Promise.resolve({shown:false,reason:"missing_run_key"});
    return new Promise(resolve=>setTimeout(resolve,900)).then(()=>Ads.showRunEnd({runKey:key})).catch(()=>({shown:false,reason:"native_error"}));
  }
  function showRewardedReroll(runKey){
    const key=String(runKey||"").trim();if(!key)return Promise.resolve({earned:false,reason:"missing_run_key"});
    return Ads.showRewardedReroll({runKey:key}).catch(()=>({earned:false,reason:"native_error"}));
  }
  root.CopaNativeAds=Object.freeze({showRunEnd,showRewardedReroll,showPrivacyOptions:()=>Ads.showPrivacyOptions(),getStatus:()=>Ads.getStatus()});
  scheduleInitialize();
})(window);
