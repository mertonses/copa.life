import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const TEXT_EXTENSIONS = new Set([
  ".html",
  ".js",
  ".mjs",
  ".css",
  ".json",
  ".md",
  ".txt",
  ".xml",
  ".webmanifest",
  ".yml",
  ".yaml",
]);
const IGNORED_DIRS = new Set([
  ".git",
  "node_modules",
  "src/legacy",
  ".codex",
  ".agents",
  ".claude",
  ".npm-cache",
  ".pw-browsers",
  "outputs",
  "playtest",
]);

function isIgnored(relativePath) {
  return relativePath
    .split(/[\\/]+/)
    .some((part, index, parts) => {
      const prefix = parts.slice(0, index + 1).join("/");
      return part.startsWith(".codex") || IGNORED_DIRS.has(part) || IGNORED_DIRS.has(prefix);
    });
}

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const relative = path.relative(ROOT, full).replace(/\\/g, "/");
    if (isIgnored(relative)) continue;
    const stat = fs.statSync(full);
    if (stat.isDirectory()) walk(full, out);
    else if (TEXT_EXTENSIONS.has(path.extname(name)) || name === "CNAME") out.push(full);
  }
  return out;
}

function hasUtf8Bom(buffer) {
  return buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf;
}

function hasDefiniteMojibake(line) {
  for (let i = 0; i < line.length; i += 1) {
    const current = line.codePointAt(i);
    const next = line.codePointAt(i + 1);

    // UTF-8 bytes decoded as Windows-125x often leave these leading markers.
    if (current === 0x00c3 || current === 0x00c4 || current === 0x00c5 || current === 0xfffd) return true;

    // Stray U+00C2 before punctuation or spacing is a classic UTF-8 mojibake failure.
    if (
      current === 0x00c2 &&
      (next === 0x00a0 ||
        next === 0x00a9 ||
        next === 0x00ae ||
        next === 0x00b1 ||
        next === 0x00b2 ||
        next === 0x00b3 ||
        next === 0x00b4 ||
        next === 0x00b6 ||
        next === 0x00b7 ||
        next === 0x00bb)
    ) {
      return true;
    }

    // UTF-8 punctuation decoded as Windows-125x leaves U+00E2 plus punctuation-like follow-ups.
    if (
      current === 0x00e2 &&
      (next === 0x20ac || next === 0x201c || next === 0x201d || next === 0x2013 || next === 0x2014)
    ) {
      return true;
    }
  }
  return false;
}

const problems = [];

for (const file of walk(ROOT)) {
  const relative = path.relative(ROOT, file).replace(/\\/g, "/");
  const buffer = fs.readFileSync(file);
  const decoded = buffer.toString("utf8");

  if (hasUtf8Bom(buffer)) {
    problems.push(`${relative}: UTF-8 BOM kullanma; dosya BOM'suz UTF-8 olmalı.`);
  }

  if (decoded.includes("\uFFFD")) {
    problems.push(`${relative}: geçersiz UTF-8 byte dizisi veya replacement character içeriyor.`);
  }

  const lines = decoded.split(/\r?\n/);
  lines.forEach((line, index) => {
    if (hasDefiniteMojibake(line)) {
      problems.push(`${relative}:${index + 1}: olası mojibake: ${line.slice(0, 180)}`);
    }
  });
}

if (problems.length) {
  console.error("Encoding kontrolü başarısız:");
  for (const problem of problems.slice(0, 80)) console.error(`- ${problem}`);
  if (problems.length > 80) console.error(`... ${problems.length - 80} ek problem`);
  process.exit(1);
}

console.log("Encoding OK: UTF-8 ve mojibake kontrolü temiz.");
