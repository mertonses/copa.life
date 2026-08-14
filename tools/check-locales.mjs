import fs from "node:fs";
import vm from "node:vm";

const source=fs.readFileSync(new URL("../src/data/i18n.js",import.meta.url),"utf8");
const context={
  console,Intl,window:{},document:undefined,navigator:{language:"en"},
  localStorage:{getItem(){return null;},setItem(){}}
};
vm.createContext(context);
vm.runInContext(`${source}\nthis.__locales=T;this.__localeUi=COPA_LOCALE_UI;this.__howto=COPA_HOWTO_TRANSLATIONS;`,context);

const cardDefsSource=fs.readFileSync(new URL("../src/cards/cardDefs.js",import.meta.url),"utf8");
const cardContext={variantOf(){return 0;},opponent:{power:0}};
vm.createContext(cardContext);
vm.runInContext(`${cardDefsSource}\nthis.__cardDefs=CARDDEFS;`,cardContext);

const required=["tr","en","es","de","it"];
const activeCardKeys=Object.keys(cardContext.__cardDefs);
const critical=[
  "budget","pickhdr","startBtn","rollHint","allBtn","youLbl","oppLbl","shopLbl",
  "squad","matchWin","matchLose","teleHead","cont","presHead","styleHdr","motm","yourXi","oppXi",
  "feedHdr","chairHdr","panicHead","storyHdr","talkSub","powHdr","powHdr2","cupTitle","tcHdr",
  "clubHdr","talkHead","ui.collectionHdr","ui.lockedCard","ui.effect","pos.GK","pos.CB","pos.CM","pos.ST",
  "chem.hdr","catName.hucum","catName.savunma","catName.ekonomi"
];

function at(object,path){return path.split(".").reduce((value,key)=>value&&value[key],object);}
const errors=[];
for(const language of required){
  if(!context.__locales[language])errors.push(`missing dictionary: ${language}`);
  if(!context.__localeUi[language])errors.push(`missing UI dictionary: ${language}`);
  const locale=context.__locales[language]||{},ui=context.__localeUi[language]||{};
  const brandSurfaces=[locale.coverTitle,locale.patreonText,locale.proto,locale.again,locale.ui&&locale.ui.postBand,ui.title];
  if(locale.coverTitle!=="Copa Life")errors.push(`${language}.coverTitle must be exactly "Copa Life"`);
  if(brandSurfaces.some(value=>typeof value==="string"&&/copa\.life/i.test(value)))errors.push(`${language} contains a legacy visible copa.life brand`);
}
function mechanicNumbers(text){
  return (String(text||"").match(/\d+(?:[.,]\d+)?(?:%|M|\+)?/g)||[])
    .map(value=>value.replace(",",".").replace("%",""))
    .sort((a,b)=>a.localeCompare(b));
}
for(const language of required){
  const cards=context.__locales[language]&&context.__locales[language].cards;
  const seenNames=new Map();
  for(const key of activeCardKeys){
    const card=cards&&cards[key];
    if(!card)errors.push(`${language}.cards.${key} is missing`);
    else{
      if(typeof card.n!=="string"||!card.n.trim())errors.push(`${language}.cards.${key}.n is empty`);
      if(typeof card.d!=="string"||!card.d.trim())errors.push(`${language}.cards.${key}.d is empty`);
      const normalizedName=String(card.n||"").trim().toLocaleLowerCase(language);
      if(normalizedName){
        if(seenNames.has(normalizedName))errors.push(`${language} card name "${card.n}" is duplicated by ${seenNames.get(normalizedName)} and ${key}`);
        else seenNames.set(normalizedName,key);
      }
    }
  }
}
const fullRoundNames={tr:["ÇEYREK FİNAL","YARI FİNAL"],en:["QUARTER FINAL","SEMI FINAL"],es:["CUARTOS DE FINAL","SEMIFINAL"],de:["VIERTELFINALE","HALBFINALE"],it:["QUARTI DI FINALE","SEMIFINALE"]};
for(const [language,names] of Object.entries(fullRoundNames)){
  const rounds=context.__locales[language]&&context.__locales[language].rounds||[];
  for(const name of names)if(!rounds.includes(name))errors.push(`${language}.rounds must use full round name "${name}"`);
}

