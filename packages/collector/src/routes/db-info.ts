import type { FastifyInstance } from "fastify";
import fs from "node:fs";
import { getDb, getDbPath } from "../db.js";
import { ROUTES } from "@llmtap/shared";

export async function registerDbInfoRoute(
  app: FastifyInstance
): Promise<void> {
  app.get(ROUTES.GET_DB_INFO, async (_request, reply) => {
    const db = getDb();
    const dbPath = getDbPath();

    let sizeBytes = 0;
    try {
      const stat = fs.statSync(dbPath);
      sizeBytes = stat.size;
    } catch {
      /* db file may not exist yet */
    }

    const spanCount = (
      db.prepare("SELECT COUNT(*) as count FROM spans").get() as {
        count: number;
      }
    ).count;

    const traceCount = (
      db
        .prepare("SELECT COUNT(DISTINCT traceId) as count FROM spans")
        .get() as { count: number }
    ).count;

    const oldestSpan = (
      db
        .prepare("SELECT MIN(startTime) as oldest FROM spans")
        .get() as { oldest: number | null }
    ).oldest;

    const newestSpan = (
      db
        .prepare("SELECT MAX(startTime) as newest FROM spans")
        .get() as { newest: number | null }
    ).newest;

    return reply.send({
      path: dbPath,
      sizeBytes,
      spanCount,
      traceCount,
      oldestSpan,
      newestSpan,
      walMode: (db.pragma("journal_mode") as { journal_mode: string }[])[0]
        ?.journal_mode,
    });
  });
}
