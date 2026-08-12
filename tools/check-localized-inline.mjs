import fs from "node:fs";
import vm from "node:vm";

const source = fs.readFileSync("index.html", "utf8");
const i18n = fs.readFileSync("src/data/i18n.js", "utf8");
const inline = fs.readFileSync("src/data/inlineCopy.js", "utf8");
const context = {
  console,
  Intl,
  window: { COPA_INLINE_COPY: {} },
  document: undefined,
  navigator: { language: "en" },
  localStorage: { getItem() { return null; }, setItem() {} },
};
vm.createContext(context);
vm.runInContext(`${i18n}\n${inline}`, context);

const calls = [];
const pattern = /CopaText\(("(?:\\.|[^"\\])*"),("(?:\\.|[^"\\])*")\)/g;
let match;
while ((match = pattern.exec(source))) calls.push([JSON.parse(match[1]), JSON.parse(match[2])]);

const missing = [];
for (const [tr, en] of calls) {
  for (const language of ["tr", "en", "es", "de", "it"]) {
    vm.runInContext(`LANG=${JSON.stringify(language)}`, context);
    const value = context.CopaText(tr, en);
    if (!value || /\?{2,}/.test(value)) missing.push(`${language}: ${en}`);
  }
}

if (missing.length) {
  console.error("Localized inline copy check failed:");
  missing.slice(0, 80).forEach(item => console.error(`- ${item}`));
  process.exit(1);
}

console.log(`Localized inline copy OK: ${calls.length} calls × 5 locales.`);
