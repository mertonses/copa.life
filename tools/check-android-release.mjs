import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateReleaseNotes } from "./android-release-notes.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = validateReleaseNotes();
const read = (relative) => fs.readFileSync(path.join(ROOT, relative), "utf8");
const exists = (relative) => fs.existsSync(path.join(ROOT, relative));
const fail = (message) => failures.push(message);

const version = JSON.parse(read("release/android-version.json"));
const notes = JSON.parse(read("store/android/release-notes.json"));
if (notes.versionCode !== version.versionCode || notes.versionName !== version.versionName) {
  fail("release notes are stale; edit them and run npm run android:notes:stamp");
}
for (const locale of ["tr-TR", "en-US"]) {
  if (!notes.locales?.includes(locale)) fail(`release notes metadata is missing ${locale}`);
}

const packageJson = JSON.parse(read("package.json"));
if (packageJson.private !== true) fail("root package must be private to prevent accidental npm publishing");
if (packageJson.engines?.node !== ">=22 <23") fail("Node 22 runtime is not pinned in package.json");
if (read(".nvmrc").trim() !== "22") fail(".nvmrc must pin Node 22");
if (read(".java-version").trim() !== "21") fail(".java-version must pin JDK 21");

const wrapper = read("android/gradle/wrapper/gradle-wrapper.properties");
if (!wrapper.includes("gradle-8.14.3-all.zip")) fail("unexpected Gradle wrapper version");
if (!wrapper.includes("distributionSha256Sum=ed1a8d686605fd7c23bdf62c7fc7add1c5b23b2bbc3721e661934ef4a4911d7c")) {
  fail("Gradle wrapper checksum is missing or incorrect");
}

const manifest = read("android/app/src/main/AndroidManifest.xml");
if (!manifest.includes('android:allowBackup="false"')) fail("Android backup must remain disabled");
if (!manifest.includes('android:usesCleartextTraffic="false"')) fail("cleartext Android traffic must remain disabled");
if (!manifest.includes('android:screenOrientation="portrait"')) fail("Android orientation contract changed");
const permissions = [...manifest.matchAll(/<uses-permission\s+android:name="([^"]+)"/g)].map((match) => match[1]);
if (permissions.length !== 1 || permissions[0] !== "android.permission.INTERNET") {
  fail(`unexpected Android permissions: ${permissions.join(", ") || "none"}`);
}
const mainActivity = read("android/app/src/main/java/life/copa/app/MainActivity.java");
for (const marker of ["VERSION_CODE_KEY", "clearCache(true)", "getLongVersionCode", "reload()"] ) {
  if (!mainActivity.includes(marker)) fail(`native update cache guard is missing ${marker}`);
}

const filePaths = read("android/app/src/main/res/xml/file_paths.xml");
if (/<(?:external|external-files|root|files)-path\b/.test(filePaths)) {
  fail("FileProvider exposes a persistent or external path");
}
if (!/<cache-path\b[^>]*path="shared\/"/.test(filePaths)) {
  fail("FileProvider must be restricted to the shared cache subdirectory");
}

const capacitor = JSON.parse(read("capacitor.config.json"));
if (capacitor.appId !== "life.copa.app") fail("Capacitor application id drift");
if (Object.hasOwn(capacitor.server || {}, "url")) fail("remote runtime URL is forbidden in the native app");
if (capacitor.android?.allowMixedContent !== false) fail("mixed content must remain disabled");

const certificate = read("release/android-upload-certificate.sha256").trim();
if (!/^(?:[0-9A-F]{2}:){31}[0-9A-F]{2}$/i.test(certificate)) fail("invalid upload certificate pin");

const playWorkflow = read(".github/workflows/android-play.yml");
if (!/uses:\s*r0adkll\/upload-google-play@[a-f0-9]{40}/.test(playWorkflow)) {
  fail("Google Play action must be pinned to a full commit SHA");
}
if (!/tracks:\s*internal/.test(playWorkflow)) fail("automated upload must target internal testing only");
if (/tracks:\s*(?:production|alpha|beta)/.test(playWorkflow)) {
  fail("automated uploader must not bypass internal testing");
}

const candidateWorkflow = read(".github/workflows/android-candidate.yml");
if (!/schedule:[\s\S]*cron:/.test(candidateWorkflow)) fail("scheduled Android maintenance build is missing");
if (!/CheckAndroidAab|check:android:aab/.test(candidateWorkflow)) fail("CI does not inspect the built AAB payload");

const legalWorkflow = read(".github/workflows/legal-pages.yml");
if (!/project-name copa-life-legal/.test(legalWorkflow)) fail("stable legal Pages deployment is missing");
if (!/check-legal-pages\.mjs --remote/.test(legalWorkflow)) fail("live legal URL monitoring is missing");

const stablePrivacyUrl = "https://copa-life-legal.pages.dev/privacy.html";
for (const file of ["docs/android-store-readiness.md", "store/android/play-console-declarations.md"]) {
  const content = read(file);
  if (!content.includes(stablePrivacyUrl)) fail(`${file} does not reference the stable privacy URL`);
  if (/https:\/\/[a-f0-9]{8,}\.copa-life-legal\.pages\.dev/i.test(content)) {
    fail(`${file} references an ephemeral legal Pages deployment`);
  }
}

for (const workflowName of fs.readdirSync(path.join(ROOT, ".github/workflows")).filter((name) => name.endsWith(".yml"))) {
  const workflow = read(`.github/workflows/${workflowName}`);
  for (const match of workflow.matchAll(/^\s*-?\s*uses:\s*([^\s#]+)/gm)) {
    const action = match[1];
    if (action.startsWith("./") || action.startsWith("docker://")) continue;
    if (!/@[a-f0-9]{40}$/i.test(action)) fail(`${workflowName} has an unpinned action: ${action}`);
  }
}

for (const required of [
  "tools/CheckAndroidAab.java",
  "tools/check-android-signature.mjs",
  "tools/java-runtime.mjs",
  "tools/run-java.mjs",
  "tools/write-android-candidate-manifest.mjs",
]) {
  if (!exists(required)) fail(`missing release safeguard: ${required}`);
}

if (failures.length) {
  for (const failure of failures) console.error(`[android release] ${failure}`);
  process.exit(1);
}
console.log(
  `[android release] preflight passed for v${version.versionName}+${version.versionCode}; toolchains, notes, permissions, certificate pin and internal-only upload are locked`,
);
