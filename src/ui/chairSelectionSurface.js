(() => {
  const originalBuildChairButtons = window.buildChairButtons;
  if (typeof originalBuildChairButtons !== "function" || typeof chairProfileSrc !== "function") return;

  const chairTypes = {
    babacan: { tr: "Ekonomi", en: "Economy" }, leydi: { tr: "Dengeli", en: "Balanced" },
    pinti: { tr: "Ekonomi", en: "Economy" }, sansasyoncu: { tr: "Risk", en: "Risk" },
    torpilci: { tr: "Risk", en: "Risk" }, cilgin: { tr: "Kaos", en: "Chaos" }
  };
  const chairSurfaceCopy = {
    tr: { profile: "CHAIRMAN PROFILE", start: "BAŞLANGIÇ KASASI", debt: "BORÇ LİMİTİ", advantage: "ANA AVANTAJ", trigger: "TETİKLEYİCİ", redline: "KIRMIZI ÇİZGİ", select: "BAŞKANI SEÇ", prev: "← ÖNCEKİ", next: "SONRAKİ →", cards: "BAŞKANLAR", hint: "Aktif kartı incele · sürükleyerek keşfet" },
    en: { profile: "CHAIRMAN PROFILE", start: "STARTING CASH", debt: "DEBT LIMIT", advantage: "MAIN ADVANTAGE", trigger: "TRIGGER", redline: "RED LINE", select: "SELECT CHAIRMAN", prev: "← PREVIOUS", next: "NEXT →", cards: "CHAIRMEN", hint: "Inspect the active card · drag to explore" }
  };
  const textFor = (value, lang) => value && typeof value === "object" ? (value[lang] || value.en || value.tr || "") : String(value || "");
  const chairIds = () => CHAIRMEN.filter(ch => unlockedChairs.includes(ch.id)).map(ch => ch.id);
  const setSurfaceText = (selector, value, html = false) => { const node = document.querySelector(selector); if (node) html ? node.innerHTML = value : node.textContent = value; };

  function syncChairSelectionSurface(id = selectedChairId || chairIds()[0]) {
    const surface = document.getElementById("chairSelectionSurface"), cd = L().chair && L().chair[id];
    if (!surface || !cd) return;
    const lang = LANG === "tr" ? "tr" : "en", ids = chairIds(), allIds = CHAIRMEN.map(ch => ch.id), index = Math.max(0, allIds.indexOf(id)), total = allIds.length || 1, fx = _CHAIR_FX[id] || { pros: { tr: [], en: [] }, cons: { tr: [], en: [] } }, copy = chairSurfaceCopy[lang], type = chairTypes[id] && chairTypes[id][lang] || "Chairman";
    const debt = typeof baseChairmanSackLimit === "function" ? Math.abs(baseChairmanSackLimit(id)) : 30;
    const title = String(cd.n || id).replace(/\s+Başkan$/i, "<br>Başkan");
    setSurfaceText(".js-chair-stage-index", `${String(index + 1).padStart(2, "0")} / ${String(total).padStart(2, "0")}`);
    setSurfaceText(".js-chair-detail-index", `${String(index + 1).padStart(2, "0")} / ${String(total).padStart(2, "0")}`);
    setSurfaceText(".js-chair-stage-type", type); setSurfaceText(".js-chair-detail-type", type);
    setSurfaceText(".js-chair-stage-title", title, true); setSurfaceText(".js-chair-detail-title", cd.n || id);
    setSurfaceText(".js-chair-stage-role", cd.role || ""); setSurfaceText(".js-chair-detail-role", cd.role || "");
    setSurfaceText(".js-chair-detail-desc", cd.desc || "", true); setSurfaceText(".js-chair-cash", `€${typeof BUDGET === "number" ? BUDGET : 30}M`); setSurfaceText(".js-chair-debt", `−€${debt}M`);
    setSurfaceText(".js-chair-advantage", textFor(fx.pros && fx.pros[lang] && fx.pros[lang][0], lang)); setSurfaceText(".js-chair-trigger", textFor(fx.pros && fx.pros[lang] && fx.pros[lang][1], lang)); setSurfaceText(".js-chair-redline", textFor(fx.cons && fx.cons[lang] && fx.cons[lang][0], lang));
    setSurfaceText(".copa-chair-stage-head span", copy.profile); setSurfaceText(".copa-chair-rail-head>span", copy.cards); setSurfaceText(".copa-chair-rail-head small", copy.hint); setSurfaceText(".js-chair-primary", copy.select); setSurfaceText(".js-chair-prev", copy.prev); setSurfaceText(".js-chair-next", copy.next);
    const labels = surface.querySelectorAll(".copa-chair-metrics small"); if (labels[0]) labels[0].textContent = copy.start; if (labels[1]) labels[1].textContent = copy.debt;
    const contractLabels = surface.querySelectorAll(".copa-chair-contracts small"); [copy.advantage, copy.trigger, copy.redline].forEach((label, i) => { if (contractLabels[i]) contractLabels[i].textContent = label; });
    const image = surface.querySelector(".js-chair-stage-image"); if (image) { image.src = chairProfileSrc(id); image.alt = cd.n || id; image.decoding = "async"; image.setAttribute("fetchpriority", "high"); }
    const prev = ids[(index - 1 + total) % total], next = ids[(index + 1) % total], primary = surface.querySelector(".js-chair-primary");
    const activate = nextId => { if (!nextId) return; selectedChairId = nextId; try { sfxSeat(); } catch (e) {} buildChairButtons(); syncChairSelectionSurface(nextId); };
    const prevButton = surface.querySelector(".js-chair-prev"), nextButton = surface.querySelector(".js-chair-next"); if (prevButton) prevButton.onclick = () => activate(prev); if (nextButton) nextButton.onclick = () => activate(next); if (primary) primary.onclick = () => confirmChair(id);
    if (!surface.dataset.parallaxReady) {
      surface.dataset.parallaxReady = "true";
      const portrait = surface.querySelector(".copa-chair-stage-portrait");
      surface.addEventListener("pointermove", event => { if (!portrait || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return; const rect = surface.getBoundingClientRect(), x = (event.clientX - rect.left) / rect.width - .5, y = (event.clientY - rect.top) / rect.height - .5; portrait.style.setProperty("--chair-parallax-x", `${(x * 8).toFixed(2)}px`); portrait.style.setProperty("--chair-parallax-y", `${(y * 4).toFixed(2)}px`); portrait.style.setProperty("--chair-parallax-ry", `${(x * 2.2).toFixed(2)}deg`); });
      surface.addEventListener("pointerleave", () => { if (portrait) { portrait.style.setProperty("--chair-parallax-x", "0px"); portrait.style.setProperty("--chair-parallax-y", "0px"); portrait.style.setProperty("--chair-parallax-ry", "0deg"); } });
    }
  }

  window.syncChairSelectionSurface = syncChairSelectionSurface;
  window.buildChairButtons = function () {
    originalBuildChairButtons.apply(this, arguments);
    document.querySelectorAll("#chairpick [data-chair-id] .chairthumb").forEach(img => { const id = img.closest("[data-chair-id]")?.dataset.chairId; if (id) img.src = typeof chairProfileThumbSrc === "function" ? chairProfileThumbSrc(id) : chairProfileSrc(id); });
    syncChairSelectionSurface();
  };
  window.buildChairButtons();
  const runPrefetch = () => { if (navigator.connection && navigator.connection.saveData) return; CHAIRMEN.forEach(ch => { const link = document.createElement("link"); link.rel = "prefetch"; link.as = "image"; link.href = chairProfileSrc(ch.id); link.dataset.copaChairPrefetch = ch.id; document.head.appendChild(link); }); };
  if ("requestIdleCallback" in window) requestIdleCallback(runPrefetch, { timeout: 1800 }); else setTimeout(runPrefetch, 800);
})();
