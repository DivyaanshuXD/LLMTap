import { Command } from "commander";
import { startCommand } from "./commands/start.js";
import { resetCommand } from "./commands/reset.js";
import { exportCommand } from "./commands/export.js";
import { backupCommand } from "./commands/backup.js";
import { restoreCommand } from "./commands/restore.js";
import { importCommand } from "./commands/import.js";
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
  .option("--host <url>", "Collector URL", "http://localhost:4781")
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
  .command("backup")
  .description("Create a portable SQLite backup of your local LLMTap data")
  .option("-o, --output <path>", "Backup output path")
  .action(backupCommand);

program
  .command("restore <input>")
  .description("Restore the local LLMTap database from a backup file")
  .option("--host <url>", "Collector URL to check before restoring", "http://localhost:4781")
  .action(restoreCommand);

program
  .command("import <input>")
  .description("Import LLMTap JSON exports back into local storage")
  .option("--replace", "Replace the existing local database contents before importing")
  .option("--host <url>", "Collector URL for live ingest when running", "http://localhost:4781")
  .action(importCommand);

program
  .command("tail")
  .description("Stream traces to terminal in real-time")
  .option("-f, --format <format>", "Output format (pretty or json)", "pretty")
  .action(tailCommand);

program
  .command("doctor")
  .description("Diagnose common setup issues")
  .option("--host <url>", "Collector URL", "http://localhost:4781")
  .action(doctorCommand);

program
  .command("stats")
  .description("Show quick terminal stats (cost, models, errors)")
  .option("-p, --period <hours>", "Time period in hours", "24")
  .option("--host <url>", "Collector URL", "http://localhost:4781")
  .action(statsCommand);

program.parse();
