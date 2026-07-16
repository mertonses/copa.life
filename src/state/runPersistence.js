/* Versioned, validated run checkpoint storage. Gameplay state assembly stays in the orchestrator. */
(function(global){
  "use strict";
  const VERSION=5;
  const KEYS=Object.freeze({primary:"copa_run_v5",backup:"copa_run_v5_last_good",session:"copa_run"});
  const object=value=>!!value&&typeof value==="object"&&!Array.isArray(value);
  const finite=value=>Number.isFinite(Number(value));
  const issue=(code,path)=>({code,path});
  function defaults(value){
    const state=Object.assign({},value);
    state.v=VERSION;
    state.phase=state.phase==="draft"?"draft":"hub";
    state.savedAt=finite(state.savedAt)?Number(state.savedAt):Date.now();
    state.cards=Array.isArray(state.cards)?state.cards:[];
    state.cardInv=object(state.cardInv)?state.cardInv:{};
    state.cardVariant=object(state.cardVariant)?state.cardVariant:{};
    state.bench=Array.isArray(state.bench)?state.bench:[];
    state.feed=Array.isArray(state.feed)?state.feed:[];
    state.bracket=Array.isArray(state.bracket)?state.bracket:[];
    state.fixtures=Array.isArray(state.fixtures)?state.fixtures:[];
    if(state.phase==="draft"){
      const draft=object(state.draft)?Object.assign({},state.draft):{};
      draft.remaining=finite(draft.remaining)?Number(draft.remaining):(Array.isArray(state.picks)?state.picks.filter(player=>!player).length:11);
      draft.currentSlot=Number.isInteger(draft.currentSlot)?draft.currentSlot:-1;
      draft.currentOpts=Array.isArray(draft.currentOpts)?draft.currentOpts:[];
      draft.rerollsLeft=finite(draft.rerollsLeft)?Math.max(0,Number(draft.rerollsLeft)):2;
      draft.deadlineH=finite(draft.deadlineH)?Math.max(1,Number(draft.deadlineH)):24;
      draft.usedNames=Array.isArray(draft.usedNames)?draft.usedNames:[];
      state.draft=draft;
    }
    return state;
  }
  function migrate(value){
    if(!object(value))return null;
    const version=Number(value.v);
    if(![2,3,4,5].includes(version))return null;
    const state=Object.assign({},value);
    if(version<5){
      const complete=Array.isArray(state.picks)&&state.picks.length===11&&state.picks.every(Boolean);
      state.phase=complete?"hub":"draft";
    }
    return defaults(state);
  }
  function validate(value){
    const errors=[];
    if(!object(value))return{ok:false,errors:[issue("not_object","")]};
    if(value.v!==VERSION)errors.push(issue("unsupported_version","v"));
    if(value.phase!=="draft"&&value.phase!=="hub")errors.push(issue("invalid_phase","phase"));
    if(!finite(value.savedAt)||Number(value.savedAt)<=0)errors.push(issue("invalid_timestamp","savedAt"));
    if(!Array.isArray(value.picks)||value.picks.length!==11)errors.push(issue("invalid_picks","picks"));
    if(!Number.isInteger(Number(value.round))||Number(value.round)<1||Number(value.round)>6)errors.push(issue("invalid_round","round"));
    if(!finite(value.budget))errors.push(issue("invalid_budget","budget"));
    if(!finite(value.seedNum))errors.push(issue("invalid_seed","seedNum"));
    if(typeof value.formName!=="string"||!value.formName)errors.push(issue("invalid_formation","formName"));
    if(typeof value.country!=="string"||!value.country)errors.push(issue("invalid_country","country"));
    if(value.phase==="hub"&&Array.isArray(value.picks)&&!value.picks.every(object))errors.push(issue("incomplete_hub","picks"));
    if(value.phase==="draft"){
      if(!object(value.draft))errors.push(issue("missing_draft","draft"));
      else{
        const open=Array.isArray(value.picks)?value.picks.filter(player=>!player).length:0;
        if(Number(value.draft.remaining)!==open)errors.push(issue("draft_remaining_mismatch","draft.remaining"));
        if(!Array.isArray(value.draft.currentOpts)||!Array.isArray(value.draft.usedNames))errors.push(issue("invalid_draft_collections","draft"));
      }
    }
    return{ok:errors.length===0,errors};
  }
  function capture(kind,details){try{if(global.CopaDiagnostics&&typeof global.CopaDiagnostics.capture==="function")global.CopaDiagnostics.capture(kind,details,"");}catch(_){ }}
  function parse(raw){
    if(!raw)return{state:null,errors:[issue("empty","")]};
    try{
      const state=migrate(JSON.parse(raw));
      if(!state)return{state:null,errors:[issue("unsupported_or_invalid","v")]};
      const result=validate(state);
      return result.ok?{state,errors:[]}:{state:null,errors:result.errors};
    }catch(_){return{state:null,errors:[issue("invalid_json","")]};}
  }
  function safeGet(storage,key){try{return storage&&storage.getItem(key);}catch(_){return null;}}
  function safeSet(storage,key,value){try{storage.setItem(key,value);return true;}catch(_){return false;}}
  function safeRemove(storage,key){try{storage&&storage.removeItem(key);return true;}catch(_){return false;}}
  function persist(payload){
    const state=defaults(payload||{}),result=validate(state);
    if(!result.ok){capture("save_rejected",result.errors.map(error=>error.code).join(","));return{ok:false,errors:result.errors};}
    let raw;try{raw=JSON.stringify(state);}catch(_){return{ok:false,errors:[issue("serialize_failed","")]};}
    const previous=parse(safeGet(global.localStorage,KEYS.primary));
    if(previous.state)safeSet(global.localStorage,KEYS.backup,JSON.stringify(previous.state));
    const local=safeSet(global.localStorage,KEYS.primary,raw);
    const session=safeSet(global.sessionStorage,KEYS.session,raw);
    if(!local&&!session)capture("save_failed","storage_unavailable");
    return{ok:local||session,errors:local||session?[]:[issue("storage_unavailable","")]};
  }
  function read(){
    const candidates=[["primary",safeGet(global.localStorage,KEYS.primary)],["backup",safeGet(global.localStorage,KEYS.backup)],["session",safeGet(global.sessionStorage,KEYS.session)]];
    const rejected=[];
    for(const [source,raw] of candidates){
      if(!raw)continue;
      const parsed=parse(raw);
      if(parsed.state)return{state:parsed.state,source,rejected};
      rejected.push({source,errors:parsed.errors});
    }
    if(rejected.length)capture("restore_rejected",rejected.map(item=>item.source+":"+item.errors.map(error=>error.code).join("+")).join(","));
    return{state:null,source:null,rejected};
  }
  function clear(){safeRemove(global.localStorage,KEYS.primary);safeRemove(global.localStorage,KEYS.backup);safeRemove(global.sessionStorage,KEYS.session);}
  global.CopaRunPersistence=Object.freeze({VERSION,KEYS,migrate,validate,parse,persist,read,clear});
})(window);
