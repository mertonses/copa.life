/* Bridges the DOM-free tournament engine to the existing run orchestrator. */
(function(root){
  "use strict";
  const COPY={
    tr:{ceremony:"CANLI KURA",drawTitle:"Kupa grup kurası",drawLead:"Dört torba. Dört grup. Her top yeni bir yol açar.",group:"Grup",pot:"Torba",remaining:"takım kaldı",drawOne:"Topu çek",quickDraw:"Hızlı kura",drawComplete:"Kura tamamlandı",nextBall:"Sıradaki top hazır",allDrawn:"Tüm gruplar belli oldu",seeGroup:"GRUBUMU GÖR",drawRule:"Her gruba her torbadan bir takım düşer. İlk iki takım çeyrek finale çıkar.",tournament:"KUPA YOLU",team:"Takım",played:"O",wins:"G",draws:"B",losses:"M",gf:"AG",ga:"YG",gd:"AV",points:"P",groupMatchday:"Grup maçı",topTwo:"İlk iki takım çeyrek finale çıkar",allGroups:"Tüm gruplar",knockout:"ELEME",nextOpponent:"Sıradaki rakip",knockoutRule:"Çeyrek ve yarı final beraberliği doğrudan penaltıya gider; finalde Altın Gol ve ardından penaltılar uygulanır.",bracket:"Eleme ağacı",quarterfinal:"Çeyrek final",semifinal:"Yarı final",final:"Final",champion:"Şampiyon",eliminated:"Elendi",pending:"Henüz belli değil",cupFormat:"16 TAKIM · 4 GRUP",tournamentOverview:"Turnuva merkezi",close:"Kapat",groupDraw:"Grup kurası",qualified:"Çeyrek finale çıktın",groupEliminated:"Grup aşamasında elendin",backToTable:"TABLOYA DÖN",drawPoint:"BERABERLİK · +1 PUAN",winPoints:"GALİBİYET · +3 PUAN",lossPoints:"MAĞLUBİYET · 0 PUAN"},
    en:{ceremony:"LIVE DRAW",drawTitle:"Cup group draw",drawLead:"Four pots. Four groups. Every ball opens a new path.",group:"Group",pot:"Pot",remaining:"teams left",drawOne:"Draw ball",quickDraw:"Quick draw",drawComplete:"Draw complete",nextBall:"Next ball is ready",allDrawn:"All groups are set",seeGroup:"SEE MY GROUP",drawRule:"Each group receives one team from every pot. The top two reach the quarter-finals.",tournament:"CUP ROAD",team:"Team",played:"P",wins:"W",draws:"D",losses:"L",gf:"GF",ga:"GA",gd:"GD",points:"Pts",groupMatchday:"Group match",topTwo:"The top two reach the quarter-finals",allGroups:"All groups",knockout:"KNOCKOUT",nextOpponent:"Next opponent",knockoutRule:"Quarter-final and semi-final draws go straight to penalties; the final uses Golden Goal, then penalties.",bracket:"Bracket",quarterfinal:"Quarter-final",semifinal:"Semi-final",final:"Final",champion:"Champion",eliminated:"Eliminated",pending:"To be decided",cupFormat:"16 TEAMS · 4 GROUPS",tournamentOverview:"Tournament centre",close:"Close",groupDraw:"Group draw",qualified:"You reached the quarter-finals",groupEliminated:"Eliminated in the group stage",backToTable:"BACK TO TABLE",drawPoint:"DRAW · +1 POINT",winPoints:"WIN · +3 POINTS",lossPoints:"LOSS · 0 POINTS"},
    es:{ceremony:"SORTEO EN VIVO",drawTitle:"Sorteo de grupos",drawLead:"Cuatro bombos. Cuatro grupos. Cada bola abre un camino.",group:"Grupo",pot:"Bombo",remaining:"equipos restantes",drawOne:"Sacar bola",quickDraw:"Sorteo rápido",drawComplete:"Sorteo completo",nextBall:"La siguiente bola está lista",allDrawn:"Todos los grupos están listos",seeGroup:"VER MI GRUPO",drawRule:"Cada grupo recibe un equipo de cada bombo. Los dos primeros pasan a cuartos.",tournament:"CAMINO A LA COPA",team:"Equipo",played:"PJ",wins:"G",draws:"E",losses:"P",gf:"GF",ga:"GC",gd:"DG",points:"Pts",groupMatchday:"Partido de grupo",topTwo:"Los dos primeros pasan a cuartos",allGroups:"Todos los grupos",knockout:"ELIMINATORIA",nextOpponent:"Próximo rival",knockoutRule:"Los empates de cuartos y semifinales van directamente a penaltis; la final usa Gol de Oro y después penaltis.",bracket:"Cuadro",quarterfinal:"Cuartos",semifinal:"Semifinal",final:"Final",champion:"Campeón",eliminated:"Eliminado",pending:"Por decidir",cupFormat:"16 EQUIPOS · 4 GRUPOS",tournamentOverview:"Centro del torneo",close:"Cerrar",groupDraw:"Sorteo de grupos",qualified:"Te clasificaste para cuartos",groupEliminated:"Eliminado en la fase de grupos",backToTable:"VOLVER A LA TABLA",drawPoint:"EMPATE · +1 PUNTO",winPoints:"VICTORIA · +3 PUNTOS",lossPoints:"DERROTA · 0 PUNTOS"},
    de:{ceremony:"LIVE-AUSLOSUNG",drawTitle:"Pokal-Gruppenauslosung",drawLead:"Vier Töpfe. Vier Gruppen. Jede Kugel öffnet einen neuen Weg.",group:"Gruppe",pot:"Topf",remaining:"Teams übrig",drawOne:"Kugel ziehen",quickDraw:"Schnellauslosung",drawComplete:"Auslosung beendet",nextBall:"Die nächste Kugel ist bereit",allDrawn:"Alle Gruppen stehen fest",seeGroup:"MEINE GRUPPE",drawRule:"Jede Gruppe erhält ein Team aus jedem Topf. Die ersten zwei erreichen das Viertelfinale.",tournament:"POKALWEG",team:"Team",played:"Sp",wins:"S",draws:"U",losses:"N",gf:"TF",ga:"TG",gd:"TD",points:"Pkt",groupMatchday:"Gruppenspiel",topTwo:"Die ersten zwei erreichen das Viertelfinale",allGroups:"Alle Gruppen",knockout:"K.-O.",nextOpponent:"Nächster Gegner",knockoutRule:"Remis im Viertel- und Halbfinale gehen direkt ins Elfmeterschießen; im Finale folgen Golden Goal und danach Elfmeter.",bracket:"Turnierbaum",quarterfinal:"Viertelfinale",semifinal:"Halbfinale",final:"Finale",champion:"Champion",eliminated:"Ausgeschieden",pending:"Noch offen",cupFormat:"16 TEAMS · 4 GRUPPEN",tournamentOverview:"Turnierzentrale",close:"Schließen",groupDraw:"Gruppenauslosung",qualified:"Viertelfinale erreicht",groupEliminated:"In der Gruppenphase ausgeschieden",backToTable:"ZUR TABELLE",drawPoint:"REMIS · +1 PUNKT",winPoints:"SIEG · +3 PUNKTE",lossPoints:"NIEDERLAGE · 0 PUNKTE"},
    it:{ceremony:"SORTEGGIO LIVE",drawTitle:"Sorteggio dei gironi",drawLead:"Quattro fasce. Quattro gruppi. Ogni pallina apre una nuova strada.",group:"Gruppo",pot:"Fascia",remaining:"squadre rimaste",drawOne:"Estrai",quickDraw:"Sorteggio rapido",drawComplete:"Sorteggio completato",nextBall:"La prossima pallina è pronta",allDrawn:"Tutti i gruppi sono definiti",seeGroup:"VEDI IL MIO GRUPPO",drawRule:"Ogni gruppo riceve una squadra da ogni fascia. Le prime due vanno ai quarti.",tournament:"CAMMINO DI COPPA",team:"Squadra",played:"G",wins:"V",draws:"N",losses:"P",gf:"GF",ga:"GS",gd:"DR",points:"Pt",groupMatchday:"Gara del girone",topTwo:"Le prime due vanno ai quarti",allGroups:"Tutti i gruppi",knockout:"ELIMINAZIONE",nextOpponent:"Prossimo avversario",knockoutRule:"I pareggi nei quarti e nelle semifinali vanno direttamente ai rigori; in finale si gioca il Golden Goal e poi i rigori.",bracket:"Tabellone",quarterfinal:"Quarti",semifinal:"Semifinale",final:"Finale",champion:"Campione",eliminated:"Eliminato",pending:"Da definire",cupFormat:"16 SQUADRE · 4 GRUPPI",tournamentOverview:"Centro torneo",close:"Chiudi",groupDraw:"Sorteggio gironi",qualified:"Hai raggiunto i quarti",groupEliminated:"Eliminato nella fase a gironi",backToTable:"TORNA ALLA CLASSIFICA",drawPoint:"PAREGGIO · +1 PUNTO",winPoints:"VITTORIA · +3 PUNTI",lossPoints:"SCONFITTA · 0 PUNTI"}
  };
  function copy(){return COPY[root.LANG]||COPY.en;}
  function active(){return root.tournamentFormat==="groups16_v1"&&root.tournament&&root.tournament.format==="groups16_v1";}
  function teamAsOpponent(team){return team?{name:team.name,power:team.power,formation:team.formation,style:team.style,tournamentTeamId:team.id,ghost:team.ghost===true,ghostId:team.ghostId||"",ghostProfile:team.ghostProfile||null,ghostMeta:team.ghostMeta||null}:null;}
  function opponentForMatch(state,match){
    if(!match)return null;const opponentId=match.homeId==="player"?match.awayId:match.homeId;
    if(match.ghostOpponent&&match.ghostOpponent.originalTeamId===opponentId)return Object.assign({},state.teams[opponentId],match.ghostOpponent,{id:opponentId,ghost:true});
    return state.teams[opponentId]||null;
  }
  function currentMatch(){return active()?root.CopaTournamentEngine.getCurrentPlayerMatch(root.tournament):null;}
  function syncSchedule(){
    if(!active())return;
    const engine=root.CopaTournamentEngine,state=root.tournament,group=engine.getPlayerGroup(state);
    const groupMatches=group.matchIds.map(id=>state.matches[id]).filter(match=>match.homeId==="player"||match.awayId==="player").sort((a,b)=>a.matchday-b.matchday);
    const byRound=[...groupMatches,null,null,null];
    const stageIndex={quarterfinal:3,semifinal:4,final:5};
    for(const key of Object.keys(stageIndex)){for(const id of state.knockout.slots[key]||[]){const match=state.matches[id];if(match&&(match.homeId==="player"||match.awayId==="player"))byRound[stageIndex[key]]=match;}}
    const oldFixtures=Array.isArray(root.fixtures)?root.fixtures:[];root.bracket=Array.from({length:6},(_,index)=>{
      const match=byRound[index],team=opponentForMatch(state,match);return teamAsOpponent(team)||{name:copy().pending,power:index<3?60:78+index*3,pending:true};
    });
    root.fixtures=Array.from({length:6},(_,index)=>Object.assign({opp:root.bracket[index].name,res:null,gf:null,ga:null},oldFixtures[index]||{},{opp:root.bracket[index].name,matchId:byRound[index]&&byRound[index].id||""}));
    const match=currentMatch();if(match)root.opponent=teamAsOpponent(opponentForMatch(state,match));
  }
  function aiSimulator(match,state){
    const home=state.teams[match.homeId],away=state.teams[match.awayId],core=root.CopaFinalSimCore;
    if(!core||typeof core.simulateMatch!=="function")return root.CopaTournamentEngine.defaultSimulator(state,match);
    if(!root.CopaTournamentMatchResolver||!root.CopaPenaltyCore)return root.CopaTournamentEngine.defaultSimulator(state,match);
    return root.CopaTournamentMatchResolver.resolveMatch({state,match,core,normal:root.CopaNormalMatch,penalty:root.CopaPenaltyCore,seed:root.CopaTournamentEngine.hashSeed(`${state.seed}|ai|${match.id}`)});
  }
  function createState(){
    const data=root.countryGameData(root.selectedCountry),power=root.squadPower(1).power;
    root.tournament=root.CopaTournamentEngine.createTournament({seed:root.seedNum,playerName:root.teamName,playerPower:power,playerFormation:root.formName,playerStyle:root.style,pool:data[1],powerBases:data[2]});
    root.tournamentFormat="groups16_v1";root._roundCompletionTracked=0;syncSchedule();
  }
  function renderDraw(){const app=document.getElementById("tournamentDrawApp");if(root.CopaTournamentUI)root.CopaTournamentUI.renderDraw(app,root.tournament,copy());}
  function startDraw(restoring){
    if(!root.CopaTournamentEngine)return false;if(!active())createState();
    if(root.CopaRunState&&root.CopaRunState.phase!=="draw"){const moved=root.CopaRunState.transition("draw",{reason:restoring?"restore_draw":"squad_complete"});if(!moved.ok)return false;}
    for(const id of ["intro","draft","hub","sim","result"]){const element=document.getElementById(id);if(element)element.classList.add("hidden");}
    const section=document.getElementById("tournamentDraw");if(section)section.classList.remove("hidden");
    renderDraw();if(typeof root._saveState==="function")root._saveState("draw");
    if(!restoring&&root.CopaAnalytics)root.CopaAnalytics.track("group_draw_started",{country:root.selectedCountry,mode:"manual"});return true;
  }
  function reveal(count){if(!active()||root.tournament.phase!=="draw")return;root.CopaTournamentEngine.revealNext(root.tournament,count||1);renderDraw();if(typeof root._saveState==="function")root._saveState("draw");}
  function finishDraw(){
    if(!active())return;if(!root.tournament.draw.completed)root.CopaTournamentEngine.revealNext(root.tournament,99);
    root.CopaTournamentEngine.completeDraw(root.tournament);syncSchedule();const section=document.getElementById("tournamentDraw");if(section)section.classList.add("hidden");
    if(root.CopaAnalytics)root.CopaAnalytics.track("group_draw_completed",{country:root.selectedCountry,mode:"complete"});root.enterHub();
  }
  function completePlayer(gf,ga,options){
    if(!active())return null;const match=currentMatch();if(!match)return null;const opts=options||{},playerHome=match.homeId==="player",score=playerHome?[Number(gf)||0,Number(ga)||0]:[Number(ga)||0,Number(gf)||0];
    const winnerId=match.stage==="group"&&gf===ga?null:gf===ga?(opts.playerWon===true?"player":opts.playerWon===false?(playerHome?match.awayId:match.homeId):null):(gf>ga?"player":playerHome?match.awayId:match.homeId);
    const suppliedFairPlay=opts.fairPlay||{},fairPlay=("player" in suppliedFairPlay||"opponent" in suppliedFairPlay)?(playerHome?{home:Number(suppliedFairPlay.player)||0,away:Number(suppliedFairPlay.opponent)||0}:{home:Number(suppliedFairPlay.opponent)||0,away:Number(suppliedFairPlay.player)||0}):{home:Number(suppliedFairPlay.home)||0,away:Number(suppliedFairPlay.away)||0};
    const result=root.CopaTournamentEngine.completePlayerMatch(root.tournament,{score,winnerId,decidedBy:opts.decidedBy||"regulation",fairPlay},aiSimulator);syncSchedule();
    const outcome=gf===ga&&opts.playerWon!=null?(opts.playerWon?"win":"loss"):(gf>ga?"win":gf===ga?"draw":"loss");
    if(root.CopaAnalytics)root.CopaAnalytics.track("tournament_match_resolved",{stage:match.stage==="group"?"group":match.round,outcome,decided_by:opts.decidedBy||"regulation",group_matchday:match.matchday||0,qualified:result.qualified===true?"yes":result.qualified===false?"no":"pending"});
    return result;
  }
  function replaceCurrentOpponent(ghost){
    if(!active()||!ghost||root.tournament.phase!=="knockout"||root.tournament.knockout.round==="final")return false;
    const match=currentMatch();if(!match||match.status!=="scheduled")return false;
    const opponentId=match.homeId==="player"?match.awayId:match.homeId,original=root.tournament.teams[opponentId];if(!original)return false;
    match.ghostOpponent={originalTeamId:opponentId,name:String(ghost.name||original.name),power:Math.max(35,Math.min(115,Math.round(Number(ghost.power)||original.power))),formation:ghost.formation||ghost.ghostMeta&&ghost.ghostMeta.formation||original.formation,style:ghost.style||original.style,ghost:true,ghostId:ghost.ghostId||"",ghostProfile:ghost.ghostProfile||null,ghostMeta:ghost.ghostMeta||null};
    syncSchedule();return true;
  }
  function renderHub(){const panel=document.getElementById("tournamentHubPanel");if(root.CopaTournamentUI)root.CopaTournamentUI.renderHub(panel,root.tournament,copy());}
  function showOverview(){if(!active()||!root.CopaTournamentUI)return;root.showModal(root.CopaTournamentUI.overviewMarkup(root.tournament,copy()),{dismissOnOverlay:true,label:copy().tournamentOverview});}
  function stage(){if(!active())return"legacy";if(root.tournament.phase==="group")return"group";if(root.tournament.phase==="knockout")return root.tournament.knockout.round;return"complete";}
  root.CopaTournamentRuntime=Object.freeze({copy,active,currentMatch,syncSchedule,startDraw,reveal,finishDraw,completePlayer,replaceCurrentOpponent,renderHub,showOverview,stage,aiSimulator});
  root.startTournamentDraw=startDraw;root.revealTournamentBall=()=>reveal(1);root.fastTournamentDraw=()=>{if(root.CopaAnalytics)root.CopaAnalytics.track("group_draw_skipped",{country:root.selectedCountry,mode:"fast"});reveal(99);};root.finishTournamentDraw=finishDraw;root.showTournamentOverview=showOverview;
})(window);
