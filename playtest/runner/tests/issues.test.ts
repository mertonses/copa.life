/**
 * IssueTracker unit tests
 */
import { test, expect } from "@playwright/test";
import fs from "fs";
import path from "path";
import os from "os";
import { IssueTracker } from "../src/issues";
import { loadConfig } from "../src/config";

function _tmpDir() {
  const d = path.join(os.tmpdir(), `copa-issues-${Date.now()}`);
  fs.mkdirSync(path.join(d, "issues"), { recursive: true });
  return d;
}

const BASE = {
  sessionId: "test123",
  runIndex: 0,
  round: null as null,
};

test.describe("IssueTracker", () => {
  test("records a new issue", () => {
    const cfg = { ...loadConfig(), outputDir: _tmpDir() };
    const tracker = new IssueTracker(cfg, "test");

    const issue = tracker.report({
      ...BASE,
      severity: "major",
      category: "bug",
      title: "Test issue",
      description: "Something broke",
      reproduction: ["Step 1", "Step 2"],
      screen: "hub",
    });

    expect(issue.id).toBeTruthy();
    expect(issue.occurrences).toBe(1);
    expect(issue.confirmed).toBe(false);
    expect(tracker.all()).toHaveLength(1);
  });

  test("deduplicates by title+screen+category fingerprint", () => {
    const cfg = { ...loadConfig(), outputDir: _tmpDir() };
    const tracker = new IssueTracker(cfg, "test2");

    const params = {
      ...BASE,
      severity: "minor" as const,
      category: "ux" as const,
      title: "Button misaligned",
      description: "The button is off",
      reproduction: ["Click hub"],
      screen: "hub" as const,
    };

    tracker.report(params);
    const second = tracker.report(params);

    expect(second.occurrences).toBe(2);
    expect(second.confirmed).toBe(true);
    expect(tracker.all()).toHaveLength(1);
  });

  test("counts by severity", () => {
    const cfg = { ...loadConfig(), outputDir: _tmpDir() };
    const tracker = new IssueTracker(cfg, "test3");

    tracker.report({ ...BASE, severity: "critical", category: "bug", title: "A", description: "", reproduction: [], screen: "sim" });
    tracker.report({ ...BASE, severity: "minor", category: "ux", title: "B", description: "", reproduction: [], screen: "hub" });
    tracker.report({ ...BASE, severity: "minor", category: "ux", title: "C", description: "", reproduction: [], screen: "hub" });

    const counts = tracker.counts();
    expect(counts.critical).toBe(1);
    expect(counts.minor).toBe(2);
    expect(counts.major).toBe(0);
  });
});
