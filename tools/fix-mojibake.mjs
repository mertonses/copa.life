import fs from "node:fs";
import path from "node:path";
import { TextDecoder } from "node:util";

const ROOT = process.cwd();
const utf8 = new TextDecoder("utf-8", { fatal: false });

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
  "godot-final-sim",
]);

const CP1252_REVERSE = new Map([
  [0x20ac, 0x80],
  [0x201a, 0x82],
  [0x0192, 0x83],
  [0x201e, 0x84],
  [0x2026, 0x85],
  [0x2020, 0x86],
  [0x2021, 0x87],
  [0x02c6, 0x88],
  [0x2030, 0x89],
  [0x0160, 0x8a],
  [0x2039, 0x8b],
  [0x0152, 0x8c],
  [0x017d, 0x8e],
  [0x2018, 0x91],
  [0x2019, 0x92],
  [0x201c, 0x93],
  [0x201d, 0x94],
  [0x2022, 0x95],
  [0x2013, 0x96],
  [0x2014, 0x97],
  [0x02dc, 0x98],
  [0x2122, 0x99],
  [0x0161, 0x9a],
  [0x203a, 0x9b],
  [0x0153, 0x9c],
  [0x017e, 0x9e],
  [0x0178, 0x9f],
]);

const CP1252_PUNCTUATION_RANGE =
  "\u2013-\u201e\u2020-\u2026\u2030\u2039\u203a\u20ac\u2122";
const MOJIBAKE_PATTERN = new RegExp(
  `(?:[\\u00c3\\u00c4\\u00c5\\u00c2][\\u0080-\\u00ff\\u0152\\u0153\\u0160\\u0161\\u0178\\u017d\\u017e${CP1252_PUNCTUATION_RANGE}]|` +
    `\\u00e2[\\u0080-\\u00ff\\u0152\\u0153\\u0160\\u0161\\u0178\\u017d\\u017e${CP1252_PUNCTUATION_RANGE}]+)+`,
  "g",
);

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

function cp1252ByteFor(char) {
  const code = char.codePointAt(0);
  if (code <= 0xff) return code;
  if (CP1252_REVERSE.has(code)) return CP1252_REVERSE.get(code);
  return null;
}

function repairSegment(segment) {
  const bytes = [];
  for (const char of segment) {
    const byte = cp1252ByteFor(char);
    if (byte == null) return segment;
    bytes.push(byte);
  }
  const repaired = utf8.decode(Uint8Array.from(bytes));
  return repaired.includes("\uFFFD") ? segment : repaired;
}

function repairText(text) {
  let previous;
  let current = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  let passes = 0;
  do {
    previous = current;
    current = current.replace(MOJIBAKE_PATTERN, repairSegment);
    passes += 1;
  } while (current !== previous && passes < 4);
  return current;
}

const changed = [];
for (const file of walk(ROOT)) {
  const original = fs.readFileSync(file, "utf8");
  const repaired = repairText(original);
  if (repaired !== original) {
    fs.writeFileSync(file, repaired, "utf8");
    changed.push(path.relative(ROOT, file).replace(/\\/g, "/"));
  }
}

if (changed.length) {
  console.log(`Mojibake fixed in ${changed.length} file(s):`);
  for (const file of changed) console.log(`- ${file}`);
} else {
  console.log("No mojibake patterns found.");
}
