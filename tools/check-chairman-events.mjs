import fs from "node:fs";

const html = fs.readFileSync("index.html", "utf8");
const i18n = fs.readFileSync("src/data/i18n.js", "utf8");
const required = ["federation", "ffp", "fans", "investigation", "management", "youth"];
const failures = [];

for (const id of required) {
  if (!html.includes(`{id:"${id}"`)) failures.push(`missing event: ${id}`);
  if (!i18n.includes(`${id}:i=>[`)) failures.push(`missing localized result: ${id}`);
}

for (const id of ["federation", "ffp", "investigation", "management", "youth"]) {
  const eventStart = html.indexOf(`{id:"${id}"`);
  const eventEnd = html.indexOf("},", eventStart);
  const eventText = html.slice(eventStart, eventEnd + 2);
  if (!eventText.includes("eligible:")) failures.push(`event is not conditional: ${id}`);
}

const chairmanLines = html.match(/\{id:"(?:babacan|leydi|pinti|sansasyoncu|torpilci)"[^\n]+/g) || [];
if (chairmanLines.length !== 5) failures.push("chairman weight table is incomplete");
for (const line of chairmanLines) {
  for (const id of required) {
    if (!line.includes(`${id}:`)) failures.push(`chairman weight missing for ${id}`);
  }
}

const objectionDefinitions = (html.match(/function _cilginItiraz\(/g) || []).length;
if (objectionDefinitions !== 1) failures.push(`expected one _cilginItiraz, found ${objectionDefinitions}`);

if (!html.includes("PRESIDENT_RISK_CARDS")) failures.push("risky card audit missing");
if (!html.includes("availableChairmanReplacements")) failures.push("management replacement guard missing");

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log(`Chairman events OK: ${required.length} conditional/personality-weighted events checked.`);
