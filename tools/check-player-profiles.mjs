import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const ROOT = path.resolve(import.meta.dirname, "..");
const PLAYER_SOURCES = {
  TR: ["src/data/players.js", "POOL"],
  ENG: ["src/data/players_england.js", "POOL_EN"],
  ES: ["src/data/players_spain.js", "POOL_ES"],
  IT: ["src/data/players_italy.js", "POOL_IT"],
  DE: ["src/data/players_germany.js", "POOL_DE"],
  JP: ["src/data/players_japan.js", "POOL_JP"],
};

function normalize(value) {
  return String(value || "")
    .toLocaleLowerCase("tr-TR")
    .replaceAll("ı", "i").replaceAll("ł", "l").replaceAll("ø", "o")
    .replaceAll("ð", "d").replaceAll("þ", "th").replaceAll("đ", "d")
    .replaceAll("æ", "ae").replaceAll("œ", "oe").replaceAll("ß", "ss")
    .normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
}

function loadPoolRows(relativePath, variable, country) {
  const context = {};
  vm.createContext(context);
  vm.runInContext(`${fs.readFileSync(path.join(ROOT, relativePath), "utf8")}\nthis.__pool=${variable};`, context);
  return context.__pool.map(tuple => ({
    country,
    tuple,
    key: [country, normalize(tuple[0]), Number(tuple[4]) || 0, normalize(tuple[3])].join("|"),
  }));
}

const profileData = JSON.parse(fs.readFileSync(path.join(ROOT, "assets/data/fm26/player_profiles.json"), "utf8"));
const fields = profileData.fields;
const records = profileData.records;
if (!Array.isArray(fields) || fields.length !== 39) throw new Error(`Beklenen 39 profil alanı, bulunan: ${fields?.length}`);
if (!records || typeof records !== "object") throw new Error("PLAYER_PROFILES bulunamadı");

const poolRows = Object.entries(PLAYER_SOURCES).flatMap(([country, [file, variable]]) => loadPoolRows(file, variable, country));
const validKeys = new Set(poolRows.map(row => row.key));
const numericFields = new Set([
  "acceleration", "rushing_out", "passing", "bravery", "command_of_area", "agility", "handling",
  "aerial_reach", "crossing", "kicking", "tackling", "free_kicks", "dribbling", "natural_fitness",
  "decisions", "heading", "leadership", "strength", "pace", "off_the_ball", "flair", "aggression",
  "work_rate", "composure", "reflexes", "finishing", "one_on_ones", "penalties", "long_shots",
  "stamina", "injury_proneness",
]);

const counts = { TR: 0, ENG: 0, ES: 0, IT: 0, DE: 0, JP: 0 };
for (const [key, values] of Object.entries(records)) {
  if (!validKeys.has(key)) throw new Error(`Kopa havuzunda olmayan profil anahtarı: ${key}`);
  if (!Array.isArray(values) || values.length !== fields.length) throw new Error(`Eksik profil alanı: ${key}`);
  counts[key.split("|")[0]]++;
  fields.forEach((field, index) => {
    const value = values[index];
    if (!numericFields.has(field) || value === null) return;
    if (!Number.isFinite(value) || value < 1 || value > 20) throw new Error(`Geçersiz ${field}=${value}: ${key}`);
  });
}
if (Object.values(counts).some(count => count === 0)) throw new Error(`Bir veya daha fazla ülke profilsiz: ${JSON.stringify(counts)}`);

