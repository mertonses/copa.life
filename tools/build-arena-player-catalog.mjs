import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import crypto from "node:crypto";
import {fileURLToPath} from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const DATASET_RELEASE="2026-08-18";
const sources=[
  {leagueCode:"TR",label:{tr:"Türkiye ligi",en:"Türkiye league",es:"Liga de Türkiye",de:"Liga Türkiye",it:"Campionato turco"},file:"src/data/players.js",variable:"POOL",scope:"Türkiye professional pools",snapshotDate:null},
  {leagueCode:"ES",label:{tr:"İspanya ligi",en:"Spain league",es:"Liga española",de:"Spanische Liga",it:"Campionato spagnolo"},file:"src/data/players_spain.js",variable:"POOL_ES",scope:"Spain professional pools",snapshotDate:null},
  {leagueCode:"DE",label:{tr:"Almanya ligi",en:"Germany league",es:"Liga alemana",de:"Deutsche Liga",it:"Campionato tedesco"},file:"src/data/players_germany.js",variable:"POOL_DE",scope:"Germany professional pools",snapshotDate:null},
  {leagueCode:"IT",label:{tr:"İtalya ligi",en:"Italy league",es:"Liga italiana",de:"Italienische Liga",it:"Campionato italiano"},file:"src/data/players_italy.js",variable:"POOL_IT",scope:"Italy professional pools",snapshotDate:null},
  {leagueCode:"ENG",label:{tr:"İngiltere ligi",en:"England league",es:"Liga inglesa",de:"Englische Liga",it:"Campionato inglese"},file:"src/data/players_england.js",variable:"POOL_EN",scope:"England professional pools",snapshotDate:null},
  {leagueCode:"JP",label:{tr:"Japonya ligi",en:"Japan league",es:"Liga japonesa",de:"Japanische Liga",it:"Campionato giapponese"},file:"src/data/players_japan.js",variable:"POOL_JP",scope:"Japan top-flight clubs",snapshotDate:"2026-08-18"}
];
const lines={
  GK:new Set(["GK"]),
  DEF:new Set(["CB","LB","RB","WB"]),
  MID:new Set(["DM","CM","AM"]),
  WING:new Set(["LM","RM","LW","RW"]),
  ST:new Set(["ST"])
};
const bands={
  connector:[64,69],
  reliable:[72,77],
  star:[79,84]
};
const targetPerLeague=24;
const minimumPerLeague=12;

function load(source){
  const filename=path.join(root,source.file);
  const context=Object.create(null);
  vm.createContext(context);
  vm.runInContext(`${fs.readFileSync(filename,"utf8")};this.__pool=${source.variable};`,context,{filename});
  if(!Array.isArray(context.__pool))throw new Error(`Invalid player pool: ${source.file}`);
  return context.__pool;
}

function stableScore(value){
  return crypto.createHash("sha256").update(value).digest("hex");
}

function normalizeIdentity(value){
  return String(value||"").normalize("NFKD").replace(/\p{Diacritic}/gu,"").toLocaleLowerCase("en-US").replace(/[^a-z0-9]+/g," ").trim();
}

function stablePlayerId(player){
  return `CP-${stableScore(`${normalizeIdentity(player.name)}|${player.age}`).slice(0,16).toUpperCase()}`;
}

const loaded=sources.flatMap(source=>load(source).map(row=>({
  name:String(row[0]||"").trim(),
  power:Number(row[1]),
  role:String(row[2]||""),
  club:String(row[3]||"").trim(),
  age:Number(row[4])||0,
  domesticFlag:Number(row[5])||0,
  marketHint:Number(row[6])||0,
  position:String(row[7]||""),
  potential:Number(row[8])||Number(row[1])||0,
  leagueLevel:Number(row[9])||0,
  sourceLeague:source.leagueCode
})));
const identitySources=new Map();
const identityCounts=new Map();
for(const player of loaded){
  const identity=`${normalizeIdentity(player.name)}|${player.age}`;
  const leagues=identitySources.get(identity)||new Set();
  leagues.add(player.sourceLeague);
  identitySources.set(identity,leagues);
  identityCounts.set(identity,(identityCounts.get(identity)||0)+1);
}
const quarantinedIdentities=new Set(
  [...identitySources].filter(([identity,leagues])=>leagues.size>1||(identityCounts.get(identity)||0)>1).map(([identity])=>identity)
);
const eligiblePlayers=loaded
  .filter(player=>!quarantinedIdentities.has(`${normalizeIdentity(player.name)}|${player.age}`))
  .map(player=>({...player,sourceId:stablePlayerId(player)}));
