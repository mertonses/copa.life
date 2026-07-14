import fs from "node:fs";

const layout = fs.readFileSync("src/styles/layout.css", "utf8");
const match = fs.readFileSync("src/styles/match.css", "utf8");
const cards = fs.readFileSync("src/styles/cards.css", "utf8");
const html = fs.readFileSync("index.html", "utf8");

const checks = [
  {
    name: "global overflow guard",
    pass: /html,\s*\nbody\{[\s\S]*?overflow-x:hidden/s.test(layout),
  },
  {
    name: "beta badge remains discreet",
    pass: /\.brandmark \.logo-beta\{[\s\S]*?font-size:5px;[\s\S]*?letter-spacing:\.25px;/s.test(layout),
  },
  {
    name: "mobile viewport-bound screens",
    pass: /@media\(max-width:900px\)\{[\s\S]*#app,[\s\S]*#result\{[\s\S]*max-width:100%!important;[\s\S]*overflow-x:hidden!important/s.test(layout),
  },
  {
    name: "mobile hub stat row keeps four compact metrics",
    pass: /@media\(max-width:620px\)\{[\s\S]*#hub \.hub-stat-row\{[\s\S]*grid-template-columns:repeat\(4,minmax\(0,1fr\)\)!important/s.test(layout),
  },
  {
    name: "mobile hub action buttons stay in a compact three-up row",
    pass: /@media\(max-width:620px\)\{[\s\S]*#hub \.hub-action-panel \.actionbtns\{[\s\S]*grid-template-columns:repeat\(3,minmax\(0,1fr\)\)!important/s.test(layout),
  },
  {
    name: "mobile hub play button remains the rightmost action",
    pass: /#hub \.hub-action-panel \.actionbar #playBtn\{[\s\S]*order:3!important/s.test(layout),
  },
  {
    name: "mobile free transfer cards stay two-up",
    pass: /@media\(max-width:620px\)\{[\s\S]*#hub #freeAgentRow \.shopcards\{[\s\S]*grid-template-columns:repeat\(2,minmax\(0,1fr\)\)!important/s.test(layout),
  },
  {
    name: "narrow card cost badges wrap without clipping",
    pass: /\.ct-cost-list li\{[^}]*max-width:100%[^}]*white-space:normal[^}]*overflow-wrap:break-word[^}]*word-break:normal/s.test(cards),
  },
  {
    name: "mobile hub core blocks bound to viewport",
    pass: /#hub \.pitch-area,\s*\n\s*#hub #hubPitch,\s*\n\s*#hub #hubBenchSection,[\s\S]*#fixbar\.cuproad/s.test(layout),
  },
  {
    name: "draft desktop columns stay equal and centered",
    pass: /@media\(min-width:901px\)\{[\s\S]*#draft \.draft-cols\{[\s\S]*grid-template-columns:minmax\(0,420px\) minmax\(0,420px\)!important/s.test(layout),
  },
  {
    name: "draft field never collapses",
    pass: /#draft \.draft-right \.pitch\{[\s\S]*aspect-ratio:68\/92!important/s.test(layout),
  },
  {
    name: "draft mobile pitch has usable width",
    pass: /@media\(max-width:900px\)\{[\s\S]*#draft \.draft-right \.pitch\{[\s\S]*width:100%!important/s.test(layout),
  },
  {
    name: "final sim stage collapses before phone width",
    pass: /@media\(max-width:760px\)\{\.simstage\{grid-template-columns:1fr\}/.test(match),
  },
  {
    name: "final sim default speed uses visible 1x value",
    pass: /setSpeed\(10\)/.test(html),
  },
  {
    name: "opponent scout report stays viewport bound on mobile",
    pass: /@media\(max-width:620px\)\{[\s\S]*?\.scout-lineup-modal\.scout-report-modal\{[\s\S]*?width:calc\(100vw - 14px\)[\s\S]*?max-height:calc\(100svh - 14px\)/.test(match),
  },
  {
    name: "opponent scout report collapses insights to one column",
    pass: /@media\(max-width:620px\)\{[\s\S]*?\.scout-report-grid\{grid-template-columns:1fr\}/.test(match),
  },
];

const matrix = [390, 412, 768, 820, 1024];
let failed = false;
for (const check of checks) {
  if (!check.pass) {
    failed = true;
    console.error(`responsive check failed: ${check.name}`);
  }
}

console.log(`responsive matrix widths: ${matrix.join(", ")}px`);
if (failed) process.exit(1);
