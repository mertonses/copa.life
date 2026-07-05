/**
 * Issue tracker: deduplicates, persists, and manages observed issues.
 * Never auto-fixes anything — only records.
 */
import fs from "fs";
import path from "path";
import crypto from "crypto";
import type { Issue, IssueSeverity, IssueCategory, Screen, AgentConfig } from "./types";

export class IssueTracker {
  private issues = new Map<string, Issue>();
  private issueFile: string;

  constructor(cfg: AgentConfig, sessionId: string) {
    this.issueFile = path.join(cfg.outputDir, "issues", `${sessionId}.jsonl`);
    this._load();
  }

  private _load() {
    if (!fs.existsSync(this.issueFile)) return;
    const lines = fs.readFileSync(this.issueFile, "utf-8").split("\n").filter(Boolean);
    for (const line of lines) {
      try {
        const issue: Issue = JSON.parse(line);
        this.issues.set(issue.id, issue);
      } catch (_) {}
    }
  }

  private _append(issue: Issue) {
    fs.appendFileSync(this.issueFile, JSON.stringify(issue) + "\n", "utf-8");
  }

  report(params: {
    severity: IssueSeverity;
    category: IssueCategory;
    title: string;
    description: string;
    reproduction: string[];
    evidence?: string;
    screen: Screen;
    sessionId: string;
    runIndex: number;
    round: number | null;
  }): Issue {
    // Deduplicate by title fingerprint
    const fingerprint = crypto
      .createHash("md5")
      .update(params.title + params.screen + params.category)
      .digest("hex")
      .substring(0, 12);

    const existing = this.issues.get(fingerprint);
    if (existing) {
      existing.occurrences++;
      if (!existing.confirmed && existing.occurrences >= 2) existing.confirmed = true;
      // Rewrite entire file is expensive; instead append an update line
      this._append({ ...existing, _type: "update" } as unknown as Issue);
      return existing;
    }

    const issue: Issue = {
      id: fingerprint,
      severity: params.severity,
      category: params.category,
      title: params.title,
      description: params.description,
      reproduction: params.reproduction,
      evidence: params.evidence ?? "",
      screen: params.screen,
      sessionId: params.sessionId,
      runIndex: params.runIndex,
      round: params.round,
      ts: Date.now(),
      confirmed: false,
      occurrences: 1,
    };

    this.issues.set(fingerprint, issue);
    this._append(issue);
    console.log(`[issue] ${issue.severity.toUpperCase()} [${issue.category}] ${issue.title}`);
    return issue;
  }

  all(): Issue[] {
    return [...this.issues.values()];
  }

  bySeverity(s: IssueSeverity): Issue[] {
    return this.all().filter(i => i.severity === s);
  }

  counts(): Record<IssueSeverity, number> {
    const all = this.all();
    return {
      critical: all.filter(i => i.severity === "critical").length,
      major: all.filter(i => i.severity === "major").length,
      minor: all.filter(i => i.severity === "minor").length,
      observation: all.filter(i => i.severity === "observation").length,
    };
  }
}
