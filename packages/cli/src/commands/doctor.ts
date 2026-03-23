import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import chalk from "chalk";
import { getDbDirPath, getDbPath } from "@llmtap/collector";
import { fetchCollectorDbInfo, formatBytes, isCollectorRunning } from "../lib/collector.js";

type CheckStatus = "ok" | "warn" | "fail";

interface Check {
  label: string;
  status: CheckStatus;
  detail: string;
}

interface DoctorOptions {
  host?: string;
}

function formatCheck(check: Check): string {
  const icon =
    check.status === "ok"
      ? chalk.green("  OK ")
      : check.status === "warn"
        ? chalk.yellow("  !  ")
        : chalk.red("  X  ");

  const label = chalk.white(check.label.padEnd(20));
  const detail =
    check.status === "ok"
      ? chalk.gray(check.detail)
      : check.status === "warn"
        ? chalk.yellow(check.detail)
        : chalk.red(check.detail);

  return `${icon}${label} ${detail}`;
}

function hasLocalSdkInstall(): boolean {
  try {
    const requireFromCwd = createRequire(path.join(process.cwd(), "__llmtap__.js"));
    requireFromCwd.resolve("@llmtap/sdk");
    return true;
  } catch {
    return false;
  }
}

function findPackageJson(): { hasPackageJson: boolean; path?: string } {
  const packageJsonPath = path.join(process.cwd(), "package.json");
  return fs.existsSync(packageJsonPath)
    ? { hasPackageJson: true, path: packageJsonPath }
    : { hasPackageJson: false };
}

export async function doctorCommand(options: DoctorOptions = {}): Promise<void> {
  const host = options.host ?? "http://localhost:4781";
  const checks: Check[] = [];
  const nextSteps: string[] = [];

  console.log("");
  console.log(chalk.bold.hex("#6366f1")("  LLMTap Doctor"));
  console.log(chalk.gray(`  Checking runtime, storage, and onboarding state at ${host}`));
  console.log("");

  const nodeVersion = process.version;
  const major = parseInt(nodeVersion.slice(1), 10);
  checks.push(
    major >= 18
      ? { label: "Node.js version", status: "ok", detail: nodeVersion }
      : { label: "Node.js version", status: "fail", detail: `${nodeVersion} (requires Node 18 or newer)` }
  );

  const collectorRunning = await isCollectorRunning(host);
  if (collectorRunning) {
    checks.push({ label: "Collector", status: "ok", detail: `Running at ${host}` });
  } else {
    checks.push({ label: "Collector", status: "warn", detail: "Not running right now" });
    nextSteps.push("Start LLMTap with `npx llmtap` to open the dashboard and collector.");
  }

  const dbDir = getDbDirPath();
  const dbPath = getDbPath();
  const dbDirExists = fs.existsSync(dbDir);
  const dbFileExists = fs.existsSync(dbPath);

  checks.push(
    dbDirExists
      ? { label: "DB directory", status: "ok", detail: dbDir }
      : { label: "DB directory", status: "warn", detail: `Not created yet (${dbDir})` }
  );

  if (dbDirExists) {
    try {
      fs.accessSync(dbDir, fs.constants.R_OK | fs.constants.W_OK);
      checks.push({ label: "DB permissions", status: "ok", detail: "Readable and writable" });
    } catch {
      checks.push({ label: "DB permissions", status: "fail", detail: "Current user cannot read/write the data directory" });
    }
  }

  if (dbFileExists) {
    const stat = fs.statSync(dbPath);
    checks.push({ label: "DB file", status: "ok", detail: `${dbPath} (${formatBytes(stat.size)})` });
  } else {
    checks.push({ label: "DB file", status: "warn", detail: `No local database yet (${dbPath})` });
  }

  const dbInfo = collectorRunning ? await fetchCollectorDbInfo(host) : null;
  if (collectorRunning && dbInfo) {
    const spanSummary =
      dbInfo.spanCount > 0
        ? `${dbInfo.spanCount.toLocaleString()} spans across ${dbInfo.traceCount.toLocaleString()} traces`
        : "Collector is healthy, but no spans have been captured yet";
    checks.push({
      label: "Collector data",
      status: dbInfo.spanCount > 0 ? "ok" : "warn",
      detail: `${spanSummary}; WAL=${dbInfo.walMode.toUpperCase()}`,
    });
    if (dbInfo.spanCount === 0) {
      nextSteps.push("Wrap your LLM client with `@llmtap/sdk`, make one model call, then refresh the dashboard.");
    }
  } else if (collectorRunning) {
    checks.push({ label: "Collector data", status: "warn", detail: "Collector is up, but /v1/db-info did not respond cleanly" });
  }

  const packageJson = findPackageJson();
  if (packageJson.hasPackageJson) {
    checks.push({ label: "Project root", status: "ok", detail: packageJson.path! });
  } else {
    checks.push({ label: "Project root", status: "warn", detail: "No package.json in the current directory" });
    nextSteps.push("Run `doctor` from the app you want to instrument so LLMTap can verify local dependencies.");
  }

  if (hasLocalSdkInstall()) {
    checks.push({ label: "@llmtap/sdk", status: "ok", detail: "Installed in the current project" });
  } else {
    checks.push({ label: "@llmtap/sdk", status: "warn", detail: "Not installed in the current project" });
    nextSteps.push("Install the SDK in your app with `npm i @llmtap/sdk` or `pnpm add @llmtap/sdk`.");
  }

  for (const check of checks) {
    console.log(formatCheck(check));
  }

  const failCount = checks.filter((check) => check.status === "fail").length;
  const warnCount = checks.filter((check) => check.status === "warn").length;

  console.log("");
  if (nextSteps.length > 0) {
    console.log(chalk.bold.white("  Next steps"));
    for (const step of nextSteps) {
      console.log(chalk.gray(`  - ${step}`));
    }
    console.log("");
  }

  if (failCount > 0) {
    console.log(chalk.red(`  ${failCount} blocking issue(s) found.`));
  } else if (warnCount > 0) {
    console.log(chalk.yellow(`  ${warnCount} warning(s) found.`));
  } else {
    console.log(chalk.green("  All checks passed."));
  }
  console.log("");
}
