/* Copa Life notification center.
 * One event model for in-app feedback, the persistent feed, native local/push
 * notifications and the web service-worker fallback. Safe no-op on unsupported
 * platforms and deliberately never asks for permission automatically.
 */
(function (global) {
  "use strict";

  const PREF_KEY = "copa_notification_preferences_v1";
  const TOKEN_KEY = "copa_push_token_v1";
  const EVENT_HISTORY_KEY = "copa_notification_events_v1";
  const SCHEDULED_KEY = "copa_scheduled_notifications_v1";
  const HISTORY_KEY = "copa_notification_history_v1";
  const CATEGORIES = Object.freeze(["match", "injury", "transfer", "reward", "tournament", "system"]);
  const DEFAULTS = Object.freeze({
    enabled: true,
    categories: { match: true, injury: true, transfer: true, reward: true, tournament: true, system: true },
    quietEnabled: false,
    quietStart: "22:00",
    quietEnd: "08:00",
  });
  const copy = () => global.LANG === "en" ? {
    header: "NOTIFICATIONS",
    on: "NOTIFICATIONS ON",
    off: "NOTIFICATIONS OFF",
    enable: "ENABLE NOTIFICATIONS",
    disable: "DISABLE NOTIFICATIONS",
    hint: "Match, injury, transfer and reward alerts.",
    permissionDenied: "Notification permission was denied in system settings.",
    unsupported: "Notifications are not available on this device.",
    test: "Test notification",
    testBody: "Copa Life notification channel is working.",
    testSent: "Test notification sent.",
    categories: "ALERT TYPES",
    quiet: "QUIET HOURS",
    quietOn: "Quiet hours on",
    quietOff: "Quiet hours off",
    categoriesLabel: { match: "Matches", injury: "Injuries", transfer: "Transfers", reward: "Rewards", tournament: "Tournament", system: "System" },
  } : {
    header: "BİLDİRİMLER",
    on: "BİLDİRİMLER AÇIK",
    off: "BİLDİRİMLER KAPALI",
    enable: "BİLDİRİMLERİ AÇ",
    disable: "BİLDİRİMLERİ KAPAT",
    hint: "Maç, sakatlık, transfer ve ödül uyarıları.",
    permissionDenied: "Bildirim izni sistem ayarlarından reddedildi.",
    unsupported: "Bu cihazda bildirim kullanılamıyor.",
    test: "Test bildirimi",
    testBody: "Copa Life bildirim kanalı çalışıyor.",
    testSent: "Test bildirimi gönderildi.",
    categories: "BİLDİRİM TÜRLERİ",
    quiet: "SESSİZ SAATLER",
    quietOn: "Sessiz saatler açık",
    quietOff: "Sessiz saatler kapalı",
    categoriesLabel: { match: "Maçlar", injury: "Sakatlıklar", transfer: "Transferler", reward: "Ödüller", tournament: "Turnuva", system: "Sistem" },
  };
  const read = (key, fallback) => {
    try {
      const value = localStorage.getItem(key);
      return value == null ? fallback : JSON.parse(value);
    } catch (_) { return fallback; }
  };
  const write = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch (_) { return false; } };
  const cloneDefaults = () => ({ enabled: DEFAULTS.enabled, categories: Object.assign({}, DEFAULTS.categories), quietEnabled: DEFAULTS.quietEnabled, quietStart: DEFAULTS.quietStart, quietEnd: DEFAULTS.quietEnd });
  let preferences = Object.assign(cloneDefaults(), read(PREF_KEY, {}));
  preferences.categories = Object.assign({}, DEFAULTS.categories, preferences.categories || {});
  let recentIds = Array.isArray(read(HISTORY_KEY, [])) ? read(HISTORY_KEY, []) : [];
  let eventHistory = Array.isArray(read(EVENT_HISTORY_KEY, [])) ? read(EVENT_HISTORY_KEY, []) : [];
  let scheduledIds = Array.isArray(read(SCHEDULED_KEY, [])) ? read(SCHEDULED_KEY, []) : [];
  let pendingAction = null;
  let initDone = false;

  function nativePlugin(name) {
    const cap = global.Capacitor;
    if (!cap) return null;
    const plugins = cap.Plugins || {};
    if (plugins[name]) return plugins[name];
    try { return typeof cap.registerPlugin === "function" ? cap.registerPlugin(name) : null; } catch (_) { return null; }
  }
  function localPlugin() { return nativePlugin("LocalNotifications"); }
  function pushPlugin() { return nativePlugin("PushNotifications"); }
  function isNative() { return !!global.COPA_IS_NATIVE || ["android", "ios"].includes(global.COPA_PLATFORM); }
  function isWebNotificationAvailable() { return typeof global.Notification !== "undefined"; }
  function isHidden() { return typeof document !== "undefined" && document.visibilityState === "hidden"; }
  function text(value) { return String(value == null ? "" : value).replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim(); }
  function hash(value) { let result = 2166136261; for (const ch of String(value)) result = Math.imul(result ^ ch.charCodeAt(0), 16777619); return (result >>> 0) || 1; }
  function idFor(event) { return String(event.id || `notification-${hash(`${event.type || "system"}|${event.title || ""}|${event.body || ""}`)}`); }
  function categoryFor(event) { return CATEGORIES.includes(event.category) ? event.category : (CATEGORIES.includes(event.type) ? event.type : "system"); }
  function normalize(event) {
    const source = event || {};
    const priority = ["critical", "high", "normal", "low"].includes(source.priority) ? source.priority : "normal";
    return {
      id: idFor(source), type: String(source.type || "system"), category: categoryFor(source), priority,
      title: text(source.title || "Copa Life"), body: text(source.body || source.message || ""),
      deepLink: String(source.deepLink || source.url || ""), groupKey: String(source.groupKey || source.category || source.type || "system"),
      at: source.at instanceof Date ? source.at : (source.at ? new Date(source.at) : null),
      createdAt: source.createdAt || new Date().toISOString(), data: source.data && typeof source.data === "object" ? source.data : {},
    };
  }
  function savePrefs() { write(PREF_KEY, preferences); global.dispatchEvent(new CustomEvent("copa:notification-preferences", { detail: getPreferences() })); refreshSettings(); }
  function getPreferences() { return { enabled: !!preferences.enabled, categories: Object.assign({}, preferences.categories), quietEnabled: !!preferences.quietEnabled, quietStart: preferences.quietStart, quietEnd: preferences.quietEnd }; }
  function categoryEnabled(event) { return preferences.enabled && preferences.categories[categoryFor(event)] !== false; }
  function minutes(value) { const match = String(value || "").match(/^(\d{1,2}):(\d{2})$/); return match ? Number(match[1]) * 60 + Number(match[2]) : 0; }
  function inQuietHours(date = new Date()) {
    if (!preferences.quietEnabled) return false;
    const now = date.getHours() * 60 + date.getMinutes(), start = minutes(preferences.quietStart), end = minutes(preferences.quietEnd);
    return start === end ? false : start < end ? now >= start && now < end : now >= start || now < end;
  }
  function shouldDeliverNative(event) { return categoryEnabled(event) && (event.priority === "critical" || event.priority === "high" || !inQuietHours()); }
  function remember(id) { if (!id || recentIds.includes(id)) return false; recentIds = [id, ...recentIds].slice(0, 80); write(HISTORY_KEY, recentIds); return true; }
  function toastType(event) { return event.priority === "critical" || event.priority === "high" ? "warning" : event.type === "reward" ? "info" : "default"; }
  function record(source, channel) {
    const event = normalize(source);
    if (event.body && !eventHistory.some(item => item && item.id === event.id)) {
      eventHistory = [Object.assign({}, event, { at: event.at ? event.at.toISOString() : null }), ...eventHistory].slice(0, 80);
      write(EVENT_HISTORY_KEY, eventHistory);
    }
    global.dispatchEvent(new CustomEvent("copa:notification-recorded", { detail: { event, channel: channel || "in-app" } })); return event;
  }
  function getHistory(category) {
    const key = String(category || "").trim();
    return eventHistory.filter(item => !key || categoryFor(item) === key).map(item => Object.assign({}, item));
  }
  function captureToast(message, options) { return record({ id: options && options.id, type: options && options.type || "system", priority: options && options.priority || "normal", body: message }, "toast"); }
  function captureFeed(source) {
    const event = record(source, "feed");
    if (isHidden() && event.body) schedule(event, { immediate: true }).catch(() => null);
    return event;
  }

  function renderToast(event, options) {
    if (typeof global.showToast !== "function") return false;
    global.showToast(event.body, { type: toastType(event), duration: options && options.duration || (event.priority === "critical" ? 5200 : 2600), id: event.id, priority: event.priority, skipRecord: true });
    return true;
  }
  async function postToServiceWorker(event) {
    if (!navigator.serviceWorker) return false;
    const notification = { title: event.title, body: event.body, tag: event.id, data: { deepLink: event.deepLink, ...event.data } };
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: "copa:show-local-notification", notification });
      return true;
    }
    if (!isWebNotificationAvailable() || global.Notification.permission !== "granted") return false;
    const registration = await Promise.resolve(navigator.serviceWorker.ready).catch(() => null);
    if (!registration || typeof registration.showNotification !== "function") return false;
    await Promise.resolve(registration.showNotification(notification.title, notification)).catch(() => null);
    return true;
  }
  async function nativePermission() {
    const plugin = localPlugin();
    if (plugin && typeof plugin.checkPermissions === "function") return (await Promise.resolve(plugin.checkPermissions()).catch(() => ({ display: "denied" }))).display;
    if (isWebNotificationAvailable()) return global.Notification.permission;
    return "denied";
  }
  async function checkLocalPermission() {
    const permission = await nativePermission();
    return { granted: permission === "granted", permission };
  }
  async function requestLocalPermission() {
    const plugin = localPlugin();
    if (plugin && typeof plugin.requestPermissions === "function") {
      const result = await Promise.resolve(plugin.requestPermissions()).catch(() => ({ display: "denied" }));
      if (result && result.display === "granted") { await ensureChannels(); return { granted: true, permission: result.display, source: "native" }; }
      return { granted: false, permission: result && result.display || "denied", source: "native" };
    }
    if (isWebNotificationAvailable()) {
      const permission = global.Notification.permission === "default" ? await global.Notification.requestPermission() : global.Notification.permission;
      return { granted: permission === "granted", permission, source: "web" };
    }
    return { granted: false, permission: "unsupported", source: "none" };
  }
  async function ensureChannels() {
    const plugins = [localPlugin(), pushPlugin()].filter(plugin => plugin && typeof plugin.createChannel === "function");
    if (!plugins.length) return false;
    const channels = [
      { id: "copa-events", name: "Copa Life", description: "Maç, transfer ve oyun gelişmeleri", importance: 3, visibility: 1, vibration: true, lights: true, lightColor: "#F24A28" },
      { id: "copa-critical", name: "Copa Life · Önemli", description: "Kritik oyun bildirimleri", importance: 4, visibility: 1, vibration: true, lights: true, lightColor: "#F24A28" },
    ];
    await Promise.all(plugins.flatMap(plugin => channels.map(channel => Promise.resolve(plugin.createChannel(channel)).catch(() => null))));
    return true;
  }
  function nativeSchema(event, immediate) {
    const safeId = Math.max(1, hash(event.id));
    const at = immediate ? new Date(Date.now() + 250) : (event.at && event.at.getTime() > Date.now() ? event.at : null);
    const item = { id: safeId, title: event.title || "Copa Life", body: event.body, channelId: event.priority === "critical" || event.priority === "high" ? "copa-critical" : "copa-events", threadIdentifier: event.groupKey, group: event.groupKey, extra: { notificationId: event.id, deepLink: event.deepLink, ...event.data }, interruptionLevel: event.priority === "critical" || event.priority === "high" ? "active" : "passive" };
    if (at) item.schedule = { at, allowWhileIdle: true };
    return item;
  }
  async function schedule(event, options) {
    const normalized = normalize(event); if (!normalized.body || !categoryEnabled(normalized)) return { ok: false, reason: "filtered" };
    if (!shouldDeliverNative(normalized)) return { ok: false, reason: "quiet-hours" };
    const at = normalized.at && normalized.at.getTime() > Date.now() ? normalized.at : null;
    const opts = options || {};
    if (!at && !isHidden() && !opts.force) return { ok: false, reason: "foreground-suppressed" };
    if (isNative() && localPlugin() && typeof localPlugin().schedule === "function") {
      const permission = await nativePermission(); if (permission !== "granted") return { ok: false, reason: "permission" };
      const result = await Promise.resolve(localPlugin().schedule({ notifications: [nativeSchema(normalized, !at)] })).catch(error => ({ error: String(error && error.message || error) }));
      if (result && !result.error) { scheduledIds = [...new Set([...scheduledIds, hash(normalized.id)])].slice(-80); write(SCHEDULED_KEY, scheduledIds); return { ok: true, channel: "native", result }; }
      return { ok: false, reason: "native-schedule", error: result && result.error };
    }
    if (isHidden() && await postToServiceWorker(normalized)) return { ok: true, channel: "service-worker" };
    if (isHidden() && isWebNotificationAvailable() && global.Notification.permission === "granted") { new global.Notification(normalized.title || "Copa Life", { body: normalized.body, tag: normalized.id, data: { deepLink: normalized.deepLink, ...normalized.data } }); return { ok: true, channel: "web" }; }
    return { ok: false, reason: "unsupported" };
  }
  async function publish(source, options) {
    const event = normalize(source); if (!event.body || !categoryEnabled(event)) return { ok: false, reason: "filtered", event };
    if (!remember(event.id)) return { ok: false, reason: "duplicate", event };
    record(event, "center");
    const opts = options || {};
    if (opts.toast !== false && !isHidden()) renderToast(event, opts);
    if (opts.native || (isHidden() && !opts.toastOnly)) await schedule(event, { immediate: !event.at, force: !!opts.force });
    return { ok: true, event };
  }
  async function testNotification() { return publish({ id: `test-${Date.now()}`, type: "system", title: copy().test, body: copy().testBody, priority: "normal", deepLink: "settings/notifications" }, { native: true, force: true }); }
  async function registerRemote() {
    const plugin = pushPlugin(); if (!plugin || typeof plugin.requestPermissions !== "function") return { granted: false, reason: "unsupported" };
    const permission = await Promise.resolve(plugin.requestPermissions()).catch(() => ({ receive: "denied" }));
    if (!permission || permission.receive !== "granted") return { granted: false, reason: "denied", permission: permission && permission.receive };
    await ensureChannels();
    await Promise.resolve(plugin.register()).catch(() => null); return { granted: true, permission: permission.receive };
  }
  async function unregisterRemote() {
    const plugin = pushPlugin(); if (plugin && typeof plugin.unregister === "function") await Promise.resolve(plugin.unregister()).catch(() => null);
    const record = read(TOKEN_KEY, null), url = pushTokenEndpoint();
    if (record && record.token && url && typeof fetch === "function") {
      await fetch(url, { method: "DELETE", headers: Object.assign({ "content-type": "application/json" }, clientHeaders()), credentials: "include", body: JSON.stringify({ token: record.token }) }).catch(() => null);
    }
    try { localStorage.removeItem(TOKEN_KEY); } catch (_) {}
    return true;
  }
  function pushTokenEndpoint() {
    const explicit = String(global.COPA_PUSH_TOKEN_ENDPOINT || "").trim();
    if (explicit) return explicit.replace(/\/$/, "");
    const meta = document.querySelector('meta[name="copa-push-token-api"]');
    return String(meta && meta.content || "").trim().replace(/\/$/, "");
  }
  function clientHeaders() {
    let value = "";
    try { value = localStorage.getItem("copa_ghost_client_id_v1") || ""; } catch (_) {}
    return /^GCL-[A-Z0-9]{8,40}$/.test(value) ? { "x-copa-client": value } : {};
  }
  async function syncToken(endpoint) {
    const record = read(TOKEN_KEY, null), url = String(endpoint || pushTokenEndpoint()).trim();
    if (!record || !record.token || !url || typeof fetch !== "function") return { ok: false, reason: url ? "token-missing" : "endpoint-not-configured" };
    const appVersion = document.querySelector('meta[name="copa-build-version"]')?.content || "";
    const locale = document.documentElement.lang || global.LANG || "tr";
    const response = await fetch(url, { method: "POST", headers: Object.assign({ "content-type": "application/json" }, clientHeaders()), credentials: "include", body: JSON.stringify({ token: record.token, platform: record.platform, updatedAt: record.updatedAt, appVersion, locale }) }).catch(error => ({ error: String(error && error.message || error) }));
    if (!response || response.error || !response.ok) return { ok: false, reason: response && response.error || `http-${response && response.status || 0}` };
    return { ok: true };
  }
  function storeToken(token) { const value = String(token || "").trim(); if (!value) return false; write(TOKEN_KEY, { token: value, platform: global.COPA_PLATFORM || "web", updatedAt: new Date().toISOString() }); global.dispatchEvent(new CustomEvent("copa:push-token", { detail: { token: value, platform: global.COPA_PLATFORM || "web" } })); syncToken().catch(() => null); return true; }
  function parseAction(payload) {
    const source = payload && (payload.notification || payload.detail || payload) || {};
    const notification = source.notification || source;
    const data = notification.data || notification.extra || source.data || {};
    return { deepLink: String(data.deepLink || data.url || notification.link || source.deepLink || ""), data };
  }
  function routeAction(action) {
    const deepLink = String(action && action.deepLink || "").replace(/^copa:\/\//, "").replace(/^\//, ""); if (!deepLink) return false;
    const parts = deepLink.split(/[/?#]/).filter(Boolean), route = parts[0] === "hub" ? (parts[1] || "match") : parts[0];
    const navigate = () => {
      if (["match", "market", "training", "sidefield", "career"].includes(route) && global.CopaMobileShell && typeof global.CopaMobileShell.activateRoute === "function") { global.CopaMobileShell.activateRoute(route); return true; }
      if (route === "notifications" && typeof global.toggleSettings === "function") { global.toggleSettings(); return true; }
      const target = route === "injury" ? document.getElementById("injbar") : route === "match" ? document.getElementById("playBtn") : null;
      if (target) { target.scrollIntoView({ block: "center", behavior: "smooth" }); return true; }
      return false;
    };
    if (document.readyState === "loading" || !document.body) { pendingAction = action; return true; }
    if (navigate()) { pendingAction = null; return true; }
    pendingAction = action; return true;
  }
  function refreshSettings() {
    const root = document.getElementById("copaNotificationSettings"); if (!root) return;
    const c = copy(), button = root.querySelector("[data-notification-toggle]"), status = root.querySelector("[data-notification-status]");
    if (button) button.textContent = preferences.enabled ? c.disable : c.enable;
    if (status) status.textContent = preferences.enabled ? c.on : c.off;
    const header = root.querySelector(".sd-hdr"); if (header) header.childNodes[0].textContent = `${c.header} `;
    const hint = root.querySelector(".notification-settings-hint"); if (hint) hint.textContent = c.hint;
    const title = root.querySelector(".notification-category-title"); if (title) title.textContent = c.categories;
    root.querySelectorAll("input[data-notification-category]").forEach(input => { const label = input.parentElement && input.parentElement.querySelector("span"); if (label) label.textContent = c.categoriesLabel[input.dataset.notificationCategory]; });
    const test = root.querySelector("[data-notification-test]"); if (test) test.textContent = c.test;
    root.querySelectorAll("input[data-notification-category]").forEach(input => { input.checked = preferences.categories[input.dataset.notificationCategory] !== false; });
    const quiet = root.querySelector("[data-notification-quiet]"); if (quiet) { quiet.checked = !!preferences.quietEnabled; quiet.nextElementSibling.textContent = preferences.quietEnabled ? c.quietOn : c.quietOff; }
  }
  function installSettings() {
    const container = document.getElementById("settingsDrop"); if (!container || document.getElementById("copaNotificationSettings")) return;
    const c = copy(), group = document.createElement("div"); group.id = "copaNotificationSettings"; group.className = "sd-group copa-notification-settings";
    group.innerHTML = `<div class="sd-hdr">${c.header} <span data-notification-status></span></div><p class="notification-settings-hint">${c.hint}</p><button type="button" class="sdbtn sd-full" data-notification-toggle>${preferences.enabled ? c.disable : c.enable}</button><div class="notification-category-title">${c.categories}</div><div class="notification-category-grid">${CATEGORIES.map(key => `<label class="notification-check"><input type="checkbox" data-notification-category="${key}"><span>${c.categoriesLabel[key]}</span></label>`).join("")}</div><label class="notification-check"><input type="checkbox" data-notification-quiet><span>${preferences.quietEnabled ? c.quietOn : c.quietOff}</span></label><button type="button" class="sdbtn sd-full" data-notification-test>${c.test}</button>`;
    group.querySelector("[data-notification-toggle]").addEventListener("click", async () => {
      if (preferences.enabled) { preferences.enabled = false; await unregisterRemote(); savePrefs(); return; }
      const result = await requestPermission({ local: true, remote: isNative() });
      if (result.granted) { preferences.enabled = true; savePrefs(); } else if (typeof global.showToast === "function") global.showToast(result.reason === "unsupported" ? c.unsupported : c.permissionDenied, { type: "warning" });
    });
    group.querySelectorAll("input[data-notification-category]").forEach(input => input.addEventListener("change", () => { preferences.categories[input.dataset.notificationCategory] = input.checked; savePrefs(); }));
    const quiet = group.querySelector("[data-notification-quiet]"); quiet.addEventListener("change", () => { preferences.quietEnabled = quiet.checked; savePrefs(); });
    group.querySelector("[data-notification-test]").addEventListener("click", async () => { const result = await testNotification(); if (result.ok && typeof global.showToast === "function") global.showToast(c.testSent, { type: "info" }); });
    container.appendChild(group); if (typeof global.compactSettingsLayout === "function") global.compactSettingsLayout(); refreshSettings();
  }
  async function requestPermission(options) {
    const opts = Object.assign({ local: true, remote: false }, options || {}); const local = opts.local ? await requestLocalPermission() : { granted: true };
    if (!local.granted) return { granted: false, reason: local.permission === "unsupported" ? "unsupported" : "denied", local };
    const remote = opts.remote ? await registerRemote() : { granted: true, skipped: true }; return { granted: local.granted, local, remote, reason: local.granted ? (remote.granted ? "granted" : "local-only") : (local.permission === "unsupported" ? "unsupported" : "denied") };
  }
  function init() {
    if (initDone) return; initDone = true;
    try { const deepLink = new URL(global.location.href).searchParams.get("copa-deep-link"); if (deepLink) pendingAction = { deepLink }; } catch (_) {}
    const push = pushPlugin(), local = localPlugin();
    if (push && typeof push.addListener === "function") {
      Promise.resolve(push.addListener("registration", token => storeToken(token && token.value))).catch(() => null);
      Promise.resolve(push.addListener("registrationError", error => global.dispatchEvent(new CustomEvent("copa:push-error", { detail: error })))).catch(() => null);
      Promise.resolve(push.addListener("pushNotificationReceived", notification => { global.dispatchEvent(new CustomEvent("copa:push-received", { detail: notification })); if (!isHidden()) publish({ id: `push-${notification && notification.id || Date.now()}`, type: notification && notification.data && notification.data.type || "system", title: notification && notification.title, body: notification && notification.body, deepLink: notification && notification.link, data: notification && notification.data }, { toast: true }); })).catch(() => null);
      Promise.resolve(push.addListener("pushNotificationActionPerformed", action => routeAction(parseAction(action)))).catch(() => null);
    }
    if (local && typeof local.addListener === "function") Promise.resolve(local.addListener("localNotificationActionPerformed", action => routeAction(parseAction(action)))).catch(() => null);
    global.addEventListener("copa:push-action", event => routeAction(parseAction(event.detail)));
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => { installSettings(); if (pendingAction) routeAction(pendingAction); }, { once: true }); else { installSettings(); if (pendingAction) routeAction(pendingAction); }
    global.addEventListener("copa:native-resume", () => { if (pendingAction) routeAction(pendingAction); });
  }
  const api = {
    categories: CATEGORIES,
    getPreferences, setEnabled(value) { preferences.enabled = !!value; savePrefs(); return preferences.enabled; },
    setCategory(category, value) { if (CATEGORIES.includes(category)) { preferences.categories[category] = !!value; savePrefs(); } return getPreferences(); },
    setQuietHours(value, start, end) { preferences.quietEnabled = !!value; if (start) preferences.quietStart = String(start); if (end) preferences.quietEnd = String(end); savePrefs(); return getPreferences(); },
    captureToast, captureFeed, publish, schedule, requestPermission, requestLocalPermission, checkLocalPermission, registerRemote, unregisterRemote, syncToken, getHistory,
    storeToken, routeAction, testNotification, refreshSettings, get nativeAvailable() { return !!localPlugin(); }, get pushAvailable() { return !!pushPlugin(); },
  };
  global.CopaNotificationCenter = Object.freeze(api);
  global.CopaNotifications = global.CopaNotifications || Object.freeze(api);
  init();
})(window);
