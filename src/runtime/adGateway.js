(function(root){
  "use strict";
  const config=root.COPA_WEB_ADS_CONFIG&&typeof root.COPA_WEB_ADS_CONFIG==="object"?root.COPA_WEB_ADS_CONFIG:{};
  const client=/^ca-pub-\d{16}$/.test(String(config.client||""))?String(config.client):"";
  const channel=/^\d{1,20}$/.test(String(config.channel||""))?String(config.channel):"";
  const displaySlot=/^\d{10}$/.test(String(config.displaySlot||""))?String(config.displaySlot):"";
  let sdkRequested=false,activeBreak=false;
  function nativeApi(){return root.COPA_IS_NATIVE&&root.COPA_PLATFORM==="android"&&root.CopaNativeAds?root.CopaNativeAds:null;}
  function webEnabled(){return !root.COPA_IS_NATIVE&&!!client;}
  function emit(name,detail){try{root.dispatchEvent(new CustomEvent(name,{detail:detail||{}}));}catch(_){}}
  function configureSound(){if(typeof root.adConfig!=="function")return;try{root.adConfig({preloadAdBreaks:"on",sound:root.CopaSfxMuted&&root.CopaSfxMuted()?"off":"on"});}catch(_){}}
  function ensureWebSdk(){
    if(!webEnabled()||sdkRequested)return webEnabled();
    sdkRequested=true;root.adsbygoogle=root.adsbygoogle||[];
    if(typeof root.adBreak!=="function")root.adBreak=function(options){root.adsbygoogle.push(options);};
    if(typeof root.adConfig!=="function")root.adConfig=root.adBreak;
    const existing=typeof document.querySelector==="function"?document.querySelector(`script[src*="pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"][src*="${client}"]`):null;
    if(!existing){
      const script=document.createElement("script");script.async=true;script.crossOrigin="anonymous";script.dataset.adClient=client;script.dataset.adFrequencyHint=String(config.frequencyHint||"600s");
      if(channel)script.dataset.adChannel=channel;
      script.src=`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(client)}`;
      document.head.appendChild(script);
    }
    configureSound();return true;
  }
  function beforeAd(name){activeBreak=true;document.documentElement.classList.add("copa-ad-break-active");emit("copa:ad-break-start",{name});}
  function afterAd(name){activeBreak=false;document.documentElement.classList.remove("copa-ad-break-active");emit("copa:ad-break-end",{name});configureSound();}
  function webInterstitial(name){
    if(!ensureWebSdk()||typeof root.adBreak!=="function")return Promise.resolve({shown:false,reason:"not_configured"});
    return new Promise(resolve=>{let shown=false,settled=false;const done=placementInfo=>{if(settled)return;settled=true;if(activeBreak)afterAd(name);resolve({shown,reason:shown?"shown":"not_available",placementInfo:placementInfo||null});};try{root.adBreak({type:"next",name,beforeAd:()=>{shown=true;beforeAd(name);},afterAd:()=>afterAd(name),adBreakDone:done});}catch(_){done(null);}setTimeout(()=>done(null),3500);});
  }
  function webReward(name){
    if(!ensureWebSdk()||typeof root.adBreak!=="function")return Promise.resolve({earned:false,reason:"not_configured"});
    return new Promise(resolve=>{let earned=false,offered=false,settled=false;const done=placementInfo=>{if(settled)return;settled=true;if(activeBreak)afterAd(name);resolve({earned,reason:earned?"earned":offered?"dismissed":"not_available",placementInfo:placementInfo||null});};try{root.adBreak({type:"reward",name,beforeReward:showAdFn=>{offered=true;showAdFn();},beforeAd:()=>beforeAd(name),afterAd:()=>afterAd(name),adDismissed:()=>{earned=false;},adViewed:()=>{earned=true;},adBreakDone:done});}catch(_){done(null);}setTimeout(()=>done(null),12000);});
  }
  function callNative(method,key){const api=nativeApi();return api&&typeof api[method]==="function"?api[method](key):null;}
  function showRunEnd(runKey){return callNative("showRunEnd",runKey)||webInterstitial("copa_life_run_end");}
  function showArenaEnd(matchId){return callNative("showArenaEnd",matchId)||webInterstitial("copa_arena_match_end");}
  function showRewardedReroll(runKey){return callNative("showRewardedReroll",runKey)||webReward("draft_reroll");}
  function showRewardedInjury(runKey){return callNative("showRewardedInjury",runKey)||webReward("injury_treatment");}
  function showRewardedMarket(runKey){return callNative("showRewardedMarket",runKey)||webReward(String(runKey||"").includes("free-agents")?"free_agent_reroll":"market_reroll");}
  function canReward(method){const api=nativeApi();return !!(api&&typeof api[method]==="function")||webEnabled();}
  function mountListSlot(element,placement){
    if(!element)return false;
    const native=nativeApi();
    // Native list ads are deliberately disabled. They live outside the WebView,
    // so stale placements can cover the app after navigation and CSS-pixel
    // coordinates can be scaled again on high-density phones and tablets.
    // Rewarded and interstitial ads remain available through their own flows.
    if(native){native.hideListPlacement&&native.hideListPlacement().catch(()=>{});return false;}
    if(!webEnabled()||!displaySlot)return false;ensureWebSdk();element.dataset.adPlacement=String(placement||"career_list");element.innerHTML=`<span>${root.LANG==="tr"?"REKLAM":"ADVERTISEMENT"}</span><ins class="adsbygoogle" style="display:block" data-ad-client="${client}" data-ad-slot="${displaySlot}" data-ad-format="auto" data-full-width-responsive="true"></ins>`;try{(root.adsbygoogle=root.adsbygoogle||[]).push({});element.classList.add("is-mounted");return true;}catch(_){return false;}
  }
  root.CopaAds=Object.freeze({showRunEnd,showArenaEnd,showRewardedReroll,showRewardedInjury,showRewardedMarket,canReward,mountListSlot,configured:()=>!!nativeApi()||webEnabled()});
  if(webEnabled())root.addEventListener("load",()=>setTimeout(ensureWebSdk,5000),{once:true});
})(window);
