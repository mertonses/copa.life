import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const version = JSON.parse(fs.readFileSync(path.join(ROOT, "release/ios-version.json"), "utf8"));
const projectPath = path.join(ROOT, "ios/App/App.xcodeproj/project.pbxproj");
const infoPath = path.join(ROOT, "ios/App/App/Info.plist");
const packagePath = path.join(ROOT, "ios/App/CapApp-SPM/Package.swift");
const privacyPath = path.join(ROOT, "ios/App/App/PrivacyInfo.xcprivacy");
const iconSource = path.join(ROOT, "store/ios/graphics/app-icon-1024.png");
const splashSource = path.join(ROOT, "store/ios/graphics/splash-2732.png");

if (!fs.existsSync(projectPath)) throw new Error("iOS Xcode project is missing; run npm run ios:add");
if (!fs.existsSync(privacyPath)) throw new Error("PrivacyInfo.xcprivacy is missing");

let project = fs.readFileSync(projectPath, "utf8");
project = project
  .replace(/CURRENT_PROJECT_VERSION = [^;]+;/g, `CURRENT_PROJECT_VERSION = ${version.buildNumber};`)
  .replace(/MARKETING_VERSION = [^;]+;/g, `MARKETING_VERSION = ${version.marketingVersion};`)
  .replace(/PRODUCT_BUNDLE_IDENTIFIER = [^;]+;/g, `PRODUCT_BUNDLE_IDENTIFIER = ${version.bundleId};`)
  .replace(/IPHONEOS_DEPLOYMENT_TARGET = [^;]+;/g, `IPHONEOS_DEPLOYMENT_TARGET = ${version.minimumOSVersion};`);
if (!project.includes("PrivacyInfo.xcprivacy in Resources")) {
  project = project
    .replace(
      "/* Begin PBXBuildFile section */",
      "/* Begin PBXBuildFile section */\n\t\tC0A1F0010000000000000002 /* PrivacyInfo.xcprivacy in Resources */ = {isa = PBXBuildFile; fileRef = C0A1F0010000000000000001 /* PrivacyInfo.xcprivacy */; };",
    )
    .replace(
      "/* Begin PBXFileReference section */",
      "/* Begin PBXFileReference section */\n\t\tC0A1F0010000000000000001 /* PrivacyInfo.xcprivacy */ = {isa = PBXFileReference; lastKnownFileType = text.xml; path = PrivacyInfo.xcprivacy; sourceTree = \"<group>\"; };",
    )
    .replace(
      "\t\t\t\t504EC3131FED79650016851F /* Info.plist */,",
      "\t\t\t\tC0A1F0010000000000000001 /* PrivacyInfo.xcprivacy */,\n\t\t\t\t504EC3131FED79650016851F /* Info.plist */,",
    )
    .replace(
      "/* Begin PBXResourcesBuildPhase section */\n\t\t504EC3021FED79650016851F /* Resources */ = {\n\t\t\tisa = PBXResourcesBuildPhase;\n\t\t\tbuildActionMask = 2147483647;\n\t\t\tfiles = (\n",
      "/* Begin PBXResourcesBuildPhase section */\n\t\t504EC3021FED79650016851F /* Resources */ = {\n\t\t\tisa = PBXResourcesBuildPhase;\n\t\t\tbuildActionMask = 2147483647;\n\t\t\tfiles = (\n\t\t\t\tC0A1F0010000000000000002 /* PrivacyInfo.xcprivacy in Resources */,\n",
    );
}
fs.writeFileSync(projectPath, project);

let info = fs.readFileSync(infoPath, "utf8");
if (!info.includes("<key>ITSAppUsesNonExemptEncryption</key>")) {
  info = info.replace(
    "\t<key>LSRequiresIPhoneOS</key>",
    "\t<key>ITSAppUsesNonExemptEncryption</key>\n\t<false/>\n\t<key>LSRequiresIPhoneOS</key>",
  );
}
fs.writeFileSync(infoPath, info);

if (fs.existsSync(packagePath)) {
  const source = fs.readFileSync(packagePath, "utf8");
  fs.writeFileSync(packagePath, source.replace(/path: "([^"]+)"/g, (_, value) => `path: "${value.replaceAll("\\", "/")}"`));
}

if (fs.existsSync(iconSource)) {
  fs.copyFileSync(iconSource, path.join(ROOT, "ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png"));
}
if (fs.existsSync(splashSource)) {
  for (const name of ["splash-2732x2732.png", "splash-2732x2732-1.png", "splash-2732x2732-2.png"]) {
    fs.copyFileSync(splashSource, path.join(ROOT, "ios/App/App/Assets.xcassets/Splash.imageset", name));
  }
}

console.log(`Configured iOS Xcode project: ${version.bundleId} v${version.marketingVersion} (${version.buildNumber})`);
