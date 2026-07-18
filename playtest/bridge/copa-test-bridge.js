/**
 * Copa Test Bridge v2.0
 * Injected only when ?autotest=1 is present.
 * All selectors verified against live game DOM.
 */
(function () {
  if (!new URLSearchParams(location.search).has("autotest")) return;

  // ── Helpers ─────────────────────────────────────────────────────────────
  function _el(id) { return document.getElementById(id); }
  function _vis(id) { const e = _el(id); return !!(e && !e.classList.contains("hidden")); }
  function _g(name) { return window[name]; }
  function _text(id) { const e = _el(id); return e ? e.textContent.trim() : null; }

  // ── Telemetry ────────────────────────────────────────────────────────────
  const _listeners = [];
  function _emit(type, data) {
    const ev = { type, ts: Date.now(), data: data || {} };
    _listeners.forEach(fn => { try { fn(ev); } catch (_) {} });
  }

  // Wrap a window global to emit events without modifying source files
  function _wrapFn(name, after) {
    const orig = window[name];
    if (typeof orig !== "function" || orig._copaWrapped) return;
    window[name] = function (...args) {
      const result = orig.apply(this, args);
      try { after(args, result); } catch (_) {}
      return result;
    };
    window[name]._copaWrapped = true;
  }

  // ── Screen detection ─────────────────────────────────────────────────────
  function _currentScreen() {
    // Modal takes priority if it's open
    const modal = _el("modal");
    if (modal && !modal.classList.contains("hidden")) return "modal";
    if (_vis("result")) return "result";
    if (_vis("sim")) return "sim";
    if (_vis("hub")) return "hub";
    if (_vis("draft")) return "draft";
    if (_vis("intro")) return "intro";
    return "unknown";
  }

  // ── State snapshot ───────────────────────────────────────────────────────
  function _snapshot() {
    const screen = _currentScreen();
    const snap = { screen, ts: Date.now(),
      round: _g("round"), budget: _g("budget"),
      runEnded: _g("runEnded"), lang: _g("LANG"), darkTheme: _g("darkTheme") };

    try {
      const raw = localStorage.getItem("kupayolu");
      if (raw) {
        const meta = JSON.parse(raw);
        snap.meta = { unlockedChairs: meta.uc || [], selectedChairId: meta.sc || null,
          metaBest: meta.b || {}, metaRuns: meta.r || 0, eliteBonus: meta.eb || 0,
          legacyFund: meta.lf || 0, unlockedForms: meta.u || [] };
      }
    } catch (_) {}

    if (screen === "modal") {
      const m = _el("modal");
      snap.modalText = m ? m.textContent.trim().substring(0, 200) : null;
      // Classify modal type
      if (m) {
        const t = m.textContent;
        if (m.querySelector(".stylebtn[onclick*=\"finishRoundReward\"]")) snap.modalType = "reward";
        else if (m.querySelector(".btn-go[onclick*=\"pcGo\"]") || (m.querySelector(".btn-go") && t.includes("KUPA"))) snap.modalType = "pcgo";
        else if (m.querySelector(".btn-primary[onclick*=\"buyCard\"]")) snap.modalType = "buy_card";
        else if (m.querySelector("[onclick*=\"setCaptain\"]")) snap.modalType = "captain";
        else if (m.querySelector("[onclick*=\"afterMatch\"]")) snap.modalType = "post_match";
        else if (m.querySelector("[onclick*=\"pickStyle\"]")) snap.modalType = "style_select";
        else if (m.querySelector("[onclick*=\"applyLegacyBet\"]")) snap.modalType = "legacy_bet";
        else if (m.querySelector("[onclick*=\"pickTalk\"]")) snap.modalType = "team_talk";
        else if (t.includes("Risk Özeti") || t.includes("Risk Summary") || t.includes("Maç Öncesi")) snap.modalType = "risk_summary";
        else if (t.includes("Risk/Ödül") || t.includes("Risk/Reward") || t.includes("Draft")) snap.modalType = "risk_draft";
        else if (m.querySelector(".btn-primary") || m.querySelector(".btn-go")) snap.modalType = "confirmable";
        else snap.modalType = "other";
      }
    }

    if (screen === "hub" || screen === "result") {
      snap.opponent = _g("opponent");
      snap.lastResult = _g("lastResult");
      snap.cards = _g("cards");
      const sp = _g("squadPower");
      snap.squadPower = typeof sp === "function" ? sp(_g("round")) : null;
    }
    if (screen === "sim") {
      snap.simScore = _text("simScore");
      snap.simComm = _text("simComm");
    }
    if (screen === "result") {
      snap.wasSacked = !!(snap.lastResult && snap.lastResult.sacked);
      snap.won = !!(snap.lastResult && snap.lastResult.won);
    }
    if (screen === "draft") {
      snap.draftOptCount = document.querySelectorAll("button.opt").length;
      snap.hasRollBtn = !_el("rollBtn").classList.contains("hidden");
    }
    return snap;
  }

  // ── Actions ──────────────────────────────────────────────────────────────
  const Actions = {

    /** Intro: click start (uses current formation/chair selection) */
    start_new_game() {
      if (typeof _g("normalStart") === "function") { _g("normalStart")(); return { ok: true }; }
      const b = _el("startBtn"); if (b) { b.click(); return { ok: true }; }
      return { ok: false, reason: "startBtn not found" };
    },

    /** Intro: random start (skips formation/chair picking) */
    quick_start() {
      if (typeof _g("quickStart") === "function") { _g("quickStart")(); return { ok: true }; }
      const b = _el("quickStartBtn"); if (b) { b.click(); return { ok: true }; }
      return { ok: false, reason: "quickStartBtn not found" };
    },

    /** Intro: select formation by 0-based index among .fbtn:not(.chairbtn) */
    select_formation(index = 0) {
      const opts = document.querySelectorAll("#intro .fbtn:not(.chairbtn)");
      if (opts[index]) { opts[index].click(); return { ok: true, count: opts.length }; }
      return { ok: false, reason: `formation index ${index} not found (${opts.length} available)` };
    },

    /** Intro: select chair by ID or by 0-based index */
    select_chair(chairIdOrIndex) {
      const opts = Array.from(document.querySelectorAll("#intro .fbtn.chairbtn"));
      // Try to find by chair ID stored in the button text or data
      if (typeof chairIdOrIndex === "number") {
        if (opts[chairIdOrIndex]) { opts[chairIdOrIndex].click(); return { ok: true }; }
        return { ok: false, reason: `chair index ${chairIdOrIndex} not found` };
      }
      // By ID — match via global CHAIRS data if available, or just use index
      const idx = chairIdOrIndex === "babacan" ? 0 : chairIdOrIndex === "leydi" ? 1 :
        chairIdOrIndex === "pinti" ? 2 : chairIdOrIndex === "sansasyoncu" ? 3 :
        chairIdOrIndex === "torpilci" ? 4 : chairIdOrIndex === "cilgin" ? 5 : -1;
      if (idx >= 0 && opts[idx]) { opts[idx].click(); return { ok: true }; }
      return { ok: false, reason: `chair ${chairIdOrIndex} not found` };
    },

    /** Draft: roll the dice */
    roll_dice() {
      const btn = _el("rollBtn");
      if (btn && !btn.classList.contains("hidden")) { btn.click(); return { ok: true }; }
      if (typeof _g("roll") === "function") { _g("roll")(); return { ok: true }; }
      return { ok: false, reason: "rollBtn not found or hidden" };
    },

    /** Draft: pick one of the revealed player options (button.opt) by 0-based index */
    pick_draft_option(index = 0) {
      const opts = document.querySelectorAll("button.opt");
      if (opts[index]) { opts[index].click(); return { ok: true, count: opts.length }; }
      return { ok: false, reason: `opt index ${index} not found (${opts.length} opts available)` };
    },

    /** Draft: use quick-fill to draft all remaining slots instantly */
    draft_quick_all() {
      if (typeof _g("quickAll") === "function") { _g("quickAll")(); return { ok: true }; }
      const b = _el("allBtn"); if (b && !b.classList.contains("hidden")) { b.click(); return { ok: true }; }
      return { ok: false, reason: "quickAll not available" };
    },

    /** Draft completion modal: confirm "KUPAYA BAŞLA" */
    confirm_pcgo() {
      if (typeof _g("pcGo") === "function") { _g("pcGo")(); return { ok: true }; }
      const m = _el("modal");
      const btn = m && m.querySelector(".btn-go");
      if (btn) { btn.click(); return { ok: true }; }
      return { ok: false, reason: "pcGo not available" };
    },

    /** Hub: start the next match */
    play_match() {
      const btn = _el("playBtn");
      if (btn && !btn.disabled) { btn.click(); return { ok: true }; }
      if (typeof _g("playMatch") === "function") { _g("playMatch")(); return { ok: true }; }
      return { ok: false, reason: "playBtn not found" };
    },

    /** Sim: shout. type = "push"|"calm"|"hold"|"more" */
    shout(type) {
      if (typeof _g("simShout") === "function") { _g("simShout")(type); return { ok: true }; }
      const ids = { push: "shPush", calm: "shCalm", hold: "shHold", more: "shMore" };
      const btn = _el(ids[type]);
      if (btn) { btn.click(); return { ok: true }; }
      return { ok: false, reason: `shout ${type} not available` };
    },

    /** Speed up sim: multiplier = 0.5 | 1 | 2 | 4 | 8 (raw engine values 5..80 are also accepted) */
    set_sim_speed(mult = 2) {
      const requested=Number(mult);
      const engineSpeed=requested>0&&requested<=8?requested*10:requested;
      if (typeof _g("setSpeed") === "function"&&[5,10,20,40,80].includes(engineSpeed)) { _g("setSpeed")(engineSpeed); return { ok: true, engineSpeed }; }
      return { ok: false, reason: "setSpeed not available" };
    },

    /** Skip sim entirely */
    skip_sim() {
      if (typeof _g("simSkip") === "function") { _g("simSkip")(); return { ok: true }; }
      return { ok: false, reason: "simSkip not available" };
    },

    /** Reward modal: pick a reward. kind = "cash"|"loan"|"swap"|"care" */
    pick_reward(kind = "cash") {
      if (typeof _g("finishRoundReward") === "function") { _g("finishRoundReward")(kind); return { ok: true }; }
      const m = _el("modal");
      if (!m) return { ok: false, reason: "no modal" };
      const btn = m.querySelector(`.stylebtn[onclick*="finishRoundReward('${kind}')"]`);
      if (btn && !btn.classList.contains("disabled")) { btn.click(); return { ok: true }; }
      // Fallback: click first enabled stylebtn
      const first = m.querySelector(".stylebtn:not(.disabled)");
      if (first) { first.click(); return { ok: true, note: `${kind} unavailable, picked first enabled` }; }
      return { ok: false, reason: `reward ${kind} not available` };
    },

    /** Post-match modal: continue to next round */
    continue_after_match() {
      const m = _el("modal");
      if (!m || m.classList.contains("hidden")) return { ok: false, reason: "no modal" };
      const btn = m.querySelector(".btn-primary[onclick*=\"afterMatch\"]");
      if (btn) { btn.click(); return { ok: true }; }
      // Also handle afterMatch(true) directly
      if (typeof _g("afterMatch") === "function") { _g("afterMatch")(true); return { ok: true }; }
      return { ok: false, reason: "afterMatch button not found" };
    },

    /** Captain modal: pick captain by 0-based index */
    pick_captain(index = 0) {
      const m = _el("modal");
      if (!m) return { ok: false, reason: "no modal" };
      const btns = m.querySelectorAll("[onclick*=\"setCaptain\"]");
      if (btns[index]) { btns[index].click(); return { ok: true }; }
      return { ok: false, reason: `captain index ${index} not found` };
    },

    /** Intro: pick a play style by 0-based index */
    pick_style(index = 0) {
      const m = _el("modal");
      if (!m) return { ok: false, reason: "no modal" };
      const btns = m.querySelectorAll("[onclick*=\"pickStyle\"]");
      if (btns[index]) { btns[index].click(); return { ok: true, count: btns.length }; }
      // Fallback: call pickStyle directly with first available STYLES key
      const keys = typeof window.STYLES === "object" ? Object.keys(window.STYLES) : ["gegen"];
      const key = keys[Math.min(index, keys.length - 1)] || "gegen";
      if (typeof _g("pickStyle") === "function") { _g("pickStyle")(key); return { ok: true, note: `direct call ${key}` }; }
      return { ok: false, reason: "pickStyle not found" };
    },

    /** Intro: handle legacy fund bet modal */
    pick_legacy_bet(choice = "skip") {
      if (typeof _g("applyLegacyBet") === "function") { _g("applyLegacyBet")(choice); return { ok: true }; }
      const m = _el("modal");
      if (!m) return { ok: false, reason: "no modal" };
      const btn = m.querySelector(`[onclick*="applyLegacyBet('${choice}')"]`);
      if (btn) { btn.click(); return { ok: true }; }
      // Fallback: click skip
      const skip = m.querySelector("[onclick*=\"applyLegacyBet('skip')\"]") || m.querySelector("[onclick*=\"applyLegacyBet\"]");
      if (skip) { skip.click(); return { ok: true, note: "fell back to skip" }; }
      return { ok: false, reason: "applyLegacyBet not found" };
    },

    /** Hub: team talk — pick a talk option by key (gaz/mantik/sert) */
    pick_team_talk(key = "mantik") {
      if (typeof _g("pickTalk") === "function") { _g("pickTalk")(key); return { ok: true }; }
      const m = _el("modal");
      if (!m) return { ok: false, reason: "no modal" };
      const btn = m.querySelector(`[onclick*="pickTalk('${key}')"]`) || m.querySelector("[onclick*=\"pickTalk\"]");
      if (btn) { btn.click(); return { ok: true }; }
      return { ok: false, reason: "pickTalk not found" };
    },

    /** Modal: confirm primary action (buy card, etc.) */
    confirm_modal() {
      const m = _el("modal");
      if (!m || m.classList.contains("hidden")) return { ok: false, reason: "no modal open" };
      const btn = m.querySelector(".btn-primary, .btn-go");
      if (btn) { btn.click(); return { ok: true }; }
      return { ok: false, reason: "no confirm button in modal" };
    },

    /** Modal: dismiss / cancel */
    dismiss_modal() {
      if (typeof _g("closeModal") === "function") { _g("closeModal")(); return { ok: true }; }
      const m = _el("modal");
      if (!m || m.classList.contains("hidden")) return { ok: false, reason: "no modal open" };
      const btn = m.querySelector(".btn-ghost");
      if (btn) { btn.click(); return { ok: true }; }
      return { ok: false, reason: "no dismiss button" };
    },

    /** Result: completely new run */
    new_run() {
      if (typeof _g("restart") === "function") { _g("restart")(); return { ok: true }; }
      const b = _el("againBtn"); if (b) { b.click(); return { ok: true }; }
      return { ok: false, reason: "restart not available" };
    },

    /** Shop: get all available card tiles in hub */
    read_shop() {
      const items = [];
      document.querySelectorAll("#shopcards .cardtile").forEach((el, i) => {
        items.push({ index: i, text: el.textContent.trim().substring(0, 80), cls: el.className });
      });
      return { ok: true, items };
    },

    /** Shop: click a card tile to open its buy modal */
    open_card(index = 0) {
      const tiles = document.querySelectorAll("#shopcards .cardtile");
      if (tiles[index]) { tiles[index].click(); return { ok: true, count: tiles.length }; }
      return { ok: false, reason: `card tile index ${index} not found (${tiles.length} tiles)` };
    },

    /** Read current cards in hand */
    read_deck() {
      return { ok: true, cards: _g("cards") || [] };
    },

    /** Read current budget */
    read_budget() {
      return { ok: true, budget: _g("budget") };
    },
  };

  // ── Telemetry hooks ──────────────────────────────────────────────────────
  function _installHooks() {
    _wrapFn("endRun", ([won, score, endType]) => _emit("run_ended", { won, score, endType }));
    _wrapFn("afterMatch", ([advance]) => _emit("match_ended", { advance }));
    _wrapFn("enterHub", () => _emit("hub_entered", { round: _g("round") }));
    _wrapFn("beginDraft", () => _emit("draft_started", {}));
    _wrapFn("showRewardChoice", () => _emit("reward_shown", { round: _g("round") }));
    _wrapFn("finishRoundReward", ([kind]) => _emit("reward_picked", { kind, round: _g("round") }));
    _wrapFn("unlockNextChair", () => {
      setTimeout(() => {
        try { const m = JSON.parse(localStorage.getItem("kupayolu")||"{}"); _emit("chair_unlocked", { chairs: m.uc || [] }); } catch (_) {}
      }, 80);
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", _installHooks);
  else setTimeout(_installHooks, 100);

  // ── Coverage ─────────────────────────────────────────────────────────────
  const _cov = { screens: new Set(), chairs: new Set(), rewards: new Set(), runs: 0, wins: 0, losses: 0, sacks: 0, shouts: new Set() };
  _listeners.push(ev => {
    if (ev.type === "run_ended") { _cov.runs++; if (ev.data.won) _cov.wins++; else if (ev.data.endType === "sacked") _cov.sacks++; else _cov.losses++; }
    if (ev.type === "chair_unlocked") ev.data.chairs.forEach(c => _cov.chairs.add(c));
    if (ev.type === "reward_picked") _cov.rewards.add(ev.data.kind);
  });

  // ── Public API ───────────────────────────────────────────────────────────
  const bridge = {
    version: "2.0.0",
    snapshot: _snapshot,
    modalContent() { const m = _el("modal"); return m && !m.classList.contains("hidden") ? m.textContent.trim().substring(0, 500) : null; },
    action(name, ...args) {
      if (!Actions[name]) return { ok: false, reason: `unknown action: ${name}` };
      const result = Actions[name](...args);
      if (name === "shout") _cov.shouts.add(args[0]);
      _emit("action", { name, args, result });
      return result;
    },
    on(fn) { _listeners.push(fn); return () => { const i = _listeners.indexOf(fn); if (i !== -1) _listeners.splice(i, 1); }; },
    coverageSummary() {
      return { screensVisited: [..._cov.screens], chairsUnlocked: [..._cov.chairs],
        rewardsUsed: [..._cov.rewards], shoutTypesUsed: [..._cov.shouts],
        runsCompleted: _cov.runs, wins: _cov.wins, losses: _cov.losses, sacks: _cov.sacks };
    },
    saveCheckpoint(key, data) {
      try { localStorage.setItem(`copa_agent_cp_${key}`, JSON.stringify({ ts: Date.now(), ...data })); return { ok: true }; }
      catch (e) { return { ok: false, reason: e.message }; }
    },
    loadCheckpoint(key) {
      try { const r = localStorage.getItem(`copa_agent_cp_${key}`); return r ? JSON.parse(r) : null; } catch (_) { return null; }
    },
    readGlobal: _g,
    availableActions: Object.keys(Actions),
  };

  window.CopaTestBridge = Object.freeze(bridge);
  console.log("[CopaTestBridge] v2.0.0 installed");
  _emit("bridge_ready", { version: "2.0.0" });
})();
