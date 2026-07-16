import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const ROOT = path.resolve(import.meta.dirname, "..");
const read = file => fs.readFileSync(path.join(ROOT, file), "utf8");
const context = {};
vm.createContext(context);
vm.runInContext(`${read("src/data/players_japan.js")}\nthis.pool=POOL_JP;`, context);

const pool = context.pool;
const profileStore = JSON.parse(read("assets/data/copa/player_profiles.json"));
const jpProfiles = Object.entries(profileStore.records).filter(([key]) => key.startsWith("JP|"));
const byRole = Object.fromEntries(["GK", "DEF", "MID", "FWD"].map(role => [role, pool.filter(player => player[2] === role).length]));
const byClub = [...pool.reduce((map, player) => map.set(player[3], (map.get(player[3]) || 0) + 1), new Map())]
  .sort((a, b) => a[0].localeCompare(b[0]));
const powers = pool.map(player => player[1]);
const ages = pool.map(player => player[4]);
const identity = player => `${player[0]}|${player[3]}|${player[4]}`;
const duplicates = pool.filter((player, index) => pool.findIndex(candidate => identity(candidate) === identity(player)) !== index);
const distribution = Object.fromEntries([
  ["55-59", powers.filter(value => value < 60).length],
  ["60-69", powers.filter(value => value >= 60 && value < 70).length],
  ["70-79", powers.filter(value => value >= 70 && value < 80).length],
  ["80-89", powers.filter(value => value >= 80 && value < 90).length],
  ["90+", powers.filter(value => value >= 90).length],
]);

const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };
assert(pool.length === 561, `Oyuncu sayısı 561 değil: ${pool.length}`);
assert(byClub.length === 20, `Kulüp sayısı 20 değil: ${byClub.length}`);
assert(Object.values(byRole).every(Boolean), `Eksik mevki grubu: ${JSON.stringify(byRole)}`);
assert(Math.min(...ages) >= 15 && Math.max(...ages) <= 45, `Yaş aralığı geçersiz: ${Math.min(...ages)}-${Math.max(...ages)}`);
assert(Math.min(...powers) >= 55 && Math.max(...powers) <= 90, `Güç aralığı geçersiz: ${Math.min(...powers)}-${Math.max(...powers)}`);
assert(duplicates.length === 0, `Tekrarlanan kimlik sayısı: ${duplicates.length}`);
assert(jpProfiles.length === pool.length, `Profil kapsamı ${jpProfiles.length}/${pool.length}`);
assert(pool.every(player => player.length === 7), "7 alanlı tuple şemasına uymayan oyuncu var");
assert(pool.every(player => player[5] === 0 || player[5] === 1), "Yerli/milli bayrağı 0/1 olmayan oyuncu var");

const localFlagCount = pool.filter(player => player[5]).length;
console.log(JSON.stringify({
  status: failures.length ? "FAIL" : "PASS",
  snapshot: "copa.life independent player pool 2026-07-15",
  scope: "J1, 20 kulüp",
  players: pool.length,
  clubs: byClub.length,
  profiles: jpProfiles.length,
  roles: byRole,
  ageRange: [Math.min(...ages), Math.max(...ages)],
  powerRange: [Math.min(...powers), Math.max(...powers)],
  averagePower: Number((powers.reduce((sum, value) => sum + value, 0) / powers.length).toFixed(2)),
  powerDistribution: distribution,
  localFlagCount,
  localFlagCaveat: "Kaynak CSV milliyet içermiyor; tuple[5], Milli Takım alanının doluluğundan türetilmiş geçici oyun bayrağıdır ve Japon vatandaşlığı iddiası değildir.",
  topPlayers: [...pool].sort((a, b) => b[1] - a[1]).slice(0, 10).map(player => ({ name: player[0], power: player[1], club: player[3], role: player[2] })),
  clubCounts: Object.fromEntries(byClub),
  failures,
}, null, 2));

if (failures.length) process.exitCode = 1;
