import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const input = process.argv.find((argument) => argument.endsWith(".aab")) ||
  "android/app/build/outputs/bundle/release/app-release-signed.aab";
const verified = process.argv.includes("--verified");
const aabPath = path.resolve(ROOT, input);
const manifestPath = path.join(ROOT, "store", "android", "release-manifest.json");

if (!fs.existsSync(aabPath)) throw new Error(`AAB not found: ${aabPath}`);

const version = JSON.parse(
  fs.readFileSync(path.join(ROOT, "release", "android-version.json"), "utf8"),
);
const platformBuild = JSON.parse(
  fs.readFileSync(path.join(ROOT, "dist-android", "platform-build.json"), "utf8"),
);
const previous = fs.existsSync(manifestPath)
  ? JSON.parse(fs.readFileSync(manifestPath, "utf8"))
  : {};
const bytes = fs.readFileSync(aabPath);
const certificate = fs
  .readFileSync(path.join(ROOT, "release", "android-upload-certificate.sha256"), "utf8")
  .trim();

const manifest = {
  package_id: "life.copa.app",
  version_code: version.versionCode,
  version_name: version.versionName,
  release_status: "candidate",
  source: {
    build_version: platformBuild.build_version,
    build_fingerprint: platformBuild.build_fingerprint,
    fingerprint: platformBuild.source_fingerprint,
    commit: platformBuild.source_commit,
  },
  min_sdk: previous.min_sdk || 24,
  target_sdk: previous.target_sdk || 36,
  compile_sdk: previous.compile_sdk || 36,
  signed_aab: {
    file: path.relative(ROOT, aabPath).replace(/\\/g, "/"),
    bytes: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex").toUpperCase(),
  },
  upload_certificate_sha256: certificate,
  permissions: previous.permissions || ["android.permission.INTERNET"],
  verification: verified
    ? {
        main_test_suite: "passed",
        critical_browser_tests: "passed",
        ghost_worker_tests: "passed",
        web_android_parity: "passed",
        android_package_scan: "passed",
        signed_aab_signature: "passed",
        physical_device_smoke: "required before track promotion",
      }
    : {
        automated_release_checks: "not asserted by manifest writer",
        physical_device_smoke: "required before track promotion",
      },
  external_prerequisites: previous.external_prerequisites || [],
};

fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(
  `Release manifest updated: v${version.versionName}+${version.versionCode}, ${manifest.signed_aab.sha256}`,
);
