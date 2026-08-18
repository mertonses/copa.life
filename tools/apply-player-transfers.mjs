import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const ROOT=path.resolve(import.meta.dirname,"..");
const WRITE=process.argv.includes("--write");
const CHECK=process.argv.includes("--check");
const TRANSFER_RELEASE="2026-08-18";

const FILES=[
  {country:"TR",file:"players.js",variable:"POOL"},
  {country:"ENG",file:"players_england.js",variable:"POOL_EN"},
  {country:"ES",file:"players_spain.js",variable:"POOL_ES"},
  {country:"IT",file:"players_italy.js",variable:"POOL_IT"},
  {country:"DE",file:"players_germany.js",variable:"POOL_DE"},
  {country:"JP",file:"players_japan.js",variable:"POOL_JP"}
];

const ACTIONS=[
  // Türkiye: high-confidence arrivals and domestic moves.
  {name:"Mason Greenwood",country:"TR",club:"Fenerbahçe",age:24,record:[85,"FWD","Fenerbahçe",24,0,0,"RW",90,1]},
  {name:"Sidiki Chérif",country:"TR",club:"Fenerbahçe",age:19},
  {name:"Nathan Aké",country:"TR",club:"Fenerbahçe",age:31},
  {name:"Romelu Lukaku",country:"TR",club:"Fenerbahçe",age:32},
  {name:"Cengiz Ünder",country:"TR",club:"Fenerbahçe",age:28,record:[79,"FWD","Fenerbahçe",28,1,0,"RW",79,1]},
  {name:"Orkun Kökçü",country:"TR",club:"Beşiktaş",age:25,record:[89,"MID","Beşiktaş",25,1,0,"DM",92,1]},
  {name:"Leandro Trossard",country:"TR",club:"Beşiktaş",age:30},
  {name:"Kassoum Ouattara",country:"TR",club:"Beşiktaş",age:21,record:[75,"DEF","Beşiktaş",21,0,0,"LB",85,1]},
  {name:"Alexander Nübel",country:"TR",club:"Beşiktaş",age:29,record:[82,"GK","Beşiktaş",29,0,0,"GK",84,1]},
  {name:"Doğan Alemdar",country:"TR",club:"Beşiktaş",age:23,record:[72,"GK","Beşiktaş",23,1,0,"GK",82,1]},
  {name:"Aral Şimşir",country:"TR",club:"Trabzonspor",age:24,record:[78,"FWD","Trabzonspor",24,1,0,"LW",86,1]},
  {name:"Ernest Muçi",country:"TR",club:"Trabzonspor",age:24},
  {name:"Cenk Özkacar",country:"TR",club:"Trabzonspor",age:25,record:[73,"DEF","Trabzonspor",25,1,0,"CB",81,1]},
  {name:"Eldor Shomurodov",country:"TR",club:"Başakşehir",age:30},
  {name:"Ahmed Kutucu",country:"TR",club:"Rizespor",age:25},
  {name:"Tayyip Talha Sanuç",country:"TR",club:"Rizespor",age:26,record:[79,"DEF","Rizespor",26,1,0,"CB",79,1]},
  {name:"Cenk Tosun",country:"TR",club:"Karagümrük",age:34},
  {name:"Batuhan Şen",country:"TR",club:"Karagümrük",age:27,record:[66,"GK","Karagümrük",27,1,0,"GK",74,1]},
  {name:"İrfan Can Eğribayat",country:"TR",club:"Gençlerbirliği",age:27,record:[75,"GK","Gençlerbirliği",27,1,0,"GK",78,1]},
  {name:"Salih Uçan",country:"TR",club:"Gençlerbirliği",age:31,record:[72,"MID","Gençlerbirliği",31,1,0,"CM",72,1]},
  {name:"İrfan Can Kahveci",country:"TR",club:"Kasımpaşa",age:30},
  {name:"Halil Dervişoğlu",country:"TR",club:"Gaziantep FK",age:26,record:[72,"FWD","Gaziantep FK",26,1,0,"ST",74,1]},
  {name:"Umut Erdem",country:"TR",club:"Rizespor",age:21},

  // Remove stale club rows; these players are outside the supported club pools or free agents.
  {name:"Fred",remove:true,age:32},
  {name:"Emre Mor",remove:true,age:28},
  {name:"Mauro Icardi",remove:true,age:32},
  {name:"Wilfried Zaha",remove:true,age:33},

  // Cross-league moves.
  {name:"Noa Lang",country:"IT",club:"S.S.C. Napoli",age:26},
  {name:"Nicolò Zaniolo",country:"IT",club:"Udinese Calcio",age:26},
  {name:"Sacha Boey",country:"DE",club:"FC Bayern München",age:25},
  {name:"Edson Álvarez",country:"ENG",club:"West Ham United",age:28,record:[84,"MID","West Ham United",28,0,1,"DM",84,1]},
  {name:"Anthony Gordon",country:"ES",club:"F.C. Barcelona",age:24},
  {name:"Karim Adeyemi",country:"ES",club:"F.C. Barcelona",age:23},
  {name:"Denzel Dumfries",country:"ES",club:"Real Madrid C.F.",age:29},
  {name:"Djed Spence",country:"IT",club:"F.C. Internazionale Milano",age:24},
  {name:"Eljif Elmas",country:"DE",club:"RasenBallsport Leipzig",age:25},
  {name:"Nathaniel Brown",country:"DE",club:"FC Bayern München",age:22},
  {name:"Morgan Rogers",country:"ENG",club:"Chelsea",age:22},
  {name:"Youri Tielemans",country:"ENG",club:"Manchester United",age:28},
  {name:"Takuma Asano",country:"JP",club:"Hiroshima",age:30},
  {name:"Sébastien Haller",country:"JP",club:"Hiroshima",age:32,record:[74,"FWD","Hiroshima",32,0,0,"ST",75,1]},
  {name:"Jackson Irvine",country:"JP",club:"C-Osaka",age:32},
  {name:"Nicolai Vallys",country:"JP",club:"FC Tokyo",age:29,record:[74,"FWD","FC Tokyo",29,0,0,"LW",76,1]},
  {name:"Anderson Lopes",country:"JP",club:"Kobe",age:32,record:[74,"FWD","Kobe",32,0,0,"ST",75,1]},

  // User-confirmed corrections on the 2026-08-18 database snapshot.
  {name:"Gonzalo",targetName:"Gonzalo García",sourceCountry:"ES",sourceClub:"Real Madrid C.F.",country:"ENG",club:"Fulham",age:21},
  {name:"Taisei Miyashiro",sourceCountry:"ES",sourceClub:"U.D. Las Palmas",country:"ES",club:"U.D. Las Palmas",age:25},

  // Already correct or intentionally retained; the action still collapses accidental duplicates.
  {name:"Donyell Malen",country:"IT",club:"A.S. Roma",age:26},
  {name:"Rasmus Højlund",country:"IT",club:"S.S.C. Napoli",age:22},
  {name:"Erison",country:"JP",club:"Kawasaki-F",age:26},
  {name:"Sofyan Amrabat",country:"TR",club:"Fenerbahçe",age:29}
];

