// ── Shared types for the Copa Agent runner ────────────────────────────────

export type Screen =
  | "intro"
  | "draft"
  | "draw"
  | "hub"
  | "sim"
  | "result"
  | "modal"
  | "unknown";

export type ShoutType = "push" | "calm" | "hold" | "more";

export type ChairId =
  | "babacan"
  | "leydi"
  | "pinti"
  | "sansasyoncu"
  | "torpilci"
  | "cilgin";

export interface MetaState {
  unlockedChairs: ChairId[];
  selectedChairId: ChairId | null;
  metaBest: Record<string, unknown>;
  metaRuns: number;
  eliteBonus: number;
  legacyFund: number;
  unlockedForms: string[];
}

export interface GameSnapshot {
  screen: Screen;
  ts: number;
  round: number | null;
  budget: number | null;
  runEnded: boolean | null;
  lang: string | null;
  darkTheme: boolean | null;
  meta?: MetaState;
  opponent?: unknown;
  fixtures?: unknown[];
  cards?: unknown[];
  lastResult?: unknown;
  squadPower?: number | null;
  draftOffers?: unknown;
  draftPicks?: unknown;
  fixtureRows?: string[];
  simScore?: string | null;
  simComm?: string | null;
  momentum?: string | null;
  resultText?: string | null;
  wasSacked?: boolean | null;
}

export interface ActionResult {
  ok: boolean;
  reason?: string;
  note?: string;
  [key: string]: unknown;
}

export interface TelemetryEvent {
  type: string;
  ts: number;
  data: Record<string, unknown>;
}

export type IssueSeverity = "critical" | "major" | "minor" | "observation";
export type IssueCategory =
  | "bug"
  | "balance"
  | "ux"
  | "simulation_quality"
  | "performance"
  | "exploit";

export interface Issue {
  id: string;
  severity: IssueSeverity;
  category: IssueCategory;
  title: string;
  description: string;
  reproduction: string[];
  evidence: string; // path to screenshot or log excerpt
  screen: Screen;
  sessionId: string;
  runIndex: number;
  round: number | null;
  ts: number;
  confirmed: boolean; // observed more than once
  occurrences: number;
}

export interface RunResult {
  runIndex: number;
  sessionId: string;
  startTs: number;
  endTs: number;
  durationMs: number;
  outcome: "win" | "loss" | "sacked" | "abandoned";
  roundReached: number;
  chairUsed: ChairId | null;
  formationChosen: string | null;
  cardsBought: string[];
  shoutActions: ShoutType[];
  rewardChoices: string[];
  issuesObserved: string[]; // issue IDs
  snapshotCount: number;
  budget: {
    start: number | null;
    end: number | null;
    peak: number | null;
    nadir: number | null;
  };
}

export interface SessionSummary {
  sessionId: string;
  startTs: number;
  endTs: number | null;
  runsCompleted: number;
  wins: number;
  losses: number;
  sacks: number;
  chairsUnlocked: ChairId[];
  issueCount: Record<IssueSeverity, number>;
  coverageMatrix: Record<string, boolean>;
  configUsed: AgentConfig;
}

export interface AgentConfig {
  gameUrl: string;
  targetChairs: ChairId[];
  maxRunsPerSession: number;
  maxSessionDurationMs: number;
  screenshotOnIssue: boolean;
  screenshotOnResult: boolean;
  headless: boolean;
  slowMoMs: number;
  thinkTimeMs: { min: number; max: number };
  stagnationTimeoutMs: number;
  outputDir: string;
}

export interface BridgeHandle {
  snapshot(): Promise<GameSnapshot>;
  modalContent(): Promise<string | null>;
  action(name: string, ...args: unknown[]): Promise<ActionResult>;
  coverageSummary(): Promise<CoverageSummary>;
  saveCheckpoint(key: string, data: Record<string, unknown>): Promise<ActionResult>;
  loadCheckpoint(key: string): Promise<Record<string, unknown> | null>;
  readGlobal(name: string): Promise<unknown>;
}

export interface CoverageSummary {
  screensVisited: Screen[];
  actionsExecuted: number;
  chairsUnlocked: ChairId[];
  runsCompleted: number;
  wins: number;
  losses: number;
  sacks: number;
  shoutTypesUsed: ShoutType[];
}
