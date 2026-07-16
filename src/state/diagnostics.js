/* Privacy-safe local diagnostics and one-tap bug report. */
(function(global){
  "use strict";
  const KEY="copa_diagnostics_v1",MAX=20;
  const safeString=(value,max=1800)=>String(value==null?"":value).replace(/[\r\n]{3,}/g,"\n\n").slice(0,max);
  function read(){try{const value=JSON.parse(localStorage.getItem(KEY)||"[]");return Array.isArray(value)?value:[];}catch(_){return[];}}
  function write(items){try{localStorage.setItem(KEY,JSON.stringify(items.slice(-MAX)));}catch(_){ }}
  function capture(kind,message,stack){
    const items=read();items.push({at:new Date().toISOString(),kind:safeString(kind,40),message:safeString(message,500),stack:safeString(stack)});write(items);
  }
  global.addEventListener("error",event=>capture("error",event.message,event.error&&event.error.stack));
  global.addEventListener("unhandledrejection",event=>{const reason=event.reason;capture("unhandledrejection",reason&&reason.message||reason,reason&&reason.stack);});
  function build(){
    const buildMeta=document.querySelector("meta[name='copa-build-version']");
    const squad=Array.isArray(global.picksBySlot)?global.picksBySlot.map((player,index)=>player?{slot:index,pos:player.pos||"",power:Number(player.eff||player.ov)||0}:null):[];
    return{
      generatedAt:new Date().toISOString(),build:buildMeta&&buildMeta.content||"dev",phase:global.CopaRunState&&global.CopaRunState.phase||global.runPhase||"unknown",
      round:Number(global.round)||0,seed:safeString(global.seedStr||global.seedNum||"",80),country:safeString(global.selectedCountry||"",8),formation:safeString(global.formName||"",20),
      viewport:{width:global.innerWidth,height:global.innerHeight,dpr:global.devicePixelRatio||1},online:navigator.onLine,userAgent:safeString(navigator.userAgent,260),
      state:{slots:Array.isArray(global.slots)?global.slots.length:0,filled:squad.filter(Boolean).length,budget:Number(global.budget)||0,squad},
      phaseHistory:global.CopaRunState?global.CopaRunState.history():[],errors:read()
    };
  }
  const text=()=>JSON.stringify(build(),null,2);
  const esc=value=>String(value).replace(/[&<>]/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;"}[char]));
  async function copy(){const value=text();try{await navigator.clipboard.writeText(value);return true;}catch(_){return false;}}
  function open(){
    if(typeof global.showModal!=="function")return;
    const tr=global.LANG!=="en";
    global.showModal(`<div class="diagnostic-modal"><div class="kithdr">${tr?"HATA RAPORU":"BUG REPORT"}</div><div class="kitsub">${tr?"İsim ve e-posta eklenmez. Göndermeden önce içeriği görebilirsin.":"No name or email is included. You can review everything before sending."}</div><textarea id="diagnosticReportText" readonly>${esc(text())}</textarea><div class="bact"><button class="btn btn-primary" onclick="CopaDiagnostics.copy().then(ok=>showToast(ok?'${tr?"Rapor kopyalandı":"Report copied"}':'${tr?"Kopyalanamadı":"Copy failed"}'))">${tr?"RAPORU KOPYALA":"COPY REPORT"}</button><button class="btn btn-ghost" onclick="CopaDiagnostics.attachToContact()">${tr?"İLETİŞİME EKLE":"ADD TO CONTACT"}</button></div></div>`,{label:tr?"Hata raporu":"Bug report"});
  }
  function attachToContact(){
    const value=text();if(typeof global.closeModal==="function")global.closeModal();if(typeof global.openContactForm!=="function")return;
    global.openContactForm();setTimeout(()=>{const field=document.getElementById("cfMsg");if(field)field.value=(field.value?field.value+"\n\n":"")+"--- copa.life diagnostic ---\n"+value;},120);
  }
  global.CopaDiagnostics=Object.freeze({capture,build,text,copy,open,attachToContact,clear:()=>write([])});
  global.openBugReport=open;
})(window);
