import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const directory = path.join(ROOT, "migrations");
const files = fs.readdirSync(directory).filter((file) => file.endsWith(".sql")).sort();
const failures = [];
let previous = 0;

for (const file of files) {
  const match = file.match(/^(\d{4})_[a-z0-9_]+\.sql$/);
  if (!match) {
    failures.push(`invalid migration filename: ${file}`);
    continue;
  }
  const sequence = Number(match[1]);
  if (sequence <= previous) failures.push(`migration sequence is not strictly increasing: ${file}`);
  previous = sequence;

  const sql = fs.readFileSync(path.join(directory, file), "utf8");
  const destructive = /\b(?:DROP\s+(?:TABLE|COLUMN|INDEX)|TRUNCATE\s+TABLE|ALTER\s+TABLE[\s\S]*?\bRENAME\b|DELETE\s+FROM)\b/i.test(sql);
  if (destructive && !/^\s*--\s*copa:destructive-reviewed\b/im.test(sql)) {
    failures.push(`${file} contains a destructive operation without copa:destructive-reviewed`);
  }
}

if (!files.length) failures.push("no D1 migrations found");
if (failures.length) {
  for (const failure of failures) console.error(`[migrations] ${failure}`);
  process.exit(1);
}
console.log(`[migrations] ${files.length} ordered migrations checked; no unreviewed destructive operations`);
