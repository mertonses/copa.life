import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { findJavaTool } from "./java-runtime.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const input = process.argv[2] || "android/app/build/outputs/bundle/release/app-release-signed.aab";
const aab = path.resolve(ROOT, input);
if (!fs.existsSync(aab)) throw new Error(`signed AAB not found: ${aab}`);

const expected = fs
  .readFileSync(path.join(ROOT, "release", "android-upload-certificate.sha256"), "utf8")
  .trim()
  .replaceAll(":", "")
  .toUpperCase();
const executable = findJavaTool("keytool");
const result = spawnSync(executable, ["-printcert", "-jarfile", aab], {
  encoding: "utf8",
  windowsHide: true,
});
if (result.status !== 0) {
  throw new Error(`keytool could not inspect the signed AAB: ${result.stderr || result.stdout}`);
}
const match = `${result.stdout}\n${result.stderr}`.match(/SHA256:\s*([0-9A-F:]+)/i);
if (!match) throw new Error("SHA-256 signer fingerprint was not found");
const actual = match[1].replaceAll(":", "").toUpperCase();
if (actual !== expected) {
  throw new Error(`upload certificate mismatch: expected ${expected}, received ${actual}`);
}
console.log(`Android upload certificate verified: ${match[1].toUpperCase()}`);
