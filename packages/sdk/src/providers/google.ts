import type { Message, SpanInput, ToolCall, WrapOptions } from "@llmtap/shared";
import { calculateCost } from "@llmtap/shared";
import { generateSpanId, generateTraceId } from "../ids.js";
import { getTraceContext, withParentSpanContext } from "../trace.js";
import { sendSpan } from "../transport.js";
import { getGlobalConfig } from "../config.js";

type RecordLike = Record<string, unknown>;

interface GoogleContext {
  spanId: string;
  traceId: string;
  providerName: string;
  model: string;
  startTime: number;
  inputMessages?: Message[];
  traceCtx: ReturnType<typeof getTraceContext>;
  params: unknown;
  optionsTags?: Record<string, string>;
}

interface GoogleStreamState {
  textParts: string[];
}

export function wrapGoogle<T extends object>(
  client: T,
  options?: WrapOptions
): T {
  return createGoogleProxy(client, client, options);
}

function createGoogleProxy<T extends object>(
  value: T,
  rootClient: object,
  options?: WrapOptions
): T {
  return new Proxy(value, {
    get(target, prop, receiver) {
      const property = Reflect.get(target, prop, receiver);

      if (prop === "getGenerativeModel" && typeof property === "function") {
        return (...args: unknown[]) => {
          const model = property.apply(target, args) as object;
          return createGoogleProxy(model, rootClient, options);
        };
      }

      if (prop === "generateContent" && typeof property === "function") {
        return createGenerateContentInterceptor(
          property.bind(target),
          target,
          rootClient,
          options
        );
      }

      if (prop === "generateContentStream" && typeof property === "function") {
        return createGenerateContentStreamInterceptor(
          property.bind(target),
          target,
          rootClient,
          options
        );
      }

      return property;
    },
  });
}

function createGenerateContentInterceptor(
  original: (...args: unknown[]) => unknown,
  modelTarget: object,
  rootClient: object,
  options?: WrapOptions
) {
  return async function interceptedGenerateContent(
    ...args: unknown[]
  ): Promise<unknown> {
    const config = getGlobalConfig();
    if (!config.enabled) {
      return original(...args);
    }

    const context = createGoogleContext(args[0], modelTarget, rootClient, options);

    try {
      const result = await withParentSpanContext(
        context.spanId,
        () => original(...args),
        {
          traceId: context.traceId,
          sessionId: context.traceCtx?.sessionId,
          tags: context.traceCtx?.tags,
        }
      );

      emitGoogleSuccessSpan(context, result);
      return result;
    } catch (err) {
      emitGoogleErrorSpan(context, err);
      throw err;
    }
  };
}

function createGenerateContentStreamInterceptor(
  original: (...args: unknown[]) => unknown,
  modelTarget: object,
  rootClient: object,
  options?: WrapOptions
) {
  return async function interceptedGenerateContentStream(
    ...args: unknown[]
  ): Promise<unknown> {
    const config = getGlobalConfig();
    if (!config.enabled) {
      return original(...args);
    }

    const context = createGoogleContext(args[0], modelTarget, rootClient, options);

    try {
      const result = await withParentSpanContext(
        context.spanId,
        () => original(...args),
        {
          traceId: context.traceId,
          sessionId: context.traceCtx?.sessionId,
          tags: context.traceCtx?.tags,
        }
      );

      if (!isGoogleStreamResult(result)) {
        emitGoogleSuccessSpan(context, result);
        return result;
      }

      return instrumentGoogleStreamResult(result, context);
    } catch (err) {
      emitGoogleErrorSpan(context, err);
      throw err;
    }
  };
}

function createGoogleContext(
  params: unknown,
  modelTarget: object,
  rootClient: object,
  options?: WrapOptions
): GoogleContext {
  const traceCtx = getTraceContext();

  return {
    spanId: generateSpanId(),
    traceId: traceCtx?.traceId ?? generateTraceId(),
    providerName: options?.provider ?? detectGoogleProvider(rootClient),
    model: getGoogleModelName(modelTarget, params),
    startTime: Date.now(),
    inputMessages: buildGoogleInputMessages(params),
    traceCtx,
    params,
    optionsTags: options?.tags,
  };
}