const rewardNumbers=["6M","5","18","1","8M","8","1","8"];
const riskNumbers=["5","6M","9","12M"];
const badgeNumbers=["4M","6","2","6M","9","50","4","50","2"];
const rebalancedCardContracts={
  tr:{
    sahte_evrak:["Mükâfat",rewardNumbers],
    primler_yatinca:["Riziko",riskNumbers],
    deplasman_kafilesi:["Fedailer",badgeNumbers],
    tecrubeli_omurga:["Duvar!"],final_provasi:["Son Koz"],bu_adam:["Joker"],gec_gec:["Barikat"],yildiz:["Lokomotif"]
  },
  en:{
    sahte_evrak:["Reward",rewardNumbers],primler_yatinca:["Risk",riskNumbers],deplasman_kafilesi:["Devotees",badgeNumbers],tecrubeli_omurga:["The Wall!"],final_provasi:["Last Resort"],bu_adam:["Joker"],gec_gec:["Barricade"],yildiz:["Locomotive"]
  },
  es:{
    sahte_evrak:["Recompensa",rewardNumbers],primler_yatinca:["Riesgo",riskNumbers],deplasman_kafilesi:["Los Devotos",badgeNumbers],tecrubeli_omurga:["¡El Muro!"],final_provasi:["Último Recurso"],bu_adam:["Comodín"],gec_gec:["Barricada"],yildiz:["Locomotora"]
  },
  de:{
    sahte_evrak:["Belohnung",rewardNumbers],primler_yatinca:["Risiko",riskNumbers],deplasman_kafilesi:["Die Getreuen",badgeNumbers],tecrubeli_omurga:["Die Mauer!"],final_provasi:["Letzter Trumpf"],bu_adam:["Joker"],gec_gec:["Barrikade"],yildiz:["Lokomotive"]
  },
  it:{
    sahte_evrak:["Ricompensa",rewardNumbers],primler_yatinca:["Rischio",riskNumbers],deplasman_kafilesi:["I Fedeli",badgeNumbers],tecrubeli_omurga:["Il Muro!"],final_provasi:["Ultima Risorsa"],bu_adam:["Jolly"],gec_gec:["Barricata"],yildiz:["Locomotiva"]
  }
};
for(const [language,contracts] of Object.entries(rebalancedCardContracts)){
  for(const [key,[expectedName,expectedNumbers]] of Object.entries(contracts)){
    const card=context.__locales[language].cards[key];
    if(card.n!==expectedName)errors.push(`${language}.cards.${key}.n must be "${expectedName}", got "${card.n}"`);
    if(expectedNumbers&&mechanicNumbers(card.d).join("|")!==[...expectedNumbers].sort((a,b)=>a.localeCompare(b)).join("|")){
      errors.push(`${language}.cards.${key}.d does not match its canonical mechanic contract (${mechanicNumbers(card.d).join("|")})`);
    }
  }
}
for(const language of ["es","de","it"]){
  for(const key of critical){
    const value=at(context.__locales[language],key),english=at(context.__locales.en,key);
    if(value==null||value==="")errors.push(`${language}.${key} is empty`);
    else if(typeof value==="string"&&value===english)errors.push(`${language}.${key} still falls back to English`);
  }
  for(const key of ["settings","reduceMotion","soundEffects","heroTitle","heroDesc","newLabel","contact","activeEffects","noEvents"]){
    const value=context.__localeUi[language][key],english=context.__localeUi.en[key];
    if(!value||value===english)errors.push(`${language} UI key ${key} is missing or English`);
  }
  const guide=context.__howto[language];
  if(!guide||!guide.title||!guide.subtitle||!guide.close||!guide.back)errors.push(`${language} Copa Guide chrome is incomplete`);
  if(!guide||!Array.isArray(guide.steps)||guide.steps.length!==6)errors.push(`${language} Copa Guide must contain six translated steps`);
  else guide.steps.forEach((step,index)=>{
    if(!Array.isArray(step)||!step[0]||!step[1])errors.push(`${language} Copa Guide step ${index+1} is incomplete`);
  });
}

