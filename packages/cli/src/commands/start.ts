import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import chalk from "chalk";
import open from "open";
import { startServer, getOtlpEndpoint } from "@llmtap/collector";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface StartOptions {
  port: string;
  host: string;
  quiet?: boolean;
  open?: boolean;
  demo?: boolean;
  retention?: string;
}

export async function startCommand(options: StartOptions): Promise<void> {
  const port = parseInt(options.port, 10);
  const retentionDays = options.retention
    ? parseInt(options.retention, 10)
    : undefined;

  // Resolve dashboard dist path
  // 1. Bundled inside CLI dist (for npm publish): dist/dashboard/
  // 2. Monorepo sibling (for local dev): ../dashboard/dist/
  const bundledPath = path.resolve(__dirname, "..", "dashboard");
  const monorepoPath = path.resolve(__dirname, "..", "..", "dashboard", "dist");
  const dashboardPath = fs.existsSync(bundledPath) ? bundledPath : monorepoPath;

  console.log("");
  console.log(chalk.bold.hex("#6366f1")("  LLMTap") + chalk.gray(" - DevTools for AI Agents"));
  console.log("");

  try {
    const host = options.host;

    if (host === "0.0.0.0") {
      console.log(chalk.yellow("  ⚠  Binding to 0.0.0.0 — the collector will be accessible from your network"));
      console.log("");
    }

    const address = await startServer({
      port,
      host,
      dashboardPath,
      quiet: options.quiet,
      demo: options.demo,
      retentionDays,
    });

    const url = `http://${host === "0.0.0.0" ? "localhost" : host}:${port}`;

    console.log(chalk.green("  Ready!"));
    console.log("");
    console.log(`  ${chalk.gray("Dashboard:")}  ${chalk.cyan(url)}`);
    console.log(`  ${chalk.gray("API:")}        ${chalk.cyan(`${url}/v1`)}`);
    console.log(`  ${chalk.gray("Health:")}     ${chalk.cyan(`${url}/health`)}`);
    if (retentionDays && retentionDays > 0) {
      console.log(`  ${chalk.gray("Retention:")}  ${chalk.yellow(`${retentionDays} days`)}`);
    }
    const otlpTarget = getOtlpEndpoint();
    if (otlpTarget) {
      console.log(`  ${chalk.gray("OTLP:")}       ${chalk.cyan(otlpTarget)} ${chalk.green("(auto-forwarding)")}`);
    }
    console.log("");
    console.log(chalk.gray("  Press Ctrl+C to stop"));
    console.log("");

    // Open browser
    if (options.open !== false) {
      try {
        await open(url);
      } catch {
        // Ignore if browser can't be opened
      }
    }
  } catch (err: unknown) {
    const error = err as Error;
    if (error.message?.includes("EADDRINUSE")) {
      console.error(chalk.red(`  Port ${port} is already in use.`));
      console.error(chalk.gray(`  Try: npx llmtap --port ${port + 1}`));
    } else {
      console.error(chalk.red(`  Failed to start: ${error.message}`));
    }
    process.exit(1);
  }
}
