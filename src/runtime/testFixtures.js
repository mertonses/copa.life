/* URL-gated deterministic fixtures for local/Playwright visual QA. Never active in normal play. */
(function(root){
  const query=new URLSearchParams(root.location.search||"");
  const mode=query.get("testMode")||"";
  let injuryConsumed=false;
  function is(modeName){return mode===modeName;}
  function consumeInjury(players){
    if(!is("injury")||injuryConsumed)return null;
    const list=Array.isArray(players)?players:[];
    const target=list.find(player=>player&&!player.injured&&!player.suspended);
    if(!target)return null;
    injuryConsumed=true;
    target.injured=true;
    target.injuryLevel=2;
    if(typeof root.econStats==="object"&&root.econStats)root.econStats.injuries=(Number(root.econStats.injuries)||0)+1;
    if(typeof root.syncInjuredIdx==="function")root.syncInjuredIdx();
    return target;
  }
  root.CopaTestFixtures=Object.freeze({mode,is,consumeInjury});
})(window);
