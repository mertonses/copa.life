import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  ANDROID_TEXT_EXTENSIONS,
  isAndroidSkipped,
  transformAndroidText,
} from "./android-package-policy.mjs";
import {
  NATIVE_TEXT_EXTENSIONS,
  isNativeSkipped,
  transformNativeText,
} from "./native-package-policy.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const WEB_OUT = path.join(ROOT, "dist");
const ANDROID_OUT = path.join(ROOT, "dist-android");
const IOS_OUT = path.join(ROOT, "dist-ios");
const failures = [];

function fail(message) {
  failures.push(message);
}

function readJson(file) {
  if (!fs.existsSync(file)) {
    fail(`missing ${path.relative(ROOT, file)}`);
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    fail(`invalid JSON in ${path.relative(ROOT, file)}: ${error.message}`);
    return null;
  }
}

function walk(directory, files = []) {
  if (!fs.existsSync(directory)) return files;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(file, files);
    else files.push(file);
  }
  return files;
}

function webSkipped(relative) {
  const value = relative.replace(/\\/g, "/");
  return ["assets/chairs", "assets/story-icons", "src/legacy"].some(
    (prefix) => value === prefix || value.startsWith(`${prefix}/`),
  );
}

function verifyCopiedSources(output, platform, skipped, transform, textExtensions = ANDROID_TEXT_EXTENSIONS) {
  let verified = 0;
  for (const directory of ["assets", "src"]) {
    for (const source of walk(path.join(ROOT, directory))) {
      const relative = path.relative(ROOT, source).replace(/\\/g, "/");
      const target = path.join(output, relative);
      if (skipped(relative)) {
        if (fs.existsSync(target)) fail(`${platform} contains excluded source ${relative}`);
        continue;
      }
      if (!fs.existsSync(target)) {
        fail(`${platform} is missing shared source ${relative}`);
        continue;
      }

      const sourceBytes = fs.readFileSync(source);
      const targetBytes = fs.readFileSync(target);
      let expected = sourceBytes;
      if (transform && textExtensions.has(path.extname(source).toLowerCase())) {
        expected = Buffer.from(transform(sourceBytes.toString("utf8")));
      }
      if (!expected.equals(targetBytes)) fail(`${platform} changed shared source unexpectedly: ${relative}`);
      verified += 1;
    }
  }
  return verified;
}

const webManifest = readJson(path.join(WEB_OUT, "platform-build.json"));
const androidManifest = readJson(path.join(ANDROID_OUT, "platform-build.json"));
const iosManifest = readJson(path.join(IOS_OUT, "platform-build.json"));
const releaseVersion = readJson(path.join(ROOT, "release", "android-version.json"));
const iosVersion = readJson(path.join(ROOT, "release", "ios-version.json"));

if (webManifest && androidManifest && iosManifest) {
  if (webManifest.platform !== "web") fail("dist platform manifest is not web");
  if (androidManifest.platform !== "android") fail("dist-android platform manifest is not android");
  if (iosManifest.platform !== "ios") fail("dist-ios platform manifest is not ios");
  for (const field of ["build_version", "build_fingerprint", "build_input_count", "source_fingerprint", "source_file_count", "source_commit"]) {
    if (webManifest[field] !== androidManifest[field]) {
      fail(`web/Android build manifest mismatch: ${field}`);
    }
    if (webManifest[field] !== iosManifest[field]) {
      fail(`web/iOS build manifest mismatch: ${field}`);
    }
  }
}

if (androidManifest && releaseVersion) {
  if (androidManifest.version_code !== releaseVersion.versionCode) fail("Android versionCode drift");
  if (androidManifest.version_name !== releaseVersion.versionName) fail("Android versionName drift");
}
if (iosManifest && iosVersion) {
  if (iosManifest.build_number !== iosVersion.buildNumber) fail("iOS build number drift");
  if (iosManifest.version_name !== iosVersion.marketingVersion) fail("iOS marketing version drift");
  if (iosManifest.bundle_id !== iosVersion.bundleId) fail("iOS bundle id drift");
}

const verifiedWeb = verifyCopiedSources(WEB_OUT, "web", webSkipped, false);
const verifiedAndroid = verifyCopiedSources(ANDROID_OUT, "android", isAndroidSkipped, transformAndroidText);
const verifiedIos = verifyCopiedSources(IOS_OUT, "ios", isNativeSkipped, transformNativeText, NATIVE_TEXT_EXTENSIONS);

for (const marker of ["copa-platform", "src/runtime/nativeApp.js", "platform-build.json"]) {
  const index = marker === "platform-build.json"
    ? fs.existsSync(path.join(ANDROID_OUT, marker))
    : fs.readFileSync(path.join(ANDROID_OUT, "index.html"), "utf8").includes(marker);
  if (!index) fail(`Android platform overlay is missing ${marker}`);
}
for (const marker of ["copa-platform", "src/runtime/nativeApp.js", "platform-build.json"]) {
  const present = marker === "platform-build.json"
    ? fs.existsSync(path.join(IOS_OUT, marker))
    : fs.readFileSync(path.join(IOS_OUT, "index.html"), "utf8").includes(marker);
  if (!present) fail(`iOS platform overlay is missing ${marker}`);
}

if (failures.length) {
  for (const failure of failures) console.error(`[parity] ${failure}`);
  process.exit(1);
}

console.log(
  `[parity] web, Android and iOS share ${webManifest.source_fingerprint.slice(0, 12)}; verified ${verifiedWeb} web, ${verifiedAndroid} Android and ${verifiedIos} iOS source files`,
);
