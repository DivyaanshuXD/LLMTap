import chalk from "chalk";

interface StatsResponse {
  totalTraces: number;
  totalSpans: number;
  totalTokens: number;
  totalCost: number;
  avgDuration: number;
  errorCount: number;
  errorRate: number;
  byProvider: { provider: string; spanCount: number; totalTokens: number; totalCost: number; avgDuration: number }[];
  byModel: { model: string; provider: string; spanCount: number; totalTokens: number; totalCost: number; avgDuration: number }[];
}

export async function statsCommand(options: { period?: string; host?: string }): Promise<void> {
  const period = Number(options.period ?? "24");
  const host = options.host ?? "http://localhost:4781";

  try {
    const res = await fetch(`${host}/v1/stats?period=${period}`);
    if (!res.ok) {
      console.error(chalk.red(`Error: Collector returned HTTP ${res.status}`));
      console.error(chalk.dim("Is the collector running? Try: npx llmtap start"));
      process.exit(1);
    }

    const stats = (await res.json()) as StatsResponse;

    console.log("");
    console.log(chalk.bold.white(`  LLMTap Stats — Last ${period}h`));
    console.log(chalk.dim("  ─────────────────────────────────"));
    console.log("");

    // Summary
    const errorPct = (stats.errorRate * 100).toFixed(1);
    console.log(`  ${chalk.dim("Traces")}     ${chalk.bold.white(String(stats.totalTraces))}`);
    console.log(`  ${chalk.dim("Spans")}      ${chalk.bold.white(String(stats.totalSpans))}`);
    console.log(`  ${chalk.dim("Tokens")}     ${chalk.bold.white(stats.totalTokens.toLocaleString())}`);
    console.log(`  ${chalk.dim("Total Cost")} ${chalk.bold.green("$" + stats.totalCost.toFixed(4))}`);
    console.log(`  ${chalk.dim("Avg Latency")} ${chalk.white(formatMs(stats.avgDuration))}`);
    console.log(
      `  ${chalk.dim("Error Rate")} ${
        stats.errorRate > 0.05
          ? chalk.bold.red(errorPct + "%")
          : chalk.green(errorPct + "%")
      } ${chalk.dim(`(${stats.errorCount} errors)`)}`
    );

    // Top providers
    if (stats.byProvider.length > 0) {
      console.log("");
      console.log(chalk.bold.white("  Top Providers"));
      console.log(chalk.dim("  ─────────────────────────────────"));
      for (const p of stats.byProvider.slice(0, 5)) {
        const bar = makeBar(p.totalCost, stats.totalCost, 20);
        console.log(
          `  ${chalk.cyan(p.provider.padEnd(12))} ${chalk.dim(String(p.spanCount).padStart(5) + " calls")} ${chalk.green("$" + p.totalCost.toFixed(4).padStart(8))} ${chalk.dim(bar)}`
        );
      }
    }

    // Top models
    if (stats.byModel.length > 0) {
      console.log("");
      console.log(chalk.bold.white("  Top Models"));
      console.log(chalk.dim("  ─────────────────────────────────"));
      for (const m of stats.byModel.slice(0, 8)) {
        const bar = makeBar(m.totalCost, stats.totalCost, 20);
        console.log(
          `  ${chalk.white(m.model.padEnd(28).slice(0, 28))} ${chalk.dim(String(m.spanCount).padStart(5) + " calls")} ${chalk.green("$" + m.totalCost.toFixed(4).padStart(8))} ${chalk.dim(bar)}`
        );
      }
    }

    console.log("");
  } catch (err) {
    if (err instanceof TypeError && (err as NodeJS.ErrnoException).cause) {
      console.error(chalk.red("Error: Cannot connect to collector"));
      console.error(chalk.dim("Is the collector running? Try: npx llmtap start"));
    } else {
      console.error(chalk.red("Error:"), err instanceof Error ? err.message : err);
    }
    process.exit(1);
  }
}

function formatMs(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function makeBar(value: number, total: number, width: number): string {
  if (total <= 0) return "";
  const filled = Math.max(Math.round((value / total) * width), 1);
  return "█".repeat(filled) + "░".repeat(width - filled);
}
