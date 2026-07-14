import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const ROOT = path.resolve(import.meta.dirname, "..");
const DEFAULT_OUTPUT = path.join(ROOT, "outputs/player-profile-manifest.csv");
const outputArg = process.argv.find(arg => arg.startsWith("--output="));
const output = path.resolve(outputArg ? outputArg.slice("--output=".length) : DEFAULT_OUTPUT);
const SOURCES = {
  TR: ["src/data/players.js", "POOL"],
  ENG: ["src/data/players_england.js", "POOL_EN"],
  ES: ["src/data/players_spain.js", "POOL_ES"],
  IT: ["src/data/players_italy.js", "POOL_IT"],
  DE: ["src/data/players_germany.js", "POOL_DE"],
  JP: ["src/data/players_japan.js", "POOL_JP"],
};

function loadPool(relativePath, variable) {
  const context = {};
  vm.createContext(context);
  vm.runInContext(`${fs.readFileSync(path.join(ROOT, relativePath), "utf8")}\nthis.__pool=${variable};`, context);
  return context.__pool;
}

function csv(value) {
  const text = String(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

const rows = [["country", "name", "club", "age", "role", "overall"]];
for (const [country, [file, variable]] of Object.entries(SOURCES)) {
  for (const [name, overall, role, club, age] of loadPool(file, variable)) {
    rows.push([country, name, club, age, role, overall]);
  }
}

fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, `${rows.map(row => row.map(csv).join(",")).join("\n")}\n`, "utf8");
console.log(`${(rows.length - 1).toLocaleString("tr-TR")} mevcut oyuncu yazıldı: ${output}`);
