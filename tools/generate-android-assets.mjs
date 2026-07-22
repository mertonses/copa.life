import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const RES = path.join(ROOT, "android/app/src/main/res");
const corePath = path.join(ROOT, "playtest/runner/node_modules/playwright-core/index.mjs");
const sourceIcon = await fs.readFile(path.join(ROOT, "assets/icons/dice_512.png"));
const dataUrl = `data:image/png;base64,${sourceIcon.toString("base64")}`;
const { chromium } = await import(`file:///${corePath.replace(/\\/g, "/")}`);

function pngSize(buffer) {
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const launchers = [];
  for (const directory of await fs.readdir(RES, { withFileTypes: true })) {
    if (!directory.isDirectory() || !directory.name.startsWith("mipmap-")) continue;
    for (const name of ["ic_launcher.png", "ic_launcher_round.png", "ic_launcher_background.png", "ic_launcher_foreground.png"]) {
      const file = path.join(RES, directory.name, name);
      try {
        const size = pngSize(await fs.readFile(file));
        launchers.push({ file, name, ...size });
      } catch {
        // Density folders do not necessarily contain all adaptive-icon layers.
      }
    }
  }

  for (const asset of launchers) {
    const page = await browser.newPage({ viewport: { width: asset.width, height: asset.height }, deviceScaleFactor: 1 });
    const backgroundOnly = asset.name.includes("background");
    const foreground = asset.name.includes("foreground");
    const legacy = asset.name === "ic_launcher.png" || asset.name === "ic_launcher_round.png";
    const logoSize = foreground ? 70 : 76;
    await page.setContent(
      `<style>html,body{margin:0;width:100%;height:100%;overflow:hidden;background:${backgroundOnly || legacy ? "#101D28" : "transparent"};display:grid;place-items:center}img{display:${backgroundOnly ? "none" : "block"};width:${logoSize}%;height:${logoSize}%;object-fit:contain;image-rendering:pixelated}</style><img src="${dataUrl}" alt="">`,
      { waitUntil: "load" },
    );
    await page.screenshot({ path: asset.file, omitBackground: !(backgroundOnly || legacy) });
    await page.close();
  }

  const splashFiles = [];
  for (const directory of await fs.readdir(RES, { withFileTypes: true })) {
    if (!directory.isDirectory() || !directory.name.startsWith("drawable")) continue;
    const file = path.join(RES, directory.name, "splash.png");
    try {
      const size = pngSize(await fs.readFile(file));
      splashFiles.push({ file, dark: directory.name.includes("night"), ...size });
    } catch {
      // Not every drawable qualifier has a splash bitmap.
    }
  }
  for (const asset of splashFiles) {
    const page = await browser.newPage({ viewport: { width: asset.width, height: asset.height }, deviceScaleFactor: 1 });
    const logo = Math.round(Math.min(asset.width, asset.height) * 0.34);
    await page.setContent(
      `<style>html,body{margin:0;width:100%;height:100%;overflow:hidden;background:${asset.dark ? "#101D28" : "#F3F5F4"};display:grid;place-items:center}img{display:block;width:${logo}px;height:${logo}px;object-fit:contain;image-rendering:pixelated}</style><img src="${dataUrl}" alt="">`,
      { waitUntil: "load" },
    );
    await page.screenshot({ path: asset.file, omitBackground: false });
    await page.close();
  }
  console.log(`Generated ${launchers.length} Android launcher layers and ${splashFiles.length} splash assets.`);
} finally {
  await browser.close();
}
