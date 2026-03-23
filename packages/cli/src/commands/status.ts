import chalk from "chalk";
import { fetchCollectorDbInfo, formatBytes } from "../lib/collector.js";

interface StatusOptions {
  host?: string;
}

export async function statusCommand(options: StatusOptions = {}): Promise<void> {
  try {
    const info = await fetchCollectorDbInfo(options.host ?? "http://localhost:4781");

    if (!info) {
      console.error(chalk.red("  Collector responded with an error."));
      process.exit(1);
    }

    console.log("");
    console.log(chalk.bold.hex("#6366f1")("  LLMTap") + chalk.green(" - Running"));
    console.log("");
    console.log(`  ${chalk.gray("Spans:")}       ${chalk.white(info.spanCount.toLocaleString())}`);
    console.log(`  ${chalk.gray("Traces:")}      ${chalk.white(info.traceCount.toLocaleString())}`);
    console.log(`  ${chalk.gray("DB size:")}     ${chalk.white(formatBytes(info.sizeBytes))}`);
    console.log(`  ${chalk.gray("WAL mode:")}    ${chalk.white(info.walMode.toUpperCase())}`);
    console.log(`  ${chalk.gray("DB path:")}     ${chalk.white(info.path)}`);

    if (info.oldestSpan && info.newestSpan) {
      const oldest = new Date(info.oldestSpan).toLocaleString();
      const newest = new Date(info.newestSpan).toLocaleString();
      console.log(`  ${chalk.gray("Data range:")}  ${chalk.white(`${oldest} - ${newest}`)}`);
    }
    console.log("");
  } catch {
    console.log("");
    console.log(chalk.bold.hex("#6366f1")("  LLMTap") + chalk.red(" - Not running"));
    console.log("");
    console.log(chalk.gray("  Start the collector with: ") + chalk.cyan("npx llmtap"));
    console.log("");
  }
}
