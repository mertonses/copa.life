import fs from "node:fs";
import os from "node:os";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { findJavaTool } from "./java-runtime.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const allowDirty = process.argv.includes("--allow-dirty");
const release = process.argv.includes("--release");
const failures = [];
const warnings = [];
const ok = [];

function check(label, condition, detail) {
  if (condition) ok.push(`${label}: ${detail}`);
  else failures.push(`${label}: ${detail}`);
}

const nodeMajor = Number(process.versions.node.split(".")[0]);
check("Node", nodeMajor === 22, process.version);

let java = null;
try {
  java = findJavaTool("java");
} catch {}
if (java) {
  const result = spawnSync(java, ["-version"], { encoding: "utf8", windowsHide: true });
  const output = `${result.stdout}\n${result.stderr}`;
  check("JDK", result.status === 0 && /version "21(?:\.|\")/.test(output), output.split(/\r?\n/).find(Boolean)?.trim() || java);
} else {
  check("JDK", false, "JDK 21 was not found");
}

const localProperties = path.join(ROOT, "android", "local.properties");
const propertySdk = fs.existsSync(localProperties)
  ? fs.readFileSync(localProperties, "utf8").match(/^sdk\.dir=(.+)$/m)?.[1]?.replaceAll("\\\\", "\\")
  : null;
const androidSdk = process.env.ANDROID_SDK_ROOT || process.env.ANDROID_HOME || propertySdk ||
  (process.platform === "win32" && process.env.LOCALAPPDATA
    ? path.join(process.env.LOCALAPPDATA, "Android", "Sdk")
    : null);
check("Android SDK", Boolean(androidSdk && fs.existsSync(androidSdk)), androidSdk || "not configured");

const stat = fs.statfsSync(ROOT);
const freeBytes = Number(stat.bavail) * Number(stat.bsize);
check("Disk", freeBytes >= 4 * 1024 ** 3, `${(freeBytes / 1024 ** 3).toFixed(1)} GB free`);

const gitBranch = spawnSync("git", ["branch", "--show-current"], { cwd: ROOT, encoding: "utf8", windowsHide: true });
const branch = gitBranch.status === 0 ? gitBranch.stdout.trim() : "";
if (release && !allowDirty) check("Git branch", branch === "main", branch || "not detected");
else if (branch !== "main") warnings.push(`Git branch: ${branch || "not detected"}; output is a non-store candidate`);

const gitStatus = spawnSync("git", ["status", "--porcelain"], { cwd: ROOT, encoding: "utf8", windowsHide: true });
const dirty = gitStatus.status !== 0 || gitStatus.stdout.trim().length > 0;
if (release && !allowDirty) check("Git worktree", !dirty, dirty ? "uncommitted files exist" : "clean");
else if (dirty) warnings.push("Git worktree is dirty; this build is a candidate and must not be uploaded");

if (release || process.platform === "win32") {
  const signingDir = path.join(os.homedir(), ".copa-life", "signing");
  const keystore = path.join(signingDir, "copa-life-upload.jks");
  const secret = path.join(signingDir, "upload-password.dpapi");
  check("Upload keystore", fs.existsSync(keystore), fs.existsSync(keystore) ? "present outside repository" : "missing");
  check("Encrypted signing password", fs.existsSync(secret), fs.existsSync(secret) ? "present outside repository" : "missing");
}

for (const line of ok) console.log(`[doctor] OK ${line}`);
for (const line of warnings) console.warn(`[doctor] WARN ${line}`);
if (failures.length) {
  for (const line of failures) console.error(`[doctor] FAIL ${line}`);
  process.exit(1);
}
console.log(`[doctor] ready for ${release && !allowDirty ? "store release" : "local candidate"}`);
