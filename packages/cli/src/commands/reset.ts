import chalk from "chalk";
import { resetDb } from "@llmtap/collector";

export async function resetCommand(): Promise<void> {
  try {
    resetDb();
    console.log(chalk.green("  Data cleared successfully."));
  } catch (err: unknown) {
    const error = err as Error;
    console.error(chalk.red(`  Failed to reset: ${error.message}`));
    process.exit(1);
  }
}
