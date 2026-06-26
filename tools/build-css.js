// Copa.life CSS bundler — node tools/build-css.js
// Concatenates all CSS files into dist/copa.min.css
const fs = require("fs");
const path = require("path");

const files = [
  "src/styles/base.css",
  "src/styles/layout.css",
  "src/styles/cards.css",
  "src/styles/match.css"
];

const root = path.join(__dirname, "..");
const out = path.join(root, "dist");
if (!fs.existsSync(out)) fs.mkdirSync(out);

const bundle = files.map(f => {
  const src = fs.readFileSync(path.join(root, f), "utf8");
  // Fix relative asset paths (../../assets → /assets)
  return src.replace(/url\(["']?\.\.\/\.\.\/assets\//g, 'url("/assets/');
}).join("\n");

fs.writeFileSync(path.join(out, "copa.min.css"), bundle);
console.log(`✓ Bundled ${files.length} files → dist/copa.min.css (${(bundle.length/1024).toFixed(1)}KB)`);
