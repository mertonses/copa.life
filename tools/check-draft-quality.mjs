import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const ROOT = path.resolve(import.meta.dirname, "..");
const GENERATOR = fs.readFileSync(path.join(ROOT, "src/game/generate.js"), "utf8");
const RUNS = Number(process.env.DRAFT_QUALITY_RUNS || 300);
const COUNTRIES = {
  TR: ["src/data/players.js", "POOL"],
  ENG: ["src/data/players_england.js", "POOL_EN"],
  ES: ["src/data/players_spain.js", "POOL_ES"],
  IT: ["src/data/players_italy.js", "POOL_IT"],
  DE: ["src/data/players_germany.js", "POOL_DE"],
  JP: ["src/data/players_japan.js", "POOL_JP"],
};
const POSITIONS = ["GK", "CB", "CM", "ST"];

function loadPool(relativePath, variable) {
  const context = {};
  vm.createContext(context);
  vm.runInContext(`${fs.readFileSync(path.join(ROOT, relativePath), "utf8")}\nthis.__pool=${variable};`, context);
  return context.__pool;
}

function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function groupOf(pos) {
  if (pos === "GK") return "GK";
  if (["CB", "LB", "RB", "WB"].includes(pos)) return "DEF";
  if (["CDM", "CM", "CAM", "LM", "RM"].includes(pos)) return "MID";
  return "FWD";
}

function draftMarketValue(ov) {
  const anchors = [[50, 0.2], [55, 0.3], [60, 0.5], [65, 1], [70, 2], [75, 4], [80, 7], [85, 12], [90, 20], [95, 32], [99, 45]];
  const power = Math.max(45, Math.min(99, Number(ov) || 60));
  for (let i = 1; i < anchors.length; i++) {
    if (power > anchors[i][0]) continue;
    const from = anchors[i - 1], to = anchors[i], ratio = (power - from[0]) / (to[0] - from[0]);
    const value = from[1] + (to[1] - from[1]) * ratio;
    return value < 1 ? Math.max(0.3, Math.round(value * 10) / 10) : Math.round(value * 10) / 10;
  }
  return 45;
}

function makeContext(country, pool) {
  const random = seededRandom(0xc0facafe ^ country.charCodeAt(0));
  const math = Object.create(Math);
  math.random = random;
  const context = {
    Math: math,
    POOL: pool,
    selectedCountry: country,
    chairman: null,
    LANG: "tr",
    deadlineH: 24,
    rand: random,
    groupOf,
    valueOf: draftMarketValue,
    effOf: player => player.ov,
  };
  vm.createContext(context);
  vm.runInContext(`${GENERATOR}\nthis.__draftOptions=draftOptions;this.__makeHidden=makeHidden;`, context);
  return context;
}

let failed = false;
console.log(`Draft kalite kontrolü (${RUNS.toLocaleString("tr-TR")} örnek / mevki)`);
for (const [country, [file, variable]] of Object.entries(COUNTRIES)) {
  const pool = loadPool(file, variable);
  const context = makeContext(country, pool);
  const rows = [];
  for (const pos of POSITIONS) {
    let total = 0;
    let visible = 0;
    let allLow = 0;
    let hasGood = 0;
    let hiddenSets = 0;
    let correctSignals = 0;
    let signalSamples = 0;
    for (let run = 0; run < RUNS; run++) {
      const options = context.__draftOptions(pos);
      const shown = options.filter(option => !option.hidden);
      const hidden = options.filter(option => option.hidden);
      if (hidden.length > 1) {
        console.error(`Bir üçlüde birden fazla gizli aday üretildi: ${country}/${pos}`);
        failed = true;
      }
      if (hidden.length) hiddenSets++;
      for (const option of hidden) {
        if (!["gem", "fair", "bust"].includes(option.hiddenOutcome) || option.hiddenTier !== option.hiddenOutcome) {
          console.error(`Gizli sonuç sözleşmesi geçersiz: ${country}/${pos}`);
          failed = true;
        }
        if (!["positive", "neutral", "negative"].includes(option.scoutSignal) || "scoutHint" in option) {
          console.error(`Scout sinyali semantik anahtar olarak saklanmadı: ${country}/${pos}`);
          failed = true;
        }
        const expectedSignal = option.hiddenOutcome === "gem" ? "positive" : option.hiddenOutcome === "bust" ? "negative" : "neutral";
        correctSignals += Number(option.scoutSignal === expectedSignal);
        signalSamples++;
      }
      total += options.reduce((sum, option) => sum + option.ov, 0);
      visible += shown.length;
      if (shown.length === 3 && shown.every(option => option.ov <= 60)) allLow++;
      if (options.some(option => option.ov >= 70)) hasGood++;
    }
    const mean = total / (RUNS * 3);
    const allLowPct = (allLow / RUNS) * 100;
    const goodPct = (hasGood / RUNS) * 100;
    const hiddenSetPct = (hiddenSets / RUNS) * 100;
    const signalAccuracy = signalSamples ? (correctSignals / signalSamples) * 100 : 0;
    rows.push(`${groupOf(pos)} ort ${mean.toFixed(1)} · 3×≤60 %${allLowPct.toFixed(2)} · 70+ %${goodPct.toFixed(1)} · gizli %${hiddenSetPct.toFixed(1)} · scout %${signalAccuracy.toFixed(1)}`);
    if (country !== "TR" && allLow > 0) failed = true;
    if (!visible) failed = true;
    if (hiddenSetPct < 32 || hiddenSetPct > 58) failed = true;
    if (signalSamples && (signalAccuracy < 52 || signalAccuracy > 82)) failed = true;
  }
  console.log(`${country}: ${rows.join(" | ")}`);
}

{
  const pool = loadPool(...COUNTRIES.TR);
  const context = makeContext("TR", pool);
  context.deadlineH = 6;
  let hiddenSets = 0;
  for (let run = 0; run < RUNS * 4; run++) {
    const options = context.__draftOptions(POSITIONS[run % POSITIONS.length]);
    const hidden = options.filter(option => option.hidden);
    if (hidden.length > 1) failed = true;
    if (hidden.length) hiddenSets++;
  }
  const latePct = (hiddenSets / (RUNS * 4)) * 100;
  console.log(`Geç draft gizli üçlü oranı: %${latePct.toFixed(1)}`);
  if (latePct < 62 || latePct > 82) failed = true;

  const traitPlayer = { name: "Trait Guard", ov: 78, eff: 78, trait: "lider", price: 5 };
  context.__makeHidden(traitPlayer);
  if (traitPlayer.trait !== "lider") {
    console.error("Gizli oyuncu mevcut trait bilgisini kaybetti.");
    failed = true;
  }
}

{
  const pool = loadPool(...COUNTRIES.TR);
  const context = makeContext("TR", pool);
  for (const pos of POSITIONS) {
    context.eliteBonus = true;
    const elite = context.__draftOptions(pos).find(option => option.eliteDiscount);
    if (!elite || elite.natG !== groupOf(pos)) {
      console.error(`Elit bonus mevki filtresi başarısız: ${pos} slotuna ${elite?.name || "oyuncu gelmedi"}.`);
      failed = true;
    }
  }
}

if (failed) {
  console.error("Türkiye dışındaki bir havuzda tamamen düşük üçlü üretildi.");
  process.exitCode = 1;
}
