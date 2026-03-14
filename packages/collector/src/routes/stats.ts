import type { FastifyInstance } from "fastify";
import { getDb } from "../db.js";
import { ROUTES } from "@llmtap/shared";
import { StatsQuerySchema } from "../schemas.js";

interface StatsRow {
  totalTraces: number;
  totalSpans: number;
  totalTokens: number;
  totalCost: number;
  avgDuration: number;
  errorCount: number;
}

interface ProviderStatsRow {
  provider: string;
  spanCount: number;
  totalTokens: number;
  totalCost: number;
  avgDuration: number;
}

interface ModelStatsRow {
  model: string;
  provider: string;
  spanCount: number;
  totalTokens: number;
  totalCost: number;
  avgDuration: number;
}

interface CostRow {
  bucket: number;
  cost: number;
  tokens: number;
  spans: number;
}

export async function registerStatsRoute(
  app: FastifyInstance
): Promise<void> {
  app.get(ROUTES.GET_STATS, async (request, reply) => {
    const parsed = StatsQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid query parameters", details: parsed.error.flatten() });
    }
    const periodHours = parsed.data.period;
    const since = Date.now() - periodHours * 60 * 60 * 1000;

    const db = getDb();

    // Aggregate stats
    const stats = db
      .prepare(
        `
      SELECT
        COUNT(DISTINCT traceId) as totalTraces,
        COUNT(*) as totalSpans,
        COALESCE(SUM(totalTokens), 0) as totalTokens,
        COALESCE(SUM(totalCost), 0) as totalCost,
        COALESCE(AVG(duration), 0) as avgDuration,
        SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as errorCount
      FROM spans
      WHERE startTime >= @since
    `
      )
      .get({ since }) as StatsRow;

    // By provider
    const byProvider = db
      .prepare(
        `
      SELECT
        providerName as provider,
        COUNT(*) as spanCount,
        COALESCE(SUM(totalTokens), 0) as totalTokens,
        COALESCE(SUM(totalCost), 0) as totalCost,
        COALESCE(AVG(duration), 0) as avgDuration
      FROM spans
      WHERE startTime >= @since
      GROUP BY providerName
      ORDER BY totalCost DESC
    `
      )
      .all({ since }) as ProviderStatsRow[];

    // By model
    const byModel = db
      .prepare(
        `
      SELECT
        requestModel as model,
        providerName as provider,
        COUNT(*) as spanCount,
        COALESCE(SUM(totalTokens), 0) as totalTokens,
        COALESCE(SUM(totalCost), 0) as totalCost,
        COALESCE(AVG(duration), 0) as avgDuration
      FROM spans
      WHERE startTime >= @since
      GROUP BY requestModel, providerName
      ORDER BY totalCost DESC
    `
      )
      .all({ since }) as ModelStatsRow[];

    // Cost over time (hourly buckets)
    const costOverTime = db
      .prepare(
        `
      SELECT
        (startTime / 3600000) * 3600000 as bucket,
        COALESCE(SUM(totalCost), 0) as cost,
        COALESCE(SUM(totalTokens), 0) as tokens,
        COUNT(*) as spans
      FROM spans
      WHERE startTime >= @since
      GROUP BY bucket
      ORDER BY bucket ASC
    `
      )
      .all({ since }) as CostRow[];

    return reply.send({
      period: `${periodHours}h`,
      ...stats,
      errorRate:
        stats.totalSpans > 0
          ? stats.errorCount / stats.totalSpans
          : 0,
      byProvider,
      byModel,
      costOverTime: costOverTime.map((r) => ({
        timestamp: r.bucket,
        cost: r.cost,
        tokens: r.tokens,
        spans: r.spans,
      })),
    });
  });
}
