import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildNativePackage } from "./build-native-package.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const version = JSON.parse(fs.readFileSync(path.join(ROOT, "release", "ios-version.json"), "utf8"));
const { buildInfo } = buildNativePackage({
  root: ROOT,
  platform: "ios",
  outputDirectory: "dist-ios",
  versionLabel: `v${version.marketingVersion} (${version.buildNumber})`,
  versionAriaLabel: `iOS version ${version.marketingVersion}`,
  manifestExtra: {
    bundle_id: version.bundleId,
    build_number: version.buildNumber,
    version_name: version.marketingVersion,
    minimum_os_version: version.minimumOSVersion,
  },
});

console.log(
  `iOS web artifact built: dist-ios (${buildInfo.buildVersion}, v${version.marketingVersion}+${version.buildNumber})`,
);
