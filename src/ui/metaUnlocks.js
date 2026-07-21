/* Championship chairman choice layered onto the existing result/meta UI. */
(function(global){
  "use strict";
  const originalRender=global.renderResult;
  const originalApplyMeta=global.applyMeta;

  function choices(value){
    const ids=Array.isArray(value)?value:[];
    return ids.filter(id=>global.CHAIR_ORDER.includes(id)&&!global.unlockedChairs.includes(id));
  }
  function choiceHTML(value){
    const ids=choices(value),x=global.L(),tr=global.LANG==="tr";
    if(!ids.length)return"";
    return `<div class="chair-unlock-choice"><div class="kithdr">${tr?"YENİ BAŞKANINI SEÇ":"CHOOSE YOUR NEW CHAIRMAN"}</div><div class="kitsub">${tr?"Şampiyonluk ödülü: seçeneklerden biri kalıcı olarak açılır.":"Championship reward: permanently unlock one option."}</div><div class="stylelist">${ids.map(id=>{const data=x.chair&&x.chair[id]||{};return `<button type="button" class="stylebtn" onclick="chooseChairUnlock('${id}')"><img src="${global.chairSrc(id)}" class="unlockphoto" alt="" onerror="this.style.display='none'"><div class="ssm"><div class="sst">${data.n||id}</div><div class="ssd">${data.role||""}</div></div></button>`;}).join("")}</div></div>`;
  }
  function augmentResult(){
    const result=global.lastResult,container=document.getElementById("rUnlocks");
    if(!result||!container)return;
    const pending=result.chairChoices&&result.chairChoices.length?result.chairChoices:(!result.newChair?global.pendingChairChoices:[]);
    if(!choices(pending).length)return;
    container.querySelector(".chair-unlock-choice,.chair-choice-cta")?.remove();
    container.insertAdjacentHTML("beforeend",`<button type="button" class="chair-choice-cta" onclick="showPendingChairUnlock()"><span><small>${global.LANG==="tr"?"ŞAMPİYONLUK ÖDÜLÜ":"CHAMPIONSHIP REWARD"}</small><b>${global.LANG==="tr"?"Yeni başkan seçimi hazır":"New chairman choice ready"}</b></span><em>${global.LANG==="tr"?"SEÇ":"CHOOSE"} →</em></button>`);
    container.classList.remove("hidden");
  }
  function augmentMeta(){
    const line=document.getElementById("metaline");
    if(!line||!choices(global.pendingChairChoices).length)return;
    if(document.getElementById("pendingChairChoiceButton"))return;
    line.insertAdjacentHTML("beforeend",` <button type="button" id="pendingChairChoiceButton" class="footer-link" onclick="showPendingChairUnlock()">${global.LANG==="tr"?"Başkan seç":"Choose chairman"}</button>`);
  }

  global.chooseChairUnlock=function(id){
    const unlocked=typeof global.unlockChairChoice==="function"?global.unlockChairChoice(id):null;
    if(!unlocked)return false;
    if(global.lastResult){global.lastResult.newChair=unlocked;global.lastResult.chairChoices=[];}
    if(global.CopaAnalytics)global.CopaAnalytics.track("meta_unlocked",global.analyticsBalanceProps({chairman:unlocked}));
    originalApplyMeta();global.buildChairButtons();
    if(global.lastResult&&typeof originalRender==="function")global.renderResult();
    const data=global.L().chair&&global.L().chair[unlocked];
    global.showToast((global.LANG==="tr"?"Başkan açıldı: ":"Chairman unlocked: ")+(data?data.n:unlocked));
    return true;
  };
  global.showPendingChairUnlock=function(){
    const html=choiceHTML(global.pendingChairChoices);
    if(!html)return;
    global.showModal(`<div class="scoutmodal">${html}<div class="bact"><button class="btn btn-ghost" onclick="closeModal()">${global.LANG==="tr"?"Daha sonra":"Later"}</button></div></div>`,{dismissOnOverlay:true,label:global.LANG==="tr"?"Başkan seçimi":"Chairman choice"});
  };
  global.renderResult=function(){
    if(typeof originalRender==="function")originalRender();
    augmentResult();
  };
  global.applyMeta=function(){
    if(typeof originalApplyMeta==="function")originalApplyMeta();
    augmentMeta();
  };
  augmentMeta();
})(window);
