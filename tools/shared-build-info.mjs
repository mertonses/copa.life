import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const SHARED_ROOT_FILES = [
  "index.html",
  "manifest.json",
  "privacy.html",
  "site.webmanifest",
  "takedown.html",
  "terms.html",
];

const SHARED_ROOT_DIRS = ["assets", "src"];

const SHARED_BUILD_FILES = [
  "android/app/build.gradle",
  "android/app/proguard-rules.pro",
  "android/app/src/main/AndroidManifest.xml",
  "android/app/capacitor.build.gradle",
  "android/build.gradle",
  "android/capacitor.settings.gradle",
  "android/gradle.properties",
  "android/gradle/wrapper/gradle-wrapper.properties",
  "android/settings.gradle",
  "android/variables.gradle",
  "apple-touch-icon.png",
  "capacitor.config.json",
  "favicon-16x16.png",
  "favicon-32x32.png",
  "favicon-48x48.png",
  "favicon.svg",
  "package.json",
  "package-lock.json",
  "release/android-version.json",
  "sw.js",
  "tools/android-package-policy.mjs",
  "tools/build-android.mjs",
  "tools/build-pages.mjs",
  "tools/patch-capacitor-safe-area.mjs",
  "tools/shared-build-info.mjs",
  "web-app-icon-192.png",
  "web-app-icon-512.png",
];

const SHARED_BUILD_DIRS = [
  "android/app/src/main/java",
  "android/app/src/main/res",
];

function toPosix(value) {
  return value.replace(/\\/g, "/");
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

function cleanGitCommit(root) {
  const status = spawnSync("git", ["status", "--porcelain"], {
    cwd: root,
    encoding: "utf8",
    windowsHide: true,
  });
  if (status.status !== 0 || status.stdout.trim()) return null;
  const revision = spawnSync("git", ["rev-parse", "HEAD"], {
    cwd: root,
    encoding: "utf8",
    windowsHide: true,
  });
  const value = revision.status === 0 ? revision.stdout.trim() : "";
  return /^[a-f0-9]{40}$/i.test(value) ? value : null;
}

export function getSharedSourceFiles(root) {
  const files = SHARED_ROOT_FILES
    .map((relative) => path.join(root, relative))
    .filter((file) => fs.existsSync(file));

  for (const directory of SHARED_ROOT_DIRS) {
    walk(path.join(root, directory), files);
  }

  return files.sort((left, right) =>
    toPosix(path.relative(root, left)).localeCompare(toPosix(path.relative(root, right))),
  );
}

export function getSharedBuildInfo(root) {
  const files = getSharedSourceFiles(root);
  const sourceHash = createHash("sha256");

  for (const file of files) {
    const relative = toPosix(path.relative(root, file));
    sourceHash.update(relative);
    sourceHash.update("\0");
    sourceHash.update(fs.readFileSync(file));
    sourceHash.update("\0");
  }

  const sourceFingerprint = sourceHash.digest("hex");
  const buildCandidates = SHARED_BUILD_FILES
    .map((relative) => path.join(root, relative))
    .filter((file) => fs.existsSync(file));
  for (const directory of SHARED_BUILD_DIRS) {
    walk(path.join(root, directory), buildCandidates);
  }
  const buildFiles = [...new Set(buildCandidates)]
    .sort((left, right) =>
      toPosix(path.relative(root, left)).localeCompare(toPosix(path.relative(root, right))),
    );
  const buildHash = createHash("sha256");
  buildHash.update(sourceFingerprint);
  for (const file of buildFiles) {
    const relative = toPosix(path.relative(root, file));
    buildHash.update(relative);
    buildHash.update("\0");
    buildHash.update(fs.readFileSync(file));
    buildHash.update("\0");
  }
  const buildFingerprint = buildHash.digest("hex");
  const ciCommit = (process.env.GITHUB_SHA || "").trim();
  const commit = (/^[a-f0-9]{40}$/i.test(ciCommit) ? ciCommit : null) || cleanGitCommit(root);
  return {
    sourceFingerprint,
    sourceFileCount: files.length,
    buildFingerprint,
    buildInputCount: files.length + buildFiles.length,
    buildVersion: commit ? commit.slice(0, 12) : buildFingerprint.slice(0, 12),
    commit,
  };
}

export function writePlatformBuildManifest(outputDirectory, platform, buildInfo, extra = {}) {
  const manifest = {
    schema_version: 1,
    platform,
    build_version: buildInfo.buildVersion,
    build_fingerprint: buildInfo.buildFingerprint,
    build_input_count: buildInfo.buildInputCount,
    source_fingerprint: buildInfo.sourceFingerprint,
    source_file_count: buildInfo.sourceFileCount,
    source_commit: buildInfo.commit,
    ...extra,
  };
  fs.writeFileSync(
    path.join(outputDirectory, "platform-build.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
  return manifest;
}
