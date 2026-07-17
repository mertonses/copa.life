import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];
const fail = (message) => failures.push(message);
const read = (relative) => fs.readFileSync(path.join(ROOT, relative), "utf8");
const exists = (relative) => fs.existsSync(path.join(ROOT, relative));

const pkg = JSON.parse(read("package.json"));
const version = JSON.parse(read("release/ios-version.json"));
if (pkg.devDependencies?.["@capacitor/ios"] !== "8.4.2") fail("@capacitor/ios must be pinned to 8.4.2");
if (pkg.dependencies?.["@capacitor/core"] !== "8.4.2") fail("Capacitor core version drift");
if (pkg.dependencies?.["@capacitor/haptics"] !== "8.0.2") fail("@capacitor/haptics must be pinned to 8.0.2");
if (!Number.isInteger(version.buildNumber) || version.buildNumber < 1) fail("invalid iOS build number");
if (!/^\d+\.\d+\.\d+$/.test(version.marketingVersion)) fail("invalid iOS marketing version");
if (version.bundleId !== "life.copa.app") fail("iOS bundle id drift");
if (version.minimumOSVersion !== "15.0") fail("minimum iOS version drift");

const config = JSON.parse(read("capacitor.config.json"));
if (config.appId !== version.bundleId) fail("Capacitor app id differs from the iOS bundle id");
if (Object.hasOwn(config.server || {}, "url")) fail("remote runtime URL is forbidden");
if (config.ios?.contentInset !== "never") fail("iOS must use explicit CSS safe-area handling");
if (config.ios?.zoomEnabled !== false) fail("iOS WebView zoom must remain disabled");
if (config.ios?.allowsLinkPreview !== false) fail("iOS WebView link previews must remain disabled");
if (config.ios?.preferredContentMode !== "mobile") fail("iOS WebView content mode must be mobile");
if (!read("capacitor.config.js").includes('COPA_NATIVE_PLATFORM === "ios" ? "dist-ios"')) fail("platform-specific Capacitor webDir selection is missing");

for (const file of [
  "ios/App/App.xcodeproj/project.pbxproj",
  "ios/App/App/Info.plist",
  "ios/App/App/PrivacyInfo.xcprivacy",
  "ios/App/CapApp-SPM/Package.swift",
  "ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png",
  "ios/App/App/Assets.xcassets/Splash.imageset/splash-2732x2732.png",
  "store/ios/listing-tr.md",
  "store/ios/listing-en.md",
  "store/ios/app-privacy.md",
  "store/ios/age-rating.md",
  "store/ios/app-review-notes.md",
  "store/ios/manual-checklist.md",
]) if (!exists(file)) fail(`missing iOS readiness file: ${file}`);

const project = read("ios/App/App.xcodeproj/project.pbxproj");
for (const marker of [
  `CURRENT_PROJECT_VERSION = ${version.buildNumber};`,
  `MARKETING_VERSION = ${version.marketingVersion};`,
  `PRODUCT_BUNDLE_IDENTIFIER = ${version.bundleId};`,
  `IPHONEOS_DEPLOYMENT_TARGET = ${version.minimumOSVersion};`,
  "PrivacyInfo.xcprivacy in Resources",
  'TARGETED_DEVICE_FAMILY = "1,2";',
  "CODE_SIGN_STYLE = Automatic;",
]) if (!project.includes(marker)) fail(`Xcode project marker missing: ${marker}`);

const swiftPackage = read("ios/App/CapApp-SPM/Package.swift");
if (/path:\s*"[^"]*\\/.test(swiftPackage)) fail("Swift Package contains Windows path separators");
if (!swiftPackage.includes('exact: "8.4.2"')) fail("Capacitor Swift package version drift");
if (!swiftPackage.includes('package(name: "CapacitorHaptics"') || !swiftPackage.includes('.product(name: "CapacitorHaptics"')) fail("iOS Haptics plugin is not linked");

const info = read("ios/App/App/Info.plist");
if (!info.includes("<key>ITSAppUsesNonExemptEncryption</key>\n\t<false/>")) fail("export-compliance encryption declaration is missing");
if (/<key>NS(?:Camera|Microphone|Location|PhotoLibrary|Contacts|Tracking)[^<]*UsageDescription<\/key>/.test(info)) fail("unexpected protected iOS permission declaration");
if (info.includes("<key>UIRequiresFullScreen</key>")) fail("iPad dynamic resizing must not be disabled");
for (const orientation of [
  "UIInterfaceOrientationPortrait",
  "UIInterfaceOrientationLandscapeLeft",
  "UIInterfaceOrientationLandscapeRight",
  "UIInterfaceOrientationPortraitUpsideDown",
]) if (!info.includes(orientation)) fail(`orientation support missing: ${orientation}`);

const privacy = read("ios/App/App/PrivacyInfo.xcprivacy");
for (const marker of [
  "<key>NSPrivacyTracking</key>", "<false/>",
  "NSPrivacyCollectedDataTypeGameplayContent", "NSPrivacyCollectedDataTypeDeviceID",
  "NSPrivacyCollectedDataTypePurposeAppFunctionality", "<key>NSPrivacyAccessedAPITypes</key>",
]) if (!privacy.includes(marker)) fail(`privacy manifest marker missing: ${marker}`);

function pngInfo(relative) {
  const buffer = fs.readFileSync(path.join(ROOT, relative));
  if (buffer.toString("hex", 0, 8) !== "89504e470d0a1a0a") return null;
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20), colorType: buffer[25] };
}
const icon = pngInfo("store/ios/graphics/app-icon-1024.png");
if (!icon || icon.width !== 1024 || icon.height !== 1024) fail("iOS icon must be 1024x1024");
if (icon && [4, 6].includes(icon.colorType)) fail("iOS icon must not contain an alpha channel");
const splash = pngInfo("store/ios/graphics/splash-2732.png");
if (!splash || splash.width !== 2732 || splash.height !== 2732) fail("iOS splash must be 2732x2732");

const worker = read("services/ghost-club-api/src/index.js");
const workerConfig = read("services/ghost-club-api/wrangler.jsonc");
for (const origin of ["https://localhost", "capacitor://localhost"]) {
  if (!worker.includes(origin) || !workerConfig.includes(origin)) fail(`Ghost API native origin missing: ${origin}`);
}

const source = read("src/runtime/nativeApp.js");
if (!source.includes("COPA_IS_NATIVE") || !source.includes("appStateChange") || !source.includes('COPA_PLATFORM==="android"')) fail("native iOS lifecycle or Android-only back handling drift");
if (!read("src/ui/mobileExperience.js").includes("plugins.Haptics") || !read("src/ui/mobileExperience.js").includes('style:strength>=30?"HEAVY"')) fail("iOS haptics preference is not wired to the native plugin");
const baseCss = read("src/styles/base.css");
if (!baseCss.includes('html[data-copa-platform="ios"] body')) fail("iOS safe-area CSS is missing");
for (const file of ["docs/ios-store-readiness.md", "store/ios/app-privacy.md", "store/ios/app-review-notes.md"]) {
  if (!read(file).includes("https://copa-life-legal.pages.dev/privacy.html")) fail(`${file} is missing the stable privacy URL`);
}
if (!read("docs/ios-store-readiness.md").includes("Xcode 26")) fail("current App Store SDK requirement is not documented");

if (failures.length) {
  for (const failure of failures) console.error(`[ios-readiness] ${failure}`);
  process.exit(1);
}
console.log("[ios-readiness] Xcode source, versions, privacy, UGC, rights-safe assets, store metadata and native origins passed");
