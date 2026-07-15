import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const input = process.argv[2] || "android/app/build/outputs/bundle/release/app-release.aab";
const signed = process.argv.includes("--signed");
const aab = path.resolve(ROOT, input);
if (!fs.existsSync(aab)) throw new Error(`candidate AAB not found: ${aab}`);
const version = JSON.parse(fs.readFileSync(path.join(ROOT, "release/android-version.json"), "utf8"));
const build = JSON.parse(fs.readFileSync(path.join(ROOT, "dist-android/platform-build.json"), "utf8"));
const metadata = JSON.parse(
  fs.readFileSync(
    path.join(ROOT, "android/app/build/intermediates/merged_manifests/release/processReleaseManifest/output-metadata.json"),
    "utf8",
  ),
);
const element = metadata.elements?.[0];
if (element?.versionCode !== version.versionCode || element?.versionName !== version.versionName) {
  throw new Error("Gradle candidate version does not match release/android-version.json");
}
const bytes = fs.readFileSync(aab);
const candidate = {
  schema_version: 1,
  package_id: metadata.applicationId,
  version_code: version.versionCode,
  version_name: version.versionName,
  source_commit: build.source_commit,
  source_fingerprint: build.source_fingerprint,
  build_fingerprint: build.build_fingerprint,
  aab: {
    file: path.basename(aab),
    bytes: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex").toUpperCase(),
    signing: signed ? "signed-upload-candidate" : "unsigned-ci-candidate",
  },
};
const output = path.join(path.dirname(aab), "candidate-manifest.json");
fs.writeFileSync(output, `${JSON.stringify(candidate, null, 2)}\n`);
console.log(`Android candidate manifest written: ${candidate.aab.sha256}`);
