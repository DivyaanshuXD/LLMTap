import { z } from "zod";

// Max lengths to prevent abuse (100MB error messages, etc.)
const MAX_ID_LEN = 256;
const MAX_SHORT_STRING = 512;
const MAX_CONTENT_STRING = 100_000; // ~100KB per message content
const MAX_ERROR_MESSAGE = 10_000;
const MAX_TOOL_ARGS = 200_000; // tool calls can have large JSON

const MessageSchema = z.object({
  role: z.enum(["system", "user", "assistant", "tool"]),
  content: z.string().max(MAX_CONTENT_STRING).nullable(),
  name: z.string().max(MAX_SHORT_STRING).optional(),
  toolCallId: z.string().max(MAX_ID_LEN).optional(),
});

const ToolCallSchema = z.object({
  id: z.string().max(MAX_ID_LEN),
  name: z.string().max(MAX_SHORT_STRING),
  arguments: z.string().max(MAX_TOOL_ARGS),
  result: z.string().max(MAX_TOOL_ARGS).optional(),
  duration: z.number().nonnegative().optional(),
});

export const SpanInputSchema = z.object({
  spanId: z.string().min(1).max(MAX_ID_LEN),
  traceId: z.string().min(1).max(MAX_ID_LEN),
  parentSpanId: z.string().min(1).max(MAX_ID_LEN).optional(),
  name: z.string().min(1).max(MAX_SHORT_STRING),
  operationName: z.string().min(1).max(MAX_SHORT_STRING),
  providerName: z.string().min(1).max(MAX_SHORT_STRING),
  startTime: z.number().nonnegative(),
  endTime: z.number().nonnegative().optional(),
  duration: z.number().nonnegative().optional(),
  requestModel: z.string().min(1).max(MAX_SHORT_STRING),
  responseModel: z.string().max(MAX_SHORT_STRING).optional(),
  inputTokens: z.number().int().nonnegative().optional(),
  outputTokens: z.number().int().nonnegative().optional(),
  totalTokens: z.number().int().nonnegative().optional(),
  inputCost: z.number().nonnegative().optional(),
  outputCost: z.number().nonnegative().optional(),
  totalCost: z.number().nonnegative().optional(),
  temperature: z.number().min(0).max(10).optional(),
  maxTokens: z.number().int().nonnegative().optional(),
  topP: z.number().min(0).max(1).optional(),
  inputMessages: z.array(MessageSchema).max(500).optional(),
  outputMessages: z.array(MessageSchema).max(500).optional(),
  toolCalls: z.array(ToolCallSchema).max(200).optional(),
  status: z.enum(["ok", "error"]),
  errorType: z.string().max(MAX_SHORT_STRING).optional(),
  errorMessage: z.string().max(MAX_ERROR_MESSAGE).optional(),
  tags: z.record(z.string().max(MAX_SHORT_STRING)).optional(),
  sessionId: z.string().max(MAX_ID_LEN).optional(),
  userId: z.string().max(MAX_ID_LEN).optional(),
});

export const IngestRequestSchema = z.object({
  spans: z.array(SpanInputSchema).min(1).max(500),
});

// Query parameter schemas for GET routes
export const TracesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  status: z.enum(["ok", "error"]).optional(),
  provider: z.string().max(MAX_SHORT_STRING).optional(),
  q: z.string().max(MAX_SHORT_STRING).optional(),
  periodHours: z.coerce.number().int().min(1).max(8760).optional(), // max 1 year
});

export const StatsQuerySchema = z.object({
  period: z.coerce.number().int().min(1).max(8760).default(24),
});

export const SessionsQuerySchema = z.object({
  periodHours: z.coerce.number().int().min(1).max(8760).default(168),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export type ValidatedSpanInput = z.infer<typeof SpanInputSchema>;
