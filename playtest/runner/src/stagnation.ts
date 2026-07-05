/**
 * Stagnation detector: tracks whether the game has progressed.
 * If no screen change or meaningful state change occurs within the timeout,
 * the agent declares stagnation and can abandon the run.
 */
import type { Screen, GameSnapshot } from "./types";

interface StagnationTick {
  ts: number;
  screen: Screen;
  round: number | null;
  stateKey: string;
}

function _stateKey(snap: GameSnapshot): string {
  return `${snap.screen}|r${snap.round}|b${snap.budget}|ended:${snap.runEnded}`;
}

export class StagnationDetector {
  private ticks: StagnationTick[] = [];
  private timeoutMs: number;

  constructor(timeoutMs: number) {
    this.timeoutMs = timeoutMs;
  }

  tick(snap: GameSnapshot): "ok" | "stagnant" {
    const key = _stateKey(snap);
    const now = Date.now();
    const last = this.ticks[this.ticks.length - 1];

    if (!last || last.stateKey !== key) {
      // State changed — reset
      this.ticks = [{ ts: now, screen: snap.screen, round: snap.round, stateKey: key }];
      return "ok";
    }

    // State unchanged since last tick
    const elapsed = now - this.ticks[0].ts;
    if (elapsed > this.timeoutMs) {
      console.warn(
        `[stagnation] No state change for ${Math.round(elapsed / 1000)}s on screen "${snap.screen}"`
      );
      return "stagnant";
    }
    return "ok";
  }

  reset() {
    this.ticks = [];
  }
}
