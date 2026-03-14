export const DEFAULT_COLLECTOR_PORT = 4781;
export const DEFAULT_COLLECTOR_URL = `http://localhost:${DEFAULT_COLLECTOR_PORT}`;
export const DEFAULT_MAX_BUFFER_SIZE = 1000;
export const DB_DIR_NAME = ".llmtap";
export const DB_FILE_NAME = "data.db";
export const VERSION = "0.1.0";

// API routes
export const ROUTES = {
  INGEST_SPANS: "/v1/spans",
  LIST_TRACES: "/v1/traces",
  GET_TRACE_SPANS: "/v1/traces/:traceId/spans",
  GET_STATS: "/v1/stats",
  GET_SESSIONS: "/v1/sessions",
  GET_DB_INFO: "/v1/db-info",
  SSE_STREAM: "/v1/stream",
} as const;
