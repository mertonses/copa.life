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
  function mergePlan(){
    const output={shotQuality:0,passQuality:0,defensivePressure:0,setPieceBias:0,lateStamina:0,pressResistance:0,opening:0,styleFit:0};
    for(const source of arguments){
      if(!source||typeof source!=="object")continue;
      for(const key of Object.keys(output))output[key]+=Number(source[key])||0;
    }
    return output;
  }
  function preparationPlan(value){
    const prep=value&&typeof value==="object"?value:{};
    return{
      shotQuality:(Number(prep.attack)||0)*.018,
      passQuality:(Number(prep.chemistry)||0)*1.1+(prep.analysis?1:0),
      defensivePressure:(Number(prep.defence)||0)*.018,
      setPieceBias:(Number(prep.setpiece)||0)*.14,
      lateStamina:Math.max(0,-(Number(prep.fatigueDelta)||0))*.003,
      pressResistance:(Number(prep.chemistry)||0)*.008
    };
  }
  function talkPlan(value){
    const talk=value&&typeof value==="object"?value:{},delta=Number(talk.delta)||0,target=String(talk.target||"all");
    const output={opening:(Number(talk.first20)||0)*.015,passQuality:(Number(talk.focus)||0)*.35,lateStamina:-(Number(talk.pressure)||0)*.006};
    if(target==="attack")output.shotQuality=delta*.012;
    else if(target==="defence")output.defensivePressure=delta*.012;
    else if(target==="star"){output.shotQuality=delta*.009;output.passQuality+=delta*.25;}
    else if(target==="youth"){output.pressResistance=delta*.012;output.lateStamina+=delta*.005;}
    else{output.shotQuality=delta*.006;output.defensivePressure=delta*.006;}
    return output;
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
    const variance=Math.max(.85,Math.min(1.15,Number(data.homeVariance)||1));
    const varianceUnit=((hashSeed(`${seed}|chemistry-variance`)%10001)/10000)-.5;
    const varianceAdjustment=varianceUnit*10*(variance-1);
    const talk=data.talk&&typeof data.talk==="object"?data.talk:{};
    const preparation=data.preparation&&typeof data.preparation==="object"?data.preparation:{};
    const preparedOpponent=Math.max(35,(Number(data.awayPower)||0)+(Number(preparation.opponent)||0));
    const homePlan=mergePlan(data.roleProfile,preparationPlan(preparation),talkPlan(talk),data.plan);
    const awayPlan=mergePlan(data.awayRoleProfile,data.awayPlan);
    let homeTactic=tacticForStyle(data.style);
    if(Number(talk.tempo)>=2)homeTactic="push";
    else if(Number(talk.tempo)<=-1)homeTactic="calm";
    return core.simulateMatch({
      resolution:"regulation",
      seed,
      homePower:(Number(data.homePower)||0)+varianceAdjustment,
      awayPower:preparedOpponent,
      tactic:homeTactic,
      awayTactic:tacticForStyle(awayStyle),
      cards:cardIds(data.cards),
      awayCards:cardIds(awayCards),
      plan:homePlan,
      awayPlan
    });
  }

  return{BEHAVIOUR_CARDS,STYLE_TACTICS,hashSeed,tacticForStyle,cardIds,powerGapBand,mergePlan,preparationPlan,talkPlan,simulate};
});
