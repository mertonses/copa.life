import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const sourceIcon = await fs.readFile(path.join(ROOT, "assets/icons/dice_512.png"));
const dataUrl = `data:image/png;base64,${sourceIcon.toString("base64")}`;
const corePath = path.join(ROOT, "playtest/runner/node_modules/playwright-core/index.mjs");
try {
  await fs.access(corePath);
} catch {
  throw new Error("Playwright Core is required to generate iOS assets");
}
const { chromium } = await import(`file:///${corePath.replace(/\\/g, "/")}`);
const browser = await chromium.launch({ channel: "chrome", headless: true });
const output = path.join(ROOT, "store/ios/graphics");
await fs.mkdir(output, { recursive: true });
try {
  const icon = await browser.newPage({ viewport: { width: 1024, height: 1024 }, deviceScaleFactor: 1 });
  await icon.setContent(`<style>html,body{margin:0;width:1024px;height:1024px;background:#101D28;overflow:hidden;display:grid;place-items:center}img{display:block;width:76%;height:76%;object-fit:contain;image-rendering:pixelated}</style><img src="${dataUrl}">`, { waitUntil: "load" });
  await icon.screenshot({ path: path.join(output, "app-icon-1024.png"), omitBackground: false });
  await fs.copyFile(
    path.join(output, "app-icon-1024.png"),
    path.join(ROOT, "ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png"),
  );
  await icon.close();

  const splash = await browser.newPage({ viewport: { width: 1366, height: 1366 }, deviceScaleFactor: 2 });
  await splash.setContent(`<style>html,body{margin:0;width:1366px;height:1366px;background:#F3F5F4;overflow:hidden;display:grid;place-items:center}img{display:block;width:510px;height:510px;object-fit:contain;image-rendering:pixelated}</style><img src="${dataUrl}">`, { waitUntil: "load" });
  await splash.screenshot({ path: path.join(output, "splash-2732.png"), omitBackground: false });
  await splash.close();
} finally {
  await browser.close();
}
console.log("Generated iOS app icon and launch artwork from the canonical dice icon");
