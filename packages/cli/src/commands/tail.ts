import chalk from "chalk";

interface TailOptions {
  format: string;
}

export async function tailCommand(options: TailOptions): Promise<void> {
  const format = options.format ?? "pretty";
  const url = "http://localhost:4781/v1/stream";

  console.log("");
  console.log(
    chalk.bold.hex("#6366f1")("  LLMTap") +
      chalk.gray(" — Streaming traces in real-time")
  );
  console.log(chalk.gray("  Press Ctrl+C to stop"));
  console.log("");

  try {
    const res = await fetch(url, {
      headers: { Accept: "text/event-stream" },
    });

    if (!res.ok || !res.body) {
      console.error(chalk.red("  Could not connect to collector."));
      console.error(chalk.gray("  Make sure the collector is running: npx llmtap"));
      process.exit(1);
    }

    const decoder = new TextDecoder();
    const reader = res.body.getReader();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const json = line.slice(6).trim();
        if (!json) continue;

        try {
          const span = JSON.parse(json) as {
            spanId: string;
            traceId: string;
            name: string;
            providerName: string;
            requestModel: string;
            duration?: number;
            totalTokens: number;
            totalCost: number;
            status: string;
            errorMessage?: string;
          };

          if (format === "json") {
            console.log(json);
          } else {
            const dur = span.duration ? `${span.duration}ms` : "...";
            const cost =
              span.totalCost > 0 ? `$${span.totalCost.toFixed(4)}` : "$0";
            const statusIcon =
              span.status === "error" ? chalk.red("ERR") : chalk.green("OK ");

            console.log(
              `  ${statusIcon} ${chalk.gray(dur.padStart(7))} ${chalk.cyan(span.providerName.padEnd(10))} ${chalk.white(span.requestModel.padEnd(24))} ${chalk.yellow(String(span.totalTokens).padStart(6) + " tok")} ${chalk.green(cost.padStart(8))} ${chalk.gray(span.name)}`
            );
            if (span.errorMessage) {
              console.log(
                `       ${chalk.red("→ " + span.errorMessage.slice(0, 120))}`
              );
            }
          }
        } catch {
          // Skip malformed events
        }
      }
    }
  } catch {
    console.error(chalk.red("  Could not connect to collector."));
    console.error(chalk.gray("  Make sure the collector is running: npx llmtap"));
    process.exit(1);
  }
}
