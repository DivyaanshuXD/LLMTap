import type { WrapOptions, LLMTapConfig } from "@llmtap/shared";
import { wrapOpenAI } from "./providers/openai.js";
import { wrapAnthropic } from "./providers/anthropic.js";
import { wrapGoogle } from "./providers/google.js";
import { isOpenAICompatibleProviderName } from "./providers/compat.js";
import { configure, getGlobalConfig } from "./config.js";
import { configureTransport, flush, clearBuffer } from "./transport.js";

/**
 * Wrap an LLM client to automatically trace all API calls.
 *
 * Supports OpenAI and Anthropic clients. Detects the provider
 * automatically based on the client's constructor name.
 *
 * @example
 * ```ts
 * import OpenAI from "openai";
 * import { wrap } from "@llmtap/sdk";
 *
 * const openai = wrap(new OpenAI());
 * // All calls are now traced automatically
 * ```
 */
export function wrap<T extends object>(
  client: T,
  options?: WrapOptions
): T {
  const provider = options?.provider ?? detectProvider(client);

  if (provider === "anthropic") {
    return wrapAnthropic(client, { ...options, provider: "anthropic" });
  }

  if (provider === "google") {
    return wrapGoogle(client, { ...options, provider: "google" });
  }

  if (isOpenAICompatibleProviderName(provider)) {
    return wrapOpenAI(client, options);
  }

  // Unknown provider -- try OpenAI format as fallback
  return wrapOpenAI(client, options);
}

/**
 * Detect the LLM provider from the client instance.
 * Prefer SDK shape detection so wrapped or minified clients still work.
 */
function detectProvider(client: object): string {
  const asAny = client as Record<string, unknown>;
  if (
    asAny.chat &&
    typeof asAny.chat === "object" &&
    (asAny.chat as Record<string, unknown>).completions
  ) {
    return "openai";
  }

  // Check for Anthropic shape (has messages)
  if (asAny.messages && typeof asAny.messages === "object") {
    return "anthropic";
  }

  if (
    typeof asAny.getGenerativeModel === "function" ||
    typeof asAny.generateContent === "function" ||
    typeof asAny.generateContentStream === "function"
  ) {
    return "google";
  }

  const name = client?.constructor?.name?.toLowerCase() ?? "";
  if (name.includes("openai")) return "openai";
  if (name.includes("anthropic")) return "anthropic";
  if (name.includes("google") || name.includes("gemini")) return "google";

  return "unknown";
}

/**
 * Initialize LLMTap with custom configuration.
 *
 * @example
 * ```ts
 * import { init } from "@llmtap/sdk";
 *
 * init({
 *   collectorUrl: "http://localhost:4781",
 *   captureContent: true,
 *   sessionId: "my-session",
 * });
 * ```
 */
export function init(config: LLMTapConfig): void {
  configure(config);
  configureTransport({
    collectorUrl: config.collectorUrl ?? getGlobalConfig().collectorUrl,
    maxBufferSize: config.maxBufferSize ?? getGlobalConfig().maxBufferSize,
    enabled: config.enabled ?? true,
    onError: config.onError,
  });
  if (getGlobalConfig().debug) {
    console.log("[llmtap] SDK initialized", {
      collectorUrl: getGlobalConfig().collectorUrl,
      captureContent: getGlobalConfig().captureContent,
      enabled: getGlobalConfig().enabled,
    });
  }
}

// Re-export public API
export {
  startTrace,
  getTraceContext,
  withParentSpan,
  withParentSpanContext,
} from "./trace.js";
export { flush, clearBuffer, shutdown } from "./transport.js";
export { configure } from "./config.js";
export { wrapVercelAI } from "./providers/vercel-ai.js";
export type { LLMTapConfig, WrapOptions, Span, SpanInput } from "@llmtap/shared";