function emitGoogleSuccessSpan(context: GoogleContext, result: unknown): void {
  const response = getGoogleResponse(result);
  const responseModel = getGoogleResponseModel(response, context.model);
  const usage = getGoogleUsageMetadata(response);
  const outputMessages = buildGoogleOutputMessages(response);
  const toolCalls = buildGoogleToolCalls(response);

  emitGoogleSpan(context, {
    responseModel,
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
    totalTokens: usage.totalTokens,
    outputMessages,
    toolCalls,
    status: "ok",
  });
}

function emitGoogleErrorSpan(context: GoogleContext, err: unknown): void {
  const error = err as Error;

  emitGoogleSpan(context, {
    responseModel: context.model,
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
    status: "error",
    errorType: error?.constructor?.name ?? "Error",
    errorMessage: error?.message ?? String(err),
  });
}

function emitGoogleSpan(
  context: GoogleContext,
  data: {
    responseModel: string;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    outputMessages?: Message[];
    toolCalls?: ToolCall[];
    status: "ok" | "error";
    errorType?: string;
    errorMessage?: string;
  }
): void {
  const endTime = Date.now();
  const params = getGoogleGenerationParams(context.params);
  const cost = calculateCost(
    context.providerName,
    data.responseModel,
    data.inputTokens,
    data.outputTokens
  );

  const span: SpanInput = {
    spanId: context.spanId,
    traceId: context.traceId,
    parentSpanId: context.traceCtx?.parentSpanId,
    name: `generate ${data.responseModel}`,
    operationName: "generate_content",
    providerName: context.providerName,
    startTime: context.startTime,
    endTime,
    duration: endTime - context.startTime,
    requestModel: context.model,
    responseModel: data.responseModel,
    inputTokens: data.inputTokens,
    outputTokens: data.outputTokens,
    totalTokens: data.totalTokens,
    inputCost: cost.inputCost,
    outputCost: cost.outputCost,
    totalCost: cost.totalCost,
    temperature: params.temperature,
    maxTokens: params.maxTokens,
    topP: params.topP,
    inputMessages: context.inputMessages,
    outputMessages: data.outputMessages,
    toolCalls: data.toolCalls,
    status: data.status,
    errorType: data.errorType,
    errorMessage: data.errorMessage,
    tags: { ...context.traceCtx?.tags, ...context.optionsTags },
    sessionId: context.traceCtx?.sessionId,
  };

  sendSpan(span);
}

function instrumentGoogleStreamResult(
  result: { stream: AsyncIterable<unknown>; response: Promise<unknown> },
  context: GoogleContext
): unknown {
  const state: GoogleStreamState = { textParts: [] };
  let finalized = false;

  const finalizeSuccess = (finalResult: unknown) => {
    if (finalized) {
      return;
    }
    finalized = true;

    const response = getGoogleResponse(finalResult);
    const responseModel = getGoogleResponseModel(response, context.model);
    const usage = getGoogleUsageMetadata(response);
    const toolCalls = buildGoogleToolCalls(response);
    const outputMessages = buildGoogleStreamOutputMessages(state, response);

    emitGoogleSpan(context, {
      responseModel,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      totalTokens: usage.totalTokens,
      outputMessages,
      toolCalls,
      status: "ok",
    });
  };

  const finalizeError = (err: unknown) => {
    if (finalized) {
      return;
    }
    finalized = true;

    const error = err as Error;
    emitGoogleSpan(context, {
      responseModel: context.model,
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      outputMessages: buildGoogleStreamOutputMessages(state),
      status: "error",
      errorType: error?.constructor?.name ?? "Error",
      errorMessage: error?.message ?? String(err),
    });
  };

  const wrappedResponse = Promise.resolve(result.response)
    .then((response) => {
      finalizeSuccess(response);
      return response;
    })
    .catch((err) => {
      finalizeError(err);
      throw err;
    });

  return {
    ...result,
    stream: createGoogleStreamProxy(result.stream, state, finalizeError),
    response: wrappedResponse,
  };
}

