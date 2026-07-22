import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const allowed = new Set([
  "#101D28", "#F24A28", "#DA3D2E", "#420102", "#F3F5F4", "#4E9B65",
  "#FFFFFF", "#E4E8E7", "#56616A", "#AE3D28", "#BC3F28", "#BCC2C2",
  "#7A858B", "#17242D", "#1F2B34", "#27343C", "#303C44", "#0A1118",
  "#AAB2B3", "#F25F40", "#3A4750", "#68757C",
  "#D6A21F", "#806000", "#1F6B45",
  "#6B4C72", "#FFF9E9", "#E5DDC9",
].map((value) => value.toUpperCase()));
const roots = ["src/styles", "src/ui", "src/cards"];
const files = ["index.html", "privacy.html", "terms.html", "src/sim/finalSim.js",
  "src/balance/difficulty.js", "src/state/gameState.js"];
for (const root of roots) {
  for (const entry of fs.readdirSync(path.join(ROOT, root), { withFileTypes: true })) {
    if (entry.isFile() && /\.(?:css|html|js)$/i.test(entry.name)) files.push(path.join(root, entry.name));
  }
}
const failures = [];
for (const relative of files) {
  const source = fs.readFileSync(path.join(ROOT, relative), "utf8");
  for (const match of source.matchAll(/(?<!&)#[\da-f]{3,8}\b/gi)) {
    let body = match[0].slice(1);
    if (body.length === 3 || body.length === 4) body = [...body].map((c) => c + c).join("");
    if (!allowed.has(`#${body.slice(0, 6)}`.toUpperCase())) failures.push(`${relative}: ${match[0]}`);
  }
  for (const match of source.matchAll(/\brgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/gi)) {
    const hex = `#${[match[1], match[2], match[3]].map((n) => Number(n).toString(16).padStart(2, "0")).join("")}`.toUpperCase();
    if (!allowed.has(hex)) failures.push(`${relative}: ${match[0]})`);
  }
}
if (failures.length) {
  console.error(`Palette audit failed (${failures.length}):\n${failures.slice(0, 30).join("\n")}`);
  process.exit(1);
}
console.log(`Palette audit passed across ${files.length} UI source files.`);
