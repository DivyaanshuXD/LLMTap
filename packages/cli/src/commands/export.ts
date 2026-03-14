import fs from "node:fs";
import path from "node:path";
import chalk from "chalk";
import { getDb } from "@llmtap/collector";
import { spansToOtlp } from "@llmtap/shared";
import type { Span } from "@llmtap/shared";

interface ExportOptions {
  output: string;
  limit: string;
  format: string;
  endpoint?: string;
  service?: string;
}

function safeParse(v: unknown): unknown {
  if (!v || typeof v !== "string") return undefined;
  try { return JSON.parse(v); } catch { return undefined; }
}

function rowToSpan(row: Record<string, unknown>): Span {
  return {
    ...row,
    parentSpanId: (row.parentSpanId as string) ?? undefined,
    endTime: (row.endTime as number) ?? undefined,
    duration: (row.duration as number) ?? undefined,
    responseModel: (row.responseModel as string) ?? undefined,
    temperature: (row.temperature as number) ?? undefined,
    maxTokens: (row.maxTokens as number) ?? undefined,
    topP: (row.topP as number) ?? undefined,
    inputMessages: safeParse(row.inputMessages) as Span["inputMessages"],
    outputMessages: safeParse(row.outputMessages) as Span["outputMessages"],
    toolCalls: safeParse(row.toolCalls) as Span["toolCalls"],
    tags: safeParse(row.tags) as Record<string, string> | undefined,
    errorType: (row.errorType as string) ?? undefined,
    errorMessage: (row.errorMessage as string) ?? undefined,
    sessionId: (row.sessionId as string) ?? undefined,
    userId: (row.userId as string) ?? undefined,
  } as Span;
}

export async function exportCommand(options: ExportOptions): Promise<void> {
  try {
    const db = getDb();
    const limit = parseInt(options.limit, 10);
    const format = options.format ?? "json";

    if (format === "otlp") {
      return await exportOtlp(db, limit, options);
    }

    // Get traces
    const traces = db
      .prepare(
        `
      SELECT
        traceId,
        MIN(name) as name,
        MIN(startTime) as startTime,
        MAX(endTime) as endTime,
        CASE WHEN SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) > 0
             THEN 'error' ELSE 'ok' END as status,
        COUNT(*) as spanCount,
        COALESCE(SUM(totalTokens), 0) as totalTokens,
        COALESCE(SUM(totalCost), 0) as totalCost
      FROM spans
      GROUP BY traceId
      ORDER BY startTime DESC
      LIMIT ?
    `
      )
      .all(limit) as Array<Record<string, unknown>>;

    // Get spans for each trace
    const getSpans = db.prepare("SELECT * FROM spans WHERE traceId = ? ORDER BY startTime ASC");
    const exportData = traces.map((trace) => ({
      ...trace,
      spans: (getSpans.all(trace.traceId) as Array<Record<string, unknown>>).map((span) => ({
        ...span,
        inputMessages: safeParse(span.inputMessages),
        outputMessages: safeParse(span.outputMessages),
        toolCalls: safeParse(span.toolCalls),
        tags: safeParse(span.tags),
      })),
    }));

    let output: string;
    let ext: string;

    if (format === "csv") {
      ext = "csv";
      const headers = [
        "traceId", "name", "status", "spanCount", "totalTokens", "totalCost",
        "startTime", "endTime",
      ];
      const rows = traces.map((t) =>
        headers.map((h) => {
          const val = t[h];
          const s = String(val ?? "");
          return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
        }).join(",")
      );
      output = [headers.join(","), ...rows].join("\n");
    } else {
      ext = "json";
      output = JSON.stringify(exportData, null, 2);
    }

    const defaultOutput = options.output === "llmtap-export.json" && format === "csv"
      ? "llmtap-export.csv"
      : options.output;
    const outputPath = path.resolve(defaultOutput);
    fs.writeFileSync(outputPath, output);

    console.log(chalk.green(`  Exported ${traces.length} traces as ${ext.toUpperCase()} to ${outputPath}`));
  } catch (err: unknown) {
    const error = err as Error;
    console.error(chalk.red(`  Export failed: ${error.message}`));
    process.exit(1);
  }
}

async function exportOtlp(
  db: ReturnType<typeof getDb>,
  limit: number,
  options: ExportOptions
): Promise<void> {
  const rows = db
    .prepare("SELECT * FROM spans ORDER BY startTime DESC LIMIT ?")
    .all(limit) as Array<Record<string, unknown>>;

  const spans = rows.map(rowToSpan);
  const otlp = spansToOtlp(spans, options.service ?? "llmtap");

  // If --endpoint is provided, forward to OTLP collector
  if (options.endpoint) {
    console.log(chalk.blue(`  Forwarding ${spans.length} spans to ${options.endpoint}...`));
    try {
      const res = await fetch(options.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(otlp),
        signal: AbortSignal.timeout(30000),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        console.error(chalk.red(`  OTLP endpoint returned ${res.status}: ${body.slice(0, 200)}`));
        process.exit(1);
      }
      console.log(chalk.green(`  Successfully forwarded ${spans.length} spans to OTLP endpoint`));
    } catch (err) {
      console.error(chalk.red(`  Failed to reach OTLP endpoint: ${err instanceof Error ? err.message : String(err)}`));
      process.exit(1);
    }
    return;
  }

  // Otherwise write to file
  const outputPath = path.resolve(
    options.output === "llmtap-export.json" ? "llmtap-export.otlp.json" : options.output
  );
  fs.writeFileSync(outputPath, JSON.stringify(otlp, null, 2));
  console.log(chalk.green(`  Exported ${spans.length} spans as OTLP JSON to ${outputPath}`));
  console.log(chalk.dim(`  Import into Jaeger, Grafana Tempo, Datadog, or any OTLP-compatible backend`));
}
