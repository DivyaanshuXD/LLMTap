import fs from "node:fs";
import path from "node:path";
import chalk from "chalk";
import { backupDb, getDbPath } from "@llmtap/collector";
import { formatBytes } from "../lib/collector.js";

interface BackupOptions {
  output?: string;
}

export async function backupCommand(options: BackupOptions): Promise<void> {
  try {
    const sourcePath = getDbPath();
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const output = options.output?.trim() || `llmtap-backup-${stamp}.db`;
    const backupPath = backupDb(output);
    const sizeBytes = fs.statSync(backupPath).size;

    console.log("");
    console.log(chalk.bold.hex("#6366f1")("  LLMTap Backup"));
    console.log("");
    console.log(`  ${chalk.gray("Source:")}      ${chalk.white(sourcePath)}`);
    console.log(`  ${chalk.gray("Backup file:")} ${chalk.white(path.resolve(backupPath))}`);
    console.log(`  ${chalk.gray("Size:")}        ${chalk.white(formatBytes(sizeBytes))}`);
    console.log("");
    console.log(chalk.green("  Backup completed."));
    console.log("");
  } catch (err) {
    const error = err as Error;
    console.error(chalk.red(`  Backup failed: ${error.message}`));
    process.exit(1);
  }
}
