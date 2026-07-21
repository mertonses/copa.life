import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const checks = [
  ["ghost client", "src/online/ghostClubs.js", ["consentVersion", "leaderboardConsentVersion", "hasConsent", "hasLeaderboardConsent", "sharingEnabled", "leaderboardEnabled", "requestConsent", "requestLeaderboardConsent", "deleteMyData", "deleteLeaderboardData", "recordLeaderboardRun", "renderLeaderboard", "reportGhost", "blockGhost", "blockedIds", "recordCompletedRun", "findOpponent", "flushReportQueue", "clearLocalGhostData"]],
  ["hub bridge", "src/ui/hub.js", ["_lockGhostOpponent", "_applyGhostOpponent", "_ghostHubContextActive", "phase===\"hub\"", "ghostCheckedRounds", "ghostMeta", "ghost-report-btn", "reportGhost"]],
  ["match bridge", "src/sim/finalSim.js", ["_ghostProfile", "ghostTactics"]],
  ["page bootstrap", "index.html", ["src/online/ghostClubs.js", "copa-ghost-api", "GhostClubs.recordCompletedRun"]],
  ["privacy policy", "privacy.html", ["45 gün", "90 gün", "Çevrimiçi verilerimi sil", "leaderboard-terms-v1"]],
  ["terms", "terms.html", ["Ghost Club", "Dünya Kulüpler Sıralaması", "bildir"]],
  ["takedown channel", "takedown.html", ["TAKEDOWN", "bildir"]],
  ["worker api", "services/ghost-club-api/src/index.js", ["CONSENT_VERSION", "LEADERBOARD_CONSENT_VERSION", "/v1/ghosts/match", "/v1/leaderboard/runs", "/v1/me/leaderboard", "/report", "/v1/me/ghosts", "purgeExpired"]],
  ["worker schema", "services/ghost-club-api/schema.sql", ["ghost_runs", "status TEXT", "owner_hash", "ghost_reports", "ghost_clients", "club_profiles", "career_runs"]],
  ["worker production config", "services/ghost-club-api/wrangler.jsonc", ["observability", "GHOST_WRITE_LIMITER", "GHOST_READ_LIMITER", "GHOST_REPORT_LIMITER", "ALLOWED_ORIGINS", "17 3 * * *"]],
  ["moderation migration", "services/ghost-club-api/migrations/0002_consent_moderation_retention.sql", ["owner_hash", "consent_version", "ghost_reports", "ghost_clients"]],
  ["leaderboard migration", "services/ghost-club-api/migrations/0003_club_leaderboard.sql", ["club_profiles", "career_runs", "season_score"]],
  ["worker tests", "services/ghost-club-api/test/worker.spec.js", ["explicit consent", "scores career runs on the server", "semantically forged squads", "deduplicates spoofed reports", "deletes all rows owned", "physically purges"]],
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
  simulation_version: "copa-final-core-v3", card_schema_version: "2026.07",
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
assert.equal(ghosts.enabled(), true, "Ghost opponents must be on by default on the web");
assert.equal(ghosts.sharingEnabled(), false, "Ghost sharing must stay off without explicit consent");
assert.equal(ghosts.leaderboardEnabled(), false, "World ranking must stay off without its own explicit consent");
ghosts.beginRun({ seed: 3, clubName: "No Consent FC", country: "TR", cheatRun: false });
assert.equal(ghosts.recordCompletedRun({ seed: 3, teamName: "No Consent FC", run: { power: 70, round: 2 } }), null, "no run may be queued without explicit consent");
assert.equal(storage.has("copa_ghost_upload_queue_v1"), false, "default-on matching must not create an upload queue");
const anonymousMatch = await ghosts.findOpponent({ round: 3, power: 74, seed: 3 });
assert.equal(anonymousMatch?.ghostId, "G-TEST1234", "web matching should work without sharing consent");
assert.equal(storage.has("copa_ghost_client_id_v1"), false, "read-only matching must not create an installation ID");
assert.equal(fetchCount, 1);
storage.delete("copa_ghost_current_run_v1");
storage.delete("copa_ghost_clubs_enabled");
sandbox.COPA_IS_NATIVE = true;
assert.equal(ghosts.enabled(), false, "native Ghost matching must stay off by default");
sandbox.COPA_IS_NATIVE = false;

storage.set("copa_ghost_consent_v1", JSON.stringify({ version: "ghost-terms-v1", terms: true, sharing: true, accepted_at: new Date().toISOString() }));
storage.set("copa_ghost_sharing_enabled", "1");
assert.equal(ghosts.sharingEnabled(), true, "versioned explicit consent should enable Ghost sharing");

ghosts.beginRun({ seed: 7, clubName: "Test United", country: "ENG", cheatRun: false });
const [first, simultaneous] = await Promise.all([
  ghosts.findOpponent({ round: 3, power: 74, seed: 7 }),
  ghosts.findOpponent({ round: 3, power: 74, seed: 7 }),
]);
assert.equal(first?.ghostId, "G-TEST1234");
assert.equal(simultaneous, null, "a concurrent second lookup must be gated");
assert.equal(fetchCount, 2);
assert.equal(ghosts.markOpponentUsed(first.ghostId), true);
assert.equal(await ghosts.findOpponent({ round: 4, power: 76 }), null, "a second ghost in the same run must be rejected");
assert.equal(fetchCount, 2);

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

storage.set("copa_leaderboard_consent_v1",JSON.stringify({version:"leaderboard-terms-v1",terms:true,public_profile:true,accepted_at:new Date().toISOString()}));
storage.set("copa_leaderboard_enabled","1");
assert.equal(ghosts.leaderboardEnabled(),true,"versioned ranking consent must enable leaderboard submission independently of Ghost sharing");
ghosts.beginRun({seed:101,clubName:"Ranked Athletic",country:"TR",cheatRun:false});
assert.equal(ghosts.recordLeaderboardRun({
  seed:101,teamName:"Ranked Athletic",selectedCountry:"TR",
  fixtures:Array.from({length:6},(_,index)=>({opp:`Cup ${index+1}`,res:index<3?"W":index===3?"L":null,gf:index<3?2:index===3?1:null,ga:index<3?0:index===3?2:null})),
  run:{won:false,round:4,score:"",endType:""}
}),true);
const rankingQueue=JSON.parse(storage.get("copa_leaderboard_queue_v1")||"[]");
assert.equal(rankingQueue.length,1);assert.equal(rankingQueue[0].club.name,"Ranked Athletic");
assert.equal("seed" in rankingQueue[0],false,"ranking payload must not include the run seed");
assert.equal("players" in rankingQueue[0],false,"ranking payload must not include player identities");

storage.set("copa_ghost_client_id_v1", "GCL-DELETECLIENT");
storage.set("copa_ghost_delete_token_v1", "GDT-DELETE1234567890");
sandbox.fetch = async (_url, options) => options?.method === "DELETE"
  ? { ok: true, json: async () => ({ ok: true, deleted: 1 }) }
  : { ok: true, json: async () => ({ ghost: snapshot }) };
assert.deepEqual(JSON.parse(JSON.stringify(await ghosts.deleteMyData())), { ok: true, deleted: 1 });
for (const key of ["copa_ghost_sharing_enabled", "copa_ghost_consent_v1", "copa_leaderboard_enabled", "copa_leaderboard_consent_v1", "copa_leaderboard_queue_v1", "copa_ghost_client_id_v1", "copa_ghost_delete_token_v1", "copa_ghost_current_run_v1"]) {
  assert.equal(storage.has(key), false, `successful deletion must clear local ${key}`);
}
assert.deepEqual(ghosts.blockedIds(), ["G-BLOCK123", "G-OFFLINE12"], "data deletion must preserve the never-show-again block list");
ghosts.withdrawConsent();
assert.equal(ghosts.enabled(), true, "withdrawing sharing consent must not disable read-only web opponents");
assert.equal(ghosts.sharingEnabled(), false);
assert.deepEqual(JSON.parse(storage.get("copa_ghost_upload_queue_v1") || "[]"), [], "withdrawing consent must clear queued uploads");

console.log("[ghosts] Ghost matching/sharing and separately consented World ranking passed client, privacy, deletion, retention and Worker coverage.");
