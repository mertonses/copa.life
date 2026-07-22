/**
 * Copa Agent v2 — main observe-decide-act loop
 *
 * CONSTRAINTS (must never be violated):
 * - Never modifies game source files
 * - Unlocks presidents only through wins (no internal unlock calls)
 * - Does not auto-fix issues — only observes and reports
 * - Behaves like an ordinary player (no min-maxing, no hidden-info exploitation)
 * - Does not fabricate expected behavior — uncertain findings marked as observations
 */
import { chromium, type Browser, type Page } from "@playwright/test";
import path from "path";
import type { GameSnapshot, RunResult, ChairId, ShoutType, AgentConfig } from "./types";
import { loadConfig } from "./config";
import { installBridge, createBridgeHandle, waitForBridge } from "./bridge";
import type { BridgeHandle } from "./types";
import { SessionManager } from "./session";
import { IssueTracker } from "./issues";
import { StagnationDetector } from "./stagnation";
import { CoverageTracker } from "./coverage";
import { ActionLayer } from "./actions";
import { ReportGenerator } from "./reports";

// ── Helpers ──────────────────────────────────────────────────────────────

function _rng<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function _rni(min: number, max: number) { return Math.floor(min + Math.random() * (max - min + 1)); }
function _wait(ms: number) { return new Promise<void>(r => setTimeout(r, ms)); }

type RewardKind = "cash" | "loan" | "swap" | "care";

// ── Run state ─────────────────────────────────────────────────────────────

interface RunState {
  index: number;
  startTs: number;
  chairUsed: ChairId | null;
  formationChosen: string | null;
  cardsBought: string[];
  shoutActions: ShoutType[];
  rewardChoices: RewardKind[];
  issuesObserved: string[];
  snapshotCount: number;
  budgetStart: number | null;
  budgetPeak: number | null;
  budgetNadir: number | null;
  roundsPlayed: number;
}

function _newRunState(index: number): RunState {
  return { index, startTs: Date.now(), chairUsed: null, formationChosen: null,
    cardsBought: [], shoutActions: [], rewardChoices: [], issuesObserved: [],
    snapshotCount: 0, budgetStart: null, budgetPeak: null, budgetNadir: null, roundsPlayed: 0 };
}

// ── Agent ─────────────────────────────────────────────────────────────────

export class CopaAgent {
  private cfg: AgentConfig;
  private session!: SessionManager;
  private issues!: IssueTracker;
  private coverage!: CoverageTracker;
  private actions!: ActionLayer;
  private reports!: ReportGenerator;
  private bridge!: BridgeHandle;
  private stagnation!: StagnationDetector;
  private browser!: Browser;
  private page!: Page;
  private runState!: RunState;

  constructor(cfg?: AgentConfig) {
    this.cfg = cfg ?? loadConfig();
  }

