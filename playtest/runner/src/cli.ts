#!/usr/bin/env ts-node
/**
 * CLI entry point for the Copa Agent.
 * Usage:
 *   npx ts-node src/cli.ts [--resume <sessionId>] [--config <path>] [--headless] [--url <url>]
 */
import { CopaAgent } from "./agent";
import { loadConfig } from "./config";

function parseArgs(): { resumeId?: string; configPath?: string; overrides: Record<string, unknown> } {
  const args = process.argv.slice(2);
  let resumeId: string | undefined;
  let configPath: string | undefined;
  const overrides: Record<string, unknown> = {};

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--resume" && args[i + 1]) { resumeId = args[++i]; }
    else if (a === "--config" && args[i + 1]) { configPath = args[++i]; }
    else if (a === "--headless") { overrides.headless = true; }
    else if (a === "--url" && args[i + 1]) { overrides.gameUrl = args[++i]; }
    else if (a === "--max-runs" && args[i + 1]) { overrides.maxRunsPerSession = parseInt(args[++i], 10); }
    else if (a === "--help" || a === "-h") {
      console.log(`
Copa Agent — Autonomous playtesting system

Usage:
  npx ts-node src/cli.ts [options]

Options:
  --resume <sessionId>   Resume a prior session by ID
  --config <path>        Path to config.json (default: ../../config.json)
  --headless             Run browser in headless mode
  --url <url>            Override game URL (default: http://localhost:5500?autotest=1)
  --max-runs <n>         Maximum runs per session (default: 100)
  --help                 Show this help

Output:
  All output goes to playtest/playtest-output/
    sessions/     Session logs
    checkpoints/  Resume state
    screenshots/  Issue screenshots
    telemetry/    JSONL event stream
    issues/       Issue JSONL log
    reports/      Markdown + JSON reports
    saves/        Game localStorage backups
`);
      process.exit(0);
    }
  }

  return { resumeId, configPath, overrides };
}

async function main() {
  const { resumeId, configPath, overrides } = parseArgs();
  const cfg = { ...loadConfig(configPath), ...overrides };

  console.log(`[copa-agent] Starting ${resumeId ? `(resume: ${resumeId})` : "(new session)"}`);
  console.log(`[copa-agent] URL: ${cfg.gameUrl}`);
  console.log(`[copa-agent] Max runs: ${cfg.maxRunsPerSession}`);
  console.log(`[copa-agent] Output: ${cfg.outputDir}`);

  const agent = new CopaAgent(cfg);

  process.on("SIGINT", () => {
    console.log("\n[copa-agent] Interrupted — checkpoint saved. Resume with --resume <sessionId>");
    process.exit(0);
  });

  await agent.run(resumeId);
}

main().catch(e => {
  console.error("[copa-agent] Fatal:", e);
  process.exit(1);
});
