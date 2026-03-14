const BASE = "";

export interface Trace {
  traceId: string;
  name: string;
  startTime: number;
  endTime?: number;
  status: "ok" | "error";
  spanCount: number;
  totalTokens: number;
  totalCost: number;
  totalDuration?: number;
}

export interface Span {
  spanId: string;
  traceId: string;
  parentSpanId?: string;
  name: string;
  operationName: string;
  providerName: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  requestModel: string;
  responseModel?: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  inputCost: number;
  outputCost: number;
  totalCost: number;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  inputMessages?: Message[];
  outputMessages?: Message[];
  toolCalls?: ToolCall[];
  status: "ok" | "error";
  errorType?: string;
  errorMessage?: string;
  tags?: Record<string, string>;
  sessionId?: string;
}

export interface ContentPart {
  type: "text" | "image_url" | "image";
  text?: string;
  image_url?: { url: string; detail?: string };
  source?: { type: string; media_type: string; data: string };
}

export interface Message {
  role: string;
  content: string | ContentPart[] | null;
  name?: string;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: string;
  result?: string;
}

export interface Stats {
  period: string;
  totalTraces: number;
  totalSpans: number;
  totalTokens: number;
  totalCost: number;
  avgDuration: number;
  errorCount: number;
  errorRate: number;
  byProvider: { provider: string; spanCount: number; totalTokens: number; totalCost: number; avgDuration: number }[];
  byModel: { model: string; provider: string; spanCount: number; totalTokens: number; totalCost: number; avgDuration: number }[];
  costOverTime: { timestamp: number; cost: number; tokens: number; spans: number }[];
}

export interface TraceQuery {
  limit?: number;
  offset?: number;
  q?: string;
  status?: "ok" | "error";
  provider?: string;
  periodHours?: number;
}

async function fetchJSON<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) {
    let body = "";
    try { body = await res.text(); } catch { /* ignore */ }
    throw new Error(`HTTP ${res.status}${body ? `: ${body.slice(0, 200)}` : ""}`);
  }
  return res.json() as Promise<T>;
}

export async function fetchTraces(
  query: TraceQuery = {}
): Promise<{ traces: Trace[]; total: number }> {
  const params = new URLSearchParams();
  params.set("limit", String(query.limit ?? 50));
  params.set("offset", String(query.offset ?? 0));

  if (query.q) params.set("q", query.q);
  if (query.status) params.set("status", query.status);
  if (query.provider) params.set("provider", query.provider);
  if (query.periodHours) params.set("periodHours", String(query.periodHours));

  return fetchJSON(`/v1/traces?${params.toString()}`);
}

export async function fetchTraceSpans(traceId: string): Promise<{ spans: Span[] }> {
  return fetchJSON(`/v1/traces/${traceId}/spans`);
}

export async function fetchStats(period = 24): Promise<Stats> {
  return fetchJSON(`/v1/stats?period=${period}`);
}

export function createSSEConnection(onSpan: (span: Span) => void): EventSource {
  const es = new EventSource(`${BASE}/v1/stream`);
  es.addEventListener("span", (event) => {
    try {
      const span = JSON.parse(event.data) as Span;
      onSpan(span);
    } catch { /* ignore parse errors */ }
  });
  return es;
}

export interface Session {
  sessionId: string;
  traceCount: number;
  spanCount: number;
  totalTokens: number;
  totalCost: number;
  firstSeen: number;
  lastSeen: number;
  errorCount: number;
}

export interface DbInfo {
  path: string;
  sizeBytes: number;
  spanCount: number;
  traceCount: number;
  oldestSpan: number | null;
  newestSpan: number | null;
  walMode: string;
}

export async function fetchSessions(
  periodHours = 168,
  limit = 50,
  offset = 0
): Promise<{ sessions: Session[]; total: number }> {
  return fetchJSON(
    `/v1/sessions?periodHours=${periodHours}&limit=${limit}&offset=${offset}`
  );
}

export async function fetchDbInfo(): Promise<DbInfo> {
  return fetchJSON("/v1/db-info");
}

export async function resetData(): Promise<void> {
  const res = await fetch(`${BASE}/v1/reset`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ confirm: true }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

export async function applyRetention(
  retentionDays: number
): Promise<{ deletedSpans: number }> {
  const res = await fetch(`${BASE}/v1/retention`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ retentionDays }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<{ deletedSpans: number }>;
}

export async function exportTraces(
  format: "json" | "csv",
  query: TraceQuery = {}
): Promise<string> {
  const data = await fetchTraces({ ...query, limit: 10000, offset: 0 });
  if (format === "json") {
    return JSON.stringify(data.traces, null, 2);
  }
  if (data.traces.length === 0) return "";
  const headers: (keyof Trace)[] = ["traceId", "name", "status", "spanCount", "totalTokens", "totalCost", "startTime"];
  const rows = data.traces.map((t) =>
    headers.map((h) => {
      const val = t[h];
      const str = String(val ?? "");
      // RFC 4180: quote values containing commas, double quotes, or newlines
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    }).join(",")
  );
  return [headers.join(","), ...rows].join("\n");
}

export interface Insight {
  id: string;
  type: "cost_anomaly" | "error_pattern" | "model_recommendation" | "token_waste";
  severity: "info" | "warning" | "critical";
  title: string;
  description: string;
  metric?: string;
}

export async function fetchInsights(): Promise<{ insights: Insight[] }> {
  return fetchJSON("/v1/insights");
}

export interface ReplayResult {
  content: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  responseModel: string;
  duration: number;
  provider: string;
  model: string;
}

export async function replaySpan(
  spanId: string,
  apiKey: string
): Promise<ReplayResult> {
  const res = await fetch(`${BASE}/v1/replay`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ spanId, apiKey }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: `HTTP ${res.status}` })) as { error?: string; message?: string };
    throw new Error(body.message ?? body.error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<ReplayResult>;
}

export async function exportOtlpJson(limit = 1000, service = "llmtap"): Promise<string> {
  const res = await fetch(`${BASE}/v1/export/otlp?limit=${limit}&service=${encodeURIComponent(service)}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return JSON.stringify(data, null, 2);
}

export async function forwardOtlp(
  endpoint: string,
  options: { headers?: Record<string, string>; limit?: number; service?: string } = {}
): Promise<{ spanCount: number }> {
  const res = await fetch(`${BASE}/v1/export/otlp/forward`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      endpoint,
      headers: options.headers,
      limit: options.limit ?? 1000,
      service: options.service ?? "llmtap",
    }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: `HTTP ${res.status}` })) as { error?: string; message?: string };
    throw new Error(body.message ?? body.error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<{ spanCount: number }>;
}
