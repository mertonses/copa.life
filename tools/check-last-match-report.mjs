import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const ROOT = path.resolve(import.meta.dirname, "..");
const read = file => fs.readFileSync(path.join(ROOT, file), "utf8");
const context = { console };
context.window = context;
context.groupOf = pos => pos === "GK" ? "GK" : ["CB", "LB", "RB", "WB"].includes(pos) ? "DEF" : ["ST", "LW", "RW"].includes(pos) ? "FWD" : "MID";
vm.createContext(context);
vm.runInContext(read("src/data/formations.js"), context);
vm.runInContext(read("src/ui/lastMatchReport.js"), context);

const api = context.LastMatchReport;
if (!api) throw new Error("LastMatchReport global API yüklenmedi");

const homeGk = api._positionForTest(["GK", 50, 90], "home");
const homeSt = api._positionForTest(["ST", 50, 27], "home");
const awayGk = api._positionForTest(["GK", 50, 90], "away");
const awaySt = api._positionForTest(["ST", 50, 27], "away");
const homeLb = api._positionForTest(["LB", 16, 76], "home");
const awayLb = api._positionForTest(["LB", 16, 76], "away");
if (!(homeGk.x < homeSt.x && awayGk.x > awaySt.x)) throw new Error("Yatay saha derinlik aynalaması hatalı");
if (Math.abs(homeLb.y + awayLb.y - 100) > 0.2) throw new Error("Rakip sağ/sol koordinat aynalaması hatalı");
if (Math.abs(homeLb.mobileY + awayLb.mobileY - 100) > 0.2) throw new Error("Mobil saha koordinat aynalaması hatalı");

const tones = [[4.9, "poor"], [5.7, "weak"], [6.2, "average"], [6.7, "decent"], [7.2, "good"], [7.7, "strong"], [8.4, "elite"], [9.1, "star"]];
for (const [rating, expected] of tones) {
  if (api._ratingToneForTest(rating) !== expected) throw new Error(`Rating tonu hatalı: ${rating}`);
}

const slots = context.FORMATIONS["4-3-3"];
const players = prefix => slots.map((slot, index) => ({
  name: `${prefix} Player ${index + 1}`,
  pos: slot[0],
  ov: 50 + index,
  profileKey: `${prefix.toLowerCase()}-${index + 1}`,
}));
const home = players("Home");
const away = players("Away");
const report = api.capture({
  round: 6,
  isFinal: true,
  homeName: "COPA XI",
  awayName: "RIVAL XI",
  homeFormation: "4-3-3",
  awayFormation: "4-3-3",
  homeSlots: slots,
  awaySlots: slots,
  homePlayers: home,
  awayPlayers: away,
  homePower: 83,
  awayPower: 81,
  score: [3, 1],
  homeWon: true,
  events: [
    { m: 14, home: true, name: "Home Player 9", type: "goal" },
    { m: 40, home: false, name: "Away Player 10", type: "goal" },
    { m: 72, home: true, name: "Home Player 10", type: "goal" },
    { m: 84, home: true, name: "Home Player 10", type: "goal" },
    { m: 76, home: true, name: "Home Player 4", type: "yellow" },
  ],
  homeRatings: [{ name: "Home Player 1", rating: 8.4 }],
  seed: 1234,
  motm: "Home Player 10",
});
if (!report || report.home.length !== 11 || report.away.length !== 11) throw new Error("Son maç ilk 11 snapshot'ı eksik");
if (report.home[0].rating !== 8.4 || report.home[0].rating === report.home[0].player.ov) throw new Error("Maç rating'i OVR'dan ayrı korunmuyor");
if (!report.home.every(item => item.rating >= 4.5 && item.rating <= 9.5) || !report.away.every(item => item.rating >= 4.5 && item.rating <= 9.5)) throw new Error("Maç rating aralığı geçersiz");
if (report.home[8].stats.goals !== 1 || report.home[9].stats.goals !== 2 || report.away[9].stats.goals !== 1 || report.home[3].stats.yellow !== 1) throw new Error("Gerçek event verisi oyunculara bağlanmadı");
if (report.motm.name !== "Home Player 10") throw new Error("Maçın oyuncusu snapshot'a bağlanmadı");

api.setPenalty("2–2", "5-4", true);
if (report.score.join("-") !== "2-2" || report.penalty.join("-") !== "5-4" || !report.homeWon) throw new Error("Penaltı sonucu son maç raporuna eklenmedi");

const container = { innerHTML: "", querySelectorAll: () => [] };
if (!api.render(container, report, { lang: "tr", result: { won: true } })) throw new Error("Son maç raporu render edilmedi");
const tokenCount = (container.innerHTML.match(/data-lmr-team=/g) || []).length;
if (tokenCount !== 22) throw new Error(`Yatay sahada 22 oyuncu bekleniyordu, bulunan ${tokenCount}`);
if (container.innerHTML.includes('class="xi"') || !container.innerHTML.includes("lmr-pitch")) throw new Error("Eski iki liste görünümü normal render akışında kaldı");
if (/\bclass="[^"]*\blmr-(?:header|summary|outcome)\b/.test(container.innerHTML)) throw new Error("Kaldırılan üst sonuç/alt özet blokları render akışında kaldı");
if (!container.innerHTML.includes("lmr-highlights")) throw new Error("Kompakt maç oyuncusu/rakip özeti saha içine taşınmadı");
if ((container.innerHTML.match(/class="lmr-goal-ball"/g) || []).length !== 4) throw new Error("Gol sayısı kadar top simgesi üretilmedi");
if (!container.innerHTML.includes('<span class="lmr-name">Player #1</span>')) throw new Error("Sayısal yapay oyuncu adı okunabilir gösterilmedi");

const index = read("index.html");
const lazyAssets = read("src/runtime/lazyAssets.js");
const finalSim = read("src/sim/finalSim.js");
const css = read("src/styles/match.css");
const sw = read("sw.js");
for (const marker of ["src/ui/lastMatchReport.js", "_captureLastMatchReportSnapshot", "LastMatchReport.render", "LastMatchReport.setPenalty"]) {
  if (!(index + lazyAssets).includes(marker)) throw new Error(`Run sonu bağlantısı eksik: ${marker}`);
}
for (const marker of ["homeRatings:window.lastMatchRatings", "homeSlots:_fmA", "awaySlots:_fmB"]) {
  if (!finalSim.includes(marker)) throw new Error(`Final simülasyonu snapshot bağlantısı eksik: ${marker}`);
}
for (const marker of [".last-match-report", ".lmr-pitch", ".lmr-player", ".lmr-highlights", ".lmr-goal-ball", 'html[data-theme="dark"]', "@media(max-width:760px)"]) {
  if (!css.includes(marker)) throw new Error(`Son maç responsive/dark stili eksik: ${marker}`);
}
if (!sw.includes('/src/ui/lastMatchReport.js')) throw new Error("Son maç raporu Service Worker önbelleğine eklenmedi");

console.log("Last-match report checks passed: mirrored 22-player pitch, event ratings, penalties, profiles and responsive UI.");
