/* Versioned, validated run checkpoint storage. Gameplay state assembly stays in the orchestrator. */
(function(global){
  "use strict";
  const VERSION=6;
  const KEYS=Object.freeze({primary:"copa_run_v6",backup:"copa_run_v6_last_good",session:"copa_run",legacyPrimary:"copa_run_v5",legacyBackup:"copa_run_v5_last_good"});
  const durableStorage=global.CopaPlatform&&global.CopaPlatform.storage||global.localStorage;
  const object=value=>!!value&&typeof value==="object"&&!Array.isArray(value);
  const finite=value=>Number.isFinite(Number(value));
  const issue=(code,path)=>({code,path});
  function defaults(value){
    const state=Object.assign({},value);
    state.v=VERSION;
    state.phase=["draft","draw","hub","match","reward"].includes(state.phase)?state.phase:"hub";
    state.savedAt=finite(state.savedAt)?Number(state.savedAt):Date.now();
    state.rngCalls=Number.isInteger(Number(state.rngCalls))?Number(state.rngCalls):0;
    state.cards=Array.isArray(state.cards)?state.cards:[];
    state.cardInv=object(state.cardInv)?state.cardInv:{};
    state.cardVariant=object(state.cardVariant)?state.cardVariant:{};
    state.bench=Array.isArray(state.bench)?state.bench:[];
    state.feed=Array.isArray(state.feed)?state.feed:[];
    state.bracket=Array.isArray(state.bracket)?state.bracket:[];
    state.fixtures=Array.isArray(state.fixtures)?state.fixtures:[];
    state.tournament=object(state.tournament)?state.tournament:null;
    state.tournamentFormat=state.tournament&&state.tournament.format==="groups16_v1"?"groups16_v1":"legacy_knockout_v1";
    state.chairmanEventRunId=typeof state.chairmanEventRunId==="string"?state.chairmanEventRunId:"";
    state.chairmanEventSeen=object(state.chairmanEventSeen)?state.chairmanEventSeen:{};
    state.pendingChairmanEvent=object(state.pendingChairmanEvent)?state.pendingChairmanEvent:null;
    state.sansSpotlightIdx=Number.isInteger(Number(state.sansSpotlightIdx))?Number(state.sansSpotlightIdx):-1;
    if(state.phase==="draft"){
      const draft=object(state.draft)?Object.assign({},state.draft):{};
      draft.remaining=finite(draft.remaining)?Number(draft.remaining):(Array.isArray(state.picks)?state.picks.filter(player=>!player).length:11);
      draft.currentSlot=Number.isInteger(draft.currentSlot)?draft.currentSlot:-1;
      draft.currentOpts=Array.isArray(draft.currentOpts)?draft.currentOpts:[];
      draft.rerollsLeft=finite(draft.rerollsLeft)?Math.max(0,Number(draft.rerollsLeft)):2;
      draft.rewardedRerollsEarned=finite(draft.rewardedRerollsEarned)?Math.max(0,Math.min(2,Number(draft.rewardedRerollsEarned))):0;
      draft.deadlineH=finite(draft.deadlineH)?Math.max(1,Number(draft.deadlineH)):24;
      draft.usedNames=Array.isArray(draft.usedNames)?draft.usedNames:[];
      state.draft=draft;
    }
    return state;
  }
  function migrate(value){
    if(!object(value))return null;
    const version=Number(value.v);
    if(![2,3,4,5,6].includes(version))return null;
    const state=Object.assign({},value);
    if(version<5){
      const complete=Array.isArray(state.picks)&&state.picks.length===11&&state.picks.every(Boolean);
      state.phase=complete?"hub":"draft";
    }
    if(version<6){state.tournament=null;state.tournamentFormat="legacy_knockout_v1";if(state.phase==="draw")state.phase="hub";}
    return defaults(state);
  }
  function validate(value){
    const errors=[];
    if(!object(value))return{ok:false,errors:[issue("not_object","")]};
    if(value.v!==VERSION)errors.push(issue("unsupported_version","v"));
    if(!["draft","draw","hub","match","reward"].includes(value.phase))errors.push(issue("invalid_phase","phase"));
    if(!finite(value.savedAt)||Number(value.savedAt)<=0)errors.push(issue("invalid_timestamp","savedAt"));
    if(!Array.isArray(value.picks)||value.picks.length!==11)errors.push(issue("invalid_picks","picks"));
    if(!Number.isInteger(Number(value.round))||Number(value.round)<1||Number(value.round)>6)errors.push(issue("invalid_round","round"));
    if(!finite(value.budget)||Number(value.budget)<-250||Number(value.budget)>1000)errors.push(issue("invalid_budget","budget"));
    if(!finite(value.seedNum))errors.push(issue("invalid_seed","seedNum"));
    if(!Number.isInteger(Number(value.rngCalls))||Number(value.rngCalls)<0||Number(value.rngCalls)>2_000_000)errors.push(issue("invalid_rng_calls","rngCalls"));
    if(typeof value.formName!=="string"||!value.formName)errors.push(issue("invalid_formation","formName"));
    if(typeof value.country!=="string"||!value.country)errors.push(issue("invalid_country","country"));
    if(global.FORMATIONS&&(!Array.isArray(global.FORMATIONS[value.formName])||global.FORMATIONS[value.formName].length!==11))errors.push(issue("unknown_formation","formName"));
    if(global.COUNTRY_CODES&&Array.isArray(global.COUNTRY_CODES)&&!global.COUNTRY_CODES.includes(value.country))errors.push(issue("unknown_country","country"));
    const validPlayer=player=>object(player)&&typeof player.name==="string"&&player.name.trim().length>0&&player.name.length<=90&&typeof player.pos==="string"&&player.pos.length<=12&&finite(player.ov)&&Number(player.ov)>=35&&Number(player.ov)<=99;
    if(Array.isArray(value.picks)&&value.picks.some(player=>player!=null&&!validPlayer(player)))errors.push(issue("invalid_player","picks"));
    if(Array.isArray(value.bench)&&value.bench.some(player=>!validPlayer(player)))errors.push(issue("invalid_player","bench"));
    if(["draw","hub","match","reward"].includes(value.phase)&&Array.isArray(value.picks)&&!value.picks.every(validPlayer))errors.push(issue("incomplete_hub","picks"));
    if(Array.isArray(value.cards)){
      if(value.cards.length>35||new Set(value.cards).size!==value.cards.length)errors.push(issue("invalid_cards","cards"));
      if(global.CARDDEFS&&value.cards.some(key=>typeof key!=="string"||!global.CARDDEFS[key]))errors.push(issue("unknown_card","cards"));
    }else errors.push(issue("invalid_cards","cards"));
    if(Array.isArray(value.fixtures)&&value.fixtures.length&&value.fixtures.length!==6)errors.push(issue("invalid_fixtures","fixtures"));
    if(value.tournamentFormat==="groups16_v1"){
      if(!object(value.tournament))errors.push(issue("missing_tournament","tournament"));
      else if(global.CopaTournamentEngine){const checked=global.CopaTournamentEngine.validate(value.tournament);if(!checked.ok)errors.push(issue("invalid_tournament","tournament"));}
      if(value.phase==="draw"&&(!value.tournament||value.tournament.phase!=="draw"))errors.push(issue("invalid_draw_phase","tournament.phase"));
      if(value.phase!=="draw"&&value.tournament&&value.tournament.phase==="draw")errors.push(issue("incomplete_draw","tournament.phase"));
    }else if(value.tournamentFormat!=="legacy_knockout_v1")errors.push(issue("invalid_tournament_format","tournamentFormat"));
    if(value.phase==="match"){
      const pending=value.pendingMatchResolution;
      if(!object(pending)||Number(pending.round)!==Number(value.round)||!Number.isInteger(Number(pending.gf))||!Number.isInteger(Number(pending.ga))||Number(pending.gf)<0||Number(pending.gf)>20||Number(pending.ga)<0||Number(pending.ga)>20)errors.push(issue("invalid_pending_match","pendingMatchResolution"));
    }
    if(value.phase==="reward"&&(Number(value.rewardPendingRound)!==Number(value.round)||Number(value.rewardResolvedRound)===Number(value.round)))errors.push(issue("invalid_pending_reward","rewardPendingRound"));
    if(value.pendingChairmanEvent){
      const event=value.pendingChairmanEvent;
      if(value.phase!=="hub"||!["spotlight","nephew","chaos"].includes(event.type)||event.status!=="pending"||Number(event.round)!==Number(value.round)||event.chairmanId!==value.chairId||event.runId!==value.chairmanEventRunId||typeof event.key!=="string"||!event.key)errors.push(issue("invalid_chairman_event","pendingChairmanEvent"));
    }
    if(!Number.isInteger(Number(value.sansSpotlightIdx))||Number(value.sansSpotlightIdx)<-1||Number(value.sansSpotlightIdx)>10)errors.push(issue("invalid_spotlight_index","sansSpotlightIdx"));
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
    const previous=parse(safeGet(durableStorage,KEYS.primary));
    if(previous.state)safeSet(durableStorage,KEYS.backup,JSON.stringify(previous.state));
    const local=safeSet(durableStorage,KEYS.primary,raw);
    const session=safeSet(global.sessionStorage,KEYS.session,raw);
    if(!local&&!session)capture("save_failed","storage_unavailable");
    return{ok:local||session,errors:local||session?[]:[issue("storage_unavailable","")]};
  }
  function read(){
    const candidates=[["primary",safeGet(durableStorage,KEYS.primary)],["backup",safeGet(durableStorage,KEYS.backup)],["session",safeGet(global.sessionStorage,KEYS.session)],["legacy",safeGet(durableStorage,KEYS.legacyPrimary)],["legacy_backup",safeGet(durableStorage,KEYS.legacyBackup)]];
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
  function clear(){safeRemove(durableStorage,KEYS.primary);safeRemove(durableStorage,KEYS.backup);safeRemove(durableStorage,KEYS.legacyPrimary);safeRemove(durableStorage,KEYS.legacyBackup);safeRemove(global.sessionStorage,KEYS.session);}
  function flush(){return durableStorage&&typeof durableStorage.flush==="function"?durableStorage.flush():Promise.resolve();}
  global.CopaRunPersistence=Object.freeze({VERSION,KEYS,migrate,validate,parse,persist,read,clear,flush});
})(window);
