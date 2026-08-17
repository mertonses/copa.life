/* Global structural-surface contract.
 * Structural UI may use translucent decorative gradients, but its base paint
 * must remain opaque when color-mix/backdrop compositing is unavailable.
 */
(function(root){
  "use strict";

  const SELECTOR=[
    ".sheet",".postcard",".modalbox",".settingsdrop",".card",".mtile",".context-metric",
    ".hub-game-tabs",".native-hub-nav",".mobile-action-dock",".hub-action-panel",
    ".player-profile-card",".cash-mechanic-sheet",".cash-detail-sheet",
    "#marketDecisionHeader",".market-cash-panel",".free-agent-card",
    "#modal>:first-child",
    '[class$="-modal"]','[class*="-modal "]',
    '[class$="-sheet"]','[class*="-sheet "]',
    '[class$="-card"]','[class*="-card "]',
    '[class$="-panel"]','[class*="-panel "]',
    '[class$="-tile"]','[class*="-tile "]',
    '[class$="-dock"]','[class*="-dock "]',
    '[class$="-notice"]','[class*="-notice "]',
    '[class$="-summary"]','[class*="-summary "]'
  ].join(",");
  const EXCLUDE=".modal,.copa-transparent-surface,.card-stamp,.card-stamp-image,svg,defs,clipPath,mask";
  let scheduled=false,audits=0,repairs=0,observer=null;

  function rgba(value){
    const match=String(value||"").match(/rgba?\(\s*([0-9.]+)[,\s]+([0-9.]+)[,\s]+([0-9.]+)(?:\s*[,/]\s*([0-9.]+))?\s*\)/i);
    if(!match)return null;
    return {r:Number(match[1]),g:Number(match[2]),b:Number(match[3]),a:match[4]==null?1:Number(match[4])};
  }
  function tokenColor(element,name,fallback){
    const color=rgba(getComputedStyle(element).getPropertyValue(name));
    return color&&color.a>=.98?color:fallback;
  }
  function opaqueParent(element){
    for(let node=element.parentElement;node;node=node.parentElement){
      const color=rgba(getComputedStyle(node).backgroundColor);
      if(color&&color.a>=.98)return color;
    }
    return tokenColor(element,"--page-bg",{r:16,g:29,b:40,a:1});
  }
  function baseFor(element){
    const className=String(element.className||"");
    const control=/(?:nav|dock|summary|notice|tile|panel)/i.test(className);
    return tokenColor(element,control?"--surface-bg":"--surface-elevated",opaqueParent(element));
  }
  function composite(foreground,background){
    const alpha=Math.max(0,Math.min(1,foreground&&foreground.a||0));
    const channel=(front,back)=>Math.round(front*alpha+back*(1-alpha));
    return `rgb(${channel(foreground&&foreground.r||0,background.r)} ${channel(foreground&&foreground.g||0,background.g)} ${channel(foreground&&foreground.b||0,background.b)})`;
  }
  function candidates(scope){
    const list=[];
    if(scope&&scope.nodeType===1&&scope.matches&&scope.matches(SELECTOR))list.push(scope);
    if(scope&&scope.querySelectorAll)list.push(...scope.querySelectorAll(SELECTOR));
    return Array.from(new Set(list)).filter(element=>element instanceof HTMLElement&&!element.matches(EXCLUDE));
  }
  function repair(element){
    element.dataset.copaSurfaceContract="opaque";
    const style=getComputedStyle(element),color=rgba(style.backgroundColor);
    if(color&&color.a>=.98)return false;
    const base=baseFor(element);
    const opaque=color&&color.a>0?composite(color,base):`rgb(${base.r} ${base.g} ${base.b})`;
    element.style.setProperty("--copa-opaque-bg",opaque);
    element.style.setProperty("background-color",opaque,"important");
    element.dataset.copaOpaqueSurface="true";
    repairs++;
    return true;
  }
  function audit(scope=document){
    const list=candidates(scope);list.forEach(repair);audits++;
    return {candidates:list.length,repairs,audits};
  }
  function schedule(){
    if(scheduled)return;scheduled=true;
    requestAnimationFrame(()=>{scheduled=false;audit(document);});
  }
  function report(){
    const list=candidates(document);
    return {
      candidates:list.length,repairs,audits,
      transparent:list.filter(element=>{const color=rgba(getComputedStyle(element).backgroundColor);return !color||color.a<.98;}).map(element=>element.id||String(element.className||"").split(/\s+/).slice(0,2).join(".")).slice(0,40)
    };
  }
  function start(){
    audit(document);
    observer=new MutationObserver(mutations=>{
      if(mutations.some(mutation=>mutation.addedNodes&&mutation.addedNodes.length))schedule();
    });
    observer.observe(document.documentElement,{childList:true,subtree:true});
    root.addEventListener("copa:native-resume",schedule);
  }
  root.CopaSurfaceContract=Object.freeze({audit,report,selector:SELECTOR});
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start,{once:true});else start();
})(window);
