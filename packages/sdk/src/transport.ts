import type { SpanInput } from "@llmtap/shared";
import {
  DEFAULT_COLLECTOR_URL,
  DEFAULT_MAX_BUFFER_SIZE,
  ROUTES,
} from "@llmtap/shared";
import { getGlobalConfig } from "./config.js";

interface TransportConfig {
  collectorUrl: string;
  maxBufferSize: number;
  enabled: boolean;
  onError?: (error: Error, context: { spanCount: number; retryable: boolean }) => void;
}

const defaultConfig: TransportConfig = {
  collectorUrl: DEFAULT_COLLECTOR_URL,
  maxBufferSize: DEFAULT_MAX_BUFFER_SIZE,
  enabled: true,
};

let config: TransportConfig = { ...defaultConfig };
let buffer: SpanInput[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let isFlushing = false;
let shutdownHooksInstalled = false;

function debug(...args: unknown[]): void {
  if (getGlobalConfig().debug) {
    console.log("[llmtap]", ...args);
  }
}

/** Configure the transport layer */
export function configureTransport(opts: Partial<TransportConfig>): void {
  if (opts.collectorUrl !== undefined) config.collectorUrl = opts.collectorUrl;
  if (opts.maxBufferSize !== undefined) config.maxBufferSize = opts.maxBufferSize;
  if (opts.enabled !== undefined) config.enabled = opts.enabled;
  if (opts.onError !== undefined) config.onError = opts.onError;
  installShutdownHooks();
}

function notifyError(error: Error, spanCount: number, retryable: boolean): void {
  debug(`Error (retryable=${retryable}):`, error.message);
  if (config.onError) {
    try {
      config.onError(error, { spanCount, retryable });
    } catch {
      // Never let user callback crash the SDK
    }
  }
}

/** Send a span to the collector */
export function sendSpan(span: SpanInput): void {
  installShutdownHooks();

  if (!config.enabled) return;

  buffer.push(span);
  debug(
    `Span buffered: ${span.name} (${span.requestModel}) ${span.totalTokens ?? 0} tokens $${(span.totalCost ?? 0).toFixed(4)} | buffer=${buffer.length}`
  );

  // Trim buffer if too large
  if (buffer.length > config.maxBufferSize) {
    const dropped = buffer.length - config.maxBufferSize;
    buffer = buffer.slice(-config.maxBufferSize);
    notifyError(
      new Error(`Buffer overflow: dropped ${dropped} oldest span(s)`),
      dropped,
      false
    );
  }

  // Debounce flush: send after 100ms of no new spans, or immediately if buffer > 50
  if (buffer.length >= 50) {
    flush();
  } else if (!flushTimer) {
    flushTimer = setTimeout(() => {
      flushTimer = null;
      flush();
    }, 100);
  }
}

/** Flush all buffered spans to the collector */
export async function flush(): Promise<void> {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }

  if (buffer.length === 0 || isFlushing) {
    // If we skipped because another flush is in progress, schedule a
    // follow-up flush so any spans added during the current flush are sent.
    if (isFlushing && buffer.length > 0 && !flushTimer) {
      flushTimer = setTimeout(() => {
        flushTimer = null;
        flush();
      }, 100);
    }
    return;
  }

  const batch = buffer.splice(0);
  isFlushing = true;
  debug(`Flushing ${batch.length} span(s) to ${config.collectorUrl}`);

  try {
    await sendWithRetry(batch);
    debug(`Flush successful: ${batch.length} span(s) sent`);
  } catch (err) {
    // Put failed spans back into buffer (at the front)
    const reinsertCount = Math.min(batch.length, config.maxBufferSize - buffer.length);
    if (reinsertCount > 0) {
      buffer.unshift(...batch.slice(0, reinsertCount));
    }
    notifyError(
      err instanceof Error ? err : new Error(String(err)),
      batch.length,
      true
    );
  } finally {
    isFlushing = false;
  }
}

async function sendWithRetry(
  spans: SpanInput[],
  maxRetries = 3
): Promise<void> {
  const url = `${config.collectorUrl}${ROUTES.INGEST_SPANS}`;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spans }),
        signal: AbortSignal.timeout(5000),
      });

      if (res.ok) return;

      // Don't retry 4xx errors (client errors) — notify and bail
      if (res.status >= 400 && res.status < 500) {
        let body = "";
        try { body = await res.text(); } catch { /* ignore */ }
        notifyError(
          new Error(`Collector returned HTTP ${res.status}${body ? `: ${body.slice(0, 200)}` : ""}`),
          spans.length,
          false
        );
        return;
      }

      debug(`Attempt ${attempt + 1}/${maxRetries} returned HTTP ${res.status}, retrying...`);
    } catch (err) {
      debug(`Attempt ${attempt + 1}/${maxRetries} failed:`, err instanceof Error ? err.message : err);
      // Network error — will retry on next iteration
      if (attempt === maxRetries - 1) {
        throw err;
      }
    }

    if (attempt < maxRetries - 1) {
      await sleep(Math.pow(2, attempt) * 200);
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Gracefully shut down the SDK transport.
 * Flushes all buffered spans and prevents future sends.
 * Returns a promise that resolves when all pending spans have been sent.
 *
 * Use this in serverless environments (Lambda, Vercel Functions) to ensure
 * no spans are lost before the process exits.
 */
export async function shutdown(): Promise<void> {
  debug("Shutting down transport...");
  config.enabled = false;
  await flush();
  debug("Transport shutdown complete");
}

/** Get the number of buffered spans (for debugging) */
export function getBufferSize(): number {
  return buffer.length;
}

/** Clear the buffer (for testing) */
export function clearBuffer(): void {
  buffer = [];
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
}

function installShutdownHooks(): void {
  if (shutdownHooksInstalled || typeof process === "undefined") {
    return;
  }

  shutdownHooksInstalled = true;

  process.once("beforeExit", () => {
    if (buffer.length > 0) {
      return flush();
    }
  });

  // Flush on SIGINT/SIGTERM so spans are not lost when killed
  const gracefulShutdown = () => {
    if (buffer.length > 0) {
      flush().finally(() => process.exit(0));
    } else {
      process.exit(0);
    }
  };

  process.once("SIGINT", gracefulShutdown);
  process.once("SIGTERM", gracefulShutdown);
}
