import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FONT_DIR = path.join(ROOT, "assets", "fonts");
const FONT_CSS = path.join(ROOT, "src", "styles", "localFonts.css");
const REQUIRED_FONTS = [
  "inter-latin.woff2",
  "inter-latin-ext.woff2",
  ...[500, 600, 700, 800, 900].flatMap((weight) => [
    `barlow-condensed-${weight}-latin.woff2`,
    `barlow-condensed-${weight}-latin-ext.woff2`,
  ]),
];

function fail(message) {
  console.error(`[fonts] ${message}`);
  process.exitCode = 1;
}

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

const index = read("index.html");
const css = fs.readFileSync(FONT_CSS, "utf8");

if (!index.includes('href="src/styles/localFonts.css')) fail("local font stylesheet is not loaded");
if (/fonts\.(?:googleapis|gstatic)\.com/i.test(index)) fail("remote Google Fonts dependency remains in index.html");
if (!css.includes('font-family:"Inter"')) fail("Inter font-face is missing");
if (!css.includes('font-family:"Barlow Condensed"')) fail("Barlow Condensed font-face is missing");

for (const name of REQUIRED_FONTS) {
  const file = path.join(FONT_DIR, name);
  if (!fs.existsSync(file)) {
    fail(`missing ${name}`);
    continue;
  }
  const signature = fs.readFileSync(file).subarray(0, 4).toString("ascii");
  if (signature !== "wOF2") fail(`${name} is not a valid WOFF2 file`);
  if (!css.includes(name)) fail(`${name} is not referenced by localFonts.css`);
}

for (const license of ["OFL-Inter.txt", "OFL-Barlow-Condensed.txt"]) {
  if (!fs.existsSync(path.join(FONT_DIR, license))) fail(`missing font license ${license}`);
}

for (const output of ["dist", "dist-android", "android/app/src/main/assets/public"]) {
  const root = path.join(ROOT, output);
  if (!fs.existsSync(root)) continue;
  const outputIndex = fs.readFileSync(path.join(root, "index.html"), "utf8");
  if (/fonts\.(?:googleapis|gstatic)\.com/i.test(outputIndex)) fail(`${output} still requests remote fonts`);
  for (const name of REQUIRED_FONTS) {
    if (!fs.existsSync(path.join(root, "assets", "fonts", name))) fail(`${output} is missing ${name}`);
  }
}

if (!process.exitCode) console.log(`[fonts] local Inter/Barlow bundle verified (${REQUIRED_FONTS.length} WOFF2 files)`);
