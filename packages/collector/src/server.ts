import Fastify from "fastify";
import cors from "@fastify/cors";
import fastifyStatic from "@fastify/static";
import { z } from "zod";
import { DEFAULT_COLLECTOR_PORT } from "@llmtap/shared";
import { getDb, closeDb, resetDb, startRetentionSchedule, enforceRetention } from "./db.js";
import { seedDemoData } from "./seed.js";
import { registerIngestRoute } from "./routes/ingest.js";
import { registerTraceRoutes } from "./routes/traces.js";
import { registerStatsRoute } from "./routes/stats.js";
import { registerSSERoute } from "./routes/sse.js";
import { registerSessionsRoute } from "./routes/sessions.js";
import { registerDbInfoRoute } from "./routes/db-info.js";
import { registerInsightsRoute } from "./routes/insights.js";
import { registerReplayRoute } from "./routes/replay.js";
import { registerOtlpExportRoute } from "./routes/otlp.js";
import { initOtlpForwarder, getOtlpEndpoint } from "./otlp-forwarder.js";

export interface CollectorOptions {
  port?: number;
  host?: string;
  dashboardPath?: string;
  quiet?: boolean;
  demo?: boolean;
  /** Data retention in days. 0 = keep forever. */
  retentionDays?: number;
}

// Per-IP rate limiter keyed by "METHOD:pathname"
interface RateState { count: number; windowStart: number }
const rateLimitConfigs: Record<string, { max: number; windowMs: number }> = {
  "POST:/v1/spans": { max: 300, windowMs: 60_000 },
  "POST:/v1/reset": { max: 5, windowMs: 60_000 },
  "POST:/v1/replay": { max: 30, windowMs: 60_000 },
  "POST:/v1/retention": { max: 10, windowMs: 60_000 },
  "POST:/v1/export/otlp/forward": { max: 20, windowMs: 60_000 },
  "GET:/v1/insights": { max: 60, windowMs: 60_000 },
  "GET:/v1/export/otlp": { max: 30, windowMs: 60_000 },
};
const rateLimitByIP = new Map<string, RateState>();

const RetentionSchema = z.object({
  retentionDays: z.number().min(0).max(3650),
});

const ResetSchema = z.object({
  confirm: z.literal(true),
});

export async function createServer(options: CollectorOptions = {}) {
  const port = options.port ?? DEFAULT_COLLECTOR_PORT;
  const host = options.host ?? "127.0.0.1";

  const app = Fastify({
    logger: !options.quiet
      ? {
          transport: {
            target: "pino-pretty",
            options: { translateTime: "HH:MM:ss", ignore: "pid,hostname" },
          },
        }
      : false,
    // Limit request body to 2MB to prevent abuse
    bodyLimit: 2 * 1024 * 1024,
  });

  // CORS: only allow localhost origins (dashboard runs on same host)
  await app.register(cors, {
    origin: (origin, cb) => {
      // Allow requests with no origin (curl, SDK, server-to-server)
      if (!origin || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
        cb(null, true);
      } else {
        cb(new Error("Not allowed by CORS"), false);
      }
    },
    methods: ["GET", "POST", "OPTIONS"],
  });

  // Per-IP rate limiter for all sensitive endpoints
  app.addHook("onRequest", async (request, reply) => {
    const pathname = request.url.split("?")[0].replace(/\/+$/, "");
    const key = `${request.method}:${pathname}`;
    const cfg = rateLimitConfigs[key];
    if (!cfg) return;

    const ip = request.ip;
    const ipKey = `${ip}:${key}`;
    const now = Date.now();
    let state = rateLimitByIP.get(ipKey);
    if (!state || now - state.windowStart > cfg.windowMs) {
      state = { count: 0, windowStart: now };
      rateLimitByIP.set(ipKey, state);
    }
    state.count++;
    if (state.count > cfg.max) {
      return reply.status(429).send({
        error: "Rate limit exceeded",
        retryAfterMs: cfg.windowMs - (now - state.windowStart),
      });
    }
  });

  // Periodically clean up stale rate limit entries
  const rateLimitCleanup = setInterval(() => {
    const now = Date.now();
    for (const [k, v] of rateLimitByIP) {
      if (now - v.windowStart > 120_000) rateLimitByIP.delete(k);
    }
  }, 60_000);
  rateLimitCleanup.unref();

  // Serve dashboard static files if path provided
  if (options.dashboardPath) {
    await app.register(fastifyStatic, {
      root: options.dashboardPath,
      prefix: "/",
      wildcard: true,
    });

    // SPA fallback: serve index.html for non-API routes
    app.setNotFoundHandler(async (_request, reply) => {
      return reply.sendFile("index.html");
    });
  }

  // Initialize database
  getDb();

  // Demo data is opt-in so a real install starts clean.
  if (options.demo) {
    seedDemoData();
  }

  // Start retention enforcement if configured
  if (options.retentionDays && options.retentionDays > 0) {
    startRetentionSchedule(options.retentionDays);
  }

  // Initialize OTLP auto-forwarding if OTEL_EXPORTER_OTLP_ENDPOINT is set
  initOtlpForwarder();

  // Register API routes
  await registerIngestRoute(app);
  await registerTraceRoutes(app);
  await registerStatsRoute(app);
  await registerSSERoute(app);
  await registerSessionsRoute(app);
  await registerDbInfoRoute(app);
  await registerInsightsRoute(app);
  await registerReplayRoute(app);
  await registerOtlpExportRoute(app);

  // Health check
  app.get("/health", async () => ({ status: "ok" }));

  // Reset endpoint (requires explicit confirmation)
  app.post("/v1/reset", async (request, reply) => {
    const parsed = ResetSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Must send { confirm: true } to reset database" });
    }
    resetDb();
    return reply.send({ status: "ok", message: "Data cleared" });
  });

  // Retention endpoint (for dashboard Settings page)
  app.post("/v1/retention", async (request, reply) => {
    const parsed = RetentionSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Validation failed", details: parsed.error.issues });
    }
    const deleted = enforceRetention(parsed.data.retentionDays);
    return reply.send({
      status: "ok",
      retentionDays: parsed.data.retentionDays,
      deletedSpans: deleted,
    });
  });

  // Graceful shutdown
  let isShuttingDown = false;
  const shutdown = async () => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    clearInterval(rateLimitCleanup);
    await app.close();
    closeDb();
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
  app.addHook("onClose", async () => {
    process.off("SIGINT", shutdown);
    process.off("SIGTERM", shutdown);
  });

  return { app, port, host };
}

export async function startServer(
  options: CollectorOptions = {}
): Promise<string> {
  const { app, port, host } = await createServer(options);
  const address = await app.listen({ port, host });
  return address;
}
