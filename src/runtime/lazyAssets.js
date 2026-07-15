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
  function ensureFinalSim(){
    return loadScriptOnce("final-sim","src/sim/finalSim.js?v=20260715-lazy1",()=>typeof global.buildSim==="function").then(()=>{
      if(typeof global._copaSimPauseUi==="function")global.simPause=global._copaSimPauseUi;
    });
  }
  global.CopaLazy=Object.freeze({loadScriptOnce,ensureFinalSim});
})(window);