const profileSource=fs.readFileSync(new URL("../src/ui/playerProfiles.js",import.meta.url),"utf8");
const seasonSource=fs.readFileSync(new URL("../src/ui/seasonStats.js",import.meta.url),"utf8");
const lastMatchSource=fs.readFileSync(new URL("../src/ui/lastMatchReport.js",import.meta.url),"utf8");
const fixtureRoadSource=fs.readFileSync(new URL("../src/ui/fixtureRoad.js",import.meta.url),"utf8");
const tournamentSource=fs.readFileSync(new URL("../src/tournament/tournamentRuntime.js",import.meta.url),"utf8");
const arenaSource=fs.readFileSync(new URL("../src/online/arena.js",import.meta.url),"utf8");
const modeGateSource=fs.readFileSync(new URL("../src/ui/modeGate.js",import.meta.url),"utf8");
const sideFieldSource=fs.readFileSync(new URL("../src/sidefield/sideFieldUI.js",import.meta.url),"utf8");
const cardSummarySource=fs.readFileSync(new URL("../src/cards/cardEffectSummary.js",import.meta.url),"utf8");
const mobileSystemsSource=fs.readFileSync(new URL("../src/ui/mobileGameSystems.js",import.meta.url),"utf8");
const analyticsSource=fs.readFileSync(new URL("../src/runtime/productAnalytics.js",import.meta.url),"utf8");
const indexSource=fs.readFileSync(new URL("../index.html",import.meta.url),"utf8");
const tournamentWindow={LANG:"en"};tournamentWindow.window=tournamentWindow;
const tournamentContext={window:tournamentWindow};vm.createContext(tournamentContext);vm.runInContext(tournamentSource,tournamentContext);
const tournamentKeys=["ceremony","drawTitle","drawRule","tournament","team","played","wins","draws","losses","gd","points","groupMatchday","topTwo","allGroups","knockoutRule","roundof16","quarterfinal","semifinal","final","groupEliminated","drawPoint","winPoints","lossPoints"];
const tournamentLocalizedText=new Set(["ceremony","drawTitle","drawRule","tournament","groupMatchday","topTwo","allGroups","knockoutRule","roundof16","quarterfinal","semifinal","groupEliminated","drawPoint","winPoints","lossPoints"]);
const tournamentEnglish=tournamentWindow.CopaTournamentRuntime.copy();
for(const language of required){
  tournamentWindow.LANG=language;const copy=tournamentWindow.CopaTournamentRuntime.copy();
  for(const key of tournamentKeys){
    if(!copy[key])errors.push(`tournament ${language}.${key} is missing`);
    else if(["es","de","it"].includes(language)&&tournamentLocalizedText.has(key)&&copy[key]===tournamentEnglish[key])errors.push(`tournament ${language}.${key} still falls back to English`);
  }
}
for(const language of ["es","de","it"]){
  for(const key of ["overview","playStyle","strengths","risks","tendencies","loading","noModel","positionFit","modelNote"]){
    const marker=new RegExp(`${language}:\\{[^\\n]*${key}:`);
    if(!marker.test(profileSource))errors.push(`player profile ${language}.${key} missing`);
  }
}
for(const marker of ["SEZON İSTATİSTİKLERİ","SEASON STATISTICS","ESTADÍSTICAS DE TEMPORADA","SAISONSTATISTIK","STATISTICHE STAGIONALI"]){
  if(!seasonSource.includes(marker))errors.push(`season statistics locale marker missing: ${marker}`);
}
for(const marker of ["GRUP · 1. MAÇ","GROUP · MATCH 1","GRUPO · PARTIDO 1","GRUPPE · SPIEL 1","GIRONE · PARTITA 1"]){
  if(!lastMatchSource.includes(marker))errors.push(`last-match group-stage marker missing: ${marker}`);
}
for(const requiredStage of ["SON 16","ROUND OF 16","OCTAVOS","ACHTELFINALE","OTTAVI"]){
  if(!lastMatchSource.includes(requiredStage)&&!fixtureRoadSource.includes(requiredStage))errors.push(`round-of-16 stage is missing from match UI: ${requiredStage}`);
}
if(!fixtureRoadSource.includes('Group · Match 1'))errors.push("fixture road fallback is missing the first group match");

const multiplayerLabels={
  tr:"ÇOK OYUNCULU",
  en:"MULTIPLAYER",
  es:"MULTIJUGADOR",
  de:"MEHRSPIELER",
  it:"MULTIGIOCATORE"
};
for(const [language,label] of Object.entries(multiplayerLabels)){
  if(!modeGateSource.includes(`multiplayer:"${label}"`))errors.push(`mode gate ${language}.multiplayer must be "${label}"`);
  if(!arenaSource.includes(`multiplayer:"${label}"`))errors.push(`Arena ${language}.multiplayer must be "${label}"`);
}
for(const [sourceName,sourceText] of [["index.html",indexSource],["mode gate",modeGateSource],["Arena",arenaSource]]){
  if(/PREMIUM\s+MULTIPLAYER/i.test(sourceText))errors.push(`${sourceName} still contains PREMIUM MULTIPLAYER`);
}
for(const sourceName of ["src/ui/modeGate.js","src/online/arena.js"]){
  const sourceText=sourceName.includes("modeGate")?modeGateSource:arenaSource;
  for(const language of required)if(!sourceText.includes(`${language}:`))errors.push(`${sourceName} is missing ${language} copy`);
}

