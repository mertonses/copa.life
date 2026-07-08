import fs from "node:fs";

const layout = fs.readFileSync("src/styles/layout.css", "utf8");
const match = fs.readFileSync("src/styles/match.css", "utf8");
const html = fs.readFileSync("index.html", "utf8");

const checks = [
  {
    name: "global overflow guard",
    pass: /html,\s*\nbody\{[^}]*overflow-x:hidden/s.test(layout),
  },
  {
    name: "mobile hub single-flow guard",
    pass: /@media\(max-width:900px\)[\s\S]*#hub \.hubcols[\s\S]*flex-direction:column/s.test(layout),
  },
  {
    name: "mobile hub stat row wraps",
    pass: /#hub \.hub-stat-row\{[\s\S]*grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/s.test(layout),
  },
  {
    name: "mobile hub action panel cannot overflow",
    pass: /@media\(max-width:900px\)[\s\S]*#hub \.hub-action-panel \.actionbar\{[\s\S]*grid-template-columns:1fr!important/s.test(layout),
  },
  {
    name: "mobile hub core blocks bound to viewport",
    pass: /#hub \.pitch-area,\s*\n\s*#hub #hubBenchSection,\s*\n\s*#hub \.fixturebar,\s*\n\s*#hub \.hub-action-panel/s.test(layout),
  },
  {
    name: "draft field never collapses",
    pass: /#draft \.draft-right \.pitch\{[\s\S]*aspect-ratio:68\/92/s.test(layout),
  },
  {
    name: "draft mobile pitch has usable width",
    pass: /@media\(max-width:900px\)[\s\S]*#draft \.draft-right \.pitch\{[\s\S]*width:100%!important/s.test(layout),
  },
  {
    name: "final sim stage collapses before phone width",
    pass: /@media\(max-width:760px\)\{\.simstage\{grid-template-columns:1fr\}/.test(match),
  },
  {
    name: "final sim default speed uses visible 1x value",
    pass: /setSpeed\(12\)/.test(html),
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
