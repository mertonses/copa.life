import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const ROOT = path.resolve(import.meta.dirname, "..");
const read = file => fs.readFileSync(path.join(ROOT, file), "utf8");
const context = { LANG: "tr" };
context.window = context;
vm.createContext(context);
vm.runInContext(read("src/ui/scoutReport.js"), context);

const players = [
  { name: "Forvet A", grp: "FWD", scoutOv: 56, side: "L" },
  { name: "Forvet B", grp: "FWD", scoutOv: 57, side: "C" },
  { name: "Forvet C", grp: "FWD", scoutOv: 57, side: "R" },
  { name: "Orta A", grp: "MID", scoutOv: 57, side: "L" },
  { name: "Orta B", grp: "MID", scoutOv: 58, side: "C" },
  { name: "Orta C", grp: "MID", scoutOv: 57, side: "R" },
  { name: "Defans A", grp: "DEF", scoutOv: 59, side: "L" },
  { name: "Defans B", grp: "DEF", scoutOv: 60, side: "C" },
  { name: "Defans C", grp: "DEF", scoutOv: 60, side: "C" },
  { name: "Defans D", grp: "DEF", scoutOv: 59, side: "R" },
  { name: "Kaleci", grp: "GK", scoutOv: 58, side: "C" },
];
const labels = context.ScoutReport.copy();
const fallbackModel = context.ScoutReport.model(players, null, "Gegenpressing", "merkez", labels);
if (fallbackModel.bars.attack !== 57 || fallbackModel.bars.midfield !== 57 || fallbackModel.bars.defense !== 59) {
  throw new Error(`Scout fallback ortalamaları tam sayıya yuvarlanmadı: ${JSON.stringify(fallbackModel.bars)}`);
}
const fallbackHtml = context.ScoutReport.html(fallbackModel, labels);
if (/\d+\.\d{2,}/.test(fallbackHtml)) throw new Error("Scout raporunda uzun ondalık değer kaldı");
if (!fallbackHtml.includes('aria-valuenow="57"') || !fallbackHtml.includes('>59</b>')) throw new Error("Yuvarlanmış güç profili render edilmedi");

const profiles = players.map((_, index) => ({
  copa_impact: 55 + index % 4,
  copa_build_up: 61 + index % 3,
  copa_space_control: 59 + index % 5,
  copa_duels: 63 + index % 4,
  copa_engine: 66 + index % 6,
  copa_pressure_decision: 60 + index % 5,
}));
const profileModel = context.ScoutReport.model(players, profiles, "Gegenpressing", "merkez", labels);
if (Object.values(profileModel.bars).some(value => value != null && (!Number.isInteger(value) || value < 0 || value > 100))) {
  throw new Error(`Profil tabanlı güç değerleri güvenli aralıkta değil: ${JSON.stringify(profileModel.bars)}`);
}
const profileHtml = context.ScoutReport.html(profileModel, labels);
if (profileHtml.includes("NaN") || !profileHtml.includes("COPA PROFİLİ")) throw new Error("copa.life scout profili render edilmedi");
for (const legacy of ["finishing", "composure", "natural_fitness", "value*5", "raw*5"]) {
  if (read("src/ui/scoutReport.js").includes(legacy)) throw new Error(`Eski 1–20 scout alanı kaldı: ${legacy}`);
}

const css = read("src/styles/match.css");
for (const marker of [
  "overflow-x:hidden",
  ".scout-strength-row>span",
  "font-variant-numeric:tabular-nums",
  ".scout-mhdr-main{align-items:flex-start;flex-direction:column",
  ".scout-head-stats{width:100%}",
]) {
  if (!css.includes(marker)) throw new Error(`Scout responsive taşma koruması eksik: ${marker}`);
}

console.log("Scout report checks passed: six copa dimensions, rounded metrics, and responsive guards verified.");
