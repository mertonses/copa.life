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
  function loadStyleOnce(key,href,selector){
    const current=document.querySelector(selector);if(current&&current.sheet)return Promise.resolve();
    if(pending.has(key))return pending.get(key);
    const style=current||document.createElement("link");style.rel="stylesheet";style.href=href;
    const promise=new Promise((resolve,reject)=>{style.onload=resolve;style.onerror=()=>reject(new Error(key+" failed to load"));if(!current)document.head.appendChild(style);}).finally(()=>pending.delete(key));
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
  function ensureChairPicker(){
    return Promise.all([
      loadStyleOnce("chair-picker-style","src/styles/chairPicker.css?v=20260718-grid1",'link[href*="chairPicker.css"]'),
      loadScriptOnce("chair-picker","src/ui/chairPicker.js?v=20260718-grid1",()=>!!global.CopaChairPicker)
    ]).then(()=>global.CopaChairPicker);
  }
  function ensureAdvancedSettings(){
    return Promise.all([
      loadStyleOnce("advanced-settings-style","src/styles/advancedSettings.css?v=20260718-layout1",'link[href*="advancedSettings.css"]'),
      loadScriptOnce("advanced-settings","src/ui/advancedSettings.js?v=20260718-layout1",()=>!!global.CopaAdvancedSettings)
    ]).then(()=>global.CopaAdvancedSettings);
  }
  function ensureScoutReport(){
    return loadScriptOnce("scout-report","src/ui/scoutReport.js?v=20260719-lazy1",()=>!!global.ScoutReport).then(()=>global.ScoutReport);
  }
  function ensureLastMatchReport(){
    return loadScriptOnce("last-match-report","src/ui/lastMatchReport.js?v=20260719-lazy1",()=>!!global.LastMatchReport).then(()=>global.LastMatchReport);
  }
  function warmRunReports(){
    return Promise.all([ensureScoutReport(),ensureLastMatchReport()]);
  }
  function toggleAdvancedSettings(button){
    const body=button&&button.nextElementSibling;if(!body)return Promise.resolve();
    const open=body.classList.contains("hidden"),apply=()=>{body.classList.toggle("hidden",!open);button.classList.toggle("open",open);button.setAttribute("aria-expanded",String(open));};
    if(!open){apply();return Promise.resolve();}return ensureAdvancedSettings().then(api=>{api.ensureMarkup(body);apply();}).catch(apply);
  }
  function openMetaProgression(){return ensureMetaProgression().then(api=>api.openProgression()).catch(()=>{});}
  global.CopaLazy=Object.freeze({loadScriptOnce,ensureMatchCore,ensureFinalSim,ensureMetaProgression,ensureChairPicker,ensureAdvancedSettings,ensureScoutReport,ensureLastMatchReport,warmRunReports,toggleAdvancedSettings,openMetaProgression});
  global.addEventListener("load",()=>{warmRunReports().catch(()=>{});},{once:true});
})(window);
