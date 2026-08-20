import { test, expect } from "@playwright/test";

test("web and Android expose the same deterministic visual QA fixture", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "one cross-artifact assertion is sufficient");
  const snapshots: string[] = [];
  for (const path of ["/index.html?testMode=platform-parity", "/dist-android/index.html?testMode=platform-parity"]) {
    await page.goto(path, { waitUntil: "domcontentloaded" });
    const fixture = await page.evaluate(() => {
      const api = (globalThis as any).CopaTestFixtures;
      if (!api || api.mode !== "platform-parity") return null;
      return api.common();
    });
    expect(fixture).not.toBeNull();
    expect(fixture.club.name).toBe("Copa Test United");
    expect(fixture.squad).toHaveLength(11);
    expect(fixture.squad.map((player: any) => player.playerId)).toContain("fixture-fw-02");
    snapshots.push(JSON.stringify(fixture));
  }
  expect(snapshots[0]).toBe(snapshots[1]);
});
