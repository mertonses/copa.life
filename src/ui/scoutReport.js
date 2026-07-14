(function(global){
"use strict";

const COPY={
  tr:{report:"SCOUT RAPORU",squad:"RAKİP KADROSU",overall:"GENEL",formation:"DİZİLİŞ",playStyle:"Oyun stili",weakSide:"Zayıf taraf",teamStrength:"Takım gücü",estimatedFormation:"Tahmini diziliş",projectedXI:"TAHMİNİ 11",weakArea:"Zayıf alan",attackDirection:"Hücum yönü",flanks:{L:"sol koridor",C:"merkez",R:"sağ koridor"},keyPlayers:"KİLİT OYUNCULAR",highest:"En yüksek puan",fastest:"En hızlı",playmaker:"Oyun kurucu",watchOut:"DİKKAT",strongTransitions:"Geçiş hücumlarında güçlü",dangerousCrosses:"Ortalarla tehlikeli",weakPressing:"Pres altında pas kalitesi düşüyor",aggressivePress:"Önde agresif pres yapıyor",compactBlock:"Kompakt savunma bloğu kuruyor",directPlay:"Direkt oyunu tercih ediyor",noWarning:"Net bir veri sinyali yok",strengthProfile:"GÜÇ PROFİLİ",attack:"Hücum",midfield:"Orta saha",defense:"Savunma",physical:"Fiziksel",mental:"Zihinsel",matchup:"EŞLEŞME ÖNERİSİ",targetWeak:"{side} bölgesini hedefle.",aerialWeak:"Hava toplarında savunmaları zorlanıyor.",midStronger:"Orta sahaları hücumlarından daha güçlü."},
  en:{report:"SCOUT REPORT",squad:"OPPONENT SQUAD",overall:"OVERALL",formation:"FORMATION",playStyle:"Play Style",weakSide:"Weak Side",teamStrength:"Team Strength",estimatedFormation:"Estimated Formation",projectedXI:"PROJECTED XI",weakArea:"Weak area",attackDirection:"Attack direction",flanks:{L:"left channel",C:"centre",R:"right channel"},keyPlayers:"KEY PLAYERS",highest:"Highest rated",fastest:"Fastest player",playmaker:"Playmaker",watchOut:"WATCH OUT",strongTransitions:"Strong in transitions",dangerousCrosses:"Dangerous from crosses",weakPressing:"Passing quality drops under pressure",aggressivePress:"Presses aggressively high up",compactBlock:"Sets up in a compact block",directPlay:"Prefers direct play",noWarning:"No clear data signal",strengthProfile:"STRENGTH PROFILE",attack:"Attack",midfield:"Midfield",defense:"Defense",physical:"Physical",mental:"Mental",matchup:"MATCHUP HINT",targetWeak:"Target their {side}.",aerialWeak:"Their defense struggles in the air.",midStronger:"Their midfield is stronger than their attack."},
  es:{report:"INFORME SCOUT",squad:"PLANTILLA RIVAL",overall:"MEDIA",formation:"FORMACIÓN",playStyle:"Estilo",weakSide:"Lado débil",teamStrength:"Fuerza",estimatedFormation:"Formación estimada",projectedXI:"ONCE ESTIMADO",weakArea:"Zona débil",attackDirection:"Dirección de ataque",flanks:{L:"banda izquierda",C:"centro",R:"banda derecha"},keyPlayers:"JUGADORES CLAVE",highest:"Mejor valorado",fastest:"Más rápido",playmaker:"Organizador",watchOut:"ATENCIÓN",strongTransitions:"Fuerte en transiciones",dangerousCrosses:"Peligroso con centros",weakPressing:"Pierde calidad de pase bajo presión",aggressivePress:"Presiona arriba con agresividad",compactBlock:"Defiende en bloque compacto",directPlay:"Prefiere el juego directo",noWarning:"Sin una señal clara en los datos",strengthProfile:"PERFIL DE FUERZA",attack:"Ataque",midfield:"Mediocampo",defense:"Defensa",physical:"Físico",mental:"Mental",matchup:"CONSEJO",targetWeak:"Ataca su {side}.",aerialWeak:"Su defensa sufre en el juego aéreo.",midStronger:"Su mediocampo es más fuerte que su ataque."},
  de:{report:"SCOUTING-BERICHT",squad:"GEGNERISCHER KADER",overall:"GESAMT",formation:"FORMATION",playStyle:"Spielstil",weakSide:"Schwache Seite",teamStrength:"Teamstärke",estimatedFormation:"Vermutete Formation",projectedXI:"VORAUSSICHTLICHE ELF",weakArea:"Schwache Zone",attackDirection:"Angriffsrichtung",flanks:{L:"linke Seite",C:"Zentrum",R:"rechte Seite"},keyPlayers:"SCHLÜSSELSPIELER",highest:"Bestbewertet",fastest:"Schnellster",playmaker:"Spielmacher",watchOut:"ACHTUNG",strongTransitions:"Stark im Umschalten",dangerousCrosses:"Gefährlich bei Flanken",weakPressing:"Unter Druck sinkt die Passqualität",aggressivePress:"Presst früh und aggressiv",compactBlock:"Verteidigt in einem kompakten Block",directPlay:"Bevorzugt direktes Spiel",noWarning:"Kein klares Datensignal",strengthProfile:"STÄRKENPROFIL",attack:"Angriff",midfield:"Mittelfeld",defense:"Abwehr",physical:"Physis",mental:"Mental",matchup:"MATCHUP-HINWEIS",targetWeak:"Ihre {side} angreifen.",aerialWeak:"Ihre Abwehr hat Probleme in der Luft.",midStronger:"Ihr Mittelfeld ist stärker als ihr Angriff."},
  it:{report:"RAPPORTO SCOUT",squad:"ROSA AVVERSARIA",overall:"VALORE",formation:"MODULO",playStyle:"Stile di gioco",weakSide:"Lato debole",teamStrength:"Forza squadra",estimatedFormation:"Modulo stimato",projectedXI:"UNDICI PREVISTO",weakArea:"Zona debole",attackDirection:"Direzione d'attacco",flanks:{L:"fascia sinistra",C:"centro",R:"fascia destra"},keyPlayers:"GIOCATORI CHIAVE",highest:"Più valutato",fastest:"Più veloce",playmaker:"Regista",watchOut:"ATTENZIONE",strongTransitions:"Forte nelle transizioni",dangerousCrosses:"Pericoloso sui cross",weakPressing:"La qualità del passaggio cala sotto pressione",aggressivePress:"Pressa alto con aggressività",compactBlock:"Difende con un blocco compatto",directPlay:"Preferisce il gioco diretto",noWarning:"Nessun segnale chiaro dai dati",strengthProfile:"PROFILO DI FORZA",attack:"Attacco",midfield:"Centrocampo",defense:"Difesa",physical:"Fisico",mental:"Mentale",matchup:"CONSIGLIO TATTICO",targetWeak:"Attacca il loro {side}.",aerialWeak:"La loro difesa soffre nel gioco aereo.",midStronger:"Il loro centrocampo è più forte dell'attacco."}
};

function copy(){return COPY[global.LANG]||COPY.en;}
function esc(value){return String(value==null?"":value).replace(/[&<>"']/g,function(ch){return{"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[ch];});}
function mean(values){const nums=values.filter(Number.isFinite);return nums.length?nums.reduce(function(sum,value){return sum+value;},0)/nums.length:null;}
function profileMean(profile,fields){if(!profile)return null;return mean(fields.map(function(field){const value=Number(profile[field]);return Number.isFinite(value)?value:null;}));}
function attackLane(players){
  const lanes=["L","C","R"].map(function(side){return{side:side,value:mean(players.filter(function(player){return player.side===side&&(player.grp==="MID"||player.grp==="FWD");}).map(function(player){return Number(player.scoutOv);}))};}).filter(function(item){return item.value!=null;}).sort(function(a,b){return b.value-a.value;});
  if(!lanes.length)return"";
  if(lanes.length>1&&lanes[0].value-lanes[1].value<2)return"C";
  return lanes[0].side;
}
function reportModel(players,profiles,tactic,weakText,labels){
  const entries=players.map(function(player,index){return{player:player,profile:profiles&&profiles[index]||null};});
  const profileLine=function(groups,fields){return mean(entries.filter(function(item){return groups.includes(item.player.grp)&&item.profile;}).map(function(item){return profileMean(item.profile,fields);}));};
  const ratingLine=function(groups){return mean(players.filter(function(player){return groups.includes(player.grp);}).map(function(player){return Number(player.scoutOv);}));};
  const score=function(raw,fallback){
    const value=raw==null?fallback:raw*5;
    return Number.isFinite(value)?Math.max(0,Math.min(100,Math.round(value))):null;
  };
  const bars={
    attack:score(profileLine(["FWD"],["finishing","off_the_ball","dribbling","long_shots","heading"]),ratingLine(["FWD"])),
    midfield:score(profileLine(["MID"],["passing","decisions","composure","dribbling","work_rate"]),ratingLine(["MID"])),
    defense:score(profileLine(["DEF"],["tackling","heading","strength","decisions","work_rate"]),ratingLine(["DEF","GK"])),
    physical:score(profileLine(["DEF","MID","FWD"],["pace","acceleration","stamina","strength","natural_fitness"]),null),
    mental:score(profileLine(["DEF","MID","FWD"],["decisions","composure","work_rate","leadership","bravery"]),null)
  };
  const highest=players.slice().sort(function(a,b){return b.scoutOv-a.scoutOv;})[0]||null;
  const ranked=function(fields,filter){return entries.map(function(item){return{item:item,value:item.profile&&(!filter||filter(item.player))?profileMean(item.profile,fields):null};}).filter(function(row){return row.value!=null;}).sort(function(a,b){return b.value-a.value;});};
  const fastest=ranked(["pace","acceleration"])[0]||null;
  const playmaker=ranked(["passing","decisions","composure"],function(player){return player.grp!=="GK";})[0]||null;
  const watch=[],tacticKey=String(tactic||"").toLowerCase();
  if(/counter|kontra/.test(tacticKey))watch.push(labels.strongTransitions);
  if(/gegen|press|pres/.test(tacticKey))watch.push(labels.aggressivePress);
  if(/low block|düşük blok|defensive|defans/.test(tacticKey))watch.push(labels.compactBlock);
  if(/long ball|uzun top|direct|direkt/.test(tacticKey))watch.push(labels.directPlay);
  const crossing=profileLine(["DEF","MID","FWD"],["crossing"]),heading=profileLine(["FWD"],["heading"]),pressResistance=profileLine(["MID"],["passing","composure","decisions"]);
  if(crossing!=null&&heading!=null&&crossing>=13&&heading>=13&&!watch.includes(labels.dangerousCrosses))watch.push(labels.dangerousCrosses);
  if(pressResistance!=null&&pressResistance<=11.5&&!watch.includes(labels.weakPressing))watch.push(labels.weakPressing);
  const aerialDefense=profileLine(["DEF"],["heading","strength"]);
  let hint;
  if(aerialDefense!=null&&aerialDefense<=11.5)hint=labels.aerialWeak;
  else if(bars.midfield!=null&&bars.attack!=null&&bars.midfield-bars.attack>=6)hint=labels.midStronger;
  else hint=labels.targetWeak.replace("{side}",weakText);
  return{bars:bars,highest:highest,fastest:fastest,playmaker:playmaker,watch:watch.slice(0,3),hint:hint};
}
function reportHtml(model,labels){
  const keyRow=function(label,player,value){return'<div class="scout-key-row"><span>'+esc(label)+'</span><b>'+(player?esc(player.name):"—")+'</b>'+(value!=null?'<em>'+Math.round(value)+'</em>':"")+'</div>';};
  const bar=function(key,label){const raw=model.bars[key],value=Number.isFinite(raw)?Math.max(0,Math.min(100,Math.round(raw))):null;return'<div class="scout-strength-row"><span>'+esc(label)+'</span><div class="scout-strength-track" role="meter" aria-label="'+esc(label)+'" aria-valuemin="0" aria-valuemax="100"'+(value!=null?' aria-valuenow="'+value+'"':"")+'><i style="width:'+(value==null?0:value)+'%"></i></div><b>'+(value==null?"—":value)+'</b></div>';};
  const fastest=model.fastest,playmaker=model.playmaker;
  return'<div class="scout-report-grid"><div class="scout-insight-column"><section class="scout-insight-card"><h3>'+esc(labels.keyPlayers)+'</h3>'+keyRow(labels.highest,model.highest,model.highest&&model.highest.scoutOv)+keyRow(labels.fastest,fastest&&fastest.item.player,fastest&&fastest.value*5)+keyRow(labels.playmaker,playmaker&&playmaker.item.player,playmaker&&playmaker.value*5)+'</section><section class="scout-insight-card scout-watch-card"><h3>'+esc(labels.watchOut)+'</h3><ul>'+(model.watch.length?model.watch:[labels.noWarning]).map(function(item){return'<li>'+esc(item)+'</li>';}).join("")+'</ul></section></div><section class="scout-strength-card"><h3>'+esc(labels.strengthProfile)+'</h3>'+bar("attack",labels.attack)+bar("midfield",labels.midfield)+bar("defense",labels.defense)+bar("physical",labels.physical)+bar("mental",labels.mental)+'</section></div><div class="scout-matchup-hint"><span>'+esc(labels.matchup)+'</span><strong>'+esc(model.hint)+'</strong></div>';
}

global.ScoutReport={copy:copy,escape:esc,attackLane:attackLane,model:reportModel,html:reportHtml};
})(window);
