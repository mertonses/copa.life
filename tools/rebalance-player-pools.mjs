import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const WRITE=process.argv.includes("--write");
const PROFILE_PATH=path.join(ROOT,"assets","data","copa","player_profiles.json");
const PROFILE=JSON.parse(fs.readFileSync(PROFILE_PATH,"utf8"));
const FIELD=new Map(PROFILE.fields.map((name,index)=>[name,index]));

const FILES=[
  {country:"TR",file:"players.js",variable:"POOL"},
  {country:"ENG",file:"players_england.js",variable:"POOL_EN"},
  {country:"ES",file:"players_spain.js",variable:"POOL_ES"},
  {country:"IT",file:"players_italy.js",variable:"POOL_IT"},
  {country:"DE",file:"players_germany.js",variable:"POOL_DE"},
  {country:"JP",file:"players_japan.js",variable:"POOL_JP"}
];

const TR_TOP=new Set([
  "Galatasaray","Fenerbahçe","Beşiktaş","Trabzonspor","Başakşehir","Samsunspor",
  "Göztepe","Rizespor","Kocaelispor","Gençlerbirliği","Alanyaspor","Gaziantep FK",
  "Kayserispor","Konyaspor","Antalyaspor","Amedspor","Erzurumspor","Çorum FK"
].map(normalize));

const TOP_CLUBS={
  ENG:new Set([
    "AFC Bournemouth","Arsenal","Aston Villa","Brentford","Brighton & Hove Albion","Burnley",
    "Chelsea","Crystal Palace","Everton","Fulham","Leeds United","Liverpool","Manchester City",
    "Manchester United","Newcastle United","Nottingham Forest","Sunderland","Tottenham Hotspur",
    "West Ham United","Wolverhampton Wanderers"
  ].map(normalize)),
  ES:new Set([
    "Athletic Club","Club Atlético de Madrid","Club Atlético Osasuna","Deportivo Alavés","Elche C.F.",
    "F.C. Barcelona","Getafe C.F.","Girona F.C.","Levante U.D.","R.C. Celta de Vigo",
    "R.C.D. Espanyol de Barcelona","R.C.D. Mallorca","Rayo Vallecano de Madrid","Real Betis Balompié",
    "Real Madrid C.F.","Real Oviedo","Real Sociedad de Fútbol","Sevilla F.C.","Valencia C.F.","Villarreal C.F."
  ].map(normalize)),
  IT:new Set([
    "A.C. Milan","A.C.F. Fiorentina","A.S. Roma","Atalanta Bergamasca Calcio","Bologna F.C. 1909",
    "Cagliari Calcio","Como 1907","F.C. Internazionale Milano","Genoa C.F.C.","Hellas Verona F.C.",
    "Juventus F.C.","Parma Calcio 1913","Pisa S.C.","S.S. Lazio","S.S.C. Napoli","Torino F.C.",
    "U.S. Cremonese","U.S. Lecce","U.S. Sassuolo Calcio","Udinese Calcio"
  ].map(normalize)),
  DE:new Set([
    "1. FC Heidenheim 1846","1. FC Köln","1. FC Union Berlin","1. FSV Mainz 05","Bayer 04 Leverkusen",
    "Borussia Dortmund","Borussia Mönchengladbach","Eintracht Frankfurt","FC Augsburg","FC Bayern München",
    "FC St. Pauli","Hamburger SV","RasenBallsport Leipzig","Sport-Club Freiburg","SV Werder Bremen",
    "TSG 1899 Hoffenheim","VfB Stuttgart","VfL Wolfsburg"
  ].map(normalize))
};

const ROLE_WEIGHTS={
  GK:[.34,.12,.23,.15,.05,.11],
  FWD:[.35,.10,.12,.15,.16,.12],
  WIDE:[.24,.20,.10,.06,.24,.16],
  MID:[.10,.28,.18,.12,.14,.18],
  HOLD:[.06,.18,.23,.22,.15,.16],
  FULL:[.08,.18,.20,.17,.24,.13],
  DEF:[.04,.12,.25,.28,.11,.20]
};

