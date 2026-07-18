import fs from "node:fs";
import vm from "node:vm";

const source=fs.readFileSync(new URL("../src/data/i18n.js",import.meta.url),"utf8");
const context={
  console,Intl,window:{},document:undefined,navigator:{language:"en"},
  localStorage:{getItem(){return null;},setItem(){}}
};
vm.createContext(context);
vm.runInContext(`${source}\nthis.__locales=T;this.__localeUi=COPA_LOCALE_UI;this.__howto=COPA_HOWTO_TRANSLATIONS;`,context);

const required=["tr","en","es","de","it"];
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
  if(!guide||!guide.title||!guide.subtitle||!guide.close||!guide.back)errors.push(`${language} How to Play chrome is incomplete`);
  if(!guide||!Array.isArray(guide.steps)||guide.steps.length!==6)errors.push(`${language} How to Play must contain six translated steps`);
  else guide.steps.forEach((step,index)=>{
    if(!Array.isArray(step)||!step[0]||!step[1])errors.push(`${language} How to Play step ${index+1} is incomplete`);
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
console.log("Locale check passed: TR/EN/ES/DE/IT critical UI and player-profile coverage verified.");
