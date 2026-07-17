/* Privacy-minimised, web-only copa.life product funnel events. */
(function(global){
  "use strict";

  const EVENTS=new Set([
    "session_started",
    "country_selected",
    "draft_started",
    "xi_completed",
    "round_completed",
    "run_finished",
    "ghost_opt_in",
    "profile_open_error",
    "final_sim_completed"
  ]);
  const COUNTRIES=new Set(["TR","IT","ENG","ES","DE","JP"]);
  const OUTCOMES=new Set(["","win","loss","sacked"]);
  const DETAILS=new Set(["","load_failed","missing_model","retry_failed"]);
  const POWER_GAPS=new Set(["","away_12_plus","away_4_11","even","home_4_11","home_12_plus"]);
  const END_TYPES=new Set(["","regulation","golden_goal","penalties"]);
  const TACTICS=new Set(["","balanced","more","push","calm","hold"]);
  const PRODUCTION_HOSTS=new Set(["copa.life","www.copa.life"]);
  const API_META="meta[name='copa-analytics-api']";
  const BUILD_META="meta[name='copa-build-version']";
  let sessionSent=false;

  const metaContent=selector=>{
    const node=document.querySelector(selector);
    return String(node&&node.content||"").trim();
  };
  const clean=value=>String(value==null?"":value).replace(/[^a-zA-Z0-9._/-]/g,"").slice(0,64);
  const locale=()=>clean(global.LANG||document.documentElement.lang||navigator.language||"en").slice(0,12).toLowerCase();
  const endpoint=()=>metaContent(API_META).replace(/\/$/,"");
  const privacySignal=()=>navigator.globalPrivacyControl===true||navigator.doNotTrack==="1"||global.doNotTrack==="1";
  const enabled=()=>{
    if(privacySignal()||!PRODUCTION_HOSTS.has(global.location.hostname))return false;
    if((global.COPA_PLATFORM||metaContent("meta[name='copa-platform']")||"web")!=="web")return false;
    return /^https:\/\/[a-z0-9.-]+(?::\d+)?$/i.test(endpoint());
  };

  function payloadFor(eventName,properties){
    if(!EVENTS.has(eventName))return null;
    const props=properties&&typeof properties==="object"?properties:{};
    const country=COUNTRIES.has(String(props.country||global.selectedCountry||"").toUpperCase())?String(props.country||global.selectedCountry).toUpperCase():"";
    const outcome=OUTCOMES.has(String(props.outcome||""))?String(props.outcome||""):"";
    const detail=DETAILS.has(String(props.detail||""))?String(props.detail||""):"";
    const modelVersion=/^copa-final-core-v[0-9]{1,3}$/.test(String(props.model_version||""))?String(props.model_version):"";
    const powerGap=POWER_GAPS.has(String(props.power_gap||""))?String(props.power_gap||""):"";
    const endType=END_TYPES.has(String(props.end_type||""))?String(props.end_type||""):"";
    const tactic=TACTICS.has(String(props.tactic||""))?String(props.tactic||""):"";
    const round=Math.max(0,Math.min(6,Math.round(Number(props.round)||0)));
    return {
      schema_version:2,
      event:eventName,
      platform:"web",
      locale:locale(),
      game_country:country,
      round,
      outcome,
      detail,
      page_path:clean(global.location.pathname||"/")||"/",
      app_version:clean(metaContent(BUILD_META)),
      model_version:modelVersion,
      power_gap:powerGap,
      end_type:endType,
      tactic
    };
  }

  function track(eventName,properties){
    if(!enabled())return false;
    const payload=payloadFor(eventName,properties);
    if(!payload)return false;
    const body=JSON.stringify(payload);
    if(body.length>2048)return false;
    void fetch(endpoint()+"/v1/analytics/events",{
      method:"POST",
      headers:{"content-type":"text/plain;charset=UTF-8"},
      body,
      mode:"cors",
      credentials:"omit",
      cache:"no-store",
      keepalive:true,
      referrerPolicy:"no-referrer"
    }).catch(()=>{});
    return true;
  }

  function startSession(){
    if(sessionSent)return;
    sessionSent=true;
    track("session_started");
  }

  global.CopaAnalytics=Object.freeze({track,enabled,payloadFor});
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",startSession,{once:true});
  else queueMicrotask(startSession);
})(window);
