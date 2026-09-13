/**
 * Run Next.js from the canonical FRONTEND directory (fixes Windows FRONTEND vs frontend).
 */
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = fs.realpathSync.native(
  path.join(path.dirname(fileURLToPath(import.meta.url)), "..")
);
const nextBin = path.join(root, "node_modules", "next", "dist", "bin", "next");
const args = process.argv.slice(2);

if (!fs.existsSync(nextBin)) {
  console.error("Next.js not found. Run npm install in FRONTEND first.");
  process.exit(1);
}

const child = spawn(process.execPath, [nextBin, ...args], {
  cwd: root,
  stdio: "inherit",
  env: { ...process.env, INIT_CWD: root },
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
