import chalk from "chalk";

export async function statusCommand(): Promise<void> {
  try {
    const res = await fetch("http://localhost:4781/v1/db-info", {
      signal: AbortSignal.timeout(3000),
    });

    if (!res.ok) {
      console.error(chalk.red("  Collector responded with an error."));
      process.exit(1);
    }

    const info = (await res.json()) as {
      path: string;
      sizeBytes: number;
      spanCount: number;
      traceCount: number;
      oldestSpan: number | null;
      newestSpan: number | null;
      walMode: string;
    };

    const formatBytes = (bytes: number) => {
      if (bytes === 0) return "0 B";
      const units = ["B", "KB", "MB", "GB"];
      const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
      return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
    };

    console.log("");
    console.log(chalk.bold.hex("#6366f1")("  LLMTap") + chalk.green(" — Running"));
    console.log("");
    console.log(`  ${chalk.gray("Spans:")}       ${chalk.white(info.spanCount.toLocaleString())}`);
    console.log(`  ${chalk.gray("Traces:")}      ${chalk.white(info.traceCount.toLocaleString())}`);
    console.log(`  ${chalk.gray("DB size:")}     ${chalk.white(formatBytes(info.sizeBytes))}`);
    console.log(`  ${chalk.gray("WAL mode:")}    ${chalk.white(info.walMode.toUpperCase())}`);
    console.log(`  ${chalk.gray("DB path:")}     ${chalk.white(info.path)}`);

    if (info.oldestSpan && info.newestSpan) {
      const oldest = new Date(info.oldestSpan).toLocaleString();
      const newest = new Date(info.newestSpan).toLocaleString();
      console.log(`  ${chalk.gray("Data range:")}  ${chalk.white(`${oldest} — ${newest}`)}`);
    }
    console.log("");
  } catch {
    console.log("");
    console.log(chalk.bold.hex("#6366f1")("  LLMTap") + chalk.red(" — Not running"));
    console.log("");
    console.log(chalk.gray("  Start the collector with: ") + chalk.cyan("npx llmtap"));
    console.log("");
  }
}
