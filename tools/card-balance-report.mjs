import fs from "node:fs";
import vm from "node:vm";

const ROOT = process.cwd();
const cardDefsSource = fs.readFileSync(`${ROOT}/src/cards/cardDefs.js`, "utf8");
const i18nSource = fs.readFileSync(`${ROOT}/src/data/i18n.js`, "utf8");
const balanceSource = fs.readFileSync(`${ROOT}/src/cards/cardBalance.js`, "utf8");

const sampleSquad = [
  { pos: "GK", ov: 76, eff: 76, age: 29, tr: true },
  { pos: "LB", ov: 72, eff: 72, age: 23, tr: true },
  { pos: "CB", ov: 74, eff: 74, age: 31, tr: true },
  { pos: "CB", ov: 68, eff: 68, age: 21, tr: false },
  { pos: "RB", ov: 79, eff: 79, age: 26, tr: false },
  { pos: "LW", ov: 81, eff: 81, age: 24, tr: false },
  { pos: "CM", ov: 73, eff: 73, age: 19, tr: true },
  { pos: "CM", ov: 70, eff: 70, age: 34, tr: true },
  { pos: "RW", ov: 78, eff: 78, age: 22, tr: false },
  { pos: "ST", ov: 82, eff: 82, age: 28, tr: false },
  { pos: "ST", ov: 66, eff: 66, age: 20, tr: true },
];

let activeVariant = 0;
const labels = ["COMMON", "DARK"];
const context = {
  console,
  Math,
  injuredIdx: -1,
  opponent: { power: 78 },
  VARIANT_PRICE_MOD: [1, 1.35],
  variantOf: () => activeVariant,
  effOf: (p) => p?.eff ?? p?.ov ?? 0,
  chairmanMarketMod: () => 0,
  rand: () => 0.5,
  L: () => ({ variantLbl: labels }),
};

vm.createContext(context);
vm.runInContext(i18nSource, context, { filename: "src/data/i18n.js" });
vm.runInContext(cardDefsSource, context, { filename: "src/cards/cardDefs.js" });
vm.runInContext(balanceSource, context, { filename: "src/cards/cardBalance.js" });

const cardDefs = context.CARDDEFS || {};
const cardKeys = context.CARDKEYS || Object.keys(cardDefs);

