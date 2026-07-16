(function(global){
"use strict";

const COPY={
  tr:{report:"SCOUT RAPORU",squad:"RAKİP KADROSU",overall:"GENEL",formation:"DİZİLİŞ",playStyle:"Oyun stili",weakSide:"Zayıf taraf",teamStrength:"Takım gücü",estimatedFormation:"Tahmini diziliş",projectedXI:"TAHMİNİ 11",weakArea:"Zayıf alan",attackDirection:"Hücum yönü",flanks:{L:"sol koridor",C:"merkez",R:"sağ koridor"},keyPlayers:"KİLİT OYUNCULAR",highest:"En yüksek puan",fastest:"Tempo lideri",playmaker:"Oyun kurucu",watchOut:"DİKKAT",strongTransitions:"Geçiş hücumlarında güçlü",dangerousCrosses:"Geniş alan hücumlarında etkili",weakPressing:"Baskı altında karar kalitesi düşüyor",aggressivePress:"Önde temaslı pres yapıyor",compactBlock:"Kompakt savunma bloğu kuruyor",directPlay:"Direkt oyunu tercih ediyor",noWarning:"Net bir veri sinyali yok",strengthProfile:"COPA PROFİLİ",attack:"Hücum etkisi",midfield:"Oyun kurulumu",defense:"Alan ve mücadele",physical:"Tempo",mental:"Karar güveni",matchup:"EŞLEŞME ÖNERİSİ",targetWeak:"{side} bölgesini hedefle.",aerialWeak:"Savunmaları ikili mücadelede destek istiyor.",midStronger:"Oyun kurulumları hücum etkilerinden daha güçlü."},
  en:{report:"SCOUT REPORT",squad:"OPPONENT SQUAD",overall:"OVERALL",formation:"FORMATION",playStyle:"Play Style",weakSide:"Weak Side",teamStrength:"Team Strength",estimatedFormation:"Estimated Formation",projectedXI:"PROJECTED XI",weakArea:"Weak area",attackDirection:"Attack direction",flanks:{L:"left channel",C:"centre",R:"right channel"},keyPlayers:"KEY PLAYERS",highest:"Highest rated",fastest:"Tempo leader",playmaker:"Playmaker",watchOut:"WATCH OUT",strongTransitions:"Strong in transitions",dangerousCrosses:"Effective in wide attacks",weakPressing:"Decision quality drops under pressure",aggressivePress:"Uses a contact-heavy high press",compactBlock:"Sets up in a compact block",directPlay:"Prefers direct play",noWarning:"No clear data signal",strengthProfile:"COPA PROFILE",attack:"Attack impact",midfield:"Build-up",defense:"Space and duels",physical:"Tempo",mental:"Decision trust",matchup:"MATCHUP HINT",targetWeak:"Target their {side}.",aerialWeak:"Their defense needs support in duels.",midStronger:"Their build-up is stronger than their attack impact."},
  es:{report:"INFORME SCOUT",squad:"PLANTILLA RIVAL",overall:"MEDIA",formation:"FORMACIÓN",playStyle:"Estilo",weakSide:"Lado débil",teamStrength:"Fuerza",estimatedFormation:"Formación estimada",projectedXI:"ONCE ESTIMADO",weakArea:"Zona débil",attackDirection:"Dirección de ataque",flanks:{L:"banda izquierda",C:"centro",R:"banda derecha"},keyPlayers:"JUGADORES CLAVE",highest:"Mejor valorado",fastest:"Líder de ritmo",playmaker:"Organizador",watchOut:"ATENCIÓN",strongTransitions:"Fuerte en transiciones",dangerousCrosses:"Eficaz en ataques abiertos",weakPressing:"Decide peor bajo presión",aggressivePress:"Presiona arriba con contacto",compactBlock:"Defiende en bloque compacto",directPlay:"Prefiere el juego directo",noWarning:"Sin una señal clara en los datos",strengthProfile:"PERFIL COPA",attack:"Impacto ofensivo",midfield:"Construcción",defense:"Espacio y duelos",physical:"Ritmo",mental:"Decisión",matchup:"CONSEJO",targetWeak:"Ataca su {side}.",aerialWeak:"Su defensa necesita apoyo en los duelos.",midStronger:"Su construcción es más fuerte que su impacto ofensivo."},
  de:{report:"SCOUTING-BERICHT",squad:"GEGNERISCHER KADER",overall:"GESAMT",formation:"FORMATION",playStyle:"Spielstil",weakSide:"Schwache Seite",teamStrength:"Teamstärke",estimatedFormation:"Vermutete Formation",projectedXI:"VORAUSSICHTLICHE ELF",weakArea:"Schwache Zone",attackDirection:"Angriffsrichtung",flanks:{L:"linke Seite",C:"Zentrum",R:"rechte Seite"},keyPlayers:"SCHLÜSSELSPIELER",highest:"Bestbewertet",fastest:"Tempo-Leader",playmaker:"Spielmacher",watchOut:"ACHTUNG",strongTransitions:"Stark im Umschalten",dangerousCrosses:"Effektiv über die Breite",weakPressing:"Unter Druck sinkt die Entscheidungsqualität",aggressivePress:"Presst früh und körperbetont",compactBlock:"Verteidigt in einem kompakten Block",directPlay:"Bevorzugt direktes Spiel",noWarning:"Kein klares Datensignal",strengthProfile:"COPA-PROFIL",attack:"Angriffswirkung",midfield:"Spielaufbau",defense:"Raum und Duelle",physical:"Tempo",mental:"Entscheidung",matchup:"MATCHUP-HINWEIS",targetWeak:"Ihre {side} angreifen.",aerialWeak:"Ihre Abwehr braucht Unterstützung in Duellen.",midStronger:"Ihr Spielaufbau ist stärker als die Angriffswirkung."},
  it:{report:"RAPPORTO SCOUT",squad:"ROSA AVVERSARIA",overall:"VALORE",formation:"MODULO",playStyle:"Stile di gioco",weakSide:"Lato debole",teamStrength:"Forza squadra",estimatedFormation:"Modulo stimato",projectedXI:"UNDICI PREVISTO",weakArea:"Zona debole",attackDirection:"Direzione d'attacco",flanks:{L:"fascia sinistra",C:"centro",R:"fascia destra"},keyPlayers:"GIOCATORI CHIAVE",highest:"Più valutato",fastest:"Leader del ritmo",playmaker:"Regista",watchOut:"ATTENZIONE",strongTransitions:"Forte nelle transizioni",dangerousCrosses:"Efficace negli attacchi larghi",weakPressing:"La qualità decisionale cala sotto pressione",aggressivePress:"Pressa alto con contatto",compactBlock:"Difende con un blocco compatto",directPlay:"Preferisce il gioco diretto",noWarning:"Nessun segnale chiaro dai dati",strengthProfile:"PROFILO COPA",attack:"Impatto offensivo",midfield:"Costruzione",defense:"Spazio e duelli",physical:"Ritmo",mental:"Decisione",matchup:"CONSIGLIO TATTICO",targetWeak:"Attacca il loro {side}.",aerialWeak:"La loro difesa ha bisogno di supporto nei duelli.",midStronger:"La costruzione è più forte dell'impatto offensivo."}
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
    const value=raw==null?fallback:raw;
    return Number.isFinite(value)?Math.max(0,Math.min(100,Math.round(value))):null;
  };
  const bars={
    attack:score(profileLine(["FWD"],["copa_impact"]),ratingLine(["FWD"])),
    midfield:score(profileLine(["MID"],["copa_build_up","copa_space_control","copa_pressure_decision"]),ratingLine(["MID"])),
    defense:score(profileLine(["DEF","GK"],["copa_space_control","copa_duels","copa_pressure_decision"]),ratingLine(["DEF","GK"])),
    physical:score(profileLine(["DEF","MID","FWD"],["copa_engine"]),null),
    mental:score(profileLine(["DEF","MID","FWD","GK"],["copa_pressure_decision"]),null)
  };
  const highest=players.slice().sort(function(a,b){return b.scoutOv-a.scoutOv;})[0]||null;
  const ranked=function(fields,filter){return entries.map(function(item){return{item:item,value:item.profile&&(!filter||filter(item.player))?profileMean(item.profile,fields):null};}).filter(function(row){return row.value!=null;}).sort(function(a,b){return b.value-a.value;});};
  const fastest=ranked(["copa_engine"])[0]||null;
  const playmaker=ranked(["copa_build_up","copa_pressure_decision"],function(player){return player.grp!=="GK";})[0]||null;
  const watch=[],tacticKey=String(tactic||"").toLowerCase();
  if(/counter|kontra/.test(tacticKey))watch.push(labels.strongTransitions);
  if(/gegen|press|pres/.test(tacticKey))watch.push(labels.aggressivePress);
  if(/low block|düşük blok|defensive|defans/.test(tacticKey))watch.push(labels.compactBlock);
  if(/long ball|uzun top|direct|direkt/.test(tacticKey))watch.push(labels.directPlay);
  const wideThreat=profileLine(["MID","FWD"],["copa_impact","copa_build_up"]),pressResistance=profileLine(["MID"],["copa_pressure_decision"]);
  if(wideThreat!=null&&wideThreat>=72&&!watch.includes(labels.dangerousCrosses))watch.push(labels.dangerousCrosses);
  if(pressResistance!=null&&pressResistance<=46&&!watch.includes(labels.weakPressing))watch.push(labels.weakPressing);
  const aerialDefense=profileLine(["DEF"],["copa_space_control","copa_duels"]);
  let hint;
  if(aerialDefense!=null&&aerialDefense<=46)hint=labels.aerialWeak;
  else if(bars.midfield!=null&&bars.attack!=null&&bars.midfield-bars.attack>=6)hint=labels.midStronger;
  else hint=labels.targetWeak.replace("{side}",weakText);
  return{bars:bars,highest:highest,fastest:fastest,playmaker:playmaker,watch:watch.slice(0,3),hint:hint};
}
function reportHtml(model,labels){
  const keyRow=function(label,player,value){return'<div class="scout-key-row"><span>'+esc(label)+'</span><b>'+(player?esc(player.name):"—")+'</b>'+(value!=null?'<em>'+Math.round(value)+'</em>':"")+'</div>';};
  const bar=function(key,label){const raw=model.bars[key],value=Number.isFinite(raw)?Math.max(0,Math.min(100,Math.round(raw))):null;return'<div class="scout-strength-row"><span>'+esc(label)+'</span><div class="scout-strength-track" role="meter" aria-label="'+esc(label)+'" aria-valuemin="0" aria-valuemax="100"'+(value!=null?' aria-valuenow="'+value+'"':"")+'><i style="width:'+(value==null?0:value)+'%"></i></div><b>'+(value==null?"—":value)+'</b></div>';};
  const fastest=model.fastest,playmaker=model.playmaker;
  return'<div class="scout-report-grid"><div class="scout-insight-column"><section class="scout-insight-card"><h3>'+esc(labels.keyPlayers)+'</h3>'+keyRow(labels.highest,model.highest,model.highest&&model.highest.scoutOv)+keyRow(labels.fastest,fastest&&fastest.item.player,fastest&&fastest.value)+keyRow(labels.playmaker,playmaker&&playmaker.item.player,playmaker&&playmaker.value)+'</section><section class="scout-insight-card scout-watch-card"><h3>'+esc(labels.watchOut)+'</h3><ul>'+(model.watch.length?model.watch:[labels.noWarning]).map(function(item){return'<li>'+esc(item)+'</li>';}).join("")+'</ul></section></div><section class="scout-strength-card"><h3>'+esc(labels.strengthProfile)+'</h3>'+bar("attack",labels.attack)+bar("midfield",labels.midfield)+bar("defense",labels.defense)+bar("physical",labels.physical)+bar("mental",labels.mental)+'</section></div><div class="scout-matchup-hint"><span>'+esc(labels.matchup)+'</span><strong>'+esc(model.hint)+'</strong></div>';
}

global.ScoutReport={copy:copy,escape:esc,attackLane:attackLane,model:reportModel,html:reportHtml};
})(window);
