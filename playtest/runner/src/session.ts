/**
 * Session manager: handles persistent session identity, checkpointing,
 * save/restore across browser restarts, and telemetry streaming.
 */
import fs from "fs";
import path from "path";
import crypto from "crypto";
import type { SessionSummary, RunResult, AgentConfig, ChairId, GameSnapshot } from "./types";

export class SessionManager {
  readonly sessionId: string;
  readonly startTs: number;
  private runs: RunResult[] = [];
  private telemetryFile: string;
  private checkpointFile: string;
  private cfg: AgentConfig;

  constructor(cfg: AgentConfig, resumeId?: string) {
    this.cfg = cfg;
    for (const directory of ["sessions", "checkpoints", "screenshots", "telemetry", "issues", "reports", "saves"]) {
      fs.mkdirSync(path.join(cfg.outputDir, directory), { recursive: true });
    }
    this.sessionId = resumeId ?? crypto.randomUUID().substring(0, 8);
    this.startTs = Date.now();

    this.telemetryFile = path.join(cfg.outputDir, "telemetry", `${this.sessionId}.jsonl`);
    this.checkpointFile = path.join(cfg.outputDir, "checkpoints", `${this.sessionId}.json`);

    if (resumeId) this._loadCheckpoint();
    console.log(`[session] ${resumeId ? "Resumed" : "Started"} session ${this.sessionId}`);
  }

  private _loadCheckpoint() {
    if (!fs.existsSync(this.checkpointFile)) return;
    try {
      const data = JSON.parse(fs.readFileSync(this.checkpointFile, "utf-8"));
      this.runs = data.runs ?? [];
      console.log(`[session] Restored ${this.runs.length} prior run(s) from checkpoint`);
    } catch (_) {}
  }

  private _saveCheckpoint() {
    const data = { sessionId: this.sessionId, runs: this.runs, ts: Date.now() };
    fs.writeFileSync(this.checkpointFile, JSON.stringify(data, null, 2), "utf-8");
  }

  /** Stream a telemetry event to the JSONL log */
  logTelemetry(type: string, data: Record<string, unknown>) {
    const line = JSON.stringify({ type, ts: Date.now(), sessionId: this.sessionId, data });
    fs.appendFileSync(this.telemetryFile, line + "\n", "utf-8");
  }

  /** Save a completed run result and checkpoint */
  recordRun(run: RunResult) {
    this.runs.push(run);
    this._saveCheckpoint();
    this.logTelemetry("run_recorded", { runIndex: run.runIndex, outcome: run.outcome });
    console.log(
      `[session] Run #${run.runIndex} complete: ${run.outcome} | round ${run.roundReached} | ` +
      `chair ${run.chairUsed ?? "none"}`
    );
  }

  get runsCompleted(): number { return this.runs.length; }
  get wins(): number { return this.runs.filter(r => r.outcome === "win").length; }
  get losses(): number { return this.runs.filter(r => r.outcome === "loss").length; }
  get sacks(): number { return this.runs.filter(r => r.outcome === "sacked").length; }

  allRuns(): RunResult[] { return [...this.runs]; }

  /** Return a save-state snapshot of game localStorage for external backup */
  captureGameSave(raw: string | null, label: string) {
    if (!raw) return;
    const savePath = path.join(this.cfg.outputDir, "saves", `${this.sessionId}_${label}.json`);
    fs.writeFileSync(savePath, raw, "utf-8");
  }

  summary(chairsUnlocked: ChairId[], coverageMatrix: Record<string, boolean>): SessionSummary {
    return {
      sessionId: this.sessionId,
      startTs: this.startTs,
      endTs: Date.now(),
      runsCompleted: this.runsCompleted,
      wins: this.wins,
      losses: this.losses,
      sacks: this.sacks,
      chairsUnlocked,
      issueCount: { critical: 0, major: 0, minor: 0, observation: 0 },
      coverageMatrix,
      configUsed: this.cfg,
    };
  }
}
