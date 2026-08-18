/* Google Play Games v2 bridge. Notification delivery lives in
 * src/runtime/notifications.js so Play Games sign-in and notification consent
 * remain separate user choices. */
(function (global) {
  "use strict";
  const achievementIds = Object.freeze(Object.assign({
    career_completed: "CgkI88Od7K0IEAIQAQ", cup_won: "CgkI88Od7K0IEAIQAA", unbeaten_champion: "CgkI88Od7K0IEAIQAw", low_budget_champion: "CgkI88Od7K0IEAIQBA",
    three_countries: "CgkI88Od7K0IEAIQAg", five_formations: "CgkI88Od7K0IEAIQBQ", world_top_100: "CgkI88Od7K0IEAIQBg", five_careers: "CgkI88Od7K0IEAIQBw",
    all_chairmen: "CgkI88Od7K0IEAIQCA", first_match_won: "CgkI88Od7K0IEAIQCQ"
  }, global.COPA_PLAY_GAMES_ACHIEVEMENTS || {}));
  const plugin = () => global.Capacitor && global.Capacitor.Plugins && global.Capacitor.Plugins.CopaPlayGames;
  const push = () => global.Capacitor && global.Capacitor.Plugins && global.Capacitor.Plugins.PushNotifications;
  const safe = promise => Promise.resolve(promise).catch(() => null);
  const api = {
    ids: achievementIds,
    available: () => !!plugin(),
    signIn: () => plugin() ? safe(plugin().signIn()) : Promise.resolve(null),
    isAuthenticated: () => plugin() ? safe(plugin().isAuthenticated()) : Promise.resolve({ isAuthenticated: false }),
    unlock: key => { const id = achievementIds[key]; return id && plugin() ? safe(plugin().unlockAchievement({ achievementId: id })) : Promise.resolve(null); },
    increment: (key, steps) => { const id = achievementIds[key]; return id && plugin() ? safe(plugin().incrementAchievement({ achievementId: id, steps: Math.max(1, Number(steps) || 1) })) : Promise.resolve(null); },
    progress: (key, target, storageKey) => {
      const value = Math.max(0, Number(target) || 0), keyName = storageKey || (`copa_pgs_progress_${key}`); let previous = 0;
      try { previous = Math.max(0, Number(localStorage.getItem(keyName)) || 0); } catch (_) {}
      if (value <= previous) return Promise.resolve(null);
      try { localStorage.setItem(keyName, String(value)); } catch (_) {}
      return api.increment(key, value - previous);
    },
    showAchievements: () => plugin() ? safe(plugin().showAchievements()) : Promise.resolve(null),
    report: event => ({ career_completed: "career_completed", cup_won: "cup_won", first_match_won: "first_match_won" }[event] ? api.unlock(event) : Promise.resolve(null)),
  };
  const center = () => global.CopaNotificationCenter;
  const notifications = {
    available: () => !!push() || !!(center() && (center().nativeAvailable || center().pushAvailable)),
    checkPermission: () => center() && typeof center().checkLocalPermission === "function" ? center().checkLocalPermission().catch(() => ({ granted: false, permission: "denied" })) : Promise.resolve({ granted: false, permission: "unsupported" }),
    requestPermission: async () => {
      if (center() && typeof center().requestPermission === "function") return center().requestPermission({ local: true, remote: true });
      if (!push()) return { granted: false, reason: "unsupported" };
      const permission = await safe(push().requestPermissions());
      if (!permission || permission.receive !== "granted") return { granted: false, reason: "denied" };
      await safe(push().register()); return { granted: true };
    },
    register: () => center() && typeof center().registerRemote === "function" ? center().registerRemote() : (push() ? safe(push().register()).then(() => ({ granted: true })) : Promise.resolve({ granted: false, reason: "unsupported" })),
    unregister: () => center() && typeof center().unregisterRemote === "function" ? center().unregisterRemote() : Promise.resolve(false),
    schedule: (event, options) => center() && typeof center().schedule === "function" ? center().schedule(event, options) : Promise.resolve({ ok: false, reason: "unsupported" }),
    publish: (event, options) => center() && typeof center().publish === "function" ? center().publish(event, options) : Promise.resolve({ ok: false, reason: "unsupported" }),
  };
  function installPlayGamesControl() {
    const drop = document.getElementById("settingsDrop");
    if (!drop || document.getElementById("copaPlayGamesBtn")) return;
    const group = document.createElement("div"); group.id = "copaPlayGamesSettings"; group.className = "sd-group";
    const button = document.createElement("button"); button.id = "copaPlayGamesBtn"; button.type = "button"; button.className = "sdbtn sd-full";
    const update = () => { button.textContent = global.LANG === "en" ? "PLAY GAMES" : "PLAY GAMES'E GİRİŞ"; };
    update();
    button.addEventListener("click", async () => { const result = await api.signIn(); if (result && result.isAuthenticated === false && typeof global.showToast === "function") global.showToast(global.LANG === "en" ? "Play Games sign-in was not completed." : "Play Games girişi tamamlanmadı.", { type: "warning" }); });
    group.appendChild(button); drop.appendChild(group); if (typeof global.compactSettingsLayout === "function") global.compactSettingsLayout();
    global.addEventListener("copa:language-changed", update);
  }
  const exposed = Object.assign({}, center() || {}, notifications);
  global.CopaPlayGames = Object.freeze(api);
  global.CopaNotifications = Object.freeze(exposed);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", installPlayGamesControl, { once: true }); else installPlayGamesControl();
})(window);
