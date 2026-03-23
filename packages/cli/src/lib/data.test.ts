import { describe, expect, it } from "vitest";
import { normalizeImportPayload, summarizeImportedSpans } from "./data.js";

describe("normalizeImportPayload", () => {
  it("accepts raw span arrays", () => {
    const spans = normalizeImportPayload([
      {
        spanId: "sp_1",
        traceId: "tr_1",
        name: "chat",
        operationName: "chat",
        providerName: "openai",
        startTime: 1,
        requestModel: "gpt-4o-mini",
        status: "ok",
      },
    ]);

    expect(spans).toHaveLength(1);
    expect(spans[0]?.traceId).toBe("tr_1");
  });

  it("accepts export payloads with traces[].spans", () => {
    const spans = normalizeImportPayload([
      {
        traceId: "tr_1",
        spans: [
          {
            spanId: "sp_1",
            traceId: "tr_1",
            name: "chat",
            operationName: "chat",
            providerName: "openai",
            startTime: 1,
            requestModel: "gpt-4o-mini",
            status: "ok",
          },
        ],
      },
    ]);

    expect(spans).toHaveLength(1);
    expect(spans[0]?.spanId).toBe("sp_1");
  });

  it("accepts object payloads with a spans property", () => {
    const spans = normalizeImportPayload({
      spans: [
        {
          spanId: "sp_1",
          traceId: "tr_1",
          name: "chat",
          operationName: "chat",
          providerName: "openai",
          startTime: 1,
          requestModel: "gpt-4o-mini",
          status: "ok",
        },
      ],
    });

    expect(spans).toHaveLength(1);
  });

  it("throws on unsupported payloads", () => {
    expect(() => normalizeImportPayload({ foo: "bar" })).toThrow(/Unsupported import file/);
  });
});

describe("summarizeImportedSpans", () => {
  it("counts spans and unique traces", () => {
    const summary = summarizeImportedSpans([
      {
        spanId: "sp_1",
        traceId: "tr_1",
        name: "chat",
        operationName: "chat",
        providerName: "openai",
        startTime: 1,
        requestModel: "gpt-4o-mini",
        status: "ok",
      },
      {
        spanId: "sp_2",
        traceId: "tr_1",
        name: "chat",
        operationName: "chat",
        providerName: "openai",
        startTime: 2,
        requestModel: "gpt-4o-mini",
        status: "ok",
      },
      {
        spanId: "sp_3",
        traceId: "tr_2",
        name: "chat",
        operationName: "chat",
        providerName: "openai",
        startTime: 3,
        requestModel: "gpt-4o-mini",
        status: "ok",
      },
    ]);

    expect(summary).toEqual({
      spanCount: 3,
      traceCount: 2,
    });
  });
});
