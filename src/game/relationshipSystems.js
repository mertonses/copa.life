(function(root){
  "use strict";

  const fresh=()=>({version:2,bonds:{},seenPlayers:[],pending:null,eventCount:0,matchPower:0,matchNotice:"",chairAgenda:"",chairAgendaChairId:"",chairAgendaUsed:false,startToken:0});
  let state=fresh();
  const cleanName=value=>String(value||"").replace(/[<>\r\n]/g,"").trim().slice(0,72);
  const keyFor=player=>cleanName(player&&player.name).toLocaleLowerCase("tr-TR")+"|"+String(player&&player.pos||"");
  const personality=player=>{
    if(player&&player.trait==="sorunlu")return "volatile";
    if(player&&player.age>=31)return "veteran";
    if(player&&((player.ov||0)>=82||player.trait==="wonderkid"))return "ambitious";
    return "professional";
  };
  const chairCount=id=>{
    const meta=root.CopaMeta&&root.CopaMeta.getState&&root.CopaMeta.getState();
    return Math.max(0,Number(meta&&meta.mastery&&meta.mastery.chairmen&&meta.mastery.chairmen[id])||0);
  };
  const chairHistory=id=>root.CopaMeta&&typeof root.CopaMeta.chairHistory==="function"?root.CopaMeta.chairHistory(id):{runs:0,decisionCount:0,lastOutcome:"",positive:0,negative:0};
  const chairRank=id=>{
    const count=chairCount(id),history=chairHistory(id);
    if(count>=10||history.runs>=4||history.decisionCount>=7)return 3;
    if(count>=5||history.runs>=2||history.decisionCount>=3)return 2;
    if(count>=2||history.runs>=1||history.decisionCount>=1)return 1;
    return 0;
  };
  function reset(options){
    state=fresh();
    state.startToken=Math.max(0,Math.min(1,Number(options&&options.startToken)||0));
  }
  function snapshot(){return JSON.parse(JSON.stringify(state));}
  function restore(value){
    const source=value&&typeof value==="object"?value:{};
    state=fresh();
    state.bonds=source.bonds&&typeof source.bonds==="object"?Object.fromEntries(Object.entries(source.bonds).map(([key,value])=>[String(key).slice(0,90),Math.max(0,Math.min(7,Number(value)||0))])):{};
    state.seenPlayers=Array.isArray(source.seenPlayers)?source.seenPlayers.map(String).slice(0,20):[];
    state.pending=source.pending&&typeof source.pending==="object"?source.pending:null;
    state.eventCount=Math.max(0,Math.min(2,Number(source.eventCount)||0));
    state.matchPower=Math.max(-1,Math.min(1,Number(source.matchPower)||0));
    state.matchNotice=cleanName(source.matchNotice);
    state.chairAgenda=["finance","squad","governance","different"].includes(source.chairAgenda)?source.chairAgenda:"";
    state.chairAgendaChairId=cleanName(source.chairAgendaChairId).toLowerCase();
    state.chairAgendaUsed=!!source.chairAgendaUsed;
    state.startToken=Math.max(0,Math.min(1,Number(source.startToken)||0));
  }
  function completeMatch(players,round,rng){
    state.matchPower=0;state.matchNotice="";
    const list=(Array.isArray(players)?players:[]).filter(Boolean);
    list.forEach(player=>{const key=keyFor(player);if(key)state.bonds[key]=Math.min(7,(state.bonds[key]||0)+1);});
    if(state.pending||state.eventCount>=2||Number(round)>=7)return;
    const eligible=list.filter(player=>{const key=keyFor(player);return (state.bonds[key]||0)>=2&&!state.seenPlayers.includes(key);});
    if(!eligible.length)return;
    const random=typeof rng==="function"?rng:Math.random;
    if(random()>.48)return;
    const player=eligible[Math.floor(random()*eligible.length)],key=keyFor(player),bond=state.bonds[key]||0,type=personality(player)==="volatile"?"permission":random()<.5?"confidence":"permission";
    state.pending={key,name:cleanName(player.name),pos:String(player.pos||""),personality:personality(player),bond,type,round:Number(round)+1};
    state.seenPlayers.push(key);state.eventCount++;
  }
  function effectFor(choice){
    const event=state.pending;if(!event)return null;
    const random=typeof root.rand==="function"?root.rand:Math.random;
    let power=0,relationship=0;
    if(event.type==="permission"){
      if(choice==="grant"){power=event.personality==="ambitious"?-1:0;relationship=1;}
      else if(choice==="deny"){power=event.personality==="volatile"?(random()<.75?-1:0):(random()<.25?-1:0);relationship=-1;}
      else{power=0;relationship=1;}
    }else{
      if(choice==="support"){power=event.personality==="professional"||event.personality==="veteran"?1:(random()<.55?1:0);relationship=1;}
      else if(choice==="bench"){power=0;relationship=event.personality==="ambitious"?-1:0;}
      else{power=0;relationship=1;}
    }
    if(choice==="compromise"&&event.bond<4&&state.startToken>0)state.startToken--;
    state.bonds[event.key]=Math.max(0,Math.min(7,(state.bonds[event.key]||0)+relationship));
    state.matchPower=Math.max(-1,Math.min(1,power));
    const positive=state.matchPower>0?"+1":state.matchPower<0?"−1":"±0";
    state.matchNotice=`${event.name}: ${positive} güç`;
    state.pending=null;
    return {power:state.matchPower,relationship,notice:state.matchNotice};
  }
  function canCompromise(event){return !!event&&(event.bond>=4||state.startToken>0);}
  function showPending(){
    const event=state.pending;if(!event||typeof root.showModal!=="function")return false;
    const modal=document.getElementById("modal");
    if(modal&&!modal.classList.contains("hidden"))return false;
    const tr=root.LANG==="tr",permission=event.type==="permission",third=canCompromise(event);
    const title=permission?(tr?"ÖZEL İZİN TALEBİ":"PERSONAL LEAVE REQUEST"):(tr?"GÜVEN KRİZİ":"CONFIDENCE CRISIS");
    const copy=permission?(tr?`${event.name} kişisel bir konu için izin istiyor. Kararın bu maçtaki hazırlığı ve ilişkinizi etkileyebilir.`:`${event.name} asks for personal leave. Your response may affect this match and the relationship.`):(tr?`${event.name} rolünden emin değil. Oyuncunun karakterine göre yaklaşımın farklı sonuç verebilir.`:`${event.name} is unsure about the role. Personality can change the outcome.`);
    const choices=permission?[
      ["grant",tr?"İZİN VER":"GRANT LEAVE",tr?"İlişki güçlenir. Bu maç küçük hazırlık riski olabilir.":"Builds trust. May create a small preparation cost."],
      ["deny",tr?"TAKIMI ÖNE KOY":"PUT TEAM FIRST",tr?"Kadro korunur. Tepki oyuncu karakterine bağlıdır.":"Keeps the squad intact. Reaction depends on personality."]
    ]:[
      ["support",tr?"ÖZEL KONUŞ":"PRIVATE TALK",tr?"Karakter uyarsa bu maç +1 güç.":"If the personality responds, gain +1 this match."],
      ["bench",tr?"ROLÜ NETLEŞTİR":"CLARIFY ROLE",tr?"Güç riski yok. Hırslı oyuncu kırılabilir.":"No power risk. An ambitious player may resent it."]
    ];
    if(third)choices.push(["compromise",tr?"ORTA YOL BUL":"FIND A COMPROMISE",event.bond>=4?(tr?"Güçlü ilişki sayesinde risksiz çözüm.":"A strong relationship unlocks a safe solution."):(tr?"Müze başlangıç jetonunu kullan.":"Use the museum run-start token.")]);
    const buttons=choices.map(([id,label,note])=>`<button type="button" onclick="CopaRelationships.resolve('${id}')"><b>${label}</b><small>${note}</small></button>`).join("");
    root.showModal(`<div class="relationship-modal"><header><span>${tr?"OYUNCU İLİŞKİSİ":"PLAYER RELATIONSHIP"}</span><b>${tr?"BAĞ":"BOND"} ${event.bond}/7</b></header><h3>${title}</h3><p>${copy}</p><div class="relationship-choices">${buttons}</div></div>`,{dismissOnOverlay:false,label:title});
    return true;
  }
  function queuePending(delay){
    if(!state.pending)return false;
    const attempt=count=>{
      if(!state.pending||count>12)return;
      const phase=root.CopaRunState&&root.CopaRunState.phase;
      const chairmanBusy=root.pendingChairmanEvent&&root.pendingChairmanEvent.status==="pending";
      if((!phase||phase==="hub")&&!chairmanBusy&&showPending())return;
      setTimeout(()=>attempt(count+1),650);
    };
    setTimeout(()=>attempt(0),Math.max(0,Number(delay)||0));
    return true;
  }
  function resolve(choice){
    const result=effectFor(choice);if(!result)return;
    if(typeof root.closeModal==="function")root.closeModal();
    if(typeof root.showToast==="function")root.showToast(result.notice);
    if(typeof root.renderHub==="function")root.renderHub();
    if(typeof root._saveState==="function")root._saveState();
  }
  function chairMarkup(chairId){
    const rank=chairRank(chairId),tr=root.LANG==="tr",history=chairHistory(chairId);
    if(rank<1)return "";
    const memory=history.decisionCount?`${history.decisionCount} ${tr?"eski karar":"past decisions"}`:`${history.runs} ${tr?"ortak tur":"shared runs"}`;
    if(state.chairAgendaUsed)return `<div class="chair-history-note"><small>${tr?"BAŞKAN GEÇMİŞİ":"CHAIRMAN HISTORY"}</small><b>${memory}</b><span>${tr?"Bu tur pazarlık kullanıldı.":"Negotiation used this run."}</span></div>`;
    const label=state.chairAgenda?(tr?"Gündem hazır":"Agenda ready"):(tr?"Geçmişi masaya koy":"Use shared history");
    return `<div class="chair-history-note"><small>${tr?"BAŞKAN GEÇMİŞİ":"CHAIRMAN HISTORY"}</small><b>${memory}</b><span>${history.runs>1?(tr?"Seni ve önceki kararlarını hatırlıyor.":"Remembers you and your earlier decisions."):(tr?"Önceki görüşmenizi hatırlıyor.":"Remembers your previous meeting.")}</span></div><button class="btn btn-ghost chair-relationship-btn" onclick="CopaRelationships.openChairAgenda('${chairId}')">${label} · ${rank}/3</button>`;
  }
  function openChairAgenda(chairId){
    if(chairRank(chairId)<1||state.chairAgendaUsed)return;
    const tr=root.LANG==="tr",history=chairHistory(chairId),reunion=history.runs>1;
    const option=(id,title,note)=>`<button type="button" onclick="CopaRelationships.setChairAgenda('${id}')"><b>${title}</b><small>${note}</small></button>`;
    state.chairAgendaChairId=chairId;
    const remembered=history.lastOutcome?option("different",tr?"AYNI KARARI TEKRARLAMA":"DO NOT REPEAT THE LAST DECISION",tr?"Son kararı havuzdan çıkarır. İyi veya kötü sonuç yine mümkündür.":"Removes the exact last outcome. A good or bad result is still possible."):"";
    root.showModal(`<div class="relationship-modal chair-agenda-modal"><header><span>${tr?"BAŞKAN GEÇMİŞİ":"CHAIRMAN HISTORY"}</span><b>${tr?"SEVİYE":"TIER"} ${chairRank(chairId)}/3</b></header><h3>${reunion?(tr?"Yine aynı masadasınız":"You are back at the same table"):(tr?"Önceki görüşmeyi masaya koy":"Use your shared history")}</h3><p>${tr?"Geçmiş yeni pazarlık seçenekleri açar. Sonucu garanti etmez ve turda bir kez kullanılabilir.":"History unlocks new negotiation options. It never guarantees the result and is usable once per run."}</p><div class="relationship-choices">${remembered}${option("finance",tr?"FİNANS":"FINANCE",tr?"Gelir, kesinti ve borç sonuçları.":"Income, cuts and debt outcomes.")}${option("squad",tr?"KADRO":"SQUAD",tr?"Transfer, altyapı ve takım sonuçları.":"Transfer, academy and squad outcomes.")}${option("governance",tr?"YÖNETİM":"GOVERNANCE",tr?"Güven, federasyon ve yönetim sonuçları.":"Trust, federation and board outcomes.")}</div></div>`,{dismissOnOverlay:true,label:tr?"Başkan geçmişi":"Chairman history"});
  }
  function setChairAgenda(id){
    if(!["finance","squad","governance","different"].includes(id)||state.chairAgendaUsed)return;
    state.chairAgenda=id;if(typeof root.closeModal==="function")root.closeModal();
    if(typeof root.openPresident==="function")root.openPresident();
    if(typeof root._saveState==="function")root._saveState();
  }
  function filterChairOutcomes(pool){
    if(!state.chairAgenda||state.chairAgendaUsed)return pool;
    const groups={
      finance:new Set(["generous","sponsor","sale","cut","yacht","tax","ffp","investigation"]),
      squad:new Set(["star","bargain","academy","youth","nephew","fans"]),
      governance:new Set(["federation","management","fans","tax","cut"])
    };
    const history=chairHistory(state.chairAgendaChairId||(root.chairman&&root.chairman.id)||"");
    const filtered=state.chairAgenda==="different"?pool.filter(item=>item.id!==history.lastOutcome):pool.filter(item=>groups[state.chairAgenda].has(item.id));
    state.chairAgendaUsed=true;state.chairAgenda="";state.chairAgendaChairId="";
    return filtered.length?filtered:pool;
  }
  function recordChairDecision(chairId,outcomeId,positive){
    if(root.CopaMeta&&typeof root.CopaMeta.recordChairDecision==="function")return root.CopaMeta.recordChairDecision(chairId,outcomeId,positive);
    if(root.CopaLazy&&typeof root.CopaLazy.ensureMetaProgression==="function")root.CopaLazy.ensureMetaProgression().then(api=>api.recordChairDecision(chairId,outcomeId,positive)).catch(()=>{});
    return false;
  }
  function matchModifier(){return Math.max(-1,Math.min(1,state.matchPower||0));}
  function summary(){return {matchPower:matchModifier(),notice:state.matchNotice,pending:state.pending?{...state.pending}:null,startToken:state.startToken};}

  root.CopaRelationships=Object.freeze({reset,snapshot,restore,completeMatch,queuePending,showPending,resolve,chairRank,chairMarkup,openChairAgenda,setChairAgenda,filterChairOutcomes,recordChairDecision,matchModifier,summary});
})(window);
