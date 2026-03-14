import type { SpanInput, Message, ToolCall, WrapOptions } from "@llmtap/shared";
import { calculateCost } from "@llmtap/shared";
import { generateSpanId, generateTraceId } from "../ids.js";
import { getTraceContext, withParentSpanContext } from "../trace.js";
import { sendSpan } from "../transport.js";
import { getGlobalConfig } from "../config.js";

type RecordLike = Record<string, unknown>;

/**
 * Shared context for an in-flight span.
 * All provider wrappers create one of these at call start.
 */
export interface SpanContext {
  spanId: string;
  traceId: string;
  parentSpanId?: string;
  providerName: string;
  model: string;
  operationName: string;
  startTime: number;
  inputMessages?: Message[];
  traceCtx: ReturnType<typeof getTraceContext>;
  params: RecordLike;
  optionsTags?: Record<string, string>;
}

/**
 * Create a span context with IDs, timing, and trace linkage.
 * Shared by all provider wrappers.
 */
export function createSpanContext(
  params: RecordLike,
  providerName: string,
  operationName: string,
  model: string,
  options?: WrapOptions
): SpanContext {
  const traceCtx = getTraceContext();
  return {
    spanId: generateSpanId(),
    traceId: traceCtx?.traceId ?? generateTraceId(),
    parentSpanId: traceCtx?.parentSpanId,
    providerName,
    model,
    operationName,
    startTime: Date.now(),
    traceCtx,
    params,
    optionsTags: options?.tags,
  };
}

/**
 * Emit a success span to the collector transport.
 */
export function emitSuccessSpan(
  context: SpanContext,
  result: {
    responseModel?: string;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    outputMessages?: Message[];
    toolCalls?: ToolCall[];
  }
): void {
  const endTime = Date.now();
  const costs = calculateCost(
    context.providerName,
    result.responseModel ?? context.model,
    result.inputTokens,
    result.outputTokens
  );

  const span: SpanInput = {
    spanId: context.spanId,
    traceId: context.traceId,
    parentSpanId: context.parentSpanId ?? context.traceCtx?.parentSpanId,
    name: `${context.operationName} ${result.responseModel ?? context.model}`,
    operationName: context.operationName,
    providerName: context.providerName,
    startTime: context.startTime,
    endTime,
    duration: endTime - context.startTime,
    requestModel: context.model,
    responseModel: result.responseModel,
    inputTokens: result.inputTokens,
    outputTokens: result.outputTokens,
    totalTokens: result.totalTokens,
    ...costs,
    temperature: context.params.temperature as number | undefined,
    maxTokens: (context.params.max_tokens ?? context.params.maxTokens) as
      | number
      | undefined,
    topP: (context.params.top_p ?? context.params.topP) as number | undefined,
    inputMessages: context.inputMessages,
    outputMessages: result.outputMessages,
    toolCalls: result.toolCalls,
    status: "ok",
    tags: {
      ...getGlobalConfig().defaultTags,
      ...context.traceCtx?.tags,
      ...context.optionsTags,
    },
    sessionId: context.traceCtx?.sessionId ?? (getGlobalConfig().sessionId || undefined),
  };

  sendSpan(span);
}

/**
 * Emit an error span to the collector transport.
 */
export function emitErrorSpan(
  context: SpanContext,
  error: unknown
): void {
  const endTime = Date.now();
  const err = error instanceof Error ? error : new Error(String(error));

  const span: SpanInput = {
    spanId: context.spanId,
    traceId: context.traceId,
    parentSpanId: context.parentSpanId ?? context.traceCtx?.parentSpanId,
    name: `${context.operationName} ${context.model}`,
    operationName: context.operationName,
    providerName: context.providerName,
    startTime: context.startTime,
    endTime,
    duration: endTime - context.startTime,
    requestModel: context.model,
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
    inputCost: 0,
    outputCost: 0,
    totalCost: 0,
    inputMessages: context.inputMessages,
    status: "error",
    errorType: err.constructor.name,
    errorMessage: err.message,
    tags: {
      ...getGlobalConfig().defaultTags,
      ...context.traceCtx?.tags,
      ...context.optionsTags,
    },
    sessionId: context.traceCtx?.sessionId ?? (getGlobalConfig().sessionId || undefined),
  };

  sendSpan(span);
}

/**
 * Check if tracing is currently enabled.
 */
export function isTracingEnabled(): boolean {
  return getGlobalConfig().enabled;
}

/**
 * Check if content capture is enabled.
 */
export function shouldCaptureContent(): boolean {
  return getGlobalConfig().captureContent;
}

/**
 * Execute a callback within parent span context, linking child spans.
 */
export { withParentSpanContext } from "../trace.js";
