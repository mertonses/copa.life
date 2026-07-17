import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const failures = [];
const warnings = [];
const ok = [];
const check = (label, condition, detail) => (condition ? ok : failures).push(`${label}: ${detail}`);
check("Node", Number(process.versions.node.split(".")[0]) === 22, process.version);
check("Platform", process.platform === "darwin", process.platform === "darwin" ? "macOS" : `${process.platform}; Xcode builds require macOS`);

if (process.platform === "darwin") {
  const xcode = spawnSync("xcodebuild", ["-version"], { encoding: "utf8" });
  const value = `${xcode.stdout}\n${xcode.stderr}`.trim();
  check("Xcode", xcode.status === 0 && /Xcode 2[6-9]/.test(value), value.split(/\r?\n/)[0] || "not found; Xcode 26+ is required");
  const sim = spawnSync("xcrun", ["simctl", "list", "devices", "available"], { encoding: "utf8" });
  check("Simulator", sim.status === 0, sim.status === 0 ? "available" : "xcrun simctl failed");
  const signing = path.join(os.homedir(), "Library", "MobileDevice", "Provisioning Profiles");
  if (!fs.existsSync(signing)) warnings.push("No local provisioning profile directory; simulator builds still work");
}
const project = path.resolve("ios", "App", "App.xcodeproj", "project.pbxproj");
check("iOS project", fs.existsSync(project), fs.existsSync(project) ? project : "run npm run ios:add");
for (const message of ok) console.log(`[ios-doctor] OK ${message}`);
for (const message of warnings) console.warn(`[ios-doctor] WARN ${message}`);
for (const message of failures) console.error(`[ios-doctor] ${message}`);
if (failures.length) process.exit(1);
console.log("[ios-doctor] ready for Xcode validation");
