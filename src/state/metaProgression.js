/* Horizontal meta progression, compact run archive and portable save codes. */
(function(global){
  "use strict";

  const STORAGE_KEY="copa_meta_progression_v1";
  const FORMAT="copa-life-save";
  const VERSION=1;
  const ARCHIVE_LIMIT=20;
  const STYLES=new Set(["gegen","kontra","tiki","uzun","blok"]);
  const COUNTRIES=new Set(["TR","IT","ENG","ES","DE","JP"]);
  const BADGES=Object.freeze({
    first_run:["İlk Adım","First Step"],
    finalist:["Son Perde","Final Act"],
    champion:["Kupa Sahibi","Cup Winner"],
    clean_books:["Dengeli Defter","Balanced Books"],
    collector:["Kart Mimarı","Card Architect"],
    ghost_match:["Hayalet Avcısı","Ghost Hunter"],
    six_styles:["Taktik Gezgin","Tactical Traveller"]
  });
  const empty=()=>({version:VERSION,mastery:{styles:{},formations:{},chairmen:{}},badges:[],archive:[]});
  const safeGet=()=>{try{return localStorage.getItem(STORAGE_KEY);}catch(_){return null;}};
  const safeSet=value=>{try{localStorage.setItem(STORAGE_KEY,JSON.stringify(value));return true;}catch(_){return false;}};
  const text=(value,max=48)=>String(value==null?"":value).replace(/[<>\r\n]/g,"").replace(/\s+/g," ").trim().slice(0,max);
  const integer=(value,min,max)=>Math.max(min,Math.min(max,Math.round(Number(value)||0)));
  const hash=value=>{let h=2166136261;for(const ch of String(value)){h^=ch.codePointAt(0);h=Math.imul(h,16777619);}return (h>>>0).toString(36);};
  const object=value=>!!value&&typeof value==="object"&&!Array.isArray(value);
  const countMap=(value,allow)=>{const out={};if(!object(value))return out;for(const [key,count] of Object.entries(value)){if(allow(key))out[key]=integer(count,0,1000000);}return out;};
  const base64Encode=value=>{const bytes=new TextEncoder().encode(value);let binary="";for(const byte of bytes)binary+=String.fromCharCode(byte);return btoa(binary);};
  const base64Decode=value=>{const binary=atob(value);const bytes=Uint8Array.from(binary,char=>char.charCodeAt(0));return new TextDecoder().decode(bytes);};

  function cleanArchiveEntry(value){
    if(!object(value))return null;
    const seed=integer(value.seed,0,4294967295),round=integer(value.round,1,6);
    const id=/^run-[a-z0-9]{4,24}$/.test(String(value.id||""))?String(value.id):"run-"+hash([seed,round,value.finishedAt||""].join("|"));
    const result=["win","loss","sacked"].includes(value.result)?value.result:"loss";
    const country=COUNTRIES.has(value.country)?value.country:"TR";
    const runStyle=STYLES.has(value.style)?value.style:"gegen";
    return {
      id,finishedAt:/^\d{4}-\d{2}-\d{2}T/.test(String(value.finishedAt||""))?String(value.finishedAt).slice(0,24):new Date().toISOString(),
      seed,team:text(value.team,29)||"COPA XI",country,formation:text(value.formation,16),style:runStyle,
      chairman:text(value.chairman,24),identity:text(value.identity,40),round,result,
      power:integer(value.power,0,130),cards:integer(value.cards,0,99),cash:integer(value.cash,-100,250),
      score:text(value.score,16),ghost:!!value.ghost
    };
  }
  function normalize(value){
    const source=object(value)?value:{},mastery=object(source.mastery)?source.mastery:{};
    const archive=(Array.isArray(source.archive)?source.archive:[]).map(cleanArchiveEntry).filter(Boolean);
    const unique=[];for(const item of archive){const at=unique.findIndex(entry=>entry.id===item.id);if(at>=0)unique.splice(at,1);unique.push(item);}
    return {
      version:VERSION,
      mastery:{
        styles:countMap(mastery.styles,key=>STYLES.has(key)),
        formations:countMap(mastery.formations,key=>global.FORMORDER?global.FORMORDER.includes(key):/^[0-9]-[0-9]/.test(key)),
        chairmen:countMap(mastery.chairmen,key=>global.CHAIR_ORDER?global.CHAIR_ORDER.includes(key):/^[a-z_]{2,24}$/.test(key))
      },
      badges:Array.from(new Set((Array.isArray(source.badges)?source.badges:[]).filter(key=>Object.hasOwn(BADGES,key)))),
      archive:unique.slice(-ARCHIVE_LIMIT)
    };
  }
  let state=(()=>{try{return normalize(JSON.parse(safeGet()||"null"));}catch(_){return empty();}})();
  const persist=()=>safeSet(state);
  const addBadge=key=>{if(Object.hasOwn(BADGES,key)&&!state.badges.includes(key))state.badges.push(key);};
  const increment=(map,key)=>{if(key)map[key]=integer((map[key]||0)+1,0,1000000);};

  function recordRun(context){
    const value=object(context)?context:{},result=value.won?"win":value.endType==="sacked"?"sacked":"loss";
    const entry=cleanArchiveEntry({
      id:"run-"+hash([value.seed,value.metaRun,value.country,value.team].join("|")),
      finishedAt:new Date().toISOString(),seed:value.seed,team:value.team,country:value.country,
      formation:value.formation,style:value.style,chairman:value.chairman,identity:value.identity,
      round:value.won?6:value.round,result,power:value.power,cards:value.cards,cash:value.cash,
      score:value.score,ghost:value.ghost
    });
    if(!entry)return null;
    increment(state.mastery.styles,entry.style);increment(state.mastery.formations,entry.formation);increment(state.mastery.chairmen,entry.chairman);
    addBadge("first_run");if(entry.round>=6)addBadge("finalist");if(entry.result==="win")addBadge("champion");
    if(entry.cash>=0)addBadge("clean_books");if(entry.cards>=5)addBadge("collector");if(entry.ghost)addBadge("ghost_match");
    if(Object.keys(state.mastery.styles).filter(key=>state.mastery.styles[key]>0).length>=STYLES.size)addBadge("six_styles");
    state.archive=state.archive.filter(item=>item.id!==entry.id).concat(entry).slice(-ARCHIVE_LIMIT);
    persist();return entry;
  }

  const masteryTier=count=>count>=20?4:count>=10?3:count>=5?2:count>=2?1:0;
  const tierLabel=(count,tr)=>[tr?"Yeni":"Rookie",tr?"Deneyimli":"Seasoned",tr?"Uzman":"Specialist",tr?"Usta":"Master",tr?"Efsane":"Legend"][masteryTier(count)];
  const escapeHTML=value=>text(value,80).replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
  function archiveHTML(tr){
    if(!state.archive.length)return `<p class="kitsub">${tr?"Henüz tamamlanmış koşu yok.":"No completed runs yet."}</p>`;
    return [...state.archive].reverse().map(item=>{
      const label=item.result==="win"?(tr?"KUPA":"CUP"):item.result==="sacked"?(tr?"KOVULDU":"SACKED"):(tr?"ELENDİ":"OUT");
      const date=new Date(item.finishedAt).toLocaleDateString(tr?"tr-TR":"en-GB",{day:"2-digit",month:"short"});
      return `<div class="meta-run-row"><span><b>${escapeHTML(item.team)}</b><small>${date} · ${escapeHTML(item.formation)} · #${item.seed}</small></span><span><b>${label}</b><small>${item.round}/6 · ${item.power} · ${item.cash<0?"-":""}€${Math.abs(item.cash)}M</small></span></div>`;
    }).join("");
  }
  function masteryHTML(tr){
    const entries=Object.entries(state.mastery.styles).sort((a,b)=>b[1]-a[1]);
    if(!entries.length)return `<p class="kitsub">${tr?"Ustalık verisi ilk tamamlanan koşudan sonra oluşur.":"Mastery appears after your first completed run."}</p>`;
    return entries.map(([key,count])=>`<div class="meta-mastery-row"><span>${escapeHTML(key)}</span><b>${count} · ${tierLabel(count,tr)}</b></div>`).join("");
  }
  function badgesHTML(tr){
    if(!state.badges.length)return `<p class="kitsub">${tr?"Henüz rozet yok.":"No badges yet."}</p>`;
    return state.badges.map(key=>`<span class="meta-badge">${BADGES[key][tr?0:1]}</span>`).join("");
  }
  function openProgression(){
    const tr=global.LANG==="tr";
    global.showModal(`<div class="meta-progress-modal"><div class="kithdr">${tr?"KULÜP KARİYERİ":"CLUB CAREER"}</div><div class="kitsub">${tr?"Ustalık ve rozetler yalnızca geçmişini gösterir; kadro gücü vermez.":"Mastery and badges record your history; they never add squad power."}</div><div class="meta-progress-grid"><section><h4>${tr?"OYUN ANLAYIŞI USTALIĞI":"STYLE MASTERY"}</h4>${masteryHTML(tr)}</section><section><h4>${tr?"ROZETLER":"BADGES"}</h4><div class="meta-badges">${badgesHTML(tr)}</div></section></div><section class="meta-archive"><h4>${tr?"SON 20 KOŞU":"LAST 20 RUNS"}</h4>${archiveHTML(tr)}</section><div class="bact meta-progress-actions"><button class="btn btn-ghost" onclick="CopaMeta.openExport()">${tr?"DIŞA AKTAR":"EXPORT"}</button><button class="btn btn-ghost" onclick="CopaMeta.openImport()">${tr?"İÇE AKTAR":"IMPORT"}</button><button class="btn btn-primary" onclick="closeModal()">${tr?"KAPAT":"CLOSE"}</button></div></div>`,{dismissOnOverlay:true,label:tr?"Kulüp kariyeri":"Club career"});
  }
  function coreSnapshot(){
    return {
      forms:(global.FORMORDER||[]).filter(item=>(global.unlockedForms||[]).includes(item)),
      best:integer(global.metaBest,0,6),runs:integer(global.metaRuns,0,1000000),
      chairs:(global.CHAIR_ORDER||[]).filter(item=>(global.unlockedChairs||[]).includes(item)),
      selected:String(global.selectedChairId||"babacan"),pending:Array.isArray(global.pendingChairChoices)?global.pendingChairChoices:[],
      elite:!!global.eliteBonus,legacy:integer(global.legacyFund,0,20)
    };
  }
  function exportCode(){
    const body=JSON.stringify({format:FORMAT,version:VERSION,createdAt:new Date().toISOString(),core:coreSnapshot(),progression:state});
    return `CPS1.${base64Encode(body)}.${hash(body)}`;
  }
  function decodeCode(code){
    const raw=String(code||"").trim();if(raw.length<16||raw.length>180000)throw new Error("invalid_length");
    const parts=raw.split(".");if(parts.length!==3||parts[0]!=="CPS1")throw new Error("invalid_format");
    const body=base64Decode(parts[1]);if(hash(body)!==parts[2])throw new Error("checksum");
    const payload=JSON.parse(body);if(!object(payload)||payload.format!==FORMAT||payload.version!==VERSION||!object(payload.core))throw new Error("unsupported");
    return payload;
  }
  function importCode(code){
    const payload=decodeCode(code),core=payload.core;
    const forms=(Array.isArray(core.forms)?core.forms:[]).filter(item=>(global.FORMORDER||[]).includes(item));
    const chairs=(Array.isArray(core.chairs)?core.chairs:[]).filter(item=>(global.CHAIR_ORDER||[]).includes(item));
    global.unlockedForms=(global.FORMORDER||[]).filter(item=>(global.DEFAULT_FORMS||[]).includes(item)||forms.includes(item)||(global.unlockedForms||[]).includes(item));
    global.unlockedChairs=(global.CHAIR_ORDER||[]).filter(item=>item==="babacan"||chairs.includes(item)||(global.unlockedChairs||[]).includes(item));
    global.metaBest=Math.max(integer(global.metaBest,0,6),integer(core.best,0,6));
    global.metaRuns=Math.max(integer(global.metaRuns,0,1000000),integer(core.runs,0,1000000));
    global.eliteBonus=!!(global.eliteBonus||core.elite);global.legacyFund=Math.max(integer(global.legacyFund,0,20),integer(core.legacy,0,20));
    if(global.unlockedChairs.includes(core.selected))global.selectedChairId=core.selected;
    global.pendingChairChoices=(Array.isArray(core.pending)?core.pending:[]).filter(item=>(global.CHAIR_ORDER||[]).includes(item)&&!global.unlockedChairs.includes(item)).slice(0,3);
    const imported=normalize(payload.progression),merged=normalize(state);
    for(const group of ["styles","formations","chairmen"])for(const [key,count] of Object.entries(imported.mastery[group]))merged.mastery[group][key]=Math.max(merged.mastery[group][key]||0,count);
    merged.badges=Array.from(new Set(merged.badges.concat(imported.badges)));
    merged.archive=normalize({archive:merged.archive.concat(imported.archive)}).archive;state=merged;persist();
    if(typeof global.saveMeta==="function")global.saveMeta();if(typeof global.applyMeta==="function")global.applyMeta();if(typeof global.buildFormButtons==="function")global.buildFormButtons();if(typeof global.buildChairButtons==="function")global.buildChairButtons();
    return {ok:true,runs:state.archive.length};
  }
  function copy(value,done){
    if(navigator.clipboard&&navigator.clipboard.writeText)return navigator.clipboard.writeText(value).then(done).catch(()=>fallbackCopy(value,done));
    fallbackCopy(value,done);
  }
  function fallbackCopy(value,done){const input=document.createElement("textarea");input.value=value;input.style.position="fixed";input.style.opacity="0";document.body.appendChild(input);input.select();document.execCommand("copy");input.remove();done();}
  function openExport(){
    const tr=global.LANG==="tr",code=exportCode();
    global.showModal(`<div class="meta-transfer-modal"><div class="kithdr">${tr?"İLERLEMEYİ DIŞA AKTAR":"EXPORT PROGRESS"}</div><div class="kitsub">${tr?"Kod aktif koşuyu içermez. Güvenli bir yerde sakla.":"The code excludes the active run. Store it somewhere safe."}</div><textarea id="metaExportCode" readonly>${code}</textarea><div class="bact"><button class="btn btn-primary" onclick="CopaMeta.copyExport()">${tr?"KODU KOPYALA":"COPY CODE"}</button><button class="btn btn-ghost" onclick="CopaMeta.downloadExport()">${tr?"DOSYA İNDİR":"DOWNLOAD FILE"}</button><button class="btn btn-ghost" onclick="CopaMeta.openProgression()">${tr?"GERİ":"BACK"}</button></div></div>`,{dismissOnOverlay:true,label:tr?"İlerlemeyi dışa aktar":"Export progress"});
  }
  function copyExport(){const code=exportCode();copy(code,()=>global.showToast(global.LANG==="tr"?"İlerleme kodu kopyalandı.":"Progress code copied."));}
  function downloadExport(){const blob=new Blob([exportCode()],{type:"text/plain;charset=utf-8"}),link=document.createElement("a");link.href=URL.createObjectURL(blob);link.download="copa-life-progress.copa";link.click();setTimeout(()=>URL.revokeObjectURL(link.href),0);}
  function openImport(){
    const tr=global.LANG==="tr";
    global.showModal(`<div class="meta-transfer-modal"><div class="kithdr">${tr?"İLERLEMEYİ İÇE AKTAR":"IMPORT PROGRESS"}</div><div class="kitsub">${tr?"Geçerli ilerleme korunur; içe aktarılan daha yüksek değerler ve arşiv birleştirilir.":"Current progress is preserved; higher imported values and archive entries are merged."}</div><textarea id="metaImportCode" placeholder="CPS1.…"></textarea><div class="bact"><button class="btn btn-primary" onclick="CopaMeta.submitImport()">${tr?"DOĞRULA VE BİRLEŞTİR":"VALIDATE AND MERGE"}</button><button class="btn btn-ghost" onclick="CopaMeta.openProgression()">${tr?"GERİ":"BACK"}</button></div></div>`,{dismissOnOverlay:true,label:tr?"İlerlemeyi içe aktar":"Import progress"});
  }
  function submitImport(){try{const result=importCode((document.getElementById("metaImportCode")||{}).value);global.showToast(global.LANG==="tr"?`${result.runs} arşiv kaydıyla ilerleme birleştirildi.`:`Progress merged with ${result.runs} archive entries.`);openProgression();}catch(_){global.showToast(global.LANG==="tr"?"Kod geçersiz veya bozulmuş.":"The code is invalid or corrupted.",{type:"info"});}}
  function installControl(){
    const body=document.querySelector(".advanced-body");if(!body||document.getElementById("metaProgressBtn"))return;
    const button=document.createElement("button");button.type="button";button.id="metaProgressBtn";button.className="btn btn-ghost final-replay-import-btn";button.onclick=openProgression;button.textContent=global.LANG==="tr"?"KULÜP KARİYERİ VE KAYIT":"CLUB CAREER & SAVE";body.insertBefore(button,document.getElementById("advancedGhostSettingSlot"));
  }

  global.CopaMeta=Object.freeze({recordRun,getState:()=>JSON.parse(JSON.stringify(state)),exportCode,importCode,openProgression,openExport,openImport,copyExport,downloadExport,submitImport,installControl});
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",installControl,{once:true});else installControl();
})(window);