const indexHtml = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
const hubUi = fs.readFileSync(path.join(ROOT, "src/ui/hub.js"), "utf8");
const profileUi = fs.readFileSync(path.join(ROOT, "src/ui/playerProfiles.js"), "utf8");
const profileCss = fs.readFileSync(path.join(ROOT, "src/styles/playerProfiles.css"), "utf8");
const profileStore = fs.readFileSync(path.join(ROOT, "src/data/player_profile_store.js"), "utf8");
const serviceWorker = fs.readFileSync(path.join(ROOT, "sw.js"), "utf8");
const generator = fs.readFileSync(path.join(ROOT, "src/game/generate.js"), "utf8");
const ghostClient = fs.readFileSync(path.join(ROOT, "src/online/ghostClubs.js"), "utf8");
for (const asset of ["src/ui/playerProfiles.js", "src/styles/playerProfiles.css"]) {
  if (!indexHtml.includes(asset)) throw new Error(`Profil arayüz varlığı index.html içinde yüklenmiyor: ${asset}`);
}
for (const marker of ["HOVER_OPEN_MS=320", "DOUBLE_TAP_MS=320", "keeperGroups", "normalizedCache", "setDragging", "aria-labelledby", "attributeContainers", "RADAR_DEFINITIONS", "PROFILE_INSIGHT_RULES", "playStyleFor", "analysisFor", "radarHtml", "noAttributes", "loadError", "data-profile-retry", "retryCurrent", "_normalizeForTest", "_renderForTest"]) {
  if (!profileUi.includes(marker)) throw new Error(`Profil etkileşimi eksik: ${marker}`);
}
for (const marker of ["PLAYER_PROFILE_IDENTITY_INDEX", "PLAYER_PROFILE_NAME_CLUB_INDEX", "PLAYER_PROFILE_MAX_ATTEMPTS=2", "retryPlayerProfiles", "playerProfileLoadState", "playerProfileResolveKeyAsync", "playerProfileForPlayerAsync", "source_type:\"full_record\""]) {
  if (!profileStore.includes(marker)) throw new Error(`Profil kimlik çözümlemesi eksik: ${marker}`);
}
if (!generator.includes("o.profileKey=playerProfileKey") || generator.includes("enumerable:false")) throw new Error("Oyuncu profileKey alanı save/copy sırasında korunmuyor");
for (const marker of ["profile_key:cleanProfileKey", "profileKey:cleanProfileKey", "nat_pos", "club:cleanText(p.club", "age:Math.round"]) {
  if (!ghostClient.includes(marker)) throw new Error(`Hayalet Kulüp profil kimliği eksik: ${marker}`);
}
for (const marker of ["PlayerProfiles.bind(b,o", "PlayerProfiles.bind(r,p)", "scout-node[data-profile-player-index]", "backup-card[data-profile-player-index]", "cap-card[data-profile-player-index]", "pc-pl[data-profile-player-index]", ".ss-scorer", "data-profile-event-index"]) {
  if (!indexHtml.includes(marker)) throw new Error(`Profil yüzeyi eksik: ${marker}`);
}
for (const marker of [".spot-card", "data-bench-idx", "PlayerProfiles.setDragging(true)"]) {
  if (!hubUi.includes(marker)) throw new Error(`Hub profil yüzeyi eksik: ${marker}`);
}
for (const marker of ["(hover:none)", "(pointer:coarse)", ".player-profile-stat-grid", ".player-profile-backdrop", ".player-profile-radar-area", ".player-profile-insight-grid", ".player-profile-state", ".player-profile-state.is-error"]) {
  if (!profileCss.includes(marker)) throw new Error(`Profil responsive stili eksik: ${marker}`);
}
for (const marker of ["/assets/data/fm26/player_profiles.json", "PLAYER_PROFILE_PATH", "ignoreSearch: true"]) {
  if (!serviceWorker.includes(marker)) throw new Error(`Profil Service Worker önbelleği eksik: ${marker}`);
}

const storeContext = { fetch: async () => ({ ok: true, json: async () => profileData }), console, setTimeout };
vm.createContext(storeContext);
vm.runInContext(profileStore, storeContext);
const sampleRow = poolRows.find(row => Object.hasOwn(records, row.key));
if (!sampleRow) throw new Error("Profil çözümleme testi için oyuncu bulunamadı");
const [sampleName, , , sampleClub, sampleAge] = sampleRow.tuple;
const resolvedExplicit = await storeContext.playerProfileResolveKeyAsync({ profileKey: sampleRow.key }, "TR");
if (resolvedExplicit !== sampleRow.key) throw new Error("profileKey ile doğrudan çözümleme başarısız");
const resolvedLegacy = await storeContext.playerProfileResolveKeyAsync({ name: sampleName, club: sampleClub, age: sampleAge }, "");
if (resolvedLegacy !== sampleRow.key) throw new Error("Eski compact oyuncu için benzersiz kimlik çözümlemesi başarısız");
const noNameOnlyMatch = await storeContext.playerProfileResolveKeyAsync({ name: sampleName }, "");
if (noNameOnlyMatch !== null) throw new Error("Profil çözümleyici yalnızca ada göre tahmin yapmamalı");
const fullRecord = await storeContext.playerProfileForPlayerAsync({ profileKey: sampleRow.key }, sampleRow.country);
if (!fullRecord || fullRecord.profile_key !== sampleRow.key || fullRecord.source_type !== "full_record") throw new Error("Tam profil kaydı yüklenemedi");

let retryCalls = 0;
const retryStoreContext = {
  console,
  setTimeout,
  fetch: async () => {
    retryCalls++;
    if (retryCalls === 1) throw new Error("temporary network error");
    return { ok: true, json: async () => profileData };
  },
};
vm.createContext(retryStoreContext);
vm.runInContext(profileStore, retryStoreContext);
await retryStoreContext.loadPlayerProfiles();
if (retryCalls !== 2 || !retryStoreContext.playerProfileLoadState().loaded) throw new Error("Profil yükleyici geçici ağ hatasından sonra yeniden denemedi");

