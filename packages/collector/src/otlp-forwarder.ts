import { spansToOtlp } from "@llmtap/shared";
import type { SpanInput } from "@llmtap/shared";

/**
 * Automatic OTLP forwarding when OTEL_EXPORTER_OTLP_ENDPOINT is set.
 *
 * Batches spans and forwards them asynchronously so ingest latency
 * is not affected. Follows the OpenTelemetry env var conventions:
 *
 *   OTEL_EXPORTER_OTLP_ENDPOINT    — Base URL (e.g. http://localhost:4318)
 *   OTEL_EXPORTER_OTLP_HEADERS     — Comma-separated key=value pairs
 *   OTEL_SERVICE_NAME               — service.name resource attribute
 */

let endpoint: string | null = null;
let headers: Record<string, string> = {};
let serviceName = "llmtap";
let buffer: SpanInput[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
const FLUSH_INTERVAL_MS = 2000;
const MAX_BATCH = 100;

export function initOtlpForwarder(): boolean {
  const rawEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
  if (!rawEndpoint) return false;

  // OTLP/HTTP traces endpoint: append /v1/traces if not already there
  endpoint = rawEndpoint.replace(/\/+$/, "");
  if (!endpoint.endsWith("/v1/traces")) {
    endpoint += "/v1/traces";
  }

  // Parse OTEL_EXPORTER_OTLP_HEADERS (comma-separated key=value)
  const rawHeaders = process.env.OTEL_EXPORTER_OTLP_HEADERS;
  if (rawHeaders) {
    for (const pair of rawHeaders.split(",")) {
      const eq = pair.indexOf("=");
      if (eq > 0) {
        headers[pair.slice(0, eq).trim()] = pair.slice(eq + 1).trim();
      }
    }
  }

  serviceName = process.env.OTEL_SERVICE_NAME ?? "llmtap";
  return true;
}

export function forwardSpans(spans: SpanInput[]): void {
  if (!endpoint) return;

  buffer.push(...spans);

  // Flush immediately if batch is large enough
  if (buffer.length >= MAX_BATCH) {
    flushOtlpBuffer();
    return;
  }

  // Otherwise debounce
  if (!flushTimer) {
    flushTimer = setTimeout(flushOtlpBuffer, FLUSH_INTERVAL_MS);
  }
}

function flushOtlpBuffer(): void {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }

  if (!endpoint || buffer.length === 0) return;

  const batch = buffer.splice(0, MAX_BATCH);

  // Cast SpanInput to Span shape (they're structurally compatible)
  const otlp = spansToOtlp(batch as Parameters<typeof spansToOtlp>[0], serviceName);

  // Fire and forget — don't block ingest
  fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: JSON.stringify(otlp),
    signal: AbortSignal.timeout(10000),
  }).catch(() => {
    // Silently drop on failure — OTLP forwarding is best-effort
  });

  // If there are remaining spans, schedule another flush
  if (buffer.length > 0) {
    flushTimer = setTimeout(flushOtlpBuffer, FLUSH_INTERVAL_MS);
  }
}

export function getOtlpEndpoint(): string | null {
  return endpoint;
}