const REVIEW_NOTES=[
  "Gonzalo García: ES/Real Madrid C.F. kaydı isim düzeltmesiyle ENG/Fulham'a taşındı; kalıcı playerId korundu.",
  "Taisei Miyashiro: ES/U.D. Las Palmas kaydı doğrulandı; kulüp değiştirilmedi.",
  "Donyell Malen ve Rasmus Højlund: hedef lig/kulüp kaydı zaten doğru olduğundan yalnızca tekilleştirildi."
];

function normalize(value){
  return String(value||"").toLocaleLowerCase("tr-TR")
    .replaceAll("ı","i").replaceAll("ş","s").replaceAll("ğ","g").replaceAll("ü","u")
    .replaceAll("ö","o").replaceAll("ç","c").replaceAll("ß","ss").replaceAll("ø","o")
    .replaceAll("đ","d").replaceAll("ð","d").replaceAll("þ","th").replaceAll("æ","ae")
    .replaceAll("œ","oe").normalize("NFKD").replace(/[\u0300-\u036f]/g,"")
    .replace(/[^a-z0-9]+/g," ").trim().replace(/\s+/g," ");
}

function loadPool(definition){
  const source=fs.readFileSync(path.join(ROOT,"src","data",definition.file),"utf8");
  const context={};vm.createContext(context);
  vm.runInContext(`${source}\nthis.__pool=${definition.variable};`,context,{filename:definition.file});
  return context.__pool.map(player=>Array.from(player));
}

