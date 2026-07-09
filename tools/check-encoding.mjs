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
  ".tmp",
  ".vscode",
  "assets/story-icons",
  "godot-final-sim",
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
const forbiddenCardTypeTerms = [
  [84, 69, 77, 75, 304, 78, 76, 304],
  [116, 101, 109, 107, 105, 110, 108, 105],
  [84, 101, 109, 107, 105, 110, 108, 105],
  [84, 69, 77, 75, 73, 78, 76, 73],
  [67, 69, 83, 85, 82],
  [99, 101, 115, 117, 114],
  [67, 101, 115, 117, 114],
].map((codes) => String.fromCodePoint(...codes));

for (const file of walk(ROOT)) {
  const relative = path.relative(ROOT, file).replace(/\\/g, "/");
  const buffer = fs.readFileSync(file);
  const decoded = buffer.toString("utf8");

  if (hasUtf8Bom(buffer)) {
    problems.push(`${relative}: UTF-8 BOM found; files must be UTF-8 without BOM.`);
  }

  if (decoded.includes("\uFFFD")) {
    problems.push(`${relative}: invalid UTF-8 byte sequence or replacement character found.`);
  }

  const lines = decoded.split(/\r?\n/);
  lines.forEach((line, index) => {
    if (hasDefiniteMojibake(line)) {
      problems.push(`${relative}:${index + 1}: possible mojibake: ${line.slice(0, 180)}`);
    }
    for (const term of forbiddenCardTypeTerms) {
      if (line.includes(term)) {
        problems.push(`${relative}:${index + 1}: forbidden card type term: ${term}`);
      }
    }
  });
}

if (problems.length) {
  console.error("Encoding check failed:");
  for (const problem of problems.slice(0, 80)) console.error(`- ${problem}`);
  if (problems.length > 80) console.error(`... ${problems.length - 80} more problem(s)`);
  process.exit(1);
}

console.log("Encoding OK: UTF-8 and mojibake checks are clean.");
