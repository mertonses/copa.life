import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "dist-legal");
const REMOTE_BASE = "https://copa-life-legal.pages.dev";
const MOBILE_SUPPORT_URL = "https://copa.life/support.html";
const failures = [];
const required = {
  "privacy.html": ["Gizlilik", "45 gün", "Çevrimiçi verilerimi sil", "ghost-terms-v1", "leaderboard-terms-v1", "Google AdMob", "support@copa.life"],
  "terms.html": ["Kullanım", "Ghost Club", "Dünya Kulüpler Sıralaması", "Moderasyon", "Reklamlar"],
  "takedown.html": ["TAKEDOWN", "bildir", "hak"],
};

function fail(message) {
  failures.push(message);
}

function verifyPage(name, text) {
  for (const marker of required[name]) {
    if (!text.includes(marker)) fail(`${name} is missing ${marker}`);
  }
  for (const forbidden of ["assets/clubs", "patreon.com", "api.web3forms.com", "CONTACT_FORM_KEY"]) {
    if (text.includes(forbidden)) fail(`${name} contains ${forbidden}`);
  }
  if (!text.includes(MOBILE_SUPPORT_URL)) fail(`${name} does not return users to the dedicated support page`);
  if (text.includes('href="https://copa.life/"')) fail(`${name} still links users to the public home page`);
}

for (const name of Object.keys(required)) {
  const file = path.join(OUT, name);
  if (!fs.existsSync(file)) {
    fail(`missing legal artifact: ${name}`);
    continue;
  }
  verifyPage(name, fs.readFileSync(file, "utf8"));
}
if (!fs.existsSync(path.join(OUT, "index.html"))) fail("legal index.html is missing");
const headers = fs.existsSync(path.join(OUT, "_headers"))
  ? fs.readFileSync(path.join(OUT, "_headers"), "utf8")
  : "";
for (const marker of ["Content-Security-Policy", "X-Frame-Options: DENY", "Permissions-Policy", "form-action 'none'"]) {
  if (!headers.includes(marker)) fail(`legal security headers are missing ${marker}`);
}

for (const relative of ["docs/android-store-readiness.md", "store/android/play-console-declarations.md"]) {
  const text = fs.readFileSync(path.join(ROOT, relative), "utf8");
  if (/[a-f0-9]{8}\.copa-life-legal\.pages\.dev/i.test(text)) fail(`${relative} contains an ephemeral deployment URL`);
  if (!text.includes(`${REMOTE_BASE}/privacy.html`)) fail(`${relative} does not use the stable privacy URL`);
}

async function fetchWithRetry(url) {
  let lastError;
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      const response = await fetch(url, {
        headers: { "user-agent": "copa-life-legal-health/1" },
        signal: AbortSignal.timeout(12_000),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.text();
    } catch (error) {
      lastError = error;
      if (attempt < 5) await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
    }
  }
  throw lastError;
}

if (process.argv.includes("--remote")) {
  for (const name of Object.keys(required)) {
    try {
      verifyPage(name, await fetchWithRetry(`${REMOTE_BASE}/${name}`));
    } catch (error) {
      fail(`remote ${name} failed: ${error.message}`);
    }
  }
}

if (failures.length) {
  for (const failure of failures) console.error(`[legal] ${failure}`);
  process.exit(1);
}
console.log(`[legal] ${process.argv.includes("--remote") ? "local and remote" : "local"} privacy, terms, takedown and security-header checks passed`);