const OVERRIDE_VALUES={
  "TR|baran sarka":{power:70,local:1},
  "TR|mervan yigit":{power:76},
  "TR|mame mor faye":{power:74},
  "TR|yaser asprilla":{power:85},
  "TR|andre onana":{power:87},
  "TR|ederson":{power:88},
  "TR|anderson talisca":{power:87},
  "TR|marco asensio":{power:88},
  "TR|n golo kante":{power:88},
  "TR|leroy sane":{power:89},
  "TR|mattéo guendouzi":{power:90},
  "TR|matteo guendouzi":{power:90},
  "TR|lucas torreira":{power:90},
  "TR|victor osimhen":{power:94},
  "TR|baris alper yilmaz":{power:90},
  "TR|gabriel sara":{power:90},
  "TR|orkun kokcu":{power:89},
  "TR|wilfried singo":{power:89},
  "TR|davinson sanchez":{power:89},
  "TR|ismail yuksek":{power:88},
  "TR|dorgeles nene":{power:87},
  "TR|halil akbunar":{power:78},
  "TR|mauro icardi":{natural:"ST"},
  "TR|ali al musrati":{local:0},
  "TR|diogo goncalves":{local:0},
  "TR|marius stefanescu":{local:0},
  "ENG|erling haaland":{power:94},
  "ENG|bukayo saka":{power:93},
  "ENG|alexander isak":{power:92},
  "ENG|rodri":{power:92},
  "ENG|cole palmer":{power:92},
  "ENG|moises caicedo":{power:90},
  "ENG|florian wirtz":{power:92},
  "ENG|mohamed salah":{power:93},
  "ENG|virgil van dijk":{power:91},
  "ENG|declan rice":{power:91},
  "ENG|martin odegaard":{power:91},
  "ENG|emiliano martinez":{power:85},
  "ENG|lucas digne":{power:80},
  "ENG|jordan henderson":{power:77},
  "ENG|kyle walker":{power:78},
  "ENG|pascal gross":{power:80},
  "ENG|lewis dunk":{power:78},
  "ES|lamine yamal":{power:95},
  "ES|kylian mbappe":{power:94},
  "ES|jude bellingham":{power:92,natural:"AM"},
  "ES|pedri":{power:92},
  "ES|unai simon":{power:89},
  "ES|vinicius junior":{power:93},
  "ES|raphinha":{power:91},
  "ES|thibaut courtois":{power:91},
  "ES|federico valverde":{power:90},
  "IT|lautaro martinez":{power:92},
  "IT|alessandro bastoni":{power:90,natural:"CB"},
  "IT|nicolo barella":{power:89},
  "IT|kenan yildiz":{power:89},
  "IT|scott mctominay":{power:88},
  "IT|luka modric":{power:80},
  "IT|federico dimarco":{power:90},
  "IT|hakan calhanoglu":{power:90},
  "IT|bremer":{power:90},
  "DE|michael olise":{power:93},
  "DE|jamal musiala":{power:92},
  "DE|joshua kimmich":{power:90},
  "DE|nico schlotterbeck":{power:89}
  ,"DE|harry kane":{power:93}
  ,"DE|serhou guirassy":{power:90}
};
const OVERRIDES=new Map(Object.entries(OVERRIDE_VALUES).map(([key,value])=>{
  const split=key.indexOf("|");
  return [`${key.slice(0,split)}|${normalize(key.slice(split+1))}`,value];
}));

function normalize(value){
  return String(value||"").toLocaleLowerCase("tr-TR")
    .replaceAll("ı","i").replaceAll("ł","l").replaceAll("ø","o").replaceAll("ð","d")
    .replaceAll("þ","th").replaceAll("đ","d").replaceAll("æ","ae").replaceAll("œ","oe")
    .replaceAll("ß","ss").normalize("NFKD").replace(/[\u0300-\u036f]/g,"")
    .replace(/[^a-z0-9]+/g," ").trim().replace(/\s+/g," ");
}

function loadPool(definition){
  const source=fs.readFileSync(path.join(ROOT,"src","data",definition.file),"utf8");
  const context={};
  vm.runInNewContext(source,context,{filename:definition.file});
  return context[definition.variable].map(player=>Array.from(player));
}

function profileFor(country,player){
  const exact=[country,normalize(player[0]),Number(player[4])||0,normalize(player[3])].join("|");
  if(PROFILE.records[exact])return PROFILE.records[exact];
  const prefix=[country,normalize(player[0]),Number(player[4])||0].join("|")+"|";
  const keys=Object.keys(PROFILE.records).filter(key=>key.startsWith(prefix));
  return keys.length===1?PROFILE.records[keys[0]]:null;
}

