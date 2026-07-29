/* Converts the public Copa player model into small, bounded match behaviours. */
(function(root,factory){
  const api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;
  if(root)root.CopaPlayerRoleEffects=Object.freeze(api);
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  "use strict";
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,Number(value)||0));
  const mean=values=>values.length?values.reduce((sum,value)=>sum+value,0)/values.length:65;
  const score=(profile,key,fallback)=>clamp(profile&&profile[key]==null?fallback:profile&&profile[key],35,99);
  function profile(player){
    if(player&&player.gameplayProfile)return player.gameplayProfile;
    if(typeof globalThis.playerGameplayProfileSync==="function")return globalThis.playerGameplayProfileSync(player,globalThis.selectedCountry||"TR");
    return null;
  }
  function aggregate(players,style){
    const squad=(Array.isArray(players)?players:[]).filter(Boolean);
    const rows=squad.map(player=>{const p=profile(player),ov=clamp(player.ov==null?player.power:player.ov,35,99);return{
      impact:score(p,"copa_impact",ov),build:score(p,"copa_build_up",ov),space:score(p,"copa_space_control",ov),
      duels:score(p,"copa_duels",ov),engine:score(p,"copa_engine",ov),decisions:score(p,"copa_pressure_decision",ov),
      archetype:String(p&&p.archetype||"")
    };});
    const values=key=>mean(rows.map(row=>row[key]));
    const archetypes={};
    rows.forEach(row=>{if(row.archetype)archetypes[row.archetype]=(archetypes[row.archetype]||0)+1;});
    const attack=(values("impact")-65)/34,build=(values("build")-65)/34,space=(values("space")-65)/34;
    const duels=(values("duels")-65)/34,engine=(values("engine")-65)/34,decisions=(values("decisions")-65)/34;
    const styleKey=String(style||"");
    const styleFit=styleKey==="gegen"?engine*.45+decisions*.35+duels*.20:
      styleKey==="kontra"?engine*.40+decisions*.35+attack*.25:
      styleKey==="tiki"?build*.50+decisions*.35+space*.15:
      styleKey==="uzun"?duels*.45+attack*.35+space*.20:
      styleKey==="blok"?space*.45+duels*.35+decisions*.20:0;
    return{
      source:"player_roles",
      shotQuality:clamp(attack*.032+(archetypes.finisher||0)*.003,-.045,.065),
      passQuality:clamp(build*4.2+decisions*2.2,-5,7),
      defensivePressure:clamp(space*.028+duels*.022,-.045,.065),
      setPieceBias:clamp((duels+attack)*.11, -.14,.20),
      lateStamina:clamp(engine*.045,-.055,.065),
      pressResistance:clamp(decisions*.04+build*.02,-.055,.07),
      styleFit:clamp(styleFit*1.4,-1.5,1.8),
      archetypes
    };
  }
  return{aggregate};
});
