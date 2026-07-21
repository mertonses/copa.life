import fs from "node:fs";

const html=fs.readFileSync("index.html","utf8");
const css=fs.readFileSync("src/styles/match.css","utf8");
const failures=[];
const kinds=["economy","transfer","path","critical","card","injury","risk","star","chair","win","exit","note"];
const motions={
  economy:"story-coin",transfer:"story-transfer-arrow",path:"story-route-dot",
  critical:"story-critical-ball",card:"story-card-front",injury:"story-medical-cross",
  risk:"story-risk-signal",star:"story-star-rays",chair:"story-trust-meter",
  win:"story-trophy-spark",exit:"story-exit-arrow",note:"story-note-pen",
};

for(const kind of kinds){
  if(!html.includes(`${kind}:\``))failures.push(`missing SVG design: ${kind}`);
  if(!html.includes(motions[kind]))failures.push(`missing contextual motion hook: ${kind}`);
  if(!css.includes(`.${motions[kind]}`))failures.push(`missing motion styling: ${kind}`);
}
for(const marker of [
  'viewBox="0 0 32 32"',"data-story-icon=", ".story-icon-halo", ".story-icon-fill",
  "@keyframes storyIconSettle","@media(prefers-reduced-motion:reduce)","body.reduced-motion .story-icon-motion",
]){
  if(!(html+css).includes(marker))failures.push(`missing story icon contract: ${marker}`);
}
if(/<img[^>]+story/i.test(html))failures.push("season story fell back to raster icons");

if(failures.length){
  failures.forEach(message=>console.error(`[story-icons] ${message}`));
  process.exit(1);
}
console.log(`[story-icons] ${kinds.length} contextual SVG designs, motion hooks and reduced-motion fallback verified`);
