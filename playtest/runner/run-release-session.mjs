import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const runnerDir = path.dirname(fileURLToPath(import.meta.url));
const healthUrl = "http://127.0.0.1:5500/?autotest=1";
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const resumeIndex = process.argv.indexOf("--resume");
const resumeId = resumeIndex >= 0 ? process.argv[resumeIndex + 1] : undefined;
if (resumeIndex >= 0 && !/^[a-z0-9-]+$/i.test(resumeId ?? "")) {
  throw new Error("--resume requires a valid session ID");
}

async function serverReady() {
  try {
    const response = await fetch(healthUrl, { signal: AbortSignal.timeout(1500) });
    return response.ok;
  } catch {
    return false;
  }
}

function waitForExit(child) {
  return new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", (code, signal) => resolve({ code, signal }));
  });
}

let server;
try {
  if (!await serverReady()) {
    server = spawn(process.execPath, [path.join(runnerDir, "static-server.mjs")], {
      cwd: runnerDir,
      stdio: "inherit",
      windowsHide: true,
    });
    for (let attempt = 0; attempt < 30 && !await serverReady(); attempt++) {
      await new Promise(resolve => setTimeout(resolve, 250));
    }
    if (!await serverReady()) throw new Error("Playtest static server did not start on port 5500");
  }

  const agentArgs = ["run", "agent", "--", "--config", "../release-20-runs.json"];
  if (resumeId) agentArgs.push("--resume", resumeId);
  const agent = spawn(npmCommand, agentArgs, {
    cwd: runnerDir,
    stdio: "inherit",
    windowsHide: true,
    shell: process.platform === "win32",
  });
  const result = await waitForExit(agent);
  if (result.code !== 0) {
    throw new Error(`20-run release playtest failed (${result.signal ?? result.code})`);
  }
} finally {
  if (server && !server.killed) server.kill();
}
