/* Runtime chunks that are not needed during intro/draft/early rounds. */
(function(global){
  "use strict";
  const pending=new Map();
  function loadScriptOnce(key,src,test){
    if(test())return Promise.resolve();
    if(pending.has(key))return pending.get(key);
    const promise=new Promise((resolve,reject)=>{
      const script=document.createElement("script");script.src=src;script.async=true;
      script.onload=()=>test()?resolve():reject(new Error(key+" loaded without expected API"));
      script.onerror=()=>reject(new Error(key+" failed to load"));document.head.appendChild(script);
    }).finally(()=>pending.delete(key));
    pending.set(key,promise);return promise;
  }
  function ensureMatchCore(){
    return loadScriptOnce("final-sim-core","src/sim/finalSimCore.js?v=20260718-shared-core1",()=>!!(global.CopaFinalSimCore&&global.CopaFinalSimCore.MODEL_VERSION))
      .then(()=>loadScriptOnce("normal-match","src/game/normalMatch.js?v=20260718-shared-core1",()=>!!global.CopaNormalMatch));
  }
  function ensureFinalSim(){
    return ensureMatchCore()
      .then(()=>loadScriptOnce("final-sim","src/sim/finalSim.js?v=20260718-shared-core1",()=>typeof global.buildSim==="function")).then(()=>{
      if(typeof global._copaSimPauseUi==="function")global.simPause=global._copaSimPauseUi;
    });
  }
  function ensureMetaProgression(){
    if(!document.querySelector("link[data-copa-meta]")){
      const style=document.createElement("link");style.rel="stylesheet";style.href="src/styles/metaProgression.css?v=20260718-meta1";style.dataset.copaMeta="1";document.head.appendChild(style);
    }
    return loadScriptOnce("meta-progression","src/state/metaProgression.js?v=20260718-meta1",()=>!!global.CopaMeta).then(()=>global.CopaMeta);
  }
  function openMetaProgression(){return ensureMetaProgression().then(api=>api.openProgression()).catch(()=>{});}
  global.CopaLazy=Object.freeze({loadScriptOnce,ensureMatchCore,ensureFinalSim,ensureMetaProgression,openMetaProgression});
})(window);
