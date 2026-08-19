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
  "#53616A", "#56656E", "#56BD7A", "#596871", "#5AAE76", "#5E8294", "#67423E",
  "#69591E", "#6CD391", "#70433F", "#72D292", "#73CB91", "#79D596",
  "#7DD3FC", "#806FD2", "#86D99B", "#87949A", "#8DC8E5", "#9A3E3B",
  "#AEB8BA", "#AEB9BD", "#B6C0C4", "#BCC5C7", "#C0C9CD", "#C4CCCD",
  "#C4CDD0", "#C9D0CF", "#D39B31", "#D63D2E", "#D7EDF5", "#DBE2E4", "#DDE3E2",
  "#DDF3E3", "#DF4B48", "#E35B69", "#E3F3F8", "#F0C44D", "#F25D42",
  "#F4F7F7", "#FF4B2B", "#FF5938", "#FF5A38", "#FF7168", "#FF765D",
  "#FF806B", "#FF9A86",
  // Premium market/card-face palette. These tones are intentionally retained
  // for stamp ink, paper texture, motion overlays and card-edge gradients.
  "#06121D", "#081624", "#0E1E2A", "#102A3B", "#102A42", "#12232F",
  "#182B39", "#1A2D3B", "#1B303D", "#1C2D38", "#1D303A", "#202B34",
  "#223743", "#243B49", "#35434A", "#9BCAB0", "#9E8C69", "#C84132",
  "#C94D3C", "#D4C7A9", "#D95C46", "#E6D4AE", "#EEE1C4", "#F1513D",
  "#F1E4C6", "#F2E8CF", "#F35A44", "#F9EFDA", "#FFD3C7", "#FFF0D8",
  "#FFF4E5", "#FFE5C6",
  "#02080E", "#030A11", "#06131F", "#071522", "#0A1B2A", "#0A1C2D",
  "#0B2235", "#0D1E2B", "#0D2236", "#172730", "#172832", "#183244",
  "#33495A", "#3B4B53", "#52606A", "#53636D", "#6C7A80", "#6F1B14",
  "#701C15", "#75C993", "#FFF2D9", "#FFF4E1",
  // Mode-gate and Arena identity palette. These remain isolated to the two
  // branded premium surfaces and deliberately share the same dark/gold/status family.
  "#040B10", "#070D12", "#07131D", "#091117", "#0C1923", "#0D1C28",
  "#111D24", "#171A1D", "#1A2A36", "#4285F4", "#53C07A", "#71818C",
  "#74838C", "#81909A", "#84939C", "#8997A0", "#8D9BA5", "#98A5AD",
  "#AAB4BA", "#CF9D26", "#D9C88F", "#E2B238", "#E3B83F", "#EE806B",
  "#34434B", "#24323A", "#F4D879", "#F4F6F7", "#F5F6F7", "#F6F1E5", "#FFE697",
  // Setup, mobile legacy and match-action accents already used by the shared
  // UI surfaces. Keep them explicit so platform packaging audits the same
  // visual vocabulary without forcing a platform-specific color rewrite.
  "#8CA0AA", "#F25A38", "#5FA9D6", "#4EAF76", "#9AA7E6", "#F0A04A",
  "#F3D36A", "#9C7310", "#4B565D", "#74B6D8", "#FFB0A8", "#F0B35A",
  "#FF9288", "#050C12", "#081118", "#FF9288",
  "#DDB53B", "#AEB9BE", "#0B1923", "#0D1B25", "#080F14", "#A5B0B4",
  "#E0B83F", "#B5C0C4", "#C8D0D1", "#C4CCCE", "#D8C58C", "#D1D9DA",
  "#A9B4B7", "#E4C459", "#F2CA58", "#D2A52B", "#B7C0C1", "#9EABAD",
  "#55B978", "#BDC7CA", "#F4F0E6", "#172A35", "#0B1922", "#081219",
  "#14242D", "#0B1921", "#ECE1C2",
  "#060E14", "#050E14", "#12222B", "#0A161D", "#071016", "#0C181F",
  "#11222B", "#071118", "#18272F", "#08131B", "#162429", "#071015",
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
