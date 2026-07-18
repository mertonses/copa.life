/* localStorage okuma/yazma ve meta kilit acma yardimcilari. */
function saveMeta(){try{localStorage.setItem("kupayolu",JSON.stringify({u:unlockedForms,b:metaBest,r:metaRuns,uc:unlockedChairs,sc:selectedChairId,pc:pendingChairChoices,eb:eliteBonus,lf:legacyFund||0}));}catch(e){}}
function loadMeta(){try{const d=JSON.parse(localStorage.getItem("kupayolu"));if(d){if(Array.isArray(d.u)&&d.u.length)unlockedForms=FORMORDER.filter(f=>d.u.includes(f)||DEFAULT_FORMS.includes(f));metaBest=d.b||0;metaRuns=d.r||0;if(Array.isArray(d.uc)&&d.uc.length)unlockedChairs=CHAIR_ORDER.filter(id=>d.uc.includes(id));if(!unlockedChairs.includes("babacan"))unlockedChairs.unshift("babacan");if(d.sc&&CHAIR_ORDER.includes(d.sc)&&unlockedChairs.includes(d.sc))selectedChairId=d.sc;pendingChairChoices=Array.isArray(d.pc)?CHAIR_ORDER.filter(id=>d.pc.includes(id)&&!unlockedChairs.includes(id)).slice(0,3):[];eliteBonus=d.eb||false;legacyFund=Math.min(20,Math.max(0,d.lf||0));}}catch(e){}
}
function unlockNextForm(){for(const f of FORMORDER){if(!unlockedForms.includes(f)){unlockedForms.push(f);saveMeta();return f;}}return null;}
function prepareChairUnlockChoices(){
 const valid=pendingChairChoices.filter(id=>CHAIR_ORDER.includes(id)&&!unlockedChairs.includes(id));
 if(valid.length){pendingChairChoices=valid.slice(0,3);saveMeta();return[...pendingChairChoices];}
 const locked=CHAIR_ORDER.filter(id=>!unlockedChairs.includes(id));
 for(let index=locked.length-1;index>0;index--){const pick=Math.floor(Math.random()*(index+1));[locked[index],locked[pick]]=[locked[pick],locked[index]];}
 pendingChairChoices=locked.slice(0,3);saveMeta();return[...pendingChairChoices];
}
function unlockChairChoice(id){
 if(!pendingChairChoices.includes(id)||!CHAIR_ORDER.includes(id)||unlockedChairs.includes(id))return null;
 unlockedChairs.push(id);pendingChairChoices=[];selectedChairId=id;saveMeta();return id;
}
function unlockNextChair(){const choices=prepareChairUnlockChoices();return choices.length?unlockChairChoice(choices[0]):null;}
