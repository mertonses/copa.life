import assert from "node:assert/strict";
import tournamentEngine from "../src/tournament/tournamentEngine.js";
import sideField from "../src/sidefield/sideFieldEngine.js";

const pool=Array.from({length:32},(_,index)=>({name:`Club ${String(index+1).padStart(2,"0")}`}));
const tournament=tournamentEngine.createTournament({seed:"yan-saha-audit",playerName:"COPA XI",playerPower:74,playerFormation:"4-3-3",playerStyle:"gegen",pool,powerBases:[60,66,72,78,86,94]});
tournamentEngine.revealNext(tournament,32);tournamentEngine.completeDraw(tournament);

let state=sideField.createState();
const opened=sideField.ensureMarket(state,tournament,30);state=opened.state;
assert.equal(opened.created,true,"the first visit must freeze a market snapshot");
assert.equal(opened.market.quotes.length,15,"group matchday must expose all 15 non-player fixtures");
assert.equal(opened.market.riskLimit,4,"a healthy starting budget must receive the €4M round ceiling");
assert.ok(opened.market.quotes.every(quote=>quote.homeId!=="player"&&quote.awayId!=="player"),"the player's own fixture must never be offered");

for(const quote of opened.market.quotes){
  const picks=Object.keys(quote.odds),overround=picks.reduce((sum,pick)=>sum+1/quote.odds[pick],0);
  assert.ok(overround>=1.04&&overround<=1.22,`market margin escaped guardrails for ${quote.matchId}`);
}

const rtp=[];
for(const quote of opened.market.quotes)for(const pick of Object.keys(quote.odds)){
  const stake=sideField.minStakeForOdds(quote.odds[pick]);if(stake>sideField.MAX_ROUND_STAKE)continue;
  rtp.push(quote.fair[pick]*Math.round(stake*quote.odds[pick])/stake);
}
const averageRtp=rtp.reduce((sum,value)=>sum+value,0)/rtp.length;
assert.ok(averageRtp>=.87&&averageRtp<=.94,`average rounded-payout RTP ${averageRtp.toFixed(3)} is outside the 87–94% balance band`);

const quote=opened.market.quotes.find(item=>Object.values(item.odds).some(odds=>sideField.minStakeForOdds(odds)<=4));
const pick=Object.keys(quote.odds).find(key=>sideField.minStakeForOdds(quote.odds[key])<=4),stake=sideField.minStakeForOdds(quote.odds[pick]);
const placed=sideField.place(state,opened.market.key,quote.matchId,pick,stake,30);state=placed.state;
assert.equal(placed.ok,true,"a valid selection must be accepted");
assert.equal(sideField.place(state,opened.market.key,quote.matchId,pick,stake,30).reason,"match_already_selected","duplicate fixture exposure must be rejected");
assert.equal(sideField.place(state,opened.market.key,opened.market.quotes[1].matchId,"H",5,30).reason,"risk_limit","stake above the round ceiling must be rejected");

const locked=sideField.lock(state,tournament);state=locked.state;
assert.equal(locked.count,1,"kickoff must lock the open ticket");
assert.equal(state.tickets[0].status,"locked");
const playerMatch=tournamentEngine.getCurrentPlayerMatch(tournament);
tournamentEngine.completePlayerMatch(tournament,{score:[2,1],winnerId:playerMatch.homeId},match=>tournamentEngine.defaultSimulator(tournament,match));
const settled=sideField.settle(state,tournament,opened.market.key);state=settled.state;
assert.equal(settled.settled.length,1,"the ticket must settle with the matchday");
assert.ok(["won","lost"].includes(state.tickets[0].status));
const repeated=sideField.settle(state,tournament,opened.market.key);
assert.equal(repeated.payout,0,"settlement must be idempotent");
assert.equal(repeated.settled.length,0,"settlement must not process a ticket twice");
assert.equal(sideField.validate(JSON.parse(JSON.stringify(state))).ok,true,"persisted state must remain valid");
const corrupted=JSON.parse(JSON.stringify(state));corrupted.markets[opened.market.key].riskLimit=99;
assert.equal(sideField.validate(corrupted).ok,false,"tampered market limits must be rejected by persistence validation");

console.log(`Yan Saha checks passed: 15 fixtures, ${(averageRtp*100).toFixed(1)}% modeled RTP, risk caps and idempotent settlement verified.`);