  async run(resumeId?: string): Promise<void> {
    this.session = new SessionManager(this.cfg, resumeId);
    this.issues = new IssueTracker(this.cfg, this.session.sessionId);
    this.coverage = new CoverageTracker();
    this.stagnation = new StagnationDetector(this.cfg.stagnationTimeoutMs);

    const deadline = Date.now() + this.cfg.maxSessionDurationMs;
    let runIdx = this.session.runsCompleted;

    await this._launchBrowser();

    try {
      while (runIdx < this.cfg.maxRunsPerSession && Date.now() < deadline && !this.coverage.isComplete()) {
        this.runState = _newRunState(runIdx);
        const outcome = await this._singleRun();
        const snap = await this.bridge.snapshot();

        this.session.recordRun({
          runIndex: runIdx,
          sessionId: this.session.sessionId,
          startTs: this.runState.startTs,
          endTs: Date.now(),
          durationMs: Date.now() - this.runState.startTs,
          outcome,
          roundReached: snap.round ?? 0,
          chairUsed: this.runState.chairUsed,
          formationChosen: this.runState.formationChosen,
          cardsBought: [...this.runState.cardsBought],
          shoutActions: [...this.runState.shoutActions],
          rewardChoices: [...this.runState.rewardChoices],
          issuesObserved: [...this.runState.issuesObserved],
          snapshotCount: this.runState.snapshotCount,
          budget: { start: this.runState.budgetStart, end: snap.budget, peak: this.runState.budgetPeak, nadir: this.runState.budgetNadir },
        });

        this.coverage.markOutcome(outcome === "abandoned" ? "loss" : outcome);
        this.reports.generateMatchReport(this.session.allRuns()[this.session.allRuns().length - 1]);
        console.log(`[agent] ${this.coverage.report()}`);

        // Back up game save
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const saveRaw = await this.page.evaluate(() => (globalThis as any).localStorage.getItem("kupayolu") as string | null);
        this.session.captureGameSave(saveRaw, `run${runIdx}`);

        runIdx++;

        if (!this.coverage.isComplete() && runIdx < this.cfg.maxRunsPerSession) {
          // Clear sessionStorage before reload so _tryRestoreState() doesn't
          // restore the previous run's stale state (negative budget, mid-game squad, etc.)
          await this.page.evaluate(() => {
            try { (globalThis as any).sessionStorage.removeItem("copa_run"); } catch (_) {}
          });
          await this.page.reload({ waitUntil: "domcontentloaded" });
          await waitForBridge(this.page);
          await _wait(1200);
          // Safety: if game still restored a session (e.g. from a different source),
          // call restart() to get back to intro
          const afterReloadSnap = await this.bridge.snapshot();
          if (afterReloadSnap.screen !== "intro") {
            await this.page.evaluate(() => {
              try { (globalThis as any).restart?.(); } catch (_) {}
              try { (globalThis as any).sessionStorage.removeItem("copa_run"); } catch (_) {}
            });
            await _wait(800);
          }
        }
      }
    } finally {
      const rpt = this.reports.generateCampaignReport();
      console.log(`[agent] Session complete. Report: ${rpt}`);
      await this.browser.close();
    }
  }

  // ── Browser setup ─────────────────────────────────────────────────────

  private async _launchBrowser() {
    this.browser = await chromium.launch({
      headless: this.cfg.headless,
      slowMo: this.cfg.slowMoMs,
      executablePath: process.env.CHROME_PATH || undefined,
    });
    const ctx = await this.browser.newContext({ viewport: { width: 430, height: 932 } });
    this.page = await ctx.newPage();
    await installBridge(this.page);
    await this.page.goto(this.cfg.gameUrl, { waitUntil: "domcontentloaded" });

    if (!await waitForBridge(this.page)) throw new Error("CopaTestBridge failed — check ?autotest=1 and bridge path");

    this.bridge = createBridgeHandle(this.page);
    this.actions = new ActionLayer(this.page, this.bridge, this.cfg, this.session);
    this.reports = new ReportGenerator(this.cfg, this.session, this.issues, this.coverage);
    console.log(`[agent] Browser ready → ${this.cfg.gameUrl}`);
  }

  // ── Single run ────────────────────────────────────────────────────────

  private async _singleRun(): Promise<RunResult["outcome"]> {
    this.stagnation.reset();
    try {
      await this._phaseIntro();
      await this._phaseDraft();
      await this._phaseHubLoop();
      return await this._phaseResult();
    } catch (e) {
      const msg = String(e);
      console.error(`[agent] Run #${this.runState.index} error: ${msg}`);
      this.session.logTelemetry("run_error", { error: msg, runIndex: this.runState.index });
      if (this.cfg.screenshotOnIssue) await this.actions.screenshotResult(`run${this.runState.index}_error`);
      return "abandoned";
    }
  }

  // ── Snapshot helper ───────────────────────────────────────────────────

