/**
 * Bridge smoke tests: verify the bridge installs correctly and exposes
 * the expected API when ?autotest=1 is present.
 */
import { test, expect } from "@playwright/test";
import { installBridge, waitForBridge, createBridgeHandle } from "../src/bridge";

const GAME_URL = process.env.GAME_URL ?? "http://localhost:5500?autotest=1";

test.describe("Copa Test Bridge", () => {
  test("bridge installs when ?autotest=1 is present", async ({page}) => {
    await installBridge(page);
    await page.goto(GAME_URL, { waitUntil: "domcontentloaded" });

    const ready = await waitForBridge(page, 8000);
    expect(ready).toBe(true);

    const bridgeExists = await page.evaluate(() =>
      typeof (window as unknown as { CopaTestBridge?: unknown }).CopaTestBridge !== "undefined"
    );
    expect(bridgeExists).toBe(true);

  });

  test("bridge NOT installed when ?autotest=1 absent", async ({page}) => {
    // Install script still injected by Playwright, but bridge checks the URL param itself
    await installBridge(page);
    const noParamUrl = (process.env.GAME_URL ?? "http://localhost:5500").replace("?autotest=1", "");
    await page.goto(noParamUrl, { waitUntil: "domcontentloaded" });

    const ready = await waitForBridge(page, 3000);
    expect(ready).toBe(false);

  });

  test("snapshot returns expected fields", async ({page}) => {
    await installBridge(page);
    await page.goto(GAME_URL, { waitUntil: "domcontentloaded" });
    await waitForBridge(page);

    const bridge = createBridgeHandle(page);
    const snap = await bridge.snapshot();

    expect(snap).toHaveProperty("screen");
    expect(snap).toHaveProperty("ts");
    expect(["intro", "draft", "hub", "sim", "result", "modal", "unknown"]).toContain(snap.screen);

  });

  test("availableActions lists expected actions", async ({page}) => {
    await installBridge(page);
    await page.goto(GAME_URL, { waitUntil: "domcontentloaded" });
    await waitForBridge(page);

    const actions: string[] = await page.evaluate(() =>
      (window as unknown as { CopaTestBridge: { availableActions: string[] } }).CopaTestBridge.availableActions
    );

    const expected = [
      "start_new_game", "select_formation", "pick_draft_option",
      "open_card", "confirm_modal", "dismiss_modal", "play_match", "shout",
      "select_chair", "pick_reward", "read_shop", "read_deck",
    ];
    for (const name of expected) {
      expect(actions).toContain(name);
    }
  });

  test("coverageSummary returns valid structure", async ({page}) => {
    await installBridge(page);
    await page.goto(GAME_URL, { waitUntil: "domcontentloaded" });
    await waitForBridge(page);

    const bridge = createBridgeHandle(page);
    const cov = await bridge.coverageSummary();

    expect(Array.isArray(cov.screensVisited)).toBe(true);
    expect(typeof cov.runsCompleted).toBe("number");
    expect(Array.isArray(cov.chairsUnlocked)).toBe(true);
  });
});
