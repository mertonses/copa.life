/* Shared, DOM-free penalty shootout rules for interactive play, AI matches and balance checks. */
(function(root,factory){
  const api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;
  if(root)root.CopaPenaltyCore=Object.freeze(api);
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  "use strict";

  const MODEL_VERSION="copa-penalty-core-v1";
  const DIRECTIONS=["L","C","R"];
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,Number(value)||0));
  const power=value=>clamp(value,45,98);

  class RNG{
    constructor(seed){this.state=((Number(seed)>>>0)^0x9e3779b9)>>>0||1;}
    next(){this.state^=this.state<<13;this.state^=this.state>>>17;this.state^=this.state<<5;this.state>>>=0;return this.state/4294967296;}
  }

  function shotResult(input,random){
    const data=input&&typeof input==="object"?input:{},shooterPower=power(data.shooterPower),keeperPower=power(data.keeperPower);
    const shotDir=DIRECTIONS.includes(data.shotDir)?data.shotDir:"C",keeperDir=DIRECTIONS.includes(data.keeperDir)?data.keeperDir:"C";
    const matched=shotDir===keeperDir;
    const missChance=clamp(0.075-(shooterPower-70)*0.002,0.025,0.14);
    const postChance=clamp(0.035-(shooterPower-75)*0.001,0.015,0.06);
    const saveChance=matched?clamp(0.48+(keeperPower-shooterPower)*0.006,0.28,0.68):clamp(0.1+(keeperPower-shooterPower)*0.003,0.04,0.22);
    const roll=clamp((typeof random==="function"?random():Math.random()),0,0.999999999);
    if(roll<missChance)return{goal:false,type:"miss",matched};
    if(roll<missChance+postChance)return{goal:false,type:"post",matched};
    if(roll<missChance+postChance+saveChance)return{goal:false,type:"save",matched};
    return{goal:true,type:"goal",matched};
  }

  function canCatch(leader,trail,leaderTaken,trailTaken){return leader-trail<=5-trailTaken;}
  function isDone(state){
    const homeTaken=state.homeShots.length,awayTaken=state.awayShots.length;
    if(homeTaken<5||awayTaken<5){
      if(state.homeGoals>state.awayGoals&&!canCatch(state.homeGoals,state.awayGoals,homeTaken,awayTaken))return true;
      if(state.awayGoals>state.homeGoals&&!canCatch(state.awayGoals,state.homeGoals,awayTaken,homeTaken))return true;
      return false;
    }
    return homeTaken===awayTaken&&state.homeGoals!==state.awayGoals;
  }

  function simulateShootout(input){
    const data=input&&typeof input==="object"?input:{},rng=data.random?null:new RNG(data.seed),random=typeof data.random==="function"?data.random:()=>rng.next();
    const homePower=power(data.homePower||75),awayPower=power(data.awayPower||75),state={homeGoals:0,awayGoals:0,homeShots:[],awayShots:[]};
    let guard=0;
    while(!isDone(state)&&guard<40){
      for(const side of ["home","away"]){
        if(isDone(state))break;
        const shooterPower=side==="home"?homePower:awayPower,keeperPower=side==="home"?awayPower:homePower;
        const shotDir=DIRECTIONS[Math.floor(random()*DIRECTIONS.length)],keeperDir=DIRECTIONS[Math.floor(random()*DIRECTIONS.length)];
        const result=shotResult({shooterPower,keeperPower,shotDir,keeperDir},random),entry={...result,shotDir,keeperDir};
        state[side+"Shots"].push(entry);if(result.goal)state[side+"Goals"]++;
      }
      guard++;
    }
    if(state.homeGoals===state.awayGoals){
      const homeWon=random()<0.5;state[homeWon?"homeGoals":"awayGoals"]++;
    }
    return{model_version:MODEL_VERSION,score:[state.homeGoals,state.awayGoals],winner:state.homeGoals>state.awayGoals?0:1,homeShots:state.homeShots,awayShots:state.awayShots};
  }

  return{MODEL_VERSION,DIRECTIONS:Object.freeze(DIRECTIONS.slice()),shotResult,canCatch,isDone,simulateShootout};
});
