import fs from "node:fs";

const html=fs.readFileSync(new URL("../index.html",import.meta.url),"utf8");
const locales=fs.readFileSync(new URL("../src/data/i18n.js",import.meta.url),"utf8");
const guide=fs.readFileSync(new URL("../src/ui/howtoGuide.js",import.meta.url),"utf8");
const arena=fs.readFileSync(new URL("../src/online/arena.js",import.meta.url),"utf8");
const lifeGuideCopy=guide.slice(0,guide.indexOf("const STATE_KEY"));
const obsoleteLifeTimeClaims=[/2 saat/i,/2 hours?/i,/transfer saati/i,/before the deadline/i];

const checks=[
  ["Life guide documents the round of 16",html.includes("ilk iki</b> Son 16")&&html.includes("top two</b> reach the round of 16")],
  ["Life guide documents the one-use undo exception",html.includes("bir kez geri alabilirsin")&&html.includes("undo the last normal transfer once")&&html.includes("Gizli Oyuncu")],
  ["All additional locales document the round of 16",locales.includes("avanzan a octavos")&&locales.includes("Achtelfinale")&&locales.includes("vanno agli ottavi")],
  ["All additional locales document undo",locales.includes("último fichaje normal")&&locales.includes("letzte normale Transfer")&&locales.includes("ultimo acquisto normale")],
  ["Life and Arena are separate guide products",guide.includes('data-guide-product="life"')&&guide.includes('data-guide-product="arena"')],
  ["Life guide covers current advanced systems",guide.includes("Hazırlık ve Taktik")&&guide.includes("Ödüller ve Serbest Oyuncular")&&guide.includes("Penaltı ve Final Akışı")&&guide.includes("Kulüp Kariyeri ve Miras")],
  ["Arena has complete localized guide data",["tr","en","es","de","it"].every(locale=>guide.includes(`${locale}:{`)||guide.includes(`${locale}: {`))&&guide.includes("Penalty zones")],
  ["Mobile guide uses compact navigation instead of a horizontal path",guide.includes("data-guide-step-select")&&!guide.includes("howto-path-wrap")],
  ["Arena exposes a permanent guide action",arena.includes('data-arena-action="guide"')&&arena.includes('openHowtoModal("arena")')],
  ["Guide records state and acknowledges tips explicitly",guide.includes("copa.guide.state.v3")&&guide.includes("dismissTip(true)")&&guide.includes("dismissTip(false)")],
  ["Life copy has no obsolete time-cost claims",obsoleteLifeTimeClaims.every(pattern=>!pattern.test(locales)&&!pattern.test(lifeGuideCopy))],
];

const failed=checks.filter(([,pass])=>!pass);
for(const [label,pass] of checks)console.log(`${pass?"PASS":"FAIL"} ${label}`);
if(failed.length)process.exitCode=1;
