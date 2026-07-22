/**
 * Session + checkpoint tests (no browser needed — file I/O only)
 */
import { test, expect } from "@playwright/test";
import fs from "fs";
import path from "path";
import os from "os";
import { SessionManager } from "../src/session";
import { loadConfig } from "../src/config";

function _tmpDir() {
  const d = path.join(os.tmpdir(), `copa-test-${Date.now()}`);
  fs.mkdirSync(d, { recursive: true });
  ["sessions", "checkpoints", "telemetry", "saves"].forEach(sub =>
    fs.mkdirSync(path.join(d, sub), { recursive: true })
  );
  return d;
}

test.describe("SessionManager", () => {
  test("creates every output directory on a fresh installation", () => {
    const root = path.join(os.tmpdir(), `copa-test-empty-${Date.now()}`);
    fs.mkdirSync(root, { recursive: true });
    const cfg = { ...loadConfig(), outputDir: root };
    new SessionManager(cfg);
    for (const directory of ["sessions", "checkpoints", "screenshots", "telemetry", "issues", "reports", "saves"]) {
      expect(fs.existsSync(path.join(root, directory))).toBe(true);
    }
  });

  test("creates a new session and records runs", () => {
    const cfg = { ...loadConfig(), outputDir: _tmpDir() };
    const mgr = new SessionManager(cfg);

    expect(mgr.sessionId).toBeTruthy();
    expect(mgr.runsCompleted).toBe(0);

    mgr.recordRun({
      runIndex: 0,
      sessionId: mgr.sessionId,
      startTs: Date.now() - 5000,
      endTs: Date.now(),
      durationMs: 5000,
      outcome: "win",
      roundReached: 6,
      chairUsed: "babacan",
      formationChosen: "4-3-3",
      cardsBought: [],
      shoutActions: [],
      rewardChoices: [],
      issuesObserved: [],
      snapshotCount: 10,
      budget: { start: 30, end: 12, peak: 30, nadir: 8 },
    });

    expect(mgr.runsCompleted).toBe(1);
    expect(mgr.wins).toBe(1);
    expect(mgr.losses).toBe(0);
  });

  test("checkpoint persists and can be resumed", () => {
    const dir = _tmpDir();
    const cfg = { ...loadConfig(), outputDir: dir };

    const mgr1 = new SessionManager(cfg);
    const sid = mgr1.sessionId;
    mgr1.recordRun({
      runIndex: 0, sessionId: sid, startTs: 0, endTs: 1, durationMs: 1,
      outcome: "loss", roundReached: 3, chairUsed: "babacan",
      formationChosen: null, cardsBought: [], shoutActions: [],
      rewardChoices: [], issuesObserved: [], snapshotCount: 5,
      budget: { start: 30, end: 20, peak: 30, nadir: 10 },
    });

    // Resume
    const mgr2 = new SessionManager(cfg, sid);
    expect(mgr2.sessionId).toBe(sid);
    expect(mgr2.runsCompleted).toBe(1);
    expect(mgr2.losses).toBe(1);
  });
});
