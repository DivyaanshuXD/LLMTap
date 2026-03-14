import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { ROUTES } from "@llmtap/shared";
import { closeDb, createServer, getDb } from "./index.js";

function createTempDbDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "llmtap-test-"));
}

function countSpans(): number {
  return (getDb().prepare("SELECT COUNT(*) as c FROM spans").get() as { c: number }).c;
}

async function closeServer(app: Awaited<ReturnType<typeof createServer>>["app"]) {
  await app.close();
  closeDb();
}

afterEach(() => {
  closeDb();
  delete process.env.LLMTAP_DB_DIR;
  delete process.env.LLMTAP_DB_PATH;
});

describe("@llmtap/collector", () => {
  it("starts clean unless demo data is explicitly enabled", async () => {
    const dbDir = createTempDbDir();
    process.env.LLMTAP_DB_DIR = dbDir;

    const { app } = await createServer({ quiet: true });
    try {
      expect(countSpans()).toBe(0);
    } finally {
      await closeServer(app);
      fs.rmSync(dbDir, { recursive: true, force: true });
    }
  });

  it("seeds demo data only when requested", async () => {
    const dbDir = createTempDbDir();
    process.env.LLMTAP_DB_DIR = dbDir;

    const { app } = await createServer({ quiet: true, demo: true });
    try {
      expect(countSpans()).toBeGreaterThan(0);
    } finally {
      await closeServer(app);
      fs.rmSync(dbDir, { recursive: true, force: true });
    }
  });

  it("returns the full trace count when pagination is applied", async () => {
    const dbDir = createTempDbDir();
    process.env.LLMTAP_DB_DIR = dbDir;

    const { app } = await createServer({ quiet: true });
    try {
      const spans = [1, 2, 3].map((index) => ({
        spanId: `sp_${index}`,
        traceId: `tr_${index}`,
        name: `trace-${index}`,
        operationName: "chat",
        providerName: "openai",
        startTime: 1_000 + index,
        endTime: 1_010 + index,
        duration: 10,
        requestModel: "gpt-4o-mini",
        responseModel: "gpt-4o-mini",
        inputTokens: 10,
        outputTokens: 5,
        totalTokens: 15,
        inputCost: 0.001,
        outputCost: 0.002,
        totalCost: 0.003,
        status: "ok",
      }));

      const ingest = await app.inject({
        method: "POST",
        url: ROUTES.INGEST_SPANS,
        payload: { spans },
      });
      expect(ingest.statusCode).toBe(200);

      const response = await app.inject({
        method: "GET",
        url: `${ROUTES.LIST_TRACES}?limit=1&offset=0`,
      });
      expect(response.statusCode).toBe(200);

      const payload = response.json() as {
        total: number;
        traces: Array<Record<string, unknown>>;
      };
      expect(payload.total).toBe(3);
      expect(payload.traces).toHaveLength(1);
    } finally {
      await closeServer(app);
      fs.rmSync(dbDir, { recursive: true, force: true });
    }
  });

  it("filters traces by search text, provider, and status", async () => {
    const dbDir = createTempDbDir();
    process.env.LLMTAP_DB_DIR = dbDir;

    const { app } = await createServer({ quiet: true });
    try {
      const spans = [
        {
          spanId: "sp_match",
          traceId: "tr_match",
          name: "deepseek-investigation",
          operationName: "chat",
          providerName: "deepseek",
          startTime: Date.now(),
          endTime: Date.now() + 10,
          duration: 10,
          requestModel: "deepseek-chat",
          responseModel: "deepseek-chat",
          inputTokens: 10,
          outputTokens: 5,
          totalTokens: 15,
          inputCost: 0.001,
          outputCost: 0.002,
          totalCost: 0.003,
          status: "error",
          errorMessage: "rate limited",
        },
        {
          spanId: "sp_other",
          traceId: "tr_other",
          name: "openai-summary",
          operationName: "chat",
          providerName: "openai",
          startTime: Date.now() + 100,
          endTime: Date.now() + 115,
          duration: 15,
          requestModel: "gpt-4o-mini",
          responseModel: "gpt-4o-mini",
          inputTokens: 14,
          outputTokens: 6,
          totalTokens: 20,
          inputCost: 0.001,
          outputCost: 0.002,
          totalCost: 0.003,
          status: "ok",
        },
      ];

      await app.inject({
        method: "POST",
        url: ROUTES.INGEST_SPANS,
        payload: { spans },
      });

      const response = await app.inject({
        method: "GET",
        url: `${ROUTES.LIST_TRACES}?q=investigation&provider=deepseek&status=error`,
      });

      expect(response.statusCode).toBe(200);
      const payload = response.json() as {
        total: number;
        traces: Array<{ traceId: string }>;
      };
      expect(payload.total).toBe(1);
      expect(payload.traces[0]?.traceId).toBe("tr_match");
    } finally {
      await closeServer(app);
      fs.rmSync(dbDir, { recursive: true, force: true });
    }
  });

  // -----------------------------------------------------------------------
  // Reset endpoint validation
  // -----------------------------------------------------------------------
  it("reset endpoint returns 400 without { confirm: true }", async () => {
    const dbDir = createTempDbDir();
    process.env.LLMTAP_DB_DIR = dbDir;

    const { app } = await createServer({ quiet: true });
    try {
      // No body at all
      const res1 = await app.inject({
        method: "POST",
        url: "/v1/reset",
        payload: {},
      });
      expect(res1.statusCode).toBe(400);
      expect(res1.json()).toHaveProperty("error");

      // Wrong value for confirm
      const res2 = await app.inject({
        method: "POST",
        url: "/v1/reset",
        payload: { confirm: false },
      });
      expect(res2.statusCode).toBe(400);

      // String instead of boolean
      const res3 = await app.inject({
        method: "POST",
        url: "/v1/reset",
        payload: { confirm: "true" },
      });
      expect(res3.statusCode).toBe(400);
    } finally {
      await closeServer(app);
      fs.rmSync(dbDir, { recursive: true, force: true });
    }
  });

  it("reset endpoint succeeds with { confirm: true }", async () => {
    const dbDir = createTempDbDir();
    process.env.LLMTAP_DB_DIR = dbDir;

    const { app } = await createServer({ quiet: true, demo: true });
    try {
      expect(countSpans()).toBeGreaterThan(0);

      const res = await app.inject({
        method: "POST",
        url: "/v1/reset",
        payload: { confirm: true },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toMatchObject({ status: "ok" });

      expect(countSpans()).toBe(0);
    } finally {
      await closeServer(app);
      fs.rmSync(dbDir, { recursive: true, force: true });
    }
  });

  // -----------------------------------------------------------------------
  // Retention endpoint validation
  // -----------------------------------------------------------------------
  it("retention endpoint rejects negative retentionDays", async () => {
    const dbDir = createTempDbDir();
    process.env.LLMTAP_DB_DIR = dbDir;

    const { app } = await createServer({ quiet: true });
    try {
      const res = await app.inject({
        method: "POST",
        url: "/v1/retention",
        payload: { retentionDays: -1 },
      });
      expect(res.statusCode).toBe(400);
      expect(res.json()).toHaveProperty("error");
    } finally {
      await closeServer(app);
      fs.rmSync(dbDir, { recursive: true, force: true });
    }
  });

  it("retention endpoint rejects non-number retentionDays", async () => {
    const dbDir = createTempDbDir();
    process.env.LLMTAP_DB_DIR = dbDir;

    const { app } = await createServer({ quiet: true });
    try {
      const res = await app.inject({
        method: "POST",
        url: "/v1/retention",
        payload: { retentionDays: "abc" },
      });
      expect(res.statusCode).toBe(400);
      expect(res.json()).toHaveProperty("error");
    } finally {
      await closeServer(app);
      fs.rmSync(dbDir, { recursive: true, force: true });
    }
  });

  it("retention endpoint rejects value exceeding max (3650)", async () => {
    const dbDir = createTempDbDir();
    process.env.LLMTAP_DB_DIR = dbDir;

    const { app } = await createServer({ quiet: true });
    try {
      const res = await app.inject({
        method: "POST",
        url: "/v1/retention",
        payload: { retentionDays: 9999 },
      });
      expect(res.statusCode).toBe(400);
    } finally {
      await closeServer(app);
      fs.rmSync(dbDir, { recursive: true, force: true });
    }
  });

  it("retention endpoint accepts valid retentionDays", async () => {
    const dbDir = createTempDbDir();
    process.env.LLMTAP_DB_DIR = dbDir;

    const { app } = await createServer({ quiet: true });
    try {
      const res = await app.inject({
        method: "POST",
        url: "/v1/retention",
        payload: { retentionDays: 30 },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toMatchObject({
        status: "ok",
        retentionDays: 30,
      });
    } finally {
      await closeServer(app);
      fs.rmSync(dbDir, { recursive: true, force: true });
    }
  });

  // -----------------------------------------------------------------------
  // OTLP export endpoint
  // -----------------------------------------------------------------------
  it("OTLP export endpoint returns valid OTLP format", async () => {
    const dbDir = createTempDbDir();
    process.env.LLMTAP_DB_DIR = dbDir;

    const { app } = await createServer({ quiet: true });
    try {
      // Ingest a span first
      await app.inject({
        method: "POST",
        url: ROUTES.INGEST_SPANS,
        payload: {
          spans: [
            {
              spanId: "sp_otlp1",
              traceId: "tr_otlp1",
              name: "otlp-test",
              operationName: "chat",
              providerName: "openai",
              startTime: Date.now(),
              endTime: Date.now() + 100,
              duration: 100,
              requestModel: "gpt-4o",
              responseModel: "gpt-4o",
              inputTokens: 50,
              outputTokens: 25,
              totalTokens: 75,
              inputCost: 0.001,
              outputCost: 0.002,
              totalCost: 0.003,
              status: "ok",
            },
          ],
        },
      });

      const res = await app.inject({
        method: "GET",
        url: "/v1/export/otlp",
      });

      expect(res.statusCode).toBe(200);
      const payload = res.json();

      // Verify top-level OTLP structure
      expect(payload).toHaveProperty("resourceSpans");
      expect(Array.isArray(payload.resourceSpans)).toBe(true);
      expect(payload.resourceSpans).toHaveLength(1);

      // Verify resource attributes
      const resource = payload.resourceSpans[0].resource;
      expect(resource).toHaveProperty("attributes");
      const serviceAttr = resource.attributes.find(
        (a: { key: string }) => a.key === "service.name"
      );
      expect(serviceAttr).toBeDefined();
      expect(serviceAttr.value.stringValue).toBe("llmtap");

      // Verify scope spans
      const scopeSpans = payload.resourceSpans[0].scopeSpans;
      expect(scopeSpans).toHaveLength(1);
      expect(scopeSpans[0].scope.name).toBe("@llmtap/sdk");

      // Verify the span itself
      const spans = scopeSpans[0].spans;
      expect(spans).toHaveLength(1);
      expect(spans[0]).toHaveProperty("traceId");
      expect(spans[0]).toHaveProperty("spanId");
      expect(spans[0]).toHaveProperty("startTimeUnixNano");
      expect(spans[0]).toHaveProperty("endTimeUnixNano");
      expect(spans[0].kind).toBe(3); // SPAN_KIND_CLIENT

      // Verify GenAI attributes
      const attrMap = new Map(
        spans[0].attributes.map((a: { key: string; value: unknown }) => [a.key, a.value])
      );
      expect(attrMap.has("gen_ai.system")).toBe(true);
      expect(attrMap.has("gen_ai.request.model")).toBe(true);
      expect(attrMap.has("gen_ai.operation.name")).toBe(true);
    } finally {
      await closeServer(app);
      fs.rmSync(dbDir, { recursive: true, force: true });
    }
  });

  it("OTLP export endpoint respects custom service name", async () => {
    const dbDir = createTempDbDir();
    process.env.LLMTAP_DB_DIR = dbDir;

    const { app } = await createServer({ quiet: true });
    try {
      // Ingest a span
      await app.inject({
        method: "POST",
        url: ROUTES.INGEST_SPANS,
        payload: {
          spans: [
            {
              spanId: "sp_otlp2",
              traceId: "tr_otlp2",
              name: "otlp-svc-test",
              operationName: "chat",
              providerName: "openai",
              startTime: Date.now(),
              endTime: Date.now() + 50,
              duration: 50,
              requestModel: "gpt-4o-mini",
              responseModel: "gpt-4o-mini",
              inputTokens: 10,
              outputTokens: 5,
              totalTokens: 15,
              inputCost: 0,
              outputCost: 0,
              totalCost: 0,
              status: "ok",
            },
          ],
        },
      });

      const res = await app.inject({
        method: "GET",
        url: "/v1/export/otlp?service=my-custom-app",
      });

      expect(res.statusCode).toBe(200);
      const payload = res.json();
      const serviceAttr = payload.resourceSpans[0].resource.attributes.find(
        (a: { key: string }) => a.key === "service.name"
      );
      expect(serviceAttr.value.stringValue).toBe("my-custom-app");
    } finally {
      await closeServer(app);
      fs.rmSync(dbDir, { recursive: true, force: true });
    }
  });

  it("OTLP export returns empty spans array when no data", async () => {
    const dbDir = createTempDbDir();
    process.env.LLMTAP_DB_DIR = dbDir;

    const { app } = await createServer({ quiet: true });
    try {
      const res = await app.inject({
        method: "GET",
        url: "/v1/export/otlp",
      });

      expect(res.statusCode).toBe(200);
      const payload = res.json();
      expect(payload.resourceSpans[0].scopeSpans[0].spans).toHaveLength(0);
    } finally {
      await closeServer(app);
      fs.rmSync(dbDir, { recursive: true, force: true });
    }
  });

  // -----------------------------------------------------------------------
  // Rate limiting
  // -----------------------------------------------------------------------
  it("rate limiting returns 429 after threshold is exceeded", async () => {
    const dbDir = createTempDbDir();
    process.env.LLMTAP_DB_DIR = dbDir;

    const { app } = await createServer({ quiet: true });
    try {
      // POST:/v1/reset has a low rate limit of 5 requests per 60s window.
      // We'll send requests with { confirm: true } to keep them simple.
      // The first 5 should succeed (200), the 6th+ should be rate-limited (429).
      const results: number[] = [];
      for (let i = 0; i < 10; i++) {
        const res = await app.inject({
          method: "POST",
          url: "/v1/reset",
          payload: { confirm: true },
        });
        results.push(res.statusCode);
      }

      // At least one of the later responses must be 429
      const rateLimited = results.filter((code) => code === 429);
      expect(rateLimited.length).toBeGreaterThan(0);

      // Verify the 429 response body shape
      const lastRes = await app.inject({
        method: "POST",
        url: "/v1/reset",
        payload: { confirm: true },
      });
      expect(lastRes.statusCode).toBe(429);
      const body = lastRes.json();
      expect(body).toHaveProperty("error", "Rate limit exceeded");
      expect(body).toHaveProperty("retryAfterMs");
      expect(typeof body.retryAfterMs).toBe("number");
    } finally {
      await closeServer(app);
      fs.rmSync(dbDir, { recursive: true, force: true });
    }
  });

  // -----------------------------------------------------------------------
  // CORS
  // -----------------------------------------------------------------------
  it("CORS allows requests from localhost origins", async () => {
    const dbDir = createTempDbDir();
    process.env.LLMTAP_DB_DIR = dbDir;

    const { app } = await createServer({ quiet: true });
    try {
      const res = await app.inject({
        method: "GET",
        url: "/health",
        headers: { origin: "http://localhost:5173" },
      });
      expect(res.statusCode).toBe(200);
      expect(res.headers["access-control-allow-origin"]).toBe("http://localhost:5173");
    } finally {
      await closeServer(app);
      fs.rmSync(dbDir, { recursive: true, force: true });
    }
  });

  it("CORS allows requests from 127.0.0.1 origins", async () => {
    const dbDir = createTempDbDir();
    process.env.LLMTAP_DB_DIR = dbDir;

    const { app } = await createServer({ quiet: true });
    try {
      const res = await app.inject({
        method: "GET",
        url: "/health",
        headers: { origin: "http://127.0.0.1:4781" },
      });
      expect(res.statusCode).toBe(200);
      expect(res.headers["access-control-allow-origin"]).toBe("http://127.0.0.1:4781");
    } finally {
      await closeServer(app);
      fs.rmSync(dbDir, { recursive: true, force: true });
    }
  });

  it("CORS rejects non-localhost origins", async () => {
    const dbDir = createTempDbDir();
    process.env.LLMTAP_DB_DIR = dbDir;

    const { app } = await createServer({ quiet: true });
    try {
      const res = await app.inject({
        method: "GET",
        url: "/health",
        headers: { origin: "https://evil.example.com" },
      });
      // @fastify/cors calls cb(new Error(...), false) which results in a 500 error
      expect(res.statusCode).toBe(500);
    } finally {
      await closeServer(app);
      fs.rmSync(dbDir, { recursive: true, force: true });
    }
  });

  it("CORS allows requests with no origin header (SDK / curl)", async () => {
    const dbDir = createTempDbDir();
    process.env.LLMTAP_DB_DIR = dbDir;

    const { app } = await createServer({ quiet: true });
    try {
      const res = await app.inject({
        method: "GET",
        url: "/health",
      });
      expect(res.statusCode).toBe(200);
    } finally {
      await closeServer(app);
      fs.rmSync(dbDir, { recursive: true, force: true });
    }
  });
});
