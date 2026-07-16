import { spawnSync } from "node:child_process";
import { findJavaTool } from "./java-runtime.mjs";

const args = process.argv.slice(2);
if (!args.length) throw new Error("run-java requires a Java source/class and arguments");

const result = spawnSync(findJavaTool("java"), args, {
  stdio: "inherit",
  windowsHide: true,
});
if (result.error) throw result.error;
process.exit(result.status ?? 1);
