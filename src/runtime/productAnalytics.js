/* Privacy-minimised copa.life product funnel events; native collection is explicit opt-in. */
(function(global){
  "use strict";

  const EVENTS=new Set([
    "session_started",
    "country_selected",
    "formation_selected",
    "chairman_selected",
    "style_selected",
    "draft_started",
    "xi_completed",
    "match_completed",
    "round_completed",
    "reward_selected",
    "card_acquired",
    "run_finished",
    "ghost_encountered",
    "ghost_opt_in",
    "meta_unlocked",
    "profile_open_error",
    "final_sim_completed",
    "group_draw_started",
    "group_draw_completed",
    "group_draw_skipped",
    "tournament_match_resolved"
  ]);
  const COUNTRIES=new Set(["TR","IT","ENG","ES","DE","JP"]);
  const OUTCOMES=new Set(["","win","draw","loss","sacked"]);
  const DETAILS=new Set(["","load_failed","missing_model","retry_failed"]);
  const POWER_GAPS=new Set(["","away_12_plus","away_4_11","even","home_4_11","home_12_plus"]);
  const END_TYPES=new Set(["","regulation","golden_goal","penalties"]);
  const TACTICS=new Set(["","balanced","more","push","calm","hold"]);
  const CHAIRMEN=new Set(["","babacan","leydi","pinti","sansasyoncu","torpilci","cilgin"]);
  const FORMATIONS=new Set(["","4-4-2","4-3-3","4-2-3-1","3-5-2","5-3-2","3-4-3","4-5-1","4-3-2-1","4-1-4-1","3-4-1-2"]);
  const STYLES=new Set(["","gegen","kontra","tiki","uzun","blok"]);
  const REWARDS=new Set(["","cash","loan","swap","care"]);
  const CARD_KINDS=new Set(["","power","final","risk","instant","contract","other"]);
  const ECONOMY_BANDS=new Set(["","debt_20_plus","debt_10_19","debt_1_9","cash_0_9","cash_10_plus"]);
  const TOURNAMENT_STAGES=new Set(["","group","quarterfinal","semifinal","final"]);
  const DRAW_MODES=new Set(["","manual","fast","complete"]);
  const QUALIFICATION_STATES=new Set(["","yes","no","pending"]);
  const PRODUCTION_HOSTS=new Set(["copa.life","www.copa.life"]);
  const API_META="meta[name='copa-analytics-api']";
  const BUILD_META="meta[name='copa-build-version']";
  const NATIVE_OPT_IN_KEY="copa_analytics_enabled";
  let sessionSent=false;

  const metaContent=selector=>{
    const node=document.querySelector(selector);
    return String(node&&node.content||"").trim();
  };
  const clean=value=>String(value==null?"":value).replace(/[^a-zA-Z0-9._/-]/g,"").slice(0,64);
  const locale=()=>clean(global.LANG||document.documentElement.lang||navigator.language||"en").slice(0,12).toLowerCase();
  const endpoint=()=>metaContent(API_META).replace(/\/$/,"");
  const privacySignal=()=>navigator.globalPrivacyControl===true||navigator.doNotTrack==="1"||global.doNotTrack==="1";
  const platform=()=>String(global.COPA_PLATFORM||metaContent("meta[name='copa-platform']")||"web").toLowerCase();
  const nativeOptIn=()=>{try{return !!(global.CopaPlatform&&global.CopaPlatform.storage&&global.CopaPlatform.storage.getItem(NATIVE_OPT_IN_KEY)==="1");}catch(_){return false;}};
  const enabled=()=>{
    const current=platform();
    if(privacySignal())return false;
    if(current==="web"&&!PRODUCTION_HOSTS.has(global.location.hostname))return false;
    if((current==="android"||current==="ios")&&!nativeOptIn())return false;
    if(!new Set(["web","android","ios"]).has(current))return false;
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
    const chairman=CHAIRMEN.has(String(props.chairman||""))?String(props.chairman||""):"";
    const formation=FORMATIONS.has(String(props.formation||""))?String(props.formation||""):"";
    const style=STYLES.has(String(props.style||""))?String(props.style||""):"";
    const reward=REWARDS.has(String(props.reward||""))?String(props.reward||""):"";
    const cardKind=CARD_KINDS.has(String(props.card_kind||""))?String(props.card_kind||""):"";
    const economyBand=ECONOMY_BANDS.has(String(props.economy_band||""))?String(props.economy_band||""):"";
    const tournamentStage=TOURNAMENT_STAGES.has(String(props.stage||""))?String(props.stage||""):"";
    const drawMode=DRAW_MODES.has(String(props.mode||""))?String(props.mode||""):"";
    const qualification=QUALIFICATION_STATES.has(String(props.qualified||""))?String(props.qualified||""):"";
    const groupMatchday=Math.max(0,Math.min(3,Math.round(Number(props.group_matchday)||0)));
    const round=Math.max(0,Math.min(6,Math.round(Number(props.round)||0)));
    return {
      schema_version:4,
      event:eventName,
      platform:platform(),
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
      tactic,
      chairman,
      formation,
      style,
      reward,
      card_kind:cardKind,
      economy_band:economyBand,
      tournament_stage:tournamentStage,
      draw_mode:drawMode,
      qualification,
      group_matchday:groupMatchday
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
    if(sessionSent||!enabled())return;
    sessionSent=true;
    track("session_started");
  }

  function setNativeEnabled(value){
    if(!global.CopaPlatform||!global.CopaPlatform.isNative)return false;
    global.CopaPlatform.storage.setItem(NATIVE_OPT_IN_KEY,value?"1":"0");
    installSetting();
    if(value)startSession();
    return nativeOptIn();
  }

  function installSetting(){
    const slot=document.getElementById("advancedAnalyticsSlot");if(!slot)return;
    if(!global.CopaPlatform||!global.CopaPlatform.isNative){slot.hidden=true;return;}
    slot.hidden=false;
    const tr=global.LANG==="tr",on=nativeOptIn();
    slot.innerHTML=`<div class="ghost-setting-option"><div class="ghost-setting-header">${tr?"ANONİM KULLANIM ÖLÇÜMÜ":"ANONYMOUS USAGE METRICS"}</div><div class="ghost-setting-copy">${tr?"Kimlik, kulüp adı veya kayıt kodu olmadan toplu oynanış olayları gönderir. İstediğin zaman kapatabilirsin.":"Sends aggregate gameplay events without an identity, club name or save code. You can turn it off at any time."}</div><button class="ghost-setting-toggle${on?" on":""}" type="button" aria-pressed="${on}" onclick="CopaAnalytics.setNativeEnabled(${!on})">${on?(tr?"AÇIK":"ON"):(tr?"KAPALI":"OFF")}</button></div>`;
  }

  global.CopaAnalytics=Object.freeze({track,enabled,payloadFor,nativeOptIn,setNativeEnabled,installSetting});
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",startSession,{once:true});
  else queueMicrotask(startSession);
})(window);
