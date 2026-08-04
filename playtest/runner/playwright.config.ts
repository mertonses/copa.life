import { defineConfig } from "@playwright/test";

const externalServer=process.env.PLAYWRIGHT_EXTERNAL_SERVER==="1";
const port=Number(process.env.COPA_TEST_PORT)||5500;
const baseURL=`http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "./tests",
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  webServer: externalServer?undefined:{
    command: "node static-server.mjs",
    url: baseURL,
    reuseExistingServer: true,
    timeout: 30_000,
  },
  use: {
    headless: process.env.HEADED!=="1",
    baseURL,
  },
  projects: [
    {name:"mobile-chromium",use:{browserName:"chromium",viewport:{width:430,height:932},hasTouch:true,isMobile:true}},
    {name:"desktop-chromium",use:{browserName:"chromium",viewport:{width:1440,height:900}}},
    {name:"firefox-desktop",use:{browserName:"firefox",viewport:{width:1440,height:900}}},
    {name:"webkit-mobile",use:{browserName:"webkit",viewport:{width:430,height:932},hasTouch:true,isMobile:true}},
  ],
  reporter: process.env.CI?"list":[["list"], ["json", { outputFile: "../playtest-output/reports/playwright-results.json" }]],
});
