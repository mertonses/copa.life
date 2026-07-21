import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const PALETTE = [
  "#101D28", "#F24A28", "#DA3D2E", "#420102", "#F3F5F4", "#4E9B65",
  "#FFFFFF", "#E4E8E7", "#56616A", "#AE3D28", "#BC3F28", "#BCC2C2",
  "#7A858B", "#17242D", "#1F2B34", "#27343C", "#303C44", "#0A1118",
  "#AAB2B3", "#F25F40", "#3A4750", "#68757C",
];
const LEGACY_MAP = new Map(Object.entries({
  "#0D1713": "#101D28", "#327A50": "#F24A28", "#F3EEDF": "#F3F5F4",
  "#D6A23A": "#F24A28", "#4E7184": "#101D28", "#C64A43": "#420102",
  "#D8752B": "#DA3D2E", "#4E9B65": "#4E9B65", "#E8E4D8": "#F3F5F4",
  "#DDD8CA": "#E4E8E7", "#FFFDF7": "#FFFFFF", "#536159": "#56616A",
  "#286641": "#AE3D28", "#1F5034": "#BC3F28", "#183A2B": "#101D28",
  "#BDB7A9": "#BCC2C2", "#7A847D": "#7A858B", "#14221C": "#17242D",
  "#1A2C24": "#1F2B34", "#22382E": "#27343C", "#2A4538": "#303C44",
  "#07100D": "#0A1118", "#A8B7AE": "#AAB2B3", "#61B985": "#F24A28",
  "#75CB98": "#F25F40", "#4E9B6D": "#BC3F28", "#345445": "#3A4750",
  "#6D8C7C": "#68757C", "#DD5B52": "#DA3D2E",
}));
const TARGETS = [
  "index.html", "privacy.html", "terms.html",
  "src/styles", "src/ui", "src/cards",
  "src/sim/finalSim.js", "src/balance/difficulty.js", "src/state/gameState.js",
];
const SKIP = new Set([path.normalize("src/styles/palette.css")]);

const rgb = (hex) => {
  const h = hex.slice(1);
  return [0, 2, 4].map((i) => Number.parseInt(h.slice(i, i + 2), 16));
};
const paletteRgb = PALETTE.map((hex) => ({ hex, rgb: rgb(hex) }));
const linear = (c) => {
  const n = c / 255;
  return n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
};
const nearest = ([r, g, b]) => paletteRgb.reduce((best, entry) => {
  const d = entry.rgb.reduce((sum, value, index) => {
    const source = [r, g, b][index];
    const delta = linear(source) - linear(value);
    return sum + delta * delta;
  }, 0);
  return d < best.distance ? { ...entry, distance: d } : best;
}, { hex: PALETTE[0], rgb: rgb(PALETTE[0]), distance: Number.POSITIVE_INFINITY });

async function collect(target) {
  const absolute = path.join(ROOT, target);
  const stat = await fs.stat(absolute);
  if (stat.isFile()) return [absolute];
  const entries = await fs.readdir(absolute, { withFileTypes: true });
  const nested = await Promise.all(entries.map((entry) => collect(path.join(target, entry.name))));
  return nested.flat();
}

function expandHex(value) {
  const body = value.slice(1);
  if (body.length === 3 || body.length === 4) {
    return [...body].map((c) => c + c).join("");
  }
  return body;
}

function migrate(source) {
  let changed = source.replace(/(?<!&)#[\da-f]{3,8}\b/gi, (value) => {
    const expanded = expandHex(value);
    if (![6, 8].includes(expanded.length)) return value;
    const color = `#${expanded.slice(0, 6)}`.toUpperCase();
    const alpha = expanded.slice(6);
    return (LEGACY_MAP.get(color) || nearest(rgb(color)).hex) + alpha.toUpperCase();
  });
  changed = changed.replace(/\brgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*(0?(?:\.\d+)?|1(?:\.0+)?))?\s*\)/gi,
    (value, r, g, b, alpha) => {
      const sourceHex = `#${[r,g,b].map((channel) => Number(channel).toString(16).padStart(2,"0")).join("")}`.toUpperCase();
      const mapped = LEGACY_MAP.get(sourceHex);
      const match = mapped ? { hex:mapped, rgb:rgb(mapped) } : nearest([Number(r), Number(g), Number(b)]);
      if (alpha == null) return match.hex;
      return `rgba(${match.rgb.join(",")},${alpha})`;
    });
  return changed;
}

const files = (await Promise.all(TARGETS.map(collect))).flat()
  .filter((file) => /\.(?:css|html|js)$/i.test(file))
  .filter((file) => !SKIP.has(path.normalize(path.relative(ROOT, file))));
let changedFiles = 0;
for (const file of files) {
  const before = await fs.readFile(file, "utf8");
  const after = migrate(before);
  if (after !== before) {
    await fs.writeFile(file, after, "utf8");
    changedFiles += 1;
  }
}
console.log(`Migrated raw UI colors to the canonical palette in ${changedFiles} files.`);
