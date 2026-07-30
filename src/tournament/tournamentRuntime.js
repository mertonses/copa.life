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
  Object.assign(COPY.tr,{drawLead:"Dört torba. Sekiz grup. Her top yeni bir yol açar.",drawRule:"Her gruba her torbadan bir takım düşer. İlk iki takım Son 16 turuna çıkar.",topTwo:"İlk iki takım Son 16 turuna çıkar",roundof16:"Son 16",qualified:"Son 16 turuna çıktın",cupFormat:"32 TAKIM · 8 GRUP"});
  Object.assign(COPY.en,{drawLead:"Four pots. Eight groups. Every ball opens a new path.",drawRule:"Each group receives one team from every pot. The top two reach the round of 16.",topTwo:"The top two reach the round of 16",roundof16:"Round of 16",qualified:"You reached the round of 16",cupFormat:"32 TEAMS · 8 GROUPS"});
  Object.assign(COPY.es,{drawLead:"Cuatro bombos. Ocho grupos. Cada bola abre un camino.",drawRule:"Cada grupo recibe un equipo de cada bombo. Los dos primeros pasan a octavos.",topTwo:"Los dos primeros pasan a octavos",roundof16:"Octavos",qualified:"Te clasificaste para octavos",cupFormat:"32 EQUIPOS · 8 GRUPOS"});
  Object.assign(COPY.de,{drawLead:"Vier Töpfe. Acht Gruppen. Jede Kugel öffnet einen neuen Weg.",drawRule:"Jede Gruppe erhält ein Team aus jedem Topf. Die ersten zwei erreichen das Achtelfinale.",topTwo:"Die ersten zwei erreichen das Achtelfinale",roundof16:"Achtelfinale",qualified:"Achtelfinale erreicht",cupFormat:"32 TEAMS · 8 GRUPPEN"});
  Object.assign(COPY.it,{drawLead:"Quattro fasce. Otto gruppi. Ogni pallina apre una nuova strada.",drawRule:"Ogni gruppo riceve una squadra da ogni fascia. Le prime due vanno agli ottavi.",topTwo:"Le prime due vanno agli ottavi",roundof16:"Ottavi",qualified:"Hai raggiunto gli ottavi",cupFormat:"32 SQUADRE · 8 GRUPPI"});
  const LAST_DRAW_KEY="copa_last_group_draw_v2";
  let inMemoryLastDraw=null;
  function copy(){return COPY[root.LANG]||COPY.en;}
  function active(){return root.tournamentFormat==="groups32_v2"&&root.tournament&&root.tournament.format==="groups32_v2";}
  function teamAsOpponent(team){return team?{name:team.name,power:team.power,formation:team.formation,style:team.style,tournamentTeamId:team.id,ghost:team.ghost===true,ghostId:team.ghostId||"",ghostProfile:team.ghostProfile||null,ghostMeta:team.ghostMeta||null}:null;}
  function opponentForMatch(state,match){
    if(!match)return null;const opponentId=match.homeId==="player"?match.awayId:match.homeId;
    if(match.ghostOpponent&&match.ghostOpponent.originalTeamId===opponentId)return Object.assign({},state.teams[opponentId],match.ghostOpponent,{id:opponentId,ghost:true});
    return state.teams[opponentId]||null;
  }
  function currentMatch(){return active()?root.CopaTournamentEngine.getCurrentPlayerMatch(root.tournament):null;}
  function repairDuplicateClubNames(state){
    const engine=root.CopaTournamentEngine;
    if(!state||!state.teams||!engine||typeof engine.sameClubIdentity!=="function")return false;
    const data=root.countryGameData(root.selectedCountry),officials=Array.isArray(data&&data[1])?data[1].filter(Boolean):[];
    const playerClubs=(Array.isArray(data&&data[0])?data[0]:[]).map(player=>{
      if(!player)return"";
      if(typeof player==="object"&&!Array.isArray(player))return player.club||player.team||"";
      return Array.isArray(player)?player[3]||"":"";
    }).filter(Boolean);
    const teams=Object.values(state.teams).filter(team=>team&&!team.isPlayer),canonical=name=>officials.find(item=>engine.sameClubIdentity(item,name))||name;
    let changed=false;
    for(const team of teams){const name=canonical(team.name);if(name!==team.name){team.name=name;changed=true;}}
    const occupied=[String(root.teamName||"").trim(),...teams.map(team=>team.name)].filter(Boolean),used=[String(root.teamName||"").trim()].filter(Boolean);
    const available=[...officials,...playerClubs];
    const orderedTeams=teams.slice().sort((left,right)=>{
      const score=name=>String(name||"").replace(/[^A-Za-z0-9\u00c0-\u024f]/g,"").length;
      return score(right.name)-score(left.name)||String(left.name).localeCompare(String(right.name));
    });
    for(const team of orderedTeams){
      if(!used.some(name=>engine.sameClubIdentity(name,team.name))){used.push(team.name);continue;}
      let replacement=available.find(name=>!occupied.some(current=>engine.sameClubIdentity(current,name)));
      if(!replacement){
        const domesticLabel=typeof root.countryDisplayName==="function"?root.countryDisplayName(root.selectedCountry,root.LANG):root.selectedCountry;
        for(let index=1;!replacement;index++){
          const candidate=`${domesticLabel} ${root.LANG==="tr"?"B\u00f6lgesel Kul\u00fcp":"Regional Club"} ${String(index).padStart(2,"0")}`;
          if(!occupied.some(current=>engine.sameClubIdentity(current,candidate)))replacement=candidate;
        }
      }
      team.name=replacement;occupied.push(replacement);used.push(replacement);changed=true;
    }
    return changed;
  }
  function syncSchedule(){
    if(!active())return false;
    const engine=root.CopaTournamentEngine,state=root.tournament,group=engine.getPlayerGroup(state);
    const repaired=repairDuplicateClubNames(state);
    const groupMatches=group.matchIds.map(id=>state.matches[id]).filter(match=>match.homeId==="player"||match.awayId==="player").sort((a,b)=>a.matchday-b.matchday);
    const byRound=[...groupMatches,null,null,null,null];
    const stageIndex={roundof16:3,quarterfinal:4,semifinal:5,final:6};
    for(const key of Object.keys(stageIndex)){for(const id of state.knockout.slots[key]||[]){const match=state.matches[id];if(match&&(match.homeId==="player"||match.awayId==="player"))byRound[stageIndex[key]]=match;}}
    const oldFixtures=Array.isArray(root.fixtures)?root.fixtures:[];root.bracket=Array.from({length:7},(_,index)=>{
      const match=byRound[index],team=opponentForMatch(state,match);return teamAsOpponent(team)||{name:copy().pending,power:index<3?60:78+index*3,pending:true};
    });
    root.fixtures=Array.from({length:7},(_,index)=>Object.assign({opp:root.bracket[index].name,res:null,gf:null,ga:null},oldFixtures[index]||{},{opp:root.bracket[index].name,matchId:byRound[index]&&byRound[index].id||""}));
    const match=currentMatch();if(match)root.opponent=teamAsOpponent(opponentForMatch(state,match));
    return repaired;
  }
  function aiSimulator(match,state){
    const home=state.teams[match.homeId],away=state.teams[match.awayId],core=root.CopaFinalSimCore;
    if(!core||typeof core.simulateMatch!=="function")return root.CopaTournamentEngine.defaultSimulator(state,match);
    if(!root.CopaTournamentMatchResolver||!root.CopaPenaltyCore)return root.CopaTournamentEngine.defaultSimulator(state,match);
    return root.CopaTournamentMatchResolver.resolveMatch({state,match,core,normal:root.CopaNormalMatch,penalty:root.CopaPenaltyCore,seed:root.CopaTournamentEngine.hashSeed(`${state.seed}|ai|${match.id}`)});
  }
  function drawEntropy(){
    try{const values=new Uint32Array(2);root.crypto.getRandomValues(values);return `${values[0]}-${values[1]}`;}catch(_){}
    return `${Date.now()}-${Math.random()}-${root.performance&&root.performance.now?root.performance.now():0}`;
  }
  function readLastDraw(){
    if(inMemoryLastDraw)return inMemoryLastDraw;
    try{const value=JSON.parse(root.localStorage.getItem(LAST_DRAW_KEY)||"null");if(value&&value.group&&value.signature)return value;}catch(_){}
    return null;
  }
  function drawIdentity(state){
    const group=root.CopaTournamentEngine.getPlayerGroup(state);
    return{
      group:group.id,
      signature:group.teamIds.filter(id=>id!=="player").map(id=>state.teams[id].name).sort().join("|")
    };
  }
  function rememberDraw(identity){
    inMemoryLastDraw=identity;
    try{root.localStorage.setItem(LAST_DRAW_KEY,JSON.stringify(identity));}catch(_){}
  }
  function createState(){
    const data=root.countryGameData(root.selectedCountry),power=root.squadPower(1).power;
    /* A national cup must remain national. Small country datasets are completed
       with domestic reserve clubs instead of silently importing foreign teams. */
    const tournamentPool=Array.isArray(data&&data[1])?data[1].slice():[];
    const playerClubs=(Array.isArray(data&&data[0])?data[0]:[]).map(player=>{
      if(!player)return"";
      if(typeof player==="object"&&!Array.isArray(player))return player.club||player.team||"";
      return Array.isArray(player)?player[3]||"":"";
    }).filter(Boolean);
    playerClubs.forEach(club=>tournamentPool.push(club));
    const domesticLabel=typeof root.countryDisplayName==="function"?root.countryDisplayName(root.selectedCountry,root.LANG):root.selectedCountry;
    const existing=new Set(tournamentPool.map(name=>String(name||"").trim().toLocaleLowerCase()).filter(Boolean));
    for(let index=1;existing.size<31;index++){
      const name=`${domesticLabel} ${root.LANG==="tr"?"Bölgesel Kulüp":"Regional Club"} ${String(index).padStart(2,"0")}`;
      const key=name.toLocaleLowerCase();if(existing.has(key))continue;
      existing.add(key);tournamentPool.push(name);
    }
    const previous=readLastDraw(),base=`${root.seedNum}|${drawEntropy()}`;let candidate=null,identity=null;
    for(let attempt=0;attempt<256;attempt++){
      candidate=root.CopaTournamentEngine.createTournament({seed:`${base}|${attempt}`,playerName:root.teamName,playerPower:power,playerFormation:root.formName,playerStyle:root.style,pool:tournamentPool,powerBases:data[2]});
      identity=drawIdentity(candidate);
      if(!previous||(identity.group!==previous.group&&identity.signature!==previous.signature))break;
    }
    candidate.countryCode=root.selectedCountry;
    root.tournament=candidate;rememberDraw(identity);
    root.tournamentFormat="groups32_v2";root._roundCompletionTracked=0;syncSchedule();
  }
  function renderDraw(){const app=document.getElementById("tournamentDrawApp");if(root.CopaTournamentUI)root.CopaTournamentUI.renderDraw(app,root.tournament,copy());}
  function startDraw(restoring){
    if(!root.CopaTournamentEngine)return false;
    if(!active()||(root.tournament.phase==="draw"&&root.tournament.countryCode!==root.selectedCountry))createState();
    if(root.CopaRunState&&root.CopaRunState.phase!=="draw"){const moved=root.CopaRunState.transition("draw",{reason:restoring?"restore_draw":"squad_complete"});if(!moved.ok)return false;}
    for(const id of ["intro","draft","hub","sim","result"]){const element=document.getElementById(id);if(element)element.classList.add("hidden");}
    const section=document.getElementById("tournamentDraw");if(section)section.classList.remove("hidden");
    document.documentElement.classList.add("tournament-draw-open");
    document.body.classList.add("tournament-draw-open");
    renderDraw();if(typeof root._saveState==="function")root._saveState("draw");
    if(!restoring&&root.CopaAnalytics)root.CopaAnalytics.track("group_draw_started",{country:root.selectedCountry,mode:"manual"});return true;
  }
  function reveal(count){
    if(!active()||root.tournament.phase!=="draw")return;
    const amount=count||1,before=root.tournament.draw.revealIndex,next=root.tournament.draw.entries[before];
    if(amount===1&&root.CopaMobileExperience)root.CopaMobileExperience.haptic([7,18,10]);
    const commit=()=>{
      if(amount===1&&typeof root.sfxDrawPick==="function")root.sfxDrawPick();
      root.CopaTournamentEngine.revealNext(root.tournament,amount);renderDraw();
      const complete=root.tournament.draw.completed;
      if(amount===1&&typeof root.sfxDrawPlace==="function")root.sfxDrawPlace(next&&next.teamId==="player");
      if((amount>1||complete)&&typeof root.sfxDrawComplete==="function")setTimeout(root.sfxDrawComplete,amount===1?120:0);
      if(root.CopaMobileExperience)root.CopaMobileExperience.haptic(next&&next.teamId==="player"?[18,28,22]:amount>1?[12,22]:14);
      if(typeof root._saveState==="function")root._saveState("draw");
    };
    /* A draw is a decision, not a loading screen. Commit immediately; CSS keeps
       the placement readable without blocking the next tap. */
    commit();
  }
  function finishDraw(){
    if(!active())return;if(!root.tournament.draw.completed)root.CopaTournamentEngine.revealNext(root.tournament,99);
    root.CopaTournamentEngine.completeDraw(root.tournament);syncSchedule();const section=document.getElementById("tournamentDraw");if(section)section.classList.add("hidden");document.documentElement.classList.remove("tournament-draw-open");document.body.classList.remove("tournament-draw-open");
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
  function renderHub(){const repaired=syncSchedule(),panel=document.getElementById("tournamentHubPanel");if(root.CopaTournamentUI)root.CopaTournamentUI.renderHub(panel,root.tournament,copy());if(root.CopaFixtureRoad)root.CopaFixtureRoad.render();else if(typeof root.renderFixtures==="function")root.renderFixtures();if(repaired&&typeof root._saveState==="function")root._saveState("hub");}
  function showOverview(){if(!active()||!root.CopaTournamentUI)return;root.showModal(root.CopaTournamentUI.overviewMarkup(root.tournament,copy()),{dismissOnOverlay:true,label:copy().tournamentOverview,sheetClass:"sheet-tournament-overview"});}
  function stage(){if(!active())return"legacy";if(root.tournament.phase==="group")return"group";if(root.tournament.phase==="knockout")return root.tournament.knockout.round;return"complete";}
  root.CopaTournamentRuntime=Object.freeze({copy,active,currentMatch,repairDuplicateClubNames,syncSchedule,startDraw,reveal,finishDraw,completePlayer,replaceCurrentOpponent,renderHub,showOverview,stage,aiSimulator});
  root.startTournamentDraw=startDraw;root.revealTournamentBall=()=>reveal(1);root.fastTournamentDraw=()=>{if(root.CopaAnalytics)root.CopaAnalytics.track("group_draw_skipped",{country:root.selectedCountry,mode:"fast"});reveal(99);};root.finishTournamentDraw=finishDraw;root.showTournamentOverview=showOverview;
})(window);
