/* Tag-based card synergy. The card rules stay data-driven and DOM-free. */
(function(root,factory){
  const api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;
  if(root)root.CopaCardSynergy=Object.freeze(api);
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  "use strict";

  const TAGS=Object.freeze({
    taraftar:["fans","management"],genc:["youth","press"],ch_momentum:["fans","risk"],
    kontra:["transition","wing"],buyuk_mac:["star","fans"],yildiz:["star","management"],
    otobus:["deep_defence","economy"],kaleci_kalesi:["deep_defence","veteran"],
    mac_sozu:["management","risk"],anadolu:["local_core","economy"],
    altyapi_plani:["youth","economy"],tecrubeli_omurga:["veteran","deep_defence"],
    yerli_blok:["local_core","deep_defence"],kaptanin_karari:["veteran","management"],
    kanat_akini:["wing","transition"],cift_forvet:["press","star"],derbi:["fans","press"],
    final_provasi:["set_piece","veteran"],son_dans:["veteran","star"],
    taksit_transfer:["economy","management"],son_kredi:["economy","risk"],
    kara_borsa:["economy","risk"],sahte_evrak:["management","risk"],
    deplasman_kafilesi:["fans","transition"],kumarbaz:["economy","risk"],
    gecici_prim:["star","management"],kisa_kamp:["press","risk"],doping:["press","risk"],
    kriz:["management","risk"],kurban_belli:["management","deep_defence"],
    primler_yatinca:["economy","fans"],vur_igneyi:["veteran","risk"],
    bu_adam:["star","management"],gec_gec:["possession","youth"],
    nasip_kismet:["risk","fans"],yildiz_krizi:["star","risk"],kasiga_para:["economy","star"],
    sogukkanli_penaltici:["set_piece","veteran"]
  });
  const COMPLEMENTS=Object.freeze([
    ["press","youth"],["transition","wing"],["deep_defence","veteran"],
    ["local_core","possession"],["set_piece","veteran"],["fans","star"],
    ["economy","management"]
  ]);
  const CONFLICTS=Object.freeze([["deep_defence","press"],["possession","transition"]]);
  const LABELS={
    tr:{press:"Pres",transition:"Geçiş",possession:"Topa sahip olma",deep_defence:"Derin savunma",wing:"Kanat",set_piece:"Duran top",youth:"Gençlik",veteran:"Veteran",local_core:"Yerli çekirdek",star:"Yıldız",economy:"Ekonomi",fans:"Taraftar",management:"Yönetim",risk:"Risk"},
    en:{press:"Press",transition:"Transition",possession:"Possession",deep_defence:"Deep defence",wing:"Wing",set_piece:"Set piece",youth:"Youth",veteran:"Veteran",local_core:"Local core",star:"Star",economy:"Economy",fans:"Supporters",management:"Management",risk:"Risk"}
  };

  function tagsFor(card){return (TAGS[String(card||"")]||["management"]).slice(0,2);}
  function hasPair(counts,pair){return (counts[pair[0]]||0)>0&&(counts[pair[1]]||0)>0;}
  function calculate(cards){
    const ids=Array.isArray(cards)?cards.filter(Boolean):[],counts={};
    ids.forEach(id=>tagsFor(id).forEach(tag=>{counts[tag]=(counts[tag]||0)+1;}));
    let resonance=0,complement=0,friction=0;
    const reasons=[];
    Object.keys(counts).sort().forEach(tag=>{
      const count=counts[tag],points=count>=3?2:count>=2?1:0;
      if(points){resonance+=points;reasons.push({type:"resonance",tag,count,points});}
    });
    COMPLEMENTS.forEach(pair=>{if(hasPair(counts,pair)){complement++;reasons.push({type:"complement",tags:pair,points:1});}});
    CONFLICTS.forEach(pair=>{if(hasPair(counts,pair)){friction++;reasons.push({type:"friction",tags:pair,points:-1});}});
    const raw=resonance+Math.min(2,complement)-friction;
    return{power:Math.max(-2,Math.min(5,raw)),raw,resonance,complement:Math.min(2,complement),friction,counts,reasons,tags:ids.map(id=>({id,tags:tagsFor(id)}))};
  }
  function preview(cards,candidate){
    const before=calculate(cards),after=calculate([...(Array.isArray(cards)?cards:[]),candidate]);
    const candidateTags=tagsFor(candidate),delta=after.power-before.power;
    const next=candidateTags.map(tag=>`${LABELS.tr[tag]||tag} ${after.counts[tag]||1}/3`).join(" · ");
    return{before:before.power,after:after.power,delta,tags:candidateTags,tr:`${next}${delta?` · Sinerji ${delta>0?"+":""}${delta}`:""}`,en:`${candidateTags.map(tag=>`${LABELS.en[tag]||tag} ${after.counts[tag]||1}/3`).join(" · ")}${delta?` · Synergy ${delta>0?"+":""}${delta}`:""}`};
  }
  function label(tag,lang){return (LABELS[lang==="tr"?"tr":"en"]||LABELS.en)[tag]||tag;}
  return{TAGS,COMPLEMENTS,CONFLICTS,tagsFor,calculate,preview,label};
});
