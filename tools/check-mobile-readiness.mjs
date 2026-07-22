import fs from "node:fs";
import vm from "node:vm";

const read=relative=>fs.readFileSync(new URL(`../${relative}`,import.meta.url),"utf8");
const expect=(condition,message)=>{if(!condition)throw new Error(message);};
const makeStorage=entries=>{
  const values=new Map(entries||[]);
  return{
    get length(){return values.size;},
    key:index=>Array.from(values.keys())[index]??null,
    getItem:key=>values.has(key)?values.get(key):null,
    setItem:(key,value)=>values.set(key,String(value)),
    removeItem:key=>values.delete(key),
    values,
  };
};

const packageJson=JSON.parse(read("package.json"));
const index=read("index.html");
const nativeApp=read("src/runtime/nativeApp.js");
const mobile=read("src/ui/mobileExperience.js");
const mobileCss=read("src/styles/mobileExperience.css");
const analytics=read("src/runtime/productAnalytics.js");
const privacyManifest=read("ios/App/App/PrivacyInfo.xcprivacy");
expect(packageJson.dependencies["@capacitor/preferences"]==="8.0.1","Capacitor Preferences dependency is not pinned");
expect(index.includes("CopaBootReady")&&index.includes("CopaPlatform.ready"),"application boot does not wait for native hydration");
expect(index.includes("src/state/transferSave.js"),"portable save transfer runtime is not loaded");
expect(nativeApp.includes("syncKnown")&&nativeApp.includes('addNativeListener("resume"'),"native lifecycle checkpoint/resume bridge is incomplete");
expect(mobile.includes("ensureNativeHubNavigation")&&mobile.includes("openNativeBench")&&mobile.includes("closeNativeBench"),"native navigation or bench sheet is missing");
expect(mobileCss.includes('data-copa-platform="android"')&&mobileCss.includes("native-bench-open"),"native-only responsive styles are missing");
expect(analytics.includes("nativeOptIn")&&analytics.includes("copa_analytics_enabled")&&analytics.includes("platform:platform()"),"native platform analytics is not explicit opt-in or segmented");
expect(privacyManifest.includes("NSPrivacyAccessedAPICategoryUserDefaults")&&privacyManifest.includes("CA92.1"),"iOS UserDefaults privacy reason is missing");

const nativeValues=new Map([
  ["copa_theme","dark"],
  ["copa_run_v6",JSON.stringify({savedAt:100})],
]);
const preferences={
  configure:async()=>{},
  keys:async()=>({keys:Array.from(nativeValues.keys())}),
  get:async({key})=>({value:nativeValues.has(key)?nativeValues.get(key):null}),
  set:async({key,value})=>{nativeValues.set(key,String(value));},
  remove:async({key})=>{nativeValues.delete(key);},
};
const local=makeStorage([
  ["copa_theme","light"],
  ["copa_run_v6",JSON.stringify({savedAt:200})],
]);
const platformSandbox={
  window:null,globalThis:null,localStorage:local,Promise,Map,Set,JSON,String,Number,Date,RegExp,Object,Array,
  CustomEvent:class{constructor(name,options){this.type=name;this.detail=options&&options.detail;}},
  navigator:{share(){}},
  document:{querySelector:()=>({content:"android"}),documentElement:{dataset:{}}},
  dispatchEvent(){},
  Capacitor:{getPlatform:()=>"android",Plugins:{Preferences:preferences}},
};
platformSandbox.window=platformSandbox;platformSandbox.globalThis=platformSandbox;
vm.runInNewContext(read("src/runtime/platform.js"),platformSandbox,{filename:"platform.js"});
await platformSandbox.CopaPlatform.ready;
expect(local.getItem("copa_theme")==="dark","native preference did not hydrate local runtime storage");
expect(JSON.parse(nativeValues.get("copa_run_v6")).savedAt===200,"newer local checkpoint did not win the hydration conflict");
platformSandbox.CopaPlatform.storage.setItem("copa_music","1");
await platformSandbox.CopaPlatform.storage.flush();
expect(nativeValues.get("copa_music")==="1","runtime preference was not mirrored to native Preferences");

const transferStorage=makeStorage();
const transferSandbox={
  window:null,localStorage:transferStorage,sessionStorage:makeStorage(),Date,JSON,Object,Array,Number,Math,Set,Map,Promise,
  TextEncoder,TextDecoder,
  btoa:value=>Buffer.from(value,"binary").toString("base64"),
  atob:value=>Buffer.from(value,"base64").toString("binary"),
  navigator:{},document:{getElementById:()=>null},location:{reload(){}},setTimeout,
};
transferSandbox.window=transferSandbox;
vm.runInNewContext(read("src/state/runPersistence.js"),transferSandbox,{filename:"runPersistence.js"});
vm.runInNewContext(read("src/state/transferSave.js"),transferSandbox,{filename:"transferSave.js"});
const picks=Array.from({length:11},(_,index)=>({name:`P${index}`,pos:"ST",ov:70}));
const run=transferSandbox.CopaRunPersistence.migrate({v:5,phase:"hub",savedAt:Date.now(),picks,budget:12,round:2,seedNum:42,rngCalls:8,formName:"4-4-2",country:"TR",cards:[]});
expect(transferSandbox.CopaRunPersistence.validate(run).ok,"mobile transfer test fixture is invalid");
transferSandbox.CopaRunPersistence.persist(run);
transferStorage.setItem("kupayolu",JSON.stringify({b:4,r:2}));
transferStorage.setItem("copa_theme","dark");
transferStorage.setItem("copa_ghost_client_id_v1","must-not-transfer");
const code=transferSandbox.CopaTransferSave.exportCode();
const decoded=transferSandbox.CopaTransferSave.decode(code);
expect(decoded.run.savedAt===run.savedAt&&decoded.meta.kupayolu,"full transfer omitted run or career data");
expect(!Object.hasOwn(decoded.preferences,"copa_ghost_client_id_v1"),"online device identity leaked into portable save");
let corruptRejected=false;
try{transferSandbox.CopaTransferSave.decode(code.slice(0,-1)+(code.endsWith("A")?"B":"A"));}catch(_){corruptRejected=true;}
expect(corruptRejected,"corrupted transfer code was accepted");

console.log("[mobile-readiness] durable native storage, lifecycle, portable transfer, native UI and opt-in platform analytics verified");