const newSurfaceMarkers={
  tr:{side:"KARAR KAYITLARI",power:"GÜÇ",nav:"YAN SAHA",analytics:"ANONİM KULLANIM ÖLÇÜMÜ",arena:"HAZIR KULÜP"},
  en:{side:"PROPHECY RECORD",power:"POWER",nav:"SIDE FIELD",analytics:"ANONYMOUS USAGE METRICS",arena:"READY-MADE CLUB"},
  es:{side:"REGISTRO",power:"FUERZA",nav:"CAMPO LATERAL",analytics:"MÉTRICAS DE USO ANÓNIMAS",arena:"CLUB PREPARADO"},
  de:{side:"BILANZ",power:"STÄRKE",nav:"NEBENPLATZ",analytics:"ANONYME NUTZUNGSMESSUNG",arena:"BEREITER CLUB"},
  it:{side:"REGISTRO",power:"FORZA",nav:"CAMPO LATERALE",analytics:"METRICHE DI UTILIZZO ANONIME",arena:"CLUB PRONTO"}
};
for(const [language,markers] of Object.entries(newSurfaceMarkers)){
  if(!sideFieldSource.includes(markers.side))errors.push(`Yan Saha ${language} record copy is missing`);
  if(!cardSummarySource.includes(markers.power))errors.push(`card effect summary ${language} power copy is missing`);
  if(!mobileSystemsSource.includes(markers.nav))errors.push(`hub navigation ${language} Yan Saha copy is missing`);
  if(!analyticsSource.includes(markers.analytics))errors.push(`analytics setting ${language} copy is missing`);
  if(!arenaSource.includes(markers.arena))errors.push(`Arena ${language} system-club copy is missing`);
}
for(const language of required){
  if(!new RegExp(`(?:^|\\n)\\s*${language}:\\{`).test(sideFieldSource))errors.push(`Yan Saha ${language} dictionary is missing`);
  if(!new RegExp(`(?:^|\\n)\\s*${language}:\\{`).test(cardSummarySource))errors.push(`card effect summary ${language} dictionary is missing`);
}
function objectLiteral(source,startMarker,endMarker,label){
  const start=source.indexOf(startMarker),close=source.indexOf("\n  };",start+startMarker.length),end=close<0?source.indexOf(endMarker,start+startMarker.length):close+4;
  if(start<0||end<0){errors.push(`${label} dictionary could not be audited`);return{};}
  try{return vm.runInNewContext(`(${source.slice(start+startMarker.length,end)})`);}catch(error){errors.push(`${label} dictionary is not evaluable: ${error.message}`);return{};}
}
function equalKeysets(dictionary,label){
  const canonical=Object.keys(dictionary.en||{}).sort().join("|");
  for(const language of required){
    const copy=dictionary[language];
    if(!copy){errors.push(`${label} ${language} dictionary is missing`);continue;}
    if(Object.keys(copy).sort().join("|")!==canonical)errors.push(`${label} ${language} keys do not match English`);
    for(const [key,value] of Object.entries(copy))if(value==null||value==="")errors.push(`${label} ${language}.${key} is empty`);
  }
}
equalKeysets(objectLiteral(sideFieldSource,"const COPY=",";\n  const c=","Yan Saha"),"Yan Saha");
equalKeysets(objectLiteral(cardSummarySource,"const TEXT=",";\n  const t=","card effect summary"),"card effect summary");
const navDictionary=objectLiteral(mobileSystemsSource,"const NAV_COPY=",";\n  const navCopy=","hub navigation");
equalKeysets(navDictionary,"hub navigation");
equalKeysets(Object.fromEntries(required.map(code=>[code,navDictionary[code]&&navDictionary[code].labels])),"hub navigation labels");

if(errors.length){
  console.error("Locale check failed:\n- "+errors.join("\n- "));
  process.exit(1);
}
console.log(`Locale check passed: ${activeCardKeys.length} active cards and TR/EN/ES/DE/IT critical UI/player-profile coverage verified.`);
