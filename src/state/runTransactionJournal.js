/* Central idempotency journal for run-scoped economy and progression effects. */
(function(root,factory){
  const api=factory();
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
  if(root)root.CopaRunJournal=api;
})(typeof window!=="undefined"?window:globalThis,function(){
  "use strict";
  const VERSION=1,MAX_ENTRIES=96;
  const object=value=>!!value&&typeof value==="object"&&!Array.isArray(value);
  const clone=value=>{try{return JSON.parse(JSON.stringify(value));}catch(_){return null;}};
  function createState(){return{version:VERSION,entries:[]};}
  function normalizeState(value){
    const state=createState();
    if(!object(value)||Number(value.version)!==VERSION)return state;
    state.entries=(Array.isArray(value.entries)?value.entries:[]).filter(entry=>object(entry)&&typeof entry.id==="string"&&entry.id.length>0&&entry.id.length<=96&&["prepared","committed"].includes(entry.status)).slice(-MAX_ENTRIES).map(entry=>({
      id:entry.id,kind:String(entry.kind||"run").slice(0,32),round:Math.max(0,Math.min(7,Math.round(Number(entry.round)||0))),status:entry.status,
      payload:object(entry.payload)?clone(entry.payload):null,createdAt:Math.max(0,Number(entry.createdAt)||0),committedAt:Math.max(0,Number(entry.committedAt)||0)
    }));
    return state;
  }
  function validate(value){
    if(!object(value)||Number(value.version)!==VERSION||!Array.isArray(value.entries)||value.entries.length>MAX_ENTRIES)return{ok:false,errors:["invalid_journal"]};
    const ids=new Set(),errors=[];
    for(const entry of value.entries){
      if(!object(entry)||typeof entry.id!=="string"||!entry.id||entry.id.length>96||ids.has(entry.id)||!["prepared","committed"].includes(entry.status)||!Number.isInteger(Number(entry.round))||Number(entry.round)<0||Number(entry.round)>7)errors.push("invalid_entry");
      if(entry&&typeof entry.id==="string")ids.add(entry.id);
    }
    return{ok:errors.length===0,errors:[...new Set(errors)]};
  }
  function find(stateValue,id){return normalizeState(stateValue).entries.find(entry=>entry.id===id)||null;}
  function isCommitted(stateValue,id){const entry=find(stateValue,id);return !!entry&&entry.status==="committed";}
  function begin(stateValue,transaction){
    const state=normalizeState(stateValue),tx=object(transaction)?transaction:{},id=String(tx.id||"").slice(0,96);
    if(!id)return{ok:false,state,reason:"invalid_id",entry:null};
    const existing=state.entries.find(entry=>entry.id===id);
    if(existing)return{ok:existing.status!=="committed",state,replay:true,reason:existing.status==="committed"?"already_committed":"resume",entry:existing};
    const entry={id,kind:String(tx.kind||"run").slice(0,32),round:Math.max(0,Math.min(7,Math.round(Number(tx.round)||0))),status:"prepared",payload:object(tx.payload)?clone(tx.payload):null,createdAt:Math.max(0,Number(tx.createdAt)||Date.now()),committedAt:0};
    state.entries.push(entry);if(state.entries.length>MAX_ENTRIES)state.entries.splice(0,state.entries.length-MAX_ENTRIES);
    return{ok:true,state,replay:false,reason:"prepared",entry};
  }
  function commit(stateValue,id,committedAt){
    const state=normalizeState(stateValue),entry=state.entries.find(item=>item.id===String(id||""));
    if(!entry)return{ok:false,state,reason:"missing_transaction",entry:null};
    if(entry.status==="committed")return{ok:true,state,replay:true,reason:"already_committed",entry};
    entry.status="committed";entry.committedAt=Math.max(entry.createdAt,Number(committedAt)||Date.now());
    return{ok:true,state,replay:false,reason:"committed",entry};
  }
  function pending(stateValue){return normalizeState(stateValue).entries.filter(entry=>entry.status==="prepared");}
  return Object.freeze({VERSION,MAX_ENTRIES,createState,normalizeState,validate,find,isCommitted,begin,commit,pending});
});
