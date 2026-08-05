/* Deterministic Yan Saha markets, quotes and settlement. DOM and economy agnostic. */
(function(root,factory){
  const api=factory();
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
  if(root)root.CopaSideFieldEngine=api;
})(typeof window!=="undefined"?window:globalThis,function(){
  "use strict";
  const VERSION=2,ODDS_VERSION="yan-saha-v2",INSIGHT_VERSION="form-v1",MARGIN=1.10,MAX_TICKETS=3,MAX_ROUND_STAKE=4,MAX_PAYOUT=12,CASH_FLOOR=-10;
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
  const round2=value=>Math.round(Number(value)*100)/100;
  const isObject=value=>!!value&&typeof value==="object"&&!Array.isArray(value);
  function createState(){return{version:VERSION,oddsVersion:ODDS_VERSION,insightVersion:INSIGHT_VERSION,markets:{},tickets:[],ledger:[],nextTicketId:1};}
  function normalizeState(value){
    if(!isObject(value)||![1,VERSION].includes(Number(value.version)))return createState();
    const state=createState();
    state.markets=isObject(value.markets)?value.markets:{};
    state.tickets=Array.isArray(value.tickets)?value.tickets.filter(item=>isObject(item)).slice(-80):[];
    state.ledger=Array.isArray(value.ledger)?value.ledger.filter(item=>isObject(item)).slice(-160):[];
    state.nextTicketId=Math.max(1,Math.floor(Number(value.nextTicketId)||1));
    return state;
  }
  function validate(value){
    const errors=[];
    if(!isObject(value)||Number(value.version)!==VERSION)return{ok:false,errors:["invalid_version"]};
    if(value.oddsVersion!==ODDS_VERSION||value.insightVersion!==INSIGHT_VERSION)errors.push("invalid_model_version");
    if(!isObject(value.markets))errors.push("invalid_markets");
    if(!Array.isArray(value.tickets)||value.tickets.length>80)errors.push("invalid_tickets");
    if(!Array.isArray(value.ledger)||value.ledger.length>160)errors.push("invalid_ledger");
    const marketEntries=isObject(value.markets)?Object.entries(value.markets):[];
    if(marketEntries.length>8)errors.push("invalid_market_count");
    for(const [key,market] of marketEntries){
      if(!isObject(market)||market.key!==key||!["group","knockout"].includes(market.stage)||!["open","locked","settled"].includes(market.status)||!Number.isInteger(market.riskLimit)||market.riskLimit<0||market.riskLimit>MAX_ROUND_STAKE||!Array.isArray(market.quotes)||market.quotes.length>15){errors.push("invalid_market");continue;}
      const seenMatches=new Set();
      for(const quote of market.quotes){
        const picks=market.stage==="group"?["H","D","A"]:["H","A"];
        if(!isObject(quote)||typeof quote.matchId!=="string"||seenMatches.has(quote.matchId)||typeof quote.homeName!=="string"||typeof quote.awayName!=="string"||quote.homeName.length>90||quote.awayName.length>90||!isObject(quote.odds)||picks.some(pick=>!Number.isFinite(Number(quote.odds[pick]))||Number(quote.odds[pick])<1.15||Number(quote.odds[pick])>7.5))errors.push("invalid_quote");
        if(quote&&typeof quote.matchId==="string")seenMatches.add(quote.matchId);
      }
    }
    for(const ticket of Array.isArray(value.tickets)?value.tickets:[]){
      if(!ticket||typeof ticket.id!=="string"||typeof ticket.marketKey!=="string"||typeof ticket.matchId!=="string")errors.push("invalid_ticket_identity");
      if(!["H","D","A"].includes(ticket.pick)||!["open","locked","won","lost"].includes(ticket.status))errors.push("invalid_ticket_status");
      if(!Number.isInteger(ticket.stake)||ticket.stake<1||ticket.stake>MAX_ROUND_STAKE||!Number.isFinite(ticket.odds)||ticket.odds<1.01||!Number.isInteger(ticket.potentialPayout)||ticket.potentialPayout<ticket.stake||ticket.potentialPayout>MAX_PAYOUT)errors.push("invalid_ticket_value");
      if(isObject(value.markets)&&!value.markets[ticket.marketKey])errors.push("orphan_ticket");
    }
    for(const entry of Array.isArray(value.ledger)?value.ledger:[])if(!entry||typeof entry.id!=="string"||!["stake","payout"].includes(entry.type)||!Number.isFinite(Number(entry.amount))||Math.abs(Number(entry.amount))>MAX_PAYOUT)errors.push("invalid_ledger_entry");
    return{ok:errors.length===0,errors:[...new Set(errors)]};
  }
  function stageInfo(tournament){
    if(!tournament||tournament.format!=="groups32_v2")return null;
    if(tournament.phase==="group")return{stage:"group",round:"group",matchday:Number(tournament.group&&tournament.group.matchday)||1,key:`group-${Number(tournament.group&&tournament.group.matchday)||1}`};
    if(tournament.phase==="knockout")return{stage:"knockout",round:tournament.knockout&&tournament.knockout.round||"",matchday:0,key:`knockout-${tournament.knockout&&tournament.knockout.round||"unknown"}`};
    return null;
  }
  function matchesFor(tournament,info){
    if(!info||!tournament||!isObject(tournament.matches))return[];
    return Object.values(tournament.matches).filter(match=>match&&match.homeId!=="player"&&match.awayId!=="player"&&(
      info.stage==="group"?match.stage==="group"&&Number(match.matchday)===info.matchday:match.stage==="knockout"&&match.round===info.round
    )).sort((a,b)=>String(a.id).localeCompare(String(b.id)));
  }
  function fairProbabilities(homePower,awayPower,stage){
    const gap=clamp((Number(homePower)||65)-(Number(awayPower)||65)+2,-45,45);
    if(stage==="group"){
      const draw=clamp(.285-Math.abs(gap)*.0045,.135,.285);
      const homeShare=1/(1+Math.exp(-gap/13.5));
      return{H:(1-draw)*homeShare,D:draw,A:(1-draw)*(1-homeShare)};
    }
    const home=1/(1+Math.exp(-gap/15.5));
    return{H:home,D:0,A:1-home};
  }
  function recentForm(tournament,teamId,beforeMatchday){
    const matches=Object.values(tournament&&tournament.matches||{}).filter(match=>match&&match.status==="played"&&(match.homeId===teamId||match.awayId===teamId)&&(beforeMatchday==null||Number(match.matchday)<Number(beforeMatchday))).sort((a,b)=>String(a.id).localeCompare(String(b.id))).slice(-3);
    let points=0,goals=0,against=0;
    for(const match of matches){const home=match.homeId===teamId,score=Array.isArray(match.score)?match.score:[0,0],gf=Number(score[home?0:1])||0,ga=Number(score[home?1:0])||0;goals+=gf;against+=ga;points+=gf>ga?3:gf===ga?1:0;}
    return{played:matches.length,points,goalDifference:goals-against};
  }
  function publicInsight(tournament,match,info,home,away,fair){
    const gap=Math.round((Number(home.power)||65)-(Number(away.power)||65)),homeForm=recentForm(tournament,match.homeId,info.matchday||null),awayForm=recentForm(tournament,match.awayId,info.matchday||null);
    const ranked=Object.entries(fair).filter(([,value])=>value>0).sort((a,b)=>b[1]-a[1]),top=ranked[0]||["H",.5],second=ranked[1]||top,certainty=top[1]-second[1];
    return{powerGap:gap,lean:top[0],confidence:certainty>=.28?"high":certainty>=.12?"medium":"balanced",homeForm,awayForm};
  }
  function decimalOdds(probability){
    const raw=1/(clamp(Number(probability)||.01,.01,.99)*MARGIN);
    return round2(clamp(Math.floor(raw*20)/20,1.15,7.5));
  }
  function quoteForMatch(tournament,match,info){
    const home=tournament.teams&&tournament.teams[match.homeId],away=tournament.teams&&tournament.teams[match.awayId];
    if(!home||!away)return null;
    const fair=fairProbabilities(home.power,away.power,info.stage),picks=info.stage==="group"?["H","D","A"]:["H","A"];
    const odds={};for(const pick of picks)odds[pick]=decimalOdds(fair[pick]);
    return{matchId:match.id,homeId:match.homeId,awayId:match.awayId,homeName:String(home.name||"Home"),awayName:String(away.name||"Away"),stage:info.stage,round:info.round,matchday:info.matchday,odds,fair:Object.fromEntries(picks.map(pick=>[pick,round2(fair[pick])])),intel:publicInsight(tournament,match,info,home,away,fair)};
  }
  function riskLimit(cash){return clamp(Math.floor(((Number(cash)||0)-CASH_FLOOR)/3),0,MAX_ROUND_STAKE);}
  function ensureMarket(stateValue,tournament,cash){
    const state=normalizeState(stateValue),info=stageInfo(tournament);if(!info)return{state,market:null,created:false};
    if(state.markets[info.key])return{state,market:state.markets[info.key],created:false};
    const quotes=matchesFor(tournament,info).map(match=>quoteForMatch(tournament,match,info)).filter(Boolean);
    const market={key:info.key,stage:info.stage,round:info.round,matchday:info.matchday,status:quotes.length?"open":"settled",riskLimit:riskLimit(cash),quotes,createdRevision:Number(tournament.revision)||0,settledRevision:null};
    state.markets[info.key]=market;return{state,market,created:true};
  }
  function roundTickets(state,marketKey){return state.tickets.filter(ticket=>ticket.marketKey===marketKey);}
  function metrics(stateValue){
    const state=normalizeState(stateValue),settled=state.tickets.filter(ticket=>["won","lost"].includes(ticket.status)),wins=settled.filter(ticket=>ticket.status==="won").length;
    const stakes=state.ledger.filter(entry=>entry.type==="stake").reduce((sum,entry)=>sum+Math.abs(Number(entry.amount)||0),0),payouts=state.ledger.filter(entry=>entry.type==="payout").reduce((sum,entry)=>sum+Math.max(0,Number(entry.amount)||0),0);
    let streak=0,bestStreak=0;for(const ticket of settled){if(ticket.status==="won"){streak++;bestStreak=Math.max(bestStreak,streak);}else streak=0;}
    return{stakes,payouts,net:payouts-stakes,settled:settled.length,wins,hitRate:settled.length?round2(wins/settled.length):0,currentStreak:streak,bestStreak};
  }
  function exposure(stateValue,market){const used=market?roundTickets(normalizeState(stateValue),market.key).reduce((sum,ticket)=>sum+ticket.stake,0):0,limit=market?market.riskLimit:0,ratio=limit?used/limit:0;return{used,limit,remaining:Math.max(0,limit-used),ratio:round2(ratio),level:ratio>=1?"max":ratio>=.5?"watch":"low"};}
  function minStakeForOdds(odds){
    const value=Number(odds)||1;for(let stake=value>=2?1:2;stake<=MAX_ROUND_STAKE;stake++)if(Math.round(stake*value)>=stake+1)return stake;return MAX_ROUND_STAKE+1;
  }
  function quoteSelection(market,matchId,pick){const quote=market&&market.quotes.find(item=>item.matchId===matchId);return{quote,odds:quote&&quote.odds&&Number(quote.odds[pick])};}
  function canPlace(stateValue,market,matchId,pick,stake,cash){
    const state=normalizeState(stateValue),amount=Number(stake),selected=quoteSelection(market,matchId,pick),tickets=market?roundTickets(state,market.key):[];
    if(!market||market.status!=="open")return{ok:false,reason:"market_closed"};
    if(!selected.quote||!Number.isFinite(selected.odds))return{ok:false,reason:"selection_missing"};
    if(!Number.isInteger(amount)||amount<1)return{ok:false,reason:"invalid_stake"};
    if(tickets.length>=MAX_TICKETS)return{ok:false,reason:"ticket_limit"};
    if(tickets.some(ticket=>ticket.matchId===matchId))return{ok:false,reason:"match_already_selected"};
    const used=tickets.reduce((sum,ticket)=>sum+ticket.stake,0),remaining=Math.max(0,market.riskLimit-used),minimum=minStakeForOdds(selected.odds),payout=Math.round(amount*selected.odds);
    if(amount<minimum)return{ok:false,reason:"minimum_stake",minimum};
    if(amount>remaining)return{ok:false,reason:"risk_limit",remaining};
    if((Number(cash)||0)-amount<CASH_FLOOR)return{ok:false,reason:"cash_reserve"};
    if(payout>MAX_PAYOUT)return{ok:false,reason:"payout_limit",maximum:Math.floor(MAX_PAYOUT/selected.odds)};
    return{ok:true,odds:selected.odds,payout,minimum,remaining};
  }
  function place(stateValue,marketKey,matchId,pick,stake,cash){
    const state=normalizeState(stateValue),market=state.markets[marketKey],check=canPlace(state,market,matchId,pick,stake,cash);if(!check.ok)return{state,ok:false,...check};
    const id=`YS-${String(state.nextTicketId++).padStart(4,"0")}`,ticket={id,marketKey,matchId,pick,odds:check.odds,stake:Number(stake),potentialPayout:check.payout,status:"open",settledScore:null,payout:0};
    state.tickets.push(ticket);state.ledger.push({id:`${id}-stake`,type:"stake",ticketId:id,marketKey,amount:-ticket.stake});
    return{state,ok:true,ticket};
  }
  function lock(stateValue,tournament){
    const state=normalizeState(stateValue),info=stageInfo(tournament);if(!info)return{state,count:0};
    const market=state.markets[info.key];if(!market||market.status!=="open")return{state,count:0};
    market.status="locked";let count=0;for(const ticket of roundTickets(state,market.key))if(ticket.status==="open"){ticket.status="locked";count++;}return{state,count};
  }
  function outcome(match,stage){if(stage==="group"&&match.score&&match.score[0]===match.score[1])return"D";return match.winnerId===match.homeId?"H":"A";}
  function settle(stateValue,tournament,marketKey){
    const state=normalizeState(stateValue),market=state.markets[marketKey];if(!market)return{state,payout:0,settled:[]};
    let payout=0;const settled=[];
    for(const ticket of roundTickets(state,market.key)){
      if(!["open","locked"].includes(ticket.status))continue;
      const match=tournament&&tournament.matches&&tournament.matches[ticket.matchId];if(!match||match.status!=="played")continue;
      const won=ticket.pick===outcome(match,market.stage);ticket.status=won?"won":"lost";ticket.settledScore=Array.isArray(match.score)?match.score.slice(0,2):null;ticket.payout=won?ticket.potentialPayout:0;
      if(won){payout+=ticket.payout;state.ledger.push({id:`${ticket.id}-payout`,type:"payout",ticketId:ticket.id,marketKey,amount:ticket.payout});}settled.push(ticket);
    }
    const matches=market.quotes.map(quote=>tournament&&tournament.matches&&tournament.matches[quote.matchId]).filter(Boolean);
    if(matches.length&&matches.every(match=>match.status==="played")){market.status="settled";market.settledRevision=Number(tournament.revision)||0;}
    return{state,payout,settled};
  }
  function currentMarket(stateValue,tournament){const state=normalizeState(stateValue),info=stageInfo(tournament);return info?state.markets[info.key]||null:null;}
  return Object.freeze({VERSION,ODDS_VERSION,INSIGHT_VERSION,MARGIN,MAX_TICKETS,MAX_ROUND_STAKE,MAX_PAYOUT,CASH_FLOOR,createState,normalizeState,validate,stageInfo,matchesFor,recentForm,publicInsight,fairProbabilities,decimalOdds,riskLimit,minStakeForOdds,ensureMarket,currentMarket,roundTickets,metrics,exposure,canPlace,place,lock,settle});
});
