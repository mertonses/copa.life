import path from "path";
import fs from "fs";
import type { AgentConfig, ChairId } from "./types";

const OUTPUT_ROOT = path.resolve(__dirname, "../../playtest-output");

const DEFAULTS: AgentConfig = {
  gameUrl: "http://localhost:5500?autotest=1",
  targetChairs: ["babacan", "leydi", "pinti", "sansasyoncu", "torpilci", "cilgin"] as ChairId[],
  minRunsPerSession: 0,
  maxRunsPerSession: 100,
  maxSessionDurationMs: 8 * 60 * 60 * 1000, // 8 hours
  screenshotOnIssue: true,
  screenshotOnResult: true,
  headless: false,
  slowMoMs: 150,
  thinkTimeMs: { min: 400, max: 1200 },
  stagnationTimeoutMs: 90_000,
  outputDir: OUTPUT_ROOT,
};

export function loadConfig(configPath?: string): AgentConfig {
  const defaults = { ...DEFAULTS };
  const cfgFile = configPath ?? path.resolve(__dirname, "../../config.json");
  if (!fs.existsSync(cfgFile)) return defaults;
  try {
    const overrides = JSON.parse(fs.readFileSync(cfgFile, "utf-8"));
    const merged = { ...defaults, ...overrides };
    if (!Number.isInteger(merged.minRunsPerSession) || merged.minRunsPerSession < 0) {
      throw new Error("minRunsPerSession must be a non-negative integer");
    }
    if (!Number.isInteger(merged.maxRunsPerSession) || merged.maxRunsPerSession < 1) {
      throw new Error("maxRunsPerSession must be a positive integer");
    }
    if (merged.minRunsPerSession > merged.maxRunsPerSession) {
      throw new Error("minRunsPerSession cannot exceed maxRunsPerSession");
    }
    return merged;
  } catch (e) {
    console.warn(`[config] Failed to parse ${cfgFile}: ${e}. Using defaults.`);
    return defaults;
  }
}

export function outputPath(cfg: AgentConfig, ...parts: string[]): string {
  return path.join(cfg.outputDir, ...parts);
}
