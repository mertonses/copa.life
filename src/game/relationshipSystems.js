(function(root){
  "use strict";

  const fresh=()=>({version:4,bonds:{},seenPlayers:[],pending:null,eventCount:0,matchPower:0,matchNotice:"",matchStory:"",lastDecision:null,promises:[],journal:{},groupMood:{captain:0,youth:0,stars:0,local:0},captainPromptedRound:0,chairAgenda:"",chairAgendaChairId:"",chairAgendaUsed:false,startToken:0});
  let state=fresh();
  const cleanName=value=>String(value||"").replace(/[<>\r\n]/g,"").trim().slice(0,72);
  const keyFor=player=>cleanName(player&&player.name).toLocaleLowerCase("tr-TR")+"|"+String(player&&player.pos||"");
  const personality=player=>{
    if(player&&player.trait==="sorunlu")return "volatile";
    if(player&&player.age>=31)return "veteran";
    if(player&&((player.ov||0)>=82||player.trait==="wonderkid"))return "ambitious";
    return "professional";
  };
  const logDecision=(key,label,reason,round)=>{
    if(!key)return;
    const rows=Array.isArray(state.journal[key])?state.journal[key]:[];
    rows.unshift({label:cleanName(label),reason:cleanName(reason),round:Math.max(1,Number(round)||1)});
    state.journal[key]=rows.slice(0,2);
  };
  const groupsFor=(player,context)=>{
    const groups=[],captain=context&&context.captain;
    if(captain&&keyFor(captain)===keyFor(player))groups.push("captain");
    if(Number(player&&player.age)>0&&Number(player.age)<=23)groups.push("youth");
    if(Number(player&&player.ov)>=82)groups.push("stars");
    const selected=String(root.selectedCountry||"TR").toUpperCase(),nation=String(player&&player.natG||player&&player.nat||"").toUpperCase();
    if(nation&&nation===selected)groups.push("local");
    return groups;
  };
  const groupLabel=(id,tr)=>({captain:tr?"Kaptan çevresi":"Captain group",youth:tr?"Gençler":"Youth",stars:tr?"Yıldızlar":"Stars",local:tr?"Yerli çekirdek":"Local core"})[id]||id;
  function nudgeGroups(player,amount,context){
    groupsFor(player,context).forEach(id=>{state.groupMood[id]=Math.max(-2,Math.min(2,(Number(state.groupMood[id])||0)+amount));});
  }
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
    state.pending=source.pending&&typeof source.pending==="object"?{...source.pending,groups:Array.isArray(source.pending.groups)?source.pending.groups.filter(id=>["captain","youth","stars","local"].includes(id)).slice(0,4):[]}:null;
    state.eventCount=Math.max(0,Math.min(2,Number(source.eventCount)||0));
    state.matchPower=Math.max(-1,Math.min(1,Number(source.matchPower)||0));
    state.matchNotice=cleanName(source.matchNotice);
    state.matchStory=cleanName(source.matchStory);
    const savedDecision=source.lastDecision&&typeof source.lastDecision==="object"?source.lastDecision:null;
    state.lastDecision=savedDecision?{player:cleanName(savedDecision.player),eventType:["confidence","permission"].includes(savedDecision.eventType)?savedDecision.eventType:"confidence",choice:["support","bench","compromise","grant","deny"].includes(savedDecision.choice)?savedDecision.choice:"support",power:Math.max(-1,Math.min(1,Number(savedDecision.power)||0)),bondBefore:Math.max(0,Math.min(7,Number(savedDecision.bondBefore)||0)),bondAfter:Math.max(0,Math.min(7,Number(savedDecision.bondAfter)||0)),round:Math.max(1,Number(savedDecision.round)||1),story:cleanName(savedDecision.story),groups:Array.isArray(savedDecision.groups)?savedDecision.groups.filter(id=>["captain","youth","stars","local"].includes(id)).slice(0,4):[],groupDelta:Math.max(-.25,Math.min(.25,Number(savedDecision.groupDelta)||0))}:null;
    state.promises=Array.isArray(source.promises)?source.promises.filter(item=>item&&item.key&&["start","captain","rest"].includes(item.type)).slice(-8).map(item=>({...item,key:cleanName(item.key),name:cleanName(item.name),dueRound:Math.max(1,Number(item.dueRound)||1),status:["active","fulfilled","broken"].includes(item.status)?item.status:"active"})):[];
    state.journal=source.journal&&typeof source.journal==="object"?Object.fromEntries(Object.entries(source.journal).map(([key,rows])=>[cleanName(key),Array.isArray(rows)?rows.slice(0,2).map(row=>({label:cleanName(row.label),reason:cleanName(row.reason),round:Math.max(1,Number(row.round)||1)})):[]])):{};
    state.groupMood={captain:0,youth:0,stars:0,local:0,...(source.groupMood&&typeof source.groupMood==="object"?source.groupMood:{})};
    Object.keys(state.groupMood).forEach(id=>{state.groupMood[id]=Math.max(-2,Math.min(2,Number(state.groupMood[id])||0));});
    state.captainPromptedRound=Math.max(0,Number(source.captainPromptedRound)||0);
    state.chairAgenda=["finance","squad","governance","different"].includes(source.chairAgenda)?source.chairAgenda:"";
    state.chairAgendaChairId=cleanName(source.chairAgendaChairId).toLowerCase();
    state.chairAgendaUsed=!!source.chairAgendaUsed;
    state.startToken=Math.max(0,Math.min(1,Number(source.startToken)||0));
  }
  function evaluatePromises(players,round,context){
    const lineup=(Array.isArray(players)?players:[]).filter(Boolean),all=lineup.concat(Array.isArray(context&&context.bench)?context.bench.filter(Boolean):[]),captain=context&&context.captain;
    state.promises.filter(item=>item.status==="active"&&item.dueRound<=Number(round)).forEach(item=>{
      const player=all.find(candidate=>keyFor(candidate)===item.key);
      if(player&&(player.injured||player.suspended)){item.dueRound=Number(round)+1;logDecision(item.key,root.LANG==="tr"?"Söz ertelendi":"Promise deferred",root.LANG==="tr"?"Sakatlık veya ceza istisnası":"Injury or suspension exception",round);return;}
      const inLineup=lineup.some(candidate=>keyFor(candidate)===item.key);
      const kept=item.type==="start"?inLineup:item.type==="rest"?!inLineup:!!captain&&keyFor(captain)===item.key;
      item.status=kept?"fulfilled":"broken";
      state.bonds[item.key]=Math.max(0,Math.min(7,(state.bonds[item.key]||0)+(kept?1:-2)));
      nudgeGroups(player||{name:item.name},kept?.25:-.5,{captain});
      const tr=root.LANG==="tr",typeLabel=item.type==="start"?(tr?"ilk 11 sözü":"starting promise"):item.type==="captain"?(tr?"kaptanlık sözü":"captaincy promise"):(tr?"dinlenme sözü":"rest promise");
      logDecision(item.key,kept?(tr?"Söz tutuldu":"Promise kept"):(tr?"Söz bozuldu":"Promise broken"),typeLabel,round);
      state.matchStory=kept?(item.type==="captain"?(tr?`${item.name} kaptanlık sözünün karşılığını sahada verdi.`:`${item.name} repaid the captaincy promise on the pitch.`):(tr?`${item.name} verilen sözün tutulmasına karşılık verdi.`:`${item.name} responded to a promise kept.`)):(tr?`${item.name}, tutulmayan ${typeLabel} nedeniyle takımdan uzaklaştı.`:`${item.name} withdrew after a broken ${typeLabel}.`);
    });
  }
  function completeMatch(players,round,rng,context){
    state.matchPower=0;state.matchNotice="";state.matchStory="";state.lastDecision=null;
    const list=(Array.isArray(players)?players:[]).filter(Boolean);
    evaluatePromises(list,round,context||{});
    list.forEach(player=>{const key=keyFor(player);if(key)state.bonds[key]=Math.min(7,(state.bonds[key]||0)+1);});
    if(state.pending||state.eventCount>=2||Number(round)>=7)return;
    const bench=Array.isArray(context&&context.bench)?context.bench.filter(player=>player&&!player.injured&&!player.suspended):[];
    const eligible=list.concat(bench).filter(player=>{const key=keyFor(player);return (state.bonds[key]||0)>=2&&!state.seenPlayers.includes(key)&&!state.promises.some(item=>item.key===key&&item.status==="active");});
    if(!eligible.length)return;
    const random=typeof rng==="function"?rng:Math.random;
    if(random()>.50)return;
    const player=eligible[Math.floor(random()*eligible.length)],key=keyFor(player),bond=state.bonds[key]||0,isBench=bench.includes(player),promiseRoll=random()<.62;
    if(promiseRoll){
      const type=isBench?"start":random()<.42?"captain":"rest";
      state.pending={eventKind:"promise",key,name:cleanName(player.name),pos:String(player.pos||""),personality:personality(player),bond,type,round:Number(round)+1,groups:groupsFor(player,{captain:context&&context.captain})};
    }else{
      const type=personality(player)==="volatile"?"permission":random()<.5?"confidence":"permission";
      state.pending={eventKind:"relationship",key,name:cleanName(player.name),pos:String(player.pos||""),personality:personality(player),bond,type,round:Number(round)+1,groups:groupsFor(player,{captain:context&&context.captain})};
    }
    state.seenPlayers.push(key);state.eventCount++;
  }
  function effectFor(choice){
    const event=state.pending;if(!event)return null;
    const random=typeof root.rand==="function"?root.rand:Math.random;
    const bondBefore=Math.max(0,Math.min(7,state.bonds[event.key]||0));
    let power=0,relationship=0,groupDelta=0,story="";
    if(event.type==="permission"){
      if(choice==="grant"){power=event.personality==="ambitious"?-1:0;relationship=1;groupDelta=.18;story=`${event.name}, kendisine alan açılmasının karşılığını sahada vermeye hazır.`;}
      else if(choice==="deny"){power=event.personality==="volatile"?(random()<.75?-1:0):(random()<.25?-1:0);relationship=-1;groupDelta=-.18;story=`${event.name}, takım kararının arkasında durduğunu gördü ama bunu kolay unutmayacak.`;}
      else{power=0;relationship=1;groupDelta=.18;story=`${event.name}, bulunan orta yol sayesinde kulüple bağını korudu.`;}
    }else{
      if(choice==="support"){power=event.personality==="professional"||event.personality==="veteran"?1:(random()<.55?1:0);relationship=1;groupDelta=.25;story=`${event.name}, özel konuşmanın ardından rolüne yeniden inandı.`;}
      else if(choice==="bench"){power=event.personality==="ambitious"?-1:0;relationship=event.personality==="ambitious"?-1:0;groupDelta=event.personality==="ambitious"?-.25:0;story=event.personality==="ambitious"?`${event.name}, rol kararını kişisel aldı; soyunma odasında hava gerildi.`:`${event.name}, rolünün sınırlarını net biçimde öğrendi.`;}
      else{power=0;relationship=1;groupDelta=.25;story=`${event.name}, bulunan orta yol sayesinde rolüne ve kulübe yeniden bağlandı.`;}
    }
    if(choice==="compromise"&&event.bond<4&&state.startToken>0)state.startToken--;
    state.bonds[event.key]=Math.max(0,Math.min(7,(state.bonds[event.key]||0)+relationship));
    const bondAfter=Math.max(0,Math.min(7,state.bonds[event.key]||0));
    (Array.isArray(event.groups)?event.groups:[]).forEach(id=>{state.groupMood[id]=Math.max(-2,Math.min(2,(Number(state.groupMood[id])||0)+groupDelta));});
    state.matchPower=Math.max(-1,Math.min(1,power));
    const positive=state.matchPower>0?"+1":state.matchPower<0?"−1":"±0";
    const currentRound=Math.max(1,Number(root.round)||Math.max(1,Number(event.round||1)-1));
    const label=choice==="support"?(root.LANG==="tr"?"Özel konuşma yapıldı":"Private talk held"):choice==="bench"?(root.LANG==="tr"?"Rol netleştirildi":"Role clarified"):choice==="compromise"?(root.LANG==="tr"?"Orta yol bulundu":"Compromise found"):choice==="grant"?(root.LANG==="tr"?"İzin verildi":"Leave granted"):(root.LANG==="tr"?"Takım öne kondu":"Team first");
    logDecision(event.key,label,story,currentRound);
    state.matchStory=story;
    state.lastDecision={player:event.name,eventType:event.type,choice,power:state.matchPower,bondBefore,bondAfter,round:currentRound,story,groups:Array.isArray(event.groups)?event.groups.slice(0,4):[],groupDelta};
    state.matchNotice=`${event.name}: ${positive} güç · ${root.LANG==="tr"?"Bağ":"Bond"} ${bondBefore}→${bondAfter}`;
    if(root.CopaAnalytics&&typeof root.CopaAnalytics.track==="function")try{root.CopaAnalytics.track("relationship_decision",{event_kind:event.type,choice,personality:event.personality,power:state.matchPower,bond_before:bondBefore,bond_after:bondAfter,group_delta:groupDelta});}catch(_){ }
    state.pending=null;
    return {power:state.matchPower,relationship,notice:state.matchNotice};
  }
  function canCompromise(event){return !!event&&(event.bond>=4||state.startToken>0);}
  function showPending(){
    const event=state.pending;if(!event||typeof root.showModal!=="function")return false;
    const modal=document.getElementById("modal");
    if(modal&&!modal.classList.contains("hidden"))return false;
    const tr=root.LANG==="tr";
    if(event.eventKind==="promise"){
      const promiseLabel=event.type==="start"?(tr?"Sonraki maç ilk 11":"Start next match"):event.type==="captain"?(tr?"Sonraki maç kaptan":"Captain next match"):(tr?"Sonraki maç dinlenme":"Rest next match");
      const request=event.type==="start"?(tr?`${event.name}, sonraki maça ilk 11'de başlamak istiyor.`:`${event.name} wants to start the next match.`):event.type==="captain"?(tr?`${event.name}, sonraki maçta kaptanlık bekliyor.`:`${event.name} expects the armband next match.`):(tr?`${event.name}, sonraki maçta dinlendirilmek istiyor.`:`${event.name} asks to be rested next match.`);
      root.showModal(`<div class="relationship-modal promise-modal"><header><span>${tr?"OYUNCU SÖZÜ":"PLAYER PROMISE"}</span><b>${tr?"BAĞ":"BOND"} ${event.bond}/7</b></header><h3>${promiseLabel}</h3><p>${request}</p><div class="relationship-choices"><button type="button" onclick="CopaRelationships.resolvePromise(true)"><b>${tr?"SÖZ VER":"MAKE PROMISE"}</b><small>${tr?"Tutulursa bağ güçlenir. Bozulursa oyuncu bunu unutmaz.":"Keeping it builds trust. Breaking it will be remembered."}</small></button><button type="button" onclick="CopaRelationships.resolvePromise(false)"><b>${tr?"SÖZ VERME":"DECLINE"}</b><small>${tr?"Açık konuşursun. İlişki küçük ölçüde etkilenir.":"You are direct. The relationship takes a small hit."}</small></button></div></div>`,{dismissOnOverlay:false,label:tr?"Oyuncu sözü":"Player promise"});
      return true;
    }
    const permission=event.type==="permission",third=canCompromise(event);
    const title=permission?(tr?"ÖZEL İZİN TALEBİ":"PERSONAL LEAVE REQUEST"):(tr?"OYUNCU GÜVEN KRİZİ":"PLAYER CONFIDENCE CRISIS");
    const confidenceCopy={professional:tr?`${event.name} rolünde iyi iş çıkardığını biliyor ama senden net bir güven işareti bekliyor.`:`${event.name} knows the role, but needs a clear sign of confidence from you.`,veteran:tr?`${event.name} deneyiminin karşılığını ve soyunma odasındaki yerini sorguluyor.`:`${event.name} is questioning whether experience still earns a place in the dressing room.`,ambitious:tr?`${event.name} daha büyük bir rol istiyor. Yanlış cevap, hırsı takımın aleyhine çevirebilir.`:`${event.name} wants a bigger role. The wrong answer can turn ambition against the team.`,volatile:tr?`${event.name} rol tartışmasını kişisel bir meseleye dönüştürmeye hazır.`:`${event.name} is ready to turn a role dispute into a personal matter.`};
    const copy=permission?(tr?`${event.name} kişisel bir konu için izin istiyor. Kararın bu maçtaki hazırlığı ve ilişkinizi etkileyebilir.`:`${event.name} asks for personal leave. Your response may affect this match and the relationship.`):(confidenceCopy[event.personality]||confidenceCopy.professional);
    if(!permission){
      const personalityLabel={professional:tr?"Profesyonel":"Professional",veteran:tr?"Veteran":"Veteran",ambitious:tr?"Hırslı":"Ambitious",volatile:tr?"Sorunlu":"Volatile"}[event.personality]||event.personality;
      const shield=`<svg viewBox="0 0 48 48" width="38" height="38" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M24 5l15 6v11c0 9-6.5 16-15 21C15.5 38 9 31 9 22V11l15-6z"/><path d="M17 24c2.4-3 5-4.5 7-4.5s4.6 1.5 7 4.5c-2.4 3-5 4.5-7 4.5s-4.6-1.5-7-4.5z"/><circle cx="24" cy="24" r="2.2" fill="currentColor" stroke="none"/></svg>`;
      const options=[
        ["support",tr?"ÖZEL KONUŞ":"PRIVATE TALK",tr?"Oyuncuyu rolüne yeniden bağla. Takımın bu maçta destek alabilir.":"Reconnect the player with the role. The team may gain support this match.","is-primary is-support",tr?"GÜVENİ ONAR":"REBUILD TRUST"],
        ["bench",tr?"ROLÜ NETLEŞTİR":"CLARIFY ROLE",tr?"Sorumluluğu ve sınırı açıkça koy. Hırslı oyuncu bunu kırgınlık olarak taşıyabilir.":"Set a clear role and boundary. An ambitious player may carry the resentment.","is-boundary",tr?"SINIR KOY":"SET A BOUNDARY"],
      ];
      if(third)options.push(["compromise",tr?"ORTA YOL BUL":"FIND A COMPROMISE",event.bond>=4?(tr?"Güçlü bağ sayesinde dengeli ve risksiz kapanış.":"A strong bond gives you a balanced, safe close."):(tr?"Müze başlangıç jetonunu kullanarak bağı koru.":"Use the museum run-start token to protect the bond."),"is-compromise",tr?"BAĞI KORU":"PROTECT THE BOND"]);
      const buttons=options.map(([id,label,note,kind,context])=>`<button type="button" data-choice="${id}" class="confidence-choice ${kind}" onclick="CopaRelationships.resolve('${id}')"><span class="confidence-choice-context"><span class="confidence-choice-icon" aria-hidden="true"></span><span>${context}</span></span><span class="confidence-choice-main"><b>${label}</b><i aria-hidden="true">→</i></span><small>${note}</small></button>`).join("");
      root.showModal(`<div class="relationship-modal confidence-modal" data-relationship-type="confidence"><div class="confidence-modal-top"><span class="relationship-kicker">${tr?"OYUNCU İLİŞKİSİ":"PLAYER RELATIONSHIP"}</span><b>${tr?"BAĞ":"BOND"} ${event.bond}/7</b></div><div class="confidence-hero"><div class="confidence-icon">${shield}</div><div><span class="confidence-eyebrow">${tr?"SOYUNMA ODASI · TUR "+Math.max(1,Number(event.round||1)-1):"DRESSING ROOM · ROUND "+Math.max(1,Number(event.round||1)-1)}</span><h3>${title}</h3><p>${copy}</p></div></div><div class="confidence-player"><span class="confidence-player-mark">${cleanName(event.name).slice(0,2).toLocaleUpperCase("tr-TR")}</span><span><b>${cleanName(event.name)}</b><small>${cleanName(event.pos)} · ${personalityLabel}</small></span><em>${tr?"ROL GÜVENİ":"ROLE CONFIDENCE"}</em></div><div class="confidence-divider"><span>${tr?"KARAR NOKTASI":"DECISION POINT"}</span><i></i></div><div class="relationship-choices confidence-choices">${buttons}</div></div>`,{dismissOnOverlay:false,label:title});
      return true;
    }
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
  function resolvePromise(accept){
    const event=state.pending;if(!event||event.eventKind!=="promise")return;
    const tr=root.LANG==="tr";
    if(accept){
      state.promises.push({key:event.key,name:event.name,type:event.type,dueRound:event.round,status:"active",createdRound:event.round-1});
      logDecision(event.key,tr?"Söz verildi":"Promise made",event.type==="start"?(tr?"Sonraki maç ilk 11":"Start next match"):event.type==="captain"?(tr?"Sonraki maç kaptanlık":"Captain next match"):(tr?"Sonraki maç dinlenme":"Rest next match"),event.round-1);
      state.matchNotice=tr?`${event.name} için söz kaydedildi.`:`Promise recorded for ${event.name}.`;
    }else{
      state.bonds[event.key]=Math.max(0,(state.bonds[event.key]||0)-1);
      logDecision(event.key,tr?"Talep reddedildi":"Request declined",tr?"Açık rol görüşmesi":"Direct role talk",event.round-1);
      state.matchNotice=tr?`${event.name} kararı not etti.`:`${event.name} noted the decision.`;
    }
    state.pending=null;
    if(typeof root.closeModal==="function")root.closeModal();
    if(typeof root.showToast==="function")root.showToast(state.matchNotice);
    if(typeof root.renderHub==="function")root.renderHub();
    if(typeof root._saveState==="function")root._saveState();
  }
  function activePromise(player,type,round){
    const key=keyFor(player);
    return state.promises.find(item=>item.key===key&&item.type===type&&item.status==="active"&&item.dueRound===Number(round));
  }
  function maybePromptCaptain(){
    const currentRound=Math.max(1,Number(root.round)||1),promise=state.promises.find(item=>item.type==="captain"&&item.status==="active"&&item.dueRound===currentRound);
    if(!promise||state.captainPromptedRound===currentRound||typeof root.pickCaptain!=="function")return false;
    state.captainPromptedRound=currentRound;
    setTimeout(()=>{const modal=document.getElementById("modal");if(!modal||modal.classList.contains("hidden"))root.pickCaptain();},500);
    return true;
  }
  function canEnter(player){
    const key=keyFor(player),broken=[...state.promises].reverse().find(item=>item.key===key&&item.type==="start"&&item.status==="broken");
    if(!broken)return{allowed:true};
    const tr=root.LANG==="tr";
    return{allowed:false,message:tr?`${broken.name}, ilk 11 sözünü tutmadığını hatırlatıyor ve oyuna girmek istemiyor.`:`${broken.name} refuses to enter and reminds you of the broken starting promise.`};
  }
  function profileMarkup(player){
    const key=keyFor(player),rows=state.journal[key]||[],bond=Math.max(0,Math.min(7,state.bonds[key]||0)),groups=groupsFor(player,{captain:typeof root._currentCaptainPlayer==="function"?root._currentCaptainPlayer():null}),tr=root.LANG==="tr";
    if(!rows.length&&bond===0&&!groups.length)return"";
    const reason=rows[0]&&rows[0].reason||(tr?"Henüz belirgin bir neden yok":"No defining reason yet");
    return `<section class="player-relationship-journal"><header><span>${tr?"İLİŞKİ GÜNLÜĞÜ":"RELATIONSHIP JOURNAL"}</span><b>${tr?"BAĞ":"BOND"} ${bond}/7</b></header><p>${tr?"Mevcut bağ nedeni":"Current bond reason"} · <strong>${cleanName(reason)}</strong></p>${groups.length?`<div>${groups.map(id=>`<i>${groupLabel(id,tr)}</i>`).join("")}</div>`:""}${rows.length?`<ol>${rows.slice(0,2).map(row=>`<li><span>${row.round}. ${tr?"tur":"round"}</span><b>${row.label}</b><small>${row.reason}</small></li>`).join("")}</ol>`:""}</section>`;
  }
  function matchStory(){return state.matchStory||"";}
  function promisedCaptainKey(round){const item=state.promises.find(p=>p.type==="captain"&&p.status==="active"&&p.dueRound===Number(round));return item&&item.key||"";}
  function isPromisedCaptain(player,round){return !!player&&keyFor(player)===promisedCaptainKey(round);}
  function groupSummary(){
    const tr=root.LANG==="tr";
    return Object.keys(state.groupMood).map(id=>({id,label:groupLabel(id,tr),mood:state.groupMood[id]}));
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
  function matchModifier(){const groupEffect=Object.values(state.groupMood).reduce((sum,value)=>sum+(Number(value)||0),0)*.08;return Math.max(-1,Math.min(1,(state.matchPower||0)+groupEffect));}
  function summary(){return {matchPower:matchModifier(),notice:state.matchNotice,story:state.matchStory,lastDecision:state.lastDecision?{...state.lastDecision,groups:Array.isArray(state.lastDecision.groups)?state.lastDecision.groups.slice():[]}:null,pending:state.pending?{...state.pending}:null,promises:state.promises.map(item=>({...item})),groups:groupSummary(),startToken:state.startToken};}

  const baseQueuePending=queuePending;
  queuePending=function(delay){maybePromptCaptain();return baseQueuePending(delay);};
  root.CopaRelationships=Object.freeze({reset,snapshot,restore,completeMatch,queuePending,showPending,resolve,resolvePromise,activePromise,isPromisedCaptain,promisedCaptainKey,canEnter,profileMarkup,matchStory,groupSummary,chairRank,chairMarkup,openChairAgenda,setChairAgenda,filterChairOutcomes,recordChairDecision,matchModifier,summary});
})(window);
