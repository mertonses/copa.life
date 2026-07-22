import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const source = path.resolve(root, process.argv[2] || "favicon.svg");
const outputs = [
  ["favicon-16x16.png", 16],
  ["favicon-32x32.png", 32],
  ["favicon-48x48.png", 48],
  ["apple-touch-icon.png", 180],
  ["web-app-icon-192.png", 192],
  ["web-app-icon-512.png", 512],
  ["assets/icons/icon-192.png", 192],
  ["assets/icons/icon-512.png", 512],
  ["assets/icons/cl.png", 512],
  ["store/android/graphics/app-icon-512.png", 512],
];

async function findPlaywrightCore() {
  const runnerCore = path.join(root, "playtest/runner/node_modules/playwright-core/index.mjs");
  try {
    await fs.access(runnerCore);
    return runnerCore;
  } catch {
    // Fall back to pnpm's virtual package directory used by older installs.
  }
  const nodeModules = path.join(root, "node_modules");
  const entries = await fs.readdir(nodeModules, { withFileTypes: true });
  const coreDir = entries.find((entry) => entry.isDirectory() && entry.name.startsWith(".playwright-core-"));
  if (!coreDir) throw new Error("Playwright Core bulunamadı. Favicon exportu için yerel browser renderer gerekiyor.");
  return path.join(nodeModules, coreDir.name, "index.mjs");
}

const sourceSvg = await fs.readFile(source, "utf8");
const dataUrl = `data:image/svg+xml;base64,${Buffer.from(sourceSvg).toString("base64")}`;
const { chromium } = await import(`file:///${(await findPlaywrightCore()).replace(/\\/g, "/")}`);

const browser = await chromium.launch({
  channel: "chrome",
  headless: true,
  args: [
    "--disable-gpu",
    "--disable-gpu-compositing",
    "--disable-dev-shm-usage",
    "--disable-features=UseSkiaRenderer,VizDisplayCompositor",
  ],
});
const page = await browser.newPage({ viewport: { width: 512, height: 512 }, deviceScaleFactor: 1 });

try {
  for (const [fileName, size] of outputs) {
    await fs.mkdir(path.dirname(path.resolve(root, fileName)), { recursive: true });
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(
      `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;width:${size}px;height:${size}px;background:transparent;overflow:hidden}img{display:block;width:${size}px;height:${size}px}</style></head><body><img id="icon" src="${dataUrl}" alt=""></body></html>`,
      { waitUntil: "load" },
    );
    await page.locator("#icon").screenshot({
      path: path.resolve(root, fileName),
      omitBackground: true,
    });
  }
} finally {
  await browser.close();
}

console.log(`Generated ${outputs.length} favicon assets from ${path.basename(source)}.`);