function slug(value){return normalize(value).replace(/\s+/g,"-").slice(0,64)||"unknown";}
function stablePlayerId(country,row,collisionIndex=0){
  const base=`pl-${slug(row[0])}-${Number(row[4])||0}-${slug(row[7]||row[2])}`;
  return collisionIndex?`${base}-${slug(row[3])}`:base;
}
function assignPlayerIds(pools){
  const rows=allRows(pools),groups=new Map();
  for(const item of rows){
    const key=`${normalize(item.row[0])}|${Number(item.row[4])||0}|${normalize(item.row[7]||item.row[2])}`;
    const list=groups.get(key)||[];list.push(item);groups.set(key,list);
  }
  for(const list of groups.values()){
    const collision=list.length>1;
    list.forEach((item,index)=>{
      if(typeof item.row[10]==="string"&&item.row[10].startsWith("pl-"))return;
      item.row[10]=stablePlayerId(item.definition.country,item.row,collision?index+1:0);
    });
  }
}

function outputSource(definition,pool){
  const label=definition.country==="TR"?"Türkiye oyuncu havuzu":"Oyuncu havuzu";
  const schema="[ad, güç, rol, kulüp, yaş, yerli, piyasa_ipucu, doğal_mevki, potansiyel, lig_seviyesi]";
  const positions=["GK","CB","LB","RB","DM","CM","LM","RM","AM","LW","RW","ST"];
  const packed=pool.map(player=>{
    const positionIndex=Math.max(0,positions.indexOf(player[7]));
    const potential=Math.max(50,Math.min(96,Number(player[8])||Number(player[1])||50));
    const tier=Math.max(1,Math.min(2,Number(player[9])||1));
    const meta=positionIndex+(potential-50)*positions.length+(tier-1)*positions.length*47;
    return player.slice(0,7).concat(meta,player[10]||stablePlayerId(definition.country,player));
  });
  const raw=`_${definition.variable}_PACKED`;
  return `/* ${pool.length} oyunculuk ${label}. Transfer güncellemesi: ${TRANSFER_RELEASE}. Runtime format: ${schema}; stable playerId is the final field. */\nvar COPA_NATURAL_POSITIONS=globalThis.COPA_NATURAL_POSITIONS||${JSON.stringify(positions)},${raw}=${JSON.stringify(packed)},${definition.variable}=${raw}.map(function(p){var id=p.pop(),m=p.pop(),r=Math.floor(m/12),row=p.concat(COPA_NATURAL_POSITIONS[m%12],50+r%47,1+Math.floor(r/47));row.push(id);return row;});\n`;
}

function allRows(pools){return FILES.flatMap(definition=>pools.get(definition.country).map((row,index)=>({definition,row,index})));}
function matchesByName(pools,name){const key=normalize(name);return allRows(pools).filter(item=>normalize(item.row[0])===key);}
function removeMatches(pools,name){for(const definition of FILES){const pool=pools.get(definition.country);for(let index=pool.length-1;index>=0;index--)if(normalize(pool[index][0])===normalize(name))pool.splice(index,1);}}
function rowFromAction(action,matches){
  const sameAge=matches.filter(item=>Number(item.row[4])===Number(action.age));
  const candidates=sameAge.length?sameAge:matches;
  const preferred=candidates.find(item=>item.definition.country===action.sourceCountry&&normalize(item.row[3])===normalize(action.sourceClub))
    ||candidates.find(item=>item.definition.country===action.country&&normalize(item.row[3])===normalize(action.club));
  if(preferred)return Array.from(preferred.row);
  if(candidates[0])return Array.from(candidates[0].row);
  if(action.record)return [action.name,...action.record];
  return null;
}

