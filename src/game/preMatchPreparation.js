/* Two-point pre-match preparation system. Effects expire after one match. */
(function(root){
  "use strict";
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,Number(value)||0));
  const DRILLS=Object.freeze({
    finishing:{icon:"◎",tr:"Bitiricilik",en:"Finishing",kind:"attack"},
    defence:{icon:"▦",tr:"Savunma şekli",en:"Defensive shape",kind:"defence"},
    setpieces:{icon:"⌁",tr:"Duran top",en:"Set pieces",kind:"setpiece"},
    penalties:{icon:"●",tr:"Penaltı",en:"Penalties",kind:"penalty"},
    cohesion:{icon:"◇",tr:"Takım uyumu",en:"Team cohesion",kind:"chemistry"},
    recovery:{icon:"＋",tr:"Toparlanma",en:"Recovery",kind:"recovery"},
    analysis:{icon:"⌕",tr:"Rakip analizi",en:"Opponent analysis",kind:"analysis"}
  });
  let state={round:1,choices:[],lastPlan:[],fatigue:0,streaks:{},lastEffects:null,recoveryCarry:1,opponent:null};
  const tr=()=>root.LANG==="tr";
  function ensureRound(round){
    const value=Math.max(1,Number(round)||1);
    if(state.round!==value){state.round=value;state.choices=[];state.lastEffects=null;}
  }
  function spent(){return state.choices.reduce((sum,item)=>sum+(item.intensity==="intense"?2:1),0);}
  function playDrillSound(id){
    const sounds={
      finishing:()=>typeof root.sfxKick==="function"&&root.sfxKick(7),
      defence:()=>typeof root.sfxStamp==="function"&&root.sfxStamp(),
      setpieces:()=>typeof root.sfxWhistle==="function"&&root.sfxWhistle(),
      penalties:()=>typeof root.sfxTick==="function"&&root.sfxTick(),
      cohesion:()=>typeof root.sfxSeat==="function"&&root.sfxSeat(),
      recovery:()=>typeof root.sfxSave==="function"&&root.sfxSave(),
      analysis:()=>typeof root.sfxFormation==="function"&&root.sfxFormation()
    };
    try{if(sounds[id])sounds[id]();}catch(_){}
  }
  function select(id,intensity,round){
    ensureRound(round||state.round);
    if(!DRILLS[id])return false;
    const level=intensity==="intense"?"intense":"light",cost=level==="intense"?2:1;
    let next=state.choices.filter(item=>item.id!==id);
    if(next.reduce((sum,item)=>sum+(item.intensity==="intense"?2:1),0)+cost>2)next=[];
    next.push({id,intensity:level});state.choices=next;state.lastEffects=null;playDrillSound(id);render();return true;
  }
  function clear(id){state.choices=state.choices.filter(item=>item.id!==id);state.lastEffects=null;render();}
  function repeatFactor(id){const streak=Math.max(0,Number(state.streaks[id])||0);return streak===0?1:streak===1?.7:.45;}
  function relevance(id,round,opponent){
    const r=Math.max(1,Number(round)||1),opp=opponent&&typeof opponent==="object"?opponent:{};
    if(id==="analysis")return opp.style?4:1;
    if(id==="penalties")return r>=4?4:0;
    if(id==="recovery")return state.fatigue>=12?4:1;
    if(id==="cohesion")return 2;
    if(id==="defence")return Number(opp.power)>=78?3:2;
    if(id==="finishing")return Number(opp.power)<78?3:2;
    return 2;
  }
  function effects(round,opponent){
    ensureRound(round);
    if(state.lastEffects)return{...state.lastEffects};
    const result={power:0,attack:0,defence:0,setpiece:0,penalty:0,chemistry:0,opponent:0,injuryRisk:1,fatigueDelta:0,analysis:false};
    state.choices.forEach(choice=>{
      const intense=choice.intensity==="intense",base=(intense?2.5:1)*repeatFactor(choice.id)*(1-state.fatigue/120);
      if(choice.id==="finishing")result.attack+=base;
      if(choice.id==="defence")result.defence+=base;
      if(choice.id==="setpieces")result.setpiece+=base;
      if(choice.id==="penalties")result.penalty+=base*1.25;
      if(choice.id==="cohesion")result.chemistry+=base;
      if(choice.id==="recovery"){result.injuryRisk*=intense?.62:.78;result.fatigueDelta-=intense?12:7;}
      if(choice.id==="analysis"){
        result.analysis=true;result.opponent-=base*(opponent&&opponent.style?1.15:.75);
      }
      if(intense&&choice.id!=="recovery"){result.fatigueDelta+=10;result.injuryRisk*=1.06;}
    });
    result.power=clamp(result.power,0,4);
    state.lastEffects={...result};
    return result;
  }
  function completeMatch(round,players,slots){
    ensureRound(round);
    const picked=new Set(state.choices.map(item=>item.id));
    Object.keys(DRILLS).forEach(id=>{state.streaks[id]=picked.has(id)?Math.min(2,(state.streaks[id]||0)+1):0;});
    const used=effects(round,root.opponent);
    state.lastPlan=state.choices.map(item=>({...item}));
    state.fatigue=clamp(state.fatigue+used.fatigueDelta-4,0,60);
    state.recoveryCarry=used.injuryRisk;
    if(root.CopaChemistry&&typeof root.CopaChemistry.completeMatch==="function")root.CopaChemistry.completeMatch(players,slots);
    state.round=Math.max(1,Number(round)||1)+1;state.choices=[];state.lastEffects=null;
  }
  function injuryMultiplier(){return clamp(state.recoveryCarry||1,.55,1.25);}
  function penaltyBonus(round){return effects(round,root.opponent).penalty||0;}
  function snapshot(){return JSON.parse(JSON.stringify(state));}
  function restore(value){
    const src=value&&typeof value==="object"?value:{};
    state={round:Math.max(1,Number(src.round)||1),choices:Array.isArray(src.choices)?src.choices.filter(item=>item&&DRILLS[item.id]).slice(0,2):[],lastPlan:Array.isArray(src.lastPlan)?src.lastPlan.filter(item=>item&&DRILLS[item.id]).slice(0,2):[],fatigue:clamp(src.fatigue,0,60),streaks:src.streaks&&typeof src.streaks==="object"?{...src.streaks}:{},lastEffects:null,recoveryCarry:clamp(src.recoveryCarry||1,.55,1.25),opponent:src.opponent&&typeof src.opponent==="object"?{name:src.opponent.name||"",style:src.opponent.style||""}:null};
  }
  function reset(){restore(null);}
  function button(id,intensity,label){
    const active=state.choices.some(item=>item.id===id&&item.intensity===intensity);
    return`<button type="button" class="prep-level${active?" active":""}" data-prep-level="${intensity}" data-prep-drill="${id}" onclick="CopaPreparation.select('${id}','${intensity}')">${label}</button>`;
  }
  function orderedDrills(){
    return Object.keys(DRILLS).sort((a,b)=>relevance(b,state.round,state.opponent)-relevance(a,state.round,state.opponent));
  }
  function recommendedPlan(){
    const ordered=orderedDrills(),first=ordered[0],second=ordered.find(id=>id!==first&&relevance(id,state.round,state.opponent)>=2);
    return [first,second].filter(Boolean).slice(0,2).map(id=>({id,intensity:"light"}));
  }
  function applyRecommended(){
    state.choices=recommendedPlan();state.lastEffects=null;
    state.choices.forEach(item=>playDrillSound(item.id));
    render();
    return state.choices.map(item=>({...item}));
  }
  function priorPlanWarning(){
    if(!state.lastPlan.length)return "";
    const best=relevance(orderedDrills()[0],state.round,state.opponent);
    const prior=Math.max(...state.lastPlan.map(item=>relevance(item.id,state.round,state.opponent)));
    if(prior>=Math.max(2,best-1))return "";
    return tr()?"Önceki plan bu rakibe uygun görünmüyor. Önerilen plan güncel eşleşmeye göre hazırlandı.":"The previous plan does not fit this opponent. The recommendation is tailored to the current matchup.";
  }
  function riskLabel(value){
    if(value<=.78)return tr()?"Düşük":"Low";
    if(value>=1.06)return tr()?"Yüksek":"High";
    return tr()?"Dengeli":"Balanced";
  }
  function impactLabel(eff){
    const values=[
      [eff.attack,tr()?"Bitiriş":"Finishing"],
      [eff.defence,tr()?"Savunma":"Defence"],
      [eff.setpiece,tr()?"Duran top":"Set pieces"],
      [eff.penalty,tr()?"Penaltı":"Penalties"],
      [eff.chemistry,tr()?"Uyum":"Cohesion"]
    ].filter(item=>item[0]>0).sort((a,b)=>b[0]-a[0]).slice(0,2);
    if(eff.analysis)values.push([Math.abs(eff.opponent),tr()?"Rakip okuma":"Opponent read"]);
    return values.length?values.slice(0,2).map(item=>`${item[1]} +${item[0].toFixed(1)}`).join(" · "):(tr()?"Toparlanma odaklı":"Recovery focused");
  }
  function render(){
    const panel=document.querySelector(".prep-modal");if(!panel)return;
    const remaining=clamp(2-spent(),0,2),eff=effects(state.round,state.opponent);
    const status=panel.querySelector("[data-prep-status]");
    const nextFatigue=clamp(state.fatigue+eff.fatigueDelta,0,60);
    if(status)status.innerHTML=`<div class="prep-preview-head"><b>${tr()?"SONUÇ ÖNİZLEMESİ":"OUTCOME PREVIEW"}</b><span>${tr()?remaining+" hazırlık puanı kaldı":remaining+" preparation point"+(remaining===1?"":"s")+" left"}</span></div><div class="prep-preview-row is-match"><small>${tr()?"MAÇ ETKİSİ":"MATCH EFFECT"}</small><strong>${impactLabel(eff)}</strong></div><div class="prep-preview-row is-fatigue"><small>${tr()?"YORGUNLUK":"FATIGUE"}</small><strong>${state.fatigue} → ${nextFatigue}</strong></div><div class="prep-preview-row is-risk"><small>${tr()?"SAKATLIK RİSKİ":"INJURY RISK"}</small><strong>${riskLabel(eff.injuryRisk)} · ×${eff.injuryRisk.toFixed(2)}</strong></div>`;
    const points=panel.querySelector("[data-prep-points]");
    if(points)points.textContent=String(remaining);
    const resource=panel.querySelector("[data-prep-resource]");
    if(resource){
      resource.dataset.pointsLeft=String(remaining);
      resource.querySelectorAll("[data-prep-point]").forEach((point,index)=>point.classList.toggle("is-available",index<remaining));
      const resourceStatus=resource.querySelector("[data-prep-resource-status]");
      if(resourceStatus)resourceStatus.textContent=tr()?(remaining?`${remaining} puan kullanılabilir`:"Puanlar tükendi"):(remaining?`${remaining} point${remaining===1?"":"s"} available`:"Points spent");
    }
    panel.querySelectorAll("[data-drill]").forEach(card=>{
      const id=card.dataset.drill,chosen=state.choices.find(item=>item.id===id);
      card.classList.toggle("active",!!chosen);
      card.querySelectorAll(".prep-level").forEach(button=>button.classList.toggle("active",!!chosen&&button.dataset.prepLevel===chosen.intensity));
    });
  }
  function openHelp(){
    const title=tr()?"ANTRENMAN NASIL ÇALIŞIR?":"HOW TRAINING WORKS";
    const items=tr()?[
      ["Plan kapasitesi","Her maç öncesi sınırlı bir çalışma kapasiten vardır. İki hafif çalışma veya tek yoğun çalışma seçebilirsin.","2 HAFİF · 1 YOĞUN"],
      ["Rakibe göre seçim","Rakip gücü, oyun anlayışı ve turun aşaması bazı çalışmaların o maç için daha anlamlı olmasını sağlar.","RAKİP · STİL · TUR"],
      ["Yoğunluk","Yoğun çalışma daha belirgin etki yaratabilir. Buna karşılık oyuncuların yükünü ve yorgunluğunu daha fazla artırır.","DAHA GÜÇLÜ ETKİ · DAHA FAZLA YÜK"],
      ["Tekrar ve toparlanma","Aynı çalışmayı sürekli seçmek zamanla daha az verimli olur. Toparlanma, biriken yorgunluğu ve sakatlık riskini yönetmeye yardım eder.","TEKRAR AZALTIR · TOPARLANMA DENGELER"],
      ["Yorgunluk ve sakatlık","Yorgunluk yükseldikçe antrenman verimi düşer. Yoğun çalışma sakatlık riskini artırabilir. Toparlanma iki değeri de aşağı çeker.","YÜKÜ DENGEDE TUT"],
      ["Etki alanları","Çalışmalar hücum, savunma, duran top, penaltı hazırlığı, takım uyumu veya rakip analizine odaklanır. Sonuç kadron, rakip ve maç koşullarıyla birlikte değerlendirilir.","6 ETKİ ALANI"]
    ]:[
      ["Plan capacity","Before each match you have limited training capacity: choose two light drills or one intense drill.","2 LIGHT · 1 INTENSE"],
      ["Match the opponent","Opponent strength, style and tournament stage make some drills more relevant for that match.","OPPONENT · STYLE · STAGE"],
      ["Intensity","Intense work can create a stronger effect, while also placing more load and fatigue on the squad.","STRONGER EFFECT · MORE LOAD"],
      ["Repetition and recovery","Repeating the same drill becomes less effective over time. Recovery helps manage accumulated fatigue and injury risk.","REPETITION FADES · RECOVERY BALANCES"],
      ["Fatigue and injury","Training becomes less effective as fatigue rises. Intense work can increase injury risk. Recovery lowers both values.","BALANCE THE LOAD"],
      ["Areas of impact","Drills focus on attack, defence, set pieces, penalties, chemistry or opposition analysis. Their outcome is considered together with your squad, opponent and match conditions.","6 IMPACT AREAS"]
    ];
    root.showModal(`<div class="prep-help-modal"><header><span>${tr()?"OYUN REHBERİ":"GAME GUIDE"}</span><h3>${title}</h3><p>${tr()?"Doğru plan kısa vadeli etki ile takım sağlığını dengeler.":"A good plan balances immediate impact with squad health."}</p></header><div>${items.map((item,index)=>`<article class="prep-help-kind-${index+1}"><i>0${index+1}</i><p><b>${item[0]}</b><em>${item[2]}</em><small>${item[1]}</small></p></article>`).join("")}</div><button class="btn btn-primary" type="button" onclick="closeModal()">${tr()?"ANLADIM":"GOT IT"}</button></div>`,{dismissOnOverlay:true,label:title});
  }
  function open(round,opponent){
    ensureRound(round);
    state.opponent=opponent&&typeof opponent==="object"?{name:opponent.name||"",style:opponent.style||""}:null;
    state.lastEffects=null;
    const ordered=orderedDrills();
    const cards=ordered.map(id=>{
      const drill=DRILLS[id],streak=state.streaks[id]||0;
      const score=relevance(id,state.round,state.opponent),recommended=id===ordered[0]||score>=4;
      const badge=recommended?`<mark>${tr()?"BU MAÇ ÖNERİLİR":"RECOMMENDED"}</mark>`:score===0?`<mark class="is-muted">${tr()?"DÜŞÜK ÖNCELİK":"LOW PRIORITY"}</mark>`:"";
      const repeatInfo=streak?`<small>${tr()?`Tekrar etkisi ×${repeatFactor(id).toFixed(2)}`:`Repeat effect ×${repeatFactor(id).toFixed(2)}`}</small>`:"";
      return`<article class="prep-drill prep-kind-${drill.kind}${recommended?" is-recommended":""}" data-drill="${id}"><div class="prep-drill-icon">${drill.icon}</div><div><b>${tr()?drill.tr:drill.en}</b>${badge}${repeatInfo}</div><div class="prep-levels">${button(id,"light",tr()?"HAFİF · 1":"LIGHT · 1")}${button(id,"intense",tr()?"YOĞUN · 2":"INTENSE · 2")}</div></article>`;
    }).join("");
    const warning=priorPlanWarning();
    root.showModal(`<div class="prep-modal"><header><span>${tr()?"MAÇ ÖNCESİ":"PRE-MATCH"}</span><div class="prep-title-row"><div><h3>${tr()?"Hazırlık tahtası":"Preparation board"}</h3><p>${opponent&&opponent.name?opponent.name:""}</p></div><button type="button" class="prep-help" onclick="CopaPreparation.openHelp()" aria-label="${tr()?"Antrenman mekaniğini açıkla":"Explain training mechanics"}">?</button></div></header><div class="prep-resource-strip" data-prep-resource aria-label="${tr()?"Hazırlık puanı":"Preparation points"}"><div class="prep-resource-main"><small>${tr()?"HAZIRLIK PUANI":"PREPARATION POINTS"}</small><strong><b data-prep-points>2</b><span>/2</span></strong></div><div class="prep-resource-dots" aria-hidden="true"><i data-prep-point></i><i data-prep-point></i></div><em data-prep-resource-status>${tr()?"2 puan kullanılabilir":"2 points available"}</em></div><button type="button" class="prep-recommended-action" onclick="CopaPreparation.applyRecommended()"><span class="prep-recommend-copy"><small>${tr()?"ÖNERİLEN PLAN":"RECOMMENDED PLAN"}</small><b>${tr()?"Planı uygula":"Apply plan"}</b><em>${tr()?"Rakibe göre hazırlanır":"Matched to opponent"}</em></span><i aria-hidden="true">→</i></button>${warning?`<div class="prep-plan-warning" role="status"><b>${tr()?"PLAN UYARISI":"PLAN WARNING"}</b><span>${warning}</span></div>`:""}<div class="prep-status" data-prep-status></div><div class="prep-grid">${cards}</div><div class="bact"><button class="btn btn-primary" onclick="closeModal();renderHub()">${tr()?"PLANI UYGULA":"APPLY PLAN"}</button></div></div>`,{dismissOnOverlay:true,label:tr()?"Maç öncesi hazırlık":"Pre-match preparation",sheetClass:"sheet-preparation"});
    render();
  }
  root.CopaPreparation={DRILLS,open,openHelp,render,select,clear,applyRecommended,recommendedPlan,priorPlanWarning,effects,completeMatch,injuryMultiplier,penaltyBonus,relevance,snapshot,restore,reset,spent};
})(window);
