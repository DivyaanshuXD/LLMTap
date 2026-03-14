import type { Span } from "./types.js";

/**
 * Convert LLMTap spans to OpenTelemetry OTLP JSON format.
 *
 * Follows the OTLP/HTTP JSON specification and the
 * OpenTelemetry GenAI Semantic Conventions for LLM spans.
 *
 * @see https://opentelemetry.io/docs/specs/otlp/
 * @see https://opentelemetry.io/docs/specs/semconv/gen-ai/
 */

interface OtlpAttribute {
  key: string;
  value: { stringValue?: string; intValue?: string; doubleValue?: number; boolValue?: boolean };
}

interface OtlpEvent {
  name: string;
  timeUnixNano: string;
  attributes: OtlpAttribute[];
}

interface OtlpSpan {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  name: string;
  kind: number; // SPAN_KIND_CLIENT = 3
  startTimeUnixNano: string;
  endTimeUnixNano: string;
  attributes: OtlpAttribute[];
  events: OtlpEvent[];
  status: { code: number; message?: string }; // OK=1, ERROR=2
}

interface OtlpResourceSpans {
  resource: {
    attributes: OtlpAttribute[];
  };
  scopeSpans: Array<{
    scope: { name: string; version: string };
    spans: OtlpSpan[];
  }>;
}

export interface OtlpExportPayload {
  resourceSpans: OtlpResourceSpans[];
}

function strAttr(key: string, value: string): OtlpAttribute {
  return { key, value: { stringValue: value } };
}

function intAttr(key: string, value: number): OtlpAttribute {
  return { key, value: { intValue: String(value) } };
}

function floatAttr(key: string, value: number): OtlpAttribute {
  return { key, value: { doubleValue: value } };
}

function msToNano(ms: number): string {
  return String(BigInt(ms) * BigInt(1_000_000));
}

function padHex(id: string, length: number): string {
  return id.padStart(length, "0").slice(0, length);
}

function convertSpanToOtlp(span: Span): OtlpSpan {
  const attrs: OtlpAttribute[] = [
    // GenAI Semantic Conventions
    strAttr("gen_ai.system", span.providerName),
    strAttr("gen_ai.request.model", span.requestModel),
    strAttr("gen_ai.operation.name", span.operationName),
  ];

  if (span.responseModel) attrs.push(strAttr("gen_ai.response.model", span.responseModel));
  if (span.inputTokens != null) attrs.push(intAttr("gen_ai.usage.input_tokens", span.inputTokens));
  if (span.outputTokens != null) attrs.push(intAttr("gen_ai.usage.output_tokens", span.outputTokens));
  if (span.totalTokens != null) attrs.push(intAttr("gen_ai.usage.total_tokens", span.totalTokens));
  if (span.temperature != null) attrs.push(floatAttr("gen_ai.request.temperature", span.temperature));
  if (span.maxTokens != null) attrs.push(intAttr("gen_ai.request.max_tokens", span.maxTokens));
  if (span.topP != null) attrs.push(floatAttr("gen_ai.request.top_p", span.topP));

  // LLMTap-specific attributes
  if (span.inputCost != null) attrs.push(floatAttr("llmtap.cost.input", span.inputCost));
  if (span.outputCost != null) attrs.push(floatAttr("llmtap.cost.output", span.outputCost));
  if (span.totalCost != null) attrs.push(floatAttr("llmtap.cost.total", span.totalCost));
  if (span.sessionId) attrs.push(strAttr("session.id", span.sessionId));
  if (span.userId) attrs.push(strAttr("enduser.id", span.userId));
  if (span.errorType) attrs.push(strAttr("error.type", span.errorType));

  // Custom tags -> attributes
  if (span.tags) {
    for (const [key, value] of Object.entries(span.tags)) {
      attrs.push(strAttr(`llmtap.tag.${key}`, value));
    }
  }

  // GenAI events for prompt/completion content
  const events: OtlpEvent[] = [];

  if (span.inputMessages) {
    for (const msg of span.inputMessages) {
      events.push({
        name: "gen_ai.content.prompt",
        timeUnixNano: msToNano(span.startTime),
        attributes: [
          strAttr("gen_ai.prompt.role", msg.role),
          strAttr("gen_ai.prompt.content", typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content) ?? ""),
        ],
      });
    }
  }

  if (span.outputMessages) {
    for (const msg of span.outputMessages) {
      events.push({
        name: "gen_ai.content.completion",
        timeUnixNano: msToNano(span.endTime ?? span.startTime),
        attributes: [
          strAttr("gen_ai.completion.role", msg.role),
          strAttr("gen_ai.completion.content", typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content) ?? ""),
        ],
      });
    }
  }

  if (span.toolCalls) {
    for (const tc of span.toolCalls) {
      events.push({
        name: "gen_ai.content.tool_call",
        timeUnixNano: msToNano(span.endTime ?? span.startTime),
        attributes: [
          strAttr("gen_ai.tool_call.id", tc.id),
          strAttr("gen_ai.tool_call.name", tc.name),
          strAttr("gen_ai.tool_call.arguments", tc.arguments),
        ],
      });
    }
  }

  return {
    traceId: padHex(span.traceId, 32),
    spanId: padHex(span.spanId, 16),
    parentSpanId: span.parentSpanId ? padHex(span.parentSpanId, 16) : undefined,
    name: span.name,
    kind: 3, // SPAN_KIND_CLIENT
    startTimeUnixNano: msToNano(span.startTime),
    endTimeUnixNano: msToNano(span.endTime ?? span.startTime + (span.duration ?? 0)),
    attributes: attrs,
    events,
    status: span.status === "error"
      ? { code: 2, message: span.errorMessage }
      : { code: 1 },
  };
}

/**
 * Convert an array of LLMTap spans to OTLP JSON export format.
 */
export function spansToOtlp(spans: Span[], serviceName = "llmtap"): OtlpExportPayload {
  return {
    resourceSpans: [
      {
        resource: {
          attributes: [
            strAttr("service.name", serviceName),
            strAttr("service.version", "0.1.0"),
            strAttr("telemetry.sdk.name", "llmtap"),
            strAttr("telemetry.sdk.language", "nodejs"),
          ],
        },
        scopeSpans: [
          {
            scope: { name: "@llmtap/sdk", version: "0.1.0" },
            spans: spans.map(convertSpanToOtlp),
          },
        ],
      },
    ],
  };
}
