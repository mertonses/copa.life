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
if (!html.includes('{id:"star",place:[91,99,"fee"]}')) failures.push("chairman star signing is not guaranteed above 90");
if (!i18n.includes('sale:i=>["Takımın adası satıldı"')) failures.push("Patron island-sale copy is missing");
if (!i18n.includes("bu maç -2 güç")) failures.push("sponsor result does not disclose the -2 power effect");
if (html.includes("showKaosPeek") || html.includes("_declineKaos")) failures.push("removed Professor odds/decline functions still exist");
if (html.includes("_kaosStartRoll(true)") || html.includes("_kaosStartRoll(false)")) failures.push("Professor roll still carries peek state");
if (html.includes("PAS GE\\u00c7") || html.includes(">PASS<")) failures.push("Professor chaos offer can still be declined");
if (html.includes("Spotlight MOTM") || html.includes("Manşet primi") || html.includes("Headline bonus")) failures.push("removed Showman cash bonuses still exist");
if (!html.includes('chairmanReactToSpend(a.fee,"transfer",a.p)')) failures.push("free-agent signing bypasses chairman spending reaction");
if (!html.includes("eventSeen.nephewDecision=true") || html.includes("rand()<0.12")) failures.push("Torpilci can still trigger a second nephew offer");
if (!html.includes("Math.min(3,80-p.ov)")) failures.push("accepted nephew does not develop by up to +3 each round");
if (!html.includes('trackChairmanMetric(homeWon?"penaltyWins":"penaltyLosses",1)')) failures.push("penalty outcome chairman telemetry is missing");
if (!html.includes("chairTrust=Math.min(3,chairTrust+2)")) failures.push("penalty win does not restore normal-win chairman trust");
if (!html.includes('fixtures[round-1].res=homeWon?"W":"L"')) failures.push("penalty result is not recorded as a normal win/loss");

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log(`Chairman events OK: ${required.length} conditional/personality-weighted events checked.`);
