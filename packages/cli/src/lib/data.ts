import type { SpanInput } from "@llmtap/shared";

interface TraceExportShape {
  traceId?: unknown;
  spans?: unknown;
}

function isSpanCandidate(value: unknown): value is SpanInput {
  if (!value || typeof value !== "object") return false;
  const span = value as Record<string, unknown>;
  return (
    typeof span.spanId === "string" &&
    typeof span.traceId === "string" &&
    typeof span.name === "string" &&
    typeof span.operationName === "string" &&
    typeof span.providerName === "string" &&
    typeof span.requestModel === "string" &&
    typeof span.startTime === "number" &&
    typeof span.status === "string"
  );
}

function collectFromArray(items: unknown[]): SpanInput[] {
  if (items.every(isSpanCandidate)) {
    return items;
  }

  const spans = items.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const trace = item as TraceExportShape;
    return Array.isArray(trace.spans) ? trace.spans.filter(isSpanCandidate) : [];
  });

  return spans;
}

export function normalizeImportPayload(payload: unknown): SpanInput[] {
  if (Array.isArray(payload)) {
    const spans = collectFromArray(payload);
    if (spans.length > 0) return spans;
  }

  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    if (Array.isArray(record.spans)) {
      const spans = record.spans.filter(isSpanCandidate);
      if (spans.length > 0) return spans;
    }
    if (Array.isArray(record.traces)) {
      const spans = collectFromArray(record.traces);
      if (spans.length > 0) return spans;
    }
  }

  throw new Error(
    "Unsupported import file. Expected LLMTap JSON export with traces[].spans or a raw spans array."
  );
}

export function summarizeImportedSpans(spans: SpanInput[]): {
  spanCount: number;
  traceCount: number;
} {
  return {
    spanCount: spans.length,
    traceCount: new Set(spans.map((span) => span.traceId)).size,
  };
}
