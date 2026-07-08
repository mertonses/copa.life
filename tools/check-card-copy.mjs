import fs from "node:fs";

const hub = fs.readFileSync("src/ui/hub.js", "utf8");
const i18n = fs.readFileSync("src/data/i18n.js", "utf8");
const html = fs.readFileSync("index.html", "utf8");

const checks = [
  {
    name: "shop cards render selected variant description only",
    pass: /const desc=shopCardDesc\(k,variantDesc\(cd\.d,sv\)\|\|shortCardText\(k,s\)\)/.test(hub),
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