function applyActions(pools){
  const changes=[];
  for(const action of ACTIONS){
    const targetName=action.targetName||action.name;
    const matches=[...matchesByName(pools,action.name),...(targetName===action.name?[]:matchesByName(pools,targetName))];
    const before=matches.map(item=>`${item.definition.country}/${item.row[3]}/${item.row[4]}`);
    removeMatches(pools,action.name);
    if(targetName!==action.name)removeMatches(pools,targetName);
    if(!action.remove){
      const row=rowFromAction(action,matches);
      if(!row)throw new Error(`No source row or explicit record for ${action.name}`);
      row[0]=action.targetName||action.name;row[3]=action.club;row[4]=Number(action.age);
      const target=pools.get(action.country);
      if(!target)throw new Error(`Unknown target country for ${action.name}: ${action.country}`);
      target.push(row);
      changes.push({name:action.name,action:"upsert",before,after:`${action.country}/${action.club}/${action.age}`,source:action.source||"Transfermarkt 2026/27 transfer snapshot"});
    }else changes.push({name:action.name,action:"remove",before,after:"not in club player pools",source:action.source||"Transfermarkt 2026/27 transfer snapshot"});
  }
  for(const definition of FILES){
    const pool=pools.get(definition.country);
    pool.sort((a,b)=>Number(a[1])-Number(b[1])||String(a[0]).localeCompare(String(b[0]),"tr"));
  }
  return changes;
}

function validate(pools){
  const failures=[];
  for(const action of ACTIONS){
    const targetName=action.targetName||action.name;
    const rows=matchesByName(pools,targetName);
    if(action.remove){if(rows.length)failures.push(`${action.name}: removed oyuncu still exists (${rows.map(row=>row.definition.country+"/"+row.row[3]).join(", ")})`);continue;}
    if(rows.length!==1)failures.push(`${targetName}: expected one record, found ${rows.length}`);
    const row=rows[0];
    if(row&&(`${row.definition.country}|${normalize(row.row[3])}|${row.row[4]}`!==`${action.country}|${normalize(action.club)}|${action.age}`))failures.push(`${action.name}: wrong target ${row.definition.country}/${row.row[3]}/${row.row[4]}`);
  }
  return failures;
}

function validatePlayerIds(pools){
  const seen=new Map(),failures=[];
  for(const item of allRows(pools)){
    const id=item.row[10];
    if(typeof id!=="string"||!/^pl-[a-z0-9-]+$/.test(id))failures.push(`${item.row[0]}: missing/invalid playerId`);
    const prior=seen.get(id);
    if(prior)failures.push(`duplicate playerId ${id}: ${prior} and ${item.definition.country}/${item.row[3]}`);
    else seen.set(id,`${item.definition.country}/${item.row[0]}/${item.row[3]}`);
  }
  return failures;
}

function profileCategory(action){
  const role=action.record?.[1]||"MID";
  if(role==="GK")return "keeper";
  if(role==="FWD")return "forward";
  if(role==="DEF")return "defender";
  return "midfield";
}

function profileTemplate(records,fields,action){
  const positionIndex=fields.indexOf("best_position");
  const category=profileCategory(action);
  const candidates=Object.entries(records).filter(([key])=>key.startsWith(`${action.country}|`));
  const matches=([,record])=>{
    const position=String(record[positionIndex]||"").toLocaleUpperCase("tr-TR");
    if(category==="keeper")return /(?:GK|KL)/.test(position);
    if(category==="forward")return /(?:ST|OOS)/.test(position);
    if(category==="defender")return /(?:D\b|KB)/.test(position);
    return /(?:OS|DOS)/.test(position);
  };
  return candidates.find(matches)?.[1]||candidates[0]?.[1]||null;
}

