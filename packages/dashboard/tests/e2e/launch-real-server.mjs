import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(dirname, "..", "..", "..", "..");
const cliEntry = path.resolve(repoRoot, "packages", "cli", "dist", "index.js");
const dbDir = path.resolve(repoRoot, "packages", "dashboard", ".tmp", "playwright-real-db");

fs.rmSync(dbDir, { recursive: true, force: true });
fs.mkdirSync(dbDir, { recursive: true });

const child = spawn(
  process.execPath,
  [cliEntry, "start", "--host", "127.0.0.1", "--port", "4785", "--quiet", "--no-open"],
  {
    cwd: repoRoot,
    env: {
      ...process.env,
      LLMTAP_DB_DIR: dbDir,
    },
    stdio: "inherit",
  }
);

const shutdown = (signal) => {
  if (!child.killed) {
    child.kill(signal);
  }
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

child.on("exit", (code) => {
  process.exit(code ?? 0);
});
