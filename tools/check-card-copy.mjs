import fs from "node:fs";

const hub = fs.readFileSync("src/ui/hub.js", "utf8");
const i18n = fs.readFileSync("src/data/i18n.js", "utf8");
const html = fs.readFileSync("index.html", "utf8");
const cardBalance = fs.readFileSync("src/cards/cardBalance.js", "utf8");
const cardDefs = fs.readFileSync("src/cards/cardDefs.js", "utf8");
const power = fs.readFileSync("src/balance/power.js", "utf8");
const cardCss = fs.readFileSync("src/styles/cards.css", "utf8");
const cardReportTool = fs.existsSync("tools/card-balance-report.mjs")
  ? fs.readFileSync("tools/card-balance-report.mjs", "utf8")
  : "";
const visibleCopy = [hub, i18n, html].join("\n");

const forbiddenTierTerms = [
  [84, 69, 77, 75, 304, 78, 76, 304],
  [116, 101, 109, 107, 105, 110, 108, 105],
  [84, 101, 109, 107, 105, 110, 108, 105],
  [84, 69, 77, 75, 73, 78, 76, 73],
  [67, 69, 83, 85, 82],
  [99, 101, 115, 117, 114],
  [67, 101, 115, 117, 114],
].map((codes) => String.fromCodePoint(...codes));

const strikerMistakes = [`ST ${String.fromCodePoint(98, 97, 351, 305, 110, 97)}`];
const mojibakeMarkers = [0x00c2, 0x00c3, 0x00c4, 0x00c5].map((code) => String.fromCodePoint(code));
const unclearCardCopy = [
  "Kasığa Para",
  "Backhander",
  "Rakibi düşür",
  "Rakibi daha sert",
  "fiyat ve güven riski",
  "price/trust risk",
];

const checks = [
  {
    name: "round-scaling and lineup cards explain their actual trigger",
    pass:
      i18n.includes("Oyuncuları büyütmez; kartın takım gücü katkısı her tur artar") &&
      i18n.includes("Yalnız ilk 11'deki 32 yaş ve üzeri oyuncuları sayar") &&
      i18n.includes("İlk üç tur etkisizdir; yalnız büyük maçlarda açılır") &&
      hub.includes("Turnuva ritmini takım gücüne çevirir") &&
      !hub.includes("Sabit +3 güç; götürü yok"),
  },
  {
    name: "shop cards render selected variant description only",
    pass: /const desc=(?:formatCardDesc\()?shopCardDesc\(k,variantDesc\(cd\.d,sv\)\|\|shortCardText\(k,s\),sv\)/.test(hub),
  },
  {
    name: "card collection renders selected owned variant only",
    pass: /variantDesc\(cd\.d,v\)\|\|shortCardText\(k,s\)/.test(hub),
  },
  {
    name: "card popup renders selected owned variant only",
    pass: /variantDesc\(cd\.d,variantOf\(k\)\|\|0\)/.test(hub),
  },
  {
    name: "variant labels are fixed to COMMON and DARK",
    pass:
      /variantLbl:\["COMMON","DARK"\]/.test(i18n) &&
      /function variantBadge\(v\)\{const labels=\["COMMON","DARK"\]/.test(hub),
  },
  {
    name: "how-to explains only COMMON and DARK",
    pass: html.includes('_howtoTier("COMMON")') && html.includes('_howtoTier("DARK")'),
  },
  {
    name: "DARK market cards keep the softened black-white identity and readable price",
    pass:
      /#hub \.cardtile\.is-dark\{[^}]*background:(?:var\(--color-ink\)|linear-gradient)/s.test(cardCss) &&
      /#hub \.cardtile\.is-dark \.ct-name,[\s\S]*color:#FFFFFF/s.test(cardCss) &&
      /#hub \.cardtile\.is-dark \.ct-head-price,[\s\S]*background:#FFFFFF;[\s\S]*color:var\(--color-ink\)/s.test(cardCss),
  },
  {
    name: "forbidden card tier terms are absent from visible copy",
    pass: !forbiddenTierTerms.some((term) => visibleCopy.includes(term)),
  },
  {
    name: "Turkish striker card copy uses SNT instead of ST",
    pass: !strikerMistakes.some((term) => visibleCopy.includes(term)),
  },
  {
    name: "backroom pressure card copy stays explicit",
    pass: !unclearCardCopy.some((term) => visibleCopy.includes(term)),
  },
  {
    name: "lottery card explains automatic first-card coupon and immediate risk",
    pass:
      hub.includes("Önündeki 2 turda alacağın ilk kart en fazla €8M ucuzlar (min. €2M)") &&
      hub.includes("%20 ihtimalle hemen €3M masraf çıkar") &&
      cardBalance.includes("İlk kart · ${c.turns||2} tur: en fazla") &&
      !hub.includes('nasip_kismet:()=>sv===1?(tr?"€3M;'),
  },
  {
    name: "opponent-strength cards compare explicit POWER values",
    pass:
      hub.includes("Barikat eklenmeden önce rakibin GÜÇ değeri seninkinden yüksekse") &&
      hub.includes("Rakibin GÜÇ değeri seninkinden yüksekse +6") &&
      !hub.includes("Rakip güçlüyse") &&
      !hub.includes("Güçlü rakibe karşı") &&
      cardDefs.includes('squadPower(r,"gec_gec").power') &&
      power.includes("function powerBreakdown(r,excludedCard)") &&
      power.includes("if(k===excludedCard)return"),
  },
  {
    name: "card balance report generator is UTF-8 clean",
    pass: cardReportTool.includes("Kart Balance Tablosu") && !mojibakeMarkers.some((marker) => cardReportTool.includes(marker)),
  },
];

let failed = false;
for (const check of checks) {
  if (!check.pass) {
    failed = true;
    console.error(`card copy check failed: ${check.name}`);
  }
}

if (failed) process.exit(1);
console.log("Card copy OK: visible tier labels and variant descriptions are guarded.");
