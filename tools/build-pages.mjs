import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const OUT = path.join(ROOT, "dist");

const ROOT_FILES = [
  ".nojekyll",
  "CNAME",
  "favicon.svg",
  "favicon-16x16.png",
  "favicon-32x32.png",
  "favicon-48x48.png",
  "apple-touch-icon.png",
  "web-app-icon-192.png",
  "web-app-icon-512.png",
  "index.html",
  "manifest.json",
  "robots.txt",
  "site.webmanifest",
  "sitemap.xml",
  "sw.js",
];

const ROOT_DIRS = ["assets", "src"];
const SKIP_DIRS = new Set([
  ".agents",
  ".claude",
  ".codex",
  ".git",
  ".github",
  ".npm-cache",
  ".pw-browsers",
  ".tmp",
  ".vscode",
  "assets/chairs",
  "assets/story-icons",
  "dist",
  "node_modules",
  "outputs",
  "playtest",
  "src/legacy",
  "test",
  "tools",
]);

function toPosix(filePath) {
  return filePath.replace(/\\/g, "/");
}

function isSkipped(relativePath) {
  const normalized = toPosix(relativePath);
  const parts = normalized.split("/");
  return parts.some((_, index) => {
    const prefix = parts.slice(0, index + 1).join("/");
    return SKIP_DIRS.has(prefix);
  });
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function copyFile(source, target) {
  ensureDir(path.dirname(target));
  fs.copyFileSync(source, target);
}

function copyDir(sourceDir, targetDir) {
  if (!fs.existsSync(sourceDir)) return;
  for (const name of fs.readdirSync(sourceDir)) {
    const source = path.join(sourceDir, name);
    const relative = path.relative(ROOT, source);
    if (isSkipped(relative)) continue;
    const target = path.join(targetDir, name);
    const stat = fs.statSync(source);
    if (stat.isDirectory()) copyDir(source, target);
    else copyFile(source, target);
  }
}

fs.rmSync(OUT, { recursive: true, force: true });
ensureDir(OUT);

for (const file of ROOT_FILES) {
  const source = path.join(ROOT, file);
  if (fs.existsSync(source)) copyFile(source, path.join(OUT, file));
}

for (const dir of ROOT_DIRS) {
  copyDir(path.join(ROOT, dir), path.join(OUT, dir));
}

const buildVersion=(process.env.GITHUB_SHA||Date.now().toString(36)).slice(0,12);
const builtServiceWorker=path.join(OUT,"sw.js");
if(fs.existsSync(builtServiceWorker)){
  const source=fs.readFileSync(builtServiceWorker,"utf8");
  fs.writeFileSync(builtServiceWorker,source.replaceAll("__COPA_BUILD_VERSION__",buildVersion));
}

console.log(`Pages artifact built: dist (${buildVersion})`);
