import { EventEmitter } from "node:events";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { calculateCost } from "@llmtap/shared";
import { wrap } from "./index.js";
import { configure } from "./config.js";
import {
  clearBuffer,
  configureTransport,
  flush,
  getBufferSize,
} from "./transport.js";

function createAsyncIterable<T>(items: T[]): AsyncIterable<T> {
  return {
    async *[Symbol.asyncIterator]() {
      for (const item of items) {
        yield item;
      }
    },
  };
}

function getPostedSpans(fetchMock: ReturnType<typeof vi.fn>) {
  const request = fetchMock.mock.calls.at(-1)?.[1] as RequestInit | undefined;
  return JSON.parse(String(request?.body)).spans as Array<Record<string, unknown>>;
}

describe("@llmtap/sdk", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers();
    fetchMock.mockReset();
    fetchMock.mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal("fetch", fetchMock);
    configure({
      enabled: true,
      captureContent: true,
      collectorUrl: "http://collector.test",
      maxBufferSize: 1000,
    });
    configureTransport({
      enabled: true,
      collectorUrl: "http://collector.test",
      maxBufferSize: 1000,
    });
    clearBuffer();
  });

  afterEach(() => {
    clearBuffer();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("prefers the most specific pricing match for versioned models", () => {
    const cost = calculateCost(
      "openai",
      "gpt-4o-mini-2024-07-18",
      1_000_000,
      1_000_000
    );

    expect(cost.inputCost).toBeCloseTo(0.15);
    expect(cost.outputCost).toBeCloseTo(0.6);
  });

  it("detects provider from client shape before constructor heuristics", async () => {
    class AnthropicLookingClient {
      chat = {
        completions: {
          create: vi.fn().mockResolvedValue({
            model: "gpt-4o-mini",
            usage: {
              prompt_tokens: 10,
              completion_tokens: 5,
              total_tokens: 15,
            },
            choices: [{ message: { content: "ok" } }],
          }),
        },
      };

      messages = {
        create: vi.fn(),
      };
    }

    const client = wrap(new AnthropicLookingClient());
    await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: "hi" }],
    });

    expect(getBufferSize()).toBe(1);
  });

  it("emits an OpenAI span only after the stream is consumed", async () => {
    const wrapped = wrap({
      chat: {
        completions: {
          create: vi.fn().mockResolvedValue(
            createAsyncIterable([
              {
                model: "gpt-4o-mini",
                choices: [{ index: 0, delta: { content: "Hello " } }],
              },
              {
                model: "gpt-4o-mini",
                choices: [{ index: 0, delta: { content: "world" } }],
                usage: {
                  prompt_tokens: 12,
                  completion_tokens: 4,
                  total_tokens: 16,
                },
              },
            ])
          ),
        },
      },
    });

    const stream = (await wrapped.chat.completions.create({
      model: "gpt-4o-mini",
      stream: true,
      messages: [{ role: "user", content: "hi" }],
    })) as AsyncIterable<unknown>;

    expect(getBufferSize()).toBe(0);

    for await (const _chunk of stream) {
      // Consume the stream fully to trigger span emission.
    }

    expect(getBufferSize()).toBe(1);

    await flush();

    const [span] = getPostedSpans(fetchMock);
    expect(span.providerName).toBe("openai");
    expect(span.totalTokens).toBe(16);
    expect(
      ((span.outputMessages as Array<Record<string, unknown>>)[0]?.content as string)
    ).toBe("Hello world");
  });

  it("emits an Anthropic span when the stream helper finishes", async () => {
    const stream = new EventEmitter() as EventEmitter & {
      finalMessage: () => Promise<unknown>;
    };
    let resolveFinalMessage: ((value: unknown) => void) | undefined;
    stream.finalMessage = vi.fn().mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveFinalMessage = resolve;
        })
    );

    const wrapped = wrap(
      {
        messages: {
          stream: vi.fn().mockResolvedValue(stream),
        },
      },
      { provider: "anthropic" }
    );

    const result = (await wrapped.messages.stream({
      model: "claude-sonnet-4-20250514",
      max_tokens: 128,
    })) as typeof stream;

    result.emit("streamEvent", {
      type: "content_block_delta",
      index: 0,
      delta: { type: "text_delta", text: "streamed reply" },
    });
    resolveFinalMessage?.({
      model: "claude-sonnet-4-20250514",
      usage: { input_tokens: 21, output_tokens: 8 },
    });
    result.emit("end");
    await Promise.resolve();
    await Promise.resolve();

    expect(getBufferSize()).toBe(1);

    await flush();

    const [span] = getPostedSpans(fetchMock);
    expect(span.providerName).toBe("anthropic");
    expect(span.totalTokens).toBe(29);
    expect(
      ((span.outputMessages as Array<Record<string, unknown>>)[0]?.content as string)
    ).toBe("streamed reply");
  });

  it("links nested wrapped calls through parentSpanId", async () => {
    const inner = wrap({
      chat: {
        completions: {
          create: vi.fn().mockResolvedValue({
            model: "gpt-4o-mini",
            usage: {
              prompt_tokens: 4,
              completion_tokens: 2,
              total_tokens: 6,
            },
            choices: [{ message: { content: "inner" } }],
          }),
        },
      },
    });

    const outer = wrap({
      chat: {
        completions: {
          create: vi.fn().mockImplementation(async () => {
            await inner.chat.completions.create({
              model: "gpt-4o-mini",
              messages: [{ role: "user", content: "child" }],
            });

            return {
              model: "gpt-4o",
              usage: {
                prompt_tokens: 10,
                completion_tokens: 5,
                total_tokens: 15,
              },
              choices: [{ message: { content: "outer" } }],
            };
          }),
        },
      },
    });

    await outer.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: "parent" }],
    });

    await flush();

    const spans = getPostedSpans(fetchMock);
    expect(spans).toHaveLength(2);

    const parent = spans.find((span) => span.requestModel === "gpt-4o");
    const child = spans.find((span) => span.requestModel === "gpt-4o-mini");

    expect(child?.traceId).toBe(parent?.traceId);
    expect(child?.parentSpanId).toBe(parent?.spanId);
  });

  it("wraps Gemini model objects and records non-stream usage", async () => {
    const model = wrap({
      model: "gemini-2.5-flash",
      generateContent: vi.fn().mockResolvedValue({
        response: {
          modelVersion: "gemini-2.5-flash",
          usageMetadata: {
            promptTokenCount: 14,
            candidatesTokenCount: 7,
            totalTokenCount: 21,
          },
          text: () => "Gemini answer",
        },
      }),
    });

    await model.generateContent("hello");
    await flush();

    const [span] = getPostedSpans(fetchMock);
    expect(span.providerName).toBe("google");
    expect(span.requestModel).toBe("gemini-2.5-flash");
    expect(span.totalTokens).toBe(21);
  });

  it("detects DeepSeek from an OpenAI-compatible base URL", async () => {
    const client = wrap({
      baseURL: "https://api.deepseek.com/v1",
      chat: {
        completions: {
          create: vi.fn().mockResolvedValue({
            model: "deepseek-chat",
            usage: {
              prompt_tokens: 1000,
              completion_tokens: 1000,
              total_tokens: 2000,
            },
            choices: [{ message: { content: "done" } }],
          }),
        },
      },
    });

    await client.chat.completions.create({
      model: "deepseek-chat",
      messages: [{ role: "user", content: "hi" }],
    });
    await flush();

    const [span] = getPostedSpans(fetchMock);
    expect(span.providerName).toBe("deepseek");
    expect(Number(span.totalCost)).toBeCloseTo(0.00137, 8);
  });
});
