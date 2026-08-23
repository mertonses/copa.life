import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const required=[
  "marketing/growth-2026-08-23/play-store-experiments.md",
  "marketing/growth-2026-08-23/custom-listings.md",
  "marketing/growth-2026-08-23/meta-campaign.md",
  "marketing/growth-2026-08-23/measurement.md",
  "marketing/promo-2026/copa-life-reels-rhythm-tr-TR.mp4",
  "marketing/ad/copa-arena-instagram-story-tr-stars-music-no-voice.mp4",
  "store/android/graphics/localized/tr-TR/phone/01-two-modes.jpg",
  "store/android/graphics/localized/tr-TR/phone/02-life-stars-tr-eng.jpg",
  "store/android/graphics/localized/tr-TR/phone/06-arena-season-road.jpg",
  "store/android/graphics/localized/tr-TR/phone/07-arena-live-pvp.jpg"
];
const failures=required.filter(file=>!fs.existsSync(path.join(root,file)));
const copy=fs.readFileSync(path.join(root,"marketing/growth-2026-08-23/meta-campaign.md"),"utf8");
if(!copy.includes("RAKİBİNİ ALT ET"))failures.push("Meta CTA is missing");
if(/RAKİBİNE CEVAP VER/i.test(copy))failures.push("unnatural CTA remains");
if(failures.length){failures.forEach(item=>console.error(`[growth] ${item}`));process.exit(1);}
console.log(`[growth] Play experiments, custom listings, measurement and ${required.length-4} creative assets verified`);
