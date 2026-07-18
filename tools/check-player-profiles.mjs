import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const ROOT=path.resolve(import.meta.dirname,"..");
const PLAYER_SOURCES={TR:["src/data/players.js","POOL"],ENG:["src/data/players_england.js","POOL_EN"],ES:["src/data/players_spain.js","POOL_ES"],IT:["src/data/players_italy.js","POOL_IT"],DE:["src/data/players_germany.js","POOL_DE"],JP:["src/data/players_japan.js","POOL_JP"]};
const EXPECTED_FIELDS=["copa_impact","copa_build_up","copa_space_control","copa_duels","copa_engine","copa_pressure_decision","position_fit","strengths","risks","tendencies","archetype","national_team","secondary_position","preferred_foot","best_position","positions"];
const DIMENSION_KEYS=["impact","build_up","space_control","duels","engine","pressure_decision"];
const BANNED_FIELDS=["injury_proneness","aggression","composure","finishing","reflexes","stamina"];

function normalize(value){return String(value||"").toLocaleLowerCase("tr-TR").replaceAll("ı","i").replaceAll("ł","l").replaceAll("ø","o").replaceAll("ð","d").replaceAll("þ","th").replaceAll("đ","d").replaceAll("æ","ae").replaceAll("œ","oe").replaceAll("ß","ss").normalize("NFKD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g," ").trim().replace(/\s+/g," ");}
function loadPoolRows(relativePath,variable,country){const context={};vm.createContext(context);vm.runInContext(fs.readFileSync(path.join(ROOT,relativePath),"utf8")+"\nthis.__pool="+variable+";",context);return context.__pool.map(tuple=>({country,tuple,key:[country,normalize(tuple[0]),Number(tuple[4])||0,normalize(tuple[3])].join("|")}));}

const profileData=JSON.parse(fs.readFileSync(path.join(ROOT,"assets/data/copa/player_profiles.json"),"utf8")),fields=profileData.fields,records=profileData.records;
const fallbackSource=fs.readFileSync(path.join(ROOT,"assets/data/copa/player_profiles.js"),"utf8"),fallbackContext={};vm.createContext(fallbackContext);vm.runInContext(fallbackSource,fallbackContext);
if(JSON.stringify(fallbackContext.__COPA_PLAYER_PROFILE_DATA__)!==JSON.stringify(profileData))throw new Error("JavaScript file fallback differs from the canonical profile JSON");
if(profileData.schema_version!==1||profileData.model_version!=="copa-model-v1"||profileData.source!=="copa.life oyun modeli")throw new Error("copa-model-v1 metadata is invalid");
if(JSON.stringify(fields)!==JSON.stringify(EXPECTED_FIELDS))throw new Error("copa profile fields do not match the v1 contract");
if(BANNED_FIELDS.some(field=>fields.includes(field)))throw new Error("raw or medical attribute leaked into the public schema");
const poolRows=Object.entries(PLAYER_SOURCES).flatMap(([country,[file,variable]])=>loadPoolRows(file,variable,country)),validKeys=new Set(poolRows.map(row=>row.key)),counts={TR:0,ENG:0,ES:0,IT:0,DE:0,JP:0};
for(const [key,row] of Object.entries(records)){if(!validKeys.has(key))throw new Error("Unknown profile key: "+key);if(!Array.isArray(row)||row.length!==fields.length)throw new Error("Incomplete profile row: "+key);for(let index=0;index<7;index++)if(!Number.isInteger(row[index])||row[index]<0||row[index]>100)throw new Error(`Invalid copa score ${fields[index]} at ${key}`);for(const index of [7,8,9])if(!Array.isArray(row[index]))throw new Error("Narrative field must be an array: "+key);counts[key.split("|")[0]]++;}
if(Object.keys(records).length!==8866)throw new Error("Expected 8866 copa profiles");
if(Object.values(counts).some(count=>!count))throw new Error("A country has no profiles");

const indexHtml=fs.readFileSync(path.join(ROOT,"index.html"),"utf8"),profileUi=fs.readFileSync(path.join(ROOT,"src/ui/playerProfiles.js"),"utf8"),profileCss=fs.readFileSync(path.join(ROOT,"src/styles/playerProfiles.css"),"utf8"),profileStore=fs.readFileSync(path.join(ROOT,"src/data/player_profile_store.js"),"utf8"),serviceWorker=fs.readFileSync(path.join(ROOT,"sw.js"),"utf8");
for(const marker of ["copa-model-v1","DIMENSION_KEYS","positionFit","Baskı ve Karar","Kurtarış Etkisi","Temaslı oyun eğilimi","radarHtml","data-profile-retry","clubLogoFor","genericCrestFor","countryCode","NATIONAL_TEAM_LEVELS","A Milli","_normalizeForTest","_renderForTest"])if(!profileUi.includes(marker))throw new Error("Profile UI marker missing: "+marker);
for(const forbidden of ["injury_proneness","Sakatlığa yatkın","Fazla agresif","aria-valuemax=\"20\"","data-profile-attributes"])if(profileUi.includes(forbidden))throw new Error("Legacy profile UI leaked: "+forbidden);
for(const marker of ["assets/data/copa/player_profiles.json","assets/data/copa/player_profiles.js","_playerProfileFallback","_playerProfileGenerated","location.protocol===\"file:\"","source_type:\"copa_model\"","source_type:\"copa_model_fallback\"","model_version","PLAYER_PROFILE_MAX_ATTEMPTS=2"])if(!profileStore.includes(marker))throw new Error("Profile store marker missing: "+marker);
for(const marker of [".player-profile-radar-area",".player-profile-fit",".player-profile-model-note",".is-generic-crest",".is-country-code","body.player-profile-open","prefers-reduced-motion"])if(!profileCss.includes(marker))throw new Error("Profile CSS marker missing: "+marker);
if(!serviceWorker.includes("/assets/data/copa/player_profiles.json")||serviceWorker.includes("/assets/data/fm26/"))throw new Error("Service Worker uses the wrong profile path");
for(const asset of ["src/runtime/platform.js","src/data/generic_club_visuals.js","src/ui/playerProfiles.js"])if(!indexHtml.includes(asset))throw new Error("Profile dependency missing from index: "+asset);

const storeContext={fetch:async()=>({ok:true,json:async()=>profileData}),console,setTimeout};vm.createContext(storeContext);vm.runInContext(profileStore,storeContext);
const sampleRow=poolRows.find(row=>Object.hasOwn(records,row.key)),resolved=await storeContext.playerProfileResolveKeyAsync({profileKey:sampleRow.key},sampleRow.country);if(resolved!==sampleRow.key)throw new Error("Explicit profile resolution failed");
const actual=await storeContext.playerProfileByKeyAsync(sampleRow.key);if(!actual||actual.source_type!=="copa_model"||actual.model_version!=="copa-model-v1")throw new Error("copa model record did not load");
const missingRows=poolRows.filter(row=>!Object.hasOwn(records,row.key)),resolvedMissing=await Promise.all(missingRows.map(row=>storeContext.playerProfileForPlayerAsync({profileKey:row.key,name:row.tuple[0],ov:row.tuple[1],role:row.tuple[2],club:row.tuple[3],age:row.tuple[4]},row.country)));
if(resolvedMissing.some(profile=>!profile||!["copa_model","copa_model_fallback"].includes(profile.source_type)||DIMENSION_KEYS.some(key=>!Number.isInteger(profile["copa_"+key]))))throw new Error("A pool player has no deterministic copa profile");
const fallbackIndex=resolvedMissing.findIndex(profile=>profile.source_type==="copa_model_fallback");if(fallbackIndex<0)throw new Error("Fallback profile path was not exercised");
const fallbackRow=missingRows[fallbackIndex],repeatedFallback=await storeContext.playerProfileForPlayerAsync({profileKey:fallbackRow.key,name:fallbackRow.tuple[0],ov:fallbackRow.tuple[1],role:fallbackRow.tuple[2],club:fallbackRow.tuple[3],age:fallbackRow.tuple[4]},fallbackRow.country);
if(JSON.stringify(resolvedMissing[fallbackIndex])!==JSON.stringify(repeatedFallback))throw new Error("Fallback profile is not deterministic");

let retryCalls=0;const retryContext={console,setTimeout,fetch:async()=>{retryCalls++;if(retryCalls===1)throw new Error("temporary");return{ok:true,json:async()=>profileData};}};vm.createContext(retryContext);vm.runInContext(profileStore,retryContext);await retryContext.loadPlayerProfiles();if(retryCalls!==2)throw new Error("Profile retry contract failed");

const inert=()=>{},uiContext={console,document:{addEventListener:inert,querySelectorAll:()=>[]},performance:{now:()=>0},location:{hostname:"example.test",search:""},addEventListener:inert,matchMedia:()=>({matches:false}),LANG:"tr",selectedCountry:sampleRow.country,CLUB_LOGOS_SM:{},ovCol:value=>"tone-"+value,COPA_PLATFORM:"web"};uiContext.window=uiContext;vm.createContext(uiContext);vm.runInContext(profileUi,uiContext);
const normalizeProfile=uiContext.PlayerProfiles._normalizeForTest,renderProfile=uiContext.PlayerProfiles._renderForTest;
const bestIndex=fields.indexOf("best_position"),outfieldKey=Object.keys(records).find(key=>!/^(?:KL|GK)$/i.test(records[key][bestIndex])),keeperKey=Object.keys(records).find(key=>/^(?:KL|GK)$/i.test(records[key][bestIndex]));
const outfieldProfile=await storeContext.playerProfileByKeyAsync(outfieldKey),keeperProfile=await storeContext.playerProfileByKeyAsync(keeperKey);
const outfield=normalizeProfile({name:"Outfield",natPos:outfieldProfile.best_position,ov:80,profileKey:outfieldKey},outfieldProfile),keeper=normalizeProfile({name:"Keeper",natPos:"KL",ov:80,profileKey:keeperKey},keeperProfile);
if(outfield.radar.map(item=>item.key).join(",")!==DIMENSION_KEYS.join(",")||keeper.radar.map(item=>item.key).join(",")!==DIMENSION_KEYS.join(","))throw new Error("Profiles must share the six copa dimensions");
if(outfield.radar[0].label!=="Hücum Etkisi"||keeper.radar[0].label!=="Kurtarış Etkisi")throw new Error("Role-aware impact label failed");
if(!outfield.radarReady||!keeper.radarReady||outfield.goalkeeperProfile||!keeper.goalkeeperProfile)throw new Error("Keeper classification failed");
if(!Number.isInteger(outfield.positionFit)||outfield.positionFit<0||outfield.positionFit>100)throw new Error("Position fit is invalid");
const senior=normalizeProfile({name:"Senior",natPos:"OS",ov:70},Object.assign({},outfieldProfile,{national_team:"Ana"}));if(senior.country!=="A Milli"||senior.countryCode!=="A")throw new Error("National-team level normalization failed");
const html=renderProfile(outfield);for(const marker of ["player-profile-radar-area","player-profile-fit","copa.life oyun modeli · 0–100","GÜÇLÜ YÖNLER"])if(!html.includes(marker))throw new Error("Profile render missing: "+marker);for(const marker of ["player-profile-stat","data-profile-attributes",'aria-valuemax="20"'])if(html.includes(marker))throw new Error("Raw attribute UI rendered: "+marker);
const repeated=normalizeProfile({name:"Outfield",natPos:outfieldProfile.best_position,ov:80,profileKey:outfieldKey},outfieldProfile);if(JSON.stringify({radar:outfield.radar,strengths:outfield.strengths,risks:outfield.risks,style:outfield.playStyle,fit:outfield.positionFit})!==JSON.stringify({radar:repeated.radar,strengths:repeated.strengths,risks:repeated.risks,style:repeated.playStyle,fit:repeated.positionFit}))throw new Error("copa profile is not deterministic");
const missing=normalizeProfile({name:"Missing",natPos:"OS",ov:60},null);if(missing.hasModel)throw new Error("Missing model did not produce an empty state");
const failed=normalizeProfile({name:"Offline",natPos:"OS",ov:60},null,{loadError:new Error("offline")});if(!renderProfile(failed).includes("data-profile-retry"))throw new Error("Load failure has no retry action");

console.log(`Player profiles OK: ${Object.keys(records).length} stored records with deterministic fallback coverage for all ${poolRows.length} pool players (${Object.entries(counts).map(([country,count])=>country+" "+count).join(", ")}); every player has six shared 0–100 dimensions, position fit, narratives, loader retry and UI rendering.`);