  private async _snap(): Promise<GameSnapshot> {
    const s = await this.bridge.snapshot();
    this.runState.snapshotCount++;
    this.coverage.markScreen(s.screen);
    if (s.budget !== null && s.budget !== undefined) {
      const b = s.budget as number;
      if (this.runState.budgetStart === null) this.runState.budgetStart = b;
      if (this.runState.budgetPeak === null || b > this.runState.budgetPeak) this.runState.budgetPeak = b;
      if (this.runState.budgetNadir === null || b < this.runState.budgetNadir) this.runState.budgetNadir = b;
    }
    if (s.meta?.unlockedChairs) this.coverage.updateFromUnlockedChairs(s.meta.unlockedChairs as ChairId[]);
    if (typeof s.darkTheme === "boolean") this.coverage.markTheme(s.darkTheme);
    if (this.stagnation.tick(s) === "stagnant") {
      this._issue({ severity: "major", category: "bug",
        title: `Game stagnant on screen: ${s.screen}`,
        description: `No state change for ${Math.round(this.cfg.stagnationTimeoutMs / 1000)}s on "${s.screen}".`,
        reproduction: [`Reach ${s.screen}`, `Wait ${this.cfg.stagnationTimeoutMs / 1000}s`], screen: s.screen });
      throw new Error("stagnation");
    }
    return s;
  }

  private _issue(p: Omit<Parameters<IssueTracker["report"]>[0], "sessionId" | "runIndex" | "round">) {
    const issue = this.issues.report({ ...p, sessionId: this.session.sessionId, runIndex: this.runState.index, round: null });
    this.runState.issuesObserved.push(issue.id);
    return issue;
  }

  // ── Wait until screen matches ─────────────────────────────────────────

  private async _waitScreen(target: string, ms = 20_000): Promise<boolean> {
    const deadline = Date.now() + ms;
    while (Date.now() < deadline) {
      const s = await this._snap();
      if (s.screen === target) return true;
      await _wait(700);
    }
    return false;
  }

  private async _waitNotIntro(ms = 15_000): Promise<boolean> {
    const deadline = Date.now() + ms;
    while (Date.now() < deadline) {
      const s = await this._snap();
      if (s.screen !== "intro") return true;
      await _wait(700);
    }
    return false;
  }

  // ── Phase: Intro ──────────────────────────────────────────────────────

  private async _phaseIntro() {
    const s = await this._snap();
    if (s.screen !== "intro") return;

    // Ordinary player: randomly pick quick-start or normal-start
    // Quick-start randomizes formation/chair — valid player behavior
    if (Math.random() < 0.5) {
      await this.actions.doAction("quick_start");
    } else {
      // Pick a formation (0 = 4-4-2, always available)
      await this.actions.doAction("select_formation", 0);
      await _wait(300);
      // Pick unlocked chair (index 0 = babacan, always available)
      const chairs = s.meta?.unlockedChairs ?? [];
      const chairIdx = _rni(0, Math.max(0, chairs.length - 1));
      this.runState.chairUsed = (chairs[chairIdx] ?? "babacan") as ChairId;
      await this.actions.doAction("select_chair", chairIdx);
      await _wait(300);
      await this.actions.doAction("start_new_game");
    }

    // Wait to leave intro — quickStart may skip draft entirely and land on modal/hub
    const leftIntro = await this._waitNotIntro(15_000);
    if (!leftIntro) {
      this._issue({ severity: "critical", category: "bug",
        title: "Start button did not leave intro screen",
        description: "Intro screen still showing 15s after clicking start.",
        reproduction: ["Open game", "Click start", "Wait 15s"], screen: "intro" });
      throw new Error("intro not left");
    }
  }

  // ── Phase: Draft ──────────────────────────────────────────────────────

  private async _phaseDraft() {
    let s = await this._snap();
    if (s.screen !== "draft") return;

    // Use quickAll to draft fast — valid player behavior (there's a button for it)
    const ok = await this.actions.doAction("draft_quick_all");
    if (!ok) {
      // Manual roll-and-pick fallback
      await this._draftManual();
    }

    // After draft, a "KUPAYA BAŞLA" confirmation modal appears
    await _wait(1000);
    s = await this._snap();

    // Dismiss any captain-pick or other modals until we're past draft
    let guard = 0;
    while ((s.screen === "modal" || s.screen === "draft") && guard < 15) {
      guard++;
      s = await this._snap();
      if (s.screen === "modal") {
        await this._handleModal(s);
        await _wait(600);
        s = await this._snap();
      } else if (s.screen === "draft") {
        // Still on draft — try quickAll again or roll once more
        await this.actions.doAction("draft_quick_all");
        await _wait(1000);
        s = await this._snap();
      }
    }

    if (s.screen === "draft") {
      this._issue({ severity: "major", category: "bug", title: "Draft did not complete",
        description: "Still on draft screen after 15 iterations.", reproduction: ["Start game", "Attempt to complete draft"], screen: "draft" });
      throw new Error("draft stuck");
    }
  }

