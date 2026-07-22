import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const source = path.join(ROOT, "favicon.svg");
const mirror = path.join(ROOT, "resources/logo.svg");

await fs.copyFile(source, mirror);
console.log("Synchronized the canonical dice brand mark to resources/logo.svg.");
