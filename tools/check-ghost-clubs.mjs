import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const checks = [
  ["ghost client", "src/online/ghostClubs.js", ["recordCompletedRun", "findOpponent", "flushQueue", "beginRun", "matchChance", "schemaVersion"]],
  ["hub bridge", "src/ui/hub.js", ["_maybeGhostOpponent", "_applyGhostOpponent", "ghostMeta"]],
  ["match bridge", "src/sim/finalSim.js", ["_ghostProfile", "ghostTactics"]],
  ["page bootstrap", "index.html", ["src/online/ghostClubs.js", "copa-ghost-api", "GhostClubs.recordCompletedRun"]],
  ["service worker", "sw.js", ["/src/online/ghostClubs.js", "ghost1"]],
  ["worker api", "services/ghost-club-api/src/index.js", ["/v1/ghosts", "/v1/ghosts/match", "valid(snapshot)", "eligibleUntil"]],
  ["worker schema", "services/ghost-club-api/schema.sql", ["ghost_runs", "eligible_until", "game_version"]],
];

let failures = 0;
for (const [label, relative, needles] of checks) {
  const file = path.join(root, relative);
  if (!fs.existsSync(file)) {
    console.error(`[ghosts] missing ${label}: ${relative}`);
    failures += 1;
    continue;
  }
  const text = fs.readFileSync(file, "utf8");
  const missing = needles.filter((needle) => !text.includes(needle));
  if (missing.length) {
    console.error(`[ghosts] ${label} missing: ${missing.join(", ")}`);
    failures += 1;
  }
}

if (failures) process.exit(1);
console.log("[ghosts] client, matchmaking bridge, worker API, and schema checks passed.");
