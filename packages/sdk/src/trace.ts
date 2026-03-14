import { AsyncLocalStorage } from "node:async_hooks";
import { generateTraceId } from "./ids.js";

interface TraceContext {
  traceId: string;
  parentSpanId?: string;
  name?: string;
  sessionId?: string;
  tags?: Record<string, string>;
}

const traceStorage = new AsyncLocalStorage<TraceContext>();

/**
 * Start a new trace context. All LLM calls inside the callback
 * will be grouped under the same traceId.
 *
 * @example
 * ```ts
 * await startTrace("summarize-pipeline", async () => {
 *   await openai.chat.completions.create({ ... });
 *   await openai.chat.completions.create({ ... });
 * });
 * ```
 */
export function startTrace<T>(
  name: string,
  fn: () => T | Promise<T>,
  options?: { sessionId?: string; tags?: Record<string, string> }
): T | Promise<T> {
  const ctx: TraceContext = {
    traceId: generateTraceId(),
    name,
    sessionId: options?.sessionId,
    tags: options?.tags,
  };
  return traceStorage.run(ctx, fn);
}

/** Get the current trace context (if inside a startTrace callback) */
export function getTraceContext(): TraceContext | undefined {
  return traceStorage.getStore();
}

/**
 * Set the parent span ID for child spans.
 * Used internally by providers to create parent-child relationships.
 */
export function setParentSpanId(spanId: string): void {
  const ctx = traceStorage.getStore();
  if (ctx) {
    ctx.parentSpanId = spanId;
  }
}

/**
 * Run a callback with the provided span set as the active parent.
 * This lets nested wrapped LLM calls produce a real hierarchy.
 */
export function withParentSpan<T>(spanId: string, fn: () => T): T {
  return withParentSpanContext(spanId, fn);
}

export function withParentSpanContext<T>(
  spanId: string,
  fn: () => T,
  seed?: Omit<TraceContext, "parentSpanId">
): T {
  const ctx = traceStorage.getStore();

  return traceStorage.run(
    {
      traceId: ctx?.traceId ?? seed?.traceId ?? generateTraceId(),
      parentSpanId: spanId,
      name: ctx?.name ?? seed?.name,
      sessionId: ctx?.sessionId ?? seed?.sessionId,
      tags: ctx?.tags ?? seed?.tags,
    },
    fn
  );
}
