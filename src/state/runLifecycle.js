/* Central run phase and invariant guard. */
(function(global){
  "use strict";
  const PHASES=Object.freeze(["intro","draft","hub","match","reward","result"]);
  const ALLOWED=Object.freeze({
    intro:["draft"],draft:["hub","intro"],hub:["match","result","intro"],
    match:["hub","reward","result"],reward:["hub","result"],result:["intro","draft"]
  });
  let phase="intro";
  const history=[];
  function completeXI(){
    return Array.isArray(global.slots)&&global.slots.length>0&&Array.isArray(global.picksBySlot)&&
      global.picksBySlot.length===global.slots.length&&global.picksBySlot.every(Boolean);
  }
  function draftShape(){
    return Array.isArray(global.slots)&&global.slots.length>0&&Array.isArray(global.picksBySlot)&&
      global.picksBySlot.length===global.slots.length&&Array.isArray(global.filled)&&global.filled.length===global.slots.length;
  }
  function validate(target){
    const errors=[];
    if(!PHASES.includes(target))errors.push("unknown_phase");
    if(target==="draft"&&!draftShape())errors.push("invalid_draft_shape");
    if(["hub","match","reward"].includes(target)&&!completeXI())errors.push("incomplete_starting_xi");
    if(typeof global.round!=="undefined"&&target!=="intro"&&(!Number.isInteger(global.round)||global.round<1||global.round>6))errors.push("invalid_round");
    return{ok:errors.length===0,errors,phase:target};
  }
  function transition(next,options){
    const opts=options||{},from=phase,check=validate(next);
    if(!opts.force&&from!==next&&!(ALLOWED[from]||[]).includes(next))return{ok:false,errors:["illegal_transition"],from,to:next};
    if(!opts.force&&!check.ok)return{ok:false,errors:check.errors,from,to:next};
    phase=next;global.runPhase=next;
    history.push({from,to:next,at:Date.now(),reason:String(opts.reason||"")});
    if(history.length>24)history.shift();
    try{global.dispatchEvent(new CustomEvent("copa:phase",{detail:{from,to:next}}));}catch(_){ }
    return{ok:true,errors:[],from,to:next};
  }
  function safeCheckpointPhase(){return phase==="draft"?"draft":phase==="hub"?"hub":null;}
  global.runPhase=phase;
  global.CopaRunState=Object.freeze({PHASES,get phase(){return phase;},transition,validate,completeXI,draftShape,safeCheckpointPhase,history:()=>history.slice()});
})(window);
