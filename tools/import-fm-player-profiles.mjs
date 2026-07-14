import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const ROOT = path.resolve(import.meta.dirname, "..");
const DEFAULT_INPUT_DIR = path.join(
  process.env.USERPROFILE || "",
  "OneDrive",
  "Belgeler",
  "Sports Interactive",
  "Football Manager 26",
  "FM26PlayerExport by vinteset",
  "Exports CSV",
);
const DEFAULT_PROFILE_OUTPUT = path.join(ROOT, "assets/data/fm26/player_profiles.json");
const DEFAULT_REPORT_DIR = path.join(ROOT, "outputs/fm-profile-import");
const DEFAULT_RESERVE_MANIFEST = path.join(ROOT, "tools/fm-profile-reserve-sources.json");
const SOURCES = {
  TR: ["src/data/players.js", "POOL"],
  ENG: ["src/data/players_england.js", "POOL_EN"],
  ES: ["src/data/players_spain.js", "POOL_ES"],
  IT: ["src/data/players_italy.js", "POOL_IT"],
  DE: ["src/data/players_germany.js", "POOL_DE"],
  JP: ["src/data/players_japan.js", "POOL_JP"],
};

const argv = new Map(
  process.argv.slice(2).map(arg => {
    const split = arg.indexOf("=");
    return split === -1 ? [arg, true] : [arg.slice(0, split), arg.slice(split + 1)];
  }),
);
const inputDir = path.resolve(String(argv.get("--input-dir") || DEFAULT_INPUT_DIR));
const reserveManifest = path.resolve(String(argv.get("--reserve-manifest") || DEFAULT_RESERVE_MANIFEST));
const reserveConfig = fs.existsSync(reserveManifest) ? JSON.parse(fs.readFileSync(reserveManifest, "utf8")) : { files: [] };
const reservedBasenames = new Set((reserveConfig.files || []).map(file => path.basename(String(file))));
const inputFiles = argv.has("--input")
  ? String(argv.get("--input")).split(",").map(file => path.resolve(file.trim())).filter(Boolean)
  : fs.readdirSync(inputDir)
    .filter(file => file.toLocaleLowerCase("tr-TR").endsWith(".csv") && !reservedBasenames.has(file))
    .sort()
    .map(file => path.join(inputDir, file));
if (!inputFiles.length) throw new Error(`CSV bulunamadı: ${inputDir}`);
const profileOutput = path.resolve(String(argv.get("--profile-output") || DEFAULT_PROFILE_OUTPUT));
const reportDir = path.resolve(String(argv.get("--report-dir") || DEFAULT_REPORT_DIR));
const writeProfiles = argv.has("--write");

const FIELD_MAP = [
  ["Tarz", "style"],
  ["Hızlanma", "acceleration"],
  ["Ani Çıkış Eğilimi", "rushing_out"],
  ["Pas", "passing"],
  ["Cesaret", "bravery"],
  ["Bölge Hakimiyeti", "command_of_area"],
  ["Eksiler", "cons"],
  ["Çeviklik", "agility"],
  ["Elle Kontrol", "handling"],
  ["Hava Topları", "aerial_reach"],
  ["Dİ", "di"],
  ["Orta Yapma", "crossing"],
  ["Degaj", "kicking"],
  ["Top Kapma", "tackling"],
  ["Serbest Vuruş Kullanma", "free_kicks"],
  ["Dripling", "dribbling"],
  ["Vücut Zindeliği", "natural_fitness"],
  ["Karar Alma", "decisions"],
  ["Kafa Vuruşu", "heading"],
  ["Liderlik", "leadership"],
  ["Güç", "strength"],
  ["Hız", "pace"],
  ["Topsuz Alan", "off_the_ball"],
  ["Özel Yetenek", "flair"],
  ["Agresiflik", "aggression"],
  ["Çalışkanlık", "work_rate"],
  ["Soğukkanlılık", "composure"],
  ["Refleksler", "reflexes"],
  ["Bitiricilik", "finishing"],
  ["Birebir", "one_on_ones"],
  ["Penaltı Kullanma", "penalties"],
  ["Uzaktan Şut", "long_shots"],
  ["Dayanıklılık", "stamina"],
  ["Sakatlanma Eğilimi", "injury_proneness"],
  ["Milli Takım", "national_team"],
  ["İki. Pozisyon", "secondary_position"],
  ["Kullandığı Ayak", "preferred_foot"],
  ["En Verimli Mevki", "best_position"],
  ["Mevki", "positions"],
];
const NUMERIC_FIELDS = new Set([
  "acceleration", "rushing_out", "passing", "bravery", "command_of_area", "agility",
  "handling", "aerial_reach", "di", "crossing", "kicking", "tackling", "free_kicks",
  "dribbling", "natural_fitness", "decisions", "heading", "leadership", "strength",
  "pace", "off_the_ball", "flair", "aggression", "work_rate", "composure", "reflexes",
  "finishing", "one_on_ones", "penalties", "long_shots", "stamina", "injury_proneness",
]);