let failedCalls = 0;
const failedStoreContext = { console, setTimeout, fetch: async () => { failedCalls++; throw new Error("offline"); } };
vm.createContext(failedStoreContext);
vm.runInContext(profileStore, failedStoreContext);
await failedStoreContext.loadPlayerProfiles().then(() => { throw new Error("Profil yükleme hatası yutuldu"); }, () => {});
const failedState = failedStoreContext.playerProfileLoadState();
if (failedCalls !== 2 || !failedState.error || failedState.error.code !== "PLAYER_PROFILE_LOAD_FAILED") throw new Error("Profil yükleme hatası eksik profilden ayrı raporlanmıyor");

const inert = () => {};
const uiContext = {
  console,
  document: { addEventListener: inert },
  performance: { now: () => 0 },
  location: { hostname: "example.test", search: "" },
  addEventListener: inert,
  matchMedia: () => ({ matches: false }),
  LANG: "tr",
  selectedCountry: sampleRow.country,
  ovCol: value => `tone-${value}`,
};
uiContext.window = uiContext;
vm.createContext(uiContext);
vm.runInContext(profileUi, uiContext);
const normalizeProfile = uiContext.PlayerProfiles._normalizeForTest;
const renderProfile = uiContext.PlayerProfiles._renderForTest;
const outfieldProfile = Object.freeze({
  labels: Object.freeze({ acceleration: "Hızlanma", pace: "Hız", passing: "Pas", composure: "Soğukkanlılık" }),
  attributes: Object.freeze({ acceleration: 0, pace: 20, technical: Object.freeze({ passing: 17, tackling: null, finishing: Number.NaN }) }),
  mental: Object.freeze({ composure: 16 }),
});
const outfield = normalizeProfile(Object.freeze({ name: "Test Outfield", natPos: "STP", ov: 80 }), outfieldProfile);
if (outfield.groups.map(group => group.key).join(",") !== "physical,technical,mental") throw new Error("Saha oyuncusu özellik grupları yanlış");
if (!outfield.groups.flatMap(group => group.items).some(item => item.key === "acceleration" && item.value === 0)) throw new Error("Sıfır özellik değeri korunmadı");
if (outfield.groups.flatMap(group => group.items).some(item => item.value === null || !Number.isFinite(item.value))) throw new Error("Geçersiz özellik panelde görünüyor");
if (!outfield.attributeContainers.includes("attributes.technical") || !outfield.attributeContainers.includes("mental")) throw new Error("İç içe özellik kapları okunmadı");

const keeper = normalizeProfile(
  Object.freeze({ name: "Test Keeper", natPos: "KL", ov: 78 }),
  Object.freeze({ goalkeeper: Object.freeze({ handling: 15, reflexes: 18, one_on_ones: 14 }), physical: Object.freeze({ agility: 13 }), mental: Object.freeze({ decisions: 12 }) })
);
if (keeper.groups.map(group => group.key).join(",") !== "goalkeeping,physical,mental") throw new Error("Kaleci özellik grupları yanlış");
if (keeper.groups.some(group => group.key === "technical")) throw new Error("Kaleci panelinde saha oyuncusu teknik grubu gösteriliyor");
const missing = normalizeProfile(Object.freeze({ name: "Synthetic", natPos: "OS", ov: 60 }), Object.freeze({}));
if (missing.hasAttributes || missing.groups.length) throw new Error("Verisiz oyuncu için boş durum üretilemedi");
const loadFailure = normalizeProfile(Object.freeze({ name: "Offline", natPos: "OS", ov: 60 }), null, { loadError: new Error("offline") });
const loadFailureHtml = renderProfile(loadFailure);
if (!loadFailure.loadError || !loadFailureHtml.includes("data-profile-retry") || loadFailureHtml.includes("player-profile-state is-empty")) throw new Error("Yükleme hatası yanlışlıkla eksik profil gibi gösteriliyor");

