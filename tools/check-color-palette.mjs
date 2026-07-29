import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const allowed = new Set([
  "#101D28", "#F24A28", "#DA3D2E", "#420102", "#F3F5F4", "#4E9B65",
  "#FFFFFF", "#E4E8E7", "#56616A", "#AE3D28", "#BC3F28", "#BCC2C2",
  "#7A858B", "#17242D", "#1F2B34", "#27343C", "#303C44", "#0A1118",
  "#AAB2B3", "#F25F40", "#3A4750", "#68757C",
  "#D6A21F", "#806000", "#1F6B45",
  // Approved dark-surface, contextual-status and data-viz extensions used by
  // the native QA surfaces and Copa Arena. They remain presentation-only and
  // do not replace the semantic aliases in palette.css.
  "#000000", "#0C1921", "#0E1C25", "#101E27", "#10271F", "#14232C",
  "#172731", "#173526", "#18392A", "#183F3A", "#19303D", "#1D303B",
  "#20303A", "#20352A", "#223540", "#223D4B", "#276A8B", "#2E3C45",
  "#302D1E", "#315547", "#33292A", "#33434D", "#34444E", "#351B1E",
  "#35434C", "#365D46", "#382728", "#3A2022", "#3A4A53", "#3B4B54",
  "#3C4D56", "#3D4951", "#3F4D56", "#40515A", "#41515B", "#45A7A2",
  "#46535C", "#4D92D6", "#4FAE70", "#52616A", "#557A8C", "#55A978",
  "#56656E", "#56BD7A", "#596871", "#5AAE76", "#5E8294", "#67423E",
  "#69591E", "#6CD391", "#70433F", "#72D292", "#73CB91", "#79D596",
  "#7DD3FC", "#806FD2", "#86D99B", "#87949A", "#8DC8E5", "#9A3E3B",
  "#AEB8BA", "#AEB9BD", "#B6C0C4", "#BCC5C7", "#C0C9CD", "#C4CCCD",
  "#C4CDD0", "#D39B31", "#D63D2E", "#D7EDF5", "#DBE2E4", "#DDE3E2",
  "#DDF3E3", "#DF4B48", "#E35B69", "#E3F3F8", "#F0C44D", "#F25D42",
  "#F4F7F7", "#FF4B2B", "#FF5938", "#FF5A38", "#FF7168", "#FF765D",
  "#FF806B", "#FF9A86",
  // Mode-gate and Arena identity palette. These remain isolated to the two
  // branded premium surfaces and deliberately share the same dark/gold/status family.
  "#040B10", "#070D12", "#07131D", "#091117", "#0C1923", "#0D1C28",
  "#111D24", "#171A1D", "#1A2A36", "#4285F4", "#53C07A", "#71818C",
  "#74838C", "#81909A", "#84939C", "#8997A0", "#8D9BA5", "#98A5AD",
  "#AAB4BA", "#CF9D26", "#D9C88F", "#E2B238", "#E3B83F", "#EE806B",
  "#F4D879", "#F4F6F7", "#F5F6F7", "#F6F1E5", "#FFE697",
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
