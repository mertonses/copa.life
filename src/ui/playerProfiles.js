(function(global){
"use strict";

const HOVER_OPEN_MS=320,HOVER_CLOSE_MS=150,DOUBLE_TAP_MS=320;
const bound=new WeakMap(),normalizedCache=new Map(),replaying=new WeakSet();
let root=null,panel=null,openTimer=0,closeTimer=0,requestId=0,current=null,lastTap=null;
let dragging=false,dragSuppressUntil=0,historyPushed=false,previousFocus=null;

const copy={
  tr:{open:"Oyuncu profilini aç",close:"Oyuncu profilini kapat",age:"yaş",club:"Kulüp",country:"Ülke / Milli Takım",foot:"Kullandığı ayak",positions:"Yan Mevkiler",best:"Ana mevki",secondary:"Yan mevki",physical:"Fiziksel",technical:"Teknik",mental:"Zihinsel",goalkeeping:"Kalecilik",overview:"OYUNCU ÖZETİ",playStyle:"OYUNCU TARZI",strengths:"ARTILAR",weaknesses:"EKSİLER",analysis:"KISA ANALİZ",loading:"Oyuncu verileri yükleniyor…",noAttributes:"Bu oyuncu için ayrıntılı özellik verisi bulunamadı."},
  en:{open:"Open player profile",close:"Close player profile",age:"years old",club:"Club",country:"Country / National team",foot:"Preferred foot",positions:"Secondary Positions",best:"Primary position",secondary:"Secondary position",physical:"Physical",technical:"Technical",mental:"Mental",goalkeeping:"Goalkeeping",overview:"PLAYER OVERVIEW",playStyle:"PLAY STYLE",strengths:"STRENGTHS",weaknesses:"WEAKNESSES",analysis:"QUICK ANALYSIS",loading:"Loading player data…",noAttributes:"Detailed attributes are not available for this player."},
  es:{open:"Abrir perfil del jugador",close:"Cerrar perfil del jugador",age:"años",club:"Club",country:"País / Selección",foot:"Pie preferido",positions:"Posiciones secundarias",best:"Posición principal",secondary:"Posición secundaria",physical:"Físico",technical:"Técnica",mental:"Mental",goalkeeping:"Portería",overview:"RESUMEN DEL JUGADOR",playStyle:"ESTILO DE JUEGO",strengths:"FORTALEZAS",weaknesses:"DEBILIDADES",analysis:"ANÁLISIS RÁPIDO",loading:"Cargando datos del jugador…",noAttributes:"No hay atributos detallados disponibles para este jugador."},
  de:{open:"Spielerprofil öffnen",close:"Spielerprofil schließen",age:"Jahre",club:"Verein",country:"Land / Nationalteam",foot:"Starker Fuß",positions:"Nebenpositionen",best:"Hauptposition",secondary:"Nebenposition",physical:"Physis",technical:"Technik",mental:"Mental",goalkeeping:"Torwart",overview:"SPIELERÜBERSICHT",playStyle:"SPIELSTIL",strengths:"STÄRKEN",weaknesses:"SCHWÄCHEN",analysis:"KURZANALYSE",loading:"Spielerdaten werden geladen…",noAttributes:"Für diesen Spieler sind keine detaillierten Attribute verfügbar."},
  it:{open:"Apri profilo giocatore",close:"Chiudi profilo giocatore",age:"anni",club:"Club",country:"Paese / Nazionale",foot:"Piede preferito",positions:"Posizioni secondarie",best:"Posizione principale",secondary:"Posizione secondaria",physical:"Fisico",technical:"Tecnica",mental:"Mentale",goalkeeping:"Portiere",overview:"PANORAMICA GIOCATORE",playStyle:"STILE DI GIOCO",strengths:"PUNTI DI FORZA",weaknesses:"PUNTI DEBOLI",analysis:"ANALISI RAPIDA",loading:"Caricamento dati giocatore…",noAttributes:"Gli attributi dettagliati non sono disponibili per questo giocatore."}
};
const profileLoadCopy={
  tr:{loadError:"Oyuncu profil verileri şu anda yüklenemedi.",retry:"Yeniden dene"},
  en:{loadError:"Player profile data could not be loaded.",retry:"Try again"},
  es:{loadError:"No se pudieron cargar los datos del perfil.",retry:"Reintentar"},
  de:{loadError:"Die Spielerprofildaten konnten nicht geladen werden.",retry:"Erneut versuchen"},
  it:{loadError:"Impossibile caricare i dati del profilo.",retry:"Riprova"}
};
Object.keys(profileLoadCopy).forEach(function(lang){Object.assign(copy[lang],profileLoadCopy[lang]);});
const englishLabels={
  acceleration:"Acceleration",rushing_out:"Rushing Out",passing:"Passing",bravery:"Bravery",command_of_area:"Command of Area",agility:"Agility",handling:"Handling",aerial_reach:"Aerial Reach",crossing:"Crossing",kicking:"Kicking",tackling:"Tackling",free_kicks:"Free Kicks",dribbling:"Dribbling",natural_fitness:"Natural Fitness",decisions:"Decisions",heading:"Heading",leadership:"Leadership",strength:"Strength",pace:"Pace",off_the_ball:"Off the Ball",flair:"Flair",aggression:"Aggression",work_rate:"Work Rate",composure:"Composure",reflexes:"Reflexes",finishing:"Finishing",one_on_ones:"One on Ones",penalties:"Penalties",long_shots:"Long Shots",stamina:"Stamina"
};
const outfieldGroups={
  physical:["acceleration","pace","agility","strength","stamina","natural_fitness"],
  technical:["passing","crossing","tackling","free_kicks","dribbling","heading","finishing","long_shots","penalties"],
  mental:["bravery","decisions","leadership","off_the_ball","flair","aggression","work_rate","composure"]
};
const keeperGroups={
  goalkeeping:["command_of_area","handling","aerial_reach","kicking","reflexes","one_on_ones","rushing_out"],
  physical:["agility","strength","stamina","natural_fitness","acceleration","pace"],
  mental:["bravery","decisions","leadership","aggression","work_rate","composure"]
};
const RADAR_DEFINITIONS={
  outfield:[
    {key:"attack",tr:"Hücum",en:"Attack",es:"Ataque",de:"Angriff",it:"Attacco",fields:["finishing","long_shots","off_the_ball","penalties"]},
    {key:"technique",tr:"Teknik",en:"Technique",es:"Técnica",de:"Technik",it:"Tecnica",fields:["passing","dribbling","crossing","free_kicks"]},
    {key:"physical",tr:"Fiziksel",en:"Physical",es:"Físico",de:"Physis",it:"Fisico",fields:["pace","acceleration","stamina","strength","agility","natural_fitness"]},
    {key:"mental",tr:"Zihinsel",en:"Mental",es:"Mental",de:"Mental",it:"Mentale",fields:["decisions","composure","bravery","leadership","work_rate","flair"]},
    {key:"defense",tr:"Savunma",en:"Defense",es:"Defensa",de:"Abwehr",it:"Difesa",fields:["tackling","work_rate","aggression","decisions"]},
    {key:"aerial",tr:"Hava",en:"Aerial",es:"Juego aéreo",de:"Kopfball",it:"Gioco aereo",fields:["heading","strength","bravery"]}
  ],
  keeper:[
    {key:"reflex",tr:"Refleks",en:"Reflexes",es:"Reflejos",de:"Reflexe",it:"Riflessi",fields:["reflexes","agility"]},
    {key:"positioning",tr:"Yer Tutma",en:"Positioning",es:"Colocación",de:"Stellungsspiel",it:"Posizionamento",fields:["decisions","composure","command_of_area"]},
    {key:"aerial",tr:"Hava",en:"Aerial",es:"Juego aéreo",de:"Lufthoheit",it:"Gioco aereo",fields:["aerial_reach","command_of_area","handling"]},
    {key:"oneOnOne",tr:"Bire Bir",en:"One on One",es:"Uno contra uno",de:"Eins gegen eins",it:"Uno contro uno",fields:["one_on_ones","bravery","rushing_out"]},
    {key:"distribution",tr:"Dağıtım",en:"Distribution",es:"Distribución",de:"Spieleröffnung",it:"Distribuzione",fields:["kicking","passing"]},
    {key:"physical",tr:"Fiziksel",en:"Physical",es:"Físico",de:"Physis",it:"Fisico",fields:["agility","strength","stamina","natural_fitness","acceleration"]}
  ]
};
const PROFILE_INSIGHT_RULES={
  strengths:[
    {id:"fast",label:{tr:"Hızlı",en:"Fast"},cluster:"physical",min:78,fields:["pace","acceleration"],fieldMin:15},
    {id:"durable",label:{tr:"Dayanıklı",en:"Durable"},fields:["stamina","natural_fitness"],fieldMin:16},
    {id:"aerial",label:{tr:"Hava toplarında güçlü",en:"Strong in the air"},cluster:"aerial",min:78},
    {id:"playmaker",label:{tr:"Oyun kurucu",en:"Playmaker"},fields:["passing","decisions","composure"],fieldMin:15},
    {id:"presser",label:{tr:"Presçi",en:"Pressing presence"},fields:["work_rate","stamina","aggression"],fieldMin:15},
    {id:"crosser",label:{tr:"İyi orta açar",en:"Strong crosser"},fields:["crossing"],fieldMin:16},
    {id:"finisher",label:{tr:"Güçlü bitirici",en:"Strong finisher"},fields:["finishing","off_the_ball","composure"],fieldMin:15},
    {id:"reflexes",label:{tr:"Güçlü refleksler",en:"Strong reflexes"},keeper:true,cluster:"reflex",min:80},
    {id:"twoFooted",label:{tr:"İki ayağını kullanır",en:"Two footed"},foot:"two"},
    {id:"versatile",label:{tr:"Çok yönlü",en:"Versatile"},minPositions:3}
  ],
  weaknesses:[
    {id:"slow",label:{tr:"Yavaş",en:"Slow"},fields:["pace","acceleration"],fieldMax:9},
    {id:"lowStamina",label:{tr:"Dayanıksız",en:"Low stamina"},fields:["stamina","natural_fitness"],fieldMax:9},
    {id:"weakAerial",label:{tr:"Hava toplarında zayıf",en:"Weak in the air"},cluster:"aerial",max:48},
    {id:"poorFinisher",label:{tr:"Zayıf bitirici",en:"Weak finisher"},fields:["finishing"],fieldMax:9,outfield:true},
    {id:"aggressive",label:{tr:"Fazla agresif",en:"Overly aggressive"},fields:["aggression"],fieldMin:18},
    {id:"injury",label:{tr:"Sakatlığa yatkın",en:"Injury prone"},fields:["injury_proneness"],fieldMin:16},
    {id:"distribution",label:{tr:"Dağıtımı sınırlı",en:"Limited distribution"},keeper:true,cluster:"distribution",max:48},
    {id:"oneFooted",label:{tr:"Tek ayağına bağımlı",en:"One-foot dependent"},foot:"single"}
  ]
};
const GAME_TRAIT_INSIGHTS={
  hizli:{side:"strengths",id:"fast",tr:"Hızlı",en:"Fast"},lider:{side:"strengths",id:"leader",tr:"Lider",en:"Leader"},buyukmac:{side:"strengths",id:"bigGame",tr:"Büyük maç oyuncusu",en:"Big-game player"},wonderkid:{side:"strengths",id:"wonderkid",tr:"Wonderkid",en:"Wonderkid"},sorunlu:{side:"weaknesses",id:"troubled",tr:"Disiplin riski",en:"Discipline risk"},cam:{side:"weaknesses",id:"fragile",tr:"Kırılgan",en:"Fragile"}
};

const PROFILE_LOCALE_LABELS={
  es:{
    attributes:{acceleration:"Aceleración",rushing_out:"Salidas",passing:"Pases",bravery:"Valentía",command_of_area:"Dominio del área",agility:"Agilidad",handling:"Blocaje",aerial_reach:"Alcance aéreo",crossing:"Centros",kicking:"Saques",tackling:"Entradas",free_kicks:"Tiros libres",dribbling:"Regate",natural_fitness:"Forma natural",decisions:"Decisiones",heading:"Cabeceo",leadership:"Liderazgo",strength:"Fuerza",pace:"Velocidad",off_the_ball:"Desmarques",flair:"Talento",aggression:"Agresividad",work_rate:"Sacrificio",composure:"Serenidad",reflexes:"Reflejos",finishing:"Definición",one_on_ones:"Uno contra uno",penalties:"Penaltis",long_shots:"Tiros lejanos",stamina:"Resistencia"},
    insights:{fast:"Veloz",durable:"Resistente",aerial:"Fuerte por alto",playmaker:"Organizador",presser:"Presionante",crosser:"Buen centrador",finisher:"Buen finalizador",reflexes:"Buenos reflejos",twoFooted:"Ambidiestro",versatile:"Versátil",slow:"Lento",lowStamina:"Poca resistencia",weakAerial:"Débil por alto",poorFinisher:"Definición débil",aggressive:"Demasiado agresivo",injury:"Propenso a lesiones",distribution:"Distribución limitada",oneFooted:"Dependiente de un pie",leader:"Líder",bigGame:"Jugador de grandes partidos",wonderkid:"Joven promesa",troubled:"Riesgo disciplinario",fragile:"Frágil"},
    styles:{"Sweeper Keeper":"Portero líbero","Line Keeper":"Portero de línea","Reliable Keeper":"Portero seguro","Pressing Forward":"Delantero presionante","Aerial Striker":"Delantero aéreo","Finishing Striker":"Delantero finalizador","Attacking Fullback":"Lateral ofensivo","Fast Wingback":"Carrilero veloz","Balanced Fullback":"Lateral equilibrado","Aerial Centre-back":"Central dominante por alto","Ball-playing Defender":"Defensa con salida","Defensive Centre-back":"Central defensivo","Inside Forward":"Delantero interior","Touchline Winger":"Extremo de línea","Creative Winger":"Extremo creativo","Creative Number 10":"Mediapunta creativo","Ball-winning Midfielder":"Centrocampista recuperador","Deep-lying Playmaker":"Organizador retrasado","Balanced Midfielder":"Centrocampista equilibrado","Technical Link Player":"Jugador de enlace técnico","High-tempo Role Player":"Jugador de ritmo alto"}
  },
  de:{
    attributes:{acceleration:"Antritt",rushing_out:"Herauslaufen",passing:"Passen",bravery:"Mut",command_of_area:"Strafraumbeherrschung",agility:"Beweglichkeit",handling:"Fangsicherheit",aerial_reach:"Lufthoheit",crossing:"Flanken",kicking:"Abschlag",tackling:"Zweikampf",free_kicks:"Freistöße",dribbling:"Dribbling",natural_fitness:"Grundfitness",decisions:"Entscheidungen",heading:"Kopfball",leadership:"Führungsstärke",strength:"Kraft",pace:"Schnelligkeit",off_the_ball:"Ohne Ball",flair:"Kreativität",aggression:"Aggressivität",work_rate:"Einsatzfreude",composure:"Nervenstärke",reflexes:"Reflexe",finishing:"Abschluss",one_on_ones:"Eins gegen eins",penalties:"Elfmeter",long_shots:"Fernschüsse",stamina:"Ausdauer"},
    insights:{fast:"Schnell",durable:"Ausdauernd",aerial:"Kopfballstark",playmaker:"Spielmacher",presser:"Pressingstark",crosser:"Flankenstark",finisher:"Abschlussstark",reflexes:"Starke Reflexe",twoFooted:"Beidfüßig",versatile:"Vielseitig",slow:"Langsam",lowStamina:"Geringe Ausdauer",weakAerial:"Schwach in der Luft",poorFinisher:"Schwacher Abschluss",aggressive:"Zu aggressiv",injury:"Verletzungsanfällig",distribution:"Begrenzte Spieleröffnung",oneFooted:"Einfußabhängig",leader:"Führungsspieler",bigGame:"Spieler für große Spiele",wonderkid:"Wundertalent",troubled:"Disziplinrisiko",fragile:"Fragil"},
    styles:{"Sweeper Keeper":"Mitspielender Torwart","Line Keeper":"Linientorwart","Reliable Keeper":"Sicherer Torwart","Pressing Forward":"Pressingstürmer","Aerial Striker":"Kopfballstürmer","Finishing Striker":"Abschlussstürmer","Attacking Fullback":"Offensiver Außenverteidiger","Fast Wingback":"Schneller Flügelverteidiger","Balanced Fullback":"Ausgewogener Außenverteidiger","Aerial Centre-back":"Kopfballstarker Innenverteidiger","Ball-playing Defender":"Spielmachender Verteidiger","Defensive Centre-back":"Defensiver Innenverteidiger","Inside Forward":"Inverser Flügelstürmer","Touchline Winger":"Klassischer Flügelspieler","Creative Winger":"Kreativer Flügelspieler","Creative Number 10":"Kreativer Zehner","Ball-winning Midfielder":"Ballerobernder Mittelfeldspieler","Deep-lying Playmaker":"Tiefer Spielmacher","Balanced Midfielder":"Ausgewogener Mittelfeldspieler","Technical Link Player":"Technischer Verbindungsspieler","High-tempo Role Player":"Temporeicher Rollenspieler"}
  },
  it:{
    attributes:{acceleration:"Accelerazione",rushing_out:"Uscite",passing:"Passaggi",bravery:"Coraggio",command_of_area:"Comando dell'area",agility:"Agilità",handling:"Presa",aerial_reach:"Elevazione",crossing:"Cross",kicking:"Rinvii",tackling:"Contrasti",free_kicks:"Punizioni",dribbling:"Dribbling",natural_fitness:"Forma naturale",decisions:"Decisioni",heading:"Colpo di testa",leadership:"Leadership",strength:"Forza",pace:"Velocità",off_the_ball:"Senza palla",flair:"Estro",aggression:"Aggressività",work_rate:"Impegno",composure:"Freddezza",reflexes:"Riflessi",finishing:"Finalizzazione",one_on_ones:"Uno contro uno",penalties:"Rigori",long_shots:"Tiri da lontano",stamina:"Resistenza"},
    insights:{fast:"Veloce",durable:"Resistente",aerial:"Forte nel gioco aereo",playmaker:"Regista",presser:"Pressing efficace",crosser:"Ottimo nei cross",finisher:"Finalizzatore",reflexes:"Ottimi riflessi",twoFooted:"Ambidestro",versatile:"Versatile",slow:"Lento",lowStamina:"Poca resistenza",weakAerial:"Debole nel gioco aereo",poorFinisher:"Finalizzazione debole",aggressive:"Troppo aggressivo",injury:"Incline agli infortuni",distribution:"Distribuzione limitata",oneFooted:"Dipendente da un piede",leader:"Leader",bigGame:"Giocatore da grandi partite",wonderkid:"Talento",troubled:"Rischio disciplinare",fragile:"Fragile"},
    styles:{"Sweeper Keeper":"Portiere libero","Line Keeper":"Portiere di linea","Reliable Keeper":"Portiere affidabile","Pressing Forward":"Attaccante di pressing","Aerial Striker":"Centravanti aereo","Finishing Striker":"Centravanti finalizzatore","Attacking Fullback":"Terzino offensivo","Fast Wingback":"Quinto veloce","Balanced Fullback":"Terzino equilibrato","Aerial Centre-back":"Centrale dominante nel gioco aereo","Ball-playing Defender":"Difensore impostatore","Defensive Centre-back":"Centrale difensivo","Inside Forward":"Ala invertita","Touchline Winger":"Ala di fascia","Creative Winger":"Ala creativa","Creative Number 10":"Trequartista creativo","Ball-winning Midfielder":"Centrocampista recupera-palloni","Deep-lying Playmaker":"Regista arretrato","Balanced Midfielder":"Centrocampista equilibrato","Technical Link Player":"Giocatore di raccordo tecnico","High-tempo Role Player":"Giocatore ad alto ritmo"}
  }
};

function tr(){return global.LANG==="tr";}
function t(){return copy[global.LANG]||copy.en;}
function localValue(value){const lang=global.LANG||"en";return value&&value[lang]!=null?value[lang]:value&&value.en!=null?value.en:value&&value.tr!=null?value.tr:"";}
function localeLabels(){return PROFILE_LOCALE_LABELS[global.LANG]||null;}
function finePointer(){return !!(global.matchMedia&&global.matchMedia("(hover: hover) and (pointer: fine)").matches);}
function esc(value){return String(value==null?"":value).replace(/[&<>"']/g,function(ch){return{"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[ch];});}
function number(value){if(value===null||value===undefined||value===""||(typeof value==="string"&&!value.trim()))return null;const n=Number(value);return Number.isFinite(n)?n:null;}
function playerKey(player){return player&&(player.profileKey||player.profile_key)||[global.selectedCountry||"",player&&player.name||"",player&&player.club||"",player&&player.age||"",player&&player.ov||""].join("|");}
function ratingColor(value,scale){const n=Math.max(0,Math.min(100,(number(value)||0)*(scale||1)));if(typeof global.ovCol==="function")return global.ovCol(n);return n>=90?"#15803d":n>=80?"#4ade80":n>=70?"#eab308":n>=60?"#f97316":"#ef4444";}
function positionLabel(pos){if(!pos)return"";const dict=typeof global.L==="function"&&global.L().abbr;return dict&&dict[pos]||pos;}
function uniqueValues(values){const seen=new Set();return values.map(function(v){return String(v||"").trim();}).filter(function(v){const k=v.toLocaleLowerCase("tr-TR");if(!v||seen.has(k))return false;seen.add(k);return true;});}
function splitPositions(value){return String(value||"").split(/[,;|]+/).map(function(v){return v.trim();}).filter(Boolean);}
function footLabel(value){
  if(!value||tr())return value||"";
  const key=String(value),lang=global.LANG||"en",maps={
    en:{"Sağ Ayaklı":"Right footed","Sadece Sağ Ayaklı":"Right foot only","Sol Ayaklı":"Left footed","Sadece Sol Ayaklı":"Left foot only","İki Ayağını da Kullanıyor":"Two footed"},
    es:{"Sağ Ayaklı":"Diestro","Sadece Sağ Ayaklı":"Solo derecha","Sol Ayaklı":"Zurdo","Sadece Sol Ayaklı":"Solo izquierda","İki Ayağını da Kullanıyor":"Ambidiestro"},
    de:{"Sağ Ayaklı":"Rechtsfuß","Sadece Sağ Ayaklı":"Nur rechts","Sol Ayaklı":"Linksfuß","Sadece Sol Ayaklı":"Nur links","İki Ayağını da Kullanıyor":"Beidfüßig"},
    it:{"Sağ Ayaklı":"Destro","Sadece Sağ Ayaklı":"Solo destro","Sol Ayaklı":"Mancino","Sadece Sol Ayaklı":"Solo mancino","İki Ayağını da Kullanıyor":"Ambidestro"}
  };return maps[lang]&&maps[lang][key]||maps.en[key]||key;
}
function isKeeper(player,profile){const raw=[player&&player.natPos,player&&player.pos,profile&&profile.best_position,profile&&profile.secondary_position,profile&&profile.positions].filter(Boolean).join(" ").toUpperCase();return /(^|[\s,(])(?:GK|KL)(?:$|[\s,)])/.test(raw);}
function attrLabel(profile,key){if(tr())return profile.labels&&profile.labels[key]||englishLabels[key]||key;const labels=localeLabels();return labels&&labels.attributes[key]||englishLabels[key]||key;}
function attributeContainers(profile){
  if(!profile||typeof profile!=="object")return[];
  const keys=["attributes","stats","abilities","technical","physical","mental","goalkeeping","goalkeeper"],out=[{name:"root",value:profile}],queue=[{name:"root",value:profile}],seen=new Set([profile]);
  while(queue.length){const parent=queue.shift();keys.forEach(function(key){const value=parent.value[key];if(value&&typeof value==="object"&&!Array.isArray(value)&&!seen.has(value)){const item={name:parent.name==="root"?key:parent.name+"."+key,value:value};seen.add(value);out.push(item);queue.push(item);}});}
  return out;
}
function attributeValue(containers,key){
  for(let i=0;i<containers.length;i++){if(Object.prototype.hasOwnProperty.call(containers[i].value,key)){const value=number(containers[i].value[key]);if(value!=null)return value;}}
  return null;
}
function fieldMean(containers,fields){const values=fields.map(function(key){return attributeValue(containers,key);}).filter(function(value){return value!=null;});return values.length?values.reduce(function(total,value){return total+value;},0)/values.length:null;}
function radarClusters(player,profile){
  const containers=attributeContainers(profile),keeper=isKeeper(player,profile),definitions=keeper?RADAR_DEFINITIONS.keeper:RADAR_DEFINITIONS.outfield;
  return definitions.map(function(definition){const raw=fieldMean(containers,definition.fields);if(raw==null)return null;return {key:definition.key,label:localValue(definition),value:Math.round(Math.max(0,Math.min(100,raw*5))),raw:raw,count:definition.fields.filter(function(field){return attributeValue(containers,field)!=null;}).length,fields:definition.fields.slice()};}).filter(Boolean);
}
function ruleMatches(rule,context){
  if(rule.keeper&&!context.keeper||rule.outfield&&context.keeper)return false;
  if(rule.cluster){const cluster=context.clusterMap[rule.cluster];if(!cluster||rule.min!=null&&cluster.value<rule.min||rule.max!=null&&cluster.value>rule.max)return false;}
  if(rule.fields){const mean=fieldMean(context.containers,rule.fields);if(mean==null||rule.fieldMin!=null&&mean<rule.fieldMin||rule.fieldMax!=null&&mean>rule.fieldMax)return false;}
  if(rule.foot==="two"&&!/(?:iki aya|two foot)/i.test(context.foot))return false;
  if(rule.foot==="single"&&!/(?:sadece|only)/i.test(context.foot))return false;
  if(rule.minPositions&&context.positions.length<rule.minPositions)return false;
  return true;
}
function profileInsights(player,profile,positions,clusters){
  const keeper=isKeeper(player,profile),containers=attributeContainers(profile),clusterMap={};clusters.forEach(function(cluster){clusterMap[cluster.key]=cluster;});
  const context={keeper:keeper,containers:containers,clusterMap:clusterMap,positions:positions,foot:String(profile&&profile.preferred_foot||""),strengths:[],weaknesses:[]},seen=new Set();
  const sourceCon=String(profile&&profile.cons||"").trim();if(sourceCon&&!/^(?:bilinmiyor|unknown)$/i.test(sourceCon)){const sourceId=/kafa/i.test(sourceCon)?"weakAerial":/hız/i.test(sourceCon)?"slow":"sourceCon:"+sourceCon.toLocaleLowerCase("tr-TR");context.weaknesses.push({id:sourceId,label:sourceCon,source:"profile"});seen.add(sourceId);}
  const gameTrait=player&&GAME_TRAIT_INSIGHTS[player.trait];
  if(gameTrait){const labels=localeLabels();context[gameTrait.side].push({id:gameTrait.id,label:labels&&labels.insights[gameTrait.id]||localValue(gameTrait),source:"trait"});seen.add(gameTrait.id);}
  ["strengths","weaknesses"].forEach(function(side){PROFILE_INSIGHT_RULES[side].forEach(function(rule){if(seen.has(rule.id)||!ruleMatches(rule,context))return;const labels=localeLabels();context[side].push({id:rule.id,label:labels&&labels.insights[rule.id]||localValue(rule.label),source:"attributes"});seen.add(rule.id);});});
  return {strengths:context.strengths.slice(0,5),weaknesses:context.weaknesses.slice(0,4),clusterMap:clusterMap,containers:containers,keeper:keeper};
}
function playStyleFor(player,profile,insights){
  const pos=[profile&&profile.best_position,profile&&profile.positions,player&&player.natPos,player&&player.pos].filter(Boolean).join(" ").toLocaleUpperCase("tr-TR"),m=insights.clusterMap,c=insights.containers;
  const mean=function(fields){return fieldMean(c,fields);},label=function(trLabel,enLabel){const labels=localeLabels();return tr()?trLabel:labels&&labels.styles[enLabel]||enLabel;};
  if(insights.keeper){if((mean(["rushing_out","acceleration"])||0)>=14)return label("Süpürücü Kaleci","Sweeper Keeper");if((m.reflex&&m.reflex.value>=78)&&(!m.distribution||m.distribution.value<62))return label("Çizgi Kalecisi","Line Keeper");return label("Güvenli Kaleci","Reliable Keeper");}
  if(/\bST\b/.test(pos)){if((mean(["work_rate","stamina","aggression"])||0)>=15)return label("Presçi Forvet","Pressing Forward");if(m.aerial&&m.aerial.value>=75)return label("Hava Hakimiyetli Santrfor","Aerial Striker");return label("Bitirici Santrfor","Finishing Striker");}
  if(/\bKB\b|\bD\s*\((?:SĞ|SL)/.test(pos)){if((mean(["crossing","dribbling","off_the_ball"])||0)>=14)return label("Hücumcu Bek","Attacking Fullback");if(m.physical&&m.physical.value>=75)return label("Hızlı Kanat Beki","Fast Wingback");return label("Dengeli Bek","Balanced Fullback");}
  if(/\bD\b/.test(pos)){if(m.aerial&&m.aerial.value>=75)return label("Hava Hakimiyetli Stoper","Aerial Centre-back");if((mean(["passing","decisions","composure"])||0)>=14)return label("Savunmacı Oyun Kurucu","Ball-playing Defender");return label("Savunmacı Stoper","Defensive Centre-back");}
  if(/\bOOS\b/.test(pos)&&/(?:SĞ|SL)/.test(pos)){if((mean(["dribbling","finishing","off_the_ball"])||0)>=14.5)return label("İçe Kat Eden Kanat","Inside Forward");if((mean(["crossing","pace","acceleration"])||0)>=14.5)return label("Çizgi Kanadı","Touchline Winger");return label("Yaratıcı Kanat","Creative Winger");}
  if(/\bOOS\b/.test(pos))return label("Yaratıcı 10 Numara","Creative Number 10");
  if(/\bDOS\b|\bOS\b/.test(pos)){if((mean(["tackling","work_rate","aggression"])||0)>=14)return label("Top Kazanan Orta Saha","Ball-winning Midfielder");if((mean(["passing","decisions","composure","flair"])||0)>=14)return label("Derin Oyun Kurucu","Deep-lying Playmaker");return label("Dengeli Orta Saha","Balanced Midfielder");}
  return m.technique&&m.technique.value>=m.physical?.value?label("Teknik Bağlantı Oyuncusu","Technical Link Player"):label("Tempolu Rol Oyuncusu","High-tempo Role Player");
}
function analysisFor(insights){
  const clusters=Object.values(insights.clusterMap);if(clusters.length<4)return"";
  const represented={fast:"physical",durable:"physical",lowStamina:"physical",slow:"physical",aerial:"aerial",weakAerial:"aerial",playmaker:"technique",crosser:"technique",finisher:"attack",poorFinisher:"attack",reflexes:"reflex",distribution:"distribution"},used=new Set();insights.strengths.concat(insights.weaknesses).forEach(function(item){if(represented[item.id])used.add(represented[item.id]);});
  const sorted=clusters.slice().sort(function(a,b){return b.value-a.value;}),strong=sorted.find(function(cluster){return !used.has(cluster.key);})||sorted[0],weak=sorted.slice().reverse().find(function(cluster){return !used.has(cluster.key);})||sorted[sorted.length-1];
  const outHigh={attack:["Son bölgede belirgin üretim sunuyor.","Offers clear end-product in the final third."],technique:["Topla bağlantı kalitesi güçlü.","Connects play cleanly on the ball."],physical:["Maç temposunu fiziksel olarak taşıyabiliyor.","Can sustain the physical tempo of a match."],mental:["Karar ve çalışma disiplininde güven veriyor.","Shows reliable decision-making and work discipline."],defense:["Top kazanma katkısı öne çıkıyor.","Makes a clear contribution when winning the ball."],aerial:["Hava mücadelelerinde etkili.","Makes a strong impact in aerial duels."]};
  const gkHigh={reflex:["Çizgi üzerindeki reaksiyonları güven veriyor.","His reactions on the line inspire confidence."],positioning:["Açı ve karar yönetimi dengeli.","Manages angles and decisions well."],aerial:["Ceza alanındaki yüksek toplara hakim.","Commands high balls in the area."],oneOnOne:["Yakın mesafe pozisyonlarında etkili.","Performs well in close-range situations."],distribution:["Oyunu geriden temiz başlatabiliyor.","Can start play cleanly from the back."],physical:["Kaleci aksiyonlarını atletik biçimde tamamlıyor.","Executes goalkeeper actions athletically."]};
  const outLow={attack:["Son vuruş katkısı daha sınırlı.","His end-product is more limited."],technique:["Topla bağlantıda sade oynaması gerekiyor.","Needs to keep his work on the ball simple."],physical:["Yüksek tempoda fiziksel sınırları belirginleşebilir.","His physical limits may show at a high tempo."],mental:["Baskı altında karar kalitesi düşebilir.","Decision quality may drop under pressure."],defense:["Topsuz savunma katkısı sınırlı kalıyor.","Offers limited defensive work without the ball."],aerial:["Hava mücadelelerinde dezavantaj yaşayabilir.","May be at a disadvantage in aerial duels."]};
  const gkLow={reflex:["Ani şutlarda reaksiyon payı sınırlı.","Has a limited reaction margin against sudden shots."],positioning:["Açı yönetiminde desteğe ihtiyaç duyabilir.","May need support with angle management."],aerial:["Yüksek toplarda kontrollü kullanılmalı.","Should be used cautiously against high balls."],oneOnOne:["Bire birlerde savunma desteğine ihtiyaç duyabilir.","May need defensive support in one-on-ones."],distribution:["Topu oyuna sokarken sade tercihleri daha güvenli.","Safer distribution choices suit him better."],physical:["Arka arkaya kaleci aksiyonlarında zorlanabilir.","May struggle with repeated goalkeeper actions."]};
  const sentences=[];if(strong.value>=65){const value=(insights.keeper?gkHigh:outHigh)[strong.key];if(value)sentences.push(tr()?value[0]:value[1]);}if(weak.value<=60&&weak.key!==strong.key){const value=(insights.keeper?gkLow:outLow)[weak.key];if(value)sentences.push(tr()?value[0]:value[1]);}return sentences.slice(0,2).join(" ");
}
function insightsWithoutStyleEcho(style,items){const value=String(style||"").toLocaleLowerCase("tr-TR"),blocked=new Set();if(/pres|press/.test(value))blocked.add("presser");if(/oyun kurucu|playmaker/.test(value))blocked.add("playmaker");if(/bitirici|finishing/.test(value))blocked.add("finisher");if(/hızlı|fast/.test(value))blocked.add("fast");if(/hava|aerial/.test(value))blocked.add("aerial");return items.filter(function(item){return !blocked.has(item.id);});}
function attributeGroups(player,profile){
  const source=isKeeper(player,profile)?keeperGroups:outfieldGroups,containers=attributeContainers(profile);
  return Object.keys(source).map(function(group){
    return {key:group,items:source[group].map(function(key){const value=attributeValue(containers,key);return value==null?null:{key:key,label:attrLabel(profile,key),value:value};}).filter(Boolean)};
  }).filter(function(group){return group.items.length;});
}
function normalize(player,profile,options){
  const opts=options||{},containers=attributeContainers(profile);
  const pos=positionLabel(player.natPos||player.pos);
  const bestParts=splitPositions(profile&&profile.best_position),secondaryParts=splitPositions(profile&&profile.secondary_position),knownPositions=bestParts.concat(secondaryParts,splitPositions(profile&&profile.positions)),primary=bestParts[0]||pos,positions=uniqueValues(knownPositions.length?knownPositions:(pos?[pos]:[]));
  const groups=profile?attributeGroups(player,profile):[],radar=profile?radarClusters(player,profile):[],insights=profile?profileInsights(player,profile,positions,radar):{strengths:[],weaknesses:[],clusterMap:{},containers:containers,keeper:isKeeper(player,profile)},playStyle=profile?playStyleFor(player,profile,insights):"";
  return {
    key:playerKey(player),name:player.name||"",ov:number(player.ov),age:number(player.age),position:primary,
    club:player.club||"",country:profile&&profile.national_team||"",foot:footLabel(profile&&profile.preferred_foot),
    best:primary,secondary:secondaryParts[0]||"",positions:positions,secondaryPositions:positions.filter(function(value){return value!==primary;}),groups:groups,radar:radar,radarReady:radar.length===6,
    strengths:insightsWithoutStyleEcho(playStyle,insights.strengths),weaknesses:insights.weaknesses,playStyle:playStyle,analysis:profile?analysisFor(insights):"",goalkeeperProfile:insights.keeper,
    loading:!!opts.loading,loadError:opts.loadError||null,hasAttributes:groups.some(function(group){return group.items.length>0;}),
    sourceType:profile&&profile.source_type||profile&&profile.source||"none",attributeContainers:containers.map(function(container){return container.name;})
  };
}
function debugProfile(player,data){
  if(!global.console||typeof global.console.debug!=="function")return;
  const host=global.location&&global.location.hostname||"",enabled=host==="localhost"||host==="127.0.0.1"||/(?:^|[?&])debug=1(?:&|$)/.test(global.location&&global.location.search||"");
  if(!enabled)return;
  global.console.debug("[PlayerProfiles]",{playerId:player&&player.profileKey||player&&player.profile_key||null,sourceType:data.sourceType,attributeContainers:data.attributeContainers,goalkeeperProfile:data.goalkeeperProfile,radarClusters:data.radar.map(function(cluster){return cluster.key+":"+cluster.value;}),groupCount:data.groups.length,attributeCount:data.groups.reduce(function(total,group){return total+group.items.length;},0)});
}
function profileCacheKey(player){return[playerKey(player),global.LANG||"tr",player.ov||"",player.natPos||"",player.pos||"",player.club||"",player.age||""].join("|");}
function profileLoader(player){
  return typeof global.playerProfileForPlayerAsync==="function"
    ?global.playerProfileForPlayerAsync(player,global.selectedCountry||"TR")
    :player.profileKey&&typeof global.playerProfileByKeyAsync==="function"
      ?global.playerProfileByKeyAsync(player.profileKey)
    :typeof global.playerProfileForAsync==="function"
      ?global.playerProfileForAsync(global.selectedCountry||"TR",player.name,player.club,player.age)
      :Promise.resolve(null);
}
function profileFor(player,options){
  const opts=options||{};
  const key=profileCacheKey(player);
  if(!opts.force&&normalizedCache.has(key))return Promise.resolve(normalizedCache.get(key));
  const start=opts.force&&typeof global.retryPlayerProfiles==="function"?global.retryPlayerProfiles():Promise.resolve();
  return start.then(function(){return profileLoader(player);}).then(function(profile){const value=normalize(player,profile);normalizedCache.set(key,value);debugProfile(player,value);return value;}).catch(function(error){const value=normalize(player,null,{loadError:error||new Error("PLAYER_PROFILE_LOAD_FAILED")});debugProfile(player,value);return value;});
}
function ensureDom(){
  if(root)return;
  root=document.createElement("div");root.className="player-profile-layer hidden";root.setAttribute("aria-hidden","true");
  root.innerHTML='<div class="player-profile-backdrop" data-profile-close></div><section class="player-profile-card" role="dialog"><button class="player-profile-close" type="button" data-profile-close></button><div class="player-profile-content"></div></section>';
  document.body.appendChild(root);panel=root.querySelector(".player-profile-card");
  root.addEventListener("click",function(event){if(event.target.closest("[data-profile-retry]")){retryCurrent();return;}if(event.target.closest("[data-profile-close]"))close();});
  panel.addEventListener("mouseenter",cancelClose);
  panel.addEventListener("mouseleave",scheduleClose);
}
function identityHtml(data){
  const c=t(),meta=[];
  if(data.age!=null)meta.push(esc(data.age+" "+c.age));
  if(data.position)meta.push('<span class="player-profile-primary-pos">'+esc(data.position)+'</span>');
  const details=[];
  if(data.club)details.push('<span><b>'+esc(c.club)+'</b>'+esc(data.club)+'</span>');
  if(data.country)details.push('<span><b>'+esc(c.country)+'</b>'+esc(data.country)+'</span>');
  if(data.foot)details.push('<span><b>'+esc(c.foot)+'</b>'+esc(data.foot)+'</span>');
  return '<header class="player-profile-head"><div class="player-profile-monogram" aria-hidden="true">'+esc((typeof global._playerMonogram==="function"?global._playerMonogram(data.name):data.name.slice(0,2)).toUpperCase())+'</div><div class="player-profile-id"><div class="player-profile-name-row"><h2 id="playerProfileTitle">'+esc(data.name)+'</h2>'+(data.ov!=null?'<strong class="player-profile-ov" style="--profile-tone:'+ratingColor(data.ov,1)+'">'+esc(data.ov)+'</strong>':"")+'</div>'+(meta.length?'<p>'+meta.join('<i aria-hidden="true">·</i>')+'</p>':"")+'</div></header>'+(details.length?'<div class="player-profile-details">'+details.join("")+'</div>':"");
}
function positionsHtml(data){
  if(!data.secondaryPositions.length)return"";const c=t(),chips=data.secondaryPositions.map(function(pos){return '<span class="player-profile-pos is-secondary">'+esc(pos)+'</span>';}).join("");
  return '<div class="player-profile-positions"><h3>'+esc(c.positions||copy.en.positions)+'</h3><div class="player-profile-pos-list">'+chips+'</div></div>';
}
function radarPoint(index,ratio,radius){const angle=(-Math.PI/2)+(Math.PI*2/6)*index;return [120+Math.cos(angle)*radius*ratio,120+Math.sin(angle)*radius*ratio];}
function radarPolygon(ratio,radius){return [0,1,2,3,4,5].map(function(index){const point=radarPoint(index,ratio,radius);return point[0].toFixed(1)+","+point[1].toFixed(1);}).join(" ");}
function radarHtml(data){
  if(!data.radarReady)return"";const c=t(),radius=72;
  const grids=[.25,.5,.75,1].map(function(level){return '<polygon class="player-profile-radar-grid" points="'+radarPolygon(level,radius)+'"></polygon>';}).join("");
  const axes=data.radar.map(function(_,index){const point=radarPoint(index,1,radius);return '<line class="player-profile-radar-axis" x1="120" y1="120" x2="'+point[0].toFixed(1)+'" y2="'+point[1].toFixed(1)+'"></line>';}).join("");
  const area=data.radar.map(function(cluster,index){const point=radarPoint(index,cluster.value/100,radius);return point[0].toFixed(1)+","+point[1].toFixed(1);}).join(" ");
  const dots=data.radar.map(function(cluster,index){const point=radarPoint(index,cluster.value/100,radius);return '<circle class="player-profile-radar-dot" cx="'+point[0].toFixed(1)+'" cy="'+point[1].toFixed(1)+'" r="2"></circle>';}).join("");
  const labels=data.radar.map(function(cluster,index){const point=radarPoint(index,1,101),anchor=point[0]<90?"end":point[0]>150?"start":"middle",dy=index===0?"0":index===3?"8":"3";return '<text x="'+point[0].toFixed(1)+'" y="'+point[1].toFixed(1)+'" text-anchor="'+anchor+'" dy="'+dy+'">'+esc(cluster.label)+'</text>';}).join("");
  const scores=data.radar.map(function(cluster){return '<span><i>'+esc(cluster.label)+'</i><b style="color:'+ratingColor(cluster.value,1)+'">'+esc(cluster.value)+'</b></span>';}).join("");
  return '<div class="player-profile-radar"><h3>'+esc(c.overview||copy.en.overview)+'</h3><svg viewBox="0 0 240 240" role="img" aria-label="'+esc(c.overview||copy.en.overview)+'">'+grids+axes+'<polygon class="player-profile-radar-area" points="'+area+'"></polygon>'+dots+labels+'</svg><div class="player-profile-radar-scores">'+scores+'</div></div>';
}
function insightBlock(title,items,kind){if(!items.length)return"";return '<div class="player-profile-insights is-'+kind+'"><h3>'+esc(title)+'</h3><ul>'+items.map(function(item){return '<li><i aria-hidden="true"></i>'+esc(item.label)+'</li>';}).join("")+'</ul></div>';}
function overviewHtml(data){
  if(!data.radarReady&&!data.playStyle&&!data.strengths.length&&!data.weaknesses.length&&!data.analysis&&!data.secondaryPositions.length)return"";const c=t();
  const style=data.playStyle?'<div class="player-profile-style"><h3>'+esc(c.playStyle||copy.en.playStyle)+'</h3><strong>'+esc(data.playStyle)+'</strong></div>':"";
  const insights='<div class="player-profile-insight-grid">'+insightBlock(c.strengths||copy.en.strengths,data.strengths,"positive")+insightBlock(c.weaknesses||copy.en.weaknesses,data.weaknesses,"negative")+'</div>';
  const analysis=data.analysis?'<div class="player-profile-analysis"><h3>'+esc(c.analysis||copy.en.analysis)+'</h3><p>'+esc(data.analysis)+'</p></div>':"";
  return '<section class="player-profile-overview">'+radarHtml(data)+'<div class="player-profile-narrative">'+style+insights+analysis+positionsHtml(data)+'</div></section>';
}
function groupsHtml(data){
  const c=t();if(data.loading)return '<section class="player-profile-section player-profile-state is-loading" role="status">'+esc(c.loading||copy.en.loading)+'</section>';
  if(data.loadError)return '<section class="player-profile-section player-profile-state is-error" role="alert"><span>'+esc(c.loadError||copy.en.loadError)+'</span><button type="button" data-profile-retry>'+esc(c.retry||copy.en.retry)+'</button></section>';
  if(!data.hasAttributes)return '<section class="player-profile-section player-profile-state is-empty" role="status">'+esc(c.noAttributes||copy.en.noAttributes)+'</section>';
  return data.groups.map(function(group){
    const rows=group.items.map(function(item){const pct=Math.max(0,Math.min(100,item.value/20*100)),tone=ratingColor(item.value,5);return '<div class="player-profile-stat"><span>'+esc(item.label)+'</span><div class="player-profile-bar" role="meter" aria-label="'+esc(item.label)+'" aria-valuemin="0" aria-valuemax="20" aria-valuenow="'+esc(item.value)+'"><i style="width:'+pct+'%;background:'+tone+'"></i></div><b style="color:'+tone+'">'+esc(item.value)+'</b></div>';}).join("");
    return '<section class="player-profile-section player-profile-attributes"><h3>'+esc(c[group.key]||group.key)+'</h3><div class="player-profile-stat-grid">'+rows+'</div></section>';
  }).join("");
}
function profileHtml(data){return identityHtml(data)+overviewHtml(data)+groupsHtml(data);}
function render(data){
  if(!panel)return;panel.querySelector(".player-profile-close").setAttribute("aria-label",t().close);panel.querySelector(".player-profile-close").innerHTML="&times;";
  panel.setAttribute("aria-labelledby","playerProfileTitle");
  panel.querySelector(".player-profile-content").innerHTML=profileHtml(data);
}
function place(){
  if(!current||!panel||!finePointer())return;
  const anchor=current.anchor;if(!anchor||!anchor.isConnected){close();return;}
  const a=anchor.getBoundingClientRect(),p=panel.getBoundingClientRect(),gap=10,edge=10;
  let left=a.right+gap,top=a.top+(a.height-p.height)/2;
  if(left+p.width>innerWidth-edge)left=a.left-p.width-gap;
  if(left<edge){left=Math.max(edge,Math.min(a.left+(a.width-p.width)/2,innerWidth-p.width-edge));top=a.bottom+gap;if(top+p.height>innerHeight-edge)top=a.top-p.height-gap;}
  panel.style.left=Math.round(Math.max(edge,Math.min(left,innerWidth-p.width-edge)))+"px";
  panel.style.top=Math.round(Math.max(edge,Math.min(top,innerHeight-p.height-edge)))+"px";
}
function open(player,anchor,reason){
  if(!player||player.hidden||dragging||performance.now()<dragSuppressUntil)return;
  clearTimeout(openTimer);clearTimeout(closeTimer);ensureDom();
  const wasOpen=!!current,token=++requestId;previousFocus=document.activeElement;current={player:player,anchor:anchor,reason:reason||"api"};
  root.classList.remove("hidden");root.classList.toggle("is-sheet",!finePointer());root.setAttribute("aria-hidden","false");panel.setAttribute("aria-modal",finePointer()?"false":"true");
  render(normalize(player,null,{loading:true}));requestAnimationFrame(place);
  if(!finePointer()&&!wasOpen&&!historyPushed){try{history.pushState(Object.assign({},history.state,{copaPlayerProfile:true}),"");historyPushed=true;}catch(e){}}
  profileFor(player).then(function(data){if(!current||token!==requestId)return;render(data);requestAnimationFrame(place);});
  if(reason==="keyboard"||!finePointer())requestAnimationFrame(function(){const button=panel&&panel.querySelector(".player-profile-close");if(button)button.focus({preventScroll:true});});
}
function close(fromHistory){
  clearTimeout(openTimer);clearTimeout(closeTimer);requestId++;
  if(!root||!current)return;root.classList.add("hidden");root.setAttribute("aria-hidden","true");panel.style.left="";panel.style.top="";current=null;
  if(historyPushed&&!fromHistory){historyPushed=false;try{history.back();}catch(e){}}
  else if(fromHistory)historyPushed=false;
  if(previousFocus&&previousFocus.isConnected&&finePointer()){try{previousFocus.focus({preventScroll:true});}catch(e){}}previousFocus=null;
}
function cancelClose(){clearTimeout(closeTimer);}
function scheduleClose(){if(!finePointer())return;clearTimeout(closeTimer);closeTimer=setTimeout(function(){close();},HOVER_CLOSE_MS);}
function scheduleOpen(element){if(!finePointer()||dragging||performance.now()<dragSuppressUntil)return;clearTimeout(closeTimer);clearTimeout(openTimer);openTimer=setTimeout(function(){const meta=bound.get(element);if(meta)open(meta.player,element,"hover");},HOVER_OPEN_MS);}
function bind(element,player,options){
  if(!element||!player||player.hidden)return element;
  const old=bound.get(element),opts=Object.assign({delayCoarseAction:false},options||{});
  const base=(old&&element.getAttribute("aria-label")===old.aria)?old.base:(element.getAttribute("aria-label")||player.name||"");
  const aria=(base?base+". ":"")+t().open;
  const meta=old||{};meta.player=player;meta.options=opts;meta.base=base;meta.aria=aria;bound.set(element,meta);
  element.dataset.playerProfile="true";element.setAttribute("aria-label",aria);
  if(element.tagName!=="BUTTON"&&element.tagName!=="A"){if(!element.hasAttribute("role"))element.setAttribute("role","button");if(!element.hasAttribute("tabindex"))element.tabIndex=0;}
  if(!old){
    element.addEventListener("mouseenter",function(){scheduleOpen(element);});
    element.addEventListener("mouseleave",scheduleClose);
    element.addEventListener("keydown",function(event){if(event.key!=="Enter"&&event.key!==" ")return;event.preventDefault();event.stopImmediatePropagation();const value=bound.get(element);if(value)open(value.player,element,"keyboard");});
  }
  return element;
}
function bindSelector(rootNode,selector,players,options){Array.from(rootNode.querySelectorAll(selector)).forEach(function(element,index){if(players[index])bind(element,players[index],options);});}
function setDragging(value){dragging=!!value;if(dragging){dragSuppressUntil=Infinity;close();}else dragSuppressUntil=performance.now()+380;}
function interceptCoarseClick(event){
  if(finePointer()||event.detail===0)return;
  const element=event.target.closest&&event.target.closest("[data-player-profile='true']");if(!element)return;
  if(replaying.has(element)){replaying.delete(element);return;}
  if(dragging||performance.now()<dragSuppressUntil){event.preventDefault();event.stopImmediatePropagation();return;}
  const meta=bound.get(element);if(!meta)return;const now=performance.now(),key=playerKey(meta.player);
  if(lastTap&&lastTap.key===key&&now-lastTap.at<=DOUBLE_TAP_MS){
    event.preventDefault();event.stopImmediatePropagation();if(lastTap.timer)clearTimeout(lastTap.timer);lastTap=null;open(meta.player,element,"double-tap");return;
  }
  lastTap={key:key,at:now,element:element,timer:0};
  if(meta.options.delayCoarseAction){
    event.preventDefault();event.stopImmediatePropagation();
    lastTap.timer=setTimeout(function(){if(!lastTap||lastTap.element!==element)return;lastTap=null;if(!element.isConnected)return;replaying.add(element);element.click();queueMicrotask(function(){replaying.delete(element);});},DOUBLE_TAP_MS+10);
  }
}

document.addEventListener("click",interceptCoarseClick,true);
document.addEventListener("dragstart",function(event){if(event.target.closest&&event.target.closest("[data-player-profile='true']"))setDragging(true);},true);
document.addEventListener("dragend",function(){if(dragging)setDragging(false);},true);
document.addEventListener("drop",function(){if(dragging)setDragging(false);},true);
document.addEventListener("keydown",function(event){if(event.key==="Escape"&&current){event.preventDefault();close();}});
global.addEventListener("resize",function(){if(current){if(finePointer())place();else close();}},{passive:true});
global.addEventListener("orientationchange",function(){if(current)close();},{passive:true});
global.addEventListener("popstate",function(){if(current&&historyPushed)close(true);});

function refresh(){
  document.querySelectorAll("[data-player-profile='true']").forEach(function(element){const meta=bound.get(element);if(meta)bind(element,meta.player,meta.options);});
  if(!current)return;
  const token=++requestId,player=current.player;
  render(normalize(player,null,{loading:true}));
  profileFor(player).then(function(data){if(!current||token!==requestId)return;render(data);requestAnimationFrame(place);});
}

function retryCurrent(){
  if(!current)return;
  const token=++requestId,player=current.player;
  normalizedCache.delete(profileCacheKey(player));render(normalize(player,null,{loading:true}));requestAnimationFrame(place);
  profileFor(player,{force:true}).then(function(data){if(!current||token!==requestId)return;render(data);requestAnimationFrame(place);});
}

global.PlayerProfiles={bind:bind,bindSelector:bindSelector,open:open,close:close,refresh:refresh,retry:retryCurrent,setDragging:setDragging,isOpen:function(){return !!current;},_normalizedCache:normalizedCache,_normalizeForTest:normalize,_renderForTest:profileHtml};
})(window);
