import { Command } from "commander";
import { startCommand } from "./commands/start.js";
import { resetCommand } from "./commands/reset.js";
import { exportCommand } from "./commands/export.js";
import { statusCommand } from "./commands/status.js";
import { tailCommand } from "./commands/tail.js";
import { doctorCommand } from "./commands/doctor.js";
import { statsCommand } from "./commands/stats.js";
import { VERSION } from "@llmtap/shared";

const program = new Command();

program
  .name("llmtap")
  .description("DevTools for AI Agents - See every LLM call, trace agent workflows, track costs")
  .version(VERSION);

program
  .command("start", { isDefault: true })
  .description("Start the LLMTap collector and dashboard")
  .option("-p, --port <port>", "Port number", "4781")
  .option("-H, --host <host>", "Host to bind to (use 0.0.0.0 to expose to network)", "127.0.0.1")
  .option("-q, --quiet", "Suppress server logs")
  .option("--demo", "Seed demo data on startup")
  .option("--no-open", "Don't open browser automatically")
  .option("-r, --retention <days>", "Auto-delete data older than N days (0 = keep forever)")
  .action(startCommand);

program
  .command("status")
  .description("Show collector status, database info, and span count")
  .action(statusCommand);

program
  .command("reset")
  .description("Clear all stored data")
  .action(resetCommand);

program
  .command("export")
  .description("Export traces as JSON, CSV, or OTLP")
  .option("-o, --output <path>", "Output file path", "llmtap-export.json")
  .option("-f, --format <format>", "Output format (json, csv, or otlp)", "json")
  .option("-l, --limit <count>", "Number of traces/spans to export", "100")
  .option("-e, --endpoint <url>", "OTLP endpoint to forward spans to (e.g. http://localhost:4318/v1/traces)")
  .option("-s, --service <name>", "service.name for OTLP export", "llmtap")
  .action(exportCommand);

program
  .command("tail")
  .description("Stream traces to terminal in real-time")
  .option("-f, --format <format>", "Output format (pretty or json)", "pretty")
  .action(tailCommand);

program
  .command("doctor")
  .description("Diagnose common setup issues")
  .action(doctorCommand);

program
  .command("stats")
  .description("Show quick terminal stats (cost, models, errors)")
  .option("-p, --period <hours>", "Time period in hours", "24")
  .option("--host <url>", "Collector URL", "http://localhost:4781")
  .action(statsCommand);

program.parse();
