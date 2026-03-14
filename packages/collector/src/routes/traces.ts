import type { FastifyInstance } from "fastify";
import { getDb } from "../db.js";
import { ROUTES } from "@llmtap/shared";
import { TracesQuerySchema } from "../schemas.js";

interface TraceRow {
  traceId: string;
  name: string;
  startTime: number;
  endTime: number | null;
  status: string;
  spanCount: number;
  totalTokens: number;
  totalCost: number;
  totalDuration: number | null;
}

interface SpanRow {
  spanId: string;
  traceId: string;
  parentSpanId: string | null;
  name: string;
  operationName: string;
  providerName: string;
  startTime: number;
  endTime: number | null;
  duration: number | null;
  requestModel: string;
  responseModel: string | null;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  inputCost: number;
  outputCost: number;
  totalCost: number;
  temperature: number | null;
  maxTokens: number | null;
  topP: number | null;
  inputMessages: string | null;
  outputMessages: string | null;
  toolCalls: string | null;
  status: string;
  errorType: string | null;
  errorMessage: string | null;
  tags: string | null;
  sessionId: string | null;
  userId: string | null;
}

function safeJsonParse(val: string | null): unknown {
  if (!val) return undefined;
  try { return JSON.parse(val); } catch { return undefined; }
}

function parseSpanRow(row: SpanRow) {
  return {
    ...row,
    inputMessages: safeJsonParse(row.inputMessages),
    outputMessages: safeJsonParse(row.outputMessages),
    toolCalls: safeJsonParse(row.toolCalls),
    tags: safeJsonParse(row.tags),
    parentSpanId: row.parentSpanId ?? undefined,
    responseModel: row.responseModel ?? undefined,
    endTime: row.endTime ?? undefined,
    duration: row.duration ?? undefined,
    temperature: row.temperature ?? undefined,
    maxTokens: row.maxTokens ?? undefined,
    topP: row.topP ?? undefined,
    errorType: row.errorType ?? undefined,
    errorMessage: row.errorMessage ?? undefined,
    sessionId: row.sessionId ?? undefined,
    userId: row.userId ?? undefined,
  };
}

export async function registerTraceRoutes(
  app: FastifyInstance
): Promise<void> {
  // List traces
  app.get(ROUTES.LIST_TRACES, async (request, reply) => {
    const parsed = TracesQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid query parameters", details: parsed.error.flatten() });
    }
    const { limit, offset, status, provider, q, periodHours } = parsed.data;

    const db = getDb();

    const whereConditions: string[] = [];
    const havingConditions: string[] = [];
    const params: Record<string, unknown> = { limit, offset };

    if (status) {
      havingConditions.push("status = @status");
      params.status = status;
    }

    if (provider) {
      whereConditions.push("providerName = @provider");
      params.provider = provider;
    }

    if (q) {
      const escaped = q.replace(/[%_]/g, "\\$&");
      whereConditions.push(`
        (
          name LIKE @search ESCAPE '\\' OR
          providerName LIKE @search ESCAPE '\\' OR
          requestModel LIKE @search ESCAPE '\\' OR
          COALESCE(responseModel, '') LIKE @search ESCAPE '\\' OR
          COALESCE(errorMessage, '') LIKE @search ESCAPE '\\' OR
          COALESCE(inputMessages, '') LIKE @search ESCAPE '\\' OR
          COALESCE(outputMessages, '') LIKE @search ESCAPE '\\'
        )
      `);
      params.search = `%${escaped}%`;
    }

    if (periodHours) {
      whereConditions.push("startTime >= @since");
      params.since = Date.now() - periodHours * 60 * 60 * 1000;
    }

    const whereClause =
      whereConditions.length > 0 ? `WHERE ${whereConditions.join(" AND ")}` : "";
    const havingClause =
      havingConditions.length > 0
        ? `HAVING ${havingConditions.join(" AND ")}`
        : "";

    const rows = db
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
        SUM(totalTokens) as totalTokens,
        SUM(totalCost) as totalCost,
        MAX(endTime) - MIN(startTime) as totalDuration
      FROM spans
      ${whereClause}
      GROUP BY traceId
      ${havingClause}
      ORDER BY startTime DESC
      LIMIT @limit OFFSET @offset
    `
      )
      .all(params) as TraceRow[];

    const totalRow = db
      .prepare(
        `
      SELECT COUNT(*) as total
      FROM (
        SELECT traceId
        FROM spans
        ${whereClause}
        GROUP BY traceId
        ${havingClause}
      ) grouped_traces
    `
      )
      .get(params) as { total: number };

    return reply.send({
      traces: rows.map((r) => ({
        ...r,
        endTime: r.endTime ?? undefined,
        totalDuration: r.totalDuration ?? undefined,
      })),
      total: totalRow.total,
    });
  });

  // Get spans for a trace
  app.get("/v1/traces/:traceId/spans", async (request, reply) => {
    const { traceId } = request.params as { traceId: string };
    const db = getDb();

    const rows = db
      .prepare(
        `SELECT * FROM spans WHERE traceId = @traceId ORDER BY startTime ASC`
      )
      .all({ traceId }) as SpanRow[];

    return reply.send({
      spans: rows.map(parseSpanRow),
    });
  });
}
