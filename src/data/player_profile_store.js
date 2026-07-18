var PLAYER_PROFILE_URL="assets/data/copa/player_profiles.json",PLAYER_PROFILE_FALLBACK_URL="assets/data/copa/player_profiles.js",PLAYER_PROFILE_VERSION="copa-model-v1",PLAYER_PROFILE_MAX_ATTEMPTS=2;
var PLAYER_PROFILE_DATA=null,PLAYER_PROFILE_LOADING=null,PLAYER_PROFILE_LAST_ERROR=null,PLAYER_PROFILE_LOAD_ATTEMPTS=0,PLAYER_PROFILE_LOAD_GENERATION=0;
var PLAYER_PROFILE_FALLBACK_LOADING=null;
var PLAYER_PROFILE_CACHE=new Map(),PLAYER_PROFILE_IDENTITY_INDEX=null,PLAYER_PROFILE_NAME_CLUB_INDEX=null,PLAYER_PROFILE_COUNTRY_NAME_AGE_INDEX=null;
function _playerProfileNorm(value){return String(value||"").toLocaleLowerCase("tr-TR").replaceAll("ı","i").replaceAll("ł","l").replaceAll("ø","o").replaceAll("ð","d").replaceAll("þ","th").replaceAll("đ","d").replaceAll("æ","ae").replaceAll("œ","oe").replaceAll("ß","ss").normalize("NFKD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g," ").trim().replace(/\s+/g," ");}
function playerProfileKey(country,name,club,age){return[String(country||"TR").toUpperCase(),_playerProfileNorm(name),Number(age)||0,_playerProfileNorm(club)].join("|");}
function _playerProfileIdentity(name,club,age){return[_playerProfileNorm(name),Number(age)||0,_playerProfileNorm(club)].join("|");}
function _playerProfileUniqueIndexPut(index,identity,key){if(!identity)return;if(index.has(identity))index.set(identity,null);else index.set(identity,key);}
function _buildPlayerProfileIdentityIndex(data){
  const identityIndex=new Map(),nameClubIndex=new Map(),countryNameAgeIndex=new Map();
  Object.keys(data&&data.records||{}).forEach(function(key){
    const parts=key.split("|"),country=parts[0]||"",name=parts[1]||"",age=parts[2]||"",club=parts.slice(3).join("|");
    _playerProfileUniqueIndexPut(identityIndex,[name,age,club].join("|"),key);
    _playerProfileUniqueIndexPut(nameClubIndex,[name,club].join("|"),key);
    _playerProfileUniqueIndexPut(countryNameAgeIndex,[country,name,age].join("|"),key);
  });
  PLAYER_PROFILE_IDENTITY_INDEX=identityIndex;
  PLAYER_PROFILE_NAME_CLUB_INDEX=nameClubIndex;
  PLAYER_PROFILE_COUNTRY_NAME_AGE_INDEX=countryNameAgeIndex;
}
function _playerProfileValidate(data){
  if(!data||data.schema_version!==1||data.model_version!=="copa-model-v1"||!Array.isArray(data.fields)||!data.fields.length||!data.records||typeof data.records!=="object"||Array.isArray(data.records))throw new Error("copa.life oyuncu modeli veri dosyasi gecersiz.");
  return data;
}
function _playerProfileLoadError(error){
  const value=error instanceof Error?error:new Error(String(error||"copa.life oyuncu modeli yuklenemedi."));
  value.code="PLAYER_PROFILE_LOAD_FAILED";value.attempts=PLAYER_PROFILE_LOAD_ATTEMPTS;return value;
}
function _playerProfileFallback(){
  if(globalThis.__COPA_PLAYER_PROFILE_DATA__)return Promise.resolve(globalThis.__COPA_PLAYER_PROFILE_DATA__);
  if(PLAYER_PROFILE_FALLBACK_LOADING)return PLAYER_PROFILE_FALLBACK_LOADING;
  if(typeof document==="undefined"||!document.createElement)return Promise.reject(new Error("copa.life oyuncu modeli fallback yuklenemedi."));
  PLAYER_PROFILE_FALLBACK_LOADING=new Promise(function(resolve,reject){
    const script=document.createElement("script"),fileMode=globalThis.location&&globalThis.location.protocol==="file:";
    script.async=true;script.src=PLAYER_PROFILE_FALLBACK_URL+(fileMode?"":"?v="+PLAYER_PROFILE_VERSION);
    script.onload=function(){
      PLAYER_PROFILE_FALLBACK_LOADING=null;
      const data=globalThis.__COPA_PLAYER_PROFILE_DATA__;
      if(data)resolve(data);else reject(new Error("copa.life oyuncu modeli fallback verisi bulunamadi."));
      script.remove();
    };
    script.onerror=function(){PLAYER_PROFILE_FALLBACK_LOADING=null;script.remove();reject(new Error("copa.life oyuncu modeli fallback dosyasi yuklenemedi."));};
    (document.head||document.documentElement).appendChild(script);
  });
  return PLAYER_PROFILE_FALLBACK_LOADING;
}
function _playerProfileFetch(attempt){
  PLAYER_PROFILE_LOAD_ATTEMPTS=attempt;
  if(globalThis.location&&globalThis.location.protocol==="file:")return _playerProfileFallback().then(_playerProfileValidate).catch(function(error){throw _playerProfileLoadError(error);});
  const retry=attempt>1?"&retry="+Date.now():"";
  return fetch(PLAYER_PROFILE_URL+"?v="+PLAYER_PROFILE_VERSION+retry,{cache:attempt>1?"reload":"default"}).then(function(response){
    if(!response||!response.ok)throw new Error("copa.life oyuncu modeli yuklenemedi: "+(response&&response.status||"network"));
    return response.json();
  }).then(_playerProfileValidate).catch(function(error){
    if(attempt<PLAYER_PROFILE_MAX_ATTEMPTS)return new Promise(function(resolve){setTimeout(resolve,120);}).then(function(){return _playerProfileFetch(attempt+1);});
    return _playerProfileFallback().then(_playerProfileValidate).catch(function(fallbackError){fallbackError.cause=error;throw _playerProfileLoadError(fallbackError);});
  });
}
function loadPlayerProfiles(options){
  const force=!!(options&&options.force);
  if(force){PLAYER_PROFILE_LOAD_GENERATION++;PLAYER_PROFILE_DATA=null;PLAYER_PROFILE_LOADING=null;PLAYER_PROFILE_LAST_ERROR=null;PLAYER_PROFILE_FALLBACK_LOADING=null;PLAYER_PROFILE_CACHE.clear();PLAYER_PROFILE_IDENTITY_INDEX=null;PLAYER_PROFILE_NAME_CLUB_INDEX=null;PLAYER_PROFILE_COUNTRY_NAME_AGE_INDEX=null;}
  if(PLAYER_PROFILE_DATA)return Promise.resolve(PLAYER_PROFILE_DATA);
  if(!PLAYER_PROFILE_LOADING){
    const generation=PLAYER_PROFILE_LOAD_GENERATION;PLAYER_PROFILE_LAST_ERROR=null;PLAYER_PROFILE_LOAD_ATTEMPTS=0;
    PLAYER_PROFILE_LOADING=_playerProfileFetch(1).then(function(data){
      if(generation!==PLAYER_PROFILE_LOAD_GENERATION)return loadPlayerProfiles();
      PLAYER_PROFILE_DATA=data;PLAYER_PROFILE_CACHE.clear();_buildPlayerProfileIdentityIndex(data);PLAYER_PROFILE_LOADING=null;return data;
    }).catch(function(error){
      const value=_playerProfileLoadError(error);if(generation===PLAYER_PROFILE_LOAD_GENERATION){PLAYER_PROFILE_LAST_ERROR=value;PLAYER_PROFILE_LOADING=null;}throw value;
    });
  }
  return PLAYER_PROFILE_LOADING;
}
function retryPlayerProfiles(){return loadPlayerProfiles({force:true});}
function playerProfileLoadState(){return{loaded:!!PLAYER_PROFILE_DATA,loading:!!PLAYER_PROFILE_LOADING,error:PLAYER_PROFILE_LAST_ERROR,attempts:PLAYER_PROFILE_LOAD_ATTEMPTS};}
function playerProfileByKeyAsync(key){
  if(!key)return Promise.resolve(null);
  if(PLAYER_PROFILE_CACHE.has(key))return Promise.resolve(PLAYER_PROFILE_CACHE.get(key));
  return loadPlayerProfiles().then(function(data){
    const values=data.records&&data.records[key];
    if(!values){PLAYER_PROFILE_CACHE.set(key,null);return null;}
    const profile={source:data.source||"copa.life oyun modeli",source_type:"copa_model",model_version:data.model_version||"copa-model-v1",profile_key:key};
    (data.fields||[]).forEach(function(field,index){profile[field]=values[index];});
    PLAYER_PROFILE_CACHE.set(key,profile);return profile;
  });
}
function playerProfileResolveKeyAsync(player,countryHint){
  const value=player&&typeof player==="object"?player:{};
  return loadPlayerProfiles().then(function(data){
    const records=data.records||{},explicit=String(value.profileKey||value.profile_key||"").trim();
    if(explicit&&Object.prototype.hasOwnProperty.call(records,explicit))return explicit;
    const country=String(value.profileCountry||value.profile_country||countryHint||"").toUpperCase(),name=_playerProfileNorm(value.name),club=_playerProfileNorm(value.club),age=Number(value.age)||0;
    if(country&&name){const exact=playerProfileKey(country,value.name,value.club,value.age);if(Object.prototype.hasOwnProperty.call(records,exact))return exact;}
    if(!name)return null;
    if(age&&club){const identity=PLAYER_PROFILE_IDENTITY_INDEX&&PLAYER_PROFILE_IDENTITY_INDEX.get([name,age,club].join("|"));if(identity)return identity;}
    if(club){const nameClub=PLAYER_PROFILE_NAME_CLUB_INDEX&&PLAYER_PROFILE_NAME_CLUB_INDEX.get([name,club].join("|"));if(nameClub)return nameClub;}
    if(country&&age){const countryNameAge=PLAYER_PROFILE_COUNTRY_NAME_AGE_INDEX&&PLAYER_PROFILE_COUNTRY_NAME_AGE_INDEX.get([country,name,age].join("|"));if(countryNameAge)return countryNameAge;}
    return null;
  });
}
function _playerProfileGenerated(player,countryHint){
  const data=PLAYER_PROFILE_DATA,value=player&&typeof player==="object"?player:{},country=String(value.profileCountry||value.profile_country||countryHint||"").toUpperCase(),role=String(value.natPos||value.pos||value.role||"").toUpperCase(),ov=Math.max(0,Math.min(100,Number(value.ov)||60));
  if(!data||!value.name)return null;
  const kind=/(?:GK|KL|KALE)/.test(role)?"gk":/(?:FWD|FOR|ST|OOS)/.test(role)?"fwd":/(?:DEF|D\b|KB|SĞB|SLB|CB)/.test(role)?"def":"mid",bestIndex=data.fields.indexOf("best_position"),matches=[],prefix=country?country+"|":"";
  let gap=Infinity;
  Object.keys(data.records).forEach(function(key){
    if(prefix&&key.indexOf(prefix)!==0)return;
    const row=data.records[key],best=String(row[bestIndex]||"").toUpperCase(),same=kind==="gk"?/(?:GK|KL)/.test(best):kind==="fwd"?/(?:ST|OOS)/.test(best):kind==="def"?/(?:^|[ /,])(?:D|KB)(?:[ (/,]|$)/.test(best):/(?:DOS|OS)/.test(best)&&!/(?:OOS)/.test(best);
    if(!same)return;
    const distance=Math.abs(row.slice(0,6).reduce(function(sum,item){return sum+(Number(item)||0);},0)/6-ov);
    if(distance<gap-.01){gap=distance;matches.length=0;matches.push(key);}else if(Math.abs(distance-gap)<.01)matches.push(key);
  });
  if(!matches.length)return null;
  let hash=2166136261;(String(value.name||"")+"|"+String(value.club||"")+"|"+String(value.age||"")).split("").forEach(function(character){hash^=character.charCodeAt(0);hash=Math.imul(hash,16777619);});
  const key=matches[(hash>>>0)%matches.length],row=data.records[key],profile={source:data.source||"copa.life oyun modeli",source_type:"copa_model_fallback",model_version:data.model_version||"copa-model-v1",profile_key:playerProfileKey(country||"TR",value.name,value.club,value.age)};
  (data.fields||[]).forEach(function(field,index){profile[field]=row[index];});
  profile.national_team="";profile.secondary_position="";profile.preferred_foot="";profile.best_position="";profile.positions="";return profile;
}
function playerProfileForPlayerAsync(player,countryHint){return playerProfileResolveKeyAsync(player,countryHint).then(function(key){return key?playerProfileByKeyAsync(key):_playerProfileGenerated(player,countryHint);});}
function playerProfileForAsync(country,name,club,age){return playerProfileByKeyAsync(playerProfileKey(country,name,club,age));}
