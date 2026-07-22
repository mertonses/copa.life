/* Portable full-save transfer between the live web game and native builds. */
(function(global){
  "use strict";
  const PREFIX="COPA1-";
  const FORMAT="copa-life-transfer";
  const SCHEMA=1;
  const MAX_CODE_LENGTH=3_000_000;
  const META_KEYS=["kupayolu","copa_meta_progression_v1","copa_cardmem","copa_mvp"];
  const PREFERENCE_KEYS=["copa.language","copa_country","copa_theme","copa_music","copa_sfx","copa_spd","copa_reduced_motion","copa_mobile_haptics","copa_mobile_battery","copa_mobile_smart_speed","copa_mobile_confirm_pick","copa_mobile_field_focus"];
  const storage=global.CopaPlatform&&global.CopaPlatform.storage||global.localStorage;
  const get=key=>{try{return storage&&storage.getItem(key);}catch(_){return null;}};
  const set=(key,value)=>{try{return storage&&storage.setItem(key,String(value));}catch(_){return false;}};
  const hash=value=>{let h=2166136261;for(const ch of String(value)){h^=ch.codePointAt(0);h=Math.imul(h,16777619);}return (h>>>0).toString(36);};
  const encode64=value=>{const bytes=new TextEncoder().encode(value);let binary="";for(const byte of bytes)binary+=String.fromCharCode(byte);return btoa(binary).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/g,"");};
  const decode64=value=>{const normalized=value.replace(/-/g,"+").replace(/_/g,"/");const binary=atob(normalized+"=".repeat((4-normalized.length%4)%4));return new TextDecoder().decode(Uint8Array.from(binary,char=>char.charCodeAt(0)));};
  const object=value=>!!value&&typeof value==="object"&&!Array.isArray(value);
  const escape=value=>String(value).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
  const text=(tr,en)=>global.LANG==="tr"?tr:en;

  function collect(){
    try{if(typeof global._saveState==="function")global._saveState();}catch(_){ }
    const runRaw=get(global.CopaRunPersistence&&global.CopaRunPersistence.KEYS.primary||"copa_run_v6");
    let run=null;
    if(runRaw&&global.CopaRunPersistence){const parsed=global.CopaRunPersistence.parse(runRaw);if(parsed.state)run=parsed.state;}
    const meta={};
    for(const key of META_KEYS){const value=get(key);if(value!=null)meta[key]=value;}
    const preferences={};
    for(const key of PREFERENCE_KEYS){const value=get(key);if(value!=null&&String(value).length<=80)preferences[key]=String(value);}
    return{format:FORMAT,schema:SCHEMA,exportedAt:new Date().toISOString(),source:global.COPA_PLATFORM||"web",run,meta,preferences};
  }
  function encode(bundle){
    const payload=object(bundle)?bundle:collect();
    const raw=JSON.stringify(payload);
    return PREFIX+encode64(JSON.stringify({payload,checksum:hash(raw)}));
  }
  function decode(code){
    const compact=String(code||"").replace(/\s+/g,"");
    if(!compact.startsWith(PREFIX)||compact.length>MAX_CODE_LENGTH)throw new Error("invalid_transfer_code");
    let envelope;try{envelope=JSON.parse(decode64(compact.slice(PREFIX.length)));}catch(_){throw new Error("invalid_transfer_code");}
    if(!object(envelope)||!object(envelope.payload)||envelope.payload.format!==FORMAT||Number(envelope.payload.schema)!==SCHEMA)throw new Error("unsupported_transfer_code");
    if(hash(JSON.stringify(envelope.payload))!==envelope.checksum)throw new Error("transfer_checksum_failed");
    const payload=envelope.payload;
    if(payload.run!=null){
      if(!global.CopaRunPersistence)throw new Error("persistence_unavailable");
      const checked=global.CopaRunPersistence.validate(payload.run);if(!checked.ok)throw new Error("invalid_run_state");
    }
    if(!object(payload.meta)||!object(payload.preferences))throw new Error("invalid_transfer_payload");
    for(const [key,value] of Object.entries(payload.meta)){
      if(!META_KEYS.includes(key)||typeof value!=="string"||value.length>1_500_000)throw new Error("invalid_transfer_meta");
      try{if(!object(JSON.parse(value)))throw new Error("not_object");}catch(_){throw new Error("invalid_transfer_meta");}
    }
    for(const [key,value] of Object.entries(payload.preferences))if(!PREFERENCE_KEYS.includes(key)||typeof value!=="string"||value.length>80)throw new Error("invalid_transfer_preference");
    return payload;
  }
  async function apply(code){
    const payload=decode(code);
    if(payload.run){const result=global.CopaRunPersistence.persist(payload.run);if(!result.ok)throw new Error("run_import_failed");}
    else if(global.CopaRunPersistence)global.CopaRunPersistence.clear();
    for(const [key,value] of Object.entries(payload.meta))set(key,value);
    for(const [key,value] of Object.entries(payload.preferences))set(key,value);
    if(storage&&typeof storage.syncKnown==="function")await storage.syncKnown();
    if(storage&&typeof storage.flush==="function")await storage.flush();
    return{run:!!payload.run,career:!!payload.meta.copa_meta_progression_v1,source:payload.source||"unknown"};
  }
  function exportCode(){return encode(collect());}
  async function copyExport(){
    const code=exportCode();
    if(global.navigator&&global.navigator.clipboard&&global.navigator.clipboard.writeText)await global.navigator.clipboard.writeText(code);
    else throw new Error("clipboard_unavailable");
    if(typeof global.showToast==="function")global.showToast(text("Kayıt aktarım kodu kopyalandı.","Save transfer code copied."));
  }
  async function shareExport(){
    const code=exportCode();
    if(global.navigator&&typeof global.navigator.share==="function")return global.navigator.share({title:"copa.life",text:code});
    return copyExport();
  }
  function openExport(){
    const code=exportCode();
    if(typeof global.showModal!=="function")return code;
    global.showModal(`<div class="transfer-save"><div class="kithdr">${text("KAYDI AKTAR","TRANSFER SAVE")}</div><p>${text("Bu kod mevcut koşuyu, kulüp kariyerini ve cihaz tercihlerini taşır. Ghost Club kimliği ve çevrim içi izinler aktarılmaz.","This code transfers the current run, club career and device preferences. Ghost Club identity and online permissions are not included.")}</p><textarea readonly aria-label="${text("Kayıt aktarım kodu","Save transfer code")}">${escape(code)}</textarea><div class="bact"><button class="btn btn-primary" type="button" onclick="CopaTransferSave.copyExport()">${text("KODU KOPYALA","COPY CODE")}</button><button class="btn btn-ghost" type="button" onclick="CopaTransferSave.shareExport()">${text("PAYLAŞ","SHARE")}</button></div></div>`,{label:text("Kaydı aktar","Transfer save")});
    return code;
  }
  function openImport(){
    if(typeof global.showModal!=="function")return;
    global.showModal(`<div class="transfer-save"><div class="kithdr">${text("KAYDI İÇE AKTAR","IMPORT SAVE")}</div><p>${text("Aktarım mevcut koşu ve kariyer kaydının yerini alır. İşlemden önce kendi kodunu dışa aktarman önerilir.","Import replaces the current run and career save. Export your current code first if you may need it.")}</p><textarea id="copaTransferImport" spellcheck="false" autocomplete="off" aria-label="${text("Kayıt aktarım kodu","Save transfer code")}" placeholder="COPA1-…"></textarea><div class="bact"><button class="btn btn-primary" type="button" onclick="CopaTransferSave.confirmImport()">${text("DOĞRULA VE AKTAR","VERIFY & IMPORT")}</button><button class="btn btn-ghost" type="button" onclick="closeModal()">${text("VAZGEÇ","CANCEL")}</button></div></div>`,{label:text("Kaydı içe aktar","Import save")});
  }
  async function confirmImport(){
    const field=document.getElementById("copaTransferImport");
    try{
      await apply(field&&field.value);
      if(typeof global.showToast==="function")global.showToast(text("Kayıt doğrulandı. Oyun yeniden başlatılıyor.","Save verified. Restarting the game."));
      setTimeout(()=>global.location.reload(),350);
    }catch(_){if(typeof global.showToast==="function")global.showToast(text("Kod geçersiz, bozuk veya bu sürümle uyumsuz.","The code is invalid, corrupted or incompatible with this version."),{type:"info"});}
  }
  global.CopaTransferSave=Object.freeze({PREFIX,FORMAT,SCHEMA,META_KEYS,PREFERENCE_KEYS,collect,encode,decode,apply,exportCode,copyExport,shareExport,openExport,openImport,confirmImport});
})(window);
