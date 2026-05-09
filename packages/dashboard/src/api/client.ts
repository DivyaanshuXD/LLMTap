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
  sessionId?: string;
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
  if (query.sessionId) params.set("sessionId", query.sessionId);
  if (query.periodHours) params.set("periodHours", String(query.periodHours));

  return fetchJSON(`/v1/traces?${params.toString()}`);
}

export async function fetchTraceSpans(traceId: string): Promise<{ spans: Span[] }> {
  return fetchJSON(`/v1/traces/${traceId}/spans`);
}

export async function fetchStats(period = 24): Promise<Stats> {
  return fetchJSON(`/v1/stats?period=${period}`);
}

export async function fetchHealth(): Promise<{ status: string }> {
  return fetchJSON("/health");
}

function makeId(prefix: string) {
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().replace(/-/g, "")
      : Math.random().toString(16).slice(2) + Date.now().toString(16);
  return `${prefix}_${random.slice(0, 24)}`;
}

interface DemoSpanPayload {
  spanId: string;
  traceId: string;
  name: string;
  operationName: string;
  providerName: string;
  startTime: number;
  endTime: number;
  duration: number;
  requestModel: string;
  responseModel: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  inputCost: number;
  outputCost: number;
  totalCost: number;
  temperature: number;
  maxTokens: number;
  inputMessages: Message[];
  outputMessages?: Message[];
  status: "ok" | "error";
  errorType?: string;
  errorMessage?: string;
  tags: Record<string, string>;
  sessionId: string;
}

const DEMO_SCENARIOS = [
  {
    name: "agent planning",
    operationName: "chat",
    providerName: "openai",
    requestModel: "gpt-4o-mini",
    duration: 428,
    inputTokens: 96,
    outputTokens: 142,
    totalCost: 0.000099,
    prompt: "Plan a three-step local observability rollout.",
    response: "Plan created with collector startup, SDK wrapping, and trace review.",
    status: "ok" as const,
  },
  {
    name: "tool routing decision",
    operationName: "chat",
    providerName: "anthropic",
    requestModel: "claude-3-7-sonnet-latest",
    duration: 812,
    inputTokens: 420,
    outputTokens: 236,
    totalCost: 0.0061,
    prompt: "Choose the safest tool for reading local trace metadata.",
    response: "Selected read-only metadata lookup and avoided exporting payload content.",
    status: "ok" as const,
  },
  {
    name: "rag answer synthesis",
    operationName: "chat",
    providerName: "google",
    requestModel: "gemini-2.5-flash",
    duration: 1190,
    inputTokens: 1360,
    outputTokens: 318,
    totalCost: 0.0034,
    prompt: "Summarize retrieved docs into an answer with citations.",
    response: "Synthesized a concise answer from three retrieved passages.",
    status: "ok" as const,
  },
  {
    name: "budget guardrail",
    operationName: "chat",
    providerName: "openai",
    requestModel: "gpt-4o-mini",
    duration: 264,
    inputTokens: 86,
    outputTokens: 22,
    totalCost: 0.000027,
    prompt: "Check whether this request should be routed to a cheaper model.",
    response: "Recommended the mini model because the prompt is short and low risk.",
    status: "ok" as const,
  },
  {
    name: "provider timeout",
    operationName: "chat",
    providerName: "openrouter",
    requestModel: "meta-llama/llama-3.1-70b-instruct",
    duration: 4100,
    inputTokens: 690,
    outputTokens: 0,
    totalCost: 0,
    prompt: "Generate a multi-tool plan for a browser agent.",
    response: "",
    status: "error" as const,
    errorType: "TimeoutError",
    errorMessage: "Provider did not return within the configured timeout.",
  },
  {
    name: "final response polish",
    operationName: "chat",
    providerName: "groq",
    requestModel: "llama-3.1-8b-instant",
    duration: 218,
    inputTokens: 310,
    outputTokens: 124,
    totalCost: 0.000041,
    prompt: "Rewrite a status update in a direct engineering tone.",
    response: "Condensed the update and preserved the verification details.",
    status: "ok" as const,
  },
];

function buildDemoSpan(
  scenario: (typeof DEMO_SCENARIOS)[number],
  index: number,
  options: { provider?: string; model?: string; now: number }
): DemoSpanPayload {
  const providerName = index === 0 ? options.provider || scenario.providerName : scenario.providerName;
  const requestModel = index === 0 ? options.model?.trim() || scenario.requestModel : scenario.requestModel;
  const totalTokens = scenario.inputTokens + scenario.outputTokens;
  const startTime = options.now - (DEMO_SCENARIOS.length - index) * 95_000 - scenario.duration;
  const endTime = startTime + scenario.duration;

  return {
    spanId: makeId(`sp_demo_${index}`),
    traceId: makeId(`tr_demo_${index}`),
    name: scenario.name,
    operationName: scenario.operationName,
    providerName,
    startTime,
    endTime,
    duration: scenario.duration,
    requestModel,
    responseModel: requestModel,
    inputTokens: scenario.inputTokens,
    outputTokens: scenario.outputTokens,
    totalTokens,
    inputCost: scenario.totalCost * 0.35,
    outputCost: scenario.totalCost * 0.65,
    totalCost: scenario.totalCost,
    temperature: 0.7,
    maxTokens: 512,
    inputMessages: [
      {
        role: "user",
        content: scenario.prompt,
      },
    ],
    outputMessages:
      scenario.status === "ok"
        ? [
            {
              role: "assistant",
              content: scenario.response,
            },
          ]
        : undefined,
    status: scenario.status,
    errorType: scenario.errorType,
    errorMessage: scenario.errorMessage,
    tags: {
      source: "quick-connect",
      demo: "true",
      simulator: "true",
    },
    sessionId: `quick-connect-demo-${options.now}`,
  };
}

async function postDemoSpans(spans: DemoSpanPayload[]): Promise<{ accepted: number }> {
  const res = await fetch(`${BASE}/v1/spans`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ spans }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status}${body ? `: ${body.slice(0, 200)}` : ""}`);
  }

  return res.json() as Promise<{ accepted: number }>;
}

export async function createDemoTrace(options: {
  provider?: string;
  model?: string;
} = {}): Promise<{ accepted: number }> {
  const now = Date.now();
  return postDemoSpans([buildDemoSpan(DEMO_SCENARIOS[0], 0, { ...options, now })]);
}

export async function createDemoTraffic(options: {
  provider?: string;
  model?: string;
} = {}): Promise<{ accepted: number }> {
  const now = Date.now();
  return postDemoSpans(
    DEMO_SCENARIOS.map((scenario, index) =>
      buildDemoSpan(scenario, index, { ...options, now })
    )
  );
}

export async function clearDemoTraffic(): Promise<{ deletedSpans: number }> {
  const res = await fetch(`${BASE}/v1/demo/clear`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ confirm: true }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status}${body ? `: ${body.slice(0, 200)}` : ""}`);
  }

  return res.json() as Promise<{ deletedSpans: number }>;
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
  const limit = 200;
  const allTraces: Trace[] = [];
  let offset = 0;
  let total = 0;

  do {
    const data = await fetchTraces({ ...query, limit, offset });
    allTraces.push(...data.traces);
    total = data.total;
    offset += limit;
  } while (allTraces.length < total);

  if (format === "json") {
    return JSON.stringify(allTraces, null, 2);
  }
  if (allTraces.length === 0) return "";
  const headers: (keyof Trace)[] = ["traceId", "name", "status", "spanCount", "totalTokens", "totalCost", "startTime"];
  const rows = allTraces.map((t) =>
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