function syncProfileSource(pools){
  const profilePath=path.join(ROOT,"tools","data","player_profile_source.json");
  const data=JSON.parse(fs.readFileSync(profilePath,"utf8"));
  const records=data.records||{};
  for(const action of ACTIONS){
    const effectiveName=action.targetName||action.name;
    const nameKey=normalize(effectiveName),age=String(action.age);
    const keys=Object.keys(records).filter(key=>key.split("|")[1]===nameKey);
    if(action.remove){for(const key of keys)delete records[key];continue;}
    const targetClub=normalize(action.club),targetKey=`${action.country}|${nameKey}|${age}|${targetClub}`;
    const candidate=keys.find(key=>key===targetKey)||keys.find(key=>key.split("|")[2]===age)||keys[0];
    if(candidate&&candidate!==targetKey)records[targetKey]=records[candidate];
    if(!records[targetKey]){
      const template=profileTemplate(records,data.fields,{...action,name:effectiveName});
      if(template)records[targetKey]=Array.isArray(template)?Array.from(template):template;
    }
    for(const key of keys)if(key!==targetKey)delete records[key];
  }
  const currentRows=allRows(pools).map(({definition,row})=>({
    country:definition.country,row,
    key:[definition.country,normalize(row[0]),Number(row[4])||0,normalize(row[3])].join("|"),
    identity:[definition.country,normalize(row[0]),Number(row[4])||0].join("|")
  }));
  const validKeys=new Set(currentRows.map(item=>item.key));
  const byIdentity=new Map();
  for(const item of currentRows){const list=byIdentity.get(item.identity)||[];list.push(item);byIdentity.set(item.identity,list);}
  const reconciled={};
  for(const [key,record] of Object.entries(records)){
    if(validKeys.has(key)){reconciled[key]=record;continue;}
    const parts=key.split("|"),candidates=byIdentity.get(parts.slice(0,3).join("|"))||[];
    if(candidates.length===1)reconciled[candidates[0].key]=record;
  }
  // JP has a strict profile-coverage contract; new arrivals get a role-matched Copa model template.
  for(const item of currentRows.filter(row=>row.country==="JP"))if(!reconciled[item.key]){
    const template=profileTemplate(reconciled,data.fields,{country:"JP",record:[item.row[1],item.row[2]]});
    if(template)reconciled[item.key]=Array.isArray(template)?Array.from(template):template;
  }
  data.records=reconciled;
  return data;
}

function writeProfileSource(data){
  fs.writeFileSync(path.join(ROOT,"tools","data","player_profile_source.json"),`${JSON.stringify(data)}\n`,"utf8");
}

const pools=new Map(FILES.map(definition=>[definition.country,loadPool(definition)]));
const changes=applyActions(pools);
assignPlayerIds(pools);
const failures=validate(pools);
const idFailures=validatePlayerIds(pools);
if(failures.length||idFailures.length)throw new Error(`Transfer validation failed:\n${failures.concat(idFailures).join("\n")}`);
if(CHECK){
  console.log(`Transfer dataset OK (${TRANSFER_RELEASE}); ${changes.length} action records validated; no updated player appears in two clubs.`);
  console.log(REVIEW_NOTES.map(note=>`Review: ${note}`).join("\n"));
  process.exit(0);
}
if(!WRITE){
  console.log(`Preview OK (${TRANSFER_RELEASE}); ${changes.length} action records ready. Use --write to persist.`);
  console.log(REVIEW_NOTES.map(note=>`Review: ${note}`).join("\n"));
  process.exit(0);
}

for(const definition of FILES)fs.writeFileSync(path.join(ROOT,"src","data",definition.file),outputSource(definition,pools.get(definition.country)),"utf8");
writeProfileSource(syncProfileSource(pools));
console.log(`Transfer dataset written (${TRANSFER_RELEASE}); ${changes.length} action records; ${[...pools].reduce((sum,[,pool])=>sum+pool.length,0)} total players.`);
console.log(changes.map(change=>`${change.action.padEnd(6)} ${change.name}: ${change.before.join(", ")||"new"} -> ${change.after}`).join("\n"));
console.log(REVIEW_NOTES.map(note=>`Review: ${note}`).join("\n"));