function loadPool(relativePath, variable, country) {
  const context = {};
  vm.createContext(context);
  vm.runInContext(`${fs.readFileSync(path.join(ROOT, relativePath), "utf8")}\nthis.__pool=${variable};`, context);
  return context.__pool.map((tuple, index) => ({
    id: `${country}:${index}`,
    country,
    name: String(tuple[0] || ""),
    overall: Number(tuple[1]) || 0,
    role: String(tuple[2] || ""),
    club: String(tuple[3] || ""),
    age: Number(tuple[4]) || 0,
  }));
}

function parseDelimited(text, delimiter = ";") {
  const rows = [];
  let row = [], cell = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === delimiter) { row.push(cell); cell = ""; }
    else if (ch === "\n") {
      row.push(cell.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      cell = "";
    } else cell += ch;
  }
  if (cell.length || row.length) { row.push(cell.replace(/\r$/, "")); rows.push(row); }
  const headers = rows.shift() || [];
  return rows.filter(r => r.some(Boolean)).map((values, index) => {
    const out = { __row: index + 2 };
    headers.forEach((header, i) => { out[header] = values[i] ?? ""; });
    return out;
  });
}

function normalize(value) {
  return String(value || "")
    .toLocaleLowerCase("tr-TR")
    .replaceAll("ı", "i")
    .replaceAll("ł", "l")
    .replaceAll("ø", "o")
    .replaceAll("ð", "d")
    .replaceAll("þ", "th")
    .replaceAll("đ", "d")
    .replaceAll("æ", "ae")
    .replaceAll("œ", "oe")
    .replaceAll("ß", "ss")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

const CLUB_STOP_WORDS = new Set(["fc", "cf", "afc", "sc", "ac", "f c", "football", "club", "calcio"]);
function clubTokens(value) {
  return normalize(value).split(" ").filter(token => token && !CLUB_STOP_WORDS.has(token));
}
function clubSimilarity(a, b) {
  const na = normalize(a), nb = normalize(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  if (na.includes(nb) || nb.includes(na)) return 0.85;
  const aa = new Set(clubTokens(a)), bb = new Set(clubTokens(b));
  const intersection = [...aa].filter(token => bb.has(token)).length;
  const union = new Set([...aa, ...bb]).size || 1;
  return intersection / union;
}

function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  const curr = new Array(b.length + 1);
  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    for (let j = 0; j <= b.length; j++) prev[j] = curr[j];
  }
  return prev[b.length];
}
function nameSimilarity(a, b) {
  const na = normalize(a), nb = normalize(b);
  return 1 - levenshtein(na, nb) / Math.max(1, na.length, nb.length);
}

