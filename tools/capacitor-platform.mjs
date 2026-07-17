import path from "node:path";
import { spawnSync } from "node:child_process";

const platform = process.argv[2];
const command = process.argv[3] || "sync";
if (!new Set(["android", "ios"]).has(platform)) {
  throw new Error("Usage: node tools/capacitor-platform.mjs android|ios [add|sync|open]");
}
if (!new Set(["add", "sync", "open"]).has(command)) {
  throw new Error("Capacitor command must be add, sync, or open");
}

const cli = path.resolve("node_modules", "@capacitor", "cli", "bin", "capacitor");
const result = spawnSync(process.execPath, [cli, command, platform], {
  cwd: process.cwd(),
  env: { ...process.env, COPA_NATIVE_PLATFORM: platform },
  encoding: "utf8",
  stdio: "inherit",
  windowsHide: true,
});
if (result.error) console.error(result.error.message);
if (result.status !== 0) process.exit(result.status ?? 1);
if (platform === "ios" && command !== "open") {
  const configure = spawnSync(process.execPath, [path.resolve("tools", "configure-ios-project.mjs")], {
    cwd: process.cwd(),
    env: process.env,
    encoding: "utf8",
    stdio: "inherit",
    windowsHide: true,
  });
  process.exit(configure.status ?? 1);
}
process.exit(0);
