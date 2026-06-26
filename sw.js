/* copa.life Service Worker — offline cache */
const CACHE = "copa-v1";
const PRECACHE = [
  "/",
  "/index.html",
  "/manifest.json",
  "/src/styles/base.css",
  "/src/styles/layout.css",
  "/src/styles/cards.css",
  "/src/styles/match.css",
  "/src/data/i18n.js",
  "/src/data/players.js",
  "/src/data/players_england.js",
  "/src/data/players_spain.js",
  "/src/data/players_italy.js",
  "/src/data/players_germany.js",
  "/src/data/formations.js",
  "/src/data/opponents.js",
  "/src/data/logos.js",
  "/src/data/kits.js",
  "/src/core/squad.js",
  "/src/game/generate.js",
  "/src/balance/config.js",
  "/src/state/metaState.js",
  "/src/state/gameState.js",
  "/src/ui/hub.js",
  "/src/sim/finalSim.js",
  "/assets/mascot.jpg",
  "/assets/icons/cl.png",
  "/assets/icons/copa.png",
  "/assets/flags/TR.png",
  "/assets/flags/IT.png",
  "/assets/flags/ENGLAND.png",
  "/assets/flags/ES.png",
  "/assets/flags/DE.png"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(PRECACHE).catch(()=>{})));
  self.skipWaiting();
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (res && res.status === 200 && res.type !== "opaque") {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => cached);
    })
  );
});
