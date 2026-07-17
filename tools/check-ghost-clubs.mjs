import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const checks = [
  ["ghost client", "src/online/ghostClubs.js", ["consentVersion", "hasConsent", "requestConsent", "deleteMyData", "reportGhost", "blockGhost", "blockedIds", "recordCompletedRun", "findOpponent", "flushReportQueue", "clearLocalGhostData"]],
  ["hub bridge", "src/ui/hub.js", ["_maybeGhostOpponent", "_applyGhostOpponent", "ghostMeta", "ghost-report-btn", "reportGhost"]],
  ["match bridge", "src/sim/finalSim.js", ["_ghostProfile", "ghostTactics"]],
  ["page bootstrap", "index.html", ["src/online/ghostClubs.js", "copa-ghost-api", "GhostClubs.recordCompletedRun"]],
  ["privacy policy", "privacy.html", ["45 gün", "90 gün", "Verilerimi sil"]],
  ["terms", "terms.html", ["Ghost Club", "bildir"]],
  ["takedown channel", "takedown.html", ["TAKEDOWN", "bildir"]],
  ["worker api", "services/ghost-club-api/src/index.js", ["CONSENT_VERSION", "/v1/ghosts/match", "/report", "/v1/me/ghosts", "purgeExpired"]],
  ["worker schema", "services/ghost-club-api/schema.sql", ["ghost_runs", "status TEXT", "owner_hash", "ghost_reports", "ghost_clients"]],
  ["worker production config", "services/ghost-club-api/wrangler.jsonc", ["observability", "GHOST_WRITE_LIMITER", "GHOST_READ_LIMITER", "ALLOWED_ORIGINS", "17 3 * * *"]],
  ["moderation migration", "services/ghost-club-api/migrations/0002_consent_moderation_retention.sql", ["owner_hash", "consent_version", "ghost_reports", "ghost_clients"]],
  ["worker tests", "services/ghost-club-api/test/worker.spec.js", ["explicit consent", "reports hide a Ghost", "deletes all rows owned", "physically purges"]],
];

let failures = 0;
for (const [label, relative, needles] of checks) {
  const file = path.join(root, relative);
  if (!fs.existsSync(file)) {
    console.error(`[ghosts] missing ${label}: ${relative}`);
    failures += 1;
    continue;
  }
  const source = fs.readFileSync(file, "utf8");
  const missing = needles.filter(needle => !source.includes(needle));
  if (missing.length) {
    console.error(`[ghosts] ${label} missing: ${missing.join(", ")}`);
    failures += 1;
  }
}
if (failures) process.exit(1);

const workerSource = fs.readFileSync(path.join(root, "services/ghost-club-api/src/index.js"), "utf8");
const ghostInsert = workerSource.match(/INSERT INTO ghost_runs[^\n]+/);
assert.ok(ghostInsert, "ghost insert statement must exist");
assert.equal(ghostInsert[0].includes("ON CONFLICT"), false, "client-provided IDs must never overwrite a ghost row");
for (const required of ["cf-connecting-ip", "crypto.randomUUID", "readJsonLimited", "crypto.subtle.digest", "status='eligible'", "DELETE FROM ghost_runs"]) {
  assert.equal(workerSource.includes(required), true, `worker hardening primitive missing: ${required}`);
}

const storage = new Map();
let fetchCount = 0;
const snapshot = {
  schema_version: 1, game_version: "2026.07.13", data_version: "2026.07.15-copa1",
  public_ghost_id: "G-TEST1234", squad_power: 74, chemistry: 2, formation: "4-3-3", reached_round: 3,
  club: { name: "Tokyo Athletic", country: "JP" }, chairman: { id: "babacan" }, active_cards: [],
  starting_xi: Array.from({ length: 11 }, (_, index) => ({ name: `Player ${index + 1}`, pos: index ? "OS" : "KL", power: 72 + index % 4 })),
};
const math = Object.create(Math); math.random = () => 0;
const sandbox = {
  console, Math: math, Date, JSON, URLSearchParams,
  localStorage: {
    getItem: key => storage.has(key) ? storage.get(key) : null,
    setItem: (key, value) => storage.set(key, String(value)),
    removeItem: key => storage.delete(key),
  },
  navigator: { onLine: true },
  document: {
    querySelector: selector => selector === "meta[name='copa-ghost-api']" ? { content: "https://ghost.test" } : null,
    getElementById: () => null,
  },
  fetch: async () => { fetchCount++; return { ok: true, json: async () => ({ ghost: snapshot }) }; },
  setTimeout: () => 0,
  addEventListener: () => {},
};
sandbox.window = sandbox; sandbox.globalThis = sandbox; sandbox.LANG = "en";
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(root, "src/core/clubName.js"), "utf8"), sandbox);
vm.runInContext(fs.readFileSync(path.join(root, "src/online/ghostClubs.js"), "utf8"), sandbox);

