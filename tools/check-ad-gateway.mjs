import fs from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";

const source=fs.readFileSync("src/runtime/adGateway.js","utf8");
const events=[];
const document={
  documentElement:{classList:{add(){},remove(){}}},
  body:{},
  head:{appendChild(){
    root.adBreak=options=>{
      if(options.type==="reward"){
        options.beforeReward?.(()=>{});
        options.beforeAd?.();
        options.adViewed?.();
        options.afterAd?.();
        options.adBreakDone?.({breakStatus:"viewed"});
      }else{
        options.beforeAd?.();
        options.afterAd?.();
        options.adBreakDone?.({breakStatus:"viewed"});
      }
    };
  }},
  createElement:()=>({dataset:{}}),
};
const root={
  COPA_WEB_ADS_CONFIG:{client:"ca-pub-1234567890123456",channel:"123",displaySlot:"1234567890"},
  COPA_IS_NATIVE:false,
  COPA_PLATFORM:"web",
  LANG:"tr",
  addEventListener(){},
  removeEventListener(){},
  dispatchEvent:event=>events.push(event.type),
};
const context={
  window:root,
  document,
  CustomEvent:class{constructor(type,options){this.type=type;this.detail=options?.detail;}},
  MutationObserver:class{observe(){} disconnect(){}},
  IntersectionObserver:class{observe(){} disconnect(){}},
  setTimeout:fn=>fn(),
};
vm.runInNewContext(source,context,{filename:"adGateway.js"});
assert.equal(root.CopaAds.configured(),true);
const reward=await root.CopaAds.showRewardedReroll("run-1");
assert.equal(reward.earned,true,"reward must only be granted after adViewed");
const end=await root.CopaAds.showArenaEnd("match-1");
assert.equal(end.shown,true,"Arena completion must request an interstitial");
assert.deepEqual(events,[
  "copa:ad-break-start","copa:ad-break-end",
  "copa:ad-break-start","copa:ad-break-end",
]);

const disabled={COPA_WEB_ADS_CONFIG:{},COPA_IS_NATIVE:false,COPA_PLATFORM:"web",addEventListener(){},dispatchEvent(){}};
vm.runInNewContext(source,{...context,window:disabled},{filename:"adGateway-disabled.js"});
assert.equal(disabled.CopaAds.configured(),false);
assert.equal((await disabled.CopaAds.showArenaEnd("match-2")).shown,false);
console.log("Ad gateway OK: disabled safety, Arena interstitial and viewed-only rewards passed.");
