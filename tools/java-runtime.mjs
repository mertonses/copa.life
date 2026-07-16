import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

function findFile(directory, filename, depth = 0) {
  if (!directory || depth > 5 || !fs.existsSync(directory)) return null;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isFile() && entry.name.toLowerCase() === filename) return file;
    if (entry.isDirectory()) {
      const match = findFile(file, filename, depth + 1);
      if (match) return match;
    }
  }
  return null;
}

export function findJavaTool(tool) {
  const executable = process.platform === "win32" ? `${tool}.exe` : tool;
  const javaHomeCandidate = process.env.JAVA_HOME
    ? path.join(process.env.JAVA_HOME, "bin", executable)
    : null;
  if (javaHomeCandidate && fs.existsSync(javaHomeCandidate)) return javaHomeCandidate;

  const codexCandidate = findFile(path.join(os.homedir(), ".codex", "tools"), executable.toLowerCase());
  if (codexCandidate) return codexCandidate;

  const lookup = spawnSync(process.platform === "win32" ? "where.exe" : "which", [tool], {
    encoding: "utf8",
    windowsHide: true,
  });
  const pathCandidate = lookup.status === 0 ? lookup.stdout.trim().split(/\r?\n/)[0] : null;
  if (pathCandidate && fs.existsSync(pathCandidate)) return pathCandidate;

  throw new Error(`${tool} was not found; install JDK 21 or set JAVA_HOME`);
}