  private async _draftManual() {
    let guard = 0;
    while (guard < 25) {
      guard++;
      const s = await this._snap();
      if (s.screen !== "draft") return;

      const optCount = (s as { draftOptCount?: number }).draftOptCount ?? 0;
      if (optCount > 0) {
        // Pick a random option from the revealed players
        await this.actions.doAction("pick_draft_option", _rni(0, optCount - 1));
        await _wait(500);
      } else {
        // No options visible — roll the dice
        await this.actions.doAction("roll_dice");
        await _wait(2500); // wait for roll animation
      }
    }
  }

  // ── Phase: Hub loop ───────────────────────────────────────────────────

  private async _phaseHubLoop() {
    let guard = 0;
    const MAX = 120; // safety for draft hand-off, draw, six matches and shootout decisions

    while (guard < MAX) {
      guard++;
      const s = await this._snap();

      if (s.screen === "result") return;
      if (s.screen === "sim") { await this._waitSimEnd(); continue; }
      if (s.screen === "draft") {
        await this.actions.doAction("draft_quick_all");
        await _wait(1000);
        continue;
      }
      if (s.screen === "draw") {
        await this.actions.doAction("draw_one");
        await this.actions.doAction("draw_fast");
        await this.actions.doAction("draw_finish");
        await _wait(800);
        continue;
      }
      if (s.screen === "modal") { await this._handleModal(s); await _wait(600); continue; }
      if (s.screen === "hub") {
        // Optionally use a shout (15% chance — only if we're not in round 6)
        if ((s.round ?? 0) < 6 && Math.random() < 0.15) await this._doShout();
        // Set sim speed to 2× for faster observation (ordinary player behavior)
        await _wait(400);
        await this.actions.doAction("play_match");
        await _wait(2000); // give the match modal time to appear
        this.runState.roundsPlayed++;
        continue;
      }
      // Unknown screen — wait
      await _wait(1000);
    }

    this._issue({ severity: "major", category: "bug", title: "Hub loop did not reach result",
      description: `${MAX} iterations without reaching result screen.`,
      reproduction: ["Play through hub"], screen: "hub" });
    throw new Error("hub loop timeout");
  }

  private async _doShout() {
    const type = _rng<ShoutType>(["push", "calm", "hold", "more"]);
    const ok = await this.actions.doAction("shout", type);
    if (ok) {
      this.runState.shoutActions.push(type);
      this.coverage.markShout(type);
    }
  }

  private async _waitSimEnd() {
    // Speed up sim to 5× so we observe it but fast
    await this.actions.doAction("set_sim_speed", 8);
    const deadline = Date.now() + 180_000;
    while (Date.now() < deadline) {
      const s = await this._snap();
      if (s.screen !== "sim") return;
      // Occasionally shout during sim (ordinary player)
      if (Math.random() < 0.08) await this._doShout();
      await _wait(2000);
    }
    this._issue({ severity: "critical", category: "bug", title: "Final sim did not complete within 3 minutes",
      description: "Sim canvas was running for >3 minutes without reaching result.",
      reproduction: ["Reach round 6", "Start final sim", "Wait 3 min"], screen: "sim" });
    throw new Error("sim timeout");
  }

  // ── Modal handler ─────────────────────────────────────────────────────

