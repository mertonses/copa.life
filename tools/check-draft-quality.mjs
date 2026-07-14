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
    rand: random,
    groupOf,
    valueOf: ov => Math.max(1, Math.round((Number(ov) - 50) / 4)),
    effOf: player => player.ov,
  };
  vm.createContext(context);
  vm.runInContext(`${GENERATOR}\nthis.__draftOptions=draftOptions;`, context);
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
    for (let run = 0; run < RUNS; run++) {
      const options = context.__draftOptions(pos);
      const shown = options.filter(option => !option.hidden);
      total += options.reduce((sum, option) => sum + option.ov, 0);
      visible += shown.length;
      if (shown.length === 3 && shown.every(option => option.ov <= 60)) allLow++;
      if (options.some(option => option.ov >= 70)) hasGood++;
    }
    const mean = total / (RUNS * 3);
    const allLowPct = (allLow / RUNS) * 100;
    const goodPct = (hasGood / RUNS) * 100;
    rows.push(`${groupOf(pos)} ort ${mean.toFixed(1)} · 3×≤60 %${allLowPct.toFixed(2)} · 70+ %${goodPct.toFixed(1)}`);
    if (country !== "TR" && allLow > 0) failed = true;
    if (!visible) failed = true;
  }
  console.log(`${country}: ${rows.join(" | ")}`);
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
