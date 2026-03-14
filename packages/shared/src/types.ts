// ============================================================
// LLMTap Shared Types
// ============================================================

/** Represents a single LLM API call or operation */
export interface Span {
  /** Unique identifier for this span (16-char hex) */
  spanId: string;
  /** Groups related spans into a trace (32-char hex) */
  traceId: string;
  /** Links to parent span for agent workflows */
  parentSpanId?: string;
  /** Human-readable name, e.g. "chat gpt-4o" */
  name: string;
  /** Operation type: "chat", "embeddings", "text_completion" */
  operationName: string;
  /** Provider: "openai", "anthropic", "google", "deepseek", "groq", etc. */
  providerName: string;

  // Timing
  startTime: number;
  endTime?: number;
  duration?: number;

  // Model
  requestModel: string;
  responseModel?: string;

  // Token usage
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;

  // Cost (USD)
  inputCost?: number;
  outputCost?: number;
  totalCost?: number;

  // Request parameters
  temperature?: number;
  maxTokens?: number;
  topP?: number;

  // Content (optional, can be disabled for privacy)
  inputMessages?: Message[];
  outputMessages?: Message[];

  // Tool calls
  toolCalls?: ToolCall[];

  // Status
  status: "ok" | "error";
  errorType?: string;
  errorMessage?: string;

  // Metadata
  tags?: Record<string, string>;
  sessionId?: string;
  userId?: string;
}

/** Input for creating a span (before it ends) */
export interface SpanInput {
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
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  inputCost?: number;
  outputCost?: number;
  totalCost?: number;
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
  userId?: string;
}

export interface Message {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  name?: string;
  toolCallId?: string;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: string;
  result?: string;
  duration?: number;
}

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
  sessionId?: string;
  metadata?: Record<string, string>;
}

export interface TraceWithSpans extends Trace {
  spans: Span[];
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
  byProvider: ProviderStats[];
  byModel: ModelStats[];
}

export interface ProviderStats {
  provider: string;
  spanCount: number;
  totalTokens: number;
  totalCost: number;
  avgDuration: number;
}

export interface ModelStats {
  model: string;
  provider: string;
  spanCount: number;
  totalTokens: number;
  totalCost: number;
  avgDuration: number;
}

export interface CostOverTime {
  timestamp: number;
  cost: number;
  tokens: number;
  spans: number;
}

/** Configuration for the LLMTap SDK */
export interface LLMTapConfig {
  /** Collector URL (default: http://localhost:4781) */
  collectorUrl?: string;
  /** Whether to capture message content (default: true) */
  captureContent?: boolean;
  /** Maximum spans to buffer when collector is offline (default: 1000) */
  maxBufferSize?: number;
  /** Custom tags to add to all spans */
  defaultTags?: Record<string, string>;
  /** Session ID to group traces */
  sessionId?: string;
  /** Whether SDK is enabled (default: true) */
  enabled?: boolean;
  /** Enable debug logging to console (default: false) */
  debug?: boolean;
  /** Error handler called when span transport fails (default: silent) */
  onError?: (error: Error, context: { spanCount: number; retryable: boolean }) => void;
}

/** Options for the wrap() function */
export interface WrapOptions {
  /** Custom tags for spans from this client */
  tags?: Record<string, string>;
  /** Override provider name detection */
  provider?: string;
}

/** Model pricing: cost per 1 million tokens in USD */
export interface ModelPricing {
  provider: string;
  model: string;
  inputCostPer1M: number;
  outputCostPer1M: number;
}
