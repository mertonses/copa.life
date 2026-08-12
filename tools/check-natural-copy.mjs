import fs from "node:fs";
import vm from "node:vm";

const root = process.cwd();
const required = ["tr", "en", "es", "de", "it"];
const source = fs.readFileSync(`${root}/src/data/i18n.js`, "utf8");
const context = {
  console,
  Intl,
  window: {},
  document: undefined,
  navigator: { language: "en" },
  localStorage: { getItem() { return null; }, setItem() {} },
};
vm.createContext(context);
vm.runInContext(`${source}\nthis.__locales=T;`, context);

const forbidden = [
  /\?{2,}/,
  /YAPAY ZEKÂ|AI PRACTICE|ENTRENAMIENTO IA|ALLENAMENTO IA/i,
  /SYSTEM CLUB|SYSTEMCLUB|SİSTEM KULÜBÜ|CLUB DEL SISTEMA|CLUB DI SISTEMA/i,
  /server-authoritative|sunucu otoriteli|servergesteuertes/i,
  /RİSK PROTOKOLÜ|RISK PROTOCOL|COEFFICIENT|KATSAYI/i,
  /TRANSFER CENTRE|TRANSFER CENTER/i,
];
const exceptions = /^(COMMON|DARK|SEED)$/;
const failures = [];

function inspect(value, path) {
  if (typeof value === "string") {
    if (exceptions.test(value.trim())) return;
    for (const pattern of forbidden) {
      if (pattern.test(value)) failures.push(`${path}: ${value}`);
    }
    return;
  }
  if (typeof value === "function") {
    const samples = ["4-3-3", "A", "B", 3, "Player", true, 1, "babacan"];
    try { inspect(value(...samples), `${path}()`); } catch {}
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => inspect(item, `${path}[${index}]`));
    return;
  }
  if (value && typeof value === "object") {
    Object.entries(value).forEach(([key, item]) => inspect(item, `${path}.${key}`));
  }
}

for (const language of required) {
  if (!context.__locales[language]) failures.push(`missing locale: ${language}`);
  else inspect(context.__locales[language], language);
}

if (failures.length) {
  console.error("Natural copy check failed:");
  failures.slice(0, 80).forEach(item => console.error(`- ${item}`));
  process.exit(1);
}

console.log(`Natural copy OK: ${required.length} locales checked; COMMON, DARK and SEED remain permitted.`);