if(new Set(eligiblePlayers.map(player=>player.sourceId)).size!==eligiblePlayers.length){
  throw new Error("Stable Arena player identity collision");
}

const catalog={};
for(const line of Object.keys(lines)){
  catalog[line]={};
  for(const [tier,[min,max]] of Object.entries(bands)){
    catalog[line][tier]={};
    for(const source of sources){
      const candidates=eligiblePlayers
        .filter(player=>player.sourceLeague===source.leagueCode&&player.name&&player.club&&lines[line].has(player.position))
        .sort((a,b)=>{
          const distanceA=a.power<min?min-a.power:a.power>max?a.power-max:0;
          const distanceB=b.power<min?min-b.power:b.power>max?b.power-max:0;
          return distanceA-distanceB||
            stableScore(`${line}|${tier}|${a.sourceLeague}|${a.sourceId}`).localeCompare(stableScore(`${line}|${tier}|${b.sourceLeague}|${b.sourceId}`));
        })
        .slice(0,targetPerLeague);
      if(candidates.length<minimumPerLeague)throw new Error(`Thin Arena pool: ${line}/${tier}/${source.leagueCode} (${candidates.length}/${minimumPerLeague})`);
      catalog[line][tier][source.leagueCode]=candidates;
    }
  }
}

const sourceHash=crypto.createHash("sha256");
for(const source of sources)sourceHash.update(fs.readFileSync(path.join(root,source.file)));
sourceHash.update(JSON.stringify({DATASET_RELEASE,sources,lines:Object.fromEntries(Object.entries(lines).map(([key,value])=>[key,[...value]])),bands,targetPerLeague,minimumPerLeague}));
const sourceMetadata=Object.fromEntries(sources.map(source=>[source.leagueCode,{
  code:source.leagueCode,label:source.label,scope:source.scope,snapshotDate:source.snapshotDate,
  datasetRelease:DATASET_RELEASE,sourceFile:source.file
}]));
const output=`/* Generated by tools/build-arena-player-catalog.mjs from the cleared Copa Life player datasets. */
export const ARENA_PLAYER_COUNTRIES=Object.freeze(${JSON.stringify(sources.map(source=>source.leagueCode))});
export const ARENA_PLAYER_SOURCES=Object.freeze(${JSON.stringify(sourceMetadata,null,2)});
export const ARENA_PLAYER_QUARANTINE_COUNT=${quarantinedIdentities.size};
export const ARENA_PLAYER_CATALOG_VERSION="${sourceHash.digest("hex").slice(0,16)}";
export const ARENA_PLAYER_CATALOG=Object.freeze(${JSON.stringify(catalog,null,2)});
`;
const target=path.join(root,"services/copa-arena-api/src/playerCatalog.js");
const count=Object.values(catalog).reduce((sum,line)=>sum+Object.values(line).reduce((tierSum,tier)=>tierSum+Object.values(tier).reduce((countrySum,players)=>countrySum+players.length,0),0),0);
if(process.argv.includes("--check")){
  if(!fs.existsSync(target)||fs.readFileSync(target,"utf8")!==output)throw new Error("Arena player catalog is stale. Run npm run arena:players.");
  console.log(`Arena player catalog is current (${count} entries; ${quarantinedIdentities.size} ambiguous identities quarantined).`);
}else{
  fs.writeFileSync(target,output,"utf8");
  console.log(`Arena player catalog: ${target} (${count} entries; ${quarantinedIdentities.size} ambiguous identities quarantined)`);
}
