import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  ANDROID_TEXT_EXTENSIONS,
  isAndroidSkipped,
  transformAndroidText,
} from "./android-package-policy.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const WEB_OUT = path.join(ROOT, "dist");
const ANDROID_OUT = path.join(ROOT, "dist-android");
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

function verifyCopiedSources(output, platform, skipped, transform) {
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
      if (transform && ANDROID_TEXT_EXTENSIONS.has(path.extname(source).toLowerCase())) {
        expected = Buffer.from(transformAndroidText(sourceBytes.toString("utf8")));
      }
      if (!expected.equals(targetBytes)) fail(`${platform} changed shared source unexpectedly: ${relative}`);
      verified += 1;
    }
  }
  return verified;
}

const webManifest = readJson(path.join(WEB_OUT, "platform-build.json"));
const androidManifest = readJson(path.join(ANDROID_OUT, "platform-build.json"));
const releaseVersion = readJson(path.join(ROOT, "release", "android-version.json"));

if (webManifest && androidManifest) {
  if (webManifest.platform !== "web") fail("dist platform manifest is not web");
  if (androidManifest.platform !== "android") fail("dist-android platform manifest is not android");
  for (const field of ["build_version", "build_fingerprint", "build_input_count", "source_fingerprint", "source_file_count", "source_commit"]) {
    if (webManifest[field] !== androidManifest[field]) {
      fail(`web/Android build manifest mismatch: ${field}`);
    }
  }
}

if (androidManifest && releaseVersion) {
  if (androidManifest.version_code !== releaseVersion.versionCode) fail("Android versionCode drift");
  if (androidManifest.version_name !== releaseVersion.versionName) fail("Android versionName drift");
}

const verifiedWeb = verifyCopiedSources(WEB_OUT, "web", webSkipped, false);
const verifiedAndroid = verifyCopiedSources(ANDROID_OUT, "android", isAndroidSkipped, true);

for (const marker of ["copa-platform", "src/runtime/nativeApp.js", "platform-build.json"]) {
  const index = marker === "platform-build.json"
    ? fs.existsSync(path.join(ANDROID_OUT, marker))
    : fs.readFileSync(path.join(ANDROID_OUT, "index.html"), "utf8").includes(marker);
  if (!index) fail(`Android platform overlay is missing ${marker}`);
}

if (failures.length) {
  for (const failure of failures) console.error(`[parity] ${failure}`);
  process.exit(1);
}

console.log(
  `[parity] web and Android share ${webManifest.source_fingerprint.slice(0, 12)}; verified ${verifiedWeb} web and ${verifiedAndroid} Android source files`,
);
