import { defineConfig } from "@playwright/test";

const externalServer=process.env.PLAYWRIGHT_EXTERNAL_SERVER==="1";

export default defineConfig({
  testDir: "./tests",
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  webServer: externalServer?undefined:{
    command: "node static-server.mjs",
    url: "http://127.0.0.1:5500",
    reuseExistingServer: true,
    timeout: 30_000,
  },
  use: {
    headless: process.env.HEADED!=="1",
    baseURL: "http://127.0.0.1:5500",
  },
  projects: [
    {name:"mobile-chromium",use:{browserName:"chromium",viewport:{width:430,height:932},hasTouch:true,isMobile:true}},
    {name:"desktop-chromium",use:{browserName:"chromium",viewport:{width:1440,height:900}}},
    {name:"firefox-desktop",use:{browserName:"firefox",viewport:{width:1440,height:900}}},
    {name:"webkit-mobile",use:{browserName:"webkit",viewport:{width:430,height:932},hasTouch:true,isMobile:true}},
  ],
  reporter: process.env.CI?"list":[["list"], ["json", { outputFile: "../playtest-output/reports/playwright-results.json" }]],
});
