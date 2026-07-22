/* copa.life Service Worker - ghost2 / automatic per-deploy refresh */
const CACHE = "copa-ghost2-__COPA_BUILD_VERSION__";
const PRECACHE = [
  "/",
  "/index.html",
  "/faq.html",
  "/support.html",
  "/manifest.json",
  "/src/styles/base.css",
  "/src/styles/layout.css",
  "/src/styles/playerProfiles.css",
  "/src/styles/cards.css",
  "/src/styles/match.css",
  "/src/styles/finalReplay.css",
  "/src/styles/mobileExperience.css",
  "/src/styles/faq.css",
  "/src/styles/tournament.css",
  "/src/data/i18n.js",
  "/src/data/players.js",
  "/src/data/players_england.js",
  "/src/data/players_spain.js",
  "/src/data/players_italy.js",
  "/src/data/players_germany.js",
  "/src/data/players_japan.js",
  "/assets/data/copa/player_profiles.json",
  "/src/data/formations.js",
  "/src/data/opponents.js",
  "/src/data/logos.js",
  "/src/data/kits.js",
  "/src/core/clubName.js",
  "/src/core/squad.js",
  "/src/game/generate.js",
  "/src/balance/config.js",
  "/src/balance/power.js",
  "/src/balance/economy.js",
  "/src/balance/telemetry.js",
  "/src/balance/finalCalibration.js",
  "/src/balance/difficulty.js",
  "/src/balance/rewards.js",
  "/src/cards/cardDefs.js",
  "/src/cards/cardEffects.js",
  "/src/cards/cardBalance.js",
  "/src/cards/cardInventory.js",
  "/src/audio/sfx.js",
  "/src/online/ghostClubs.js",
  "/src/state/saveLoad.js",
  "/src/state/metaState.js",
  "/src/state/gameState.js",
  "/src/state/runPersistence.js",
  "/src/state/finalSimPersistence.js",
  "/src/state/penaltyPersistence.js",
  "/src/game/penaltyCore.js",
  "/src/state/runLifecycle.js",
  "/src/state/diagnostics.js",
  "/src/tournament/tournamentEngine.js",
  "/src/tournament/tournamentUI.js",
  "/src/tournament/tournamentRuntime.js",
  "/src/tournament/matchResolver.js",
  "/src/runtime/lazyAssets.js",
  "/src/runtime/finalReplay.js",
  "/src/ui/hub.js",
  "/src/ui/playerProfiles.js",
  "/src/ui/mobileExperience.js",
  "/src/ui/lastMatchReport.js",
  "/src/ui/howtoGuide.js",
  "/src/ui/fixtureRoad.js",
  "/src/ui/ghostRunResult.js",
  "/src/ui/runNarrative.js",
  "/src/ui/faq.js",
  "/src/styles/howtoGuide.css",
  "/src/styles/fixtureRoad.css",
  "/src/styles/ghostRunResult.css",
  "/src/sim/finalSimCore.js",
  "/src/sim/finalSim.js",
  "/favicon.svg",
  "/favicon-16x16.png",
  "/favicon-32x32.png",
  "/favicon-48x48.png",
  "/apple-touch-icon.png",
  "/web-app-icon-192.png",
  "/web-app-icon-512.png",
  "/site.webmanifest",
  "/assets/mascot.webp",
  "/assets/icons/cl.png",
  "/assets/icons/copa.png",
  "/assets/flags/TR.svg",
  "/assets/flags/IT.svg",
  "/assets/flags/ENGLAND.svg",
  "/assets/flags/GB.svg",
  "/assets/flags/ES.svg",
  "/assets/flags/DE.svg",
  "/assets/flags/JP.svg"
];

const NETWORK_FIRST = [".html", ".js", ".css"];
const PLAYER_PROFILE_PATH = "/assets/data/copa/player_profiles.json";

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE)
    .then(c => Promise.all(PRECACHE.map(url => c.add(url).catch(() => null))))
    .then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  const url = e.request.url;
  const parsedUrl = new URL(url);
  if (parsedUrl.pathname.endsWith(PLAYER_PROFILE_PATH)) {
    e.respondWith(
      fetch(e.request).then(res => {
        if (!res || !res.ok) throw new Error("Player profile network response failed");
        if (res.type !== "opaque") {
          const clone = res.clone();
          e.waitUntil(caches.open(CACHE).then(c => c.put(e.request, clone)));
        }
        return res;
      }).catch(() => caches.match(e.request, { ignoreSearch: true }).then(cached => {
        if (cached) return cached;
        throw new Error("Player profile data unavailable");
      }))
    );
    return;
  }
  const isNetworkFirst = NETWORK_FIRST.some(ext => url.split("?")[0].endsWith(ext)) || url.endsWith("/");

  if (isNetworkFirst) {
    const freshRequest=new Request(e.request,{cache:"no-store"});
    e.respondWith(
      fetch(freshRequest).then(res => {
        if (res && res.status === 200 && res.type !== "opaque") {
          const clone = res.clone();
          e.waitUntil(caches.open(CACHE).then(c => c.put(e.request, clone)));
        }
        return res;
      }).catch(async() => {
        const cached=await caches.match(e.request,{ignoreSearch:true});
        if(cached)return cached;
        return new Response("Offline",{status:503,headers:{"content-type":"text/plain; charset=utf-8"}});
      })
    );
  } else {
    e.respondWith(
      caches.match(e.request,{ignoreSearch:true}).then(cached => {
        if (cached) return cached;
        return fetch(e.request).then(res => {
          if (res && res.status === 200 && res.type !== "opaque") {
            const clone = res.clone();
            e.waitUntil(caches.open(CACHE).then(c => c.put(e.request, clone)));
          }
          return res;
        });
      })
    );
  }
});
