/* Responsive, accessible views for the group draw, standings and knockout overview. */
(function(root){
  "use strict";
  const esc=value=>String(value==null?"":value).replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
  const HEADER_FULL={tr:{played:"Oynanan",wins:"Galibiyet",draws:"Beraberlik",losses:"Mağlubiyet",gf:"Atılan gol",ga:"Yenilen gol",gd:"Averaj",points:"Puan"},en:{played:"Played",wins:"Wins",draws:"Draws",losses:"Losses",gf:"Goals for",ga:"Goals against",gd:"Goal difference",points:"Points"},es:{played:"Partidos jugados",wins:"Victorias",draws:"Empates",losses:"Derrotas",gf:"Goles a favor",ga:"Goles en contra",gd:"Diferencia de goles",points:"Puntos"},de:{played:"Spiele",wins:"Siege",draws:"Unentschieden",losses:"Niederlagen",gf:"Tore",ga:"Gegentore",gd:"Tordifferenz",points:"Punkte"},it:{played:"Partite giocate",wins:"Vittorie",draws:"Pareggi",losses:"Sconfitte",gf:"Gol fatti",ga:"Gol subiti",gd:"Differenza reti",points:"Punti"}};
  const teamName=(state,id)=>state.teams[id]&&state.teams[id].name||"—";
  const teamPower=(state,id)=>state.teams[id]&&state.teams[id].power||0;
  const matchTeamName=(state,match,id)=>match&&match.ghostOpponent&&match.ghostOpponent.originalTeamId===id?match.ghostOpponent.name:teamName(state,id);
  function revealedTeamIds(state){return new Set(state.draw.entries.slice(0,state.draw.revealIndex).map(entry=>entry.teamId));}
  function drawGroup(state,group,copy,revealed,latestTeamId){
    const entries=state.draw.entries.filter(entry=>entry.groupId===group.id&&revealed.has(entry.teamId)).sort((a,b)=>a.pot-b.pot);
    return `<article class="td-group${group.id===state.group.playerGroupId?" is-player-group":""}" aria-label="${esc(copy.group)} ${group.id}">
      <header><span>${esc(copy.group)} ${group.id}</span><small>${entries.length}/4</small></header>
      <ol>${[1,2,3,4].map(pot=>{const entry=entries.find(item=>item.pot===pot);return `<li class="${entry&&entry.teamId==="player"?"is-player":""}${entry&&entry.teamId===latestTeamId?" is-latest":""}"><span class="td-pot">${pot}</span><b>${entry?esc(teamName(state,entry.teamId)):"••••••"}</b>${entry?`<em>${teamPower(state,entry.teamId)}</em>`:""}</li>`;}).join("")}</ol>
    </article>`;
  }
  function renderDraw(container,state,copy){
    if(!container||!state)return;
    const revealed=revealedTeamIds(state),next=state.draw.entries[state.draw.revealIndex],last=state.draw.entries[state.draw.revealIndex-1],complete=state.draw.completed;
    const currentPot=next?next.pot:4,remaining=Math.max(0,16-state.draw.revealIndex);
    container.innerHTML=`<div class="td-shell">
      <header class="td-head"><div><span class="td-kicker">${esc(copy.ceremony)}</span><h2 id="tournamentDrawTitle">${esc(copy.drawTitle)}</h2><p>${esc(copy.drawLead)}</p></div><div class="td-progress" role="progressbar" aria-valuemin="0" aria-valuemax="16" aria-valuenow="${state.draw.revealIndex}" aria-label="${esc(copy.drawTitle)}"><b>${state.draw.revealIndex}</b><span>/ 16</span><i style="--draw-progress:${state.draw.revealIndex/16}"></i></div></header>
      <div class="td-stage">
        <aside class="td-machine">
          <div class="td-machine-top"><span>${complete?esc(copy.drawComplete):`${esc(copy.pot)} ${currentPot}`}</span><small>${remaining} ${esc(copy.remaining)}</small></div>
          <button type="button" class="td-ball" onclick="revealTournamentBall()" ${complete?"disabled":""} aria-label="${esc(copy.drawOne)}"><span>${complete?"✓":currentPot}</span><i></i></button>
          <div class="td-live" id="tournamentDrawLive" role="status" aria-live="polite">${complete?esc(copy.allDrawn):last?`${esc(teamName(state,last.teamId))} · ${esc(copy.group)} ${last.groupId}`:next?esc(copy.nextBall):esc(copy.allDrawn)}</div>
          <div class="td-actions">${complete?`<button class="btn btn-go" onclick="finishTournamentDraw()">${esc(copy.seeGroup)}</button>`:`<button class="btn btn-primary" onclick="revealTournamentBall()">${esc(copy.drawOne)}</button><button class="btn btn-ghost" onclick="fastTournamentDraw()">${esc(copy.quickDraw)}</button>`}</div>
        </aside>
        <div class="td-groups">${state.groups.map(group=>drawGroup(state,group,copy,revealed,last&&last.teamId)).join("")}</div>
      </div>
      <p class="td-rule">${esc(copy.drawRule)}</p>
    </div>`;
  }
  function tableMarkup(state,group,copy,compact=false){
    const rows=group.table||[];
    const full=HEADER_FULL[root.LANG]||HEADER_FULL.en,head=(short,key)=>`<abbr title="${esc(full[key]||short)}">${esc(short)}</abbr>`;
    return `<div class="tg-table-wrap"><table class="tg-table"><caption>${esc(copy.group)} ${group.id}</caption><thead><tr><th scope="col">#</th><th scope="col">${esc(copy.team)}</th><th scope="col">${head(copy.played,"played")}</th><th scope="col">${head(copy.wins,"wins")}</th><th scope="col">${head(copy.draws,"draws")}</th><th scope="col">${head(copy.losses,"losses")}</th>${compact?"":`<th scope="col">${head(copy.gf,"gf")}</th><th scope="col">${head(copy.ga,"ga")}</th>`}<th scope="col">${head(copy.gd,"gd")}</th><th scope="col">${head(copy.points,"points")}</th></tr></thead><tbody>${rows.map(row=>`<tr class="${row.teamId==="player"?"is-player":""} ${row.rank<=2?"is-qualified":""}"><td><span class="tg-rank">${row.rank}</span></td><th scope="row">${esc(teamName(state,row.teamId))}</th><td>${row.played}</td><td>${row.wins}</td><td>${row.draws}</td><td>${row.losses}</td>${compact?"":`<td>${row.gf}</td><td>${row.ga}</td>`}<td>${row.gd>0?"+":""}${row.gd}</td><td><b>${row.points}</b></td></tr>`).join("")}</tbody></table></div>`;
  }
  function currentStageCopy(state,copy){
    if(state.phase==="group")return `${copy.groupMatchday} ${state.group.matchday}/3`;
    if(state.phase==="knockout")return copy[state.knockout.round]||state.knockout.round;
    if(state.player.champion)return copy.champion;
    return copy.eliminated;
  }
  function renderHub(container,state,copy){
    if(!container)return;
    if(!state||state.format!=="groups16_v1"){container.innerHTML="";container.classList.add("hidden");return;}
    container.classList.remove("hidden");
    const group=state.groups.find(item=>item.id===state.group.playerGroupId),playerRow=group&&group.table.find(row=>row.teamId==="player");
    if(state.phase==="group"){
      container.innerHTML=`<section class="tg-hub-card"><header><div><span>${esc(copy.tournament)}</span><h3>${esc(copy.group)} ${group.id}</h3></div><div class="tg-stage-chip">${esc(currentStageCopy(state,copy))}</div></header>${tableMarkup(state,group,copy,true)}<footer><span>${playerRow&&playerRow.played?`${playerRow.points} ${esc(copy.points)} · ${playerRow.gd>0?"+":""}${playerRow.gd} ${esc(copy.gd)}`:esc(copy.topTwo)}</span><button type="button" onclick="showTournamentOverview()">${esc(copy.allGroups)} →</button></footer></section>`;
    }else{
      const match=root.CopaTournamentEngine&&root.CopaTournamentEngine.getCurrentPlayerMatch(state),opponent=match&&(match.homeId==="player"?match.awayId:match.homeId);
      container.innerHTML=`<section class="tg-hub-card tg-knockout-card"><header><div><span>${esc(copy.tournament)}</span><h3>${esc(currentStageCopy(state,copy))}</h3></div><div class="tg-stage-chip">${esc(copy.knockout)}</div></header><div class="tg-next"><span>${esc(copy.nextOpponent)}</span><b>${opponent?esc(matchTeamName(state,match,opponent)):"—"}</b></div><footer><span>${esc(copy.knockoutRule)}</span><button type="button" onclick="showTournamentOverview()">${esc(copy.bracket)} →</button></footer></section>`;
    }
  }
  function knockoutMarkup(state,copy){
    const rounds=[["quarterfinal",copy.quarterfinal],["semifinal",copy.semifinal],["final",copy.final]];
    return `<div class="tg-bracket">${rounds.map(([key,label])=>`<section><h4>${esc(label)}</h4>${(state.knockout.slots[key]||[]).map(id=>{const match=state.matches[id];if(!match)return"";const score=match.status==="played"?`${match.score[0]}–${match.score[1]}${match.decidedBy==="penalties"?" p":""}`:"—";return `<div class="tg-bracket-match"><span class="${match.winnerId===match.homeId?"is-winner":""}">${esc(matchTeamName(state,match,match.homeId))}</span><b>${score}</b><span class="${match.winnerId===match.awayId?"is-winner":""}">${esc(matchTeamName(state,match,match.awayId))}</span></div>`;}).join("")||`<p>${esc(copy.pending)}</p>`}</section>`).join("")}</div>`;
  }
  function overviewMarkup(state,copy){
    return `<div class="tg-overview"><header><span>${esc(copy.cupFormat)}</span><h3>${esc(copy.tournamentOverview)}</h3><button onclick="closeModal()" aria-label="${esc(copy.close)}">×</button></header><div class="tg-tabs-copy">${esc(copy.topTwo)}</div><div class="tg-all-groups">${state.groups.map(group=>tableMarkup(state,group,copy,true)).join("")}</div>${knockoutMarkup(state,copy)}<div class="bact"><button class="btn btn-primary" onclick="closeModal()">${esc(copy.close)}</button></div></div>`;
  }
  root.CopaTournamentUI=Object.freeze({renderDraw,renderHub,tableMarkup,overviewMarkup});
})(window);
