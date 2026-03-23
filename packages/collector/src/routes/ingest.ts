import type { FastifyInstance } from "fastify";
import { insertSpans } from "../db.js";
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

    insertSpans(parsed.data.spans);

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
