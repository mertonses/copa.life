import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildNativePackage } from "./build-native-package.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const releaseVersion = JSON.parse(
  fs.readFileSync(path.join(ROOT, "release", "android-version.json"), "utf8"),
);
const { buildInfo } = buildNativePackage({
  root: ROOT,
  platform: "android",
  outputDirectory: "dist-android",
  versionLabel: `v${releaseVersion.versionName} (${releaseVersion.versionCode})`,
  versionAriaLabel: `Android version ${releaseVersion.versionName}`,
  manifestExtra: {
  package_id: "life.copa.app",
  version_code: releaseVersion.versionCode,
  version_name: releaseVersion.versionName,
  },
});

console.log(
  `Android web artifact built: dist-android (${buildInfo.buildVersion}, v${releaseVersion.versionName}+${releaseVersion.versionCode})`,
);
