/* localStorage okuma/yazma ve meta kilit acma yardimcilari. */
function saveMeta(){try{localStorage.setItem("kupayolu",JSON.stringify({u:unlockedForms,b:metaBest,r:metaRuns,t:darkTheme,uc:unlockedChairs,sc:selectedChairId,eb:eliteBonus,lf:legacyFund||0}));}catch(e){}}
function loadMeta(){try{const d=JSON.parse(localStorage.getItem("kupayolu"));if(d){if(Array.isArray(d.u)&&d.u.length)unlockedForms=d.u;metaBest=d.b||0;metaRuns=d.r||0;darkTheme=(d.t===undefined?false:!!d.t);if(Array.isArray(d.uc)&&d.uc.length)unlockedChairs=d.uc;if(d.sc&&CHAIR_ORDER.includes(d.sc))selectedChairId=d.sc;eliteBonus=d.eb||false;legacyFund=d.lf||0;}}catch(e){}
/* Migration: leydi artık default açık */
if(!unlockedChairs.includes("leydi")){unlockedChairs.push("leydi");saveMeta();}}
function unlockNextForm(){for(const f of FORMORDER){if(!unlockedForms.includes(f)){unlockedForms.push(f);saveMeta();return f;}}return null;}
function unlockNextChair(){for(const id of CHAIR_ORDER){if(!unlockedChairs.includes(id)){unlockedChairs.push(id);saveMeta();return id;}}return null;}
