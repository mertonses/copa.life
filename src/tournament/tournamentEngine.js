/* Deterministic 16-team group + knockout tournament engine.
   The module is DOM-free so draw, standings and bracket rules can be tested in Node. */
(function(root,factory){
  const api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;
  if(root)root.CopaTournamentEngine=Object.freeze(api);
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  "use strict";

  const FORMAT="groups16_v1";
  const GROUP_IDS=Object.freeze(["A","B","C","D"]);
  const GROUP_SCHEDULE=Object.freeze([
    Object.freeze([[0,1],[2,3]]),
    Object.freeze([[0,2],[3,1]]),
    Object.freeze([[0,3],[1,2]])
  ]);
  const FORMATIONS=Object.freeze(["4-4-2","4-3-3","4-2-3-1","3-5-2","5-3-2","3-4-3","4-5-1","4-3-2-1","4-1-4-1","3-4-1-2"]);
  const STYLES=Object.freeze(["gegen","kontra","tiki","uzun","blok"]);

  function hashSeed(value){
    const text=String(value==null?"":value);let hash=0x811c9dc5;
    for(let index=0;index<text.length;index++){hash^=text.charCodeAt(index);hash=Math.imul(hash,0x01000193);}
    return(hash>>>0)||1;
  }
  function rngFor(value){
    let state=hashSeed(value);
    return function(){state=(state+0x6D2B79F5)|0;let t=state;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};
  }
  function shuffled(values,rng){
    const list=values.slice();
    for(let index=list.length-1;index>0;index--){const target=Math.floor(rng()*(index+1));[list[index],list[target]]=[list[target],list[index]];}
    return list;
  }
  function clone(value){return JSON.parse(JSON.stringify(value));}
  function safeId(value,fallback){
    const normalized=String(value||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-zA-Z0-9]+/g,"-").replace(/^-|-$/g,"").toLowerCase();
    return normalized||fallback;
  }
  function uniquePool(rawPool,playerName){
    const result=[],seen=new Set([String(playerName||"").trim().toLocaleLowerCase()]);
    for(const entry of Array.isArray(rawPool)?rawPool:[]){
      const source=entry&&typeof entry==="object"?entry:{name:entry};
      const name=String(source.name||"").trim(),key=name.toLocaleLowerCase();
      if(!name||seen.has(key))continue;seen.add(key);result.push(Object.assign({},source,{name}));
    }
    return result;
  }
  function powerCurve(bases){
    const values=(Array.isArray(bases)?bases:[]).map(Number).filter(Number.isFinite).sort((a,b)=>a-b);
    const low=values[0]||60,high=values[values.length-1]||94,span=Math.max(24,high-low);
    const fractions=[1,.91,.84,.76,.69,.63,.57,.51,.45,.39,.33,.27,.20,.10,0];
    return fractions.map(fraction=>Math.round(low+span*fraction));
  }
  function normalizeTeam(source,index,power,seed){
    const rng=rngFor(`${seed}|profile|${index}|${source.name}`);
    return{
      id:`ai-${index+1}-${safeId(source.name,String(index+1)).slice(0,28)}`,
      name:source.name,power:Number.isFinite(Number(source.power))?Number(source.power):power,
      formation:source.formation||FORMATIONS[Math.floor(rng()*FORMATIONS.length)],
      style:source.style||STYLES[Math.floor(rng()*STYLES.length)],
      isPlayer:false,ghostId:source.ghostId||"",ghostProfile:source.ghostProfile||null,
      fairPlay:0
    };
  }
  function createGroupMatches(groups){
    const matches={};
    for(const group of groups){
      group.matchIds=[];
      GROUP_SCHEDULE.forEach((pairs,matchdayIndex)=>pairs.forEach((pair,pairIndex)=>{
        const id=`G-${group.id}-${matchdayIndex+1}-${pairIndex+1}`;
        matches[id]={id,stage:"group",groupId:group.id,matchday:matchdayIndex+1,homeId:group.teamIds[pair[0]],awayId:group.teamIds[pair[1]],status:"scheduled",score:null,winnerId:null,decidedBy:"regulation",fairPlay:{home:0,away:0}};
        group.matchIds.push(id);
      }));
    }
    return matches;
  }
  function createTournament(options){
    const input=options&&typeof options==="object"?options:{};
    const seed=hashSeed(input.seed||1),playerName=String(input.playerName||"COPA XI").trim()||"COPA XI";
    const pool=uniquePool(input.pool,playerName);
    if(pool.length<15)throw new Error("tournament_pool_requires_15_unique_teams");
    const rng=rngFor(`${seed}|participants`),picked=shuffled(pool,rng).slice(0,15),curve=powerCurve(input.powerBases);
    const aiTeams=picked.map((team,index)=>normalizeTeam(team,index,curve[index],seed)).sort((a,b)=>b.power-a.power||a.name.localeCompare(b.name));
    const player={id:"player",name:playerName,power:Math.max(35,Math.min(110,Number(input.playerPower)||70)),formation:input.playerFormation||"4-3-3",style:input.playerStyle||"gegen",isPlayer:true,fairPlay:0};
    /* The player's club is the host seed. This preserves the existing early-round
       difficulty curve while the other three top seeds anchor the remaining groups. */
    const pots=[[player,...aiTeams.slice(0,3)],aiTeams.slice(3,7),aiTeams.slice(7,11),aiTeams.slice(11,15)];
    const groups=GROUP_IDS.map(id=>({id,teamIds:[],matchIds:[],table:[]})),drawEntries=[];
    pots.forEach((pot,potIndex)=>{
      const teams=shuffled(pot,rng),destinations=shuffled(GROUP_IDS,rng);
      teams.forEach((team,index)=>{
        const groupId=destinations[index],group=groups.find(item=>item.id===groupId);
        team.pot=potIndex+1;team.groupId=groupId;group.teamIds.push(team.id);
        drawEntries.push({index:drawEntries.length,pot:potIndex+1,teamId:team.id,groupId});
      });
    });
    /* Schedule slot order is also deterministic and separate from reveal order. */
    for(const group of groups)group.teamIds=shuffled(group.teamIds,rngFor(`${seed}|schedule|${group.id}`));
    const teams={};for(const team of [player,...aiTeams])teams[team.id]=team;
    const matches=createGroupMatches(groups),playerGroupId=teams.player.groupId;
    const state={
      version:1,format:FORMAT,seed,phase:"draw",teams,groups,matches,
      draw:{entries:drawEntries,revealIndex:0,completed:false},
      group:{matchday:1,playerGroupId,qualified:null,rank:null},
      knockout:{round:"quarterfinal",roundMatchIds:[],slots:{}},
      player:{teamId:"player",eliminated:false,champion:false},revision:0
    };
    recomputeTables(state);
    return state;
  }
  function revealedEntries(state){return state.draw.entries.slice(0,state.draw.revealIndex);}
  function revealNext(state,count){
    if(!state||state.phase!=="draw")return null;
    const amount=Math.max(1,Number(count)||1),previous=state.draw.revealIndex;
    state.draw.revealIndex=Math.min(state.draw.entries.length,previous+amount);
    state.draw.completed=state.draw.revealIndex>=state.draw.entries.length;state.revision++;
    return state.draw.entries[state.draw.revealIndex-1]||null;
  }
  function completeDraw(state){
    if(!state||state.phase!=="draw")return false;
    state.draw.revealIndex=state.draw.entries.length;state.draw.completed=true;state.phase="group";state.revision++;return true;
  }
  function playedGroupMatches(state,groupId){
    const group=state.groups.find(item=>item.id===groupId);
    return group?group.matchIds.map(id=>state.matches[id]).filter(match=>match&&match.status==="played"):[];
  }
  function statsFor(teamId,matches){
    const row={teamId,played:0,wins:0,draws:0,losses:0,gf:0,ga:0,gd:0,points:0,fairPlay:0,rank:0,qualified:false};
    for(const match of matches){
      if(match.homeId!==teamId&&match.awayId!==teamId)continue;
      const home=match.homeId===teamId,gf=Number(match.score[home?0:1])||0,ga=Number(match.score[home?1:0])||0;
      row.played++;row.gf+=gf;row.ga+=ga;
      const fp=match.fairPlay||{};row.fairPlay+=Number(fp[home?"home":"away"])||0;
      if(gf>ga){row.wins++;row.points+=3;}else if(gf===ga){row.draws++;row.points++;}else row.losses++;
    }
    row.gd=row.gf-row.ga;return row;
  }
  function headToHead(teamId,tiedIds,matches){return statsFor(teamId,matches.filter(match=>tiedIds.includes(match.homeId)&&tiedIds.includes(match.awayId)));}
  function rankGroup(state,groupId){
    const group=state.groups.find(item=>item.id===groupId);if(!group)return[];
    const matches=playedGroupMatches(state,groupId),rows=group.teamIds.map(id=>statsFor(id,matches));
    const primaryKey=row=>`${row.points}|${row.gd}|${row.gf}`;
    const ties=new Map();for(const row of rows){const key=primaryKey(row);if(!ties.has(key))ties.set(key,[]);ties.get(key).push(row.teamId);}
    rows.sort((left,right)=>{
      if(right.points!==left.points)return right.points-left.points;
      if(right.gd!==left.gd)return right.gd-left.gd;
      if(right.gf!==left.gf)return right.gf-left.gf;
      const tied=ties.get(primaryKey(left))||[left.teamId,right.teamId];
      const lh=headToHead(left.teamId,tied,matches),rh=headToHead(right.teamId,tied,matches);
      if(rh.points!==lh.points)return rh.points-lh.points;
      if(rh.gd!==lh.gd)return rh.gd-lh.gd;
      if(rh.gf!==lh.gf)return rh.gf-lh.gf;
      if(right.fairPlay!==left.fairPlay)return right.fairPlay-left.fairPlay;
      return hashSeed(`${state.seed}|lot|${groupId}|${left.teamId}`)-hashSeed(`${state.seed}|lot|${groupId}|${right.teamId}`);
    });
    rows.forEach((row,index)=>{row.rank=index+1;row.qualified=index<2&&row.played===3;});
    return rows;
  }
  function recomputeTables(state){for(const group of state.groups)group.table=rankGroup(state,group.id);return state.groups;}
  function getPlayerGroup(state){return state&&state.groups.find(group=>group.id===state.group.playerGroupId)||null;}
  function getCurrentPlayerMatch(state){
    if(!state)return null;
    if(state.phase==="group"){
      const group=getPlayerGroup(state);return group&&group.matchIds.map(id=>state.matches[id]).find(match=>match.matchday===state.group.matchday&&(match.homeId==="player"||match.awayId==="player"))||null;
    }
    if(state.phase==="knockout")return state.knockout.roundMatchIds.map(id=>state.matches[id]).find(match=>match&&(match.homeId==="player"||match.awayId==="player"))||null;
    return null;
  }
  function normalizeResult(match,result,allowDraw){
    const score=Array.isArray(result&&result.score)?result.score.map(value=>Math.max(0,Math.min(20,Math.floor(Number(value)||0)))):[0,0];
    let winnerId=result&&result.winnerId;
    if(score[0]>score[1])winnerId=match.homeId;else if(score[1]>score[0])winnerId=match.awayId;else if(!allowDraw&&winnerId!==match.homeId&&winnerId!==match.awayId)winnerId=hashSeed(match.id)%2?match.homeId:match.awayId;
    return{score,winnerId:winnerId||null,decidedBy:result&&result.decidedBy||((score[0]===score[1]&&!allowDraw)?"penalties":"regulation"),fairPlay:{home:Number(result&&result.fairPlay&&result.fairPlay.home)||0,away:Number(result&&result.fairPlay&&result.fairPlay.away)||0}};
  }
  function recordMatch(state,matchId,result,allowDraw){
    const match=state&&state.matches[matchId];if(!match||match.status==="played")return false;
    const normalized=normalizeResult(match,result,allowDraw);match.status="played";match.score=normalized.score;match.winnerId=normalized.winnerId;match.decidedBy=normalized.decidedBy;match.fairPlay=normalized.fairPlay;state.revision++;return true;
  }
  function defaultSimulator(state,match){
    const home=state.teams[match.homeId],away=state.teams[match.awayId],rng=rngFor(`${state.seed}|match|${match.id}`),gap=(home.power-away.power)/16;
    let homeGoals=Math.max(0,Math.floor(rng()*3+rng()*2+Math.max(-.3,gap))),awayGoals=Math.max(0,Math.floor(rng()*3+rng()*2+Math.max(-.3,-gap)));
    if(match.stage!=="group"&&homeGoals===awayGoals){if(rng()<.5)homeGoals++;else awayGoals++;}
    return{score:[homeGoals,awayGoals],winnerId:homeGoals===awayGoals?null:(homeGoals>awayGoals?home.id:away.id)};
  }
  function simulateScheduled(state,matches,simulator,allowDraw){
    const sim=typeof simulator==="function"?simulator:match=>defaultSimulator(state,match);
    for(const match of matches){if(match.status!=="scheduled")continue;recordMatch(state,match.id,sim(match,state),allowDraw);}
  }
  function createKnockoutMatch(state,id,roundName,homeId,awayId){
    state.matches[id]={id,stage:"knockout",round:roundName,homeId,awayId,status:"scheduled",score:null,winnerId:null,decidedBy:"regulation",fairPlay:{home:0,away:0}};return id;
  }
  function buildQuarterfinals(state){
    const ranked={};for(const group of state.groups)ranked[group.id]=group.table;
    const slots=[
      ["QF1","A",0,"B",1],["QF2","C",0,"D",1],["QF3","B",0,"A",1],["QF4","D",0,"C",1]
    ];
    state.knockout.round="quarterfinal";state.knockout.roundMatchIds=slots.map(([id,g1,r1,g2,r2])=>createKnockoutMatch(state,id,"quarterfinal",ranked[g1][r1].teamId,ranked[g2][r2].teamId));
    state.knockout.slots.quarterfinal=state.knockout.roundMatchIds.slice();state.phase="knockout";
  }
  function advanceKnockout(state,simulator){
    const current=state.knockout.round,ids=state.knockout.roundMatchIds,matches=ids.map(id=>state.matches[id]);
    simulateScheduled(state,matches.filter(match=>match.homeId!=="player"&&match.awayId!=="player"),simulator,false);
    const playerMatch=matches.find(match=>match.homeId==="player"||match.awayId==="player");
    if(playerMatch&&playerMatch.status==="played"&&playerMatch.winnerId!=="player"){
      state.player.eliminated=true;state.phase="complete";state.player.exitStage=current;state.revision++;return;
    }
    if(matches.some(match=>match.status!=="played"))return;
    if(current==="quarterfinal"){
      const winners=matches.map(match=>match.winnerId);
      state.knockout.round="semifinal";state.knockout.roundMatchIds=[createKnockoutMatch(state,"SF1","semifinal",winners[0],winners[1]),createKnockoutMatch(state,"SF2","semifinal",winners[2],winners[3])];
      state.knockout.slots.semifinal=state.knockout.roundMatchIds.slice();
    }else if(current==="semifinal"){
      const winners=matches.map(match=>match.winnerId);
      state.knockout.round="final";state.knockout.roundMatchIds=[createKnockoutMatch(state,"F1","final",winners[0],winners[1])];state.knockout.slots.final=state.knockout.roundMatchIds.slice();
    }else{
      state.player.champion=matches[0].winnerId==="player";state.player.eliminated=!state.player.champion;state.player.exitStage="final";state.phase="complete";
    }
    state.revision++;
  }
  function completePlayerMatch(state,result,simulator){
    const match=getCurrentPlayerMatch(state);if(!match)return{ok:false,reason:"no_player_match"};
    if(state.phase==="group"){
      if(!recordMatch(state,match.id,result,true))return{ok:false,reason:"already_played"};
      const day=state.group.matchday,dayMatches=Object.values(state.matches).filter(item=>item.stage==="group"&&item.matchday===day);
      simulateScheduled(state,dayMatches,simulator,true);recomputeTables(state);
      if(day<3){state.group.matchday++;state.revision++;return{ok:true,qualified:null,stage:"group"};}
      const row=getPlayerGroup(state).table.find(item=>item.teamId==="player");state.group.rank=row.rank;state.group.qualified=row.rank<=2;
      if(!state.group.qualified){state.player.eliminated=true;state.player.exitStage="group";state.phase="complete";state.revision++;return{ok:true,qualified:false,rank:row.rank,stage:"group"};}
      buildQuarterfinals(state);state.revision++;return{ok:true,qualified:true,rank:row.rank,stage:"quarterfinal"};
    }
    if(state.phase==="knockout"){
      if(!recordMatch(state,match.id,result,false))return{ok:false,reason:"already_played"};
      const previous=state.knockout.round;advanceKnockout(state,simulator);
      return{ok:true,qualified:!state.player.eliminated,stage:previous,nextStage:state.phase==="knockout"?state.knockout.round:"complete",champion:state.player.champion};
    }
    return{ok:false,reason:"invalid_phase"};
  }
  function playerSchedule(state){
    const matches=[];
    const group=getPlayerGroup(state);
    if(group)matches.push(...group.matchIds.map(id=>state.matches[id]).filter(match=>match.homeId==="player"||match.awayId==="player").sort((a,b)=>a.matchday-b.matchday));
    for(const key of ["quarterfinal","semifinal","final"]){for(const id of state.knockout.slots[key]||[]){const match=state.matches[id];if(match&&(match.homeId==="player"||match.awayId==="player"))matches.push(match);}}
    return matches;
  }
  const TABLE_FIELDS=["teamId","played","wins","draws","losses","gf","ga","gd","points","fairPlay","rank","qualified"];
  function tableMatches(actual,expected){return Array.isArray(actual)&&actual.length===expected.length&&actual.every((row,index)=>TABLE_FIELDS.every(field=>row&&row[field]===expected[index][field]));}
  function validate(state){
    const errors=[];
    if(!state||typeof state!=="object")return{ok:false,errors:["not_object"]};
    if(state.format!==FORMAT)errors.push("invalid_format");
    const teams=state.teams&&Object.values(state.teams)||[];
    if(teams.length!==16)errors.push("invalid_team_count");
    if(new Set(teams.map(team=>team.id)).size!==teams.length)errors.push("duplicate_team_id");
    if(teams.some(team=>!team||typeof team.name!=="string"||!team.name.trim()||!Number.isFinite(Number(team.power))||Number(team.power)<35||Number(team.power)>115||!FORMATIONS.includes(team.formation)||!STYLES.includes(team.style)))errors.push("invalid_team_profile");
    if(!state.teams||!state.teams.player||!state.teams.player.isPlayer)errors.push("missing_player");
    if(!Array.isArray(state.groups)||state.groups.length!==4)errors.push("invalid_group_count");
    else{
      const assigned=[];
      for(const group of state.groups){
        if(!GROUP_IDS.includes(group.id)||!Array.isArray(group.teamIds)||group.teamIds.length!==4)errors.push("invalid_group_shape");else assigned.push(...group.teamIds);
        const matches=Array.isArray(group.matchIds)?group.matchIds.map(id=>state.matches&&state.matches[id]).filter(Boolean):[];
        if(matches.length!==6)errors.push("invalid_group_schedule");
        else{
          const pairs=new Set(),days=new Map();
          for(const match of matches){
            if(match.stage!=="group"||match.groupId!==group.id||!group.teamIds.includes(match.homeId)||!group.teamIds.includes(match.awayId))errors.push("invalid_group_match");
            pairs.add([match.homeId,match.awayId].sort().join("|"));
            if(!days.has(match.matchday))days.set(match.matchday,[]);days.get(match.matchday).push(match.homeId,match.awayId);
          }
          if(pairs.size!==6||[1,2,3].some(day=>!days.has(day)||days.get(day).length!==4||new Set(days.get(day)).size!==4))errors.push("invalid_group_schedule");
        }
        if(!Array.isArray(group.table)||group.table.length!==4||new Set(group.table.map(row=>row.teamId)).size!==4||group.table.some(row=>!group.teamIds.includes(row.teamId)))errors.push("invalid_group_table");
        else if(!tableMatches(group.table,rankGroup(state,group.id)))errors.push("inconsistent_group_table");
      }
      if(assigned.length!==16||new Set(assigned).size!==16||assigned.some(id=>!state.teams[id]))errors.push("invalid_group_assignment");
    }
    if(!state.draw||!Array.isArray(state.draw.entries)||state.draw.entries.length!==16||state.draw.revealIndex<0||state.draw.revealIndex>16)errors.push("invalid_draw");
    else if(new Set(state.draw.entries.map(entry=>entry.teamId)).size!==16||state.draw.entries.some((entry,index)=>entry.index!==index||!state.teams[entry.teamId]||state.teams[entry.teamId].groupId!==entry.groupId||state.teams[entry.teamId].pot!==entry.pot||!GROUP_IDS.includes(entry.groupId)||entry.pot<1||entry.pot>4))errors.push("invalid_draw_entries");
    const groupMatches=state.matches&&Object.values(state.matches).filter(match=>match.stage==="group")||[];
    if(groupMatches.length!==24)errors.push("invalid_group_match_count");
    for(const match of state.matches?Object.values(state.matches):[]){
      if(!state.teams[match.homeId]||!state.teams[match.awayId]||match.homeId===match.awayId)errors.push("invalid_match_team");
      if(!["scheduled","played"].includes(match.status))errors.push("invalid_match_status");
      if(match.ghostOpponent!=null){
        const ghost=match.ghostOpponent,opponentId=match.homeId==="player"?match.awayId:match.homeId;
        if(match.stage!=="knockout"||match.round==="final"||(match.homeId!=="player"&&match.awayId!=="player")||!ghost||typeof ghost!=="object"||ghost.originalTeamId!==opponentId||typeof ghost.name!=="string"||!ghost.name.trim()||ghost.name.length>80||!Number.isFinite(Number(ghost.power))||Number(ghost.power)<35||Number(ghost.power)>115||!FORMATIONS.includes(ghost.formation)||!STYLES.includes(ghost.style)||ghost.ghost!==true||(ghost.ghostId&&!/^G-[A-Z0-9]{8,32}$/.test(String(ghost.ghostId))))errors.push("invalid_ghost_override");
      }
      if(match.status==="played"){
        if(!Array.isArray(match.score)||match.score.length!==2||match.score.some(value=>!Number.isInteger(Number(value))||value<0||value>20))errors.push("invalid_match_score");
        else{
          const tied=Number(match.score[0])===Number(match.score[1]),expectedWinner=Number(match.score[0])>Number(match.score[1])?match.homeId:Number(match.score[1])>Number(match.score[0])?match.awayId:null;
          if(match.stage==="group"&&match.winnerId!==(expectedWinner||null))errors.push("invalid_group_winner");
          if(match.stage==="knockout"&&(![match.homeId,match.awayId].includes(match.winnerId)||!tied&&match.winnerId!==expectedWinner))errors.push("invalid_knockout_winner");
        }
        if(!match.fairPlay||![match.fairPlay.home,match.fairPlay.away].every(value=>Number.isFinite(Number(value))&&Number(value)<=0&&Number(value)>=-50))errors.push("invalid_fair_play");
      }else if(match.score!==null||match.winnerId!==null)errors.push("scheduled_match_has_result");
    }
    if(!["draw","group","knockout","complete"].includes(state.phase))errors.push("invalid_phase");
    if(!state.group||!GROUP_IDS.includes(state.group.playerGroupId)||!state.groups.some(group=>group.id===state.group.playerGroupId&&group.teamIds.includes("player"))||!Number.isInteger(Number(state.group.matchday))||state.group.matchday<1||state.group.matchday>3)errors.push("invalid_player_group");
    if(!state.knockout||!["quarterfinal","semifinal","final"].includes(state.knockout.round)||!Array.isArray(state.knockout.roundMatchIds)||!state.knockout.slots||typeof state.knockout.slots!=="object")errors.push("invalid_knockout");
    else{
      const expectedCounts={quarterfinal:4,semifinal:2,final:1};
      for(const roundName of Object.keys(expectedCounts)){
        const ids=state.knockout.slots[roundName]||[];
        if(!Array.isArray(ids)||![0,expectedCounts[roundName]].includes(ids.length)||ids.some(id=>!state.matches[id]||state.matches[id].stage!=="knockout"||state.matches[id].round!==roundName))errors.push("invalid_knockout_slots");
      }
      if(state.phase==="knockout"&&(state.knockout.roundMatchIds.length!==expectedCounts[state.knockout.round]||state.knockout.roundMatchIds.some((id,index)=>id!==state.knockout.slots[state.knockout.round][index])))errors.push("invalid_knockout_round");
      const qf=(state.knockout.slots.quarterfinal||[]).map(id=>state.matches[id]),sf=(state.knockout.slots.semifinal||[]).map(id=>state.matches[id]),fin=(state.knockout.slots.final||[]).map(id=>state.matches[id]);
      if(sf.length&&qf.length===4&&qf.every(match=>match.status==="played")&&([sf[0].homeId,sf[0].awayId,sf[1].homeId,sf[1].awayId].some((id,index)=>id!==qf[index].winnerId)))errors.push("invalid_semifinal_progression");
      if(fin.length&&sf.length===2&&sf.every(match=>match.status==="played")&&(fin[0].homeId!==sf[0].winnerId||fin[0].awayId!==sf[1].winnerId))errors.push("invalid_final_progression");
    }
    if(state.phase!=="draw"&&state.draw&&state.draw.completed!==true)errors.push("incomplete_draw");
    if(state.phase==="knockout"&&(!state.group||state.group.qualified!==true||state.knockout.roundMatchIds.some(id=>!state.matches[id])))errors.push("invalid_knockout_phase");
    const playerGroup=state.groups&&state.groups.find(group=>group.id===(state.group&&state.group.playerGroupId)),playerRow=playerGroup&&playerGroup.table.find(row=>row.teamId==="player");
    if(state.group&&state.group.qualified!=null&&playerRow&&playerRow.played===3&&(state.group.qualified!==(playerRow.rank<=2)||Number(state.group.rank)!==Number(playerRow.rank)))errors.push("inconsistent_player_qualification");
    if(state.phase==="complete"&&state.player&&!state.player.eliminated&&!state.player.champion)errors.push("invalid_complete_state");
    return{ok:errors.length===0,errors:[...new Set(errors)]};
  }

  return{FORMAT,GROUP_IDS,GROUP_SCHEDULE,hashSeed,rngFor,createTournament,revealedEntries,revealNext,completeDraw,rankGroup,recomputeTables,getPlayerGroup,getCurrentPlayerMatch,completePlayerMatch,playerSchedule,recordMatch,validate,clone,defaultSimulator};
});
