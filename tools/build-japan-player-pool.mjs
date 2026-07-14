import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const DEFAULT_INPUT = path.join(
  process.env.USERPROFILE || "",
  "OneDrive", "Belgeler", "Sports Interactive", "Football Manager 26",
  "FM26PlayerExport by vinteset", "Exports CSV", "moneyball_export_20260714_163217.csv",
);
const inputArg = process.argv.find(arg => arg.startsWith("--input="));
const outputArg = process.argv.find(arg => arg.startsWith("--output="));
const input = path.resolve(inputArg ? inputArg.slice(8) : DEFAULT_INPUT);
const output = path.resolve(outputArg ? outputArg.slice(9) : path.join(ROOT, "src/data/players_japan.js"));

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
    else if (ch === "\n") { row.push(cell.replace(/\r$/, "")); rows.push(row); row = []; cell = ""; }
    else cell += ch;
  }
  if (cell.length || row.length) { row.push(cell.replace(/\r$/, "")); rows.push(row); }
  const headers = rows.shift() || [];
  return rows.filter(values => values.some(Boolean)).map(values =>
    Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])),
  );
}

const REQUIRED = ["Oyuncu", "Yaş", "Kulüp", "En Verimli Mevki", "Milli Takım"];
const ROLE_WEIGHTS = {
  GK: { Refleksler: 20, "Elle Kontrol": 16, Birebir: 14, "Hava Topları": 11, "Bölge Hakimiyeti": 10, "Ani Çıkış Eğilimi": 8, Degaj: 6, "Karar Alma": 6, Çeviklik: 5, Cesaret: 4 },
  DEF: { "Top Kapma": 20, "Kafa Vuruşu": 13, Güç: 12, Hız: 10, Hızlanma: 9, "Karar Alma": 9, Çalışkanlık: 8, Cesaret: 7, Agresiflik: 5, Dayanıklılık: 4, Pas: 3 },
  MID: { Pas: 18, "Karar Alma": 13, Çalışkanlık: 11, Dayanıklılık: 10, Dripling: 9, "Topsuz Alan": 8, Soğukkanlılık: 8, "Özel Yetenek": 6, Hızlanma: 5, Hız: 4, "Top Kapma": 4, Güç: 2, "Orta Yapma": 2 },
  FWD: { Bitiricilik: 17, "Topsuz Alan": 15, Dripling: 12, Hızlanma: 11, Hız: 10, Soğukkanlılık: 10, "Karar Alma": 7, "Özel Yetenek": 7, "Kafa Vuruşu": 5, Güç: 3, Dayanıklılık: 2, Pas: 1 },
};

function roleOf(row) {
  const position = String(row["En Verimli Mevki"] || row.Mevki || "").toLocaleUpperCase("tr-TR");
  if (/\bKL\b/.test(position)) return "GK";
  if (/^(?:D\s*\(|D\/|KB)|\bSTP\b/.test(position)) return "DEF";
  if (/^(?:ST|OOS)/.test(position) || (/^OS/.test(position) && !/\(M\)/.test(position))) return "FWD";
  return "MID";
}

function attribute(row, field) {
  const value = Number(String(row[field] ?? "").replace(",", "."));
  return Number.isFinite(value) ? Math.max(1, Math.min(20, value)) : 1;
}

function overallOf(row, role) {
  const weights = ROLE_WEIGHTS[role];
  let weighted = 0, total = 0;
  for (const [field, weight] of Object.entries(weights)) {
    weighted += attribute(row, field) * weight;
    total += weight;
  }
  // FM'nin 1-20 niteliklerini copa.life'ın mevcut 55-90 güç bandına taşır.
  return Math.max(55, Math.min(90, Math.round(39 + (weighted / total) * 2.5)));
}

if (!fs.existsSync(input)) throw new Error(`Japonya FM26 CSV bulunamadı: ${input}`);
const rows = parseDelimited(fs.readFileSync(input, "utf8"));
if (!rows.length) throw new Error("Japonya FM26 CSV boş");
for (const field of REQUIRED) if (!(field in rows[0])) throw new Error(`CSV alanı eksik: ${field}`);

const seen = new Set();
const pool = rows.map((row, index) => {
  const name = String(row.Oyuncu || "").trim();
  const club = String(row["Kulüp"] || "").trim();
  const age = Number(row["Yaş"]);
  if (!name || !club || !Number.isFinite(age)) throw new Error(`Geçersiz oyuncu satırı: ${index + 2}`);
  const identity = `${name}|${club}|${age}`;
  if (seen.has(identity)) throw new Error(`Tekrarlanan Japonya oyuncusu: ${identity}`);
  seen.add(identity);
  const role = roleOf(row);
  const overall = overallOf(row, role);
  const local = String(row["Milli Takım"] || "").trim() ? 1 : 0;
  const valueBand = Math.max(1, Math.min(60, Math.round(Math.pow(Math.max(1, overall - 54), 1.55) / 7)));
  return [name, overall, role, club, age, local, valueBand];
});

const clubs = new Set(pool.map(player => player[3]));
if (pool.length !== 561 || clubs.size !== 20) {
  throw new Error(`Beklenen 561 oyuncu / 20 kulüp; bulunan ${pool.length} oyuncu / ${clubs.size} kulüp`);
}
for (const role of Object.keys(ROLE_WEIGHTS)) {
  if (!pool.some(player => player[2] === role)) throw new Error(`Japonya havuzunda ${role} oyuncusu yok`);
}

const header = `/* FM26 Japonya ligi dışa aktarımından üretildi (${path.basename(input)}).\n   Şema: [ad, güç, grup, kulüp, yaş, yerli/milli takım kaydı, değer bandı]. */\n`;
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, `${header}var POOL_JP=${JSON.stringify(pool)};\n`, "utf8");
console.log(`Japonya havuzu yazıldı: ${pool.length} oyuncu, ${clubs.size} kulüp -> ${output}`);
