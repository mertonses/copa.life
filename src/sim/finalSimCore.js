/* copa.life deterministic final simulation core.
   DOM-free by design: the browser playback, Monte Carlo calibration and replay
   tools all share this model. */
(function(root,factory){
  const api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;
  if(root)root.CopaFinalSimCore=Object.freeze(api);
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  "use strict";

  const MODEL_VERSION="copa-final-core-v2";
  const REPLAY_VERSION=2;
  const TACTICS=new Set(["balanced","more","push","calm","hold"]);
  const CARDS=new Set(["kanat_akini","kontra","sogukkanli_penaltici"]);
  const SEQUENCES=[
    "BUILD_FROM_BACK","GK_SHORT_START","CENTRAL_TRIANGLE","WIDE_LEFT","WIDE_RIGHT",
    "LONG_BALL","COUNTER","PRESS_RECOVERY","RECYCLE","LOW_TEMPO","SET_PIECE"
  ];

  const clamp=(value,min,max)=>Math.max(min,Math.min(max,Number(value)||0));
  const round=(value,digits=3)=>{
    const factor=10**digits;
    return Math.round((Number(value)||0)*factor)/factor;
  };
  const uint=value=>(Number(value)>>>0)||1;

  class RNG{
    constructor(seed){this.s=(uint(seed)^0x9e3779b9)>>>0||1;}
    next(){this.s^=this.s<<13;this.s^=this.s>>>17;this.s^=this.s<<5;this.s>>>=0;return this.s/4294967296;}
    rng(lo,hi){return lo+this.next()*(hi-lo);}
    int(n){return Math.floor(this.next()*Math.max(1,n));}
    bool(probability){return this.next()<clamp(probability,0,1);}
    pick(values){return values[this.int(values.length)];}
    getState(){return this.s>>>0;}
    setState(value){this.s=uint(value);return this;}
  }

  function weightedPick(items,rng){
    const total=items.reduce((sum,item)=>sum+Math.max(0,item.weight),0);
    if(total<=0)return items[0]?items[0].value:null;
    let roll=rng.next()*total;
    for(const item of items){
      roll-=Math.max(0,item.weight);
      if(roll<=0)return item.value;
    }
    return items[items.length-1].value;
  }

  function normalizeTactic(value){return TACTICS.has(String(value||""))?String(value):"balanced";}
  function normalizeCards(value){
    return Array.isArray(value)?[...new Set(value.map(String).filter(card=>CARDS.has(card)))]:[];
  }
  function normalizeTimeline(value){
    if(!Array.isArray(value))return[];
    return value.slice(0,16).map(item=>({
      minute:Math.round(clamp(item&&item.minute,0,120)),
      tactic:normalizeTactic(item&&item.tactic)
    })).sort((a,b)=>a.minute-b.minute);
  }
  function normalizeConfig(value){
    const input=value&&typeof value==="object"?value:{};
    return {
      model_version:MODEL_VERSION,
      seed:uint(input.seed),
      homePower:round(clamp(input.homePower,35,115),2),
      awayPower:round(clamp(input.awayPower,35,115),2),
      tactic:normalizeTactic(input.tactic),
      awayTactic:normalizeTactic(input.awayTactic),
      cards:normalizeCards(input.cards),
      awayCards:normalizeCards(input.awayCards),
      teamTalk:round(clamp(input.teamTalk,-6,6),2),
      awayTeamTalk:round(clamp(input.awayTeamTalk,-6,6),2),
      decisions:normalizeTimeline(input.decisions),
      awayDecisions:normalizeTimeline(input.awayDecisions)
    };
  }

  function tacticAt(base,timeline,minute){
    let tactic=base;
    for(const decision of timeline){
      if(decision.minute>minute)break;
      tactic=decision.tactic;
    }
    return tactic;
  }

  function chooseSequence(input,rng){
    const data=input&&typeof input==="object"?input:{};
    const minute=clamp(data.minute,0,120);
    const tactic=normalizeTactic(data.tactic||data.shout);
    const hasWingCard=!!data.hasWingCard;
    const hasCounterCard=!!data.hasCounterCard;
    const ownHalf=!!data.ownHalf;
    const finalThird=!!data.finalThird;
    const midThird=!ownHalf&&!finalThird;
    const finalEarly=!!data.isFinal&&minute<15;
    const late=minute>70;
    const golden=!!data.goldenActive;
    const canWide=data.canWide!==false;
    const wideUsage=clamp(data.wideUsage,0,1);
    const wideNeed=wideUsage<0.34&&minute>12;
    const wideRunNeed=!!data.wideRunNeed&&minute>18;
    const profilePass=clamp(data.profilePass||65,35,99);
    const wideBase=hasWingCard?0.60:0.46;
    const weights=[
      {value:"BUILD_FROM_BACK",weight:(ownHalf?16:4)+(data.carrierRole==="GK"?18:0)+(finalEarly?8:0)+(tactic==="calm"?8:0)},
      {value:"GK_SHORT_START",weight:data.carrierRole==="GK"?34+(tactic==="calm"?10:0):0},
      {value:"CENTRAL_TRIANGLE",weight:18+(midThird?9:0)+(profilePass>70?6:0)+(finalEarly?5:0)},
      {value:"WIDE_LEFT",weight:canWide?Math.round(wideBase*34)+(data.leftReady?6:0)+(wideNeed?18:0)+(wideRunNeed?10:0)+(finalThird?7:0)+(tactic==="more"?5:0):0},
      {value:"WIDE_RIGHT",weight:canWide?Math.round(wideBase*34)+(data.rightReady?6:0)+(wideNeed?18:0)+(wideRunNeed?10:0)+(finalThird?7:0)+(tactic==="more"?5:0):0},
      {value:"LONG_BALL",weight:(ownHalf?9:4)+(data.losing?8:0)+(late?7:0)+(tactic==="hold"?10:0)},
      {value:"COUNTER",weight:(hasCounterCard?14:7)+(tactic==="push"?8:0)+(golden?8:0)},
      {value:"PRESS_RECOVERY",weight:tactic==="push"?18:5},
      {value:"RECYCLE",weight:12+(tactic==="hold"?10:0)+(tactic==="calm"?8:0)+(finalEarly?6:0)},
      {value:"LOW_TEMPO",weight:(tactic==="calm"?18:6)+(finalEarly?12:0)+(data.leading?8:0)},
      {value:"SET_PIECE",weight:late||golden?5:2}
    ];
    let type=weightedPick(weights,rng)||"CENTRAL_TRIANGLE";
    if(data.forceLeft&&rng.bool(0.65))type="WIDE_LEFT";
    if(data.forceRight&&rng.bool(0.65))type="WIDE_RIGHT";
    return type;
  }

  function expectedGoalsForShot(input){
    const data=input&&typeof input==="object"?input:{};
    const distance=clamp(data.distance==null?21:data.distance,2,45);
    const centrality=clamp(data.centrality==null?0.65:data.centrality,0,1);
    const shooting=clamp(data.shooting==null?65:data.shooting,25,110);
    const decisions=clamp(data.decisions==null?65:data.decisions,25,110);
    const powerGap=clamp(data.powerGap||0,-45,45);
    const delivery=String(data.delivery||data.sequence||"");
    let xg=0.020+Math.max(0,0.17-distance*0.0055)+centrality*0.050;
    xg+=(shooting-60)*0.0011+(decisions-60)*0.0005+powerGap*0.0005;
    if(data.inBox)xg+=0.045;
    if(delivery==="CUTBACK")xg+=0.080;
    else if(delivery==="CROSS")xg+=0.025;
    else if(delivery==="COUNTER"||delivery==="PRESS_RECOVERY")xg+=0.035;
    else if(delivery==="THROUGH_BALL"||delivery==="LONG_BALL")xg+=0.020;
    xg-=clamp(data.nearbyDefenders,0,6)*0.016;
    return clamp(xg,0.025,0.52);
  }

  function resolveShot(input,rng){
    const data=input&&typeof input==="object"?input:{};
    const shooting=clamp(data.shooting==null?65:data.shooting,20,110);
    const decisions=clamp(data.decisions==null?65:data.decisions,20,110);
    const vision=clamp(data.vision==null?65:data.vision,20,110);
    const keeper=clamp(data.goalkeeping==null?65:data.goalkeeping,20,110);
    const anticipation=clamp(data.keeperAnticipation==null?keeper:data.keeperAnticipation,20,110);
    const distance=clamp(data.distance==null?22:data.distance,2,50);
    const shotQuality=(shooting*0.50+decisions*0.30+vision*0.20)/100;
    const keeperQuality=(keeper*0.72+anticipation*0.28)/100;
    const xg=Number.isFinite(Number(data.expectedGoals))
      ?clamp(data.expectedGoals,0.02,0.60)
      :expectedGoalsForShot({...data,shooting,decisions,distance});
    const formSwing=(rng.next()-0.5)*0.045;
    const goalProbability=clamp(xg*(1+(0.65-keeperQuality)*0.52)+formSwing,0.018,0.56);
    const onTarget=clamp(0.42+shotQuality*0.24+Math.max(0,1-distance/34)*0.10,0.43,0.80);
    const postProbability=clamp(0.035+xg*0.035,0.025,0.060);
    const roll=rng.next();
    if(roll<goalProbability)return"GOAL";
    if(roll<goalProbability+postProbability)return"POST";
    if(roll<onTarget){
      return rng.bool(clamp(0.22+(keeperQuality-0.55)*0.35,0.14,0.42))?"KEEPER_CLAIM":"KEEPER_SAVE";
    }
    return"WIDE";
  }

  function passProbabilities(input){
    const data=input&&typeof input==="object"?input:{};
    const passing=clamp(data.passing==null?65:data.passing,20,110);
    const vision=clamp(data.vision==null?passing:data.vision,20,110);
    const decisions=clamp(data.decisions==null?passing:data.decisions,20,110);
    const anticipation=clamp(data.anticipation==null?passing:data.anticipation,20,110);
    const opponentPress=clamp(data.opponentPress==null?65:data.opponentPress,20,110);
    const distance=clamp(data.distance==null?16:data.distance,2,55);
    const kind=String(data.kind||data.sequence||"SHORT_PASS");
    const quality=(passing*0.40+vision*0.25+decisions*0.20+anticipation*0.15)/100;
    const pressure=(opponentPress-60)/100;
    const kindRisk=kind==="THROUGH_BALL"?0.075:kind==="LONG_PASS"||kind==="LONG_BALL"?0.095:
      kind==="CROSS"?0.065:kind==="BACK_PASS"?-0.035:0;
    const distanceRisk=Math.max(0,distance-12)*0.0032;
    const interception=clamp(0.055+pressure*0.12+kindRisk+distanceRisk-(quality-0.60)*0.18,0.025,0.29);
    const loose=clamp(0.025+kindRisk*0.28+distanceRisk*0.34-(quality-0.60)*0.055,0.012,0.095);
    const success=clamp(1-interception-loose,0.64,0.96);
    const errorRadius=clamp((1-quality)*5.2+distanceRisk*9+(kind==="THROUGH_BALL"?0.6:0),0.35,4.8);
    return{success:round(success),interception:round(interception),loose:round(loose),errorRadius:round(errorRadius,2)};
  }

  function resolvePass(input,rng){
    const probabilities=passProbabilities(input);
    const roll=rng.next();
    const outcome=roll<probabilities.success?"SUCCESS":
      roll<probabilities.success+probabilities.interception?"INTERCEPTION":"LOOSE";
    return{outcome,...probabilities};
  }

  function disciplineProbabilities(input){
    const data=input&&typeof input==="object"?input:{};
    const tactic=normalizeTactic(data.tactic);
    const visual=data.phase==="visual";
    const cardRisk=clamp(data.cardRisk||0,-0.08,0.20);
    const minute=clamp(data.minute||0,0,120);
    const tacticRisk=tactic==="push"?0.012:tactic==="more"?0.005:tactic==="calm"?-0.008:tactic==="hold"?-0.004:0;
    const lateRisk=minute>75?0.006:minute>45?0.002:0;
    const base=visual?0.011:0.036;
    const yellow=clamp(base+tacticRisk+cardRisk*0.12+lateRisk,visual?0.008:0.018,visual?0.022:0.082);
    const directRed=clamp(0.0015+Math.max(0,cardRisk)*0.012+(tactic==="push"?0.0015:0),0.001,0.007);
    const secondYellow=clamp(0.018+lateRisk*1.8+(tactic==="push"?0.010:0),0.012,0.055);
    return{yellow:round(yellow,5),directRed:round(directRed,5),secondYellow:round(secondYellow,5)};
  }

  function resolveDiscipline(input,rng){
    const probabilities=disciplineProbabilities(input);
    const roll=rng.next();
    if(roll>=probabilities.yellow)return{outcome:"NONE",...probabilities};
    if(rng.bool(probabilities.directRed))return{outcome:"RED",...probabilities};
    if(input&&input.alreadyBooked&&rng.bool(probabilities.secondYellow))return{outcome:"SECOND_YELLOW",...probabilities};
    return{outcome:"YELLOW",...probabilities};
  }

  function tacticEffects(tactic){
    switch(normalizeTactic(tactic)){
      case"more":return{attack:0.10,shot:0.065,xg:0.030,defence:-0.075,tempo:0.12,card:0.008,possession:0.015};
      case"push":return{attack:0.075,shot:0.035,xg:0.020,defence:-0.025,tempo:0.10,card:0.022,possession:0.045,press:0.12};
      case"calm":return{attack:-0.035,shot:-0.040,xg:-0.010,defence:0.045,tempo:-0.10,card:-0.012,possession:0.060};
      case"hold":return{attack:-0.095,shot:-0.075,xg:-0.020,defence:0.095,tempo:-0.12,card:-0.008,possession:-0.015};
      default:return{attack:0,shot:0,xg:0,defence:0,tempo:0,card:0,possession:0,press:0};
    }
  }

  function makeAudit(){
    const sequenceCounts={};
    for(const key of SEQUENCES)sequenceCounts[key]=0;
    return{
      sequenceCounts,wide:0,central:0,recycle:0,longBall:0,counter:0,setPieces:0,
      shots:0,goals:0,pressWins:0,discipline:0,passes:0,interceptions:0,plannedSequences:0
    };
  }

  function simulateMatch(rawConfig){
    const config=normalizeConfig(rawConfig);
    const rng=new RNG(config.seed);
    const score=[0,0];
    const regulationScore=[0,0];
    const stats={
      shots:[0,0],saves:[0,0],blocked:[0,0],corners:[0,0],yellow:[0,0],red:[0,0],
      xg:[0,0],possession:[0,0],pressWins:[0,0]
    };
    const audit=makeAudit();
    const events=[];
    const cards=[config.cards,config.awayCards];
    const timelines=[config.decisions,config.awayDecisions];
    const baseTactics=[config.tactic,config.awayTactic];
    const powers=[config.homePower+config.teamTalk,config.awayPower+config.awayTeamTalk];
    const yellowed=[0,0];
    const stoppage=2+rng.int(4);
    const regulationEnd=90+stoppage;
    let minute=0,extraTime=false,penalties=false,goldenGoal=false,winner=null;

    function sequenceBucket(type){
      audit.sequenceCounts[type]=(audit.sequenceCounts[type]||0)+1;
      audit.plannedSequences++;
      if(type==="WIDE_LEFT"||type==="WIDE_RIGHT")audit.wide++;
      else if(type==="BUILD_FROM_BACK"||type==="GK_SHORT_START"||type==="CENTRAL_TRIANGLE")audit.central++;
      else if(type==="RECYCLE"||type==="LOW_TEMPO")audit.recycle++;
      else if(type==="LONG_BALL")audit.longBall++;
      else if(type==="COUNTER"||type==="PRESS_RECOVERY")audit.counter++;
      else if(type==="SET_PIECE")audit.setPieces++;
    }

    function applyDiscipline(side,tactic,cardRisk){
      const resolution=resolveDiscipline({
        tactic,cardRisk,minute,alreadyBooked:yellowed[side]>0,phase:"core"
      },rng);
      if(resolution.outcome==="NONE")return false;
      audit.discipline++;
      if(resolution.outcome==="RED"){
        stats.red[side]++;
        powers[side]-=4.5;
        events.push({minute:Math.floor(minute),type:"red",side});
        return true;
      }
      stats.yellow[side]++;yellowed[side]++;
      events.push({minute:Math.floor(minute),type:"yellow",side});
      if(resolution.outcome==="SECOND_YELLOW"&&stats.red[0]+stats.red[1]<3){
        stats.red[side]++;
        powers[side]-=4.5;
        events.push({minute:Math.floor(minute),type:"red",side});
      }
      return true;
    }

    function playPeriod(endMinute,isGolden){
      while(minute<endMinute&&winner==null){
        const homeTactic=tacticAt(baseTactics[0],timelines[0],minute);
        const awayTactic=tacticAt(baseTactics[1],timelines[1],minute);
        const effects=[tacticEffects(homeTactic),tacticEffects(awayTactic)];
        const pace=1+(effects[0].tempo+effects[1].tempo)*0.28;
        minute+=rng.rng(1.45,3.35)/clamp(pace,0.80,1.22);
        if(minute>endMinute)break;
        const gap=powers[0]-powers[1];
        const scoreContext=score[0]===score[1]?0:(score[0]<score[1]?0.06:-0.045);
        const possessionLogit=gap/55+effects[0].possession-effects[1].possession+scoreContext;
        const homePossession=1/(1+Math.exp(-possessionLogit));
        const side=rng.bool(clamp(homePossession,0.23,0.77))?0:1;
        const other=1-side;
        stats.possession[side]++;
        const tactic=side===0?homeTactic:awayTactic;
        const ownEffect=effects[side],oppEffect=effects[other];
        const ownCards=cards[side];
        const totalSequences=Math.max(1,audit.plannedSequences);
        const sequence=chooseSequence({
          minute,tactic,isFinal:true,goldenActive:isGolden,
          ownHalf:rng.bool(0.31),finalThird:rng.bool(0.36),
          profilePass:powers[side],canWide:true,leftReady:true,rightReady:true,
          wideUsage:audit.wide/totalSequences,wideRunNeed:audit.wide>0&&audit.wide<4,
          hasWingCard:ownCards.includes("kanat_akini"),
          hasCounterCard:ownCards.includes("kontra"),
          losing:score[side]<score[other],leading:score[side]>score[other],
          carrierRole:rng.bool(0.08)?"GK":"CM"
        },rng);
        sequenceBucket(sequence);

        if(sequence==="PRESS_RECOVERY"||tactic==="push"){
          const pressChance=0.12+(ownEffect.press||0)+(powers[side]-powers[other])*0.0015;
          if(rng.bool(clamp(pressChance,0.04,0.34))){stats.pressWins[side]++;audit.pressWins++;}
        }
        if(sequence==="SET_PIECE"||rng.bool(0.060)){stats.corners[side]++;}

        if(sequence!=="SET_PIECE"){
          const passKind=sequence==="LONG_BALL"?"LONG_PASS":
            sequence==="WIDE_LEFT"||sequence==="WIDE_RIGHT"?"CROSS":
            sequence==="COUNTER"||sequence==="PRESS_RECOVERY"?"THROUGH_BALL":
            sequence==="RECYCLE"||sequence==="LOW_TEMPO"?"BACK_PASS":"SHORT_PASS";
          const pass=resolvePass({
            passing:powers[side],vision:powers[side],decisions:powers[side],
            anticipation:powers[side],opponentPress:powers[other]+(oppEffect.press||0)*100,
            distance:passKind==="LONG_PASS"?30:passKind==="CROSS"?22:passKind==="THROUGH_BALL"?24:13,
            kind:passKind
          },rng);
          audit.passes++;
          if(pass.outcome!=="SUCCESS"){
            if(pass.outcome==="INTERCEPTION"){
              audit.interceptions++;
              stats.pressWins[other]++;
              audit.pressWins++;
            }
            applyDiscipline(side,tactic,ownEffect.card);
            continue;
          }
        }

        const attackEdge=(powers[side]-powers[other])/300;
        let shotChance=0.43+attackEdge+ownEffect.attack+ownEffect.shot-oppEffect.defence;
        if(sequence==="COUNTER"||sequence==="PRESS_RECOVERY")shotChance+=0.055;
        if(sequence==="RECYCLE"||sequence==="LOW_TEMPO")shotChance-=0.085;
        if(sequence==="SET_PIECE")shotChance+=0.035;
        if(!rng.bool(clamp(shotChance,0.18,0.72))){
          applyDiscipline(side,tactic,ownEffect.card);
          continue;
        }

        const delivery=sequence==="WIDE_LEFT"||sequence==="WIDE_RIGHT"
          ?(rng.bool(0.48)?"CUTBACK":"CROSS"):sequence;
        const distance=delivery==="CUTBACK"?rng.rng(8,16):delivery==="CROSS"?rng.rng(9,22):rng.rng(11,30);
        const inBox=distance<18;
        const xg=clamp(expectedGoalsForShot({
          distance,centrality:rng.rng(0.35,1),shooting:powers[side]+ownEffect.xg*100,
          decisions:powers[side],powerGap:powers[side]-powers[other],delivery,inBox,
          nearbyDefenders:rng.int(4)
        })+ownEffect.xg-oppEffect.defence*0.055,0.02,0.58);
        stats.shots[side]++;stats.xg[side]+=xg;audit.shots++;
        const result=resolveShot({
          expectedGoals:xg,distance,shooting:powers[side],decisions:powers[side],
          vision:powers[side],goalkeeping:powers[other]+3,keeperAnticipation:powers[other]
        },rng);
        if(result==="GOAL"){
          score[side]++;audit.goals++;
          events.push({minute:Math.floor(minute),type:"goal",side,xg:round(xg),sequence});
          if(isGolden){goldenGoal=true;winner=side;break;}
        }else if(result==="KEEPER_SAVE"||result==="KEEPER_CLAIM"){
          stats.saves[other]++;
        }else if(result==="POST"){
          stats.blocked[other]++;
        }

        applyDiscipline(side,tactic,ownEffect.card+(isGolden?0.01:0));
      }
    }

    playPeriod(regulationEnd,false);
    regulationScore[0]=score[0];regulationScore[1]=score[1];
    if(score[0]!==score[1])winner=score[0]>score[1]?0:1;
    else{
      extraTime=true;
      playPeriod(regulationEnd+30,true);
      if(winner==null&&score[0]!==score[1])winner=score[0]>score[1]?0:1;
      if(winner==null){
        penalties=true;
        const penScore=[0,0],penProb=[
          clamp(0.72+(powers[0]-powers[1])*0.002+(cards[0].includes("sogukkanli_penaltici")?0.055:0),0.58,0.87),
          clamp(0.72+(powers[1]-powers[0])*0.002+(cards[1].includes("sogukkanli_penaltici")?0.055:0),0.58,0.87)
        ];
        for(let index=0;index<5;index++){if(rng.bool(penProb[0]))penScore[0]++;if(rng.bool(penProb[1]))penScore[1]++;}
        let guard=0;
        while(penScore[0]===penScore[1]&&guard<16){
          const home=rng.bool(penProb[0]),away=rng.bool(penProb[1]);
          if(home)penScore[0]++;if(away)penScore[1]++;guard++;
        }
        if(penScore[0]===penScore[1])penScore[rng.bool(0.5)?0:1]++;
        winner=penScore[0]>penScore[1]?0:1;
        events.push({minute:120,type:"penalties",side:winner,score:penScore});
      }
    }

    const possessionTotal=Math.max(1,stats.possession[0]+stats.possession[1]);
    stats.possession=[round(stats.possession[0]/possessionTotal*100,1),round(stats.possession[1]/possessionTotal*100,1)];
    stats.xg=stats.xg.map(value=>round(value));
    const result={
      model_version:MODEL_VERSION,config,score,regulationScore,winner,
      outcome:winner===0?"home":"away",extraTime,penalties,goldenGoal,
      fullTimeMinute:Math.min(120,Math.floor(minute)),stoppage,stats,audit,events,
      rngState:rng.getState()
    };
    result.replayCode=createReplayCode(config);
    return result;
  }

  function fnv1a(text){
    let hash=0x811c9dc5;
    for(let index=0;index<text.length;index++){
      hash^=text.charCodeAt(index);
      hash=Math.imul(hash,0x01000193);
    }
    return(hash>>>0).toString(36).padStart(7,"0");
  }
  function encodeBase64Url(text){
    if(typeof Buffer!=="undefined")return Buffer.from(text,"utf8").toString("base64url");
    const binary=unescape(encodeURIComponent(text));
    return btoa(binary).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
  }
  function decodeBase64Url(text){
    if(typeof Buffer!=="undefined")return Buffer.from(text,"base64url").toString("utf8");
    const padded=String(text).replace(/-/g,"+").replace(/_/g,"/").padEnd(Math.ceil(text.length/4)*4,"=");
    return decodeURIComponent(escape(atob(padded)));
  }
  function replayPayload(rawConfig){
    const config=normalizeConfig(rawConfig);
    return{
      v:REPLAY_VERSION,m:MODEL_VERSION,s:config.seed,h:config.homePower,a:config.awayPower,
      t:config.tactic,at:config.awayTactic,c:config.cards,ac:config.awayCards,
      tt:config.teamTalk,att:config.awayTeamTalk,d:config.decisions,ad:config.awayDecisions
    };
  }
  function createReplayCode(rawConfig){
    const json=JSON.stringify(replayPayload(rawConfig));
    return`CFS${REPLAY_VERSION}.${encodeBase64Url(json)}.${fnv1a(json)}`;
  }
  function parseReplayCode(value){
    try{
      const match=String(value||"").trim().match(/^CFS(\d+)\.([A-Za-z0-9_-]{10,2048})\.([a-z0-9]{7})$/);
      if(!match||Number(match[1])!==REPLAY_VERSION)return null;
      const json=decodeBase64Url(match[2]);
      if(fnv1a(json)!==match[3])return null;
      const payload=JSON.parse(json);
      if(!payload||payload.v!==REPLAY_VERSION||payload.m!==MODEL_VERSION)return null;
      return normalizeConfig({
        seed:payload.s,homePower:payload.h,awayPower:payload.a,tactic:payload.t,
        awayTactic:payload.at,cards:payload.c,awayCards:payload.ac,teamTalk:payload.tt,
        awayTeamTalk:payload.att,decisions:payload.d,awayDecisions:payload.ad
      });
    }catch(_){return null;}
  }
  function replay(value){
    const config=parseReplayCode(value);
    return config?simulateMatch(config):null;
  }

  return{
    MODEL_VERSION,REPLAY_VERSION,RNG,SEQUENCES:Object.freeze(SEQUENCES.slice()),
    normalizeConfig,chooseSequence,expectedGoalsForShot,resolveShot,
    passProbabilities,resolvePass,disciplineProbabilities,resolveDiscipline,simulateMatch,
    createReplayCode,parseReplayCode,replay
  };
});
