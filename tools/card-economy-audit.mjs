import fs from "node:fs";
import vm from "node:vm";

const ROOT = process.cwd();
const checkMode = process.argv.includes("--check");

const sources = {
  i18n: fs.readFileSync(`${ROOT}/src/data/i18n.js`, "utf8"),
  defs: fs.readFileSync(`${ROOT}/src/cards/cardDefs.js`, "utf8"),
  balance: fs.readFileSync(`${ROOT}/src/cards/cardBalance.js`, "utf8"),
  effects: fs.readFileSync(`${ROOT}/src/cards/cardEffects.js`, "utf8"),
  hub: fs.readFileSync(`${ROOT}/src/ui/hub.js`, "utf8"),
  html: fs.readFileSync(`${ROOT}/index.html`, "utf8"),
};

let activeVariant = 0;
const context = {
  console,
  Math,
  injuredIdx: -1,
  opponent: { power: 82 },
  cardPriceMod: 1,
  chairmanMarketMod: () => 0,
  effOf: (player) => player?.eff ?? player?.ov ?? 0,
  rand: () => 0.5,
  variantOf: () => activeVariant,
  LANG: "tr",
  L: () => ({ variantLbl: ["COMMON", "DARK"] }),
};

vm.createContext(context);
vm.runInContext(sources.i18n, context, { filename: "src/data/i18n.js" });
vm.runInContext(sources.defs, context, { filename: "src/cards/cardDefs.js" });
vm.runInContext(sources.balance, context, { filename: "src/cards/cardBalance.js" });
vm.runInContext(sources.effects, context, { filename: "src/cards/cardEffects.js" });

const cardDefs = context.CARDDEFS || {};
const cardKeys = context.CARDKEYS || Object.keys(cardDefs);

for (const [key, risk] of Object.entries(context.DARK_PURCHASE_RISKS || {})) {
  if (!cardDefs[key]) fail(`DARK purchase risk references unknown card: ${key}`);
  if (!(risk.chance > 0 && risk.chance < 1) || !(risk.cash > 0)) {
    fail(`${key} has an invalid DARK purchase risk`);
  }
}

const directDarkDownsides = new Set([
  "kontra",
  "buyuk_mac",
  "son_dans",
  "son_kredi",
  "kara_borsa",
  "deplasman_kafilesi",
  "kumarbaz",
  "gecici_prim",
  "kisa_kamp",
  "kurban_belli",
  "primler_yatinca",
  "vur_igneyi",
  "nasip_kismet",
  "yildiz_krizi",
]);
const darkRiskCoverage = new Set([
  ...Object.keys(context.KARA_PEN || {}),
  ...Object.keys(context.DARK_PURCHASE_RISKS || {}),
  ...directDarkDownsides,
]);
const uncoveredDarkCards = cardKeys.filter((key) => !darkRiskCoverage.has(key));
if (uncoveredDarkCards.length) {
  fail(`DARK variants without a downside: ${uncoveredDarkCards.join(", ")}`);
}

const finalRehearsalRisk = context.DARK_PURCHASE_RISKS?.final_provasi;
if (finalRehearsalRisk?.chance !== 0.25 || finalRehearsalRisk?.cash !== 3) {
  fail("final_provasi DARK purchase risk is not 25% / EUR3M");
}
if (!/applyDarkPurchaseRisk\(k,variant\)/.test(sources.effects)) {
  fail("DARK purchase risks are not connected to addCard");
}

let chargedCash = 0;
context.spend = (amount) => { chargedCash += Number(amount) || 0; };
context.trackCardPenalty = () => {};
context.pushFeed = () => {};
context.L = () => ({
  variantLbl: ["COMMON", "DARK"],
  cards: { final_provasi: { n: "Final Provası" } },
});
context.rand = () => 0.249;
const finalRiskHit = context.applyDarkPurchaseRisk("final_provasi", 1);
if (!finalRiskHit?.triggered || chargedCash !== 3) {
  fail("final_provasi DARK risk does not charge EUR3M below the 25% threshold");
}
chargedCash = 0;
context.rand = () => 0.25;
const finalRiskMiss = context.applyDarkPurchaseRisk("final_provasi", 1);
if (finalRiskMiss?.triggered || chargedCash !== 0) {
  fail("final_provasi DARK risk triggers at or above the 25% threshold");
}
context.rand = () => 0;
const finalCommonRisk = context.applyDarkPurchaseRisk("final_provasi", 0);
if (finalCommonRisk?.triggered || chargedCash !== 0) {
  fail("final_provasi COMMON incorrectly receives the DARK purchase risk");
}

