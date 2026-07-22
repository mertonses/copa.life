import assert from "node:assert/strict";
import fs from "node:fs";
import engine from "../src/tournament/tournamentEngine.js";

const pool=Array.from({length:32},(_,index)=>({name:`Club ${String(index+1).padStart(2,"0")}`}));
const baseOptions={seed:20260721,playerName:"COPA XI",playerPower:74,playerFormation:"4-3-3",playerStyle:"gegen",pool,powerBases:[60,66,72,78,86,94]};
const supportedFormations=["4-4-2","4-3-3","4-2-3-1","3-5-2","5-3-2","3-4-3","4-5-1","4-3-2-1","4-1-4-1","3-4-1-2"];

{
  const rootPackage=JSON.parse(fs.readFileSync(new URL("../package.json",import.meta.url),"utf8"));
  const runnerPackage=JSON.parse(fs.readFileSync(new URL("../playtest/runner/package.json",import.meta.url),"utf8"));
  assert.match(rootPackage.scripts.test,/check:tournament:balance:matrix/,"release test chain must include the tournament balance matrix");
  assert.match(runnerPackage.scripts["test:ci"],/group-tournament-ui\.test\.ts/,"browser CI must include the group tournament flow");
  assert.match(runnerPackage.scripts["test:group"],/fixture-road-ui\.test\.ts/,"focused group suite must cover the fixture road");
}

function newTournament(seed=baseOptions.seed){return engine.createTournament({...baseOptions,seed});}
function playGroup(state,scores){
  for(const score of scores)engine.completePlayerMatch(state,{score},match=>engine.defaultSimulator(state,match));
}

for(const formation of supportedFormations){
  const state=engine.createTournament({...baseOptions,playerFormation:formation});
  assert.equal(state.teams.player.formation,formation);
  assert.equal(engine.validate(state).ok,true,`${formation} tournament profile must validate`);
}

{
  const manual=newTournament(),fast=newTournament();
  while(!manual.draw.completed)engine.revealNext(manual,1);
  engine.revealNext(fast,99);
  assert.deepEqual(manual.draw.entries,fast.draw.entries,"manual and fast draw must reveal the same draw");
  engine.completeDraw(manual);engine.completeDraw(fast);
  assert.deepEqual(manual.groups.map(group=>group.teamIds),fast.groups.map(group=>group.teamIds));
}

{
  const state=newTournament();
  assert.equal(engine.validate(state).ok,true);
  assert.equal(Object.keys(state.teams).length,16);
  assert.equal(Object.values(state.matches).filter(match=>match.stage==="group").length,24);
  for(const group of state.groups){
    assert.equal(group.teamIds.length,4);
    assert.equal(group.matchIds.length,6);
    const pairKeys=group.matchIds.map(id=>{const match=state.matches[id];return [match.homeId,match.awayId].sort().join("|");});
    assert.equal(new Set(pairKeys).size,6,"every pair must play exactly once");
    assert.deepEqual([...new Set(group.matchIds.map(id=>state.matches[id].matchday))],[1,2,3]);
  }
}

{
  const state=newTournament(),broken=engine.clone(state),group=broken.groups[0];
  broken.matches[group.matchIds[0]].matchday=2;
  assert.equal(engine.validate(broken).ok,false,"a corrupt group schedule must be rejected");
  const duplicateDraw=engine.clone(state);duplicateDraw.draw.entries[1].teamId=duplicateDraw.draw.entries[0].teamId;
  assert.equal(engine.validate(duplicateDraw).ok,false,"duplicate draw entries must be rejected");
  const corruptTable=engine.clone(state);corruptTable.groups[0].table[0].points=99;
  assert.equal(engine.validate(corruptTable).ok,false,"a table that disagrees with played matches must be rejected");
}

{
  const state=newTournament();engine.completeDraw(state);
  const group=engine.getPlayerGroup(state),others=group.teamIds.filter(id=>id!=="player");
  const playerMatches=group.matchIds.map(id=>state.matches[id]).filter(match=>match.homeId==="player"||match.awayId==="player");
  const force=(match,playerGoals,otherGoals)=>match.homeId==="player"?{score:[playerGoals,otherGoals]}:{score:[otherGoals,playerGoals]};
  for(const match of playerMatches)engine.recordMatch(state,match.id,force(match,2,0),true);
  for(const match of group.matchIds.map(id=>state.matches[id]).filter(match=>match.status!=="played"))engine.recordMatch(state,match.id,{score:[1,1]},true);
  engine.recomputeTables(state);
  const table=group.table,player=table.find(row=>row.teamId==="player");
  assert.equal(player.points,9);assert.equal(player.wins,3);assert.equal(player.gd,6);assert.equal(player.rank,1);
  assert.ok(others.every(id=>table.some(row=>row.teamId===id)));
}

{
  /* A complete three-way tie must remain stable across recalculations and reloads. */
  const state=newTournament();engine.completeDraw(state);const group=engine.getPlayerGroup(state);
  for(const id of group.matchIds)engine.recordMatch(state,id,{score:[1,1],fairPlay:{home:0,away:0}},true);
  engine.recomputeTables(state);const first=group.table.map(row=>row.teamId);
  engine.recomputeTables(state);assert.deepEqual(group.table.map(row=>row.teamId),first);
  const restored=engine.clone(state);engine.recomputeTables(restored);assert.deepEqual(engine.getPlayerGroup(restored).table.map(row=>row.teamId),first);
}

