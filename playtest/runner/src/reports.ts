/**
 * Report generator: produces JSON + Markdown reports from session data.
 */
import fs from "fs";
import path from "path";
import type { SessionSummary, Issue, RunResult, AgentConfig } from "./types";
import type { IssueTracker } from "./issues";
import type { SessionManager } from "./session";
import type { CoverageTracker } from "./coverage";

export class ReportGenerator {
  private cfg: AgentConfig;
  private session: SessionManager;
  private issues: IssueTracker;
  private coverage: CoverageTracker;

  constructor(cfg: AgentConfig, session: SessionManager, issues: IssueTracker, coverage: CoverageTracker) {
    this.cfg = cfg;
    this.session = session;
    this.issues = issues;
    this.coverage = coverage;
  }

  private _outPath(name: string): string {
    return path.join(this.cfg.outputDir, "reports", name);
  }

  generateCampaignReport(): string {
    const sid = this.session.sessionId;
    const runs = this.session.allRuns();
    const allIssues = this.issues.all();
    const coverageFlat = this.coverage.toFlat();

    const json = {
      sessionId: sid,
      generatedAt: new Date().toISOString(),
      summary: {
        runsCompleted: this.session.runsCompleted,
        wins: this.session.wins,
        losses: this.session.losses,
        sacks: this.session.sacks,
        chairsUnlocked: this.coverage.unlockedChairs(),
        allChairsUnlocked: this.coverage.isComplete(),
        issueCounts: this.issues.counts(),
      },
      coverage: coverageFlat,
      issues: allIssues,
      runs: runs.map(r => ({
        ...r,
        durationSec: Math.round(r.durationMs / 1000),
      })),
    };

    const jsonPath = this._outPath(`${sid}_campaign.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(json, null, 2), "utf-8");

    const mdPath = this._outPath(`${sid}_campaign.md`);
    fs.writeFileSync(mdPath, this._campaignMarkdown(json), "utf-8");

    console.log(`[report] Campaign report written: ${mdPath}`);
    return mdPath;
  }

  generateMatchReport(run: RunResult): string {
    const mdPath = this._outPath(`${this.session.sessionId}_run${run.runIndex}.md`);
    const lines = [
      `# Run #${run.runIndex} — ${run.outcome.toUpperCase()}`,
      `**Chair:** ${run.chairUsed ?? "unknown"} | **Round reached:** ${run.roundReached} | **Duration:** ${Math.round(run.durationMs / 1000)}s`,
      `**Cards bought:** ${run.cardsBought.join(", ") || "none"}`,
      `**Shouts used:** ${run.shoutActions.join(", ") || "none"}`,
      `**Rewards chosen:** ${run.rewardChoices.join(", ") || "none"}`,
      "",
      `## Issues observed (${run.issuesObserved.length})`,
      ...run.issuesObserved.map(id => `- ${id}`),
    ];
    fs.writeFileSync(mdPath, lines.join("\n"), "utf-8");
    return mdPath;
  }

  private _campaignMarkdown(json: {
    sessionId: string;
    generatedAt: string;
    summary: { runsCompleted: number; wins: number; losses: number; sacks: number; chairsUnlocked: string[]; allChairsUnlocked: boolean; issueCounts: Record<string, number> };
    issues: Issue[];
    coverage: Record<string, boolean>;
  }): string {
    const s = json.summary;
    const winRate = s.runsCompleted > 0
      ? Math.round((s.wins / s.runsCompleted) * 100)
      : 0;

    const issueSection = json.issues.length === 0
      ? "_No issues recorded._"
      : [...json.issues]
          .sort((a, b) => {
            const order: Record<string, number> = { critical: 0, major: 1, minor: 2, observation: 3 };
            return (order[a.severity] ?? 9) - (order[b.severity] ?? 9);
          })
          .map(i =>
            `### [${i.severity.toUpperCase()}] ${i.title}\n` +
            `**Category:** ${i.category} | **Screen:** ${i.screen} | **Occurrences:** ${i.occurrences} | **Confirmed:** ${i.confirmed}\n\n` +
            `${i.description}\n\n` +
            `**Reproduction steps:**\n${i.reproduction.map((step, n) => `${n + 1}. ${step}`).join("\n")}\n\n` +
            (i.evidence ? `**Evidence:** ${i.evidence}\n` : "")
          )
          .join("\n---\n");

    const coverageLines = Object.entries(json.coverage)
      .map(([k, v]) => `- [${v ? "x" : " "}] ${k}`);

    return [
      `# Copa Agent Campaign Report`,
      `**Session:** \`${json.sessionId}\` | **Generated:** ${json.generatedAt}`,
      "",
      `## Summary`,
      `| Metric | Value |`,
      `|--------|-------|`,
      `| Runs | ${s.runsCompleted} |`,
      `| Wins | ${s.wins} (${winRate}%) |`,
      `| Losses | ${s.losses} |`,
      `| Sacks | ${s.sacks} |`,
      `| Chairs unlocked | ${s.chairsUnlocked.join(", ") || "none"} |`,
      `| All chairs unlocked | ${s.allChairsUnlocked ? "YES ✓" : "no"} |`,
      `| Issues (critical/major/minor/obs) | ${s.issueCounts.critical}/${s.issueCounts.major}/${s.issueCounts.minor}/${s.issueCounts.observation} |`,
      "",
      `## Coverage`,
      ...coverageLines,
      "",
      `## Issues`,
      issueSection,
    ].join("\n");
  }

}