function createGoogleStreamProxy(
  stream: AsyncIterable<unknown>,
  state: GoogleStreamState,
  onError: (err: unknown) => void
): AsyncIterable<unknown> {
  return {
    [Symbol.asyncIterator]() {
      const iterator = stream[Symbol.asyncIterator]();
      return {
        async next(value?: unknown) {
          try {
            const result = await iterator.next(value as never);
            if (!result.done) {
              consumeGoogleStreamChunk(state, result.value);
            }
            return result;
          } catch (err) {
            onError(err);
            throw err;
          }
        },
        async return(value?: unknown) {
          if (iterator.return) {
            return iterator.return(value as never);
          }
          return { done: true, value };
        },
        async throw(err?: unknown) {
          onError(err);
          if (iterator.throw) {
            return iterator.throw(err as never);
          }
          throw err;
        },
        [Symbol.asyncIterator]() {
          return this;
        },
      };
    },
  };
}

function consumeGoogleStreamChunk(state: GoogleStreamState, chunk: unknown): void {
  const response = getGoogleResponse(chunk);
  const text = extractGoogleText(response);
  if (text) {
    state.textParts.push(text);
  }
}

function buildGoogleInputMessages(params: unknown): Message[] | undefined {
  const config = getGlobalConfig();
  if (!config.captureContent) {
    return undefined;
  }

  const normalized = normalizeGoogleContents(params);
  if (normalized.length === 0) {
    return undefined;
  }

  return normalized.map((message) => ({
    role: message.role,
    content: message.content,
  }));
}

function buildGoogleOutputMessages(response: RecordLike): Message[] | undefined {
  const config = getGlobalConfig();
  if (!config.captureContent) {
    return undefined;
  }

  const text = extractGoogleText(response);
  if (!text) {
    return undefined;
  }

  return [{ role: "assistant", content: text }];
}

function buildGoogleStreamOutputMessages(
  state: GoogleStreamState,
  response?: RecordLike
): Message[] | undefined {
  const config = getGlobalConfig();
  if (!config.captureContent) {
    return undefined;
  }

  const accumulated = state.textParts.join("");
  const text = accumulated || (response ? extractGoogleText(response) : "");
  if (!text) {
    return undefined;
  }

  return [{ role: "assistant", content: text }];
}

function buildGoogleToolCalls(response: RecordLike): ToolCall[] | undefined {
  const candidates = response.candidates as Array<RecordLike> | undefined;
  const toolCalls: ToolCall[] = [];

  for (const candidate of candidates ?? []) {
    const content = candidate.content as RecordLike | undefined;
    const parts = content?.parts as Array<RecordLike> | undefined;
    for (const part of parts ?? []) {
      const functionCall = part.functionCall as RecordLike | undefined;
      if (functionCall) {
        toolCalls.push({
          id:
            (functionCall.id as string | undefined) ??
            `${toolCalls.length + 1}`,
          name: (functionCall.name as string | undefined) ?? "unknown",
          arguments: JSON.stringify(functionCall.args ?? {}),
        });
      }
    }
  }

  return toolCalls.length > 0 ? toolCalls : undefined;
}

function getGoogleUsageMetadata(response: RecordLike): {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
} {
  const usage = response.usageMetadata as RecordLike | undefined;
  const inputTokens = (usage?.promptTokenCount as number | undefined) ?? 0;
  const outputTokens = (usage?.candidatesTokenCount as number | undefined) ?? 0;
  const totalTokens =
    (usage?.totalTokenCount as number | undefined) ?? inputTokens + outputTokens;

  return { inputTokens, outputTokens, totalTokens };
}

