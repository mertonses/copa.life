/* Normal cup rounds use the same deterministic model as the visual final.
   This adapter contains no DOM code so balance checks can exercise it directly. */
(function(root,factory){
  const api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;
  if(root)root.CopaNormalMatch=Object.freeze(api);
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  "use strict";

  const BEHAVIOUR_CARDS=new Set(["kanat_akini","kontra","sogukkanli_penaltici"]);
  const STYLE_TACTICS=Object.freeze({
    gegen:"push",
    kontra:"balanced",
    tiki:"calm",
    uzun:"more",
    blok:"hold"
  });

  function hashSeed(value){
    const text=String(value==null?"":value);
    let hash=0x811c9dc5;
    for(let index=0;index<text.length;index++){
      hash^=text.charCodeAt(index);
      hash=Math.imul(hash,0x01000193);
    }
    return(hash>>>0)||1;
  }

  function tacticForStyle(value){
    return STYLE_TACTICS[String(value||"")]||"balanced";
  }

  function cardIds(value){
    if(!Array.isArray(value))return[];
    return [...new Set(value.map(card=>String(card&&typeof card==="object"?(card.id||card.key||""):card||"")).filter(id=>BEHAVIOUR_CARDS.has(id)))];
  }

  function powerGapBand(homePower,awayPower){
    const gap=Number(homePower||0)-Number(awayPower||0);
    return gap<=-12?"away_12_plus":gap<=-4?"away_4_11":gap<=3?"even":gap<=11?"home_4_11":"home_12_plus";
  }

  function simulate(input){
    const data=input&&typeof input==="object"?input:{};
    const core=data.core;
    if(!core||typeof core.simulateMatch!=="function")throw new Error("shared_match_core_unavailable");
    const ghost=data.ghostProfile&&typeof data.ghostProfile==="object"?data.ghostProfile:null;
    const awayStyle=ghost&&ghost.tactics&&ghost.tactics.style||data.awayStyle||"";
    const awayCards=ghost&&(Array.isArray(ghost.cards)?ghost.cards:ghost.activeCards)||data.awayCards;
    const seed=hashSeed([
      data.runSeed||1,
      data.round||1,
      data.opponentId||data.opponentName||"opponent",
      Math.round(Number(data.homePower)||0),
      Math.round(Number(data.awayPower)||0)
    ].join("|"));
    return core.simulateMatch({
      resolution:"regulation",
      seed,
      homePower:data.homePower,
      awayPower:data.awayPower,
      tactic:tacticForStyle(data.style),
      awayTactic:tacticForStyle(awayStyle),
      cards:cardIds(data.cards),
      awayCards:cardIds(awayCards)
    });
  }

  return{BEHAVIOUR_CARDS,STYLE_TACTICS,hashSeed,tacticForStyle,cardIds,powerGapBand,simulate};
});
