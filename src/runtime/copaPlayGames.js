/* Google Play Games v2 and push notification bridge. Safe no-op when not configured. */
(function(global){
  "use strict";
  const achievementIds=Object.freeze(Object.assign({
    career_completed:"CgkI88Od7K0IEAIQAQ",cup_won:"CgkI88Od7K0IEAIQAA",unbeaten_champion:"CgkI88Od7K0IEAIQAw",low_budget_champion:"CgkI88Od7K0IEAIQBA",
    three_countries:"CgkI88Od7K0IEAIQAg",five_formations:"CgkI88Od7K0IEAIQBQ",world_top_100:"CgkI88Od7K0IEAIQBg",five_careers:"CgkI88Od7K0IEAIQBw",
    all_chairmen:"CgkI88Od7K0IEAIQCA",first_match_won:"CgkI88Od7K0IEAIQCQ"
  },global.COPA_PLAY_GAMES_ACHIEVEMENTS||{}));
  const plugin=()=>global.Capacitor&&global.Capacitor.Plugins&&global.Capacitor.Plugins.CopaPlayGames;
  const push=()=>global.Capacitor&&global.Capacitor.Plugins&&global.Capacitor.Plugins.PushNotifications;
  const safe=promise=>Promise.resolve(promise).catch(()=>null);
  const api={
    ids:achievementIds,
    available:()=>!!plugin(),
    signIn:()=>plugin()?safe(plugin().signIn()):Promise.resolve(null),
    isAuthenticated:()=>plugin()?safe(plugin().isAuthenticated()):Promise.resolve({isAuthenticated:false}),
    unlock:key=>{const id=achievementIds[key];return id&&plugin()?safe(plugin().unlockAchievement({achievementId:id})):Promise.resolve(null);},
    increment:(key,steps)=>{const id=achievementIds[key];return id&&plugin()?safe(plugin().incrementAchievement({achievementId:id,steps:Math.max(1,Number(steps)||1)})):Promise.resolve(null);},
    progress:(key,target,storageKey)=>{const value=Math.max(0,Number(target)||0),keyName=storageKey||("copa_pgs_progress_"+key);let previous=0;try{previous=Math.max(0,Number(localStorage.getItem(keyName))||0);}catch(_){}if(value<=previous)return Promise.resolve(null);try{localStorage.setItem(keyName,String(value));}catch(_){}return api.increment(key,value-previous);},
    showAchievements:()=>plugin()?safe(plugin().showAchievements()):Promise.resolve(null),
    report:event=>({career_completed:"career_completed",cup_won:"cup_won",first_match_won:"first_match_won"}[event]?api.unlock(event):Promise.resolve(null))
  };
  const notifications={
    available:()=>!!push(),
    async requestPermission(){
      if(!push())return {granted:false,reason:"unsupported"};
      const permission=await safe(push().requestPermissions());
      if(!permission||permission.receive!=="granted")return {granted:false,reason:"denied"};
      await safe(push().register()); return {granted:true};
    },
    register:async()=>{if(!push())return false;await safe(push().register());return true;}
  };
  function installSettingsControls(){
    const host=document.querySelector("#settingsDrop .sd-group:last-child");
    if(!host||document.getElementById("copaPlayGamesBtn"))return;
    const tr=global.LANG!=="en";
    const button=document.createElement("button");
    button.id="copaPlayGamesBtn";button.type="button";button.className="sdbtn sd-full";
    button.textContent=tr?"BİLDİRİMLERİ AÇ / PLAY GAMES":"ENABLE NOTIFICATIONS / PLAY GAMES";
    button.addEventListener("click",async()=>{
      const permission=await notifications.requestPermission();
      if(permission.granted)button.textContent=tr?"BİLDİRİMLER AÇIK":"NOTIFICATIONS ENABLED";
      if(api.available())api.signIn();
    });
    host.appendChild(button);
  }
  global.CopaPlayGames=Object.freeze(api);
  global.CopaNotifications=Object.freeze(notifications);
  if(push()){
    safe(push().addListener("registration",token=>global.dispatchEvent(new CustomEvent("copa:push-token",{detail:{token:token.value}}))));
    safe(push().addListener("registrationError",error=>global.dispatchEvent(new CustomEvent("copa:push-error",{detail:error}))));
    safe(push().addListener("pushNotificationActionPerformed",event=>global.dispatchEvent(new CustomEvent("copa:push-action",{detail:event}))));
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",installSettingsControls,{once:true});
  else installSettingsControls();
})(window);
