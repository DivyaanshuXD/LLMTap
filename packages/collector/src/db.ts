import Database from "better-sqlite3";
import path from "node:path";
import os from "node:os";
import fs from "node:fs";
import type { SpanInput } from "@llmtap/shared";
import { DB_DIR_NAME, DB_FILE_NAME } from "@llmtap/shared";

let db: Database.Database | null = null;
let retentionCheckInterval: ReturnType<typeof setInterval> | null = null;

function stringifyOrNull(value: unknown): string | null {
  return value ? JSON.stringify(value) : null;
}

function toInsertRow(span: SpanInput) {
  return {
    spanId: span.spanId,
    traceId: span.traceId,
    parentSpanId: span.parentSpanId ?? null,
    name: span.name,
    operationName: span.operationName,
    providerName: span.providerName,
    startTime: span.startTime,
    endTime: span.endTime ?? null,
    duration: span.duration ?? null,
    requestModel: span.requestModel,
    responseModel: span.responseModel ?? null,
    inputTokens: span.inputTokens ?? 0,
    outputTokens: span.outputTokens ?? 0,
    totalTokens: span.totalTokens ?? 0,
    inputCost: span.inputCost ?? 0,
    outputCost: span.outputCost ?? 0,
    totalCost: span.totalCost ?? 0,
    temperature: span.temperature ?? null,
    maxTokens: span.maxTokens ?? null,
    topP: span.topP ?? null,
    inputMessages: stringifyOrNull(span.inputMessages),
    outputMessages: stringifyOrNull(span.outputMessages),
    toolCalls: stringifyOrNull(span.toolCalls),
    status: span.status,
    errorType: span.errorType ?? null,
    errorMessage: span.errorMessage ?? null,
    tags: stringifyOrNull(span.tags),
    sessionId: span.sessionId ?? null,
    userId: span.userId ?? null,
  };
}

// ---------- Migration system ----------

interface Migration {
  version: number;
  description: string;
  up: (db: Database.Database) => void;
}

const migrations: Migration[] = [
  {
    version: 1,
    description: "Initial schema — spans table and indexes",
    up(db) {
      db.exec(`
        CREATE TABLE IF NOT EXISTS spans (
          spanId TEXT PRIMARY KEY,
          traceId TEXT NOT NULL,
          parentSpanId TEXT,
          name TEXT NOT NULL,
          operationName TEXT NOT NULL,
          providerName TEXT NOT NULL,
          startTime INTEGER NOT NULL,
          endTime INTEGER,
          duration INTEGER,
          requestModel TEXT NOT NULL,
          responseModel TEXT,
          inputTokens INTEGER DEFAULT 0,
          outputTokens INTEGER DEFAULT 0,
          totalTokens INTEGER DEFAULT 0,
          inputCost REAL DEFAULT 0,
          outputCost REAL DEFAULT 0,
          totalCost REAL DEFAULT 0,
          temperature REAL,
          maxTokens INTEGER,
          topP REAL,
          inputMessages TEXT,
          outputMessages TEXT,
          toolCalls TEXT,
          status TEXT NOT NULL DEFAULT 'ok',
          errorType TEXT,
          errorMessage TEXT,
          tags TEXT,
          sessionId TEXT,
          userId TEXT,
          createdAt INTEGER DEFAULT (strftime('%s','now') * 1000)
        );

        CREATE INDEX IF NOT EXISTS idx_spans_traceId ON spans(traceId);
        CREATE INDEX IF NOT EXISTS idx_spans_startTime ON spans(startTime);
        CREATE INDEX IF NOT EXISTS idx_spans_providerName ON spans(providerName);
        CREATE INDEX IF NOT EXISTS idx_spans_requestModel ON spans(requestModel);
        CREATE INDEX IF NOT EXISTS idx_spans_status ON spans(status);
      `);
    },
  },
  {
    version: 2,
    description: "Add sessionId index for session queries",
    up(db) {
      db.exec(
        `CREATE INDEX IF NOT EXISTS idx_spans_sessionId ON spans(sessionId);`
      );
    },
  },
];

