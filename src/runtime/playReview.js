(function(root){
  "use strict";
  const STATE_KEY="copa.play_review.v1";
  const MIN_DISTINCT_DAYS=2;
  const MIN_MATCH_WINS=3;
  const MAX_PROMPTS=2;
  const COOLDOWN_MS=120*24*60*60*1000;
  const today=()=>new Date().toISOString().slice(0,10);
  const store=()=>root.CopaPlatform&&root.CopaPlatform.storage||root.localStorage;
  const blank=()=>({days:[],wins:0,prompts:0,lastPromptAt:0,pending:false});
  function read(){
    try{
      const value=JSON.parse(store().getItem(STATE_KEY)||"null");
      if(!value||typeof value!=="object")return blank();
      return {days:Array.isArray(value.days)?value.days.slice(-8):[],wins:Math.max(0,Number(value.wins)||0),prompts:Math.max(0,Number(value.prompts)||0),lastPromptAt:Math.max(0,Number(value.lastPromptAt)||0),pending:!!value.pending};
    }catch(_){return blank();}
  }
  function write(value){try{store().setItem(STATE_KEY,JSON.stringify(value));}catch(_){}return value;}
  function plugin(){
    if(root.COPA_PLATFORM!=="android"||!root.Capacitor)return null;
    const plugins=root.Capacitor.Plugins||{};
    return plugins.CopaReview||(typeof root.Capacitor.registerPlugin==="function"?root.Capacitor.registerPlugin("CopaReview"):null);
  }
  async function request(state){
    const Review=plugin();if(!Review||typeof Review.requestReview!=="function")return false;
    state.pending=true;write(state);
    try{
      const result=await Review.requestReview();
      if(!result||result.requested!==true)return false;
      state.prompts+=1;state.lastPromptAt=Date.now();
      return true;
    }catch(_){return false;}
    finally{state.pending=false;write(state);}
  }
  function onEvent(event,properties){
    if(root.COPA_PLATFORM!=="android")return false;
    const props=properties&&typeof properties==="object"?properties:{};
    const state=read(),day=today();
    if(event==="session_started"&&!state.days.includes(day)){state.days.push(day);state.days=state.days.slice(-8);write(state);return false;}
    if((event==="match_completed"||event==="arena_match_completed")&&props.outcome==="win"){state.wins+=1;write(state);}
    const trophy=event==="run_finished"&&props.outcome==="win";
    const positive=trophy||((event==="match_completed"||event==="arena_match_completed")&&props.outcome==="win"&&state.wins>=MIN_MATCH_WINS);
    if(!positive||state.pending||state.prompts>=MAX_PROMPTS||state.days.length<MIN_DISTINCT_DAYS)return false;
    if(state.lastPromptAt&&Date.now()-state.lastPromptAt<COOLDOWN_MS)return false;
    void request(state);return true;
  }
  root.CopaPlayReview=Object.freeze({onEvent});
})(window);
