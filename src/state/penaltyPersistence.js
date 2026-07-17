/* Versioned, local-only checkpoint for an in-progress penalty shootout. */
(function(global){
  "use strict";

  const VERSION=1;
  const MODEL_VERSION="copa-penalty-v1";
  const MAX_AGE_MS=48*60*60*1000;
  const MAX_BYTES=220*1024;
  const KEYS=Object.freeze({
    primary:"copa_penalty_checkpoint_v1",
    backup:"copa_penalty_checkpoint_v1_backup",
    session:"copa_penalty_checkpoint_v1_session"
  });
  const object=value=>!!value&&typeof value==="object"&&!Array.isArray(value);
  const finite=value=>Number.isFinite(Number(value));
  const safeGet=(storage,key)=>{try{return storage&&storage.getItem(key);}catch(_){return null;}};
  const safeSet=(storage,key,value)=>{try{storage.setItem(key,value);return true;}catch(_){return false;}};
  const safeRemove=(storage,key)=>{try{storage&&storage.removeItem(key);return true;}catch(_){return false;}};

  function checksum(text){
    let hash=0x811c9dc5;
    for(let index=0;index<text.length;index++){
      hash^=text.charCodeAt(index);
      hash=Math.imul(hash,0x01000193);
    }
    return(hash>>>0).toString(36);
  }

  function validShot(value){
    return object(value)&&["goal","save","post","miss"].includes(value.type)&&
      ["L","C","R"].includes(value.shot)&&["L","C","R"].includes(value.keeper);
  }

  function validate(value,now=Date.now()){
    if(!object(value)||value.v!==VERSION||value.modelVersion!==MODEL_VERSION)return false;
    if(!finite(value.savedAt)||value.savedAt>now+60_000||now-value.savedAt>MAX_AGE_MS)return false;
    if(!Number.isInteger(Number(value.runSeed))||!Number.isInteger(Number(value.runRound)))return false;
    if(!Number.isInteger(Number(value.rngCalls))||value.rngCalls<0||value.rngCalls>2_000_000)return false;
    const state=value.state;
    if(!object(state)||!["shoot","save","done"].includes(state.phase))return false;
    if(!["round","final"].includes(state.mode)||typeof state.home!=="string"||typeof state.away!=="string")return false;
    if(!Number.isInteger(Number(state.homeGoals))||!Number.isInteger(Number(state.awayGoals)))return false;
    if(state.homeGoals<0||state.homeGoals>30||state.awayGoals<0||state.awayGoals>30)return false;
    if(!Array.isArray(state.homeShots)||!Array.isArray(state.awayShots))return false;
    if(state.homeShots.length>30||state.awayShots.length>30)return false;
    if(!state.homeShots.every(validShot)||!state.awayShots.every(validShot))return false;
    if(!Array.isArray(state.homeShooters)||!Array.isArray(state.awayShooters))return false;
    if(state.homeShooters.length<1||state.homeShooters.length>16||state.awayShooters.length<1||state.awayShooters.length>16)return false;
    return true;
  }

  function encode(payload){
    const body={...payload,v:VERSION,modelVersion:MODEL_VERSION,savedAt:Date.now()};
    const json=JSON.stringify(body);
    if(json.length>MAX_BYTES)throw new Error("penalty_checkpoint_too_large");
    return JSON.stringify({body,checksum:checksum(json)});
  }

  function parse(raw){
    if(!raw||raw.length>MAX_BYTES*1.15)return null;
    try{
      const envelope=JSON.parse(raw);
      if(!object(envelope)||!object(envelope.body))return null;
      const json=JSON.stringify(envelope.body);
      if(checksum(json)!==envelope.checksum||!validate(envelope.body))return null;
      return envelope.body;
    }catch(_){return null;}
  }

  function persist(payload){
    let raw;
    try{raw=encode(payload);}catch(_){return false;}
    const previous=safeGet(global.localStorage,KEYS.primary);
    if(parse(previous))safeSet(global.localStorage,KEYS.backup,previous);
    const local=safeSet(global.localStorage,KEYS.primary,raw);
    const session=safeSet(global.sessionStorage,KEYS.session,raw);
    return local||session;
  }

  function read(){
    const candidates=[
      ["primary",safeGet(global.localStorage,KEYS.primary)],
      ["session",safeGet(global.sessionStorage,KEYS.session)],
      ["backup",safeGet(global.localStorage,KEYS.backup)]
    ];
    for(const [source,raw] of candidates){
      const state=parse(raw);
      if(state)return{state,source};
    }
    return{state:null,source:null};
  }

  function clear(){
    safeRemove(global.localStorage,KEYS.primary);
    safeRemove(global.localStorage,KEYS.backup);
    safeRemove(global.sessionStorage,KEYS.session);
  }

  global.CopaPenaltyPersistence=Object.freeze({
    VERSION,MODEL_VERSION,KEYS,validate,parse,persist,read,clear
  });
})(window);
