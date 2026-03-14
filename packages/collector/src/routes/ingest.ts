import type { FastifyInstance } from "fastify";
import { getDb } from "../db.js";
import { IngestRequestSchema } from "../schemas.js";
import { emitSpanEvent } from "../events.js";
import { forwardSpans } from "../otlp-forwarder.js";
import { ROUTES } from "@llmtap/shared";

export async function registerIngestRoute(
  app: FastifyInstance
): Promise<void> {
  app.post(ROUTES.INGEST_SPANS, async (request, reply) => {
    const parsed = IngestRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: "Validation failed",
        details: parsed.error.issues,
      });
    }

    const db = getDb();
    const insert = db.prepare(`
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

    const insertMany = db.transaction((spans: typeof parsed.data.spans) => {
      for (const span of spans) {
        insert.run({
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
          inputMessages: span.inputMessages
            ? JSON.stringify(span.inputMessages)
            : null,
          outputMessages: span.outputMessages
            ? JSON.stringify(span.outputMessages)
            : null,
          toolCalls: span.toolCalls
            ? JSON.stringify(span.toolCalls)
            : null,
          status: span.status,
          errorType: span.errorType ?? null,
          errorMessage: span.errorMessage ?? null,
          tags: span.tags ? JSON.stringify(span.tags) : null,
          sessionId: span.sessionId ?? null,
          userId: span.userId ?? null,
        });
      }
    });

    insertMany(parsed.data.spans);

    // Emit SSE events for each span
    for (const span of parsed.data.spans) {
      emitSpanEvent(span);
    }

    // Forward to OTLP endpoint if configured (async, best-effort)
    forwardSpans(parsed.data.spans);

    return reply.status(200).send({
      accepted: parsed.data.spans.length,
    });
  });
}