{
  /* When points, goal difference and goals are equal, the direct meeting decides. */
  const state=newTournament();engine.completeDraw(state);const group=engine.getPlayerGroup(state),[a,b,c,d]=group.teamIds;
  const score=(home,away,hg,ag)=>{const match=group.matchIds.map(id=>state.matches[id]).find(item=>item.homeId===home&&item.awayId===away||item.homeId===away&&item.awayId===home);assert.ok(match);engine.recordMatch(state,match.id,{score:match.homeId===home?[hg,ag]:[ag,hg]},true);};
  score(a,b,1,0);score(c,a,1,0);score(a,d,1,1);score(b,d,1,0);score(b,c,1,1);score(c,d,0,0);
  engine.recomputeTables(state);const table=group.table;
  const ar=table.find(row=>row.teamId===a),br=table.find(row=>row.teamId===b);
  assert.deepEqual([ar.points,ar.gd,ar.gf],[br.points,br.gd,br.gf]);
  assert.ok(ar.rank<br.rank,"head-to-head winner must rank first when primary totals are equal");
}

{
  /* Fair play breaks an otherwise complete tie before the deterministic lot. */
  const state=newTournament();engine.completeDraw(state);const group=engine.getPlayerGroup(state),penalized=group.teamIds[0];
  for(const id of group.matchIds){const match=state.matches[id],homePenalty=match.homeId===penalized?-1:0,awayPenalty=match.awayId===penalized?-1:0;engine.recordMatch(state,id,{score:[1,1],fairPlay:{home:homePenalty,away:awayPenalty}},true);}
  engine.recomputeTables(state);assert.equal(group.table.at(-1).teamId,penalized,"worse fair play must rank last in a complete tie");
}

{
  const first=newTournament(55),second=newTournament(55),third=newTournament(56);
  assert.deepEqual(first.draw.entries,second.draw.entries,"same seed must reproduce the draw");
  assert.notDeepEqual(first.draw.entries,third.draw.entries,"different seeds should change the draw");
}

{
  /* Consecutive random runs must not feel like a fixed bracket. A 20-team pool
     naturally repeats more clubs than a 40-team pool, so each size has its own
     overlap ceiling while preserving same-seed replayability above. */
  const diversity=(poolSize)=>{
    const localPool=Array.from({length:poolSize},(_,index)=>({name:`Diversity Club ${index+1}`}));
    const signatures=new Set();let previous=null,overlap=0,identical=0;
    const samples=900;
    for(let index=0;index<samples;index++){
      const state=engine.createTournament({...baseOptions,seed:810000+index,pool:localPool});
      const names=engine.getPlayerGroup(state).teamIds.filter(id=>id!=="player").map(id=>state.teams[id].name).sort();
      signatures.add(names.join("|"));
      if(previous){const common=names.filter(name=>previous.includes(name)).length;overlap+=common;if(common===3)identical++;}
      previous=names;
    }
    return{unique:signatures.size,averageOverlap:overlap/(samples-1),identical};
  };
  const broad=diversity(40),compact=diversity(20);
  assert.ok(broad.unique>=700&&broad.averageOverlap<0.35&&broad.identical===0,`40-team draw diversity regressed: ${JSON.stringify(broad)}`);
  assert.ok(compact.unique>=580&&compact.averageOverlap<0.65&&compact.identical<=3,`20-team draw diversity regressed: ${JSON.stringify(compact)}`);
}

{
  /* Three group wins guarantee qualification, then forced knockout wins produce a champion. */
  const state=newTournament();engine.completeDraw(state);
  for(let day=0;day<3;day++){
    const match=engine.getCurrentPlayerMatch(state),score=match.homeId==="player"?[3,0]:[0,3];
    const resolution=engine.completePlayerMatch(state,{score},item=>engine.defaultSimulator(state,item));
    if(day<2)assert.equal(resolution.qualified,null);else assert.equal(resolution.qualified,true);
  }
  assert.equal(state.phase,"knockout");assert.equal(state.knockout.round,"quarterfinal");
  const groupId=state.group.playerGroupId;
  for(const stage of ["quarterfinal","semifinal","final"]){
    const match=engine.getCurrentPlayerMatch(state);assert.ok(match);const score=match.homeId==="player"?[2,0]:[0,2];
    engine.completePlayerMatch(state,{score,winnerId:"player"},item=>engine.defaultSimulator(state,item));
    if(stage!=="final")assert.notEqual(state.phase,"complete");
  }
  assert.equal(state.player.champion,true);assert.equal(state.phase,"complete");
  assert.equal(engine.validate(state).ok,true,"a completed champion bracket must validate");
  const path=engine.playerSchedule(state);assert.equal(path.length,6);
  const qf=path.find(match=>match.round==="quarterfinal"),playerGroupTeams=new Set(state.groups.find(group=>group.id===groupId).teamIds);
  assert.equal(playerGroupTeams.has(qf.homeId==="player"?qf.awayId:qf.homeId),false,"quarterfinal opponent must come from another group");
}

{
  const state=newTournament();engine.completeDraw(state);
  for(let day=0;day<3;day++){
    const match=engine.getCurrentPlayerMatch(state),score=match.homeId==="player"?[0,4]:[4,0];
    engine.completePlayerMatch(state,{score},item=>engine.defaultSimulator(state,item));
  }
  assert.equal(state.phase,"complete");assert.equal(state.player.exitStage,"group");assert.equal(state.group.qualified,false);
  assert.equal(engine.validate(state).ok,true,"a completed group exit must validate");
}

console.log("Group tournament checks passed: deterministic draw, 24-match schedule, standings, qualification and knockout progression.");
