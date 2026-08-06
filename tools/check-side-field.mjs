import assert from "node:assert/strict";
import tournamentEngine from "../src/tournament/tournamentEngine.js";
import sideField from "../src/sidefield/sideFieldEngine.js";

const pool=Array.from({length:32},(_,index)=>({name:`Club ${String(index+1).padStart(2,"0")}`}));
const tournament=tournamentEngine.createTournament({seed:"yan-saha-audit",playerName:"COPA XI",playerPower:74,playerFormation:"4-3-3",playerStyle:"gegen",pool,powerBases:[60,66,72,78,86,94]});
tournamentEngine.revealNext(tournament,32);tournamentEngine.completeDraw(tournament);

let state=sideField.createState();
const opened=sideField.ensureMarket(state,tournament,30);state=opened.state;
assert.equal(state.version,3,"Yan Saha state must use subsystem schema v3");
assert.equal(state.oddsVersion,"yan-saha-v3","persisted odds need an explicit model version");
assert.equal(state.insightVersion,"form-v1","persisted insights need an explicit model version");
assert.equal(opened.created,true,"the first visit must freeze a market snapshot");
assert.equal(opened.market.quotes.length,15,"group matchday must expose all 15 non-player fixtures");
assert.equal(opened.market.riskLimit,5,"a healthy starting budget must receive the €5M round ceiling");
assert.ok(opened.market.quotes.every(quote=>quote.homeId!=="player"&&quote.awayId!=="player"),"the player's own fixture must never be offered");
assert.ok(opened.market.quotes.every(quote=>quote.intel&&["high","medium","balanced"].includes(quote.intel.confidence)),"every quote must expose a bounded public confidence insight");
assert.ok(opened.market.quotes.every(quote=>Number.isInteger(quote.intel.powerGap)&&Number.isInteger(quote.intel.homeForm.points)&&Number.isInteger(quote.intel.awayForm.points)),"power gap and recent form must be deterministic public data");

for(const quote of opened.market.quotes){
  const picks=Object.keys(quote.odds),overround=picks.reduce((sum,pick)=>sum+1/quote.odds[pick],0);
  assert.ok(overround>=1.04&&overround<=1.22,`market margin escaped guardrails for ${quote.matchId}`);
}

const rtp=[];
for(const quote of opened.market.quotes)for(const pick of Object.keys(quote.odds)){
  const stake=sideField.minStakeForOdds(quote.odds[pick]);if(stake>sideField.MAX_ROUND_STAKE)continue;
  rtp.push(quote.fair[pick]*sideField.payoutFor(stake,quote.odds[pick])/stake);
}
const averageRtp=rtp.reduce((sum,value)=>sum+value,0)/rtp.length;
assert.ok(averageRtp>=.78&&averageRtp<=.96,`average half-million payout RTP ${averageRtp.toFixed(3)} escaped the guarded band`);
assert.equal(sideField.minStakeForOdds(1.15),1,"every quote must accept a €1M minimum pick");
assert.equal(sideField.payoutFor(1,1.7),1.5,"returns must resolve at €0.5M precision");

let lowState=sideField.createState();
const lowOpened=sideField.ensureMarket(lowState,tournament,-20);lowState=lowOpened.state;
assert.equal(lowOpened.market.riskLimit,2,"every round must open with at least €2M of budget");
const raised=sideField.ensureMarket(lowState,tournament,30);
assert.equal(raised.market.riskLimit,5,"cash growth must raise an already-open round budget");
const preserved=sideField.ensureMarket(raised.state,tournament,0);
assert.equal(preserved.market.riskLimit,5,"cash loss must not shrink an already-open round budget");

const quote=opened.market.quotes.find(item=>Object.values(item.odds).some(odds=>sideField.minStakeForOdds(odds)<=4));
const pick=Object.keys(quote.odds).find(key=>sideField.minStakeForOdds(quote.odds[key])<=4),stake=sideField.minStakeForOdds(quote.odds[pick]);
const placed=sideField.place(state,opened.market.key,quote.matchId,pick,stake,30);state=placed.state;
assert.equal(placed.ok,true,"a valid selection must be accepted");
assert.deepEqual(sideField.exposure(state,opened.market),{used:stake,limit:5,remaining:5-stake,ratio:Math.round(stake/5*100)/100,level:stake/5>=1?"max":stake/5>=.5?"watch":"low"},"risk exposure must be derived from the active round budget");
assert.equal(sideField.place(state,opened.market.key,quote.matchId,pick,stake,30).reason,"match_already_selected","duplicate fixture exposure must be rejected");
assert.equal(sideField.place(state,opened.market.key,opened.market.quotes[1].matchId,"H",5,30,-28).reason,"risk_limit","stake above the remaining round budget must be rejected");
let fourPickState=sideField.createState(),fourPickMarket=sideField.ensureMarket(fourPickState,tournament,20);fourPickState=fourPickMarket.state;
for(let index=0;index<4;index++){const candidate=fourPickMarket.market.quotes[index],result=sideField.place(fourPickState,fourPickMarket.market.key,candidate.matchId,"H",1,20,-28);assert.equal(result.ok,true,`pick ${index+1} of four must be accepted`);fourPickState=result.state;}
assert.equal(sideField.exposure(fourPickState,fourPickMarket.market).used,4,"four picks must still reconcile against the shared round budget");
assert.equal(sideField.place(fourPickState,fourPickMarket.market.key,fourPickMarket.market.quotes[4].matchId,"H",1,20,-28).reason,"ticket_limit","a fifth pick must be rejected with an exact reason");
const debtOpened=sideField.ensureMarket(sideField.createState(),tournament,-13);
assert.equal(sideField.canPlace(debtOpened.state,debtOpened.market,quote.matchId,pick,1,-13,-14).ok,true,"a chairman debt line must allow the last legal €1M");
assert.equal(sideField.canPlace(state,opened.market,opened.market.quotes[1].matchId,"H",1,-14,-14).reason,"cash_reserve","the active chairman debt line must protect the final €1M");
assert.equal(sideField.canPlace(state,opened.market,opened.market.quotes[1].matchId,"H",1,-14,-14).shortfall,1,"cash reserve failures must expose the exact shortfall");

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
const metrics=sideField.metrics(state);
assert.equal(metrics.stakes,stake,"record must count the stake once");
assert.equal(metrics.settled,1,"record must count one resolved selection");
assert.equal(metrics.net,metrics.payouts-metrics.stakes,"record net must reconcile with the ledger");
assert.equal(sideField.validate(JSON.parse(JSON.stringify(state))).ok,true,"persisted state must remain valid");
const corrupted=JSON.parse(JSON.stringify(state));corrupted.markets[opened.market.key].riskLimit=99;
assert.equal(sideField.validate(corrupted).ok,false,"tampered market limits must be rejected by persistence validation");
const migrated=sideField.normalizeState({version:2,markets:{},tickets:[],ledger:[],nextTicketId:3});
assert.equal(migrated.version,3,"v2 Yan Saha saves must migrate independently to v3");
assert.equal(migrated.nextTicketId,3,"subsystem migration must preserve ticket sequencing");

console.log(`Yan Saha v3 checks passed: 15 fixtures, ${(averageRtp*100).toFixed(1)}% modeled RTP, dynamic round budgets and idempotent settlement verified.`);
