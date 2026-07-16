import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  ANDROID_TEXT_EXTENSIONS,
  isAndroidSkipped,
  transformAndroidText,
} from "./android-package-policy.mjs";
import { getSharedBuildInfo, writePlatformBuildManifest } from "./shared-build-info.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "dist-android");
const ROOT_FILES = [
  "favicon.svg",
  "favicon-16x16.png",
  "favicon-32x32.png",
  "favicon-48x48.png",
  "apple-touch-icon.png",
  "web-app-icon-192.png",
  "web-app-icon-512.png",
  "index.html",
  "manifest.json",
  "site.webmanifest",
  "privacy.html",
  "terms.html",
  "takedown.html",
];

function copyFile(source, target) {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
}

function copyDir(source, target) {
  if (!fs.existsSync(source)) return;
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const from = path.join(source, entry.name);
    const relative = path.relative(ROOT, from);
    if (isAndroidSkipped(relative)) continue;
    const to = path.join(target, entry.name);
    if (entry.isDirectory()) copyDir(from, to);
    else copyFile(from, to);
  }
}

function transformFiles(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      transformFiles(file);
      continue;
    }
    if (!ANDROID_TEXT_EXTENSIONS.has(path.extname(file).toLowerCase())) continue;
    const source = fs.readFileSync(file, "utf8");
    const next = transformAndroidText(source);
    if (next !== source) fs.writeFileSync(file, next);
  }
}

const releaseVersion = JSON.parse(
  fs.readFileSync(path.join(ROOT, "release", "android-version.json"), "utf8"),
);
const buildInfo = getSharedBuildInfo(ROOT);
const LOCAL_ASSET_URL = /((?:src|assets)\/[A-Za-z0-9_./-]+\.(?:js|css|json|webmanifest|svg|png|webp|jpe?g|gif|ogg|wav|mp3))(?:\?v=[A-Za-z0-9._-]+)?/gi;

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

for (const file of ROOT_FILES) {
  const source = path.join(ROOT, file);
  if (fs.existsSync(source)) copyFile(source, path.join(OUT, file));
}
for (const directory of ["assets", "src"]) {
  copyDir(path.join(ROOT, directory), path.join(OUT, directory));
}

const indexPath = path.join(OUT, "index.html");
let index = fs.readFileSync(indexPath, "utf8");
index = index
  .replace('<meta name="copa-platform" content="web">', '<meta name="copa-platform" content="android">')
  .replace(/<script>\s*if\("serviceWorker"in navigator\)[\s\S]*?<\/script>/, "")
  .replace(/<script src="src\/data\/logos\.js[^>]*><\/script>\s*/, "")
  .replace(/<script src="src\/runtime\/productAnalytics\.js[^>]*><\/script>\s*/, "")
  .replace(/<script src="src\/state\/diagnostics\.js[^>]*><\/script>\s*/, "")
  .replace(/<meta name="copa-analytics-api"[^>]*>\s*/, "")
  .replace(/<a class="patreonbox[\s\S]*?<\/a>/g, "")
  .replace(/<a class="footer-link" href="https:\/\/www\.patreon\.com[\s\S]*?<\/a>/g, "")
  .replace(
    /function openContactForm\(\)\{[\s\S]*?^}\r?\nasync function submitContact\(\)\{[\s\S]*?^}\r?\nfunction goLand/m,
    'function openAndroidSupport(){const plugin=window.Capacitor&&window.Capacitor.Plugins&&window.Capacitor.Plugins.Browser;if(plugin&&typeof plugin.open==="function"){plugin.open({url:"https://copa.life/",toolbarColor:"#0c2b24"}).catch(()=>{});return;}window.open("https://copa.life/","_blank","noopener");}\nfunction goLand',
  )
  .replace(/onclick="openContactForm\(\)"/g, 'onclick="openAndroidSupport()"')
  .replace(/onclick="openBugReport\(\)"/g, 'onclick="openAndroidSupport()"')
  .replace(
    '<span class="rights-note">',
    `<span class="footer-link android-version" aria-label="Android version ${releaseVersion.versionName}">v${releaseVersion.versionName} (${releaseVersion.versionCode})</span><span class="footer-sep" style="display:inline">·</span><span class="rights-note">`,
  )
  .replace("</body>", `<script src="src/runtime/nativeApp.js?v=${buildInfo.buildVersion}"></script></body>`)
  .replaceAll("__COPA_BUILD_VERSION__", buildInfo.buildVersion);
index = index.replace(LOCAL_ASSET_URL, `$1?v=${buildInfo.buildVersion}`);
fs.writeFileSync(indexPath, index);

transformFiles(OUT);
writePlatformBuildManifest(OUT, "android", buildInfo, {
  package_id: "life.copa.app",
  version_code: releaseVersion.versionCode,
  version_name: releaseVersion.versionName,
});

console.log(
  `Android web artifact built: dist-android (${buildInfo.buildVersion}, v${releaseVersion.versionName}+${releaseVersion.versionCode})`,
);
