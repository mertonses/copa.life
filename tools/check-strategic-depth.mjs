import assert from "node:assert/strict";
import {createRequire} from "node:module";

const require=createRequire(import.meta.url);
const core=require("../src/sim/finalSimCore.js");
const normal=require("../src/game/normalMatch.js");
const roles=require("../src/game/playerRoleEffects.js");

const baseProfile={
  copa_impact:65,copa_build_up:65,copa_space_control:65,copa_duels:65,copa_engine:65,copa_pressure_decision:65,
  archetype:"balanced_midfielder"
};
const player=(name,overrides)=>({name,ov:70,pos:"CM",gameplayProfile:{...baseProfile,...overrides}});
const creators=Array.from({length:11},(_,index)=>player(`Creator ${index}`,{copa_build_up:88,copa_pressure_decision:84,archetype:"playmaker"}));
const stoppers=Array.from({length:11},(_,index)=>player(`Stopper ${index}`,{copa_space_control:89,copa_duels:87,archetype:"space_defender"}));
const creatorPlan=roles.aggregate(creators,"tiki"),stopperPlan=roles.aggregate(stoppers,"blok");
assert.ok(creatorPlan.passQuality>stopperPlan.passQuality,"playmaker-heavy squads must create a distinct build-up profile");
assert.ok(stopperPlan.defensivePressure>creatorPlan.defensivePressure,"defender-heavy squads must create a distinct containment profile");

const common={core,runSeed:991,round:5,opponentId:"depth",homePower:74,awayPower:74,style:"tiki",awayStyle:"gegen"};
const finishing=normal.simulate({...common,preparation:{attack:2.5}});
const defending=normal.simulate({...common,preparation:{defence:2.5}});
const setPieces=normal.simulate({...common,preparation:{setpiece:2.5}});
const cohesion=normal.simulate({...common,preparation:{chemistry:2.5}});
assert.ok(finishing.config.plan.shotQuality>defending.config.plan.shotQuality,"finishing work must improve shot quality rather than generic power");
assert.ok(defending.config.plan.defensivePressure>finishing.config.plan.defensivePressure,"defensive work must improve containment rather than generic power");
assert.ok(setPieces.config.plan.setPieceBias>finishing.config.plan.setPieceBias,"set-piece work must alter set-piece production");
assert.ok(cohesion.config.plan.passQuality>finishing.config.plan.passQuality,"cohesion work must alter passing stability");
assert.notDeepEqual(finishing.stats,setPieces.stats,"different preparation plans must create different deterministic match statistics");

const attackTalk=normal.talkPlan({target:"attack",delta:2,first20:2,focus:3});
const defenceTalk=normal.talkPlan({target:"defence",delta:2,first20:2,focus:3});
assert.ok(attackTalk.shotQuality>0&&!attackTalk.defensivePressure,"attack talks must target attack");
assert.ok(defenceTalk.defensivePressure>0&&!defenceTalk.shotQuality,"defence talks must target defence");

const replay=core.replay(finishing.replayCode);
assert.deepEqual(replay.config.plan,finishing.config.plan,"CFS4 replay must preserve tactical and preparation channels");
assert.deepEqual(replay.score,finishing.score,"CFS4 replay must remain deterministic");

console.log("Strategic depth OK: preparation, team talks, player roles and CFS4 replay use separate bounded match channels.");
