/* Versioned, local-only checkpoint for an in-progress final simulation. */
(function(global){
  "use strict";
  const VERSION=1;
  const MAX_AGE_MS=48*60*60*1000;
  const MAX_BYTES=420*1024;
  const KEYS=Object.freeze({
    primary:"copa_final_sim_v1",
    backup:"copa_final_sim_v1_backup",
    session:"copa_final_sim_v1_session"
  });
  const object=value=>!!value&&typeof value==="object"&&!Array.isArray(value);
  const finite=value=>Number.isFinite(Number(value));
  const safeGet=(storage,key)=>{try{return storage&&storage.getItem(key);}catch(_){return null;}};
  const safeSet=(storage,key,value)=>{try{storage.setItem(key,value);return true;}catch(_){return false;}};
  const safeRemove=(storage,key)=>{try{storage&&storage.removeItem(key);return true;}catch(_){return false;}};
  function checksum(text){
    let hash=0x811c9dc5;
    for(let index=0;index<text.length;index++){hash^=text.charCodeAt(index);hash=Math.imul(hash,0x01000193);}
    return(hash>>>0).toString(36);
  }
  function capture(kind,detail){
    try{if(global.CopaDiagnostics&&typeof global.CopaDiagnostics.capture==="function")global.CopaDiagnostics.capture(kind,detail||"","");}catch(_){}
  }
  function validate(value,now=Date.now()){
    if(!object(value)||value.v!==VERSION)return false;
    if(!finite(value.savedAt)||value.savedAt>now+60_000||now-value.savedAt>MAX_AGE_MS)return false;
    if(typeof value.modelVersion!=="string"||value.modelVersion.length<4||value.modelVersion.length>48)return false;
    if(!Number.isInteger(Number(value.runSeed))||!finite(value.homePower)||!finite(value.awayPower))return false;
    if(value.homePower<25||value.homePower>130||value.awayPower<25||value.awayPower>130)return false;
    const match=value.match;
    if(!object(match)||!finite(match.matchTime)||match.matchTime<0||match.matchTime>8_000)return false;
    if(!Number.isInteger(Number(match.rngState))||!Array.isArray(match.score)||match.score.length!==2)return false;
    if(match.score.some(item=>!Number.isInteger(Number(item))||item<0||item>20))return false;
    if(!object(match.stats)||!Array.isArray(match.teams)||match.teams.length!==2)return false;
    if(match.teams.some(team=>!Array.isArray(team)||team.length<7||team.length>11))return false;
    if(!object(match.ball)||!Array.isArray(match.goalEvents)||match.goalEvents.length>40)return false;
    return true;
  }
  function encode(payload){
    const body={...payload,v:VERSION,savedAt:Date.now()};
    const json=JSON.stringify(body);
    if(json.length>MAX_BYTES)throw new Error("checkpoint_too_large");
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
    try{raw=encode(payload);}catch(error){capture("final_checkpoint_rejected",error&&error.message);return false;}
    const previous=safeGet(global.localStorage,KEYS.primary);
    if(parse(previous))safeSet(global.localStorage,KEYS.backup,previous);
    const local=safeSet(global.localStorage,KEYS.primary,raw);
    const session=safeSet(global.sessionStorage,KEYS.session,raw);
    if(!local&&!session)capture("final_checkpoint_failed","storage_unavailable");
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
  global.CopaFinalSimPersistence=Object.freeze({VERSION,KEYS,validate,parse,persist,read,clear});
})(window);
