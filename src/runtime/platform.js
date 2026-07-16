(function(root){
  "use strict";
  const meta=typeof document!=="undefined"&&document.querySelector("meta[name='copa-platform']");
  const declared=String(meta&&meta.content||"").toLowerCase();
  const nativePlatform=root.Capacitor&&typeof root.Capacitor.getPlatform==="function"?root.Capacitor.getPlatform():"";
  root.COPA_PLATFORM=declared||nativePlatform||"web";
  root.COPA_IS_NATIVE=root.COPA_PLATFORM==="android"||root.COPA_PLATFORM==="ios";
  if(typeof document!=="undefined")document.documentElement.dataset.copaPlatform=root.COPA_PLATFORM;
})(typeof window!=="undefined"?window:globalThis);
