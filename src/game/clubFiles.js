(function(root){
  "use strict";

  const DEFINITIONS=Object.freeze({
    debt:{
      icon:"€",tr:"Temiz Defter",en:"Clean Ledger",
      trGoal:"Üç maçın her birine borç limitinin en az €6M üzerinde çık.",
      enGoal:"Start all three matches at least €6M above the debt limit.",
      trReward:"Hikâye · Temiz Defter",enReward:"Story · Clean Ledger"
    },
    youth:{
      icon:"◇",tr:"Genç Kimlik",en:"Youth Identity",
      trGoal:"Sonraki üç maçın en az ikisinde 24 yaş veya altı bir oyuncuyu ilk 11'de başlat.",
      enGoal:"Start an under-24 player in at least two of the next three matches.",
      trReward:"Arma · Akademi İzi",enReward:"Crest · Academy Thread"
    },
    tactics:{
      icon:"⌁",tr:"Taktik Çeşitlilik",en:"Tactical Variety",
      trGoal:"Üç maçın en az ikisinde antrenman kullan ve toplamda iki farklı çalışma seç.",
      enGoal:"Train before at least two of three matches and use two different drills.",
      trReward:"Forma · Üç Plan",enReward:"Kit · Three Plans"
    }
  });
  const fresh=()=>({version:1,selected:"",checkpoints:[],completed:false,success:false,rewardClaimed:false});
  let state=fresh();
  const tr=()=>root.LANG==="tr";
  const copy=value=>JSON.parse(JSON.stringify(value));
  const valid=id=>Object.hasOwn(DEFINITIONS,id);
  const drillIds=preparation=>{
    const choices=preparation&&Array.isArray(preparation.choices)?preparation.choices:[];
    return Array.from(new Set(choices.map(item=>String(item&&item.id||"")).filter(Boolean)));
  };
  function reset(){state=fresh();}
  function snapshot(){return copy(state);}
  function restore(value){
    const source=value&&typeof value==="object"?value:{};
    state=fresh();
    state.selected=valid(source.selected)?source.selected:"";
    state.checkpoints=Array.isArray(source.checkpoints)?source.checkpoints.filter(item=>item&&Number(item.round)>=1&&Number(item.round)<=7).slice(0,3).map(item=>({
      round:Number(item.round),pass:!!item.pass,detail:String(item.detail||"").slice(0,80),
      drills:Array.isArray(item.drills)?item.drills.map(String).slice(0,2):[]
    })):[];
    state.completed=!!source.completed;state.success=!!source.success;state.rewardClaimed=!!source.rewardClaimed;
    if(state.completed&&state.success&&!state.rewardClaimed)setTimeout(claimReward,0);
  }
  function select(id){
    if(!valid(id)||state.selected)return false;
    state.selected=id;
    if(typeof root.closeModal==="function")root.closeModal();
    if(typeof root.showToast==="function")root.showToast(tr()?`${DEFINITIONS[id].tr} dosyası açıldı.`:`${DEFINITIONS[id].en} file opened.`);
    if(typeof root.renderHub==="function")root.renderHub();
    if(typeof root._saveState==="function")root._saveState();
    return true;
  }
  function selectionMarkup(){
    return `<div class="club-file-select"><header><span>${tr()?"KULÜP DOSYALARI":"CLUB FILES"}</span><h3>${tr()?"Üç maçlık bir kulüp hedefi seç":"Choose a three-match club objective"}</h3><p>${tr()?"Dosyalar kadro gücü vermez. Kalıcı hikâye, kozmetik ve koleksiyon tamamlanınca tek bir kontrollü jeton açar.":"Files grant no squad power. They unlock permanent story, cosmetics and one bounded token for completing the set."}</p></header><div class="club-file-options">${Object.entries(DEFINITIONS).map(([id,item])=>`<button type="button" onclick="CopaClubFiles.select('${id}')"><i>${item.icon}</i><span><b>${tr()?item.tr:item.en}</b><small>${tr()?item.trGoal:item.enGoal}</small><em>${tr()?item.trReward:item.enReward}</em></span><strong>→</strong></button>`).join("")}</div></div>`;
  }
  function selectionSurfaceReady(){
    const hub=document.getElementById("hub");
    if(!hub||hub.classList.contains("hidden"))return false;
    if(document.body.classList.contains("arena-active"))return false;
    const route=String(hub.dataset.mobileRoute||"match");
    return route==="match";
  }
  function showSelection(explicit){
    if(state.selected||Number(root.round)!==1||typeof root.showModal!=="function")return false;
    if(!explicit&&!selectionSurfaceReady())return false;
    const modal=document.getElementById("modal");
    if(modal&&!modal.classList.contains("hidden"))return false;
    root.showModal(selectionMarkup(),{dismissOnOverlay:false,label:tr()?"Kulüp dosyaları":"Club files"});
    return true;
  }
  function queueSelection(delay){
    return false;
  }
  function checkpointFor(context){
    const round=Math.max(1,Number(context&&context.round)||1);
    if(state.selected==="debt"){
      const buffer=(Number(context.cash)||0)-(Number(context.limit)||0),pass=buffer>=6;
      return {round,pass,detail:`${buffer>=0?"+":""}€${Math.round(buffer)}M`,drills:[]};
    }
    if(state.selected==="youth"){
      const lineup=Array.isArray(context&&context.lineup)?context.lineup.filter(Boolean):[];
      const player=lineup.find(item=>Number(item.age)>0&&Number(item.age)<=24);
      return {round,pass:!!player,detail:player?String(player.name||"U24").slice(0,40):(tr()?"U24 yok":"No U24"),drills:[]};
    }
    const drills=drillIds(context&&context.preparation);
    return {round,pass:drills.length>0,detail:drills.length?drills.join(" · "):(tr()?"Antrenman yok":"No training"),drills};
  }
  function evaluate(){
    if(state.checkpoints.length<3)return false;
    if(state.selected==="debt")return state.checkpoints.every(item=>item.pass);
    if(state.selected==="youth")return state.checkpoints.filter(item=>item.pass).length>=2;
    const used=state.checkpoints.filter(item=>item.pass).length,unique=new Set(state.checkpoints.flatMap(item=>item.drills));
    return used>=2&&unique.size>=2;
  }
  function rewardText(result){
    const labels={story:tr()?"Hikâye açıldı":"Story unlocked",crest:tr()?"Arma açıldı":"Crest unlocked",kit:tr()?"Forma açıldı":"Kit unlocked",token:tr()?"Başlangıç jetonu açıldı":"Run-start token unlocked"};
    return (result&&result.rewards||[]).map(item=>labels[item.kind]||item.kind).join(" · ");
  }
  function claimReward(){
    if(state.rewardClaimed||!state.success)return null;
    const finish=api=>{
      if(!api||typeof api.completeClubFile!=="function")return null;
      const result=api.completeClubFile(state.selected);
      if(result&&result.ok){
        state.rewardClaimed=true;
        const message=rewardText(result)||(tr()?"Dosya kalıcı arşive işlendi.":"File added to the permanent archive.");
        if(typeof root.showToast==="function")root.showToast(message);
        if(typeof root.pushFeed==="function")root.pushFeed(`◇ ${message}`,"buy");
        if(typeof root._saveState==="function")root._saveState();
      }
      return result;
    };
    if(root.CopaMeta)return finish(root.CopaMeta);
    if(root.CopaLazy&&typeof root.CopaLazy.ensureMetaProgression==="function")root.CopaLazy.ensureMetaProgression().then(finish).catch(()=>{});
    return null;
  }
  function completeRound(context){
    if(!state.selected||state.completed||state.checkpoints.length>=3)return false;
    const round=Math.max(1,Number(context&&context.round)||1);
    if(state.checkpoints.some(item=>item.round===round))return false;
    state.checkpoints.push(checkpointFor(context));
    if(state.checkpoints.length===3){
      state.completed=true;state.success=evaluate();
      if(state.success)claimReward();
      else if(typeof root.showToast==="function")root.showToast(tr()?"Kulüp dosyası tamamlanamadı. Yeni turda tekrar deneyebilirsin.":"Club file missed. You can try again in a new run.");
    }
    if(typeof root._saveState==="function")root._saveState();
    return true;
  }
  function panelMarkup(){
    if(!state.selected){
      return `<button type="button" class="club-file-panel club-file-panel-pending" onclick="CopaClubFiles.showSelection(true)"><span><small>${tr()?"KULÜP DOSYASI":"CLUB FILE"}</small><b>${tr()?"Üç maçlık hedefini seç":"Choose a three-match objective"}</b></span><em>${tr()?"SEÇ":"CHOOSE"} →</em></button>`;
    }
    const item=DEFINITIONS[state.selected],done=state.checkpoints.length;
    const dots=[0,1,2].map(index=>{const point=state.checkpoints[index];return `<i class="${point?(point.pass?"is-pass":"is-miss"):""}">${point?(point.pass?"✓":"×"):index+1}</i>`;}).join("");
    const status=state.completed?(state.success?(tr()?"TAMAMLANDI":"COMPLETED"):(tr()?"KAÇIRILDI":"MISSED")):`${done}/3`;
    return `<section class="club-file-panel ${state.completed?(state.success?"is-complete":"is-failed"):""}"><div class="club-file-panel-head"><span>${tr()?"KULÜP DOSYASI":"CLUB FILE"}</span><em>${status}</em></div><div class="club-file-panel-body"><i>${item.icon}</i><div><b>${tr()?item.tr:item.en}</b><p>${tr()?item.trGoal:item.enGoal}</p><small>${tr()?item.trReward:item.enReward} · ${tr()?"Güç vermez":"No power"}</small></div></div><div class="club-file-checks">${dots}</div></section>`;
  }
  function summary(){return copy(state);}
  const api={DEFINITIONS,reset,snapshot,restore,select,showSelection,queueSelection,completeRound,panelMarkup,summary};
  root.CopaClubFiles=Object.freeze(api);
})(window);
