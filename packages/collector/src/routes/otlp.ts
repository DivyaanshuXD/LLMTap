import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { spansToOtlp } from "@llmtap/shared";
import type { Span } from "@llmtap/shared";
import { getDb } from "../db.js";

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
  status: "ok" | "error";
  errorType: string | null;
  errorMessage: string | null;
  tags: string | null;
  sessionId: string | null;
  userId: string | null;
}

function safeParse(val: string | null): unknown {
  if (!val) return undefined;
  try { return JSON.parse(val); } catch { return undefined; }
}

function rowToSpan(row: SpanRow): Span {
  return {
    spanId: row.spanId,
    traceId: row.traceId,
    parentSpanId: row.parentSpanId ?? undefined,
    name: row.name,
    operationName: row.operationName,
    providerName: row.providerName,
    startTime: row.startTime,
    endTime: row.endTime ?? undefined,
    duration: row.duration ?? undefined,
    requestModel: row.requestModel,
    responseModel: row.responseModel ?? undefined,
    inputTokens: row.inputTokens,
    outputTokens: row.outputTokens,
    totalTokens: row.totalTokens,
    inputCost: row.inputCost,
    outputCost: row.outputCost,
    totalCost: row.totalCost,
    temperature: row.temperature ?? undefined,
    maxTokens: row.maxTokens ?? undefined,
    topP: row.topP ?? undefined,
    inputMessages: safeParse(row.inputMessages) as Span["inputMessages"],
    outputMessages: safeParse(row.outputMessages) as Span["outputMessages"],
    toolCalls: safeParse(row.toolCalls) as Span["toolCalls"],
    status: row.status,
    errorType: row.errorType ?? undefined,
    errorMessage: row.errorMessage ?? undefined,
    tags: safeParse(row.tags) as Record<string, string> | undefined,
    sessionId: row.sessionId ?? undefined,
    userId: row.userId ?? undefined,
  };
}

// Headers that must not be overridden by user input
const BLOCKED_HEADERS = new Set([
  "host", "content-length", "transfer-encoding", "connection",
  "keep-alive", "upgrade", "proxy-authorization", "te", "trailer",
]);

function sanitizeHeaders(
  userHeaders: Record<string, string> | undefined
): Record<string, string> {
  const result: Record<string, string> = { "Content-Type": "application/json" };
  if (!userHeaders) return result;
  for (const [key, value] of Object.entries(userHeaders)) {
    if (typeof key === "string" && typeof value === "string" && !BLOCKED_HEADERS.has(key.toLowerCase())) {
      result[key] = value;
    }
  }
  return result;
}

const OtlpExportQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(5000).default(1000),
  periodHours: z.coerce.number().int().min(0).max(8760).default(0),
  traceId: z.string().max(256).optional(),
  service: z.string().max(256).default("llmtap"),
});

const OtlpForwardSchema = z.object({
  endpoint: z.string().min(1).max(2048).url().refine(
    (url) => {
      try {
        const parsed = new URL(url);
        return parsed.protocol === "http:" || parsed.protocol === "https:";
      } catch {
        return false;
      }
    },
    { message: "endpoint must use http or https protocol" }
  ),
  headers: z.record(z.string().max(4096)).optional(),
  limit: z.number().int().min(1).max(5000).optional(),
  periodHours: z.number().int().min(0).max(8760).optional(),
  service: z.string().max(256).optional(),
});

export async function registerOtlpExportRoute(app: FastifyInstance): Promise<void> {
  /**
   * GET /v1/export/otlp
   *
   * Export spans as OTLP JSON. Accepts query params:
   *   ?limit=1000     Max spans to export (default 1000, max 5000)
   *   ?periodHours=24 Only spans from the last N hours
   *   ?traceId=abc    Only spans from a specific trace
   *   ?service=myapp  service.name resource attribute (default "llmtap")
   */
  app.get("/v1/export/otlp", async (request, reply) => {
    const parsed = OtlpExportQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Validation failed", details: parsed.error.issues });
    }
    const { limit, periodHours, traceId, service: serviceName } = parsed.data;

    const db = getDb();
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (periodHours > 0) {
      conditions.push("startTime >= ?");
      params.push(Date.now() - periodHours * 3600_000);
    }
    if (traceId) {
      conditions.push("traceId = ?");
      params.push(traceId);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    params.push(limit);

    const rows = db
      .prepare(`SELECT * FROM spans ${where} ORDER BY startTime DESC LIMIT ?`)
      .all(...params) as SpanRow[];

    const spans = rows.map(rowToSpan);
    const otlp = spansToOtlp(spans, serviceName);

    return reply
      .header("Content-Type", "application/json")
      .send(otlp);
  });

  /**
   * POST /v1/export/otlp/forward
   *
   * Forward stored spans to an external OTLP endpoint.
   * Body: { endpoint: "http://localhost:4318/v1/traces", headers?: {}, limit?: 1000, periodHours?: 24 }
   */
  app.post("/v1/export/otlp/forward", async (request, reply) => {
    const parsed = OtlpForwardSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Validation failed", details: parsed.error.issues });
    }
    const body = parsed.data;

    const limit = body.limit ?? 1000;
    const periodHours = body.periodHours ?? 0;
    const serviceName = body.service ?? "llmtap";

    const db = getDb();
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (periodHours > 0) {
      conditions.push("startTime >= ?");
      params.push(Date.now() - periodHours * 3600_000);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    params.push(limit);

    const rows = db
      .prepare(`SELECT * FROM spans ${where} ORDER BY startTime DESC LIMIT ?`)
      .all(...params) as SpanRow[];

    const spans = rows.map(rowToSpan);
    const otlp = spansToOtlp(spans, serviceName);

    try {
      const res = await fetch(body.endpoint, {
        method: "POST",
        headers: sanitizeHeaders(body.headers),
        body: JSON.stringify(otlp),
        signal: AbortSignal.timeout(30000),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        return reply.status(502).send({
          error: "OTLP endpoint returned error",
          status: res.status,
          body: text.slice(0, 500),
        });
      }

      return reply.send({
        status: "ok",
        spanCount: spans.length,
        endpoint: body.endpoint,
      });
    } catch (err) {
      return reply.status(502).send({
        error: "Failed to reach OTLP endpoint",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  });
}
