/* copa.life ghost clubs: default-on web opponents with separately consented run sharing. */
(function(){
  "use strict";
  const SETTINGS_KEY="copa_ghost_clubs_enabled";
  const SHARING_KEY="copa_ghost_sharing_enabled";
  const CONSENT_KEY="copa_ghost_consent_v1";
  const LEADERBOARD_CONSENT_KEY="copa_leaderboard_consent_v1";
  const LEADERBOARD_ENABLED_KEY="copa_leaderboard_enabled";
  const LEADERBOARD_QUEUE_KEY="copa_leaderboard_queue_v1";
  const LEADERBOARD_DELETE_PENDING_KEY="copa_leaderboard_delete_pending_v1";
  const ONBOARDING_KEY="copa_online_features_onboarding_v1";
  const CLIENT_KEY="copa_ghost_client_id_v1";
  const DELETE_TOKEN_KEY="copa_ghost_delete_token_v1";
  const BLOCKED_KEY="copa_ghost_blocked_ids_v1";
  const QUEUE_KEY="copa_ghost_upload_queue_v1";
  const REPORT_QUEUE_KEY="copa_ghost_report_queue_v1";
  const RUN_KEY="copa_ghost_current_run_v1";
  const API_META="meta[name='copa-ghost-api']";
  const REPORT_REASONS=new Set(["hate","sexual","political","person","trademark","impersonation","other"]);
  const CONFIG=Object.freeze({
    schemaVersion:1,
    consentVersion:"ghost-terms-v1",
    leaderboardConsentVersion:"leaderboard-terms-v1",
    onboardingVersion:"online-features-v1",
    gameVersion:"2026.07.13",
    dataVersion:"2026.07.15-copa1",
    cardSchemaVersion:"2026.07",
    simulationVersion:"copa-final-core-v3",
    queueMax:24,
    matchChance:{1:.20,2:.24,3:.29,4:.34,5:.38,6:.40}
  });

  const safeGet=(key,fallback)=>{try{const value=localStorage.getItem(key);return value===null?fallback:value;}catch(_){return fallback;}};
  const safeSet=(key,value)=>{try{localStorage.setItem(key,value);return true;}catch(_){return false;}};
  const safeRemove=key=>{try{localStorage.removeItem(key);return true;}catch(_){return false;}};
  function consent(){try{const value=JSON.parse(safeGet(CONSENT_KEY,"null"));return value&&value.version===CONFIG.consentVersion&&value.terms===true&&value.sharing===true?value:null;}catch(_){return null;}}
  const hasConsent=()=>!!consent();
  function leaderboardConsent(){try{const value=JSON.parse(safeGet(LEADERBOARD_CONSENT_KEY,"null"));return value&&value.version===CONFIG.leaderboardConsentVersion&&value.terms===true&&value.public_profile===true?value:null;}catch(_){return null;}}
  const hasLeaderboardConsent=()=>!!leaderboardConsent();
  const leaderboardEnabled=()=>safeGet(LEADERBOARD_ENABLED_KEY,hasLeaderboardConsent()?"1":"0")==="1"&&hasLeaderboardConsent();
  const defaultMatchSetting=()=>window.COPA_IS_NATIVE?"0":"1";
  const enabled=()=>safeGet(SETTINGS_KEY,defaultMatchSetting())==="1";
  const sharingEnabled=()=>safeGet(SHARING_KEY,hasConsent()?"1":"0")==="1"&&hasConsent();
  function onboarding(){try{const value=JSON.parse(safeGet(ONBOARDING_KEY,"null"));return value&&value.version===CONFIG.onboardingVersion?value:null;}catch(_){return null;}}
  const mobileOnboardingComplete=()=>!!onboarding();
  const shouldGateMobileOnboarding=()=>!!window.COPA_IS_NATIVE&&!mobileOnboardingComplete();
  function setEnabled(value){safeSet(SETTINGS_KEY,value?"1":"0");ensureSetting();return enabled();}
  function setSharingEnabled(value){
    if(value&&!hasConsent()){requestConsent();return false;}
    safeSet(SHARING_KEY,value?"1":"0");
    if(!value)saveQueue([]);
    ensureSetting();
    if(value)flushQueue();
    return sharingEnabled();
  }
  const apiBase=()=>{
    const meta=document.querySelector(API_META);
    return String((meta&&meta.content)||window.COPA_GHOST_API||"").trim().replace(/\/$/,"");
  };
  const cleanText=value=>String(value==null?"":value).replace(/[<>]/g,"").replace(/\s+/g," ").trim().slice(0,72);
  const cleanProfileKey=value=>String(value==null?"":value).replace(/[<>\r\n]/g,"").trim().slice(0,180);
  const cleanClubName=(value,fallback="")=>window.ClubNamePolicy?window.ClubNamePolicy.sanitize(value,fallback):cleanText(value).slice(0,29);
  const bounded=(value,min,max)=>Math.max(min,Math.min(max,Number(value)||0));
  const hash=value=>{let h=2166136261;for(const ch of String(value)){h^=ch.codePointAt(0);h=Math.imul(h,16777619);}return (h>>>0).toString(36);};
  const deterministicRoll=value=>parseInt(hash(value),36)/4294967296;
  const clientId=()=>{const stored=safeGet(CLIENT_KEY,"");if(/^GCL-[A-Z0-9]{8,40}$/.test(stored))return stored;const uuid=globalThis.crypto&&typeof globalThis.crypto.randomUUID==="function"?globalThis.crypto.randomUUID():hash(Date.now()+"|"+Math.random());const value="GCL-"+String(uuid).replace(/[^a-z0-9]/gi,"").toUpperCase().slice(0,32).padEnd(8,"0");safeSet(CLIENT_KEY,value);return value;};
  const deleteToken=()=>{const stored=safeGet(DELETE_TOKEN_KEY,"");if(/^GDT-[A-Z0-9]{16,80}$/.test(stored))return stored;const uuid=globalThis.crypto&&typeof globalThis.crypto.randomUUID==="function"?globalThis.crypto.randomUUID():hash(Date.now()+"|delete|"+Math.random());const value="GDT-"+String(uuid).replace(/[^a-z0-9]/gi,"").toUpperCase().padEnd(16,"0");safeSet(DELETE_TOKEN_KEY,value);return value;};
  function blockedIds(){try{const value=JSON.parse(safeGet(BLOCKED_KEY,"[]"));return Array.isArray(value)?value.filter(id=>/^G-[A-Z0-9]{8,32}$/.test(id)).slice(-64):[];}catch(_){return[];}}
  function blockGhost(id){const value=String(id||"").toUpperCase();if(!/^G-[A-Z0-9]{8,32}$/.test(value))return false;const ids=blockedIds();if(!ids.includes(value))ids.push(value);safeSet(BLOCKED_KEY,JSON.stringify(ids.slice(-64)));return true;}
  async function fetchWithTimeout(url,options,timeoutMs=6500){
    if(typeof AbortController==="undefined")return fetch(url,options);
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
    try{return await fetch(url,Object.assign({},options,{signal:controller.signal}));}finally{clearTimeout(timer);}
  }
  const isTr=()=>typeof window.LANG==="undefined"||window.LANG==="tr";
  const tr=(a,b)=>isTr()?a:b;
  function visibleChairmanName(chairman){
    const value=chairman&&typeof chairman==="object"?chairman:{};
    const id=cleanText(value.id);
    const current={
      babacan:tr("Patron Ba\u015fkan","The Patron"),
      leydi:tr("Diplomat Ba\u015fkan","The Diplomat"),
      sansasyoncu:tr("\u015eovmen Ba\u015fkan","The Showman"),
      cilgin:tr("Profes\u00f6r Ba\u015fkan","The Professor")
    };
    if(current[id])return current[id];
    const name=cleanText(value.name);
    const legacy={
      "Babacan":"Patron","Babacan Ba\u015fkan":"Patron Ba\u015fkan","The Godfather":"The Patron",
      "Adalet":"Diplomat","Adalet Ba\u015fkan":"Diplomat Ba\u015fkan",
      "Sansasyoncu":"\u015eovmen","Sansasyoncu Ba\u015fkan":"\u015eovmen Ba\u015fkan",
      "\u00c7\u0131lg\u0131n":"Profes\u00f6r","\u00c7\u0131lg\u0131n Ba\u015fkan":"Profes\u00f6r Ba\u015fkan","The Wild Card":"The Professor"
    };
    return legacy[name]||name||id;
  }

  function readStartedRun(){
    try{
      const stored=JSON.parse(safeGet(RUN_KEY,"{}"))||{};
      return stored&&typeof stored==="object"?stored:{};
    }catch(_){return {};}
  }
  function saveStartedRun(run){safeSet(RUN_KEY,JSON.stringify(run));return run;}
  function beginRun(context){
    const safe=context&&typeof context==="object"?context:{};
    const now=Date.now();
    return saveStartedRun({
      id:"run-"+hash([safe.seed,safe.clubName,now].join("|")),
      seed:String(safe.seed||""),clubName:cleanClubName(safe.clubName||""),
      country:cleanText(safe.country||""),started_at:now,cheatRun:!!safe.cheatRun,ghostOpponentUsed:false
    });
  }
  function updateRun(context){
    const safe=context&&typeof context==="object"?context:{};
    const current=readStartedRun();
    const clubName=cleanClubName(safe.clubName||safe.teamName||current.clubName||"",current.clubName||"");
    const seed=String(safe.seed==null?(current.seed||""):safe.seed);
    const country=cleanText(safe.country||current.country||"");
    const startedAt=Number(current.started_at)||Date.now();
    return saveStartedRun({
      id:cleanText(current.id)||("run-"+hash([seed,clubName,startedAt].join("|"))),
      seed,clubName,country,started_at:startedAt,
      cheatRun:!!(current.cheatRun||safe.cheatRun),
      ghostOpponentUsed:!!(current.ghostOpponentUsed||safe.ghostOpponentUsed),
      ghostOpponentId:cleanText(safe.ghostOpponentId||current.ghostOpponentId||"")
    });
  }
  function hasOpponentUsed(){return !!readStartedRun().ghostOpponentUsed;}
  function markOpponentUsed(ghostId){
    const current=readStartedRun();
    if(!current.id)return false;
    updateRun({ghostOpponentUsed:true,ghostOpponentId:ghostId||current.ghostOpponentId||""});
    return true;
  }

  function queue(){try{const q=JSON.parse(safeGet(QUEUE_KEY,"[]"));return Array.isArray(q)?q:[];}catch(_){return [];}}
  function saveQueue(items){safeSet(QUEUE_KEY,JSON.stringify(items.slice(-CONFIG.queueMax)));}
  function reportQueue(){try{const q=JSON.parse(safeGet(REPORT_QUEUE_KEY,"[]"));return Array.isArray(q)?q:[];}catch(_){return [];}}
  function saveReportQueue(items){safeSet(REPORT_QUEUE_KEY,JSON.stringify(items.slice(-32)));}
  function enqueueReport(id,reason){const items=reportQueue(),key=id+"|"+reason;if(!items.some(item=>item.id+"|"+item.reason===key))items.push({id,reason,created_at:new Date().toISOString()});saveReportQueue(items);}
  function leaderboardQueue(){try{const q=JSON.parse(safeGet(LEADERBOARD_QUEUE_KEY,"[]"));return Array.isArray(q)?q:[];}catch(_){return[];}}
  function saveLeaderboardQueue(items){safeSet(LEADERBOARD_QUEUE_KEY,JSON.stringify(items.slice(-CONFIG.queueMax)));}
  async function setLeaderboardEnabled(value){
    if(value&&!hasLeaderboardConsent()){requestLeaderboardConsent();return false;}
    safeSet(LEADERBOARD_ENABLED_KEY,value?"1":"0");
    if(!value){
      saveLeaderboardQueue([]);
      await deleteLeaderboardData();
    }else{
      safeRemove(LEADERBOARD_DELETE_PENDING_KEY);
      flushLeaderboardQueue();
    }
    ensureSetting();
    return leaderboardEnabled();
  }
  function playerSnapshot(player,index){
    const p=player||{};
    return {
      id:cleanText(p.id||p.pid||""),
      profile_key:cleanProfileKey(p.profileKey||p.profile_key||""),
      name:cleanText(p.name||p.n||("Player "+(index+1)))||("Player "+(index+1)),
      pos:cleanText(p.pos||p.position||"OS")||"OS",
      nat_pos:cleanText(p.natPos||p.pos||p.position||"OS")||"OS",
      club:cleanText(p.club||""),
      age:Math.round(bounded(p.age,0,60)),
      power:Math.round(bounded(p.ov==null?p.power:p.ov,35,115)),
      injured:!!p.injured
    };
  }
  function cardSnapshot(key,context){
    const defs=window.CARDDEFS||window.CARD_DEFS||window.CARDS||{};
    const def=defs[key]||{};
    const variant=context.cardVariant&&context.cardVariant[key]||def.variant||"COMMON";
    return {id:cleanText(key),tier:variant==="DARK"?"DARK":"COMMON",name:cleanText(def.nameTR||def.name||def.n||key),effect:cleanText(def.desc||def.d||"")};
  }
  function tacticProfile(context,cards){
    const text=cards.map(card=>(card.id+" "+card.name).toLowerCase()).join(" ");
    const style=cleanText(context.tactic||context.style||"");
    const has=needle=>text.indexOf(needle)>=0;
    return {
      style,
      wing_bias:has("kanat")?0.78:has("topa_sahip")?0.42:0.52,
      press_bias:has("gegen")||has("press")?0.78:has("dusuk")?0.28:0.50,
      tempo_bias:has("kontra")||has("uzun")?0.68:has("dusuk")?0.35:0.50,
      defensive_bias:has("yerli_blok")||has("kaleci")?0.66:0.48,
      source:"completed_run"
    };
  }
  function matchEventSnapshot(event){
    if(typeof event==="string"){
      const name=cleanText(event);
      return name&&name!=="[object Object]"?{minute:0,side:"",type:"note",name}:null;
    }
    if(!event||typeof event!=="object")return null;
    const minute=Math.round(bounded(event.minute==null?event.m:event.minute,0,130));
    const side=event.side==="home"||event.side==="away"?event.side:event.home===true?"home":event.home===false?"away":"";
    const type=cleanText(event.type||"event").slice(0,20)||"event";
    const name=cleanText(event.name||event.player||event.text||"");
    return name||minute?{minute,side,type,name}:null;
  }
  function finalProfileSnapshot(context){
    const report=context.finalReport&&typeof context.finalReport==="object"?context.finalReport:{};
    const sourceEvents=Array.isArray(report.events)?report.events:Array.isArray(context.lastMatchEvents)?context.lastMatchEvents:[];
    return {
      final_penalty:Math.round(bounded(report.final_penalty==null?(report.finalPenalty==null?context.finalPenalty:report.finalPenalty):report.final_penalty,-40,40)),
      events:sourceEvents.slice(-18).map(matchEventSnapshot).filter(Boolean)
    };
  }
  function normalizeCompletedRun(context){
    const startedRun=readStartedRun();
    const squad=Array.isArray(context.picksBySlot)?context.picksBySlot.filter(Boolean):Array.isArray(context.squad)?context.squad:[];
    const bench=Array.isArray(context.bench)?context.bench:[];
    const cards=(Array.isArray(context.cards)?context.cards:[]).map(key=>cardSnapshot(key,context));
    const createdAt=new Date().toISOString();
    const clubName=cleanClubName(context.teamName||context.clubName||startedRun.clubName||"copa.life XI","copa.life XI");
    const publicId=("G-"+hash([context.seed,clubName,createdAt].join("|")).slice(0,8)).toUpperCase();
    const formation=cleanText(context.formName||context.formation||"4-3-3")||"4-3-3";
    const result=context.run||context.lastResult||{};
    const profile={
      schema_version:CONFIG.schemaVersion,
      game_version:CONFIG.gameVersion,
      data_version:CONFIG.dataVersion,
      card_schema_version:CONFIG.cardSchemaVersion,
      simulation_version:CONFIG.simulationVersion,
      run_id:cleanText(startedRun.id)||("run-"+hash([context.seed,clubName,createdAt,"run"].join("|"))),
      public_ghost_id:publicId,
      seed:String(context.seed==null?"":context.seed).slice(0,64),
      club:{name:clubName,country:cleanText(context.selectedCountry||context.country||"TR").slice(0,8)},
      chairman:{id:cleanText(context.chairman&&context.chairman.id||context.chairmanId||""),name:cleanText(context.chairman&&context.chairman.name||"")},
      formation,
      squad:squad.map(playerSnapshot),
      starting_xi:squad.slice(0,11).map(playerSnapshot),
      bench:bench.map(playerSnapshot),
      chemistry:Math.round(bounded(context.chemistry==null?(context.chemBonus&&context.chemBonus.total):context.chemistry,-5,5)),
      squad_power:Math.round(bounded(result.power==null?context.squadPower:result.power,35,115)),
      cash:Math.round(bounded(result.budgetAtEnd==null?context.budget:result.budgetAtEnd,-100,250)),
      min_cash:Math.round(bounded(context.econStats&&context.econStats.worstDebt,-100,250)),
      active_cards:cards,
      used_cards:(Array.isArray(context.usedRiskCards)?context.usedRiskCards:[]).map(cleanText),
      chairman_effects:{trust:Math.round(bounded(context.chairTrust,0,3)),risk_power:Math.round(bounded(context.riskPowerMod,-30,30))},
      tactics:tacticProfile(context,cards),
      match_history:(Array.isArray(context.fixtures)?context.fixtures:[]).slice(0,6).map(match=>({opponent:cleanText(match.opp||match.name||""),result:cleanText(match.res||""),gf:Math.round(bounded(match.gf,0,20)),ga:Math.round(bounded(match.ga,0,20))})),
      reached_round:Math.round(bounded(result.round||context.round,1,6)),
      result:{won:!!result.won,score:cleanText(result.score||""),end_type:cleanText(result.endType||"")},
      final_profile:finalProfileSnapshot(context),
      mvp:cleanText(context.motm||context.mvp||""),
      scorers:Array.isArray(context.scorers)?context.scorers.slice(0,8).map(cleanText):[],
      created_at:createdAt,
      eligible_until:new Date(Date.now()+1000*60*60*24*45).toISOString()
    };
    profile.integrity=hash(JSON.stringify(profile));
    return profile;
  }
  function normalizeLeaderboardRun(context){
    const safe=context&&typeof context==="object"?context:{},started=readStartedRun(),result=safe.run||{};
    const fixtures=(Array.isArray(safe.fixtures)?safe.fixtures:[]).slice(0,6).map(match=>({
      opponent:cleanText(match&&((match.opp||match.name)||"")),
      result:cleanText(match&&match.res||""),
      gf:Math.round(bounded(match&&match.gf,0,20)),
      ga:Math.round(bounded(match&&match.ga,0,20))
    }));
    while(fixtures.length<6)fixtures.push({opponent:"",result:"",gf:0,ga:0});
    return {
      schema_version:1,
      run_id:cleanText(started.id||("run-"+hash([safe.seed,safe.teamName,Date.now()].join("|")))).toLowerCase(),
      cheat_run:!!(safe.cheatRun||started.cheatRun),
      club:{name:cleanClubName(safe.teamName||started.clubName||"copa.life XI","copa.life XI"),country:cleanText(safe.selectedCountry||started.country||"TR").toUpperCase()},
      reached_round:Math.round(bounded(result.won?6:(result.round||safe.round),1,6)),
      result:{won:!!result.won,score:cleanText(result.score||""),end_type:cleanText(result.endType||"")},
      match_history:fixtures
    };
  }
  async function flushLeaderboardQueue(){
    if(!leaderboardEnabled()||!navigator.onLine)return false;
    const base=apiBase();if(!base)return false;
    const items=leaderboardQueue(),remaining=[];
    for(const item of items){
      try{
        const response=await fetchWithTimeout(base+"/v1/leaderboard/runs",{method:"POST",headers:{"content-type":"application/json","x-copa-client":clientId(),"x-copa-leaderboard-consent-version":CONFIG.leaderboardConsentVersion,"x-copa-delete-token":deleteToken()},body:JSON.stringify(item),keepalive:true});
        if(!response.ok&&response.status!==409&&response.status!==422)remaining.push(item);
      }catch(_){remaining.push(item);}
    }
    saveLeaderboardQueue(remaining);return remaining.length===0;
  }
  async function flushLeaderboardDeletion(){
    if(safeGet(LEADERBOARD_DELETE_PENDING_KEY,"0")!=="1"||!navigator.onLine)return false;
    const base=apiBase();if(!base)return false;
    try{
      const response=await fetchWithTimeout(base+"/v1/me/leaderboard",{method:"DELETE",headers:{"x-copa-client":clientId(),"x-copa-delete-token":deleteToken()}});
      if(!response.ok)return false;
      safeRemove(LEADERBOARD_DELETE_PENDING_KEY);
      return true;
    }catch(_){return false;}
  }
  function recordLeaderboardRun(context){
    if(!leaderboardEnabled())return false;
    const run=normalizeLeaderboardRun(context);if(run.cheat_run)return false;
    const items=leaderboardQueue();if(!items.some(item=>item.run_id===run.run_id))items.push(run);saveLeaderboardQueue(items);setTimeout(flushLeaderboardQueue,0);return true;
  }
  let leaderboardConsentRequest=null;
  function requestLeaderboardConsent(){
    if(hasLeaderboardConsent()){safeSet(LEADERBOARD_ENABLED_KEY,"1");flushLeaderboardQueue();return Promise.resolve(true);}
    if(leaderboardConsentRequest)return leaderboardConsentRequest;
    leaderboardConsentRequest=new Promise(resolve=>{
      const layer=document.createElement("div");layer.className="ghost-consent-layer";layer.id="leaderboardConsentDialog";
      const finish=accepted=>{layer.remove();leaderboardConsentRequest=null;resolve(accepted);};
      layer.innerHTML=`<section class="ghost-consent-card" role="dialog" aria-modal="true" aria-labelledby="leaderboardConsentTitle"><h3 id="leaderboardConsentTitle">${tr("DÜNYA KULÜPLER SIRALAMASI · BETA","WORLD CLUB RANKING · BETA")}</h3><p>${tr("Bu, ödülsüz bir topluluk kariyer sıralamasıdır. Katılırsan kulüp adın, ülken, Dünya Seviyen, sezon Katsayın ve kupa istatistiklerin herkese açık gösterilir. Katsayı en iyi 10 koşunu kullanır ve her ay yenilenir.","This is a community career ranking with no competitive rewards. If you join, your club name, country, World Level, seasonal Coefficient and cup statistics are shown publicly. The Coefficient uses your best 10 runs and resets monthly.")}</p><p class="ghost-consent-confirm">${tr("Sonuçlara tutarlılık kontrolleri uygulanır; ancak istemci tarafında çalışan oyunda mutlak hile koruması garanti edilmez. Dünya profilin bu cihazdaki anonim anahtara bağlıdır ve kariyer kayıt koduna dahil değildir. Geçmiş koşular geriye dönük gönderilmez; profilini ve sonuçlarını ayarlardan kalıcı olarak silebilirsin.","Results receive consistency checks, but absolute cheat protection cannot be guaranteed in a client-side game. Your World profile is tied to this device's anonymous key and is not included in the career save code. Past runs are not uploaded retroactively; you can permanently delete your profile and results from Settings.")}</p><div class="ghost-consent-links"><a href="terms.html" target="_blank" rel="noopener">${tr("Kullanım şartları","Terms")}</a><a href="privacy.html" target="_blank" rel="noopener">${tr("Gizlilik","Privacy")}</a></div><div class="ghost-consent-actions"><button type="button" data-lb-cancel>${tr("VAZGEÇ","CANCEL")}</button><button type="button" data-lb-accept>${tr("KATIL VE YAYINLA","JOIN AND PUBLISH")}</button></div></section>`;
      layer.querySelector("[data-lb-cancel]").onclick=()=>finish(false);
      layer.querySelector("[data-lb-accept]").onclick=()=>{safeSet(LEADERBOARD_CONSENT_KEY,JSON.stringify({version:CONFIG.leaderboardConsentVersion,terms:true,public_profile:true,accepted_at:new Date().toISOString()}));safeSet(LEADERBOARD_ENABLED_KEY,"1");deleteToken();ensureSetting();flushLeaderboardQueue();finish(true);};
      document.body.appendChild(layer);
    });
    return leaderboardConsentRequest;
  }
  const escapeHTML=value=>cleanText(value).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
  function leaderboardRows(rows,myId){
    return (Array.isArray(rows)?rows:[]).map(row=>`<div class="world-rank-row${row.public_club_id===myId?" is-me":""}"><b>#${row.rank}</b><span><strong>${escapeHTML(row.club_name)}</strong><small>${escapeHTML(row.country)} · ${tr("Dünya Sv.","World Lv.")} ${row.career_level} · ${row.total_champions} ${tr("kupa","cups")}</small></span><em>${row.season_score}</em></div>`).join("");
  }
  function worldStateHTML(kind,title,copy,action=true){
    const icons={offline:"⌁",error:"!",unavailable:"◎"},label=tr("TEKRAR DENE","TRY AGAIN");
    return `<div class="meta-world-state is-${kind}"><span aria-hidden="true">${icons[kind]||"◎"}</span><h3>${title}</h3><p>${copy}</p>${action?`<button type="button" class="meta-world-action" onclick="GhostClubs.renderLeaderboard(document.getElementById('metaWorldPanel'))">${label}</button>`:""}</div>`;
  }
  function worldLoadingHTML(){
    return `<div class="meta-world-skeleton" aria-label="${tr("Dünya sıralaması yükleniyor","Loading world rankings")}"><i></i><i></i><i></i><i></i></div>`;
  }
  async function renderLeaderboard(root){
    if(!root)return;
    root.classList.add("meta-world-panel");
    const base=apiBase();
    if(!base){
      root.innerHTML=worldStateHTML("unavailable",tr("Dünya sıralaması kullanılamıyor","World rankings are unavailable"),tr("Bu sürümde sıralama servisi yapılandırılmamış.","The ranking service is not configured in this build."),false);
      return;
    }
    if(!navigator.onLine){
      root.innerHTML=worldStateHTML("offline",tr("Çevrimdışısın","You are offline"),tr("Dünya sıralamasını görmek için bağlantını kontrol et.","Check your connection to view the World ranking."));
      return;
    }
    root.innerHTML=worldLoadingHTML();
    try{
      const topPromise=fetchWithTimeout(base+"/v1/leaderboard?limit=100",{headers:{accept:"application/json"},cache:"no-store"});
      const mePromise=leaderboardEnabled()?fetchWithTimeout(base+"/v1/leaderboard/me",{headers:{accept:"application/json","x-copa-client":clientId(),"x-copa-delete-token":deleteToken()},cache:"no-store"}):Promise.resolve(null);
      const [topResponse,meResponse]=await Promise.all([topPromise,mePromise]);
      if(!topResponse.ok)throw new Error("leaderboard_unavailable");
      const top=topResponse.ok?await topResponse.json():{clubs:[]},mine=meResponse&&meResponse.ok?await meResponse.json():{profile:null,nearby:[]},profile=mine.profile;
      const joined=leaderboardEnabled();
      root.innerHTML=`<div class="world-season-head"><span><small>${tr("AKTİF SEZON","ACTIVE SEASON")}</small><b>${escapeHTML(top.season||new Date().toISOString().slice(0,7))}</b></span><span><small>${tr("DÜNYA SIRAN","WORLD RANK")}</small><b>${profile&&profile.rank?`#${profile.rank} · ${profile.season_score}`:joined?tr("İlk koşunu tamamla","Complete your first run"):tr("Henüz katılmadın","Not joined yet")}</b></span></div>
        ${!joined?`<div class="world-join-card"><span><b>${tr("Topluluk sıralamasına katıl · Beta","Join the community ranking · Beta")}</b><small>${tr("Katıldıktan sonraki geçerli koşuların aylık Katsayını oluşturur. Geçmiş koşular gönderilmez.","Eligible runs after joining build your monthly Coefficient. Past runs are never uploaded.")}</small></span><button type="button" onclick="GhostClubs.joinLeaderboard()">${tr("SIRALAMAYA KATIL","JOIN RANKING")}</button></div>`:""}
        ${joined&&!profile?`<div class="world-new-card"><span aria-hidden="true">◎</span><p><b>${tr("Sıralama profilin hazır","Your ranking profile is ready")}</b><small>${tr("İlk dereceli koşunu tamamladığında burada yerini göreceksin.","Complete your first ranked run to see your place here.")}</small></p></div>`:""}
        ${profile&&mine.nearby&&mine.nearby.length?`<section><div class="meta-section-heading"><h4>${tr("SIRALAMADAKİ YERİN","YOUR POSITION")}</h4><small>${tr("Yakın kulüpler","Nearby clubs")}</small></div>${leaderboardRows(mine.nearby,profile.public_club_id)}</section>`:""}
        <section><div class="meta-section-heading"><h4>${tr("DÜNYA İLK 100 · BETA","WORLD TOP 100 · BETA")}</h4><small>${escapeHTML(top.season||"")}</small></div><div class="world-rank-list">${leaderboardRows(top.clubs,profile&&profile.public_club_id)||`<div class="meta-inline-empty">${tr("Bu sezon henüz sıralanan kulüp yok.","No clubs are ranked this season yet.")}</div>`}</div></section>
        <p class="world-rule">${tr("Kulüp Katsayısı bu ay kabul edilen en iyi 10 koşunun Dünya İtibarı toplamıdır; eşit Katsayılar aynı sırayı paylaşır. Kalıcı Dünya İtibarı sezon sonunda sıfırlanmaz. Bu ödülsüz topluluk sıralamasında tutarlılık kontrolleri vardır, mutlak hile koruması yoktur. Dünya profili cihaz anahtarına bağlıdır ve kariyer kayıt koduyla taşınmaz.","Club Coefficient is the World Reputation total of your best 10 accepted runs this month; equal Coefficients share the same rank. Permanent World Reputation never resets. This reward-free community ranking uses consistency checks, not absolute cheat protection. The World profile is device-bound and does not transfer with the career save code.")}</p>`;
    }catch(_){
      root.innerHTML=worldStateHTML("error",tr("Sıralama yüklenemedi","Ranking could not be loaded"),tr("Sunucuya şu anda ulaşılamıyor. Biraz sonra yeniden deneyebilirsin.","The server cannot be reached right now. You can try again shortly."));
    }
  }
  async function joinLeaderboard(){
    const accepted=await requestLeaderboardConsent();
    if(accepted&&window.CopaMeta)window.CopaMeta.openProgression("world");
    return accepted;
  }
  async function deleteLeaderboardData(){
    const base=apiBase();safeSet(LEADERBOARD_ENABLED_KEY,"0");safeRemove(LEADERBOARD_CONSENT_KEY);saveLeaderboardQueue([]);safeSet(LEADERBOARD_DELETE_PENDING_KEY,"1");
    if(!base||!navigator.onLine){ensureSetting();return {ok:false,offline:true,pending:true};}
    try{
      const response=await fetchWithTimeout(base+"/v1/me/leaderboard",{method:"DELETE",headers:{"x-copa-client":clientId(),"x-copa-delete-token":deleteToken()}});
      if(!response.ok)return {ok:false,status:response.status,pending:true};
      safeRemove(LEADERBOARD_DELETE_PENDING_KEY);ensureSetting();
      return await response.json();
    }catch(_){return {ok:false,pending:true};}
  }
  function validRemote(snapshot){
    if(!snapshot||snapshot.schema_version!==CONFIG.schemaVersion)return false;
    if(snapshot.simulation_version!==CONFIG.simulationVersion||snapshot.card_schema_version!==CONFIG.cardSchemaVersion)return false;
    if(!/^G-[A-Z0-9]{8,32}$/.test(String(snapshot.public_ghost_id||"")))return false;
    if(!Array.isArray(snapshot.starting_xi)||snapshot.starting_xi.length!==11)return false;
    if(!Number.isFinite(Number(snapshot.squad_power))||Number(snapshot.squad_power)<35||Number(snapshot.squad_power)>115)return false;
    return true;
  }
  function toOpponent(snapshot){
    const lineup=snapshot.starting_xi.slice(0,11).map((player,index)=>({
      name:cleanText(player.name)||("Player "+(index+1)),
      pos:cleanText(player.pos)||"OS",
      natPos:cleanText(player.nat_pos||player.pos)||"OS",
      club:cleanText(player.club||""),
      age:Number(player.age)>0?Math.round(bounded(player.age,0,60)):null,
      profileKey:cleanProfileKey(player.profile_key||""),
      ov:Math.round(bounded(player.power,35,115)),
      injured:!!player.injured
    }));
    return {
      name:cleanClubName(snapshot.club&&snapshot.club.name,"Ghost Club"),
      power:Math.round(bounded(snapshot.squad_power,35,115)),
      ghost:true,
      ghostId:snapshot.public_ghost_id,
      ghostMeta:{country:cleanText(snapshot.club&&snapshot.club.country),formation:cleanText(snapshot.formation),chairman:visibleChairmanName(snapshot.chairman),publicId:snapshot.public_ghost_id,reachedRound:snapshot.reached_round},
      ghostProfile:{formation:cleanText(snapshot.formation),lineup,tactics:snapshot.tactics||{},chemistry:Math.round(bounded(snapshot.chemistry,-5,5)),cards:Array.isArray(snapshot.active_cards)?snapshot.active_cards:[],finalProfile:finalProfileSnapshot({finalReport:snapshot.final_profile||{}})}
    };
  }
  function enqueue(profile){
    const items=queue();
    if(!items.some(item=>item.public_ghost_id===profile.public_ghost_id))items.push(profile);
    saveQueue(items);
  }
  async function flushQueue(){
    const base=apiBase();
    if(!sharingEnabled()||!base||!navigator.onLine)return {sent:0,pending:queue().length};
    const items=queue();let sent=0;
    while(items.length){
      const current=items[0];
      try{
        const res=await fetchWithTimeout(base+"/v1/ghosts",{method:"POST",headers:{"content-type":"application/json","x-copa-client":clientId(),"x-copa-consent-version":CONFIG.consentVersion,"x-copa-delete-token":deleteToken()},body:JSON.stringify(current),keepalive:true});
        if(!res.ok)break;
        items.shift();sent++;
      }catch(_){break;}
    }
    saveQueue(items);
    return {sent,pending:items.length};
  }
  async function flushReportQueue(){
    const base=apiBase();
    if(!base||!navigator.onLine)return {sent:0,pending:reportQueue().length};
    const items=reportQueue();let sent=0;
    while(items.length){
      const current=items[0];
      try{
        const response=await fetchWithTimeout(base+"/v1/ghosts/"+encodeURIComponent(current.id)+"/report",{method:"POST",headers:{"content-type":"application/json","x-copa-client":clientId()},body:JSON.stringify({reason:current.reason})});
        if(!response.ok&&response.status!==404&&response.status!==410)break;
        items.shift();sent++;
      }catch(_){break;}
    }
    saveReportQueue(items);
    return {sent,pending:items.length};
  }
  function recordCompletedRun(context){
    try{
      if(!sharingEnabled())return null;
      const safe=context&&typeof context==="object"?context:{};
      const run=updateRun({seed:safe.seed,clubName:safe.teamName||safe.clubName,country:safe.selectedCountry||safe.country,cheatRun:!!safe.cheatRun});
      if(run.cheatRun)return null;
      const profile=normalizeCompletedRun(safe);enqueue(profile);setTimeout(()=>{flushQueue();},0);return profile.public_ghost_id;
    }catch(_){return null;}
  }
  let matchPending=false;
  async function findOpponent(criteria){
    const base=apiBase();
    if(!enabled()||!base||!navigator.onLine||hasOpponentUsed()||matchPending)return null;
    const round=Math.round(bounded(criteria&&criteria.round,1,6));
    const chance=CONFIG.matchChance[round]||.30;
    const run=readStartedRun();
    const seed=String(criteria&&criteria.seed==null?(run.seed||""):criteria.seed);
    const roll=deterministicRoll(["ghost-match",seed,round].join("|"));
    if(roll>chance)return null;
    const power=Math.round(bounded(criteria&&criteria.power,35,115));
    const params=new URLSearchParams({
      power:String(power),
      round:String(round),
      simulation_version:CONFIG.simulationVersion,
      card_schema_version:CONFIG.cardSchemaVersion
    });
    const seen=Array.from(new Set((Array.isArray(criteria&&criteria.excluded)?criteria.excluded:[]).concat(blockedIds()))).slice(-64);
    if(seen.length)params.set("exclude",seen.join(","));
    matchPending=true;
    try{
      const res=await fetchWithTimeout(base+"/v1/ghosts/match?"+params.toString(),{headers:{accept:"application/json"},cache:"no-store"});
      if(!res.ok)return null;
      const body=await res.json();const snapshot=body&&body.ghost;
      return validRemote(snapshot)?toOpponent(snapshot):null;
    }catch(_){return null;}finally{matchPending=false;}
  }
  let consentRequest=null;
  function requestConsent(){
    if(hasConsent()&&sharingEnabled())return Promise.resolve(true);
    if(document.getElementById("ghostConsentDialog"))return consentRequest||Promise.resolve(false);
    let finishConsent;
    consentRequest=new Promise(resolve=>{finishConsent=resolve;});
    const layer=document.createElement("div");layer.id="ghostConsentDialog";layer.className="ghost-consent-layer";
    layer.innerHTML=`<section class="ghost-consent-card" role="dialog" aria-modal="true" aria-labelledby="ghostConsentTitle"><h3 id="ghostConsentTitle">${tr("HAYALET KULÜP PAYLAŞIMI","GHOST CLUB SHARING")}</h3><p>${tr("Tamamlanan kadronuz, kulüp adınız ve anonim kurulum kimliğiniz başka oyunculara Ghost rakibi üretmek için 45 gün saklanır. Kendi kulübünüzü paylaşmak isteğe bağlıdır ve açık onay verilene kadar kapalıdır.","Your completed squad, club name and anonymous install ID are retained for 45 days to create a Ghost opponent for other players. Sharing your own club is optional and remains off until you explicitly opt in.")}</p><p class="ghost-consent-confirm">${tr("“KABUL ET VE PAYLAŞ”a basarak Kullanım Şartları’nı kabul eder ve yukarıda açıklanan oyun verilerinin 45 gün boyunca Ghost rakibi üretmek için paylaşılmasına açıkça izin verirsin. İznini ayarlardan dilediğin zaman geri çekebilirsin.","By pressing “ACCEPT AND SHARE”, you accept the Terms of Use and explicitly consent to the described game data being shared for 45 days to create Ghost opponents. You can withdraw this permission at any time in Settings.")}</p><div class="ghost-consent-links"><a href="terms.html" target="_blank" rel="noopener">${tr("Kullanım şartları","Terms")}</a><a href="privacy.html" target="_blank" rel="noopener">${tr("Gizlilik","Privacy")}</a></div><div class="ghost-consent-actions"><button type="button" data-ghost-cancel>${tr("VAZGEÇ","CANCEL")}</button><button type="button" data-ghost-accept>${tr("KABUL ET VE PAYLAŞ","ACCEPT AND SHARE")}</button></div></section>`;
    const complete=value=>{layer.remove();const resolve=finishConsent;consentRequest=null;finishConsent=null;if(resolve)resolve(!!value);};
    document.body.appendChild(layer);const accept=layer.querySelector("[data-ghost-accept]");layer.querySelector("[data-ghost-cancel]").addEventListener("click",()=>complete(false));accept.addEventListener("click",()=>{safeSet(CONSENT_KEY,JSON.stringify({version:CONFIG.consentVersion,terms:true,sharing:true,action:"accept_and_share",accepted_at:new Date().toISOString()}));safeSet(SHARING_KEY,"1");if(window.CopaAnalytics)window.CopaAnalytics.track("ghost_opt_in");deleteToken();ensureSetting();flushQueue();complete(true);});
    return consentRequest;
  }
  function applyOnboardingChoices(choices,action){
    const selected=choices&&typeof choices==="object"?choices:{};
    const matching=!!selected.matching,sharing=!!selected.sharing,leaderboard=!!selected.leaderboard,acceptedAt=new Date().toISOString();
    safeSet(SETTINGS_KEY,matching?"1":"0");
    if(sharing){safeSet(CONSENT_KEY,JSON.stringify({version:CONFIG.consentVersion,terms:true,sharing:true,action:"mobile_onboarding",accepted_at:acceptedAt}));safeSet(SHARING_KEY,"1");deleteToken();}
    else{safeSet(SHARING_KEY,"0");if(!hasConsent())safeRemove(CONSENT_KEY);saveQueue([]);}
    if(leaderboard){safeSet(LEADERBOARD_CONSENT_KEY,JSON.stringify({version:CONFIG.leaderboardConsentVersion,terms:true,public_profile:true,action:"mobile_onboarding",accepted_at:acceptedAt}));safeSet(LEADERBOARD_ENABLED_KEY,"1");deleteToken();}
    else{safeSet(LEADERBOARD_ENABLED_KEY,"0");if(!hasLeaderboardConsent())safeRemove(LEADERBOARD_CONSENT_KEY);saveLeaderboardQueue([]);}
    safeSet(ONBOARDING_KEY,JSON.stringify({version:CONFIG.onboardingVersion,terms:true,matching,sharing,leaderboard,action:action||"save_choices",accepted_at:acceptedAt}));
    ensureSetting();
    if(sharing)flushQueue();
    if(leaderboard)flushLeaderboardQueue();
    if(window.CopaAnalytics)window.CopaAnalytics.track("online_onboarding_complete",{matching,sharing,leaderboard,action:action||"save_choices"});
    return {matching,sharing,leaderboard};
  }
  let onboardingRequest=null;
  function requestMobileOnboarding(){
    if(!shouldGateMobileOnboarding())return Promise.resolve(onboarding()||{matching:enabled(),sharing:sharingEnabled(),leaderboard:leaderboardEnabled()});
    if(onboardingRequest)return onboardingRequest;
    onboardingRequest=new Promise(resolve=>{
      const layer=document.createElement("div");layer.id="onlineFeaturesOnboarding";layer.className="ghost-consent-layer online-onboarding-layer";
      layer.innerHTML=`<section class="ghost-consent-card online-onboarding-card" role="dialog" aria-modal="true" aria-labelledby="onlineOnboardingTitle"><div class="online-onboarding-kicker">${tr("İLK KURULUM · ÇEVRİMİÇİ OYUN","FIRST SETUP · ONLINE PLAY")}</div><h3 id="onlineOnboardingTitle">${tr("Çevrimiçi özelliklerini seç","Choose your online features")}</h3><p>${tr("Üç özelliği şimdi tek ekrandan ayarla. Seçimlerini daha sonra Gelişmiş Ayarlar’dan değiştirebilirsin.","Set all three features on one screen now. You can change your choices later in Advanced Settings.")}</p><div class="online-onboarding-options"><label><input type="checkbox" data-online-matching ${enabled()?"checked":""}><span><b>${tr("Ghost rakiplerle oyna","Play Ghost opponents")}</b><small>${tr("Diğer oyuncuların anonim kadrolarını rakip olarak indirir; senin kulübünü yayınlamaz.","Downloads other players’ anonymous squads as opponents; this does not publish your club.")}</small></span></label><label><input type="checkbox" data-online-sharing ${sharingEnabled()?"checked":""}><span><b>${tr("Kulübümü Ghost olarak paylaş","Share my club as a Ghost")}</b><small>${tr("Tamamlanan kadro, kulüp adı ve anonim cihaz kimliği 45 gün Ghost havuzunda saklanır.","Your completed squad, club name and anonymous device ID are retained in the Ghost pool for 45 days.")}</small></span></label><label><input type="checkbox" data-online-leaderboard ${leaderboardEnabled()?"checked":""}><span><b>${tr("Dünya Kulüpler Sıralaması’na katıl","Join the World Club Ranking")}</b><small>${tr("Kulüp adı, ülke, kariyer seviyesi ve kupa istatistikleri herkese açık profil olur.","Club name, country, career level and cup statistics become a public profile.")}</small></span></label></div><p class="ghost-consent-confirm">${tr("“TÜMÜNÜ AÇ VE KABUL ET” ile Kullanım Şartları’nı kabul eder ve seçili veri paylaşımlarına açıkça izin verirsin. İzinlerini geri çekebilir ve çevrimiçi verilerini kalıcı olarak silebilirsin.","By choosing “ENABLE ALL AND ACCEPT”, you accept the Terms and explicitly consent to the selected data sharing. You can withdraw consent and permanently delete your online data.")}</p><div class="ghost-consent-links"><a href="terms.html" target="_blank" rel="noopener">${tr("Kullanım şartları","Terms")}</a><a href="privacy.html" target="_blank" rel="noopener">${tr("Gizlilik","Privacy")}</a></div><div class="online-onboarding-actions"><button type="button" data-online-offline>${tr("ÇEVRİMDIŞI DEVAM","CONTINUE OFFLINE")}</button><button type="button" data-online-save>${tr("SEÇİMLERİ KAYDET","SAVE CHOICES")}</button><button type="button" data-online-all>${tr("TÜMÜNÜ AÇ VE KABUL ET","ENABLE ALL AND ACCEPT")}</button></div></section>`;
      const finish=(choices,action)=>{const result=applyOnboardingChoices(choices,action);layer.remove();onboardingRequest=null;resolve(result);};
      const readChoices=()=>({matching:layer.querySelector("[data-online-matching]").checked,sharing:layer.querySelector("[data-online-sharing]").checked,leaderboard:layer.querySelector("[data-online-leaderboard]").checked});
      layer.querySelector("[data-online-offline]").onclick=()=>finish({matching:false,sharing:false,leaderboard:false},"continue_offline");
      layer.querySelector("[data-online-save]").onclick=()=>finish(readChoices(),"save_choices");
      layer.querySelector("[data-online-all]").onclick=()=>finish({matching:true,sharing:true,leaderboard:true},"enable_all");
      document.body.appendChild(layer);
    });
    return onboardingRequest;
  }
  function clearLocalGhostData(){for(const key of [SHARING_KEY,CONSENT_KEY,LEADERBOARD_ENABLED_KEY,LEADERBOARD_CONSENT_KEY,LEADERBOARD_QUEUE_KEY,LEADERBOARD_DELETE_PENDING_KEY,ONBOARDING_KEY,CLIENT_KEY,DELETE_TOKEN_KEY,QUEUE_KEY,REPORT_QUEUE_KEY,RUN_KEY])safeRemove(key);ensureSetting();}
  async function deleteMyData(){const base=apiBase();saveQueue([]);saveLeaderboardQueue([]);safeSet(SHARING_KEY,"0");safeSet(LEADERBOARD_ENABLED_KEY,"0");ensureSetting();if(!base||!navigator.onLine)return {ok:false,offline:true};try{const response=await fetchWithTimeout(base+"/v1/me/ghosts",{method:"DELETE",headers:{"x-copa-client":clientId(),"x-copa-delete-token":deleteToken()}});if(!response.ok)return {ok:false,status:response.status};const result=await response.json();if(result&&result.ok)clearLocalGhostData();return result;}catch(_){return {ok:false};}}
  function withdrawConsent(){safeSet(SHARING_KEY,"0");safeRemove(CONSENT_KEY);saveQueue([]);ensureSetting();}
  async function reportGhost(id,reason){const value=String(id||"").toUpperCase();if(!/^G-[A-Z0-9]{8,32}$/.test(value))return {ok:false,error:"invalid_id"};if(!reason){if(!globalThis.confirm(tr("Bu Ghost kulübünü bildirip bir daha göstermemek istiyor musunuz?","Report this Ghost club and never show it again?")))return {ok:false,cancelled:true};reason="other";}blockGhost(value);const requested=cleanText(reason).toLowerCase().slice(0,32),cleanReason=REPORT_REASONS.has(requested)?requested:"other";enqueueReport(value,cleanReason);const result=await flushReportQueue();return {ok:true,hidden:true,pending:result.pending>0,sent:result.sent};}
  function ensureSetting(){
    const slot=document.getElementById("advancedGhostSettingSlot"),privacySlot=document.getElementById("advancedPrivacySlot");if(!slot)return;
    let group=document.getElementById("ghostClubSetting");
    if(!group){
      group=document.createElement("div");group.id="ghostClubSetting";group.className="ghost-setting";
      const option=document.createElement("div");option.className="ghost-setting-option";
      const header=document.createElement("div");header.className="ghost-setting-header";header.id="ghostClubSettingHdr";option.appendChild(header);
      const button=document.createElement("button");button.type="button";button.id="ghostClubToggle";button.className="ghost-setting-toggle";button.onclick=()=>setEnabled(!enabled());option.appendChild(button);
      const text=document.createElement("div");text.className="ghost-setting-copy";text.id="ghostClubSettingCopy";option.appendChild(text);group.appendChild(option);
      const shareOption=document.createElement("div");shareOption.className="ghost-setting-option";
      const shareHeader=document.createElement("div");shareHeader.className="ghost-setting-header";shareHeader.id="ghostShareSettingHdr";shareOption.appendChild(shareHeader);
      const shareButton=document.createElement("button");shareButton.type="button";shareButton.id="ghostShareToggle";shareButton.className="ghost-setting-toggle";shareButton.onclick=()=>setSharingEnabled(!sharingEnabled());shareOption.appendChild(shareButton);
      const shareText=document.createElement("div");shareText.className="ghost-setting-copy";shareText.id="ghostShareSettingCopy";shareOption.appendChild(shareText);group.appendChild(shareOption);
      const rankOption=document.createElement("div");rankOption.className="ghost-setting-option";
      const rankHeader=document.createElement("div");rankHeader.className="ghost-setting-header";rankHeader.id="leaderboardSettingHdr";rankOption.appendChild(rankHeader);
      const rankButton=document.createElement("button");rankButton.type="button";rankButton.id="leaderboardToggle";rankButton.className="ghost-setting-toggle";rankButton.onclick=async()=>{const turningOn=!leaderboardEnabled();if(!turningOn&&!globalThis.confirm(tr("Dünya sıralaması profilin ve koşu sonuçların kalıcı olarak silinsin mi?","Permanently delete your World ranking profile and run results?")))return;await setLeaderboardEnabled(turningOn);};rankOption.appendChild(rankButton);
      const rankText=document.createElement("div");rankText.className="ghost-setting-copy";rankText.id="leaderboardSettingCopy";rankOption.appendChild(rankText);group.appendChild(rankOption);
    }
    if(group.parentElement!==slot)slot.appendChild(group);
    if(privacySlot){
      let privacy=document.getElementById("ghostSettingPrivacy");if(!privacy){privacy=document.createElement("div");privacy.id="ghostSettingPrivacy";privacy.className="ghost-setting-privacy";}
      if(privacy.parentElement!==privacySlot)privacySlot.appendChild(privacy);
      privacy.innerHTML=`<a href="privacy.html" target="_blank" rel="noopener">${tr("Gizlilik","Privacy")}</a><a href="terms.html" target="_blank" rel="noopener">${tr("Şartlar","Terms")}</a><button type="button" data-ghost-delete>${tr("Çevrimiçi verilerimi sil","Delete my online data")}</button>`;
      privacy.querySelector("[data-ghost-delete]").onclick=async()=>{if(!globalThis.confirm(tr("Paylaşılan Ghost verilerin, Dünya sıralaması profilin ve çevrimiçi koşu sonuçların kalıcı olarak silinsin mi?","Permanently delete your shared Ghost data, World ranking profile and online run results?")))return;const result=await deleteMyData();if(typeof window.showToast==="function")window.showToast(result.ok?tr("Çevrimiçi veriler silindi.","Online data deleted."):tr("Silme işlemi tamamlanamadı.","Deletion could not be completed."));};
    }
    const on=enabled(),sharing=sharingEnabled(),ranked=leaderboardEnabled(),header=document.getElementById("ghostClubSettingHdr"),copy=document.getElementById("ghostClubSettingCopy"),button=document.getElementById("ghostClubToggle"),shareHeader=document.getElementById("ghostShareSettingHdr"),shareCopy=document.getElementById("ghostShareSettingCopy"),shareButton=document.getElementById("ghostShareToggle"),rankHeader=document.getElementById("leaderboardSettingHdr"),rankCopy=document.getElementById("leaderboardSettingCopy"),rankButton=document.getElementById("leaderboardToggle");
    if(header)header.textContent=tr("GHOST RAKİPLER","GHOST OPPONENTS");
    if(copy)copy.textContent=on?tr("Bu run uygun bir Ghost rakiple eşleşilebilir.","This run can match an eligible Ghost opponent."):tr("Bu run uygun bir Ghost rakiple eşleşemez.","This run cannot match an eligible Ghost opponent.");
    if(button){button.classList.toggle("on",on);button.setAttribute("aria-pressed",String(on));button.innerHTML=`<span aria-hidden="true">${ghostIcon()}</span><span>${on?tr("A\u00c7IK","ON"):tr("KAPALI","OFF")}</span>`;button.title=tr("Hayalet Kul\u00fcplere Kar\u015f\u0131 Oyna","Play Against Ghost Clubs");}
    if(shareHeader)shareHeader.textContent=tr("KULÜBÜMÜ GHOST OLARAK PAYLAŞ","SHARE MY CLUB AS A GHOST");
    if(shareCopy)shareCopy.textContent=sharing?tr("Kulübün run sonunda Ghost havuzuna katılır.","Your club joins the Ghost pool at the end of the run."):tr("Kulübün run sonunda Ghost havuzuna katılmaz.","Your club does not join the Ghost pool at the end of the run.");
    if(shareButton){shareButton.classList.toggle("on",sharing);shareButton.setAttribute("aria-pressed",String(sharing));shareButton.innerHTML=`<span aria-hidden="true">${ghostIcon()}</span><span>${sharing?tr("PAYLAŞILIYOR","SHARING"):tr("PAYLAŞILMIYOR","NOT SHARING")}</span>`;shareButton.title=tr("Kulübümü Ghost olarak paylaş","Share my club as a Ghost");}
    if(rankHeader)rankHeader.textContent=tr("DÜNYA KULÜPLER SIRALAMASI · BETA","WORLD CLUB RANKING · BETA");
    if(rankCopy)rankCopy.textContent=ranked?tr("Ödülsüz topluluk sıralamasındasın. Profil bu cihaza bağlıdır; kariyer kayıt koduyla taşınmaz.","You are in the reward-free community ranking. The profile is tied to this device and does not transfer with the career save code."):tr("Kulüp profilin yayınlanmaz ve koşuların sıralamaya gönderilmez.","Your club profile is not published and runs are not sent to the ranking.");
    if(rankButton){rankButton.classList.toggle("on",ranked);rankButton.setAttribute("aria-pressed",String(ranked));rankButton.innerHTML=`<span aria-hidden="true">◎</span><span>${ranked?tr("SIRALAMADA","RANKED"):tr("KATILMIYOR","NOT JOINED")}</span>`;rankButton.title=tr("Dünya Kulüpler Sıralaması","World Club Ranking");}
  }
  function ghostIcon(){return '<svg viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M5 17V8a5 5 0 0 1 10 0v9l-2-1.5L10 17l-3-1.5z"/><circle cx="8" cy="9" r=".7" fill="currentColor"/><circle cx="12" cy="9" r=".7" fill="currentColor"/></svg>';}
  window.addEventListener("online",()=>{flushQueue();flushReportQueue();flushLeaderboardQueue();flushLeaderboardDeletion();});
  window.GhostClubs=Object.freeze({CONFIG,enabled,setEnabled,sharingEnabled,setSharingEnabled,leaderboardEnabled,setLeaderboardEnabled,ensureSetting,requestConsent,requestLeaderboardConsent,requestMobileOnboarding,mobileOnboardingComplete,shouldGateMobileOnboarding,hasConsent,hasLeaderboardConsent,withdrawConsent,deleteMyData,deleteLeaderboardData,reportGhost,blockGhost,blockedIds,beginRun,updateRun,recordCompletedRun,recordLeaderboardRun,findOpponent,flushQueue,flushLeaderboardQueue,flushReports:flushReportQueue,renderLeaderboard,joinLeaderboard,ghostIcon,normalizeCompletedRun,normalizeLeaderboardRun,hasOpponentUsed,markOpponentUsed,canMatch:enabled,canShare:sharingEnabled});
  setTimeout(()=>{ensureSetting();flushQueue();flushReportQueue();flushLeaderboardQueue();flushLeaderboardDeletion();},0);
})();