const bestPositionIndex = fields.indexOf("best_position");
const outfieldKey = Object.keys(records).find(key => records[key][bestPositionIndex] !== "KL");
const keeperKey = Object.keys(records).find(key => records[key][bestPositionIndex] === "KL");
const actualOutfieldProfile = await storeContext.playerProfileByKeyAsync(outfieldKey);
const actualKeeperProfile = await storeContext.playerProfileByKeyAsync(keeperKey);
const actualOutfield = normalizeProfile(Object.freeze({ name: "Actual Outfield", natPos: actualOutfieldProfile.best_position, ov: 80, profileKey: outfieldKey }), actualOutfieldProfile);
const actualKeeper = normalizeProfile(Object.freeze({ name: "Actual Keeper", natPos: "KL", ov: 80, profileKey: keeperKey }), actualKeeperProfile);
if (actualOutfield.radar.map(cluster => cluster.key).join(",") !== "attack,technique,physical,mental,defense,aerial") throw new Error("Saha oyuncusu radar eksenleri yanlış");
if (actualKeeper.radar.map(cluster => cluster.key).join(",") !== "reflex,positioning,aerial,oneOnOne,distribution,physical") throw new Error("Kaleci radar eksenleri yanlış");
if (!actualOutfield.radarReady || !actualKeeper.radarReady || !actualKeeper.goalkeeperProfile || actualOutfield.goalkeeperProfile) throw new Error("Saha oyuncusu/kaleci radar ayrımı başarısız");
const expectedAttack = Math.round([actualOutfieldProfile.finishing, actualOutfieldProfile.long_shots, actualOutfieldProfile.off_the_ball, actualOutfieldProfile.penalties].reduce((a, b) => a + b, 0) / 4 * 5);
if (actualOutfield.radar.find(cluster => cluster.key === "attack").value !== expectedAttack) throw new Error("Radar cluster ortalaması gerçek statlardan hesaplanmıyor");
const allowedRadarFields = new Set(fields);
for (const cluster of actualOutfield.radar.concat(actualKeeper.radar)) {
  if (cluster.fields.some(field => !allowedRadarFields.has(field))) throw new Error(`Radar hayali alan kullanıyor: ${cluster.key}`);
}
if (!actualOutfield.playStyle || !actualKeeper.playStyle) throw new Error("Deterministik oyuncu tarzı üretilemedi");
const repeatedOutfield = normalizeProfile(Object.freeze({ name: "Actual Outfield", natPos: actualOutfieldProfile.best_position, ov: 80, profileKey: outfieldKey }), actualOutfieldProfile);
if (JSON.stringify({ radar: actualOutfield.radar, strengths: actualOutfield.strengths, weaknesses: actualOutfield.weaknesses, playStyle: actualOutfield.playStyle, analysis: actualOutfield.analysis }) !== JSON.stringify({ radar: repeatedOutfield.radar, strengths: repeatedOutfield.strengths, weaknesses: repeatedOutfield.weaknesses, playStyle: repeatedOutfield.playStyle, analysis: repeatedOutfield.analysis })) throw new Error("Profil özeti aynı input için deterministik değil");
if (actualOutfield.analysis && actualOutfield.analysis.split(/[.!?]+/).filter(Boolean).length > 2) throw new Error("Kısa analiz iki cümleyi aşıyor");
const actualOutfieldHtml = renderProfile(actualOutfield);
if (!actualOutfieldHtml.includes("player-profile-radar-area") || !actualOutfieldHtml.includes("player-profile-style") || !actualOutfieldHtml.includes("player-profile-stat-grid")) throw new Error("Radar/rol/detay katmanları birlikte render edilmiyor");
if (actualOutfield.secondaryPositions.includes(actualOutfield.position)) throw new Error("Ana mevki yan mevkilerde tekrar ediliyor");
if (actualOutfieldProfile.cons && actualOutfieldProfile.cons !== "Bilinmiyor" && !actualOutfield.weaknesses.some(item => item.label === actualOutfieldProfile.cons)) throw new Error("Gerçek profil eksi alanı doğrudan kullanılmıyor");
const customRadarProfile = Object.freeze({
  finishing: 20, off_the_ball: 10, passing: 12, pace: 0, decisions: 8, tackling: 6, heading: 4,
  labels: Object.freeze({}), best_position: "ST (M)", positions: "ST (M)", preferred_foot: "Sadece Sağ Ayaklı",
});
const customRadar = normalizeProfile(Object.freeze({ name: "Cluster Test", natPos: "ST (M)", ov: 70 }), customRadarProfile);
if (!customRadar.radarReady || customRadar.radar.find(cluster => cluster.key === "attack").value !== 75 || customRadar.radar.find(cluster => cluster.key === "physical").value !== 0) throw new Error("Eksik alanları dışlayan veya sıfırı koruyan radar hesabı başarısız");
if (!customRadar.weaknesses.some(item => item.id === "oneFooted")) throw new Error("Tek config threshold trait sistemi çalışmıyor");

console.log(`Player profiles OK: ${Object.keys(records).length} kayıt (${Object.entries(counts).map(([country, count]) => `${country} ${count}`).join(", ")}); kimlik ve normalize testleri geçti.`);