const ghosts = sandbox.GhostClubs;
assert.equal(ghosts.enabled(), false, "Ghost Club sharing must be off by default");
ghosts.beginRun({ seed: 1, clubName: "No Consent FC", country: "TR", cheatRun: false });
assert.equal(ghosts.recordCompletedRun({ seed: 1, teamName: "No Consent FC", run: { power: 70, round: 2 } }), null, "no run may be queued without explicit consent");
assert.equal(storage.has("copa_ghost_upload_queue_v1"), false, "default-off mode must not create an upload queue");

storage.set("copa_ghost_consent_v1", JSON.stringify({ version: "ghost-terms-v1", terms: true, sharing: true, accepted_at: new Date().toISOString() }));
storage.set("copa_ghost_clubs_enabled", "1");
assert.equal(ghosts.enabled(), true, "versioned explicit consent should enable Ghost Clubs");

ghosts.beginRun({ seed: 42, clubName: "Test United", country: "ENG", cheatRun: false });
const [first, simultaneous] = await Promise.all([
  ghosts.findOpponent({ round: 3, power: 74 }),
  ghosts.findOpponent({ round: 3, power: 74 }),
]);
assert.equal(first?.ghostId, "G-TEST1234");
assert.equal(simultaneous, null, "a concurrent second lookup must be gated");
assert.equal(fetchCount, 1);
assert.equal(ghosts.markOpponentUsed(first.ghostId), true);
assert.equal(await ghosts.findOpponent({ round: 4, power: 76 }), null, "a second ghost in the same run must be rejected");
assert.equal(fetchCount, 1);

storage.delete("copa_ghost_upload_queue_v1");
ghosts.beginRun({ seed: 99, clubName: "Cheat Athletic", country: "TR", cheatRun: true });
assert.equal(ghosts.recordCompletedRun({ seed: 99, teamName: "Cheat Athletic", cheatRun: false }), null, "cheat provenance must be sticky");
assert.deepEqual(JSON.parse(storage.get("copa_ghost_upload_queue_v1") || "[]"), []);

storage.delete("copa_ghost_upload_queue_v1");
ghosts.beginRun({ seed: 100, clubName: "Event Athletic", country: "JP", cheatRun: false });
const squad = Array.from({ length: 11 }, (_, index) => ({ name: `Event Player ${index + 1}`, pos: index ? "OS" : "KL", ov: 70 + index % 4 }));
assert.ok(ghosts.recordCompletedRun({
  seed: 100, teamName: "Event Athletic", selectedCountry: "JP", picksBySlot: squad,
  run: { power: 74, round: 3 }, lastMatchEvents: [{ m: 56, home: true, name: "Silva", type: "goal" }], finalPenalty: 2,
}));
const queued = JSON.parse(storage.get("copa_ghost_upload_queue_v1") || "[]");
assert.equal(queued.length, 1);
assert.deepEqual(queued[0].final_profile.events, [{ minute: 56, side: "home", type: "goal", name: "Silva" }]);

assert.equal(ghosts.blockGhost("G-BLOCK123"), true);
assert.deepEqual(ghosts.blockedIds(), ["G-BLOCK123"]);
storage.delete("copa_ghost_report_queue_v1");
sandbox.navigator.onLine = false;
const offlineReport = await ghosts.reportGhost("G-OFFLINE12", "impersonation");
assert.deepEqual(JSON.parse(JSON.stringify(offlineReport)), { ok: true, hidden: true, pending: true, sent: 0 });
assert.equal(JSON.parse(storage.get("copa_ghost_report_queue_v1") || "[]").length, 1, "offline reports must be queued");
sandbox.navigator.onLine = true;
assert.deepEqual(JSON.parse(JSON.stringify(await ghosts.flushReports())), { sent: 1, pending: 0 });
assert.deepEqual(JSON.parse(storage.get("copa_ghost_report_queue_v1") || "[]"), [], "queued reports must flush online");

storage.set("copa_ghost_client_id_v1", "GCL-DELETECLIENT");
storage.set("copa_ghost_delete_token_v1", "GDT-DELETE1234567890");
sandbox.fetch = async (_url, options) => options?.method === "DELETE"
  ? { ok: true, json: async () => ({ ok: true, deleted: 1 }) }
  : { ok: true, json: async () => ({ ghost: snapshot }) };
assert.deepEqual(JSON.parse(JSON.stringify(await ghosts.deleteMyData())), { ok: true, deleted: 1 });
for (const key of ["copa_ghost_consent_v1", "copa_ghost_client_id_v1", "copa_ghost_delete_token_v1", "copa_ghost_current_run_v1"]) {
  assert.equal(storage.has(key), false, `successful deletion must clear local ${key}`);
}
assert.deepEqual(ghosts.blockedIds(), ["G-BLOCK123", "G-OFFLINE12"], "data deletion must preserve the never-show-again block list");
ghosts.withdrawConsent();
assert.equal(ghosts.enabled(), false);
assert.deepEqual(JSON.parse(storage.get("copa_ghost_upload_queue_v1") || "[]"), [], "withdrawing consent must clear queued uploads");

console.log("[ghosts] default-off consent, retention/deletion/reporting, one-opponent gate, cheat exclusion, and structured snapshots passed.");
