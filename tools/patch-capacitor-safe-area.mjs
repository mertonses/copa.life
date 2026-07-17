import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const target = path.join(
  root,
  "node_modules",
  "@capacitor",
  "android",
  "capacitor",
  "src",
  "main",
  "java",
  "com",
  "getcapacitor",
  "plugin",
  "SystemBars.java",
);

if (!fs.existsSync(target)) {
  throw new Error(`Capacitor SystemBars source is missing: ${target}`);
}

const source = fs.readFileSync(target, "utf8");
const marker = "const root = document.documentElement;";
if (source.includes(marker)) {
  console.log("[capacitor] safe-area DOM guard already applied");
  process.exit(0);
}

const before = `                    try {
                      document.documentElement.style.setProperty("--safe-area-inset-top", "%dpx");
                      document.documentElement.style.setProperty("--safe-area-inset-right", "%dpx");
                      document.documentElement.style.setProperty("--safe-area-inset-bottom", "%dpx");
                      document.documentElement.style.setProperty("--safe-area-inset-left", "%dpx");
                    } catch(e) { console.error('Error injecting safe area CSS:', e); }`;
const after = `                    try {
                      const root = document.documentElement;
                      if (root) {
                        root.style.setProperty("--safe-area-inset-top", "%dpx");
                        root.style.setProperty("--safe-area-inset-right", "%dpx");
                        root.style.setProperty("--safe-area-inset-bottom", "%dpx");
                        root.style.setProperty("--safe-area-inset-left", "%dpx");
                      }
                    } catch(e) { console.error('Error injecting safe area CSS:', e); }`;

if (!source.includes(before)) {
  throw new Error(
    "Capacitor SystemBars safe-area implementation changed; review the upstream source before updating the guarded patch.",
  );
}

fs.writeFileSync(target, source.replace(before, after), "utf8");
console.log("[capacitor] guarded safe-area CSS injection until the DOM root exists");
