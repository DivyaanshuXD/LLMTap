import chalk from "chalk";

export async function doctorCommand(): Promise<void> {
  console.log("");
  console.log(chalk.bold.hex("#6366f1")("  LLMTap Doctor"));
  console.log(chalk.gray("  Checking your setup..."));
  console.log("");

  const checks: { label: string; status: "ok" | "warn" | "fail"; detail: string }[] = [];

  // Check 1: Node.js version
  const nodeVersion = process.version;
  const major = parseInt(nodeVersion.slice(1), 10);
  if (major >= 18) {
    checks.push({ label: "Node.js version", status: "ok", detail: nodeVersion });
  } else {
    checks.push({ label: "Node.js version", status: "fail", detail: `${nodeVersion} (requires >= 18)` });
  }

  // Check 2: Collector running
  try {
    const res = await fetch("http://localhost:4781/health", {
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok) {
      checks.push({ label: "Collector", status: "ok", detail: "Running on port 4781" });
    } else {
      checks.push({ label: "Collector", status: "fail", detail: `Responded with HTTP ${res.status}` });
    }
  } catch {
    checks.push({ label: "Collector", status: "warn", detail: "Not running (start with: npx llmtap)" });
  }

  // Check 3: Database accessible
  try {
    const res = await fetch("http://localhost:4781/v1/db-info", {
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok) {
      const info = (await res.json()) as { sizeBytes: number; spanCount: number; walMode: string };
      checks.push({
        label: "Database",
        status: info.walMode === "wal" ? "ok" : "warn",
        detail: `${info.spanCount} spans, WAL=${info.walMode.toUpperCase()}`,
      });
    }
  } catch {
    checks.push({ label: "Database", status: "warn", detail: "Cannot check (collector not running)" });
  }

  // Check 4: SDK installed
  try {
    await import("@llmtap/sdk");
    checks.push({ label: "@llmtap/sdk", status: "ok", detail: "Installed" });
  } catch {
    checks.push({ label: "@llmtap/sdk", status: "warn", detail: "Not found in current project (install with: npm i @llmtap/sdk)" });
  }

  // Check 5: Port available
  if (checks.find((c) => c.label === "Collector")?.status !== "ok") {
    try {
      // Try connecting to port 4781 to see if something else is using it
      const res = await fetch("http://localhost:4781", {
        signal: AbortSignal.timeout(1000),
      });
      if (!res.ok) {
        checks.push({ label: "Port 4781", status: "warn", detail: "Something is running but not LLMTap" });
      }
    } catch {
      checks.push({ label: "Port 4781", status: "ok", detail: "Available" });
    }
  }

  // Display results
  for (const check of checks) {
    const icon =
      check.status === "ok"
        ? chalk.green("  ✓")
        : check.status === "warn"
          ? chalk.yellow("  !")
          : chalk.red("  ✗");
    const label = chalk.white(check.label.padEnd(20));
    const detail =
      check.status === "ok"
        ? chalk.gray(check.detail)
        : check.status === "warn"
          ? chalk.yellow(check.detail)
          : chalk.red(check.detail);
    console.log(`${icon} ${label} ${detail}`);
  }

  const failCount = checks.filter((c) => c.status === "fail").length;
  const warnCount = checks.filter((c) => c.status === "warn").length;
  console.log("");
  if (failCount > 0) {
    console.log(chalk.red(`  ${failCount} issue(s) found. Fix them to use LLMTap.`));
  } else if (warnCount > 0) {
    console.log(chalk.yellow(`  ${warnCount} warning(s). Everything should still work.`));
  } else {
    console.log(chalk.green("  All checks passed!"));
  }
  console.log("");
}
