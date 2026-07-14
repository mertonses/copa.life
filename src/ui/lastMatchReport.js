(function(global){
"use strict";

const COPY={
  tr:{last:"SON MAÇ",yours:"SENİN 11'İN",opponent:"RAKİP 11",avg:"Ort. Rating",power:"Takım Gücü",formation:"Diziliş",performance:"Son maç performansı",motm:"MAÇIN OYUNCUSU",threat:"EN ETKİLİ RAKİP",won:"GALİBİYET",lost:"MAĞLUBİYET",draw:"BERABERLİK",penWon:"PENALTILARLA GALİBİYET",penLost:"PENALTILARLA MAĞLUBİYET",champion:"Şampiyonluğu getiren final",exit:"Kupaya veda ettiğin maç",lastValid:"Run'ın son oynanan maçı",goal:"Gol",assist:"Asist",yellow:"Sarı kart",red:"Kırmızı kart",injury:"Sakatlık",star:"Maçın oyuncusu",pen:"Pen."},
  en:{last:"LAST MATCH",yours:"YOUR XI",opponent:"OPPONENT XI",avg:"Avg. Rating",power:"Team Power",formation:"Formation",performance:"Last-match performance",motm:"PLAYER OF THE MATCH",threat:"TOP OPPONENT",won:"WIN",lost:"DEFEAT",draw:"DRAW",penWon:"WIN ON PENALTIES",penLost:"DEFEAT ON PENALTIES",champion:"The final that delivered the title",exit:"The match that ended your cup run",lastValid:"The run's last played match",goal:"Goal",assist:"Assist",yellow:"Yellow card",red:"Red card",injury:"Injury",star:"Player of the match",pen:"Pens"},
  es:{last:"ÚLTIMO PARTIDO",yours:"TU XI",opponent:"XI RIVAL",avg:"Nota media",power:"Fuerza",formation:"Formación",performance:"Rendimiento del último partido",motm:"JUGADOR DEL PARTIDO",threat:"RIVAL MÁS DESTACADO",won:"VICTORIA",lost:"DERROTA",draw:"EMPATE",penWon:"VICTORIA EN PENALTIS",penLost:"DERROTA EN PENALTIS",champion:"La final que dio el título",exit:"El partido de la eliminación",lastValid:"Último partido disputado",goal:"Gol",assist:"Asistencia",yellow:"Tarjeta amarilla",red:"Tarjeta roja",injury:"Lesión",star:"Jugador del partido",pen:"Pen."},
  de:{last:"LETZTES SPIEL",yours:"DEINE ELF",opponent:"GEGNERISCHE ELF",avg:"Ø Bewertung",power:"Teamstärke",formation:"Formation",performance:"Leistung im letzten Spiel",motm:"SPIELER DES SPIELS",threat:"STÄRKSTER GEGNER",won:"SIEG",lost:"NIEDERLAGE",draw:"REMIS",penWon:"SIEG IM ELFERSCHIESSEN",penLost:"NIEDERLAGE IM ELFERSCHIESSEN",champion:"Das Finale zum Titel",exit:"Das Ausscheidungsspiel",lastValid:"Das letzte gespielte Match",goal:"Tor",assist:"Vorlage",yellow:"Gelbe Karte",red:"Rote Karte",injury:"Verletzung",star:"Spieler des Spiels",pen:"Elf."},
  it:{last:"ULTIMA PARTITA",yours:"IL TUO XI",opponent:"XI AVVERSARIO",avg:"Media voto",power:"Forza squadra",formation:"Modulo",performance:"Prestazione nell'ultima partita",motm:"UOMO PARTITA",threat:"MIGLIOR AVVERSARIO",won:"VITTORIA",lost:"SCONFITTA",draw:"PAREGGIO",penWon:"VITTORIA AI RIGORI",penLost:"SCONFITTA AI RIGORI",champion:"La finale che ha dato il titolo",exit:"La partita dell'eliminazione",lastValid:"L'ultima partita giocata",goal:"Gol",assist:"Assist",yellow:"Cartellino giallo",red:"Cartellino rosso",injury:"Infortunio",star:"Uomo partita",pen:"Rig."}
};
const STAGES={
  tr:["1. TUR","2. TUR","SON 16","ÇEYREK FİNAL","YARI FİNAL","FİNAL"],
  en:["ROUND 1","ROUND 2","LAST 16","QUARTER FINAL","SEMI FINAL","FINAL"],
  es:["1.ª RONDA","2.ª RONDA","OCTAVOS","CUARTOS","SEMIFINAL","FINAL"],
  de:["1. RUNDE","2. RUNDE","ACHTELFINALE","VIERTELFINALE","HALBFINALE","FINALE"],
  it:["1° TURNO","2° TURNO","OTTAVI","QUARTI","SEMIFINALE","FINALE"]
};

function esc(value){return String(value==null?"":value).replace(/[&<>"']/g,function(char){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char];});}
function clamp(value,min,max){return Math.max(min,Math.min(max,Number(value)||0));}
function finite(value){const number=Number(value);return Number.isFinite(number)?number:null;}
function norm(value){return String(value||"").toLocaleLowerCase("tr-TR").normalize("NFKD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g," ").trim();}
function surname(value){const parts=String(value||"").trim().split(/\s+/).filter(Boolean);return parts.length?parts[parts.length-1]:"?";}
function nameMatches(playerName,eventName){const player=norm(playerName),event=norm(eventName);return !!player&&!!event&&(player===event||norm(surname(playerName))===event||player===norm(surname(eventName)));}
function parseScore(value){const parts=String(value||"").match(/(\d+)\s*[–-]\s*(\d+)/);return parts?[Number(parts[1]),Number(parts[2])]:null;}
function slotCopy(slot,player,index){const value=Array.isArray(slot)?slot:[];return[String(value[0]||(player&&player.pos)||"?"),clamp(value[1]==null?50:value[1],0,100),clamp(value[2]==null?50:value[2],0,100),index];}
function playerCopy(player){return player&&typeof player==="object"?Object.assign({},player):null;}
function normalizeEvent(event){
  const value=event&&typeof event==="object"?event:{};
  const side=value.home===true?"home":value.home===false?"away":value.side==="A"?"home":value.side==="B"?"away":"";
  const rawType=String(value.type||"").toLowerCase(),type=rawType==="red_card"?"red":rawType==="yellow_card"?"yellow":rawType;
  return{side:side,type:type,name:value.name||value.scorer||value.player||"",assist:value.assist||"",minute:finite(value.minute==null?value.m:value.minute)};
}
function eventStats(player,events,side){
  const stats={goals:0,assists:0,yellow:0,red:0,saves:0,injured:!!(player&&player.injured)};
  events.forEach(function(event){
    if(event.side!==side)return;
    if(event.type==="goal"&&nameMatches(player.name,event.name))stats.goals++;
    if(event.type==="goal"&&event.assist&&nameMatches(player.name,event.assist))stats.assists++;
    if(event.type==="yellow"&&nameMatches(player.name,event.name))stats.yellow++;
    if(event.type==="red"&&nameMatches(player.name,event.name))stats.red++;
    if(event.type==="save"&&nameMatches(player.name,event.name))stats.saves++;
    if(event.type==="injury"&&nameMatches(player.name,event.name))stats.injured=true;
  });
  return stats;
}
function providedRating(provided,player){
  if(!Array.isArray(provided))return null;
  const found=provided.find(function(item){return item&&nameMatches(player.name,item.name);});
  const rating=found&&finite(found.rating);return rating==null?null:rating;
}
function establishedRating(player,index,stats,sideScore,otherScore,seed){
  const group=String(player&&player.grp||"").toUpperCase()||(typeof global.groupOf==="function"?global.groupOf(player.pos):"");
  let rating=6;rating+=stats.goals*1.5+stats.assists*.7;rating+=sideScore>otherScore ? .3 : sideScore<otherScore ? -.25 : 0;
  if(group==="GK")rating+=otherScore===0 ? .8 : -otherScore*.25;else if(group==="DEF"&&otherScore===0)rating+=.3;
  rating+=(Math.sin((Number(seed)||0)*31+index*17)*.5+.5)*.6-.3;
  return Math.round(clamp(rating,4.5,9.5)*10)/10;
}
function buildSide(players,slots,events,side,score,seed,provided){
  return players.slice(0,11).map(function(source,index){
    const player=playerCopy(source),slot=slotCopy(slots[index],player,index),stats=eventStats(player,events,side),given=providedRating(provided,player);
    const rating=given==null?establishedRating(player,index,stats,side==="home"?score[0]:score[1],side==="home"?score[1]:score[0],seed):given;
    return{player:player,slot:slot,name:player.name||("Player "+(index+1)),pos:slot[0],rating:Math.round(rating*10)/10,stats:stats,index:index};
  });
}
function bestOf(players){return players.length?players.reduce(function(best,item){return !best||item.rating>best.rating?item:best;},null):null;}
function average(players){return players.length?Math.round(players.reduce(function(total,item){return total+item.rating;},0)/players.length*10)/10:null;}
function formationSlots(name,fallback){const source=global.FORMATIONS&&global.FORMATIONS[name];return Array.isArray(source)?source:(Array.isArray(fallback)?fallback:[]);}

function capture(input){
  const value=input&&typeof input==="object"?input:{},homePlayers=(value.homePlayers||[]).filter(Boolean).slice(0,11),awayPlayers=(value.awayPlayers||[]).filter(Boolean).slice(0,11);
  if(!homePlayers.length||!awayPlayers.length)return null;
  const score=Array.isArray(value.score)?[Number(value.score[0])||0,Number(value.score[1])||0]:(parseScore(value.score)||[0,0]);
  const events=(value.events||[]).map(normalizeEvent).filter(function(event){return event.side;});
  const homeFormation=value.homeFormation||"4-3-3",awayFormation=value.awayFormation||"4-3-3";
  const homeSlots=Array.isArray(value.homeSlots)&&value.homeSlots.length?value.homeSlots:formationSlots(homeFormation,[]),awaySlots=Array.isArray(value.awaySlots)&&value.awaySlots.length?value.awaySlots:formationSlots(awayFormation,[]);
  const seed=Number(value.seed)||0,home=buildSide(homePlayers,homeSlots,events,"home",score,seed,value.homeRatings),away=buildSide(awayPlayers,awaySlots,events,"away",score,seed+97,value.awayRatings);
  const report={version:1,round:Math.max(1,Number(value.round)||1),isFinal:!!value.isFinal||Number(value.round)>=6,homeName:String(value.homeName||"XI"),awayName:String(value.awayName||"Opponent"),homeFormation:homeFormation,awayFormation:awayFormation,homePower:finite(value.homePower),awayPower:finite(value.awayPower),score:score,penalty:null,homeWon:value.homeWon==null?score[0]>score[1]:!!value.homeWon,events:events,home:home,away:away,homeAverage:average(home),awayAverage:average(away)};
  const namedMotm=String(value.motm||"");report.motm=home.concat(away).find(function(item){return namedMotm&&nameMatches(item.name,namedMotm);})||bestOf(home.concat(away));report.bestOpponent=bestOf(away);
  global.lastMatchReportData=report;return report;
}
function setPenalty(baseScore,shootout,homeWon){
  const report=global.lastMatchReportData;if(!report)return null;
  const base=parseScore(baseScore);if(base)report.score=base;
  const penalty=parseScore(shootout);if(penalty)report.penalty=penalty;
  report.homeWon=!!homeWon;return report;
}
function ratingTone(value){return value>=9?"star":value>=8?"elite":value>=7.5?"strong":value>=7?"good":value>=6.5?"decent":value>=6?"average":value>=5.5?"weak":"poor";}
function positionFor(slot,side){
  const lateral=clamp(slot[1],0,100),depth=clamp(slot[2],0,100),x=side==="home"?7+(100-depth)*.41:93-(100-depth)*.41,y=side==="home"?7+lateral*.86:93-lateral*.86;
  return{x:Math.round(x*10)/10,y:Math.round(y*10)/10};
}
function eventBadges(item,copy){
  const badges=[];
  if(item.stats.goals)badges.push('<span class="lmr-event lmr-goal" title="'+esc(copy.goal)+'" aria-label="'+esc(copy.goal)+'">⚽'+(item.stats.goals>1?'×'+item.stats.goals:'')+'</span>');
  if(item.stats.assists)badges.push('<span class="lmr-event lmr-assist" title="'+esc(copy.assist)+'" aria-label="'+esc(copy.assist)+'">↗'+(item.stats.assists>1?'×'+item.stats.assists:'')+'</span>');
  if(item.stats.yellow)badges.push('<span class="lmr-event lmr-yellow" title="'+esc(copy.yellow)+'" aria-label="'+esc(copy.yellow)+'"></span>');
  if(item.stats.red)badges.push('<span class="lmr-event lmr-red" title="'+esc(copy.red)+'" aria-label="'+esc(copy.red)+'"></span>');
  if(item.stats.injured)badges.push('<span class="lmr-event lmr-injury" title="'+esc(copy.injury)+'" aria-label="'+esc(copy.injury)+'">+</span>');
  return badges.join("");
}
function playerToken(item,side,copy,isMotm){
  const point=positionFor(item.slot,side),tone=ratingTone(item.rating),label=item.name+" · "+copy.performance+" "+item.rating.toFixed(1);
  return '<button type="button" class="lmr-player is-'+side+(isMotm?' is-motm':'')+'" style="--lmr-x:'+point.x+'%;--lmr-y:'+point.y+'%" data-lmr-team="'+side+'" data-lmr-index="'+item.index+'" aria-label="'+esc(label)+'"><span class="lmr-token"><small>'+esc(item.pos)+'</small><strong class="is-'+tone+'">'+item.rating.toFixed(1)+'</strong></span><span class="lmr-name">'+esc(surname(item.name))+'</span><span class="lmr-events">'+(isMotm?'<i title="'+esc(copy.star)+'" aria-label="'+esc(copy.star)+'">★</i>':'')+eventBadges(item,copy)+'</span></button>';
}
function teamHeader(side,label,name,formation,avg,power,copy){
  return '<div class="lmr-team-head is-'+side+'"><span>'+esc(label)+'</span><strong>'+esc(name)+'</strong><small>'+esc(copy.avg)+' <b class="is-'+ratingTone(avg||0)+'">'+(avg==null?'—':avg.toFixed(1))+'</b> · '+esc(copy.formation)+' '+esc(formation)+(power==null?'':' · '+esc(copy.power)+' '+Math.round(power))+'</small></div>';
}
function stageFor(report,lang){const list=STAGES[lang]||STAGES.en;return list[Math.max(0,Math.min(5,report.round-1))]||COPY[lang].last;}
function outcomeFor(report,copy){if(report.penalty)return report.homeWon?copy.penWon:copy.penLost;if(report.score[0]===report.score[1])return copy.draw;return report.homeWon?copy.won:copy.lost;}
function sublineFor(report,copy,result){if(result&&result.endType==="sacked")return copy.lastValid;if(report.isFinal&&report.homeWon)return copy.champion;if(!report.homeWon)return copy.exit;return copy.lastValid;}
function summaryCard(label,item,copy,side){if(!item)return"";return '<div class="lmr-summary-card" data-lmr-summary-team="'+side+'" data-lmr-summary-index="'+item.index+'"><span>'+esc(label)+'</span><strong>'+esc(item.name)+'</strong><b class="is-'+ratingTone(item.rating)+'">'+item.rating.toFixed(1)+'</b></div>';}
function bindProfiles(container,report){
  if(!global.PlayerProfiles)return;
  container.querySelectorAll("[data-lmr-team]").forEach(function(node){const team=node.dataset.lmrTeam==="home"?report.home:report.away,item=team[Number(node.dataset.lmrIndex)];if(item&&item.player)global.PlayerProfiles.bind(node,item.player);});
  container.querySelectorAll("[data-lmr-summary-team]").forEach(function(node){const team=node.dataset.lmrSummaryTeam==="home"?report.home:report.away,item=team[Number(node.dataset.lmrSummaryIndex)];if(item&&item.player)global.PlayerProfiles.bind(node,item.player);});
}
function render(container,report,options){
  if(!container||!report||!report.home||!report.home.length||!report.away||!report.away.length)return false;
  const opts=options||{},lang=COPY[opts.lang]?opts.lang:"en",copy=COPY[lang],stage=stageFor(report,lang),homeWinner=report.homeWon,awayWinner=!report.homeWon&&report.score[0]!==report.score[1]||!!report.penalty&&!report.homeWon;
  container.innerHTML='<section class="last-match-report"><header class="lmr-header"><div class="lmr-kicker"><span>'+esc(copy.last)+'</span><b>'+esc(stage)+'</b></div><p>'+esc(sublineFor(report,copy,opts.result))+'</p><div class="lmr-score"><strong class="lmr-club'+(homeWinner?' is-winner':'')+'">'+esc(report.homeName)+'</strong><div class="lmr-scoreline"><b>'+report.score[0]+'<i>–</i>'+report.score[1]+'</b>'+(report.penalty?'<span>'+esc(copy.pen)+' '+report.penalty[0]+'–'+report.penalty[1]+'</span>':'')+'</div><strong class="lmr-club'+(awayWinner?' is-winner':'')+'">'+esc(report.awayName)+'</strong></div><span class="lmr-outcome is-'+(report.homeWon?'positive':'negative')+'">'+esc(outcomeFor(report,copy))+'</span></header><div class="lmr-team-row">'+teamHeader("home",copy.yours,report.homeName,report.homeFormation,report.homeAverage,report.homePower,copy)+teamHeader("away",copy.opponent,report.awayName,report.awayFormation,report.awayAverage,report.awayPower,copy)+'</div><div class="lmr-pitch" role="group" aria-label="'+esc(copy.performance)+'"><div class="lmr-pitch-lines" aria-hidden="true"><i class="lmr-half"></i><i class="lmr-circle"></i><i class="lmr-box is-left"></i><i class="lmr-box is-right"></i><i class="lmr-goal is-left"></i><i class="lmr-goal is-right"></i><i class="lmr-spot is-left"></i><i class="lmr-spot is-right"></i></div>'+report.home.map(function(item){return playerToken(item,"home",copy,report.motm===item);}).join("")+report.away.map(function(item){return playerToken(item,"away",copy,report.motm===item);}).join("")+'<span class="lmr-legend">'+esc(copy.performance)+'</span></div><div class="lmr-summary">'+summaryCard(copy.motm,report.motm,copy,report.home.includes(report.motm)?"home":"away")+summaryCard(copy.threat,report.bestOpponent,copy,"away")+'</div></section>';
  bindProfiles(container,report);return true;
}

global.LastMatchReport={capture:capture,setPenalty:setPenalty,render:render,_ratingToneForTest:ratingTone,_positionForTest:positionFor,_establishedRatingForTest:establishedRating};
})(window);
