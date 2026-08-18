import { test, expect } from "@playwright/test";

test("notification center keeps preferences, deduplicates events and separates Play Games", async ({ page }, testInfo) => {
  test.skip(!["mobile-chromium", "webkit-mobile", "desktop-chromium"].includes(testInfo.project.name), "notification UI contract");
  await page.addInitScript(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.goto("/?notification-qa=1", { waitUntil: "domcontentloaded" });
  await expect.poll(() => page.evaluate(() => !!(globalThis as any).CopaNotificationCenter)).toBe(true);

  const surface = await page.evaluate(async () => {
    const center = (globalThis as any).CopaNotificationCenter;
    const before = center.getPreferences();
    center.setCategory("injury", false);
    const filtered = await center.publish({ id: "qa-injury", type: "injury", title: "Injury", body: "Should be filtered" });
    center.setCategory("injury", true);
    const first = await center.publish({ id: "qa-match", type: "match", title: "Match", body: "Match alert", priority: "high" }, { native: true });
    const second = await center.publish({ id: "qa-match", type: "match", title: "Match", body: "Match alert", priority: "high" }, { native: true });
    const toast = document.querySelector<HTMLElement>("#toastContainer .toast");
    const dock = document.getElementById("mobileActionDock");
    return {
      before,
      filtered: filtered.reason,
      first: first.ok,
      duplicate: second.reason,
      visibleToasts: document.querySelectorAll("#toastContainer .toast").length,
      toastBottom: toast?.getBoundingClientRect().bottom || 0,
      dockTop: dock?.getBoundingClientRect().top || innerHeight,
    };
  });
  expect(surface.before.enabled).toBe(true);
  expect(surface.filtered).toBe("filtered");
  expect(surface.first).toBe(true);
  expect(surface.duplicate).toBe("duplicate");
  expect(surface.visibleToasts).toBe(1);
  if (["mobile-chromium", "webkit-mobile"].includes(testInfo.project.name)) expect(surface.toastBottom).toBeLessThanOrEqual(surface.dockTop - 8);
  await page.screenshot({ path: `../test-results/notifications-${testInfo.project.name}-toast.png`, fullPage: true });

  await page.locator("#settingsBtn").click();
  await expect(page.locator("#copaNotificationSettings")).toHaveCount(1);
  await expect(page.locator("#copaPlayGamesSettings")).toHaveCount(1);
  expect(await page.locator("#copaNotificationSettings").evaluate(node => node.closest("details")?.getAttribute("data-settings-folder"))).toBe("notifications");
  expect(await page.locator("#copaPlayGamesSettings").evaluate(node => node.closest("details")?.getAttribute("data-settings-folder"))).toBe("game");
  await page.screenshot({ path: `../test-results/notifications-${testInfo.project.name}-initial.png`, fullPage: true });
  await page.locator("[data-settings-folder='notifications'] > summary").click();
  await page.locator("#copaNotificationSettings input[data-notification-category='injury']").uncheck();
  await expect.poll(() => page.evaluate(() => (globalThis as any).CopaNotificationCenter.getPreferences().categories.injury)).toBe(false);
  await page.locator("#copaNotificationSettings input[data-notification-category='injury']").check();
  await expect.poll(() => page.evaluate(() => (globalThis as any).CopaNotificationCenter.getPreferences().categories.injury)).toBe(true);
  await page.screenshot({ path: `../test-results/notifications-${testInfo.project.name}.png`, fullPage: true });
});

test("notification action deep link resolves to a mobile route", async ({ page }) => {
  await page.goto("/?notification-action-qa=1", { waitUntil: "domcontentloaded" });
  const result = await page.evaluate(() => {
    const game = globalThis as any;
    let route = "";
    game.CopaMobileShell = { activateRoute: (value: string) => { route = value; } };
    const handled = game.CopaNotificationCenter.routeAction({ deepLink: "hub/training" });
    return { handled, route };
  });
  expect(result).toEqual({ handled: true, route: "training" });
});

test("remote push denial does not disable local notifications", async ({ page }) => {
  await page.addInitScript(() => {
    (globalThis as any).Capacitor = {
      Plugins: {
        LocalNotifications: {
          checkPermissions: async () => ({ display: "granted" }),
          requestPermissions: async () => ({ display: "granted" }),
        },
        PushNotifications: {
          requestPermissions: async () => ({ receive: "denied" }),
          register: async () => undefined,
        },
      },
    };
  });
  await page.goto("/?notification-permission-qa=1", { waitUntil: "domcontentloaded" });
  const result = await page.evaluate(async () => (globalThis as any).CopaNotificationCenter.requestPermission({ local: true, remote: true }));
  expect(result.granted).toBe(true);
  expect(result.local.granted).toBe(true);
  expect(result.remote.granted).toBe(false);
  expect(result.reason).toBe("local-only");
});
