/* copa.life ghost clubs: asynchronous, opt-in opponents with automatic run capture. */
(function(){
  "use strict";
  const SETTINGS_KEY="copa_ghost_clubs_enabled";
  const QUEUE_KEY="copa_ghost_upload_queue_v1";
  const RUN_KEY="copa_ghost_current_run_v1";
  const API_META="meta[name='copa-ghost-api']";
  const CONFIG=Object.freeze({
    schemaVersion:1,
    gameVersion:"2026.07.13",
    dataVersion:"2026.07.13",
    cardSchemaVersion:"2026.07",
    simulationVersion:"finalsim-v3",
    queueMax:24,
    matchChance:{1:.20,2:.24,3:.29,4:.34,5:.38,6:.40}
  });

  const safeGet=(key,fallback)=>{try{const value=localStorage.getItem(key);return value===null?fallback:value;}catch(_){return fallback;}};
  const safeSet=(key,value)=>{try{localStorage.setItem(key,value);return true;}catch(_){return false;}};
  const enabled=()=>safeGet(SETTINGS_KEY,"1")!=="0";
  const setEnabled=value=>{safeSet(SETTINGS_KEY,value?"1":"0");ensureSetting();};
  const apiBase=()=>{
    const meta=document.querySelector(API_META);
    return String((meta&&meta.content)||window.COPA_GHOST_API||"").trim().replace(/\/$/,"");
  };
  const cleanText=value=>String(value==null?"":value).replace(/[<>]/g,"").replace(/\s+/g," ").trim().slice(0,72);
  const bounded=(value,min,max)=>Math.max(min,Math.min(max,Number(value)||0));
  const hash=value=>{let h=2166136261;for(const ch of String(value)){h^=ch.codePointAt(0);h=Math.imul(h,16777619);}return (h>>>0).toString(36);};
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
      seed:String(safe.seed||""),clubName:cleanText(safe.clubName||""),
      country:cleanText(safe.country||""),started_at:now
    });
  }
  function updateRun(context){
    const safe=context&&typeof context==="object"?context:{};
    const current=readStartedRun();
    const clubName=cleanText(safe.clubName||safe.teamName||current.clubName||"");
    const seed=String(safe.seed==null?(current.seed||""):safe.seed);
    const country=cleanText(safe.country||current.country||"");
    const startedAt=Number(current.started_at)||Date.now();
    return saveStartedRun({
      id:cleanText(current.id)||("run-"+hash([seed,clubName,startedAt].join("|"))),
      seed,clubName,country,started_at:startedAt
    });
  }

  function queue(){try{const q=JSON.parse(safeGet(QUEUE_KEY,"[]"));return Array.isArray(q)?q:[];}catch(_){return [];}}
  function saveQueue(items){safeSet(QUEUE_KEY,JSON.stringify(items.slice(-CONFIG.queueMax)));}
  function playerSnapshot(player,index){
    const p=player||{};
    return {
      id:cleanText(p.id||p.pid||""),
      name:cleanText(p.name||p.n||("Player "+(index+1)))||("Player "+(index+1)),
      pos:cleanText(p.pos||p.position||"OS")||"OS",
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
  function normalizeCompletedRun(context){
    const startedRun=readStartedRun();
    const squad=Array.isArray(context.picksBySlot)?context.picksBySlot.filter(Boolean):Array.isArray(context.squad)?context.squad:[];
    const bench=Array.isArray(context.bench)?context.bench:[];
    const cards=(Array.isArray(context.cards)?context.cards:[]).map(key=>cardSnapshot(key,context));
    const createdAt=new Date().toISOString();
    const clubName=cleanText(context.teamName||context.clubName||startedRun.clubName||"copa.life XI")||"copa.life XI";
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
      final_profile:context.finalReport&&typeof context.finalReport==="object"?context.finalReport:{final_penalty:Math.round(bounded(context.finalPenalty,-40,40)),events:Array.isArray(context.lastMatchEvents)?context.lastMatchEvents.slice(-18).map(cleanText):[]},
      mvp:cleanText(context.motm||context.mvp||""),
      scorers:Array.isArray(context.scorers)?context.scorers.slice(0,8).map(cleanText):[],
      created_at:createdAt,
      eligible_until:new Date(Date.now()+1000*60*60*24*45).toISOString()
    };
    profile.integrity=hash(JSON.stringify(profile));
    return profile;
  }
  function validRemote(snapshot){
    if(!snapshot||snapshot.schema_version!==CONFIG.schemaVersion)return false;
    if(snapshot.game_version!==CONFIG.gameVersion||snapshot.data_version!==CONFIG.dataVersion)return false;
    if(!/^G-[A-Z0-9]{4,12}$/.test(String(snapshot.public_ghost_id||"")))return false;
    if(!Array.isArray(snapshot.starting_xi)||snapshot.starting_xi.length<10)return false;
    if(!Number.isFinite(Number(snapshot.squad_power))||Number(snapshot.squad_power)<35||Number(snapshot.squad_power)>115)return false;
    return true;
  }
  function toOpponent(snapshot){
    const lineup=snapshot.starting_xi.slice(0,11).map((player,index)=>({
      name:cleanText(player.name)||("Player "+(index+1)),
      pos:cleanText(player.pos)||"OS",
      ov:Math.round(bounded(player.power,35,115)),
      injured:!!player.injured
    }));
    return {
      name:cleanText(snapshot.club&&snapshot.club.name)||"Ghost Club",
      power:Math.round(bounded(snapshot.squad_power,35,115)),
      ghost:true,
      ghostId:snapshot.public_ghost_id,
      ghostMeta:{country:cleanText(snapshot.club&&snapshot.club.country),formation:cleanText(snapshot.formation),chairman:visibleChairmanName(snapshot.chairman),publicId:snapshot.public_ghost_id,reachedRound:snapshot.reached_round},
      ghostProfile:{formation:cleanText(snapshot.formation),lineup,tactics:snapshot.tactics||{},chemistry:Math.round(bounded(snapshot.chemistry,-5,5)),cards:Array.isArray(snapshot.active_cards)?snapshot.active_cards:[],finalProfile:snapshot.final_profile||{}}
    };
  }
  function enqueue(profile){
    const items=queue();
    if(!items.some(item=>item.public_ghost_id===profile.public_ghost_id))items.push(profile);
    saveQueue(items);
  }
  async function flushQueue(){
    const base=apiBase();
    if(!base||!navigator.onLine)return {sent:0,pending:queue().length};
    const items=queue();let sent=0;
    while(items.length){
      const current=items[0];
      try{
        const res=await fetch(base+"/v1/ghosts",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(current),keepalive:true});
        if(!res.ok)break;
        items.shift();sent++;
      }catch(_){break;}
    }
    saveQueue(items);
    return {sent,pending:items.length};
  }
  function recordCompletedRun(context){
    try{
      const safe=context&&typeof context==="object"?context:{};
      updateRun({seed:safe.seed,clubName:safe.teamName||safe.clubName,country:safe.selectedCountry||safe.country});
      const profile=normalizeCompletedRun(safe);enqueue(profile);setTimeout(()=>{flushQueue();},0);return profile.public_ghost_id;
    }catch(_){return null;}
  }
  async function findOpponent(criteria){
    const base=apiBase();
    if(!enabled()||!base||!navigator.onLine)return null;
    const round=Math.round(bounded(criteria&&criteria.round,1,6));
    const chance=CONFIG.matchChance[round]||.30;
    const roll=Math.random();
    if(roll>chance)return null;
    const power=Math.round(bounded(criteria&&criteria.power,35,115));
    const params=new URLSearchParams({power:String(power),round:String(round),game_version:CONFIG.gameVersion,data_version:CONFIG.dataVersion});
    const seen=Array.isArray(criteria&&criteria.excluded)?criteria.excluded.slice(-16):[];
    if(seen.length)params.set("exclude",seen.join(","));
    try{
      const res=await fetch(base+"/v1/ghosts/match?"+params.toString(),{headers:{accept:"application/json"},cache:"no-store"});
      if(!res.ok)return null;
      const body=await res.json();const snapshot=body&&body.ghost;
      return validRemote(snapshot)?toOpponent(snapshot):null;
    }catch(_){return null;}
  }
  function ensureSetting(){
    const slot=document.getElementById("advancedGhostSettingSlot");if(!slot)return;
    let group=document.getElementById("ghostClubSetting");
    if(!group){
      group=document.createElement("div");group.id="ghostClubSetting";group.className="ghost-setting";
      const header=document.createElement("div");header.className="ghost-setting-header";header.id="ghostClubSettingHdr";group.appendChild(header);
      const text=document.createElement("div");text.className="ghost-setting-copy";text.id="ghostClubSettingCopy";group.appendChild(text);
      const button=document.createElement("button");button.type="button";button.id="ghostClubToggle";button.className="ghost-setting-toggle";button.onclick=()=>setEnabled(!enabled());group.appendChild(button);
    }
    if(group.parentElement!==slot)slot.appendChild(group);
    const on=enabled(),header=document.getElementById("ghostClubSettingHdr"),copy=document.getElementById("ghostClubSettingCopy"),button=document.getElementById("ghostClubToggle");
    if(header)header.textContent=tr("HAYALET KUL\u00dcPLERE KAR\u015eI OYNA","PLAY AGAINST GHOST CLUBS");
    if(copy)copy.textContent=tr("Ger\u00e7ek oyuncular\u0131n tamamlad\u0131\u011f\u0131 run'lardan olu\u015fturulan kul\u00fcpler rakip olabilir.","Clubs created from completed player runs may appear as opponents.");
    if(button){button.classList.toggle("on",on);button.setAttribute("aria-pressed",String(on));button.innerHTML=`<span aria-hidden="true">${ghostIcon()}</span><span>${on?tr("A\u00c7IK","ON"):tr("KAPALI","OFF")}</span>`;button.title=tr("Hayalet Kul\u00fcplere Kar\u015f\u0131 Oyna","Play Against Ghost Clubs");}
  }
  function ghostIcon(){return '<svg viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M5 17V8a5 5 0 0 1 10 0v9l-2-1.5L10 17l-3-1.5z"/><circle cx="8" cy="9" r=".7" fill="currentColor"/><circle cx="12" cy="9" r=".7" fill="currentColor"/></svg>';}
  window.addEventListener("online",()=>{flushQueue();});
  window.GhostClubs=Object.freeze({CONFIG,enabled,setEnabled,ensureSetting,beginRun,updateRun,recordCompletedRun,findOpponent,flushQueue,ghostIcon,normalizeCompletedRun,canMatch:enabled});
  setTimeout(()=>{ensureSetting();flushQueue();},0);
})();
