import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = relative => fs.readFileSync(path.join(root, relative), "utf8");
const failures = [];
const requireText = (file, markers) => {
  const source = read(file);
  for (const marker of markers) if (!source.includes(marker)) failures.push(`${file}: missing ${marker}`);
};

requireText("src/runtime/notifications.js", [
  "copa_notification_preferences_v1", "quietEnabled", "requestLocalPermission", "schedule", "syncToken", "routeAction", "checkLocalPermission",
]);
requireText("src/runtime/copaPlayGames.js", ["Notification delivery lives", "PLAY GAMES", "requestPermission"]);
requireText("index.html", ["src/runtime/notifications.js", "skipRecord", "copa:language-changed"]);
requireText("sw.js", ["self.addEventListener(\"push\"", "self.addEventListener(\"message\"", "self.addEventListener(\"notificationclick\""]);
requireText("android/capacitor.settings.gradle", ["capacitor-local-notifications"]);
requireText("android/app/capacitor.build.gradle", ["project(':capacitor-local-notifications')"]);
requireText("ios/App/CapApp-SPM/Package.swift", ["CapacitorLocalNotifications", "CapacitorPushNotifications", "../../../node_modules/"]);
const config = JSON.parse(read("capacitor.config.json"));
if (!config.plugins?.PushNotifications?.presentationOptions?.includes("banner")) failures.push("capacitor.config.json: PushNotifications presentation options incomplete");
if (!config.plugins?.LocalNotifications?.presentationOptions?.includes("list")) failures.push("capacitor.config.json: LocalNotifications presentation options incomplete");
if (!fs.existsSync(path.join(root, "playtest/runner/tests/notifications.test.ts"))) failures.push("missing notification Playwright test");

if (failures.length) {
  failures.forEach(message => console.error(`[notifications] ${message}`));
  process.exit(1);
}
console.log("[notifications] center, preferences, native plugins, service worker, deep links and tests verified");