const squads = {
  balanced: [
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
  ],
  narrow: [
    { pos: "GK", ov: 72, eff: 72, age: 24, tr: true },
    { pos: "CB", ov: 72, eff: 72, age: 26, tr: true },
    { pos: "CB", ov: 73, eff: 73, age: 25, tr: false },
    { pos: "CB", ov: 71, eff: 71, age: 30, tr: false },
    { pos: "CM", ov: 70, eff: 70, age: 22, tr: true },
    { pos: "CM", ov: 74, eff: 74, age: 28, tr: true },
    { pos: "CM", ov: 69, eff: 69, age: 20, tr: true },
    { pos: "AM", ov: 75, eff: 75, age: 26, tr: false },
    { pos: "AM", ov: 76, eff: 76, age: 31, tr: false },
    { pos: "ST", ov: 78, eff: 78, age: 27, tr: true },
    { pos: "ST", ov: 80, eff: 80, age: 29, tr: false },
  ],
  weak: Array.from({ length: 11 }, (_, index) => ({
    pos: ["GK", "LB", "CB", "CB", "RB", "LW", "CM", "CM", "RW", "ST", "ST"][index],
    ov: 58 + (index % 7),
    eff: 58 + (index % 7),
    age: 19 + (index % 18),
    tr: index % 2 === 0,
  })),
  youth: Array.from({ length: 11 }, (_, index) => ({
    pos: ["GK", "LB", "CB", "CB", "RB", "LW", "CM", "CM", "RW", "ST", "ST"][index],
    ov: 68 + (index % 8),
    eff: 68 + (index % 8),
    age: 19 + (index % 5),
    tr: index % 2 === 0,
  })),
  veteran: Array.from({ length: 11 }, (_, index) => ({
    pos: ["GK", "LB", "CB", "CB", "RB", "LW", "CM", "CM", "RW", "ST", "ST"][index],
    ov: 70 + (index % 8),
    eff: 70 + (index % 8),
    age: 32 + (index % 5),
    tr: index % 2 === 0,
  })),
  local: Array.from({ length: 11 }, (_, index) => ({
    pos: ["GK", "LB", "CB", "CB", "RB", "LW", "CM", "CM", "RW", "ST", "ST"][index],
    ov: 70 + (index % 8),
    eff: 70 + (index % 8),
    age: 23 + (index % 9),
    tr: true,
  })),
};

function fail(message) {
  console.error(`card economy audit failed: ${message}`);
  process.exitCode = 1;
}

function effectOf(key, variant, squad, round) {
  activeVariant = variant;
  const effect = cardDefs[key]?.eff?.(squad, round) ?? 0;
  return Number(effect);
}

function priceOf(key, variant) {
  activeVariant = variant;
  return Number(context.cardPrice?.(key) ?? 0);
}

function maxEffect(key, variant) {
  let max = -Infinity;
  for (const squad of Object.values(squads)) {
    for (let round = 1; round <= 6; round += 1) {
      const effect = effectOf(key, variant, squad, round);
      if (!Number.isFinite(effect)) fail(`${key} variant ${variant} returns non-numeric effect`);
      max = Math.max(max, effect);
    }
  }
  return max;
}

