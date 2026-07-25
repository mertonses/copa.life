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
  function select(id,intensity,round){
    ensureRound(round||state.round);
    if(!DRILLS[id])return false;
    const level=intensity==="intense"?"intense":"light",cost=level==="intense"?2:1;
    const next=state.choices.filter(item=>item.id!==id);
    if(next.reduce((sum,item)=>sum+(item.intensity==="intense"?2:1),0)+cost>2)return false;
    next.push({id,intensity:level});state.choices=next;state.lastEffects=null;render();return true;
  }
  function clear(id){state.choices=state.choices.filter(item=>item.id!==id);state.lastEffects=null;render();}
  function repeatFactor(id){const streak=Math.max(0,Number(state.streaks[id])||0);return streak===0?1:streak===1?.7:.45;}
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
    return`<button type="button" class="prep-level${active?" active":""}" data-prep-level="${intensity}" onclick="CopaPreparation.select('${id}','${intensity}')">${label}</button>`;
  }
  function render(){
    const panel=document.querySelector(".prep-modal");if(!panel)return;
    const remaining=2-spent(),eff=effects(state.round,state.opponent);
    const status=panel.querySelector("[data-prep-status]");
    const analysis=eff.analysis&&state.opponent&&state.opponent.style?` · ${tr()?"Rakip stili":"Opponent style"}: ${state.opponent.style}`:"";
    if(status)status.innerHTML=`<b>${tr()?remaining+" hazırlık puanı":remaining+" preparation points"}</b><span>${tr()?"Güç":"Power"} +${eff.power.toFixed(1)} · ${tr()?"Risk":"Risk"} ×${eff.injuryRisk.toFixed(2)} · ${tr()?"Yorgunluk":"Fatigue"} ${state.fatigue}${eff.fatigueDelta>=0?"+":""}${eff.fatigueDelta}${analysis}</span>`;
    panel.querySelectorAll("[data-drill]").forEach(card=>{
      const id=card.dataset.drill,chosen=state.choices.find(item=>item.id===id);
      card.classList.toggle("active",!!chosen);
      card.querySelectorAll(".prep-level").forEach(button=>button.classList.toggle("active",!!chosen&&button.textContent===(chosen.intensity==="intense"?(tr()?"YOĞUN · 2":"INTENSE · 2"):(tr()?"HAFİF · 1":"LIGHT · 1"))));
    });
  }
  function open(round,opponent){
    ensureRound(round);
    state.opponent=opponent&&typeof opponent==="object"?{name:opponent.name||"",style:opponent.style||""}:null;
    const cards=Object.keys(DRILLS).map(id=>{
      const drill=DRILLS[id],streak=state.streaks[id]||0;
      return`<article class="prep-drill" data-drill="${id}"><div class="prep-drill-icon">${drill.icon}</div><div><b>${tr()?drill.tr:drill.en}</b><small>${streak?`${tr()?"Tekrar etkisi":"Repeat effect"} ×${repeatFactor(id).toFixed(2)}`:(tr()?"Tam etki":"Full effect")}</small></div><div class="prep-levels">${button(id,"light",tr()?"HAFİF · 1":"LIGHT · 1")}${button(id,"intense",tr()?"YOĞUN · 2":"INTENSE · 2")}</div></article>`;
    }).join("");
    root.showModal(`<div class="prep-modal"><header><span>${tr()?"MAÇ ÖNCESİ":"PRE-MATCH"}</span><h3>${tr()?"Hazırlık tahtası":"Preparation board"}</h3><p>${opponent&&opponent.name?opponent.name:""}</p></header><div class="prep-status" data-prep-status></div><div class="prep-grid">${cards}</div><div class="bact"><button class="btn btn-primary" onclick="closeModal();renderHub()">${tr()?"PLANI UYGULA":"APPLY PLAN"}</button></div></div>`,{dismissOnOverlay:true,label:tr()?"Maç öncesi hazırlık":"Pre-match preparation"});
    render();
  }
  root.CopaPreparation={DRILLS,open,render,select,clear,effects,completeMatch,injuryMultiplier,penaltyBonus,snapshot,restore,reset,spent};
})(window);