function ensureMigrationsTable(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      version INTEGER PRIMARY KEY,
      description TEXT NOT NULL,
      appliedAt INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
    );
  `);
}

function getAppliedVersion(db: Database.Database): number {
  const row = db
    .prepare("SELECT MAX(version) as maxVer FROM _migrations")
    .get() as { maxVer: number | null };
  return row.maxVer ?? 0;
}

function runMigrations(db: Database.Database): void {
  ensureMigrationsTable(db);
  const currentVersion = getAppliedVersion(db);

  const insertMigration = db.prepare(
    "INSERT INTO _migrations (version, description) VALUES (@version, @description)"
  );

  const applyPending = db.transaction(() => {
    for (const migration of migrations) {
      if (migration.version <= currentVersion) continue;
      migration.up(db);
      insertMigration.run({
        version: migration.version,
        description: migration.description,
      });
    }
  });

  applyPending();
}

// ---------- Database lifecycle ----------

/** Get or create the SQLite database */
export function getDb(): Database.Database {
  if (db) return db;

  const dbDir = getDbDirPath();
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  const dbPath = getDbPath();
  db = new Database(dbPath);

  // Enable WAL for better performance
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  // Wait up to 5s when DB is locked by another writer (prevents SQLITE_BUSY)
  db.pragma("busy_timeout = 5000");

  runMigrations(db);
  return db;
}

export function getDbDirPath(): string {
  return process.env.LLMTAP_DB_DIR
    ? path.resolve(process.env.LLMTAP_DB_DIR)
    : path.join(os.homedir(), DB_DIR_NAME);
}

export function getDbPath(): string {
  return process.env.LLMTAP_DB_PATH
    ? path.resolve(process.env.LLMTAP_DB_PATH)
    : path.join(getDbDirPath(), DB_FILE_NAME);
}

export function insertSpans(spans: SpanInput[]): number {
  if (spans.length === 0) return 0;

  const d = getDb();
  const insert = d.prepare(`
    INSERT OR REPLACE INTO spans (
      spanId, traceId, parentSpanId, name, operationName, providerName,
      startTime, endTime, duration, requestModel, responseModel,
      inputTokens, outputTokens, totalTokens,
      inputCost, outputCost, totalCost,
      temperature, maxTokens, topP,
      inputMessages, outputMessages, toolCalls,
      status, errorType, errorMessage,
      tags, sessionId, userId
    ) VALUES (
      @spanId, @traceId, @parentSpanId, @name, @operationName, @providerName,
      @startTime, @endTime, @duration, @requestModel, @responseModel,
      @inputTokens, @outputTokens, @totalTokens,
      @inputCost, @outputCost, @totalCost,
      @temperature, @maxTokens, @topP,
      @inputMessages, @outputMessages, @toolCalls,
      @status, @errorType, @errorMessage,
      @tags, @sessionId, @userId
    )
  `);

  const insertMany = d.transaction((items: SpanInput[]) => {
    for (const span of items) {
      insert.run(toInsertRow(span));
    }
  });

  insertMany(spans);
  return spans.length;
}

export function backupDb(destinationPath: string): string {
  const outputPath = path.resolve(destinationPath);
  const outputDir = path.dirname(outputPath);
  fs.mkdirSync(outputDir, { recursive: true });
  if (fs.existsSync(outputPath)) {
    fs.rmSync(outputPath, { force: true });
  }

  const d = getDb();
  try {
    d.pragma("wal_checkpoint(TRUNCATE)");
  } catch {
    /* best effort */
  }

  const escapedPath = outputPath.replace(/'/g, "''");
  d.exec(`VACUUM INTO '${escapedPath}'`);
  return outputPath;
}

export function restoreDb(sourcePath: string): string {
  const inputPath = path.resolve(sourcePath);
  const dbPath = getDbPath();

  if (!fs.existsSync(inputPath)) {
    throw new Error(`Backup file not found: ${inputPath}`);
  }
  if (inputPath === dbPath) {
    throw new Error("Backup source cannot be the active database file");
  }

  closeDb();

  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  for (const candidate of [dbPath, `${dbPath}-wal`, `${dbPath}-shm`]) {
    if (fs.existsSync(candidate)) {
      fs.rmSync(candidate, { force: true });
    }
  }

  fs.copyFileSync(inputPath, dbPath);
  return dbPath;
}

/** Close the database connection */
export function closeDb(): void {
  if (retentionCheckInterval) {
    clearInterval(retentionCheckInterval);
    retentionCheckInterval = null;
  }
  if (db) {
    // Checkpoint WAL before closing to consolidate changes
    try {
      db.pragma("wal_checkpoint(TRUNCATE)");
    } catch {
      /* best effort */
    }
    db.close();
    db = null;
  }
}

/** Reset the database (delete all data) */
export function resetDb(): void {
  const d = getDb();
  d.exec("DELETE FROM spans");
  d.exec("VACUUM");
}

// ---------- Data retention ----------

/**
 * Delete spans older than `retentionDays` and reclaim disk space.
 * Returns the number of rows deleted.
 */
export function enforceRetention(retentionDays: number): number {
  if (retentionDays <= 0) return 0;

  const d = getDb();
  const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;

  const result = d
    .prepare("DELETE FROM spans WHERE startTime < @cutoff")
    .run({ cutoff });

  if (result.changes > 0) {
    d.exec("VACUUM");
  }

  return result.changes;
}

/**
 * Start periodic retention enforcement (runs every hour).
 * Also runs once immediately on call.
 */
export function startRetentionSchedule(retentionDays: number): void {
  if (retentionDays <= 0) return;

  // Run immediately on startup
  enforceRetention(retentionDays);

  // Then run every hour
  retentionCheckInterval = setInterval(
    () => enforceRetention(retentionDays),
    60 * 60 * 1000
  );
  // Don't block process exit
  if (retentionCheckInterval.unref) {
    retentionCheckInterval.unref();
  }
}