function profileText(record,name){return record?String(record[FIELD.get(name)]||""):"";}
function exactPosition(record,fallbackRole){
  const raw=[profileText(record,"best_position"),profileText(record,"secondary_position"),profileText(record,"positions")].join(" ").toLocaleUpperCase("tr-TR");
  if(/(?:^|[\s,(])(?:KL|GK)(?:$|[\s,)])/.test(raw))return"GK";
  if(/\bD\/KB\s*\((?:SĞ|R)/.test(raw)||/\bKB\s*\((?:SĞ|R)/.test(raw))return"RB";
  if(/\bD\/KB\s*\((?:SL|L)/.test(raw)||/\bKB\s*\((?:SL|L)/.test(raw))return"LB";
  if(/\bD\s*\(M\)/.test(raw))return"CB";
  if(/\bDOS\b/.test(raw))return"DM";
  if(/\bOOS\s*\((?:SĞ|R)/.test(raw))return"RW";
  if(/\bOOS\s*\((?:SL|L)/.test(raw))return"LW";
  if(/\bOOS\s*\(M\)/.test(raw))return"AM";
  if(/\bOS\s*\(M\)/.test(raw))return"CM";
  if(/\bOS\s*\((?:SĞ|R)/.test(raw))return"RM";
  if(/\bOS\s*\((?:SL|L)/.test(raw))return"LM";
  if(/\bST\b/.test(raw))return"ST";
  return fallbackRole==="GK"?"GK":fallbackRole==="DEF"?"CB":fallbackRole==="MID"?"CM":"ST";
}

function broadRole(position){
  if(position==="GK")return"GK";
  if(["CB","LB","RB","WB"].includes(position))return"DEF";
  if(["ST","LW","RW"].includes(position))return"FWD";
  return"MID";
}

function roleWeightKey(position){
  if(position==="GK")return"GK";
  if(position==="ST")return"FWD";
  if(["LW","RW"].includes(position))return"WIDE";
  if(["LB","RB","WB"].includes(position))return"FULL";
  if(position==="CB")return"DEF";
  if(position==="DM")return"HOLD";
  return"MID";
}

function profileAbility(record,position){
  if(!record)return null;
  const dimensions=record.slice(0,6).map(Number);
  if(dimensions.some(value=>!Number.isFinite(value)))return null;
  const weights=ROLE_WEIGHTS[roleWeightKey(position)];
  const score=dimensions.reduce((sum,value,index)=>sum+value*weights[index],0);
  return Math.round(48+score*.52);
}

function tierFor(country,club){
  if(country==="TR")return TR_TOP.has(normalize(club))?1:2;
  if(country==="JP")return 1;
  return TOP_CLUBS[country]?.has(normalize(club))?1:2;
}

function computedPower(country,player,record,position,tier){
  const oldPower=Number(player[1])||60,age=Number(player[4])||26,profilePower=profileAbility(record,position);
  let power=oldPower;
  if(profilePower!=null){
    const oldWeight=age<=21?(oldPower<=64?.65:.55):.30;
    power=Math.round(oldPower*oldWeight+profilePower*(1-oldWeight));
  }
  if(country==="JP")power-=5;
  if(tier===2)power-=3;
  power+=({TR:-3,ENG:0,ES:-4,IT:0,DE:-2,JP:-2}[country]||0);
  if(country==="TR"&&["amedspor","erzurumspor","corum fk"].includes(normalize(player[3]))&&age>=22&&power>=63)power+=2;
  const maxByCountry={TR:94,ENG:94,ES:95,IT:93,DE:93,JP:82};
  let cap=maxByCountry[country];
  if(tier===2)cap=82;
  if(age<=20)cap=Math.min(cap,tier===1?88:80);
  return Math.max(52,Math.min(cap,power));
}

function potentialFor(power,oldPower,age,tier,country){
  let growth=0;
  if(age<=17)growth=9;
  else if(age<=19)growth=7;
  else if(age<=21)growth=5;
  else if(age<=23)growth=3;
  else if(age<=25)growth=1;
  const signal=age<=23?Math.max(0,Math.min(8,oldPower-power)):0;
  let potential=power+Math.max(growth,signal);
  const ceiling=country==="JP"?86:tier===2?86:96;
  return Math.max(power,Math.min(ceiling,Math.round(potential)));
}

function overrideFor(country,name){
  return OVERRIDES.get(`${country}|${normalize(name)}`)||null;
}

function rebalancePlayer(country,player){
  if(player.length>=10){
    const stable=player.slice(0,10);
    const override=overrideFor(country,stable[0]);
    if(override?.power!=null)stable[1]=override.power;
    if(override?.local!=null)stable[5]=override.local;
    if(override?.natural){stable[7]=override.natural;stable[2]=broadRole(stable[7]);}
    stable[8]=Math.max(stable[1],Number(stable[8])||stable[1]);
    return stable;
  }
  const record=profileFor(country,player);
  const override=overrideFor(country,player[0]);
  const natural=override?.natural||(record?exactPosition(record,player[2]):(player[7]||exactPosition(null,player[2])));
  const role=broadRole(natural);
  const tier=tierFor(country,player[3]);
  const oldPower=Number(player[1])||60;
  let power=computedPower(country,player,record,natural,tier);
  let local=Number(player[5])?1:0;
  if(override?.power!=null)power=override.power;
  if(override?.local!=null)local=override.local;
  const potential=potentialFor(power,oldPower,Number(player[4])||26,tier,country);
  const marketHint=country==="TR"?Number(player[6])||0:Number(player[6])||0;
  return [player[0],power,role,player[3],Number(player[4])||26,local,marketHint,natural,potential,tier];
}

function ensureTurkeyAdditions(pool){
  const additions=[
    ["Jhon Durán",88,"FWD","Fenerbahçe",22,0,0,"ST",93,1],
    ["Youssef En-Nesyri",87,"FWD","Fenerbahçe",29,0,0,"ST",87,1]
  ];
  for(const player of additions)if(!pool.some(existing=>normalize(existing[0])===normalize(player[0])))pool.push(player);
}

function tuneClubMean(pool,club,target){
  const players=pool.filter(player=>normalize(player[3])===normalize(club));
  if(!players.length)return;
  const mean=players.reduce((sum,player)=>sum+player[1],0)/players.length;
  const delta=Math.round(target-mean);
  if(!delta)return;
  for(const player of players){
    if(overrideFor("TR",player[0])?.power!=null)continue;
    player[1]=Math.max(52,Math.min(84,player[1]+delta));
    player[8]=Math.max(player[1],player[8]+Math.max(0,delta));
  }
}

function liftJapanElite(pool){
  pool.forEach(player=>{if(player[1]>=80)player[1]=79;});
  const quotas={GK:2,DEF:4,MID:4,FWD:4};
  const elite=Object.entries(quotas).flatMap(([role,count])=>pool.filter(player=>player[2]===role).sort((a,b)=>b[6]-a[6]||a[0].localeCompare(b[0])).slice(0,count)).sort((a,b)=>b[6]-a[6]||a[0].localeCompare(b[0]));
  elite.forEach((player,index)=>{
    player[1]=index<3?82:index<8?81:80;
    player[8]=Math.max(player[8],Math.min(86,player[1]+(player[4]<=23?3:1)));
  });
}

function percentile(sorted,p){
  if(!sorted.length)return 0;
  return sorted[Math.min(sorted.length-1,Math.max(0,Math.round((sorted.length-1)*p)))];
}

function summary(country,pool){
  const powers=pool.map(player=>player[1]).sort((a,b)=>a-b);
  const clubs=new Set(pool.map(player=>player[3]));
  return {
    country,players:pool.length,clubs:clubs.size,
    mean:Number((powers.reduce((sum,value)=>sum+value,0)/powers.length).toFixed(2)),
    median:percentile(powers,.5),p80:percentile(powers,.8),
    over80:powers.filter(value=>value>=80).length,
    over85:powers.filter(value=>value>=85).length,
    over90:powers.filter(value=>value>=90).length
  };
}

function outputSource(definition,pool){
  const label=definition.country==="TR"?"Türkiye oyuncu havuzu":"Oyuncu havuzu";
  const schema="[ad, güç, rol, kulüp, yaş, yerli, piyasa_ipucu, doğal_mevki, potansiyel, lig_seviyesi]";
  const positions=["GK","CB","LB","RB","DM","CM","LM","RM","AM","LW","RW","ST"];
  const packed=pool.map(player=>{
    const positionIndex=Math.max(0,positions.indexOf(player[7]));
    const potential=Math.max(50,Math.min(96,Number(player[8])||player[1]));
    const tier=Math.max(1,Math.min(2,Number(player[9])||1));
    const meta=positionIndex+(potential-50)*positions.length+(tier-1)*positions.length*47;
    return player.slice(0,7).concat(meta);
  });
  const raw=`_${definition.variable}_PACKED`;
  return `/* ${pool.length} oyunculuk ${label}. Runtime format: ${schema} */\nvar COPA_NATURAL_POSITIONS=globalThis.COPA_NATURAL_POSITIONS||${JSON.stringify(positions)},${raw}=${JSON.stringify(packed)},${definition.variable}=${raw}.map(function(p){var m=p.pop(),r=Math.floor(m/12);return p.concat(COPA_NATURAL_POSITIONS[m%12],50+r%47,1+Math.floor(r/47));});\n`;
}

const results=[];
for(const definition of FILES){
  const original=loadPool(definition);
  const pool=original.map(player=>rebalancePlayer(definition.country,player));
  if(definition.country==="TR"){
    tuneClubMean(pool,"Amedspor",72);
    tuneClubMean(pool,"Erzurumspor",71);
    tuneClubMean(pool,"Çorum FK",73);
    ensureTurkeyAdditions(pool);
  }
  if(definition.country==="JP")liftJapanElite(pool);
  pool.sort((a,b)=>a[1]-b[1]||a[0].localeCompare(b[0],"tr"));
  results.push(summary(definition.country,pool));
  if(WRITE)fs.writeFileSync(path.join(ROOT,"src","data",definition.file),outputSource(definition,pool),"utf8");
}

console.table(results);
console.log(WRITE?"Oyuncu havuzları yeniden dengelendi.":"Önizleme tamamlandı; yazmak için --write kullanın.");
