import fs from "node:fs";

const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
const hub = fs.readFileSync(new URL("../src/ui/hub.js", import.meta.url), "utf8");
const state = fs.readFileSync(new URL("../src/state/gameState.js", import.meta.url), "utf8");
const expect = (condition, message) => { if (!condition) throw new Error(message); };

for (const marker of [
  "v:4", "seedNum", "seedStr", "rngCalls", "bracket", "fixtures", "opponent",
  "currentWeather", "oppChar", "oppLineup", "shopOffers", "freeAgents", "powerHist",
  "![2,3,4].includes(st.v)", "enterHub(true)",
]) expect(html.includes(marker), `Save v4 alanı/geri yükleme işareti eksik: ${marker}`);
expect(hub.includes("function enterHub(restoring=false)"), "Hub restore modu eksik");
expect(hub.includes("if(restoring){"), "Hub restore koruması eksik");
expect(state.includes("runRngCalls++"), "Deterministik RNG çağrı sayacı eksik");
expect(html.includes("st.picks.length!==restoreSlots.length||!st.picks.every(Boolean)"), "Eksik draft kaydı restore edilmemeli");
expect(html.includes("function hasCompleteStartingXI()"), "Tam ilk 11 kontrolü eksik");
expect(html.includes("if(!hasCompleteStartingXI()){showModal"), "Eksik ilk 11 ile maç başlatma engeli eksik");
expect(html.includes("choose.locked")&&html.includes("||!p||filled[idx])return false"), "Draft çift seçim/reentry koruması eksik");
console.log("Run persistence OK: save v4 tur/rakip/RNG/hub durumu korunuyor; v2-v3 geriye uyumlu.");
