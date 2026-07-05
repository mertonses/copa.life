import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 60_000,
  use: {
    headless: false,
    viewport: { width: 430, height: 932 },
    // mobile-sized to reflect actual player experience
  },
  reporter: [["list"], ["json", { outputFile: "../playtest-output/reports/playwright-results.json" }]],
});
