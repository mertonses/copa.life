import { test, expect } from "@playwright/test";

test("Android presents filtered notifications and a safe pinch-zoom pitch control", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-chromium", "Android interaction contract");
  await page.goto("/?native-game=1&android-enhancements=1", { waitUntil: "domcontentloaded" });
  await page.evaluate(async () => {
    const game = globalThis as any;
    game.CopaMobileShell?.newRun();
    await game.quickStart();
    if (game._countryDraftPromise) await game._countryDraftPromise;
    await game.quickAll();
    // quickAll may leave the captain picker open in the native fixture. Close
    // transient sheets before exercising the feed so the tap targets are
    // deterministic and the test covers the feed, not the previous modal.
    game.closeModal?.();
  });
  await expect(page.locator("#postClubName")).toBeVisible();
  await page.locator("#postClubName").fill("Android Enhancement FK");
  await page.evaluate(() => {
    const game = globalThis as any;
    game.pcGo();
    game.fastTournamentDraw();
    game.finishTournamentDraw();
  });
  await expect(page.locator("#hub")).toBeVisible();
  await page.evaluate(() => {
    const game = globalThis as any;
    game.pushFeed("Oyuncu transferi tamamlandı", "buy");
    game.pushFeed("Golcü sakatlandı", "lose");
    game.pushFeed("Maç başladı", "pres");
    game.pushFeed("Turnuva eşleşmesi açıklandı", "pres");
  });
  await expect(page.locator("#mobileFeedToggle")).toBeVisible();
  await page.locator("#mobileFeedToggle").click();
  await expect(page.locator(".mobile-feed-filters [data-feed-filter='injury']")).toBeVisible();
  await page.locator(".mobile-feed-filters [data-feed-filter='injury']").click();
  await expect(page.locator(".mobile-feed-history .feeditem:not([hidden])")).toHaveCount(1);
  await expect(page.locator(".mobile-feed-history .feeditem:not([hidden])")).toContainText("sakatlandı");
  await page.evaluate(() => (globalThis as any).closeModal());

  const zoomState = await page.locator("#hub .pitch-area > .pitch").evaluate((pitch: HTMLElement) => {
    const reset = pitch.parentElement?.querySelector(".mobile-pitch-zoom-reset") as HTMLButtonElement | null;
    const first = new Touch({ identifier: 1, target: pitch, clientX: 80, clientY: 160 });
    const second = new Touch({ identifier: 2, target: pitch, clientX: 200, clientY: 160 });
    pitch.dispatchEvent(new TouchEvent("touchstart", { touches: [first, second], targetTouches: [first, second], changedTouches: [first, second], bubbles: true }));
    const wider = new Touch({ identifier: 2, target: pitch, clientX: 260, clientY: 160 });
    pitch.dispatchEvent(new TouchEvent("touchmove", { touches: [first, wider], targetTouches: [first, wider], changedTouches: [wider], bubbles: true, cancelable: true }));
    return { transform: getComputedStyle(pitch).transform, resetVisible: !!reset && !reset.hidden };
  });
  expect(zoomState.transform).not.toBe("none");
  expect(zoomState.resetVisible).toBe(true);
});
