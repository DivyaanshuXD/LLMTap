import chalk from "chalk";
import { restoreDb } from "@llmtap/collector";
import { isCollectorRunning } from "../lib/collector.js";

interface RestoreOptions {
  host?: string;
}

export async function restoreCommand(inputPath: string, options: RestoreOptions): Promise<void> {
  const host = options.host ?? "http://localhost:4781";

  try {
    if (await isCollectorRunning(host)) {
      console.error(chalk.red("  Restore blocked: the collector is currently running."));
      console.error(chalk.yellow("  Stop LLMTap first, then run restore again."));
      process.exit(1);
    }

    const restoredPath = restoreDb(inputPath);

    console.log("");
    console.log(chalk.bold.hex("#6366f1")("  LLMTap Restore"));
    console.log("");
    console.log(`  ${chalk.gray("Backup:")}      ${chalk.white(inputPath)}`);
    console.log(`  ${chalk.gray("Restored to:")} ${chalk.white(restoredPath)}`);
    console.log("");
    console.log(chalk.green("  Restore completed. Start LLMTap to inspect the restored data."));
    console.log("");
  } catch (err) {
    const error = err as Error;
    console.error(chalk.red(`  Restore failed: ${error.message}`));
    process.exit(1);
  }
}
