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
  let state={round:1,choices:[],fatigue:0,streaks:{},lastEffects:null,recoveryCarry:1,opponent:null};
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
      if(choice.id==="finishing"){result.attack+=base;result.power+=base;}
      if(choice.id==="defence"){result.defence+=base;result.power+=base;}
      if(choice.id==="setpieces"){result.setpiece+=base;result.power+=base*.7;}
      if(choice.id==="penalties"){result.penalty+=base*1.25;result.power+=base*.35;}
      if(choice.id==="cohesion"){result.chemistry+=base;result.power+=base*.5;}
      if(choice.id==="recovery"){result.injuryRisk*=intense?.62:.78;result.fatigueDelta-=intense?12:7;}
      if(choice.id==="analysis"){
        result.analysis=true;result.opponent-=base*(opponent&&opponent.style?1.15:.75);result.power+=base*.35;
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
    state={round:Math.max(1,Number(src.round)||1),choices:Array.isArray(src.choices)?src.choices.filter(item=>item&&DRILLS[item.id]).slice(0,2):[],fatigue:clamp(src.fatigue,0,60),streaks:src.streaks&&typeof src.streaks==="object"?{...src.streaks}:{},lastEffects:null,recoveryCarry:clamp(src.recoveryCarry||1,.55,1.25),opponent:src.opponent&&typeof src.opponent==="object"?{name:src.opponent.name||"",style:src.opponent.style||""}:null};
  }
  function reset(){restore(null);}
  function button(id,intensity,label){
    const active=state.choices.some(item=>item.id===id&&item.intensity===intensity);
    return`<button type="button" class="prep-level${active?" active":""}" data-prep-level="${intensity}" data-prep-drill="${id}" onclick="CopaPreparation.select('${id}','${intensity}')">${label}</button>`;
  }
  function render(){
    const panel=document.querySelector(".prep-modal");if(!panel)return;
    const remaining=2-spent(),eff=effects(state.round,state.opponent);
    const status=panel.querySelector("[data-prep-status]");
    const analysis=eff.analysis&&state.opponent&&state.opponent.style?` · ${tr()?"Rakip stili":"Opponent style"}: ${state.opponent.style}`:"";
    if(status)status.innerHTML=`<b>${tr()?remaining+" antrenman puanı":remaining+" training points"}</b><span>${tr()?"Güç":"Power"} +${eff.power.toFixed(1)} · ${tr()?"Risk":"Risk"} ×${eff.injuryRisk.toFixed(2)} · ${tr()?"Yorgunluk":"Fatigue"} ${state.fatigue}${eff.fatigueDelta>=0?"+":""}${eff.fatigueDelta}${analysis}</span>`;
    panel.querySelectorAll("[data-drill]").forEach(card=>{
      const id=card.dataset.drill,chosen=state.choices.find(item=>item.id===id);
      card.classList.toggle("active",!!chosen);
      card.querySelectorAll(".prep-level").forEach(button=>button.classList.toggle("active",!!chosen&&button.dataset.prepLevel===chosen.intensity));
    });
  }
  function open(round,opponent){
    ensureRound(round);
    state.opponent=opponent&&typeof opponent==="object"?{name:opponent.name||"",style:opponent.style||""}:null;
    const ordered=Object.keys(DRILLS).sort((a,b)=>relevance(b,state.round,state.opponent)-relevance(a,state.round,state.opponent));
    const cards=ordered.map(id=>{
      const drill=DRILLS[id],streak=state.streaks[id]||0;
      const score=relevance(id,state.round,state.opponent),recommended=id===ordered[0]||score>=4;
      const badge=recommended?`<mark>${tr()?"BU MAÇ ÖNERİLİR":"RECOMMENDED"}</mark>`:score===0?`<mark class="is-muted">${tr()?"DÜŞÜK ÖNCELİK":"LOW PRIORITY"}</mark>`:"";
      return`<article class="prep-drill prep-kind-${drill.kind}${recommended?" is-recommended":""}" data-drill="${id}"><div class="prep-drill-icon">${drill.icon}</div><div><b>${tr()?drill.tr:drill.en}</b>${badge}<small>${streak?`${tr()?"Tekrar etkisi":"Repeat effect"} ×${repeatFactor(id).toFixed(2)}`:(tr()?"Tam etki":"Full effect")}</small></div><div class="prep-levels">${button(id,"light",tr()?"HAFİF · 1":"LIGHT · 1")}${button(id,"intense",tr()?"YOĞUN · 2":"INTENSE · 2")}</div></article>`;
    }).join("");
    root.showModal(`<div class="prep-modal"><header><span>${tr()?"MAÇ ÖNCESİ":"PRE-MATCH"}</span><div class="prep-title-row"><div><h3>${tr()?"Hazırlık tahtası":"Preparation board"}</h3><p>${opponent&&opponent.name?opponent.name:""}</p></div><button type="button" class="prep-help" aria-expanded="false" onclick="const note=this.closest('.prep-modal').querySelector('.prep-help-note');note.hidden=!note.hidden;this.setAttribute('aria-expanded',String(!note.hidden))">?</button></div><aside class="prep-help-note" hidden>${tr()?"Toplam 2 puanın var. İki farklı hafif çalışma veya tek bir yoğun çalışma seçebilirsin. Dolu bir plan varken başka seçeneğe dokunursan plan yeni seçime geçer.":"You have 2 points: choose two light drills or one intense drill. Selecting another drill when the plan is full replaces the plan."}</aside></header><div class="prep-status" data-prep-status></div><div class="prep-grid">${cards}</div><div class="bact"><button class="btn btn-primary" onclick="closeModal();renderHub()">${tr()?"PLANI UYGULA":"APPLY PLAN"}</button></div></div>`,{dismissOnOverlay:true,label:tr()?"Maç öncesi hazırlık":"Pre-match preparation",sheetClass:"sheet-preparation"});
    render();
  }
  root.CopaPreparation={DRILLS,open,render,select,clear,effects,completeMatch,injuryMultiplier,penaltyBonus,relevance,snapshot,restore,reset,spent};
})(window);
