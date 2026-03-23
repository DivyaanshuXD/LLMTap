import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import { afterEach, describe, expect, it } from "vitest";
import { backupDb, closeDb, getDb, getDbPath, insertSpans, restoreDb } from "./db.js";

function createTempDbDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "llmtap-db-test-"));
}

function countSpans(): number {
  return (getDb().prepare("SELECT COUNT(*) as count FROM spans").get() as { count: number }).count;
}

afterEach(() => {
  closeDb();
  delete process.env.LLMTAP_DB_DIR;
  delete process.env.LLMTAP_DB_PATH;
});

describe("collector db utilities", () => {
  it("backs up the current database into a portable sqlite file", () => {
    const dbDir = createTempDbDir();
    process.env.LLMTAP_DB_DIR = dbDir;

    try {
      insertSpans([
        {
          spanId: "sp_backup",
          traceId: "tr_backup",
          name: "backup span",
          operationName: "chat",
          providerName: "openai",
          startTime: Date.now(),
          requestModel: "gpt-4o-mini",
          status: "ok",
        },
      ]);

      const backupPath = backupDb(path.join(dbDir, "backup.db"));
      expect(fs.existsSync(backupPath)).toBe(true);

      const backupDbHandle = new Database(backupPath, { readonly: true });
      const count = (
        backupDbHandle.prepare("SELECT COUNT(*) as count FROM spans").get() as { count: number }
      ).count;
      backupDbHandle.close();
      expect(count).toBe(1);
    } finally {
      closeDb();
      fs.rmSync(dbDir, { recursive: true, force: true });
    }
  });

  it("restores a backed up database over a clean database", () => {
    const dbDir = createTempDbDir();
    process.env.LLMTAP_DB_DIR = dbDir;

    try {
      insertSpans([
        {
          spanId: "sp_restore",
          traceId: "tr_restore",
          name: "restore span",
          operationName: "chat",
          providerName: "openai",
          startTime: Date.now(),
          requestModel: "gpt-4o-mini",
          status: "ok",
        },
      ]);

      const backupPath = backupDb(path.join(dbDir, "restore-source.db"));

      closeDb();
      fs.rmSync(getDbPath(), { force: true });
      expect(fs.existsSync(getDbPath())).toBe(false);

      const restoredPath = restoreDb(backupPath);
      expect(restoredPath).toBe(getDbPath());
      expect(countSpans()).toBe(1);
    } finally {
      closeDb();
      fs.rmSync(dbDir, { recursive: true, force: true });
    }
  });

  it("inserts imported spans with optional nested payload fields", () => {
    const dbDir = createTempDbDir();
    process.env.LLMTAP_DB_DIR = dbDir;

    try {
      insertSpans([
        {
          spanId: "sp_import_1",
          traceId: "tr_import",
          parentSpanId: "parent_1",
          name: "imported span",
          operationName: "chat",
          providerName: "anthropic",
          startTime: 1,
          endTime: 2,
          duration: 1,
          requestModel: "claude-sonnet-4",
          responseModel: "claude-sonnet-4",
          inputTokens: 10,
          outputTokens: 5,
          totalTokens: 15,
          totalCost: 0.001,
          inputMessages: [{ role: "user", content: "hello" }],
          outputMessages: [{ role: "assistant", content: "world" }],
          toolCalls: [{ id: "tool_1", name: "lookup", arguments: "{\"q\":\"x\"}" }],
          tags: { env: "test" },
          status: "ok",
        },
      ]);

      const row = getDb()
        .prepare("SELECT parentSpanId, inputMessages, outputMessages, toolCalls, tags FROM spans WHERE spanId = ?")
        .get("sp_import_1") as {
          parentSpanId: string;
          inputMessages: string;
          outputMessages: string;
          toolCalls: string;
          tags: string;
        };

      expect(row.parentSpanId).toBe("parent_1");
      expect(JSON.parse(row.inputMessages)[0].content).toBe("hello");
      expect(JSON.parse(row.outputMessages)[0].content).toBe("world");
      expect(JSON.parse(row.toolCalls)[0].name).toBe("lookup");
      expect(JSON.parse(row.tags).env).toBe("test");
    } finally {
      closeDb();
      fs.rmSync(dbDir, { recursive: true, force: true });
    }
  });
});
