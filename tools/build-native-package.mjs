import fs from "node:fs";
import path from "node:path";
import {
  NATIVE_TEXT_EXTENSIONS,
  isNativeSkipped,
  transformNativeText,
} from "./native-package-policy.mjs";
import { getSharedBuildInfo, writePlatformBuildManifest } from "./shared-build-info.mjs";

const ROOT_FILES = [
  "favicon.svg",
  "favicon-16x16.png",
  "favicon-32x32.png",
  "favicon-48x48.png",
  "faq.html",
  "support.html",
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
const LOCAL_ASSET_URL = /((?:src|assets)\/[A-Za-z0-9_./-]+\.(?:js|css|json|webmanifest|svg|png|webp|jpe?g|gif|ogg|wav|mp3))(?:\?v=[A-Za-z0-9._-]+)?/gi;

function copyFile(source, target) {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
}

function copyDir(root, source, target) {
  if (!fs.existsSync(source)) return;
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const from = path.join(source, entry.name);
    const relative = path.relative(root, from);
    if (isNativeSkipped(relative)) continue;
    const to = path.join(target, entry.name);
    if (entry.isDirectory()) copyDir(root, from, to);
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
    if (!NATIVE_TEXT_EXTENSIONS.has(path.extname(file).toLowerCase())) continue;
    const source = fs.readFileSync(file, "utf8");
    const next = transformNativeText(source);
    if (next !== source) fs.writeFileSync(file, next);
  }
}

export function buildNativePackage({
  root,
  platform,
  outputDirectory,
  versionLabel,
  versionAriaLabel,
  manifestExtra,
}) {
  if (!new Set(["android", "ios"]).has(platform)) {
    throw new Error(`Unsupported native platform: ${platform}`);
  }
  const out = path.resolve(root, outputDirectory);
  const buildInfo = getSharedBuildInfo(root);

  fs.rmSync(out, { recursive: true, force: true });
  fs.mkdirSync(out, { recursive: true });
  for (const file of ROOT_FILES) {
    const source = path.join(root, file);
    if (fs.existsSync(source)) copyFile(source, path.join(out, file));
  }
  for (const directory of ["assets", "src"]) {
    copyDir(root, path.join(root, directory), path.join(out, directory));
  }

  const indexPath = path.join(out, "index.html");
  let index = fs.readFileSync(indexPath, "utf8");
  index = index
    .replace('<meta name="copa-platform" content="web">', `<meta name="copa-platform" content="${platform}">`)
    .replace(/<script>\s*if\("serviceWorker"in navigator\)[\s\S]*?<\/script>/, "")
    .replace(/<script src="src\/data\/logos\.js[^>]*><\/script>\s*/, "")
    .replace(/<script src="src\/state\/diagnostics\.js[^>]*><\/script>\s*/, "")
    .replace(/<a class="patreonbox[\s\S]*?<\/a>/g, "")
    .replace(/<a class="footer-link" href="https:\/\/www\.patreon\.com[\s\S]*?<\/a>/g, "")
    .replace(
      /function openContactForm\(\)\{[\s\S]*?^}\r?\nasync function submitContact\(\)\{[\s\S]*?^}\r?\nfunction goLand/m,
      'function openNativeSupport(){const supportUrl="https://copa.life/support.html";const plugin=window.Capacitor&&window.Capacitor.Plugins&&window.Capacitor.Plugins.Browser;if(plugin&&typeof plugin.open==="function"){plugin.open({url:supportUrl,toolbarColor:"#0c2b24"}).catch(()=>{});return;}window.open(supportUrl,"_blank","noopener");}\nfunction goLand',
    )
    .replace(/onclick="openContactForm\(\)"/g, 'onclick="openNativeSupport()"')
    .replace(/onclick="openBugReport\(\)"/g, 'onclick="openNativeSupport()"')
    .replace(
      '<span class="native-version-slot" aria-hidden="true"></span>',
      `<span class="footer-sep" style="display:inline">·</span><span class="footer-link ${platform}-version" aria-label="${versionAriaLabel}">${versionLabel}</span>`,
    )
    .replace(
      "</body>",
      `${platform === "android" ? `<script src="src/runtime/nativeAds.js?v=${buildInfo.buildVersion}"></script>` : ""}<script src="src/runtime/nativeApp.js?v=${buildInfo.buildVersion}"></script></body>`,
    )
    .replaceAll("__COPA_BUILD_VERSION__", buildInfo.buildVersion);
  index = index.replace(LOCAL_ASSET_URL, `$1?v=${buildInfo.buildVersion}`);
  index = index.replace(/\?v=202\d[A-Za-z0-9._-]*/g, `?v=${buildInfo.buildVersion}`);
  fs.writeFileSync(indexPath, index);

  transformFiles(out);
  writePlatformBuildManifest(out, platform, buildInfo, manifestExtra);
  return { buildInfo, fileCount: walk(out).length };
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
