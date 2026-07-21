import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const NOTES_DIR = path.join(ROOT, "store", "android", "whatsnew");
const REQUIRED_LOCALES = ["tr-TR", "en-US", "es-ES", "de-DE", "it-IT"];

export function validateReleaseNotes() {
  const failures = [];
  for (const entry of fs.readdirSync(NOTES_DIR, { withFileTypes: true })) {
    if (!entry.isFile() || !/^whatsnew-[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/.test(entry.name)) {
      failures.push(`unsupported file in Google Play release notes directory: ${entry.name}`);
    }
  }
  for (const locale of REQUIRED_LOCALES) {
    const file = path.join(NOTES_DIR, `whatsnew-${locale}`);
    if (!fs.existsSync(file)) {
      failures.push(`missing release notes: whatsnew-${locale}`);
      continue;
    }
    const note = fs.readFileSync(file, "utf8").trim();
    const length = Array.from(note).length;
    if (length < 24) failures.push(`release notes are too short for ${locale}`);
    if (length > 500) failures.push(`release notes exceed 500 characters for ${locale}`);
    if (/\b(?:todo|tbd|placeholder|lorem ipsum)\b/i.test(note)) {
      failures.push(`placeholder text remains in ${locale} release notes`);
    }
  }
  return failures;
}

const command = process.argv[2];
if (command === "stamp") {
  const failures = validateReleaseNotes();
  if (failures.length) throw new Error(failures.join("; "));
  const version = JSON.parse(
    fs.readFileSync(path.join(ROOT, "release", "android-version.json"), "utf8"),
  );
  const metadata = {
    versionCode: version.versionCode,
    versionName: version.versionName,
    locales: REQUIRED_LOCALES,
  };
  fs.writeFileSync(
    path.join(ROOT, "store", "android", "release-notes.json"),
    `${JSON.stringify(metadata, null, 2)}\n`,
  );
  console.log(`Release notes stamped for v${version.versionName}+${version.versionCode}`);
}
