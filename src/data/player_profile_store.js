var PLAYER_PROFILE_DATA=null,PLAYER_PROFILE_LOADING=null,PLAYER_PROFILE_CACHE=new Map();
function _playerProfileNorm(value){return String(value||"").toLocaleLowerCase("tr-TR").replaceAll("ı","i").replaceAll("ł","l").replaceAll("ø","o").replaceAll("ð","d").replaceAll("þ","th").replaceAll("đ","d").replaceAll("æ","ae").replaceAll("œ","oe").replaceAll("ß","ss").normalize("NFKD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g," ").trim().replace(/\s+/g," ");}
function playerProfileKey(country,name,club,age){return[String(country||"TR").toUpperCase(),_playerProfileNorm(name),Number(age)||0,_playerProfileNorm(club)].join("|");}
function loadPlayerProfiles(){if(PLAYER_PROFILE_DATA)return Promise.resolve(PLAYER_PROFILE_DATA);if(!PLAYER_PROFILE_LOADING)PLAYER_PROFILE_LOADING=fetch("assets/data/fm26/player_profiles.json?v=20260714-japan1").then(function(response){if(!response.ok)throw new Error("FM26 profil verisi yüklenemedi: "+response.status);return response.json();}).then(function(data){PLAYER_PROFILE_DATA=data;return data;}).catch(function(error){PLAYER_PROFILE_LOADING=null;throw error;});return PLAYER_PROFILE_LOADING;}
function playerProfileByKeyAsync(key){
  if(!key)return Promise.resolve(null);
  if(PLAYER_PROFILE_CACHE.has(key))return Promise.resolve(PLAYER_PROFILE_CACHE.get(key));
  return loadPlayerProfiles().then(function(data){
    const values=data.records&&data.records[key];
    if(!values){PLAYER_PROFILE_CACHE.set(key,null);return null;}
    const profile={source:data.source||"FM26",labels:data.labels_tr||{}};
    (data.fields||[]).forEach(function(field,index){profile[field]=values[index];});
    PLAYER_PROFILE_CACHE.set(key,profile);
    return profile;
  });
}
function playerProfileForAsync(country,name,club,age){return playerProfileByKeyAsync(playerProfileKey(country,name,club,age));}
