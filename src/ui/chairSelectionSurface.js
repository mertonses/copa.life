(() => {
  const originalBuildChairButtons = window.buildChairButtons;
  if (typeof originalBuildChairButtons !== "function" || typeof chairProfileSrc !== "function") return;

  const chairTypes = {
    babacan: { tr: "Ekonomi", en: "Economy" }, leydi: { tr: "Dengeli", en: "Balanced" },
    pinti: { tr: "Ekonomi", en: "Economy" }, sansasyoncu: { tr: "Risk", en: "Risk" },
    torpilci: { tr: "Risk", en: "Risk" }, cilgin: { tr: "Kaos", en: "Chaos" }
  };
  const chairSurfaceCopy = {
    tr: { profile: "BAŞKAN PROFİLİ", start: "BAŞLANGIÇ KASASI", debt: "BORÇ LİMİTİ", advantage: "ANA AVANTAJ", trigger: "TETİKLEYİCİ", redline: "KIRMIZI ÇİZGİ", select: "BAŞKANI SEÇ", prev: "← ÖNCEKİ", next: "SONRAKİ →", cards: "BAŞKANLAR", hint: "Aktif kartı incele · sürükleyerek keşfet" },
    en: { profile: "CHAIRMAN PROFILE", start: "STARTING CASH", debt: "DEBT LIMIT", advantage: "MAIN ADVANTAGE", trigger: "TRIGGER", redline: "RED LINE", select: "SELECT CHAIRMAN", prev: "← PREVIOUS", next: "NEXT →", cards: "CHAIRMEN", hint: "Inspect the active card · drag to explore" }
  };
  const chairSpotlights = {
    babacan: { spot: "rgba(78,155,101,.28)", rim: "rgba(115,203,145,.18)" },
    leydi: { spot: "rgba(116,131,140,.28)", rim: "rgba(174,184,186,.18)" },
    pinti: { spot: "rgba(211,155,49,.28)", rim: "rgba(255,229,198,.18)" },
    sansasyoncu: { spot: "rgba(242,74,40,.25)", rim: "rgba(255,128,107,.18)" },
    torpilci: { spot: "rgba(217,200,143,.25)", rim: "rgba(255,240,216,.18)" },
    cilgin: { spot: "rgba(155,202,176,.26)", rim: "rgba(221,243,227,.18)" }
  };
  const textFor = (value, lang) => value && typeof value === "object" ? (value[lang] || value.en || value.tr || "") : String(value || "");
  const chairIds = () => CHAIRMEN.filter(ch => unlockedChairs.includes(ch.id)).map(ch => ch.id);
  const setSurfaceText = (selector, value, html = false) => { const node = document.querySelector(selector); if (node) html ? node.innerHTML = value : node.textContent = value; };
  const chairRail = () => document.getElementById("chairpick");
  const chairRailCards = () => [...(chairRail()?.querySelectorAll(".chair-card") || [])];
  const syncChairRailA11y = () => {
    chairRailCards().forEach(card => {
      const selected = card.dataset.chairId === selectedChairId;
      card.tabIndex = selected ? 0 : -1;
      card.setAttribute("aria-current", selected ? "true" : "false");
    });
  };
  const centerActiveChairCard = (id = selectedChairId, behavior = "smooth") => {
    const rail = chairRail(), card = rail?.querySelector(`[data-chair-id="${id}"]`);
    if (!rail || !card || rail.scrollWidth <= rail.clientWidth + 2) return;
    requestAnimationFrame(() => card.scrollIntoView({ behavior, block: "nearest", inline: "center" }));
  };
  const bindChairRail = () => {
    const rail = chairRail();
    if (!rail || rail.dataset.interactionReady === "true") return;
    rail.dataset.interactionReady = "true";
    rail.addEventListener("keydown", event => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      const cards = chairRailCards(); if (!cards.length) return;
      const current = Math.max(0, cards.findIndex(card => card === document.activeElement || card.dataset.chairId === selectedChairId));
      const nextIndex = event.key === "Home" ? 0 : event.key === "End" ? cards.length - 1 : (current + (event.key === "ArrowRight" ? 1 : -1) + cards.length) % cards.length;
      event.preventDefault();
      cards[nextIndex].focus({ preventScroll: true });
      cards[nextIndex].click();
    });
    rail.addEventListener("click", event => {
      const card = event.target.closest?.(".chair-card");
      if (!card || card.classList.contains("locked") || card.dataset.chairId === selectedChairId) return;
      if (typeof pickChair === "function") pickChair(card.dataset.chairId);
    });
    let drag = null;
    const finishDrag = event => {
      if (!drag) return;
      if (rail.hasPointerCapture?.(event.pointerId)) rail.releasePointerCapture(event.pointerId);
      rail.classList.remove("is-dragging");
      if (drag.moved) { rail.dataset.suppressClick = "true"; setTimeout(() => delete rail.dataset.suppressClick, 0); }
      drag = null;
    };
    rail.addEventListener("pointerdown", event => {
      if (rail.scrollWidth <= rail.clientWidth + 2) return;
      drag = { startX: event.clientX, startScroll: rail.scrollLeft, moved: false, pointerId: event.pointerId };
      rail.classList.add("is-dragging");
    });
    rail.addEventListener("pointermove", event => {
      if (!drag) return;
      const delta = event.clientX - drag.startX;
      if (Math.abs(delta) > 12) drag.moved = true;
      if (!drag.moved) return;
      if (!rail.hasPointerCapture?.(event.pointerId)) {
        try { rail.setPointerCapture?.(event.pointerId); } catch (e) { /* synthetic pointer events cannot be captured */ }
      }
      event.preventDefault();
      rail.scrollLeft = drag.startScroll - delta;
    }, { passive: false });
    rail.addEventListener("pointerup", finishDrag);
    rail.addEventListener("pointercancel", finishDrag);
    rail.addEventListener("click", event => {
      if (rail.dataset.suppressClick !== "true") return;
      event.preventDefault(); event.stopPropagation(); delete rail.dataset.suppressClick;
    }, true);
  };

  function syncChairSelectionSurface(id = selectedChairId || chairIds()[0]) {
    const surface = document.getElementById("chairSelectionSurface"), cd = L().chair && L().chair[id];
    if (!surface || !cd) return;
    const previousId = surface.dataset.chairId, changed = Boolean(previousId && previousId !== id);
    const spotlight = chairSpotlights[id] || chairSpotlights.babacan;
    surface.style.setProperty("--chair-spotlight", spotlight.spot);
    surface.style.setProperty("--chair-rim-glow", spotlight.rim);
    surface.dataset.chairId = id;
    bindChairRail();
    syncChairRailA11y();
    if (!previousId || changed) centerActiveChairCard(id);
    if (changed && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      surface.classList.remove("is-chair-transitioning");
      void surface.offsetWidth;
      surface.classList.add("is-chair-transitioning");
      clearTimeout(surface._chairTransitionTimer);
      surface._chairTransitionTimer = setTimeout(() => surface.classList.remove("is-chair-transitioning"), 560);
    }
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
    document.querySelectorAll("#chairpick .card-foot").forEach(node => node.remove());
    document.querySelectorAll("#chairpick [data-chair-id] .chairthumb").forEach(img => { const id = img.closest("[data-chair-id]")?.dataset.chairId; if (id) img.src = typeof chairProfileThumbSrc === "function" ? chairProfileThumbSrc(id) : chairProfileSrc(id); });
    bindChairRail();
    syncChairSelectionSurface();
  };
  window.buildChairButtons();
  const runPrefetch = () => { if (navigator.connection && navigator.connection.saveData) return; CHAIRMEN.forEach(ch => { const link = document.createElement("link"); link.rel = "prefetch"; link.as = "image"; link.href = chairProfileSrc(ch.id); link.dataset.copaChairPrefetch = ch.id; document.head.appendChild(link); }); };
  if ("requestIdleCallback" in window) requestIdleCallback(runPrefetch, { timeout: 1800 }); else setTimeout(runPrefetch, 800);
})();
