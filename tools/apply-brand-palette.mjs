import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const files = ["favicon.svg", "resources/logo.svg"];
const replacements = new Map([
  ["#090A0A", "#101D28"],
  ["#309E7B", "#F24A28"],
  ["#F5F6F5", "#F3F5F4"],
  ["#516475", "#DA3D2E"],
  ["#0D1713", "#101D28"],
  ["#327A50", "#F24A28"],
  ["#F3EEDF", "#F3F5F4"],
  ["#D6A23A", "#DA3D2E"],
]);

for (const relative of files) {
  const file = path.join(ROOT, relative);
  let source = await fs.readFile(file, "utf8");
  for (const [from, to] of replacements) {
    source = source.replaceAll(from, to);
  }
  await fs.writeFile(file, source, "utf8");
}

console.log(`Applied canonical brand palette to ${files.join(", ")}.`);
