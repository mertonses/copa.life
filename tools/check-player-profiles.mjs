import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const ROOT = path.resolve(import.meta.dirname, "..");
const PLAYER_SOURCES = {
  TR: ["src/data/players.js", "POOL"],
  ENG: ["src/data/players_england.js", "POOL_EN"],
  ES: ["src/data/players_spain.js", "POOL_ES"],
  IT: ["src/data/players_italy.js", "POOL_IT"],
  DE: ["src/data/players_germany.js", "POOL_DE"],
  JP: ["src/data/players_japan.js", "POOL_JP"],
};

function normalize(value) {
  return String(value || "")
    .toLocaleLowerCase("tr-TR")
    .replaceAll("ı", "i").replaceAll("ł", "l").replaceAll("ø", "o")
    .replaceAll("ð", "d").replaceAll("þ", "th").replaceAll("đ", "d")
    .replaceAll("æ", "ae").replaceAll("œ", "oe").replaceAll("ß", "ss")
    .normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
}

function loadPool(relativePath, variable, country) {
  const context = {};
  vm.createContext(context);
  vm.runInContext(`${fs.readFileSync(path.join(ROOT, relativePath), "utf8")}\nthis.__pool=${variable};`, context);
  return context.__pool.map(tuple => [country, normalize(tuple[0]), Number(tuple[4]) || 0, normalize(tuple[3])].join("|"));
}

const profileData = JSON.parse(fs.readFileSync(path.join(ROOT, "assets/data/fm26/player_profiles.json"), "utf8"));
const fields = profileData.fields;
const records = profileData.records;
if (!Array.isArray(fields) || fields.length !== 39) throw new Error(`Beklenen 39 profil alanı, bulunan: ${fields?.length}`);
if (!records || typeof records !== "object") throw new Error("PLAYER_PROFILES bulunamadı");

const validKeys = new Set(Object.entries(PLAYER_SOURCES).flatMap(([country, [file, variable]]) => loadPool(file, variable, country)));
const numericFields = new Set([
  "acceleration", "rushing_out", "passing", "bravery", "command_of_area", "agility", "handling",
  "aerial_reach", "crossing", "kicking", "tackling", "free_kicks", "dribbling", "natural_fitness",
  "decisions", "heading", "leadership", "strength", "pace", "off_the_ball", "flair", "aggression",
  "work_rate", "composure", "reflexes", "finishing", "one_on_ones", "penalties", "long_shots",
  "stamina", "injury_proneness",
]);

const counts = { TR: 0, ENG: 0, ES: 0, IT: 0, DE: 0, JP: 0 };
for (const [key, values] of Object.entries(records)) {
  if (!validKeys.has(key)) throw new Error(`Kopa havuzunda olmayan profil anahtarı: ${key}`);
  if (!Array.isArray(values) || values.length !== fields.length) throw new Error(`Eksik profil alanı: ${key}`);
  counts[key.split("|")[0]]++;
  fields.forEach((field, index) => {
    const value = values[index];
    if (!numericFields.has(field) || value === null) return;
    if (!Number.isFinite(value) || value < 1 || value > 20) throw new Error(`Geçersiz ${field}=${value}: ${key}`);
  });
}

if (Object.values(counts).some(count => count === 0)) throw new Error(`Bir veya daha fazla ülke profilsiz: ${JSON.stringify(counts)}`);

const indexHtml = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
const hubUi = fs.readFileSync(path.join(ROOT, "src/ui/hub.js"), "utf8");
const profileUi = fs.readFileSync(path.join(ROOT, "src/ui/playerProfiles.js"), "utf8");
const profileCss = fs.readFileSync(path.join(ROOT, "src/styles/playerProfiles.css"), "utf8");
for (const asset of ["src/ui/playerProfiles.js", "src/styles/playerProfiles.css"]) {
  if (!indexHtml.includes(asset)) throw new Error(`Profil arayüz varlığı index.html içinde yüklenmiyor: ${asset}`);
}
for (const marker of ["HOVER_OPEN_MS=320", "DOUBLE_TAP_MS=320", "keeperGroups", "normalizedCache", "setDragging", "aria-labelledby"]) {
  if (!profileUi.includes(marker)) throw new Error(`Profil etkileşimi eksik: ${marker}`);
}
for (const marker of ["PlayerProfiles.bind(b,o", "PlayerProfiles.bind(r,p)", "scout-node[data-profile-player-index]", "backup-card[data-profile-player-index]", "cap-card[data-profile-player-index]", "pc-pl[data-profile-player-index]", ".ss-scorer", "data-profile-event-index"]) {
  if (!indexHtml.includes(marker)) throw new Error(`Profil yüzeyi eksik: ${marker}`);
}
for (const marker of [".spot-card", "data-bench-idx", "PlayerProfiles.setDragging(true)"]) {
  if (!hubUi.includes(marker)) throw new Error(`Hub profil yüzeyi eksik: ${marker}`);
}
for (const marker of ["(hover:none)", "(pointer:coarse)", ".player-profile-stat-grid", ".player-profile-backdrop"]) {
  if (!profileCss.includes(marker)) throw new Error(`Profil responsive stili eksik: ${marker}`);
}
console.log(`Player profiles OK: ${Object.keys(records).length} kayıt (${Object.entries(counts).map(([country, count]) => `${country} ${count}`).join(", ")})`);
