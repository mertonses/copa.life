/**
 * Bridge smoke tests: verify the bridge installs correctly and exposes
 * the expected API when ?autotest=1 is present.
 */
import { test, expect, chromium } from "@playwright/test";
import path from "path";
import { installBridge, waitForBridge, createBridgeHandle } from "../src/bridge";

const GAME_URL = process.env.GAME_URL ?? "http://localhost:5500?autotest=1";

test.describe("Copa Test Bridge", () => {
  test("bridge installs when ?autotest=1 is present", async () => {
    const browser = await chromium.launch({ headless: true });
    const ctx = await browser.newContext();
    const page = await ctx.newPage();

    await installBridge(page);
    await page.goto(GAME_URL, { waitUntil: "domcontentloaded" });

    const ready = await waitForBridge(page, 8000);
    expect(ready).toBe(true);

    const bridgeExists = await page.evaluate(() =>
      typeof (window as unknown as { CopaTestBridge?: unknown }).CopaTestBridge !== "undefined"
    );
    expect(bridgeExists).toBe(true);

    await browser.close();
  });

  test("bridge NOT installed when ?autotest=1 absent", async () => {
    const browser = await chromium.launch({ headless: true });
    const ctx = await browser.newContext();
    const page = await ctx.newPage();

    // Install script still injected by Playwright, but bridge checks the URL param itself
    await installBridge(page);
    const noParamUrl = (process.env.GAME_URL ?? "http://localhost:5500").replace("?autotest=1", "");
    await page.goto(noParamUrl, { waitUntil: "domcontentloaded" });

    const ready = await waitForBridge(page, 3000);
    expect(ready).toBe(false);

    await browser.close();
  });

  test("snapshot returns expected fields", async () => {
    const browser = await chromium.launch({ headless: true });
    const ctx = await browser.newContext();
    const page = await ctx.newPage();

    await installBridge(page);
    await page.goto(GAME_URL, { waitUntil: "domcontentloaded" });
    await waitForBridge(page);

    const bridge = createBridgeHandle(page);
    const snap = await bridge.snapshot();

    expect(snap).toHaveProperty("screen");
    expect(snap).toHaveProperty("ts");
    expect(["intro", "draft", "hub", "sim", "result", "modal", "unknown"]).toContain(snap.screen);

    await browser.close();
  });

  test("availableActions lists expected actions", async () => {
    const browser = await chromium.launch({ headless: true });
    const ctx = await browser.newContext();
    const page = await ctx.newPage();

    await installBridge(page);
    await page.goto(GAME_URL, { waitUntil: "domcontentloaded" });
    await waitForBridge(page);

    const actions: string[] = await page.evaluate(() =>
      (window as unknown as { CopaTestBridge: { availableActions: string[] } }).CopaTestBridge.availableActions
    );

    const expected = [
      "start_new_game", "quick_restart", "select_formation", "pick_draft_option",
      "buy_card", "confirm_modal", "dismiss_modal", "play_match", "shout",
      "select_chair", "pick_reward", "read_shop", "read_deck",
    ];
    for (const name of expected) {
      expect(actions).toContain(name);
    }

    await browser.close();
  });

  test("coverageSummary returns valid structure", async () => {
    const browser = await chromium.launch({ headless: true });
    const ctx = await browser.newContext();
    const page = await ctx.newPage();

    await installBridge(page);
    await page.goto(GAME_URL, { waitUntil: "domcontentloaded" });
    await waitForBridge(page);

    const bridge = createBridgeHandle(page);
    const cov = await bridge.coverageSummary();

    expect(Array.isArray(cov.screensVisited)).toBe(true);
    expect(typeof cov.runsCompleted).toBe("number");
    expect(Array.isArray(cov.chairsUnlocked)).toBe(true);

    await browser.close();
  });
});