function getGoogleResponse(result: unknown): RecordLike {
  if (
    typeof result === "object" &&
    result !== null &&
    "response" in result &&
    typeof (result as RecordLike).response === "object" &&
    (result as RecordLike).response !== null
  ) {
    return (result as { response: RecordLike }).response;
  }

  return (result ?? {}) as RecordLike;
}

function getGoogleResponseModel(response: RecordLike, fallback: string): string {
  return (
    (response.modelVersion as string | undefined) ??
    (response.model as string | undefined) ??
    fallback
  );
}

function getGoogleGenerationParams(params: unknown): {
  temperature?: number;
  topP?: number;
  maxTokens?: number;
} {
  if (typeof params === "object" && params !== null) {
    const config =
      (params as RecordLike).generationConfig as RecordLike | undefined;
    return {
      temperature: config?.temperature as number | undefined,
      topP: config?.topP as number | undefined,
      maxTokens: config?.maxOutputTokens as number | undefined,
    };
  }

  return {};
}

function getGoogleModelName(modelTarget: object, params: unknown): string {
  const asRecord = modelTarget as RecordLike;
  if (typeof asRecord.model === "string") {
    return asRecord.model;
  }

  if (typeof params === "object" && params !== null) {
    const record = params as RecordLike;
    if (typeof record.model === "string") {
      return record.model;
    }
  }

  return "unknown";
}

function normalizeGoogleContents(params: unknown): Array<{
  role: Message["role"];
  content: string;
}> {
  if (typeof params === "string") {
    return [{ role: "user", content: params }];
  }

  if (Array.isArray(params)) {
    return params.flatMap((entry) => normalizeGoogleContents(entry));
  }

  if (typeof params !== "object" || params === null) {
    return [];
  }

  const record = params as RecordLike;
  if (Array.isArray(record.contents)) {
    return (record.contents as Array<RecordLike>).flatMap((content) => {
      const role = normalizeGoogleRole(content.role);
      const parts = Array.isArray(content.parts) ? content.parts : [];
      return parts.flatMap((part) => {
        if (typeof part === "string") {
          return [{ role, content: part }];
        }
        if (typeof part === "object" && part !== null) {
          const text = (part as RecordLike).text;
          if (typeof text === "string") {
            return [{ role, content: text }];
          }
        }
        return [];
      });
    });
  }

  return [];
}

function extractGoogleText(response: RecordLike): string {
  const text = response.text;
  if (typeof text === "function") {
    return String(text.call(response) ?? "");
  }

  const candidates = response.candidates as Array<RecordLike> | undefined;
  const parts =
    (candidates?.[0]?.content as RecordLike | undefined)?.parts as
      | Array<RecordLike>
      | undefined;

  return (parts ?? [])
    .map((part) => {
      if (typeof part.text === "string") {
        return part.text;
      }
      return "";
    })
    .join("");
}

function normalizeGoogleRole(role: unknown): Message["role"] {
  if (role === "model") {
    return "assistant";
  }
  if (role === "user") {
    return "user";
  }
  return "user";
}

function detectGoogleProvider(client: object): string {
  const name = client?.constructor?.name?.toLowerCase() ?? "";
  if (name.includes("google") || name.includes("gemini")) {
    return "google";
  }
  return "google";
}

function isGoogleStreamResult(
  value: unknown
): value is { stream: AsyncIterable<unknown>; response: Promise<unknown> } {
  return (
    typeof value === "object" &&
    value !== null &&
    "stream" in value &&
    isAsyncIterable((value as RecordLike).stream) &&
    "response" in value &&
    typeof (value as RecordLike).response === "object"
  );
}

function isAsyncIterable(value: unknown): value is AsyncIterable<unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    Symbol.asyncIterator in value &&
    typeof (value as Record<PropertyKey, unknown>)[Symbol.asyncIterator] ===
      "function"
  );
}
