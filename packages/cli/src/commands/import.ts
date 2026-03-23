import fs from "node:fs";
import path from "node:path";
import chalk from "chalk";
import { insertSpans, resetDb } from "@llmtap/collector";
import { ingestSpans, isCollectorRunning } from "../lib/collector.js";
import { normalizeImportPayload, summarizeImportedSpans } from "../lib/data.js";

interface ImportOptions {
  replace?: boolean;
  host?: string;
}

export async function importCommand(inputPath: string, options: ImportOptions): Promise<void> {
  try {
    const resolvedPath = path.resolve(inputPath);
    const file = fs.readFileSync(resolvedPath, "utf8");
    const payload = JSON.parse(file) as unknown;
    const spans = normalizeImportPayload(payload);
    const summary = summarizeImportedSpans(spans);
    const host = options.host ?? "http://localhost:4781";
    const collectorRunning = await isCollectorRunning(host);

    if (options.replace) {
      if (collectorRunning) {
        console.error(chalk.red("  Replace import blocked: the collector is currently running."));
        console.error(chalk.yellow("  Stop LLMTap first, then rerun with --replace."));
        process.exit(1);
      }
      resetDb();
    }

    const accepted = collectorRunning
      ? await ingestSpans(spans, host)
      : insertSpans(spans);

    console.log("");
    console.log(chalk.bold.hex("#6366f1")("  LLMTap Import"));
    console.log("");
    console.log(`  ${chalk.gray("File:")}        ${chalk.white(resolvedPath)}`);
    console.log(`  ${chalk.gray("Trace count:")} ${chalk.white(summary.traceCount.toLocaleString())}`);
    console.log(`  ${chalk.gray("Span count:")}  ${chalk.white(summary.spanCount.toLocaleString())}`);
    console.log(`  ${chalk.gray("Mode:")}        ${chalk.white(collectorRunning ? "Live ingest via collector" : "Direct local database import")}`);
    if (options.replace) {
      console.log(`  ${chalk.gray("Replace:")}     ${chalk.white("Yes")}`);
    }
    console.log("");
    console.log(chalk.green(`  Imported ${accepted.toLocaleString()} spans.`));
    console.log("");
  } catch (err) {
    const error = err as Error;
    console.error(chalk.red(`  Import failed: ${error.message}`));
    process.exit(1);
  }
}
