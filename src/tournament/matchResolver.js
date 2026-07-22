/* One tournament match contract shared by the browser runtime and balance tools. */
(function(root,factory){
  const api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;
  if(root)root.CopaTournamentMatchResolver=Object.freeze(api);
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  "use strict";

  function resolveMatch(input){
    const data=input&&typeof input==="object"?input:{},state=data.state,match=data.match,core=data.core,normal=data.normal,penalty=data.penalty;
    if(!state||!match||!core||!normal)throw new Error("Tournament match resolver dependencies are missing");
    const home=state.teams[match.homeId],away=state.teams[match.awayId],isFinal=match.stage==="knockout"&&match.round==="final";
    const result=core.simulateMatch({
      resolution:match.stage==="group"?"regulation":isFinal?"knockout":"regulation",
      seed:data.seed,homePower:home.power,awayPower:away.power,
      tactic:normal.tacticForStyle(home.style),awayTactic:normal.tacticForStyle(away.style)
    });
    let winner=result.winner,decidedBy=result.extraTime?"extra_time":"regulation",penaltyScore=null;
    if(match.stage==="knockout"&&!isFinal&&result.regulationScore[0]===result.regulationScore[1]){
      if(!penalty||typeof penalty.simulateShootout!=="function")throw new Error("Shared penalty core is unavailable");
      const shootout=penalty.simulateShootout({seed:(Number(data.seed)>>>0)^0xa511e9b3,homePower:home.power,awayPower:away.power});
      winner=shootout.winner;penaltyScore=shootout.score;decidedBy="penalties";
    }else if(result.penalties){decidedBy="penalties";const event=result.events.find(item=>item.type==="penalties");penaltyScore=event&&event.score||null;}
    return{
      score:(match.stage==="knockout"&&!isFinal?result.regulationScore:result.score).slice(),
      winnerId:winner===0?home.id:winner===1?away.id:null,
      decidedBy,penaltyScore,
      extraTime:!!result.extraTime,regulationScore:result.regulationScore.slice(),
      fairPlay:{home:-(result.stats.yellow[0]+result.stats.red[0]*3),away:-(result.stats.yellow[1]+result.stats.red[1]*3)}
    };
  }

  return{resolveMatch};
});
