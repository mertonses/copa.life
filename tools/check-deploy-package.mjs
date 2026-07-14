import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = process.cwd();
const DIST = path.join(ROOT, "dist");

function read(file) {
  return fs.readFileSync(path.join(ROOT, file), "utf8");
}

function fail(message) {
  console.error(`deploy check failed: ${message}`);
  process.exitCode = 1;
}

function toPosix(filePath) {
  return filePath.replace(/\\/g, "/");
}

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

const packageJson = JSON.parse(read("package.json"));
const workflow = read(".github/workflows/pages.yml");
const sw = read("sw.js");
const indexHtml = read("index.html");
const buildScript = read("tools/build-pages.mjs");

if (!packageJson.scripts?.["build:pages"]) fail("package.json must expose build:pages");
if (!/npm run build:pages/.test(workflow)) fail("GitHub Pages workflow must build a clean artifact");
if (!/path:\s*'dist'|path:\s*dist/.test(workflow)) fail("GitHub Pages artifact must upload dist");
if (/path:\s*'\.'|path:\s*\./.test(workflow)) fail("GitHub Pages must not upload the repository root");
if (/cardCombos\.js|mascot\.jpg/.test(sw)) fail("service worker precache contains removed files");
if (/20260707/.test(sw) || /sw\.js\?v=20260707/.test(indexHtml)) fail("stale service worker cache version remains");
if (!sw.includes("__COPA_BUILD_VERSION__") || !buildScript.includes("GITHUB_SHA")) fail("service worker must receive a unique version on every Pages build");
if (!/clients\.matchAll[\s\S]*client\.navigate/.test(sw)) fail("activated service worker must refresh open stale clients");
if (!/pagehide[\s\S]*_saveState/.test(indexHtml)) fail("page state must be saved before an automatic update reload");

const build = spawnSync(process.execPath, ["tools/build-pages.mjs"], {
  cwd: ROOT,
  encoding: "utf8",
});
if (build.status !== 0) {
  console.error(build.stdout);
  console.error(build.stderr);
  fail("build:pages failed");
}

const distFiles = walk(DIST).map((file) => toPosix(path.relative(DIST, file)));
const distServiceWorker = fs.readFileSync(path.join(DIST, "sw.js"), "utf8");
if (distServiceWorker.includes("__COPA_BUILD_VERSION__")) fail("built service worker still contains the version placeholder");
if (!distFiles.includes("assets/data/fm26/player_profiles.json")) fail("player profile data is missing from dist");
const forbiddenDistPrefixes = ["node_modules/", "tools/", "playtest/", "outputs/", "assets/chairs/", ".git/"];
for (const file of distFiles) {
  if (forbiddenDistPrefixes.some((prefix) => file.startsWith(prefix))) {
    fail(`forbidden file shipped in dist: ${file}`);
  }
}

const precacheEntries = [...sw.matchAll(/"([^"]+)"/g)]
  .map((match) => match[1])
  .filter((entry) => entry.startsWith("/"));

for (const entry of precacheEntries) {
  if (entry === "/") continue;
  const relative = entry.replace(/^\//, "");
  if (!fs.existsSync(path.join(ROOT, relative))) {
    fail(`service worker precache entry does not exist: ${entry}`);
  }
}

if (!process.exitCode) {
  console.log(`deploy package OK: ${distFiles.length} files`);
}
