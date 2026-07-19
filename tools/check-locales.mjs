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
  "budget","pickhdr","startBtn","quickStartBtn","rollHint","allBtn","youLbl","oppLbl","shopLbl",
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
for(const language of ["es","de","it"]){
  for(const key of ["overview","playStyle","strengths","risks","tendencies","analysis","loading","noModel","positionFit","modelNote"]){
    const marker=new RegExp(`${language}:\\{[^\\n]*${key}:`);
    if(!marker.test(profileSource))errors.push(`player profile ${language}.${key} missing`);
  }
}
for(const marker of ["SEZON İSTATİSTİKLERİ","SEASON STATISTICS","ESTADÍSTICAS DE TEMPORADA","SAISONSTATISTIK","STATISTICHE STAGIONALI"]){
  if(!seasonSource.includes(marker))errors.push(`season statistics locale marker missing: ${marker}`);
}

if(errors.length){
  console.error("Locale check failed:\n- "+errors.join("\n- "));
  process.exit(1);
}
console.log(`Locale check passed: ${activeCardKeys.length} active cards and TR/EN/ES/DE/IT critical UI/player-profile coverage verified.`);
