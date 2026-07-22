(function(root){
  "use strict";
  const meta=typeof document!=="undefined"&&document.querySelector("meta[name='copa-platform']");
  const declared=String(meta&&meta.content||"").toLowerCase();
  const capacitor=root.Capacitor||null;
  const nativePlatform=capacitor&&typeof capacitor.getPlatform==="function"?capacitor.getPlatform():"";
  const platform=declared||nativePlatform||"web";
  const isNative=platform==="android"||platform==="ios";
  const local=root.localStorage;
  const APP_KEY=/^(?:copa(?:[._-]|$)|kupayolu$)/i;
  const plugins=capacitor&&capacitor.Plugins||{};
  const Preferences=isNative&&capacitor
    ?(plugins.Preferences||(typeof capacitor.registerPlugin==="function"?capacitor.registerPlugin("Preferences"):null))
    :null;
  let writeQueue=Promise.resolve();
  let nativeReady=false;

  function diagnostic(kind,details){
    try{if(root.CopaDiagnostics&&typeof root.CopaDiagnostics.capture==="function")root.CopaDiagnostics.capture(kind,details||"","");}catch(_){ }
  }
  function qualifies(key){return APP_KEY.test(String(key||""));}
  function localGet(key){try{return local&&local.getItem(key);}catch(_){return null;}}
  function localSet(key,value){try{local&&local.setItem(key,String(value));return true;}catch(_){return false;}}
  function localRemove(key){try{local&&local.removeItem(key);return true;}catch(_){return false;}}
  function enqueue(task){
    if(!Preferences)return Promise.resolve(false);
    writeQueue=writeQueue.then(task,task).catch(error=>{diagnostic("native_storage_write_failed",String(error&&error.message||error));return false;});
    return writeQueue;
  }
  function timestamp(raw){
    try{const value=JSON.parse(raw);return Number(value&&value.savedAt)||0;}catch(_){return 0;}
  }
  function preferLocal(key,localValue,nativeValue){
    if(nativeValue==null)return true;
    if(localValue==null)return false;
    if(/^copa_run_v\d+(?:_last_good)?$/.test(key))return timestamp(localValue)>timestamp(nativeValue);
    return false;
  }
  async function hydrate(){
    if(!Preferences)return{native:false,restored:0,copied:0};
    let restored=0,copied=0;
    try{
      if(typeof Preferences.configure==="function")await Preferences.configure({group:"CopaStorage"});
      const listed=await Preferences.keys();
      const nativeKeys=Array.isArray(listed&&listed.keys)?listed.keys.filter(qualifies):[];
      const localKeys=[];
      try{for(let i=0;i<local.length;i++){const key=local.key(i);if(qualifies(key))localKeys.push(key);}}catch(_){ }
      const keys=[...new Set(nativeKeys.concat(localKeys))];
      for(const key of keys){
        const nativeResult=await Preferences.get({key});
        const nativeValue=nativeResult&&nativeResult.value!=null?String(nativeResult.value):null;
        const localValue=localGet(key);
        if(preferLocal(key,localValue,nativeValue)){
          if(localValue!=null){await Preferences.set({key,value:localValue});copied++;}
        }else if(nativeValue!=null&&nativeValue!==localValue){
          localSet(key,nativeValue);restored++;
        }
      }
      nativeReady=true;
      return{native:true,restored,copied};
    }catch(error){
      diagnostic("native_storage_hydration_failed",String(error&&error.message||error));
      return{native:false,restored,copied,error:String(error&&error.message||error)};
    }
  }
  function setItem(key,value){
    const text=String(value),saved=localSet(key,text);
    if(isNative&&qualifies(key))enqueue(()=>Preferences.set({key,value:text}).then(()=>true));
    return saved;
  }
  function removeItem(key){
    const removed=localRemove(key);
    if(isNative&&qualifies(key))enqueue(()=>Preferences.remove({key}).then(()=>true));
    return removed;
  }
  async function syncKnown(){
    if(!Preferences)return false;
    const snapshot=[];
    try{for(let i=0;i<local.length;i++){const key=local.key(i);if(qualifies(key)){const value=localGet(key);if(value!=null)snapshot.push([key,value]);}}}catch(_){ }
    await enqueue(async()=>{for(const [key,value] of snapshot)await Preferences.set({key,value});return true;});
    return true;
  }
  function flush(){return writeQueue;}
  async function clearAppData(){
    const keys=[];
    try{for(let i=0;i<local.length;i++){const key=local.key(i);if(qualifies(key))keys.push(key);}}catch(_){ }
    keys.forEach(localRemove);
    if(Preferences){
      await enqueue(async()=>{
        const listed=await Preferences.keys();
        for(const key of (listed&&listed.keys||[]).filter(qualifies))await Preferences.remove({key});
        return true;
      });
    }
    return true;
  }
  const storage=Object.freeze({getItem:localGet,setItem,removeItem,qualifies,syncKnown,flush,clearAppData,get nativeReady(){return nativeReady;}});
  const ready=hydrate().then(result=>{
    try{root.dispatchEvent(new CustomEvent("copa:storage-ready",{detail:result}));}catch(_){ }
    return result;
  });
  root.COPA_PLATFORM=platform;
  root.COPA_IS_NATIVE=isNative;
  root.CopaPlatform=Object.freeze({platform,isNative,storage,ready,capabilities:Object.freeze({durablePreferences:!!Preferences,nativeLifecycle:isNative,nativeShare:isNative&&!!root.navigator&&typeof root.navigator.share==="function"})});
  if(typeof document!=="undefined")document.documentElement.dataset.copaPlatform=platform;
})(typeof window!=="undefined"?window:globalThis);
