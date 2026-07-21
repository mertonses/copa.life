import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const ROOT = path.resolve(import.meta.dirname, "..");
const read = file => fs.readFileSync(path.join(ROOT, file), "utf8");
function load(file, expression) {
  const context = {};
  vm.createContext(context);
  vm.runInContext(`${read(file)}\nthis.__value=${expression};`, context);
  return context.__value;
}
function expect(condition, message) { if (!condition) throw new Error(message); }

const pool = load("src/data/players_japan.js", "POOL_JP");
expect(Array.isArray(pool) && pool.length === 561, `Japonya oyuncu sayısı: ${pool?.length}`);
expect(new Set(pool.map(player => player[3])).size === 20, "Japonya havuzunda 20 kulüp bulunmalı");
for (const role of ["GK", "DEF", "MID", "FWD"]) expect(pool.some(player => player[2] === role), `Japonya ${role} grubu eksik`);
for (const player of pool) {
  expect(player.length === 10, `Geçersiz Japonya tuple şeması: ${player[0]}`);
  expect(typeof player[0] === "string" && player[0], "Oyuncu adı eksik");
  expect(Number.isInteger(player[1]) && player[1] >= 52 && player[1] <= 82, `Geçersiz güç: ${player[0]}`);
  expect(Number.isInteger(player[4]) && player[4] >= 15 && player[4] <= 45, `Geçersiz yaş: ${player[0]}`);
  expect(player[5] === 0 || player[5] === 1, `Geçersiz yerli alanı: ${player[0]}`);
  expect(["GK","CB","LB","RB","DM","CM","LM","RM","AM","LW","RW","ST"].includes(player[7]), `Geçersiz doğal mevki: ${player[0]}`);
  expect(Number.isInteger(player[8]) && player[8] >= player[1] && player[8] <= 86, `Geçersiz potansiyel: ${player[0]}`);
  expect(player[9] === 1, `Geçersiz lig seviyesi: ${player[0]}`);
}

const opponents = load("src/data/opponents.js", "[OPP_POOL_JP,OPP_BASES_JP]");
expect(opponents[0].length === 20 && opponents[1].length === 6, "Japonya rakip/fikstür verisi eksik");
const clubs = new Set(pool.map(player => player[3]));
expect(opponents[0].every(club => clubs.has(club)), "Rakip havuzunda oyuncu verisi olmayan Japon kulübü var");

const profiles = JSON.parse(read("assets/data/copa/player_profiles.json"));
const jpProfiles = Object.entries(profiles.records).filter(([key]) => key.startsWith("JP|"));
expect(jpProfiles.length === pool.length, `Japonya profil kapsamı ${jpProfiles.length}/${pool.length}`);
for (const field of ["copa_impact", "copa_build_up", "copa_space_control", "copa_duels", "copa_engine", "copa_pressure_decision", "position_fit", "preferred_foot", "best_position", "positions"]) {
  expect(profiles.fields.includes(field), `Japonya profil alanı eksik: ${field}`);
}
const footIndex = profiles.fields.indexOf("preferred_foot");
expect(jpProfiles.every(([, values]) => String(values[footIndex] || "").trim()), "Ayak bilgisi eksik Japonya profili var");

const html = read("index.html");
const css = read("src/styles/layout.css");
const ghost = read("src/online/ghostClubs.js");
const persistence = read("src/state/runPersistence.js");
const sw = read("sw.js");
expect(persistence.includes('[2,3,4,5,6].includes(version)'), "Legacy/current save migration is missing from runPersistence");
for (const marker of [
  'data-country="JP"', 'class="country-new-ribbon"', 'assets/flags/JP.svg',
  'src/data/players_japan.js', 'JP:[POOL_JP,OPP_POOL_JP]', 'if(k==="JP")return[POOL_JP,OPP_POOL_JP,OPP_BASES_JP]',
  'src/data/opponents.js?v=20260714-japan1', 'src/data/logos.js?v=20260714-japan1',
  'src/game/generate.js?v=20260720-player-balance1', 'src/ui/hub.js?v=',
  'src/styles/layout.css?v=',
  'country:selectedCountry', 'COUNTRY_CODES.includes(st.country)',
  'JP:"JAPONYA KUPASI FİNALİ"', 'JP:"JAPAN CUP FINAL"',
]) expect(html.includes(marker), `Japonya runtime bağlantısı eksik: ${marker}`);
expect(html.indexOf("src/data/players_japan.js") < html.indexOf("src/game/generate.js"), "Japonya havuzu generate.js öncesinde yüklenmeli");
expect(/COUNTRY_CODES\.filter[\s\S]{0,300}Math\.random/.test(html), "Rastgele Başla ülke havuzunu kullanmıyor");
for (const marker of ["repeat(6,minmax(0,1fr))", ".country-new-ribbon", 'html[data-theme="dark"] .country-new-ribbon', "repeat(3,minmax(0,1fr))"]) {
  expect(css.includes(marker), `Japonya responsive/dark stil eksik: ${marker}`);
}
expect(read("assets/flags/JP.svg").includes('viewBox="0 0 3 2"'), "Japonya bayrağı 3:2 değil");
expect(sw.includes('"/src/data/players_japan.js"') && sw.includes('"/assets/flags/JP.svg"'), "Japonya PWA önbelleği eksik");
expect(ghost.includes('country:cleanText(context.selectedCountry||context.country||"TR").slice(0,8)'), "Hayalet Kulüp ülke serialize yolu eksik");
expect(ghost.includes("ghostMeta:{country:cleanText(snapshot.club&&snapshot.club.country)"), "Hayalet Kulüp ülke deserialize yolu eksik");

console.log("Japan country OK: 561 oyuncu, 20 kulüp, profil/save/seed/ghost ve responsive UI bağlantıları doğrulandı.");
