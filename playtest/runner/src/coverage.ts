/**
 * Coverage matrix: tracks which game states and paths have been tested.
 * All 6 presidents must be unlocked to consider campaign complete.
 */
import type { ChairId, Screen, RunResult } from "./types";

const ALL_CHAIRS: ChairId[] = ["babacan", "leydi", "pinti", "sansasyoncu", "torpilci", "cilgin"];
const ALL_SCREENS: Screen[] = ["intro", "draft", "draw", "hub", "sim", "result"];
const ALL_SHOUTS = ["push", "calm", "hold", "more"];

export interface CoverageMatrix {
  screens: Record<Screen, boolean>;
  chairs: Record<ChairId, boolean>;
  shouts: Record<string, boolean>;
  rewardChoices: Record<number, boolean>;
  darkMode: boolean;
  lightMode: boolean;
  atLeastOneWin: boolean;
  atLeastOneLoss: boolean;
  atLeastOneSack: boolean;
  allChairsUnlocked: boolean;
}

export class CoverageTracker {
  private matrix: CoverageMatrix;

  constructor() {
    this.matrix = {
      screens: Object.fromEntries(ALL_SCREENS.map(s => [s, false])) as Record<Screen, boolean>,
      chairs: Object.fromEntries(ALL_CHAIRS.map(c => [c, false])) as Record<ChairId, boolean>,
      shouts: Object.fromEntries(ALL_SHOUTS.map(s => [s, false])),
      rewardChoices: { 0: false, 1: false },
      darkMode: false,
      lightMode: false,
      atLeastOneWin: false,
      atLeastOneLoss: false,
      atLeastOneSack: false,
      allChairsUnlocked: false,
    };
  }

  markScreen(screen: Screen) { this.matrix.screens[screen] = true; }
  markChair(chair: ChairId) { this.matrix.chairs[chair] = true; }
  markShout(shout: string) { if (shout in this.matrix.shouts) this.matrix.shouts[shout] = true; }
  markReward(index: number) { if (index in this.matrix.rewardChoices) this.matrix.rewardChoices[index] = true; }
  markTheme(dark: boolean) { if (dark) this.matrix.darkMode = true; else this.matrix.lightMode = true; }
  markOutcome(outcome: "win" | "loss" | "sacked") {
    if (outcome === "win") this.matrix.atLeastOneWin = true;
    if (outcome === "loss") this.matrix.atLeastOneLoss = true;
    if (outcome === "sacked") this.matrix.atLeastOneSack = true;
  }

  updateFromUnlockedChairs(chairs: ChairId[]) {
    chairs.forEach(c => this.markChair(c));
    this.matrix.allChairsUnlocked = ALL_CHAIRS.every(c => chairs.includes(c));
  }

  restoreFromRuns(runs: RunResult[]) {
    for (const run of runs) {
      if (run.outcome !== "abandoned") {
        ALL_SCREENS.forEach(screen => this.markScreen(screen));
        this.markTheme(false);
      }
      if (run.chairUsed) this.markChair(run.chairUsed);
      run.shoutActions.forEach(shout => this.markShout(shout));
      if (run.rewardChoices.includes("cash")) this.markReward(0);
      if (run.rewardChoices.includes("loan")) this.markReward(1);
      if (run.outcome !== "abandoned") this.markOutcome(run.outcome);
    }
  }

  isComplete(): boolean { return this.matrix.allChairsUnlocked; }

  toFlat(): Record<string, boolean> {
    const out: Record<string, boolean> = {};
    Object.entries(this.matrix.screens).forEach(([k, v]) => { out[`screen:${k}`] = v; });
    Object.entries(this.matrix.chairs).forEach(([k, v]) => { out[`chair:${k}`] = v; });
    Object.entries(this.matrix.shouts).forEach(([k, v]) => { out[`shout:${k}`] = v; });
    Object.entries(this.matrix.rewardChoices).forEach(([k, v]) => { out[`reward:${k}`] = v; });
    out["theme:dark"] = this.matrix.darkMode;
    out["theme:light"] = this.matrix.lightMode;
    out["outcome:win"] = this.matrix.atLeastOneWin;
    out["outcome:loss"] = this.matrix.atLeastOneLoss;
    out["outcome:sacked"] = this.matrix.atLeastOneSack;
    out["allChairsUnlocked"] = this.matrix.allChairsUnlocked;
    return out;
  }

  unlockedChairs(): ChairId[] {
    return ALL_CHAIRS.filter(c => this.matrix.chairs[c]);
  }

  report(): string {
    const flat = this.toFlat();
    const done = Object.values(flat).filter(Boolean).length;
    const total = Object.values(flat).length;
    return `Coverage: ${done}/${total} | Chairs: ${this.unlockedChairs().join(", ") || "none"} | Complete: ${this.isComplete()}`;
  }
}
