import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "dist-ios");
const failures = [];
const fail = (message) => failures.push(message);
const walk = (directory, files = []) => {
  if (!fs.existsSync(directory)) return files;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(file, files);
    else files.push(file);
  }
  return files;
};

if (!fs.existsSync(OUT)) fail("dist-ios is missing; run build:ios first");
for (const relative of [
  "assets/clubs", "assets/flags", "assets/icons/patreon.svg", "src/data/logos.js",
  "src/runtime/productAnalytics.js", "src/state/diagnostics.js", "sw.js",
]) {
  if (fs.existsSync(path.join(OUT, relative))) fail(`forbidden iOS artifact: ${relative}`);
}
const forbidden = [
  "assets/clubs/", "patreon.com", "FM26", "Football Manager", "injury_proneness",
  "FA Cup", "Copa del Rey", "Coppa Italia", "DFB-Pokal", "Emperor's Cup", "Emperor’s Cup",
  "api.web3forms.com", "cfSubmitBtn", "cfMail", "openContactForm()", "openBugReport()",
  "static.cloudflareinsights.com", "cloudflareinsights.com", "copa-analytics-api", "/v1/analytics/events",
];
for (const file of walk(OUT).filter((value) => /\.(?:html|js|css|json|webmanifest|svg)$/i.test(value))) {
  const text = fs.readFileSync(file, "utf8");
  for (const needle of forbidden) if (text.includes(needle)) fail(`${path.relative(OUT, file)} contains ${needle}`);
}

const indexPath = path.join(OUT, "index.html");
const index = fs.existsSync(indexPath) ? fs.readFileSync(indexPath, "utf8") : "";
for (const marker of [
  'meta name="copa-platform" content="ios"', "src/data/generic_club_visuals.js",
  "src/runtime/nativeApp.js", "privacy.html", "terms.html", "openNativeSupport",
]) {
  if (!index.includes(marker)) fail(`iOS index missing ${marker}`);
}
if (!index.includes('class="generic-country-code"')) fail("iOS index is missing generic country-code visuals");
if (/<img\s+[^>]*src=["']assets\/flags\//i.test(index)) fail("iOS index still renders flag artwork");
if (!index.includes("Capacitor.Plugins.Browser") || !index.includes('plugin.open({url:"https://copa.life/"')) {
  fail("iOS support link is not routed through the native Browser plugin");
}

const i18n = path.join(OUT, "src/data/i18n.js");
const profiles = path.join(OUT, "src/ui/playerProfiles.js");
if (!fs.existsSync(i18n) || !fs.readFileSync(i18n, "utf8").includes("COPA_IS_NATIVE")) fail("iOS country controls do not use native-safe visuals");
if (!fs.existsSync(profiles) || !fs.readFileSync(profiles, "utf8").includes("COPA_IS_NATIVE")) fail("iOS player profiles do not suppress native-store artwork");
const nativeRuntime = path.join(OUT, "src/runtime/nativeApp.js");
if (!fs.existsSync(nativeRuntime)) fail("iOS native runtime is missing");
else {
  const runtime = fs.readFileSync(nativeRuntime, "utf8");
  for (const marker of ["COPA_IS_NATIVE", "appStateChange", "pagehide", 'COPA_PLATFORM==="android"']) {
    if (!runtime.includes(marker)) fail(`iOS lifecycle/runtime marker missing: ${marker}`);
  }
}

const version = JSON.parse(fs.readFileSync(path.join(ROOT, "release/ios-version.json"), "utf8"));
const manifestPath = path.join(OUT, "platform-build.json");
if (!fs.existsSync(manifestPath)) fail("iOS platform build manifest missing");
else {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  if (manifest.platform !== "ios") fail("wrong iOS platform manifest");
  if (manifest.bundle_id !== version.bundleId || manifest.version_name !== version.marketingVersion || manifest.build_number !== version.buildNumber) fail("iOS package version drift");
  if (!/^[a-f0-9]{64}$/.test(manifest.source_fingerprint || "")) fail("invalid iOS source fingerprint");
  if (!index.includes(`src/runtime/nativeApp.js?v=${manifest.build_version}`)) fail("iOS native runtime cache key drift");
}

const profileData = path.join(OUT, "assets/data/copa/player_profiles.json");
if (!fs.existsSync(profileData)) fail("copa player profile data missing");
else {
  const data = JSON.parse(fs.readFileSync(profileData, "utf8"));
  const expected = ["copa_impact", "copa_build_up", "copa_space_control", "copa_duels", "copa_engine", "copa_pressure_decision"];
  if (data.model_version !== "copa-model-v1" || expected.some((field) => !data.fields.includes(field))) fail("iOS copa model is incomplete");
  if (data.fields.some((field) => ["injury_proneness", "aggression", "composure"].includes(field))) fail("raw/medical fields leaked into iOS");
}

if (failures.length) {
  for (const failure of failures) console.error(`[ios] ${failure}`);
  process.exit(1);
}
console.log(`[ios] clean package: ${walk(OUT).length} files; generic rights-safe native content and lifecycle markers verified`);