function cleanText(value) {
  return String(value || "")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function cardName(key) {
  return cleanText(context.T?.tr?.cards?.[key]?.n || context.T?.en?.cards?.[key]?.n || key);
}

function cardCopy(key) {
  return cleanText(context.T?.tr?.cards?.[key]?.d || context.T?.en?.cards?.[key]?.d || "");
}

function priceOf(key, variant) {
  activeVariant = variant;
  if (typeof context.cardPrice === "function") return context.cardPrice(key);
  return Math.max(0, Math.round((cardDefs[key]?.price || 0) * (context.VARIANT_PRICE_MOD?.[variant] || 1)));
}

function effectOf(key, variant, round) {
  activeVariant = variant;
  try {
    return Number(cardDefs[key]?.eff?.(sampleSquad, round) || 0);
  } catch {
    return 0;
  }
}

function variantStats(key, variant) {
  const values = [1, 2, 3, 4, 5, 6].map((round) => effectOf(key, variant, round));
  const min = Math.min(...values);
  const max = Math.max(...values);
  const price = priceOf(key, variant);
  const range = min === max ? signed(max) : `${signed(min)}..${signed(max)}`;
  const efficiency = price > 0 ? max / price : 0;
  return { min, max, price, range, efficiency };
}

function signed(value) {
  return `${value >= 0 ? "+" : ""}${value}`;
}

function fmtEfficiency(value) {
  if (!Number.isFinite(value) || value <= 0) return "-";
  return value.toFixed(2);
}

function noteFor(key, common, dark) {
  const def = cardDefs[key] || {};
  const copy = cardCopy(key).toLowerCase();
  const notes = [];

  if (def.mode === "instant") notes.push("olay kartı: etkisi satın alma anında");
  if (def.mode === "contract") notes.push("kontrat: tekrarlı etki");
  if (def.mode === "scaling") notes.push("ölçeklenen etki");
  if (copy.includes("risk") || copy.includes("ceza") || copy.includes("sakat")) notes.push("risk içerir");
  if (copy.includes("final")) notes.push("final etkisi var");
  if (dark.max >= Math.max(8, common.max * 1.8) && dark.price <= common.price + 2) notes.push("DARK yüksek kaldıraç");
  if (Math.max(common.max, dark.max) >= 12 && Math.min(common.price, dark.price) <= 6) notes.push("yüksek kaldıraç / ucuz");
  if (Math.max(common.max, dark.max) <= 2 && Math.min(common.price, dark.price) >= 6) notes.push("düşük görünen güç etkisi");

  return [...new Set(notes)].join(", ") || "düşük karmaşıklık";
}

function scoreLabel(common, dark) {
  const best = Math.max(common.efficiency, dark.efficiency);
  if (best >= 2.0) return "çok verimli";
  if (best >= 1.25) return "verimli";
  if (best > 0 && best < 0.55) return "pahalı/niş";
  return "normal";
}

const rows = [];
for (const key of cardKeys) {
  const def = cardDefs[key] || {};
  const common = variantStats(key, 0);
  const dark = variantStats(key, 1);
  rows.push({
    key,
    name: cardName(key),
    kind: def.kind || "-",
    mode: def.mode || "-",
    common,
    dark,
    note: noteFor(key, common, dark),
    score: scoreLabel(common, dark),
  });
}

const highLeverage = rows.filter((row) => row.note.includes("yüksek") || row.score === "çok verimli");
const risky = rows.filter((row) => row.note.includes("risk"));
const instant = rows.filter((row) => row.mode === "instant");

const lines = [];
lines.push("# Kart Balance Tablosu");
lines.push("");
lines.push("Bu dosya `npm run report:cards` ile gerçek kart kodundan üretilir. Etki değerleri örnek 4-4-2 kadro üzerinde 1-6. tur aralığına göre hesaplanır. Tek kullanımlık ve event tabanlı kartlarda nihai etki oyun akışında uygulanabilir; tablo bu kartları ayrıca notlar.");
lines.push("");
lines.push(`- Toplam kart: ${rows.length}`);
lines.push(`- Risk içeren kart: ${risky.length}`);
lines.push(`- Tek kullanımlık/olay kartı: ${instant.length}`);
lines.push(`- Yüksek kaldıraç veya çok verimli kart: ${highLeverage.length}`);
lines.push("");
lines.push("| Kart | Kategori | Mod | COMMON fiyat | COMMON etki | DARK fiyat | DARK etki | Verim | Denge notu |");
lines.push("| --- | --- | --- | ---: | ---: | ---: | ---: | --- | --- |");

for (const row of rows) {
  lines.push(
    `| ${row.name} | ${row.kind} | ${row.mode} | €${row.common.price}M | ${row.common.range} | €${row.dark.price}M | ${row.dark.range} | ${row.score} (${fmtEfficiency(Math.max(row.common.efficiency, row.dark.efficiency))}) | ${row.note} |`,
  );
}

lines.push("");
lines.push("## İzleme Notları");
lines.push("");
lines.push("- Görünür kart açıklaması yalnızca seçili varyantı anlatmalı; COMMON ve DARK aynı anda metne basılmamalı.");
lines.push("- Yüksek kaldıraç kartlarında satın alma önizlemesi, gerçek oyun etkisi ve feed metni birlikte kontrol edilmeli.");
lines.push("- Risk kartlarında ceza, sakatlık, güven ve ekonomi etkisi sade ama açık kalmalı.");

fs.writeFileSync(`${ROOT}/CARD_BALANCE.md`, `${lines.join("\n")}\n`, "utf8");
console.log(`Card balance report written: CARD_BALANCE.md (${rows.length} cards)`);
