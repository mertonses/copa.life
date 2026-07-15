import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const VERSION_FILE = path.join(ROOT, "release", "android-version.json");
const VALID_BUMPS = new Set(["patch", "minor", "major"]);

function readVersion() {
  const value = JSON.parse(fs.readFileSync(VERSION_FILE, "utf8"));
  if (!Number.isInteger(value.versionCode) || value.versionCode < 1) {
    throw new Error("versionCode must be a positive integer");
  }
  if (!/^\d+\.\d+\.\d+$/.test(value.versionName)) {
    throw new Error("versionName must use the x.y.z format");
  }
  return value;
}

function show(value) {
  console.log(`Android version: ${value.versionName} (${value.versionCode})`);
}

const command = process.argv[2] || "show";
const current = readVersion();

if (command === "show" || command === "check") {
  show(current);
  process.exit(0);
}

if (command !== "bump") {
  throw new Error("Usage: node tools/android-version.mjs show|check|bump <patch|minor|major>");
}

const bump = process.argv[3];
if (!VALID_BUMPS.has(bump)) {
  throw new Error("bump must be one of: patch, minor, major");
}

const parts = current.versionName.split(".").map(Number);
if (bump === "major") {
  parts[0] += 1;
  parts[1] = 0;
  parts[2] = 0;
} else if (bump === "minor") {
  parts[1] += 1;
  parts[2] = 0;
} else {
  parts[2] += 1;
}

const next = {
  versionCode: current.versionCode + 1,
  versionName: parts.join("."),
};
fs.writeFileSync(VERSION_FILE, `${JSON.stringify(next, null, 2)}\n`);
console.log(
  `Android version bumped: ${current.versionName} (${current.versionCode}) -> ${next.versionName} (${next.versionCode})`,
);
console.log("Update store/android/whatsnew notes, then run: npm run android:notes:stamp");
