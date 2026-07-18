/* Anonymous, local weekly aggregates for final simulation calibration. */
(function(global){
  "use strict";

  const VERSION=1;
  const KEY="copa_final_calibration_v1";
  const MAX_WEEKS=12;
  const BANDS=["away_12_plus","away_4_11","even","home_4_11","home_12_plus"];
  const TACTICS=["balanced","more","push","calm","hold"];
  const END_TYPES=["regulation","golden_goal","penalties"];
  const safeText=(value,max=48)=>String(value||"unknown").replace(/[^a-zA-Z0-9_.-]/g,"").slice(0,max)||"unknown";

  function weekKey(date=new Date()){
    const value=new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth(),date.getUTCDate()));
    const day=(value.getUTCDay()+6)%7;
    value.setUTCDate(value.getUTCDate()-day);
    return value.toISOString().slice(0,10);
  }

  function emptyWeek(){
    return{total:0,models:{},powerBands:{},tactics:{},endTypes:{},outcomes:{win:0,loss:0}};
  }

  function load(){
    try{
      const value=JSON.parse(global.localStorage.getItem(KEY)||"null");
      return value&&value.v===VERSION&&value.weeks&&typeof value.weeks==="object"?value:{v:VERSION,weeks:{}};
    }catch(_){return{v:VERSION,weeks:{}};}
  }

  function save(value){
    try{global.localStorage.setItem(KEY,JSON.stringify(value));return true;}catch(_){return false;}
  }

  function increment(bucket,key){
    bucket[key]=(Number(bucket[key])||0)+1;
  }

  function record(properties){
    const source=properties&&typeof properties==="object"?properties:{};
    const value=load(),key=weekKey(),week=value.weeks[key]||emptyWeek();
    const model=safeText(source.model_version);
    const power=BANDS.includes(source.power_gap)?source.power_gap:"even";
    const tactic=TACTICS.includes(source.tactic)?source.tactic:"balanced";
    const end=END_TYPES.includes(source.end_type)?source.end_type:"regulation";
    const outcome=source.outcome==="win"?"win":"loss";
    week.total++;increment(week.models,model);increment(week.powerBands,power);
    increment(week.tactics,tactic);increment(week.endTypes,end);increment(week.outcomes,outcome);
    value.weeks[key]=week;
    const keys=Object.keys(value.weeks).sort().reverse();
    keys.slice(MAX_WEEKS).forEach(old=>delete value.weeks[old]);
    save(value);
    return week;
  }

  const rate=(week,bucket,key)=>(Number(week&&week[bucket]&&week[bucket][key])||0)/Math.max(1,Number(week&&week.total)||0);
  const dominant=(week,bucket)=>{
    const entries=Object.entries(week&&week[bucket]||{}).sort((a,b)=>b[1]-a[1]);
    return entries[0]||["—",0];
  };

  function evaluate(week,currentModel){
    const enough=(week.total||0)>=20;
    const penalty=rate(week,"endTypes","penalties");
    const regulation=rate(week,"endTypes","regulation");
    const golden=rate(week,"endTypes","golden_goal");
    const [topPower,powerCount]=dominant(week,"powerBands");
    const [topTactic,tacticCount]=dominant(week,"tactics");
    const modelShare=rate(week,"models",currentModel);
    return{
      enough,
      checks:[
        {label:"Model sürümü",value:`${Math.round(modelShare*100)}% ${currentModel}`,ok:modelShare>=0.90},
        {label:"Normal süre",value:`${Math.round(regulation*100)}% · hedef 66–84%`,ok:regulation>=0.66&&regulation<=0.84},
        {label:"Altın gol",value:`${Math.round(golden*100)}% · hedef 6–25%`,ok:golden>=0.06&&golden<=0.25},
        {label:"Penaltı",value:`${Math.round(penalty*100)}% · hedef 5–18%`,ok:penalty>=0.05&&penalty<=0.18},
        {label:"Güç bandı yoğunluğu",value:`${topPower} · ${Math.round(powerCount/Math.max(1,week.total)*100)}%`,ok:powerCount/Math.max(1,week.total)<=0.65},
        {label:"Taktik yoğunluğu",value:`${topTactic} · ${Math.round(tacticCount/Math.max(1,week.total)*100)}%`,ok:tacticCount/Math.max(1,week.total)<=0.75}
      ]
    };
  }

  function distribution(week,bucket,labels){
    const total=Math.max(1,week.total||0);
    return labels.map(key=>{
      const count=Number(week[bucket]&&week[bucket][key])||0;
      const pct=Math.round(count/total*100);
      return `<div class="calibration-bar"><span>${key}</span><i><b style="width:${pct}%"></b></i><em>${pct}%</em></div>`;
    }).join("");
  }

  function openDashboard(){
    const tr=global.LANG==="tr";
    const value=load(),keys=Object.keys(value.weeks).sort().reverse();
    const key=keys[0]||weekKey(),week=value.weeks[key]||emptyWeek();
    const currentModel=global.CopaFinalSimCore&&global.CopaFinalSimCore.MODEL_VERSION||"copa-final-core-v3";
    const result=evaluate(week,currentModel);
    const status=!result.enough
      ?(tr?"En az 20 finalden sonra eşik değerlendirmesi güvenilir olur.":"Threshold evaluation becomes reliable after at least 20 finals.")
      :(result.checks.every(check=>check.ok)?(tr?"Dağılımlar hedef bantta.":"Distributions are within target bands."):(tr?"En az bir dağılım hedef bandın dışında.":"At least one distribution is outside its target band."));
    const checks=result.checks.map(check=>`<div class="calibration-check ${result.enough?(check.ok?"is-ok":"is-warn"):"is-pending"}"><span>${check.label}</span><b>${check.value}</b></div>`).join("");
    global.showModal(`<div class="scoutmodal calibration-dashboard"><header><div><span>${tr?"HAFTALIK ANONİM KALİBRASYON":"WEEKLY ANONYMOUS CALIBRATION"}</span><h4>${key} · n=${week.total||0}</h4></div><button type="button" class="btn btn-ghost" onclick="closeModal()" aria-label="${tr?"Kapat":"Close"}">×</button></header><p>${status}</p><div class="calibration-checks">${checks}</div><h5>${tr?"Bitiş türü":"Finish type"}</h5>${distribution(week,"endTypes",END_TYPES)}<h5>${tr?"Güç bandı":"Power band"}</h5>${distribution(week,"powerBands",BANDS)}<h5>${tr?"Taktik":"Tactic"}</h5>${distribution(week,"tactics",TACTICS)}<small>${tr?"Yalnız haftalık toplamlar saklanır; seed, oyuncu, kulüp veya cihaz kimliği tutulmaz.":"Only weekly totals are stored; no seed, player, club or device identifier is retained."}</small></div>`,{label:tr?"Final kalibrasyon panosu":"Final calibration dashboard"});
  }

  function clear(){try{global.localStorage.removeItem(KEY);}catch(_){}}

  global.CopaFinalCalibration=Object.freeze({
    VERSION,KEY,weekKey,record,load,evaluate,openDashboard,clear
  });
  global.openFinalCalibration=openDashboard;
})(window);
