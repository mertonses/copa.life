import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const ROOT = process.cwd();
const TEXT_EXTENSIONS = new Set([".html", ".js", ".mjs", ".css", ".json", ".webmanifest"]);
const ASSET_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp", ".svg", ".ogg", ".wav"]);
const IGNORED_DIRS = new Set([".git", "node_modules", "src/legacy", ".codex", ".agents", ".claude"]);

function isIgnored(relativePath) {
  return relativePath.split(/[\\/]+/).some((part, index, parts) => {
    const prefix = parts.slice(0, index + 1).join("/");
    return IGNORED_DIRS.has(part) || IGNORED_DIRS.has(prefix);
  });
}

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const relative = path.relative(ROOT, full).replace(/\\/g, "/");
    if (isIgnored(relative)) continue;
    const stat = fs.statSync(full);
    if (stat.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

function gzipSize(file) {
  return zlib.gzipSync(fs.readFileSync(file), { level: 9 }).length;
}

function kb(bytes) {
  return `${Math.round(bytes / 1024)}KB`;
}

const allFiles = [
  path.join(ROOT, "index.html"),
  ...walk(path.join(ROOT, "src")),
  ...walk(path.join(ROOT, "assets")),
].filter((file) => fs.existsSync(file));

const criticalFiles = allFiles.filter((file) => {
  const relative = path.relative(ROOT, file).replace(/\\/g, "/");
  const ext = path.extname(file).toLowerCase();
  return relative === "index.html" || (relative.startsWith("src/") && TEXT_EXTENSIONS.has(ext));
});

const assetFiles = allFiles.filter((file) => {
  const relative = path.relative(ROOT, file).replace(/\\/g, "/");
  return relative.startsWith("assets/") && ASSET_EXTENSIONS.has(path.extname(file).toLowerCase());
});

const indexFile = path.join(ROOT, "index.html");
const sourceText = criticalFiles.map((file) => fs.readFileSync(file, "utf8")).join("\n");
const referenced = new Set();
for (const match of sourceText.matchAll(/assets\/[A-Za-z0-9_.\-/%]+\.(?:png|jpg|jpeg|webp|svg|ogg|wav)/g)) {
  referenced.add(match[0].replace(/\\/g, "/"));
}
for (const file of walk(path.join(ROOT, "assets", "chairs_opt"))) {
  referenced.add(path.relative(ROOT, file).replace(/\\/g, "/"));
}
const referencedAssetFiles = [...referenced]
  .map((relative) => path.join(ROOT, relative))
  .filter((file) => fs.existsSync(file));

const indexGzip = gzipSize(indexFile);
const criticalGzip = criticalFiles.reduce((sum, file) => sum + gzipSize(file), 0);
const totalAssetBytes = assetFiles.reduce((sum, file) => sum + fs.statSync(file).size, 0);
const referencedAssetBytes = referencedAssetFiles.reduce((sum, file) => sum + fs.statSync(file).size, 0);
const largestAsset = assetFiles
  .map((file) => ({ file, size: fs.statSync(file).size }))
  .sort((a, b) => b.size - a.size)[0];
const largestReferencedAsset = referencedAssetFiles
  .map((file) => ({ file, size: fs.statSync(file).size }))
  .sort((a, b) => b.size - a.size)[0];

const budgets = [
  ["index.html gzip", indexGzip, 280 * 1024],
  ["critical html/js/css gzip", criticalGzip, 520 * 1024],
  ["referenced media asset bytes", referencedAssetBytes, 6 * 1024 * 1024],
  ["largest referenced asset", largestReferencedAsset?.size || 0, 2 * 1024 * 1024],
];

let failed = false;
if (/assets\/chairs\/[^`"' )]+\.png/.test(sourceText) || /assets\/chairs\/\$\{/.test(sourceText)) {
  failed = true;
  console.error("performance budget failed: runtime must not reference full-size chair PNG files");
}
for (const [name, value, limit] of budgets) {
  console.log(`${name}: ${kb(value)} / ${kb(limit)}`);
  if (value > limit) {
    failed = true;
    console.error(`performance budget failed: ${name}`);
  }
}

if (largestAsset) {
  console.log(`total media inventory: ${kb(totalAssetBytes)}`);
  console.log(`largest shipped asset: ${path.relative(ROOT, largestAsset.file).replace(/\\/g, "/")} (${kb(largestAsset.size)})`);
}
if (largestReferencedAsset) {
  console.log(`largest referenced asset: ${path.relative(ROOT, largestReferencedAsset.file).replace(/\\/g, "/")} (${kb(largestReferencedAsset.size)})`);
}

if (failed) process.exit(1);
