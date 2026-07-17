import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FILE = path.join(ROOT, "release", "ios-version.json");
const VALID_BUMPS = new Set(["patch", "minor", "major"]);
const read = () => JSON.parse(fs.readFileSync(FILE, "utf8"));
const validate = (value) => {
  if (!Number.isInteger(value.buildNumber) || value.buildNumber < 1) throw new Error("buildNumber must be a positive integer");
  if (!/^\d+\.\d+\.\d+$/.test(value.marketingVersion)) throw new Error("marketingVersion must use x.y.z");
  if (!/^[A-Za-z][A-Za-z0-9.-]+$/.test(value.bundleId)) throw new Error("bundleId is invalid");
  return value;
};
const show = (value) => console.log(`iOS version: ${value.marketingVersion} (${value.buildNumber})`);
const command = process.argv[2] || "show";
const current = validate(read());
if (command === "show" || command === "check") {
  show(current);
  process.exit(0);
}
if (command !== "bump" || !VALID_BUMPS.has(process.argv[3])) {
  throw new Error("Usage: node tools/ios-version.mjs show|check|bump patch|minor|major");
}
const bump = process.argv[3];
const parts = current.marketingVersion.split(".").map(Number);
if (bump === "major") {
  parts[0] += 1; parts[1] = 0; parts[2] = 0;
} else if (bump === "minor") {
  parts[1] += 1; parts[2] = 0;
} else {
  parts[2] += 1;
}
const next = { ...current, buildNumber: current.buildNumber + 1, marketingVersion: parts.join(".") };
fs.writeFileSync(FILE, `${JSON.stringify(next, null, 2)}\n`);
console.log(`iOS version bumped: ${current.marketingVersion} (${current.buildNumber}) -> ${next.marketingVersion} (${next.buildNumber})`);