const summary = [];
for (const key of cardKeys) {
  const commonPrice = priceOf(key, 0);
  const darkPrice = priceOf(key, 1);
  const commonMax = maxEffect(key, 0);
  const darkMax = maxEffect(key, 1);

  if (commonPrice < 0 || darkPrice < 0) fail(`${key} has a negative price`);
  if (cardDefs[key]?.price === 0 && (commonPrice !== 0 || darkPrice !== 0)) fail(`${key} base-free card is not free`);
  if (cardDefs[key]?.price > 0 && !cardDefs[key]?.fixedPrice && darkPrice <= commonPrice) fail(`${key} DARK price is not above COMMON`);
  if (commonMax > 18 || darkMax > 18) fail(`${key} has an unusually high direct power effect`);
  if (darkMax < commonMax && cardDefs[key]?.mode === "scaling") fail(`${key} DARK scaling effect is lower than COMMON`);

  const darkRisk = [
    context.KARA_PEN?.[key] ? `final_debt:${context.KARA_PEN[key]}` : "",
    context.DARK_PURCHASE_RISKS?.[key]
      ? `purchase:${Math.round(context.DARK_PURCHASE_RISKS[key].chance * 100)}%/EUR${context.DARK_PURCHASE_RISKS[key].cash}M`
      : "",
    directDarkDownsides.has(key) ? "direct_or_conditional" : "",
  ].filter(Boolean).join("+");
  summary.push({ key, commonPrice, darkPrice, commonMax, darkMax, darkRisk });
}

const visibleCopy = [sources.hub, sources.html].join("\n");
const forbiddenTierPattern = new RegExp(
  [
    [84, 69, 77, 75, 304, 78, 76, 304],
    [116, 101, 109, 107, 105, 110, 108, 105],
    [84, 101, 109, 107, 105, 110, 108, 105],
    [84, 69, 77, 75, 73, 78, 76, 73],
    [67, 69, 83, 85, 82],
    [99, 101, 115, 117, 114],
    [67, 101, 115, 117, 114],
  ]
    .map((codes) => String.fromCodePoint(...codes))
    .join("|"),
  "i",
);
const copyGuards = [
  ["forbidden tier names", forbiddenTierPattern],
  ["old backroom card name", /Kas[ıi]ğa Para|Kasiga Para/i],
  ["zero-risk wording", /Risk\s*%0/i],
  ["wrong striker abbreviation", /(?:COMMON|DARK)\s+ST\s+başına/i],
  ["combo mechanic", /Kombo|combo|cardCombos/i],
];

for (const [label, pattern] of copyGuards) {
  if (pattern.test(visibleCopy)) fail(`${label} appears in visible UI source`);
}

const keyChecks = [
  ["kanat_akini COMMON cap", maxEffect("kanat_akini", 0) <= 4],
  ["kanat_akini DARK cap", maxEffect("kanat_akini", 1) <= 6],
  ["cift_forvet COMMON cap", maxEffect("cift_forvet", 0) <= 4],
  ["cift_forvet DARK cap", maxEffect("cift_forvet", 1) <= 8],
  ["anadolu starter cap", maxEffect("anadolu", 1) <= 5],
  ["vur_igneyi COMMON price", priceOf("vur_igneyi", 0) === 3],
  ["vur_igneyi DARK price", priceOf("vur_igneyi", 1) === 3],
  ["son_dans COMMON healthy", effectOf("son_dans", 0, squads.balanced, 6) === 8],
  ["son_dans COMMON injured", effectOf("son_dans", 0, squads.balanced.map((p,index)=>index===4?{...p,injured:true}:p), 6) === 2],
  ["son_dans DARK healthy", effectOf("son_dans", 1, squads.balanced, 6) === 14],
  ["son_dans DARK injured", effectOf("son_dans", 1, squads.balanced.map((p,index)=>index===4?{...p,injured:true}:p), 6) === -8],
];

for (const [label, ok] of keyChecks) {
  if (!ok) fail(label);
}

console.log(`card economy OK: ${summary.length} cards audited`);
for (const row of summary.slice(0, 5)) {
  console.log(`${row.key}: COMMON ${row.commonMax}/EUR${row.commonPrice}M, DARK ${row.darkMax}/EUR${row.darkPrice}M`);
}

if (!checkMode) {
  fs.mkdirSync("outputs", { recursive: true });
  fs.writeFileSync("outputs/card-economy-audit.json", `${JSON.stringify(summary, null, 2)}\n`);
}

if (process.exitCode) process.exit(1);
