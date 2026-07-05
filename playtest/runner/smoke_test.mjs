const { chromium } = require("@playwright/test");
const path = require("path");
(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
  });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.addInitScript({ path: path.resolve(__dirname, "../../bridge/copa-test-bridge.js") });
  await page.goto("http://localhost:5500?autotest=1", { waitUntil: "domcontentloaded" });
  const ready = await page.waitForFunction(
    () => typeof globalThis.CopaTestBridge !== "undefined",
    { timeout: 8000 }
  ).then(() => true).catch(() => false);
  console.log("Bridge ready:", ready);
  if (ready) {
    const snap = await page.evaluate(() => globalThis.CopaTestBridge.snapshot());
    console.log("Screen:", snap.screen, "| Chairs:", JSON.stringify(snap.meta && snap.meta.unlockedChairs));
    const actions = await page.evaluate(() => globalThis.CopaTestBridge.availableActions);
    console.log("Actions available:", actions.length);
    console.log("SMOKE TEST PASSED");
  } else {
    console.log("SMOKE TEST FAILED - bridge not ready");
  }
  await browser.close();
})().catch(e => { console.error("Error:", e.message); process.exit(1); });
