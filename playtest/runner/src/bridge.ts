/**
 * Bridge wrapper: wraps Playwright Page to expose CopaTestBridge calls
 * as typed async methods. The actual bridge JS lives in bridge/copa-test-bridge.js
 * and is injected via addInitScript before each page load.
 */
import type { Page } from "@playwright/test";
import path from "path";
import type { BridgeHandle, GameSnapshot, ActionResult, CoverageSummary } from "./types";

const BRIDGE_PATH = path.resolve(__dirname, "../../bridge/copa-test-bridge.js");

export async function installBridge(page: Page): Promise<void> {
  await page.addInitScript({ path: BRIDGE_PATH });
}

export function createBridgeHandle(page: Page): BridgeHandle {
  async function evaluate<T>(fn: string, ...args: unknown[]): Promise<T> {
    // Builds a call to window.CopaTestBridge.<fn>(...args)
    return page.evaluate(
      ([method, methodArgs]: [string, unknown[]]) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const bridge = (globalThis as any).CopaTestBridge as Record<string, (...a: unknown[]) => unknown>;
        if (!bridge) throw new Error("CopaTestBridge not installed");
        return bridge[method](...methodArgs) as T;
      },
      [fn, args] as [string, unknown[]]
    );
  }

  return {
    snapshot: () => evaluate<GameSnapshot>("snapshot"),
    modalContent: () => evaluate<string | null>("modalContent"),
    action: (name: string, ...args: unknown[]) => evaluate<ActionResult>("action", name, ...args),
    coverageSummary: () => evaluate<CoverageSummary>("coverageSummary"),
    saveCheckpoint: (key: string, data: Record<string, unknown>) =>
      evaluate<ActionResult>("saveCheckpoint", key, data),
    loadCheckpoint: (key: string) =>
      evaluate<Record<string, unknown> | null>("loadCheckpoint", key),
    readGlobal: (name: string) => evaluate<unknown>("readGlobal", name),
  };
}

/** Wait until bridge is installed and ready */
export async function waitForBridge(page: Page, timeoutMs = 10_000): Promise<boolean> {
  try {
    await page.waitForFunction(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      () => typeof (globalThis as any).CopaTestBridge !== "undefined",
      undefined,
      { timeout: timeoutMs }
    );
    return true;
  } catch {
    return false;
  }
}