  private async _handleModal(s: GameSnapshot) {
    const modalType = (s as { modalType?: string }).modalType ?? "other";
    const text = (s as { modalText?: string }).modalText ?? "";
    this.session.logTelemetry("modal_seen", { modalType, text: text.substring(0, 100) });

    switch (modalType) {
      case "reward": {
        const rewardPool: RewardKind[] = ["cash", "loan", "cash", "care", "cash"];
        const picked = _rng(rewardPool);
        await this.actions.doAction("pick_reward", picked);
        this.runState.rewardChoices.push(picked);
        this.coverage.markReward(rewardPool.indexOf(picked));
        break;
      }
      case "pcgo":
        await this.actions.doAction("confirm_pcgo");
        break;
      case "post_match":
        await this.actions.doAction("continue_after_match");
        break;
      case "captain":
        // Pick first available captain option (ordinary player)
        await this.actions.doAction("pick_captain", 0);
        break;
      case "style_select": {
        // Play-style picker shown after normalStart() — pick a random style
        const styleIdx = _rni(0, 4);
        await this.actions.doAction("pick_style", styleIdx);
        break;
      }
      case "legacy_bet":
        // Legacy fund modal — skip it (safe choice, doesn't affect normal gameplay)
        await this.actions.doAction("pick_legacy_bet", "skip");
        break;
      case "team_talk":
        // Team talk modal — pick a random option
        await this.actions.doAction("pick_team_talk", _rng(["gaz", "mantik", "sert"]));
        break;
      case "final_tactic":
        await this.actions.doAction("pick_final_tactic");
        break;
      case "final_card":
        await this.actions.doAction("start_final_sim");
        break;
      case "suspension":
        await this.actions.doAction("resolve_suspension");
        break;
      case "penalty":
        await this.actions.doAction("advance_penalty");
        break;
      case "risk_summary":
      case "confirmable":
        // Pre-match risk warning or any primary-button modal — confirm to proceed
        await this.actions.doAction("confirm_modal");
        break;
      case "risk_draft":
        // Risk/Reward draft event — ordinary player: skip it (dismiss) or accept (confirm)
        await this.actions.doAction("dismiss_modal");
        break;
      case "buy_card":
        // Ordinary player: 30% chance to buy when shop modal opens
        if (Math.random() < 0.30) {
          await this.actions.doAction("confirm_modal");
        } else {
          await this.actions.doAction("dismiss_modal");
        }
        break;
      default:
        // Unknown modal — log it as observation and dismiss
        this._issue({ severity: "observation", category: "ux",
          title: `Unclassified modal encountered`,
          description: `Modal with unrecognised content appeared: "${text.substring(0, 80)}"`,
          reproduction: ["Play through hub and observe modals"], screen: "modal" });
        await this.actions.doAction("dismiss_modal");
        break;
    }
  }

  // ── Phase: Result ─────────────────────────────────────────────────────

  private async _phaseResult(): Promise<RunResult["outcome"]> {
    if (!await this._waitScreen("result", 25_000)) {
      return "abandoned";
    }

    const s = await this._snap();
    if (this.cfg.screenshotOnResult) {
      const p = await this.actions.screenshotResult(`run${this.runState.index}_result`);
      this.session.logTelemetry("screenshot", { label: "result", path: p });
    }

    const won = !!(s as { won?: boolean }).won;
    const sacked = !!(s as { wasSacked?: boolean }).wasSacked;
    const outcome: RunResult["outcome"] = sacked ? "sacked" : won ? "win" : "loss";

    // Observe any budget anomalies
    if (s.budget !== null && s.budget !== undefined && (s.budget as number) < -30) {
      this._issue({ severity: "observation", category: "balance",
        title: "End-of-run budget exceeded absolute debt floor",
        description: `Budget ended at €${s.budget}M, below -30.`,
        reproduction: ["Play a full run", "Overspend on cards"], screen: "result" });
    }

    this.session.logTelemetry("run_outcome", { outcome, runIndex: this.runState.index, budget: s.budget });
    console.log(`[run #${this.runState.index}] ${outcome.toUpperCase()} | round ${s.round ?? "?"} | budget €${s.budget ?? "?"}M`);
    return outcome;
  }
}
