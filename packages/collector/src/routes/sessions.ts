import type { FastifyInstance } from "fastify";
import { getDb } from "../db.js";
import { ROUTES } from "@llmtap/shared";
import { SessionsQuerySchema } from "../schemas.js";

interface SessionRow {
  sessionId: string;
  traceCount: number;
  spanCount: number;
  totalTokens: number;
  totalCost: number;
  firstSeen: number;
  lastSeen: number;
  errorCount: number;
}

export async function registerSessionsRoute(
  app: FastifyInstance
): Promise<void> {
  app.get(ROUTES.GET_SESSIONS, async (request, reply) => {
    const parsed = SessionsQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid query parameters", details: parsed.error.flatten() });
    }
    const { periodHours, limit, offset } = parsed.data;
    const since = Date.now() - periodHours * 60 * 60 * 1000;

    const db = getDb();

    const rows = db
      .prepare(
        `
      SELECT
        sessionId,
        COUNT(DISTINCT traceId) as traceCount,
        COUNT(*) as spanCount,
        COALESCE(SUM(totalTokens), 0) as totalTokens,
        COALESCE(SUM(totalCost), 0) as totalCost,
        MIN(startTime) as firstSeen,
        MAX(startTime) as lastSeen,
        SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as errorCount
      FROM spans
      WHERE sessionId IS NOT NULL AND sessionId != '' AND startTime >= @since
      GROUP BY sessionId
      ORDER BY lastSeen DESC
      LIMIT @limit OFFSET @offset
    `
      )
      .all({ since, limit, offset }) as SessionRow[];

    const totalRow = db
      .prepare(
        `
      SELECT COUNT(DISTINCT sessionId) as total
      FROM spans
      WHERE sessionId IS NOT NULL AND sessionId != '' AND startTime >= @since
    `
      )
      .get({ since }) as { total: number };

    return reply.send({ sessions: rows, total: totalRow.total });
  });
}
