import { afterEach, describe, expect, it } from "vitest";
import type { Span } from "./types.js";
import {
  getModelPricing,
  calculateCost,
  setPricing,
  clearPricingOverrides,
  MODEL_PRICING,
} from "./pricing.js";
import { spansToOtlp } from "./otlp.js";

afterEach(() => {
  clearPricingOverrides();
});

// ---------------------------------------------------------------------------
// getModelPricing
// ---------------------------------------------------------------------------
describe("getModelPricing", () => {
  it("returns exact match for a known model", () => {
    const result = getModelPricing("openai", "gpt-4o");
    expect(result).not.toBeNull();
    expect(result!.provider).toBe("openai");
    expect(result!.model).toBe("gpt-4o");
    expect(result!.inputCostPer1M).toBe(2.5);
    expect(result!.outputCostPer1M).toBe(10.0);
  });

  it("is case-insensitive for provider and model", () => {
    const result = getModelPricing("OpenAI", "GPT-4o");
    expect(result).not.toBeNull();
    expect(result!.model).toBe("gpt-4o");
  });

  it("returns prefix match for versioned model names", () => {
    // "gpt-4o-2099-01-01" doesn't match any exact model, but "gpt-4o" is a
    // prefix of it. The prefix match sorts by longest prefix first, so
    // "gpt-4o" (length 6) wins over "gpt-4" (length 5).
    const result = getModelPricing("openai", "gpt-4o-2099-01-01");
    expect(result).not.toBeNull();
    expect(result!.model).toBe("gpt-4o");
  });

  it("prefers longest prefix on prefix match", () => {
    // "gpt-4o-mini-2024-07-18" should match "gpt-4o-mini" prefix rather than
    // the shorter "gpt-4o" prefix.
    const result = getModelPricing("openai", "gpt-4o-mini-2024-07-18");
    expect(result).not.toBeNull();
    // Exact match exists in the table so it should be used directly.
    expect(result!.model).toBe("gpt-4o-mini-2024-07-18");
  });

  it("returns null for a completely unknown model", () => {
    const result = getModelPricing("openai", "gpt-99-super");
    expect(result).toBeNull();
  });

  it("returns null for an unknown provider", () => {
    const result = getModelPricing("nonexistent-provider", "gpt-4o");
    expect(result).toBeNull();
  });

  it("finds anthropic models", () => {
    const result = getModelPricing("anthropic", "claude-sonnet-4-20250514");
    expect(result).not.toBeNull();
    expect(result!.inputCostPer1M).toBe(3.0);
    expect(result!.outputCostPer1M).toBe(15.0);
  });

  it("finds google models", () => {
    const result = getModelPricing("google", "gemini-2.0-flash");
    expect(result).not.toBeNull();
    expect(result!.inputCostPer1M).toBe(0.1);
  });

  it("finds deepseek models", () => {
    const result = getModelPricing("deepseek", "deepseek-chat");
    expect(result).not.toBeNull();
    expect(result!.inputCostPer1M).toBe(0.27);
  });

  it("finds groq models", () => {
    const result = getModelPricing("groq", "llama-3.3-70b-versatile");
    expect(result).not.toBeNull();
    expect(result!.inputCostPer1M).toBe(0.59);
  });

  it("finds ollama models (free)", () => {
    const result = getModelPricing("ollama", "llama3");
    expect(result).not.toBeNull();
    expect(result!.inputCostPer1M).toBe(0);
    expect(result!.outputCostPer1M).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// calculateCost
// ---------------------------------------------------------------------------
describe("calculateCost", () => {
  it("calculates correct cost for a known model", () => {
    // gpt-4o: $2.50 input / $10.00 output per 1M tokens
    const result = calculateCost("openai", "gpt-4o", 1_000_000, 1_000_000);
    expect(result.inputCost).toBeCloseTo(2.5, 6);
    expect(result.outputCost).toBeCloseTo(10.0, 6);
    expect(result.totalCost).toBeCloseTo(12.5, 6);
  });

  it("calculates cost correctly for fractional token counts", () => {
    // 500 input tokens, 200 output tokens with gpt-4o
    const result = calculateCost("openai", "gpt-4o", 500, 200);
    expect(result.inputCost).toBeCloseTo(500 * 2.5 / 1_000_000, 10);
    expect(result.outputCost).toBeCloseTo(200 * 10.0 / 1_000_000, 10);
    expect(result.totalCost).toBeCloseTo(result.inputCost + result.outputCost, 10);
  });

  it("returns zero costs for unknown model", () => {
    const result = calculateCost("unknown", "unknown-model", 1000, 500);
    expect(result.inputCost).toBe(0);
    expect(result.outputCost).toBe(0);
    expect(result.totalCost).toBe(0);
  });

  it("returns zero costs when tokens are zero", () => {
    const result = calculateCost("openai", "gpt-4o", 0, 0);
    expect(result.inputCost).toBe(0);
    expect(result.outputCost).toBe(0);
    expect(result.totalCost).toBe(0);
  });

  it("calculates cost for free models as zero", () => {
    const result = calculateCost("ollama", "llama3", 100_000, 50_000);
    expect(result.inputCost).toBe(0);
    expect(result.outputCost).toBe(0);
    expect(result.totalCost).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// setPricing (pricing overrides)
// ---------------------------------------------------------------------------
describe("setPricing (overrides)", () => {
  it("overrides take precedence over built-in pricing", () => {
    // gpt-4o normally costs $2.50 / $10.00
    setPricing("openai", "gpt-4o", 5.0, 20.0);
    const result = getModelPricing("openai", "gpt-4o");
    expect(result).not.toBeNull();
    expect(result!.inputCostPer1M).toBe(5.0);
    expect(result!.outputCostPer1M).toBe(20.0);
  });

  it("allows adding pricing for a new model", () => {
    setPricing("custom-provider", "custom-model-v1", 1.0, 2.0);
    const result = getModelPricing("custom-provider", "custom-model-v1");
    expect(result).not.toBeNull();
    expect(result!.inputCostPer1M).toBe(1.0);
    expect(result!.outputCostPer1M).toBe(2.0);
  });

  it("is case-insensitive for overrides", () => {
    setPricing("OpenAI", "GPT-4o", 99.0, 99.0);
    const result = getModelPricing("openai", "gpt-4o");
    expect(result).not.toBeNull();
    expect(result!.inputCostPer1M).toBe(99.0);
  });

  it("updates existing override when set again", () => {
    setPricing("openai", "gpt-4o", 5.0, 20.0);
    setPricing("openai", "gpt-4o", 7.0, 30.0);
    const result = getModelPricing("openai", "gpt-4o");
    expect(result).not.toBeNull();
    expect(result!.inputCostPer1M).toBe(7.0);
    expect(result!.outputCostPer1M).toBe(30.0);
  });

  it("clearPricingOverrides removes all overrides", () => {
    setPricing("openai", "gpt-4o", 99.0, 99.0);
    clearPricingOverrides();
    const result = getModelPricing("openai", "gpt-4o");
    expect(result).not.toBeNull();
    // Should be back to built-in pricing
    expect(result!.inputCostPer1M).toBe(2.5);
    expect(result!.outputCostPer1M).toBe(10.0);
  });

  it("calculateCost uses overridden pricing", () => {
    setPricing("openai", "gpt-4o", 100.0, 200.0);
    const result = calculateCost("openai", "gpt-4o", 1_000_000, 1_000_000);
    expect(result.inputCost).toBeCloseTo(100.0, 6);
    expect(result.outputCost).toBeCloseTo(200.0, 6);
  });
});

// ---------------------------------------------------------------------------
// MODEL_PRICING constant
// ---------------------------------------------------------------------------
describe("MODEL_PRICING", () => {
  it("is a non-empty array", () => {
    expect(Array.isArray(MODEL_PRICING)).toBe(true);
    expect(MODEL_PRICING.length).toBeGreaterThan(0);
  });

  it("every entry has the required fields with correct types", () => {
    for (const entry of MODEL_PRICING) {
      expect(typeof entry.provider).toBe("string");
      expect(typeof entry.model).toBe("string");
      expect(typeof entry.inputCostPer1M).toBe("number");
      expect(typeof entry.outputCostPer1M).toBe("number");
      expect(entry.inputCostPer1M).toBeGreaterThanOrEqual(0);
      expect(entry.outputCostPer1M).toBeGreaterThanOrEqual(0);
    }
  });

  it("contains models for major providers", () => {
    const providers = new Set(MODEL_PRICING.map((p) => p.provider));
    expect(providers.has("openai")).toBe(true);
    expect(providers.has("anthropic")).toBe(true);
    expect(providers.has("google")).toBe(true);
    expect(providers.has("deepseek")).toBe(true);
    expect(providers.has("groq")).toBe(true);
    expect(providers.has("ollama")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// spansToOtlp
// ---------------------------------------------------------------------------
describe("spansToOtlp", () => {
  function makeSpan(overrides: Partial<Span> = {}): Span {
    return {
      spanId: "abcdef1234567890",
      traceId: "abcdef1234567890abcdef1234567890",
      name: "chat gpt-4o",
      operationName: "chat",
      providerName: "openai",
      startTime: 1700000000000,
      endTime: 1700000001000,
      duration: 1000,
      requestModel: "gpt-4o",
      responseModel: "gpt-4o",
      inputTokens: 100,
      outputTokens: 50,
      totalTokens: 150,
      inputCost: 0.00025,
      outputCost: 0.0005,
      totalCost: 0.00075,
      status: "ok",
      ...overrides,
    };
  }

  it("returns correct top-level OTLP structure", () => {
    const result = spansToOtlp([makeSpan()]);
    expect(result).toHaveProperty("resourceSpans");
    expect(result.resourceSpans).toHaveLength(1);
    expect(result.resourceSpans[0]).toHaveProperty("resource");
    expect(result.resourceSpans[0]).toHaveProperty("scopeSpans");
  });

  it("sets service.name resource attribute from parameter", () => {
    const result = spansToOtlp([makeSpan()], "my-service");
    const attrs = result.resourceSpans[0].resource.attributes;
    const serviceName = attrs.find((a) => a.key === "service.name");
    expect(serviceName).toBeDefined();
    expect(serviceName!.value.stringValue).toBe("my-service");
  });

  it("defaults service.name to 'llmtap'", () => {
    const result = spansToOtlp([makeSpan()]);
    const attrs = result.resourceSpans[0].resource.attributes;
    const serviceName = attrs.find((a) => a.key === "service.name");
    expect(serviceName!.value.stringValue).toBe("llmtap");
  });

  it("includes standard telemetry resource attributes", () => {
    const result = spansToOtlp([makeSpan()]);
    const attrs = result.resourceSpans[0].resource.attributes;
    const keys = attrs.map((a) => a.key);
    expect(keys).toContain("service.name");
    expect(keys).toContain("service.version");
    expect(keys).toContain("telemetry.sdk.name");
    expect(keys).toContain("telemetry.sdk.language");
  });

  it("sets scope name and version", () => {
    const result = spansToOtlp([makeSpan()]);
    const scope = result.resourceSpans[0].scopeSpans[0].scope;
    expect(scope.name).toBe("@llmtap/sdk");
    expect(scope.version).toBe("0.1.0");
  });

  it("converts a span with correct GenAI attributes", () => {
    const result = spansToOtlp([makeSpan()]);
    const otlpSpan = result.resourceSpans[0].scopeSpans[0].spans[0];

    expect(otlpSpan.name).toBe("chat gpt-4o");
    expect(otlpSpan.kind).toBe(3); // SPAN_KIND_CLIENT

    const attrMap = new Map(otlpSpan.attributes.map((a) => [a.key, a.value]));
    expect(attrMap.get("gen_ai.system")?.stringValue).toBe("openai");
    expect(attrMap.get("gen_ai.request.model")?.stringValue).toBe("gpt-4o");
    expect(attrMap.get("gen_ai.operation.name")?.stringValue).toBe("chat");
    expect(attrMap.get("gen_ai.response.model")?.stringValue).toBe("gpt-4o");
    expect(attrMap.get("gen_ai.usage.input_tokens")?.intValue).toBe("100");
    expect(attrMap.get("gen_ai.usage.output_tokens")?.intValue).toBe("50");
    expect(attrMap.get("gen_ai.usage.total_tokens")?.intValue).toBe("150");
  });

  it("includes LLMTap cost attributes", () => {
    const result = spansToOtlp([makeSpan()]);
    const otlpSpan = result.resourceSpans[0].scopeSpans[0].spans[0];
    const attrMap = new Map(otlpSpan.attributes.map((a) => [a.key, a.value]));

    expect(attrMap.get("llmtap.cost.input")?.doubleValue).toBe(0.00025);
    expect(attrMap.get("llmtap.cost.output")?.doubleValue).toBe(0.0005);
    expect(attrMap.get("llmtap.cost.total")?.doubleValue).toBe(0.00075);
  });

  it("pads traceId to 32 chars and spanId to 16 chars", () => {
    const result = spansToOtlp([makeSpan({
      traceId: "abc",
      spanId: "def",
    })]);
    const otlpSpan = result.resourceSpans[0].scopeSpans[0].spans[0];
    expect(otlpSpan.traceId).toHaveLength(32);
    expect(otlpSpan.spanId).toHaveLength(16);
    // Padded with leading zeros
    expect(otlpSpan.traceId).toBe("00000000000000000000000000000abc");
    expect(otlpSpan.spanId).toBe("0000000000000def");
  });

  it("converts timestamps to nanoseconds", () => {
    const result = spansToOtlp([makeSpan({
      startTime: 1700000000000,
      endTime: 1700000001000,
    })]);
    const otlpSpan = result.resourceSpans[0].scopeSpans[0].spans[0];
    expect(otlpSpan.startTimeUnixNano).toBe("1700000000000000000");
    expect(otlpSpan.endTimeUnixNano).toBe("1700000001000000000");
  });

  it("sets status OK for successful spans", () => {
    const result = spansToOtlp([makeSpan({ status: "ok" })]);
    const otlpSpan = result.resourceSpans[0].scopeSpans[0].spans[0];
    expect(otlpSpan.status.code).toBe(1); // OK
    expect(otlpSpan.status.message).toBeUndefined();
  });

  it("sets status ERROR with message for failed spans", () => {
    const result = spansToOtlp([makeSpan({
      status: "error",
      errorMessage: "Rate limit exceeded",
      errorType: "RateLimitError",
    })]);
    const otlpSpan = result.resourceSpans[0].scopeSpans[0].spans[0];
    expect(otlpSpan.status.code).toBe(2); // ERROR
    expect(otlpSpan.status.message).toBe("Rate limit exceeded");
  });

  it("includes error.type attribute for error spans", () => {
    const result = spansToOtlp([makeSpan({
      status: "error",
      errorType: "RateLimitError",
    })]);
    const otlpSpan = result.resourceSpans[0].scopeSpans[0].spans[0];
    const attrMap = new Map(otlpSpan.attributes.map((a) => [a.key, a.value]));
    expect(attrMap.get("error.type")?.stringValue).toBe("RateLimitError");
  });

  it("generates prompt events for input messages", () => {
    const result = spansToOtlp([makeSpan({
      inputMessages: [
        { role: "system", content: "You are helpful." },
        { role: "user", content: "Hello!" },
      ],
    })]);
    const otlpSpan = result.resourceSpans[0].scopeSpans[0].spans[0];
    const promptEvents = otlpSpan.events.filter((e) => e.name === "gen_ai.content.prompt");
    expect(promptEvents).toHaveLength(2);

    const sysAttrs = new Map(promptEvents[0].attributes.map((a) => [a.key, a.value]));
    expect(sysAttrs.get("gen_ai.prompt.role")?.stringValue).toBe("system");
    expect(sysAttrs.get("gen_ai.prompt.content")?.stringValue).toBe("You are helpful.");

    const userAttrs = new Map(promptEvents[1].attributes.map((a) => [a.key, a.value]));
    expect(userAttrs.get("gen_ai.prompt.role")?.stringValue).toBe("user");
    expect(userAttrs.get("gen_ai.prompt.content")?.stringValue).toBe("Hello!");
  });

  it("generates completion events for output messages", () => {
    const result = spansToOtlp([makeSpan({
      outputMessages: [
        { role: "assistant", content: "Hi there!" },
      ],
    })]);
    const otlpSpan = result.resourceSpans[0].scopeSpans[0].spans[0];
    const completionEvents = otlpSpan.events.filter((e) => e.name === "gen_ai.content.completion");
    expect(completionEvents).toHaveLength(1);

    const attrs = new Map(completionEvents[0].attributes.map((a) => [a.key, a.value]));
    expect(attrs.get("gen_ai.completion.role")?.stringValue).toBe("assistant");
    expect(attrs.get("gen_ai.completion.content")?.stringValue).toBe("Hi there!");
  });

  it("generates tool_call events", () => {
    const result = spansToOtlp([makeSpan({
      toolCalls: [
        { id: "call_1", name: "get_weather", arguments: '{"city":"NYC"}' },
      ],
    })]);
    const otlpSpan = result.resourceSpans[0].scopeSpans[0].spans[0];
    const toolEvents = otlpSpan.events.filter((e) => e.name === "gen_ai.content.tool_call");
    expect(toolEvents).toHaveLength(1);

    const attrs = new Map(toolEvents[0].attributes.map((a) => [a.key, a.value]));
    expect(attrs.get("gen_ai.tool_call.id")?.stringValue).toBe("call_1");
    expect(attrs.get("gen_ai.tool_call.name")?.stringValue).toBe("get_weather");
    expect(attrs.get("gen_ai.tool_call.arguments")?.stringValue).toBe('{"city":"NYC"}');
  });

  it("includes custom tags as llmtap.tag.* attributes", () => {
    const result = spansToOtlp([makeSpan({
      tags: { environment: "production", feature: "chat" },
    })]);
    const otlpSpan = result.resourceSpans[0].scopeSpans[0].spans[0];
    const attrMap = new Map(otlpSpan.attributes.map((a) => [a.key, a.value]));
    expect(attrMap.get("llmtap.tag.environment")?.stringValue).toBe("production");
    expect(attrMap.get("llmtap.tag.feature")?.stringValue).toBe("chat");
  });

  it("includes session and user attributes", () => {
    const result = spansToOtlp([makeSpan({
      sessionId: "session-abc",
      userId: "user-123",
    })]);
    const otlpSpan = result.resourceSpans[0].scopeSpans[0].spans[0];
    const attrMap = new Map(otlpSpan.attributes.map((a) => [a.key, a.value]));
    expect(attrMap.get("session.id")?.stringValue).toBe("session-abc");
    expect(attrMap.get("enduser.id")?.stringValue).toBe("user-123");
  });

  it("includes request parameters (temperature, maxTokens, topP)", () => {
    const result = spansToOtlp([makeSpan({
      temperature: 0.7,
      maxTokens: 1024,
      topP: 0.9,
    })]);
    const otlpSpan = result.resourceSpans[0].scopeSpans[0].spans[0];
    const attrMap = new Map(otlpSpan.attributes.map((a) => [a.key, a.value]));
    expect(attrMap.get("gen_ai.request.temperature")?.doubleValue).toBe(0.7);
    expect(attrMap.get("gen_ai.request.max_tokens")?.intValue).toBe("1024");
    expect(attrMap.get("gen_ai.request.top_p")?.doubleValue).toBe(0.9);
  });

  it("converts multiple spans", () => {
    const spans = [makeSpan({ spanId: "span1" }), makeSpan({ spanId: "span2" })];
    const result = spansToOtlp(spans);
    const otlpSpans = result.resourceSpans[0].scopeSpans[0].spans;
    expect(otlpSpans).toHaveLength(2);
  });

  it("handles an empty spans array", () => {
    const result = spansToOtlp([]);
    expect(result.resourceSpans[0].scopeSpans[0].spans).toHaveLength(0);
  });

  it("includes parentSpanId when present", () => {
    const result = spansToOtlp([makeSpan({ parentSpanId: "parent123" })]);
    const otlpSpan = result.resourceSpans[0].scopeSpans[0].spans[0];
    expect(otlpSpan.parentSpanId).toBeDefined();
    expect(otlpSpan.parentSpanId).toHaveLength(16);
  });

  it("omits parentSpanId when not present", () => {
    const result = spansToOtlp([makeSpan({ parentSpanId: undefined })]);
    const otlpSpan = result.resourceSpans[0].scopeSpans[0].spans[0];
    expect(otlpSpan.parentSpanId).toBeUndefined();
  });
});
