/**
 * Agent action layer: translates high-level decisions into bridge calls.
 * Implements human-like pacing (think time), logs every action to telemetry,
 * and screenshots on failure or issue detection.
 */
import type { Page } from "@playwright/test";
import path from "path";
import type { BridgeHandle, GameSnapshot, AgentConfig, ShoutType } from "./types";
import type { SessionManager } from "./session";

export class ActionLayer {
  private page: Page;
  private bridge: BridgeHandle;
  private cfg: AgentConfig;
  private session: SessionManager;

  constructor(page: Page, bridge: BridgeHandle, cfg: AgentConfig, session: SessionManager) {
    this.page = page;
    this.bridge = bridge;
    this.cfg = cfg;
    this.session = session;
  }

  private async _think() {
    const { min, max } = this.cfg.thinkTimeMs;
    const delay = min + Math.random() * (max - min);
    await new Promise(r => setTimeout(r, delay));
  }

  private async _screenshot(label: string): Promise<string> {
    const fname = `${Date.now()}_${label.replace(/[^a-z0-9_]/gi, "_")}.png`;
    const fpath = path.join(this.cfg.outputDir, "screenshots", fname);
    await this.page.screenshot({ path: fpath, fullPage: true });
    return fpath;
  }

  async doAction(name: string, ...args: unknown[]): Promise<boolean> {
    await this._think();
    this.session.logTelemetry("action_attempt", { name, args });
    const result = await this.bridge.action(name, ...args);
    this.session.logTelemetry("action_result", { name, args, result });

    if (!result.ok) {
      console.warn(`[action] FAILED: ${name}(${args.join(",")}) → ${result.reason}`);
      if (this.cfg.screenshotOnIssue) {
        const p = await this._screenshot(`action_fail_${name}`);
        this.session.logTelemetry("screenshot", { label: `action_fail_${name}`, path: p });
      }
      return false;
    }
    return true;
  }

  async screenshotResult(label: string): Promise<string> {
    return this._screenshot(label);
  }

  async waitForScreen(
    target: string,
    snap: () => Promise<GameSnapshot>,
    maxWaitMs = 30_000
  ): Promise<boolean> {
    const deadline = Date.now() + maxWaitMs;
    while (Date.now() < deadline) {
      const s = await snap();
      if (s.screen === target) return true;
      await new Promise(r => setTimeout(r, 600));
    }
    console.warn(`[action] waitForScreen("${target}") timed out after ${maxWaitMs}ms`);
    return false;
  }

  async startNewGame(): Promise<boolean> {
    return this.doAction("start_new_game");
  }

  async selectFormation(index: number): Promise<boolean> {
    return this.doAction("select_formation", index);
  }

  async pickDraftOption(index: number): Promise<boolean> {
    return this.doAction("pick_draft_option", index);
  }

  async playMatch(): Promise<boolean> {
    return this.doAction("play_match");
  }

  async shout(type: ShoutType): Promise<boolean> {
    return this.doAction("shout", type);
  }

  async pickReward(index: number): Promise<boolean> {
    return this.doAction("pick_reward", index);
  }

  async dismissModal(): Promise<boolean> {
    return this.doAction("dismiss_modal");
  }

  async confirmModal(): Promise<boolean> {
    return this.doAction("confirm_modal");
  }

  async selectChair(chairId: string): Promise<boolean> {
    return this.doAction("select_chair", chairId);
  }
}