function sourceRole(row) {
  const pos = String(row["En Verimli Mevki"] || row.Mevki || "").toLocaleUpperCase("tr-TR");
  if (/\bKL\b/.test(pos)) return "GK";
  if (/\bSTP\b|\bKB\b|\bD\s*\(/.test(pos)) return "DEF";
  if (/\bST\b|\bOOS\b/.test(pos)) return "FWD";
  return pos ? "MID" : "";
}

function profileValues(row) {
  return FIELD_MAP.map(([header, field]) => {
    const value = row[header] ?? "";
    if (!NUMERIC_FIELDS.has(field)) return value;
    if (value === "") return null;
    const numeric = Number(String(value).replace(",", "."));
    return Number.isFinite(numeric) ? numeric : null;
  });
}

function csvCell(value) {
  const text = String(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}
function writeCsv(file, headers, rows) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const lines = [headers, ...rows.map(row => headers.map(header => row[header] ?? ""))];
  fs.writeFileSync(file, `${lines.map(row => row.map(csvCell).join(",")).join("\n")}\n`, "utf8");
}

const pool = Object.entries(SOURCES).flatMap(([country, [file, variable]]) => loadPool(file, variable, country));
const rawSourceRows = inputFiles.flatMap(file => parseDelimited(fs.readFileSync(file, "utf8")).map(row => ({
  ...row,
  __file: path.basename(file),
})));
const deduplicated = new Map();
for (const row of rawSourceRows) {
  const identity = [normalize(row.Oyuncu), Number(row["Yaş"]) || 0, normalize(row["Kulüp"])].join("|");
  deduplicated.set(identity, row);
}
const sourceRows = [...deduplicated.values()];
const byName = new Map();
for (const player of pool) {
  const key = normalize(player.name);
  if (!byName.has(key)) byName.set(key, []);
  byName.get(key).push(player);
}

const usedTargetIds = new Set();
const matches = [];
const sourceUnmatched = [];

function chooseExact(row) {
  const name = row.Oyuncu || "";
  const age = Number(row["Yaş"]) || 0;
  const club = row["Kulüp"] || "";
  const role = sourceRole(row);
  const candidates = (byName.get(normalize(name)) || []).filter(player => !usedTargetIds.has(player.id));
  const scored = candidates.map(player => {
    const ageDelta = Math.abs(player.age - age);
    const clubScore = clubSimilarity(player.club, club);
    let score = 70;
    score += ageDelta === 0 ? 18 : ageDelta === 1 ? 12 : ageDelta === 2 ? 4 : -12;
    score += clubScore === 1 ? 12 : clubScore >= 0.8 ? 10 : clubScore >= 0.4 ? 6 : 0;
    if (role && role === player.role) score += 4;
    return { player, score, ageDelta, clubScore };
  }).sort((a, b) => b.score - a.score);
  if (!scored.length) return null;
  const best = scored[0], next = scored[1];
  const fullName = normalize(name).includes(" ");
  const identityEvidence = best.clubScore >= 0.4 || (fullName && role && role === best.player.role);
  const safe = best.ageDelta <= 2 && identityEvidence && (!next || best.score - next.score >= 4 || best.clubScore > next.clubScore);
  if (!safe) return null;
  return { ...best, method: best.clubScore >= 0.8 && best.ageDelta <= 1 ? "exact_name_age_club" : "exact_name" };
}

function chooseFuzzy(row) {
  const name = row.Oyuncu || "";
  const age = Number(row["Yaş"]) || 0;
  const club = row["Kulüp"] || "";
  const role = sourceRole(row);
  const normalized = normalize(name);
  const surname = normalized.split(" ").at(-1) || "";
  const candidates = pool.filter(player => {
    if (usedTargetIds.has(player.id) || Math.abs(player.age - age) > 1) return false;
    const target = normalize(player.name);
    return target.split(" ").at(-1) === surname || clubSimilarity(player.club, club) >= 0.8;
  });
  const scored = candidates.map(player => {
    const similarity = nameSimilarity(player.name, name);
    const clubScore = clubSimilarity(player.club, club);
    const ageDelta = Math.abs(player.age - age);
    let score = similarity * 80 + (ageDelta === 0 ? 10 : 6) + clubScore * 10 + (role && role === player.role ? 3 : 0);
    return { player, score, ageDelta, clubScore, similarity };
  }).sort((a, b) => b.score - a.score);
  if (!scored.length) return null;
  const best = scored[0], next = scored[1];
  if (best.similarity < 0.92 || (best.clubScore < 0.4 && best.similarity < 0.97)) return null;
  if (next && best.score - next.score < 4) return null;
  return { ...best, method: "fuzzy_name" };
}

for (const row of sourceRows) {
  const hasExactNameCandidate = (byName.get(normalize(row.Oyuncu || "")) || []).some(player => !usedTargetIds.has(player.id));
  const picked = chooseExact(row) || (!hasExactNameCandidate ? chooseFuzzy(row) : null);
  if (!picked) {
    sourceUnmatched.push({
      source_file: row.__file,
      source_row: row.__row,
      source_name: row.Oyuncu || "",
      source_club: row["Kulüp"] || "",
      source_age: Number(row["Yaş"]) || "",
      source_best_position: row["En Verimli Mevki"] || "",
      reason: "no_safe_match",
    });
    continue;
  }
  usedTargetIds.add(picked.player.id);
  matches.push({
    ...picked,
    source: row,
    profile: profileValues(row),
  });
}

// Kopa lig havuzları farklı sezon görüntülerinden geldiği için aynı gerçek
// oyuncu eski ve yeni kulübüyle birden fazla ülkede bulunabilir. Tam ad, yaş
// ve rol uyuyorsa tek FM profilini bu güvenli kopyalara da bağla.
const propagatedMatches = [];
for (const match of matches) {
  const normalizedName = normalize(match.source.Oyuncu || "");
  if (!normalizedName.includes(" ")) continue;
  const age = Number(match.source["Yaş"]) || 0;
  const role = sourceRole(match.source);
  for (const player of byName.get(normalizedName) || []) {
    if (usedTargetIds.has(player.id) || Math.abs(player.age - age) > 2 || !role || player.role !== role) continue;
    usedTargetIds.add(player.id);
    propagatedMatches.push({
      player,
      source: match.source,
      profile: match.profile,
      method: "exact_name_propagated",
      score: 80,
      ageDelta: Math.abs(player.age - age),
      clubScore: clubSimilarity(player.club, match.source["Kulüp"] || ""),
    });
  }
}
matches.push(...propagatedMatches);

const matchByTarget = new Map(matches.map(match => [match.player.id, match]));
const kopaMissing = pool.filter(player => !matchByTarget.has(player.id));
const importantMissing = kopaMissing.filter(player => player.overall >= 80).sort((a, b) => b.overall - a.overall || a.name.localeCompare(b.name));
const eliteMissing = importantMissing.filter(player => player.overall >= 90);
const countrySummary = Object.keys(SOURCES).map(country => {
  const total = pool.filter(player => player.country === country).length;
  const matched = matches.filter(match => match.player.country === country).length;
  const important = importantMissing.filter(player => player.country === country).length;
  const elite = eliteMissing.filter(player => player.country === country).length;
  return { country, total, matched, unmatched: total - matched, coverage_pct: Math.round(matched / total * 1000) / 10, important_missing_80_plus: important, elite_missing_90_plus: elite };
});
const methodCounts = Object.groupBy ? Object.groupBy(matches, match => match.method) : matches.reduce((out, match) => ((out[match.method] ||= []).push(match), out), {});

const summary = {
  generated_at: new Date().toISOString(),
  source_file: inputFiles.join("; "),
  source_files: inputFiles,
  reserved_source_files: [...reservedBasenames],
  source_rows_raw: rawSourceRows.length,
  source_duplicates_removed: rawSourceRows.length - sourceRows.length,
  source_rows: sourceRows.length,
  kopa_players: pool.length,
  matched_profiles: matches.length,
  source_unmatched: sourceUnmatched.length,
  kopa_unmatched: kopaMissing.length,
  coverage_pct: Math.round(matches.length / pool.length * 1000) / 10,
  source_match_rate_pct: Math.round((sourceRows.length - sourceUnmatched.length) / sourceRows.length * 1000) / 10,
  important_missing_80_plus: importantMissing.length,
  elite_missing_90_plus: eliteMissing.length,
  methods: Object.fromEntries(Object.entries(methodCounts).map(([method, rows]) => [method, rows.length])),
  countries: countrySummary,
};

fs.mkdirSync(reportDir, { recursive: true });
fs.writeFileSync(path.join(reportDir, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf8");
writeCsv(path.join(reportDir, "matches.csv"), [
  "country", "kopa_name", "kopa_club", "kopa_age", "kopa_overall", "kopa_role",
  "source_file", "source_name", "source_club", "source_age", "match_method", "match_score", "club_similarity",
  "age_delta", "season_snapshot_note",
], matches.map(match => ({
  country: match.player.country,
  kopa_name: match.player.name,
  kopa_club: match.player.club,
  kopa_age: match.player.age,
  kopa_overall: match.player.overall,
  kopa_role: match.player.role,
  source_file: match.source.__file,
  source_name: match.source.Oyuncu,
  source_club: match.source["Kulüp"],
  source_age: match.source["Yaş"],
  match_method: match.method,
  match_score: Math.round(match.score * 10) / 10,
  club_similarity: Math.round(match.clubScore * 100),
  age_delta: match.ageDelta,
  season_snapshot_note: match.ageDelta > 2 || match.clubScore < 0.4 ? "name_exact_snapshot_diff" : "",
})));
writeCsv(path.join(reportDir, "source-unmatched.csv"), Object.keys(sourceUnmatched[0] || { reason: "" }), sourceUnmatched);
writeCsv(path.join(reportDir, "kopa-important-missing.csv"), ["country", "name", "club", "age", "role", "overall"], importantMissing);
writeCsv(path.join(reportDir, "kopa-all-missing.csv"), ["country", "name", "club", "age", "role", "overall"], kopaMissing);

if (writeProfiles) {
  const fields = FIELD_MAP.map(([, field]) => field);
  const labels = Object.fromEntries(FIELD_MAP.map(([label, field]) => [field, label]));
  const records = Object.fromEntries(matches.map(match => {
    const player = match.player;
    const key = [player.country, normalize(player.name), player.age, normalize(player.club)].join("|");
    return [key, match.profile];
  }));
  const generated = JSON.stringify({
    source: "FM26",
    generated_at: summary.generated_at,
    source_files: inputFiles.map(file => path.basename(file)),
    fields,
    labels_tr: labels,
    records,
  });
  fs.mkdirSync(path.dirname(profileOutput), { recursive: true });
  fs.writeFileSync(profileOutput, `${generated}\n`, "utf8");
}

console.log(JSON.stringify({ ...summary, wrote_profiles: writeProfiles, profile_output: writeProfiles ? profileOutput : null, report_dir: reportDir }, null, 2));
