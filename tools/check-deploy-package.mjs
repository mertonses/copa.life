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
const sharedBuildInfo = read("tools/shared-build-info.mjs");
const rightsInventory = read("docs/data-rights-inventory.json");

if (!packageJson.scripts?.["build:pages"]) fail("package.json must expose build:pages");
if (!packageJson.scripts?.["check:rights:public"]) fail("package.json must expose the public-release rights gate");
if (!/check:rights:public/.test(workflow)) fail("GitHub Pages workflow must enforce the rights gate");
if (!/PUBLIC_RELEASE/.test(buildScript)) fail("Pages builder must enforce the rights gate independently");
if (!/deny_public_release_until_cleared/.test(rightsInventory)) fail("rights inventory must deny public release by default");
if (!/explicit_owner_risk_acceptance_does_not_equal_clearance/.test(rightsInventory)) fail("web-only owner exceptions must remain explicitly uncleared");
if (!/npm run build:pages/.test(workflow)) fail("GitHub Pages workflow must build a clean artifact");
if (!/path:\s*'dist'|path:\s*dist/.test(workflow)) fail("GitHub Pages artifact must upload dist");
if (/path:\s*'\.'|path:\s*\./.test(workflow)) fail("GitHub Pages must not upload the repository root");
if (/cardCombos\.js|mascot\.jpg/.test(sw)) fail("service worker precache contains removed files");
if (/20260707/.test(sw) || /sw\.js\?v=20260707/.test(indexHtml)) fail("stale service worker cache version remains");
if (!sw.includes("__COPA_BUILD_VERSION__") || !sharedBuildInfo.includes("GITHUB_SHA") || !sharedBuildInfo.includes("cleanGitCommit") || !sharedBuildInfo.includes("sourceFingerprint")) fail("service worker must receive a deterministic version and clean source revision");
if (/client\.navigate|location\.reload/.test(sw+indexHtml)) fail("deploy updates must not reload an active run");
if (!/new Request\(e\.request,\{cache:"no-store"\}\)/.test(sw)) fail("page and runtime assets must bypass stale HTTP caches on entry");

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
if (!distFiles.includes("app-ads.txt")) fail("app-ads.txt is missing from dist");
if (!distFiles.includes("support.html")) fail("dedicated mobile support page is missing from dist");
else {
  const supportPage = fs.readFileSync(path.join(DIST, "support.html"), "utf8");
  for (const forbidden of ["patreon.com", "api.web3forms.com", "checkout", "purchase", "donate"]) {
    if (supportPage.toLowerCase().includes(forbidden)) fail(`support page contains forbidden commerce marker: ${forbidden}`);
  }
  if (!supportPage.includes("mailto:support@copa.life") || !supportPage.includes("copa-life-legal.pages.dev/privacy.html")) {
    fail("support page is missing the official email or privacy policy link");
  }
}
const appAds = fs.readFileSync(path.join(DIST, "app-ads.txt"), "utf8").trim();
if (appAds !== "google.com, pub-7347507737044067, DIRECT, f08c47fec0942fa0") {
  fail("app-ads.txt does not contain the verified AdMob publisher record");
}
const distServiceWorker = fs.readFileSync(path.join(DIST, "sw.js"), "utf8");
const distIndex = fs.readFileSync(path.join(DIST, "index.html"), "utf8");
if (distServiceWorker.includes("__COPA_BUILD_VERSION__")) fail("built service worker still contains the version placeholder");
if (distIndex.includes("__COPA_BUILD_VERSION__")) fail("built index still contains the version placeholder");
if (!distFiles.includes("assets/data/copa/player_profiles.json")) fail("copa player profile data is missing from dist");
if (!distFiles.includes("assets/data/copa/player_profiles.js")) fail("file-mode player profile fallback is missing from dist");
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
