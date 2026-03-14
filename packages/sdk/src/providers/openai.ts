import type { SpanInput, Message, ToolCall, WrapOptions } from "@llmtap/shared";
import { calculateCost } from "@llmtap/shared";
import { generateSpanId, generateTraceId } from "../ids.js";
import { getTraceContext, withParentSpanContext } from "../trace.js";
import { sendSpan } from "../transport.js";
import { getGlobalConfig } from "../config.js";
import { detectOpenAICompatibleProvider } from "./compat.js";

type RecordLike = Record<string, unknown>;

interface OpenAIContext {
  spanId: string;
  traceId: string;
  providerName: string;
  model: string;
  startTime: number;
  inputMessages?: Message[];
  traceCtx: ReturnType<typeof getTraceContext>;
  params: RecordLike;
  optionsTags?: Record<string, string>;
}

interface OpenAIStreamState {
  responseModel: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  textParts: string[];
  toolCalls: Map<string, ToolCall>;
}

/**
 * Create a Proxy wrapper for an OpenAI client instance.
 * Intercepts chat.completions.create() calls.
 */
export function wrapOpenAI<T extends object>(
  client: T,
  options?: WrapOptions
): T {
  const resolvedProvider =
    options?.provider && options.provider !== "openai"
      ? options.provider
      : detectOpenAICompatibleProvider(client);

  return new Proxy(client, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);

      // Intercept client.chat
      if (prop === "chat" && typeof value === "object" && value !== null) {
        return new Proxy(value, {
          get(chatTarget, chatProp, chatReceiver) {
            const chatValue = Reflect.get(chatTarget, chatProp, chatReceiver);

            // Intercept client.chat.completions
            if (
              chatProp === "completions" &&
              typeof chatValue === "object" &&
              chatValue !== null
            ) {
              return new Proxy(chatValue, {
                get(compTarget, compProp, compReceiver) {
                  const compValue = Reflect.get(
                    compTarget,
                    compProp,
                    compReceiver
                  );

                  // Intercept client.chat.completions.create()
                  if (compProp === "create" && typeof compValue === "function") {
                    return createOpenAIChatInterceptor(
                      compValue.bind(compTarget),
                      resolvedProvider,
                      options
                    );
                  }

                  return compValue;
                },
              });
            }

            return chatValue;
          },
        });
      }

      return value;
    },
  });
}

function createOpenAIChatInterceptor(
  original: (...args: unknown[]) => unknown,
  providerName: string,
  options?: WrapOptions
) {
  return async function interceptedCreate(
    ...args: unknown[]
  ): Promise<unknown> {
    const config = getGlobalConfig();
    if (!config.enabled) return original(...args);

    const params = (args[0] ?? {}) as Record<string, unknown>;

    // Auto-inject stream_options.include_usage so we get token counts
    if (isStreamRequest(params) && !params.stream_options) {
      params.stream_options = { include_usage: true };
    } else if (
      isStreamRequest(params) &&
      params.stream_options &&
      typeof params.stream_options === "object" &&
      !(params.stream_options as RecordLike).include_usage
    ) {
      (params.stream_options as RecordLike).include_usage = true;
    }

    const context = createOpenAIContext(params, providerName, options);

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
      if (isStreamRequest(params) && isAsyncIterable(result)) {
        return createOpenAIStreamProxy(result, context);
      }

      emitOpenAISuccessSpan(context, result as RecordLike);
      return result;
    } catch (err: unknown) {
      emitOpenAIErrorSpan(context, err);
      throw err;
    }
  };
}

function createOpenAIContext(
  params: RecordLike,
  providerName: string,
  options?: WrapOptions
): OpenAIContext {
  const traceCtx = getTraceContext();

  return {
    spanId: generateSpanId(),
    traceId: traceCtx?.traceId ?? generateTraceId(),
    providerName,
    model: (params.model as string) ?? "unknown",
    startTime: Date.now(),
    inputMessages: buildOpenAIInputMessages(params),
    traceCtx,
    params,
    optionsTags: options?.tags,
  };
}

function buildOpenAIInputMessages(params: RecordLike): Message[] | undefined {
  const config = getGlobalConfig();
  if (!config.captureContent || !Array.isArray(params.messages)) {
    return undefined;
  }

  return (params.messages as Array<RecordLike>).map((message) => ({
    role: message.role as Message["role"],
    content:
      typeof message.content === "string"
        ? message.content
        : JSON.stringify(message.content),
    name: message.name as string | undefined,
  }));
}

function emitOpenAISuccessSpan(
  context: OpenAIContext,
  response: RecordLike
): void {
  const usage = response.usage as RecordLike | undefined;
  const inputTokens = (usage?.prompt_tokens as number | undefined) ?? 0;
  const outputTokens = (usage?.completion_tokens as number | undefined) ?? 0;
  const totalTokens =
    (usage?.total_tokens as number | undefined) ?? inputTokens + outputTokens;
  const responseModel = (response.model as string | undefined) ?? context.model;

  let outputMessages: Message[] | undefined;
  let toolCalls: ToolCall[] | undefined;
  const config = getGlobalConfig();
  const choices = response.choices as Array<RecordLike> | undefined;
  if (choices?.length && config.captureContent) {
    const message = choices[0]?.message as RecordLike | undefined;
    if (message) {
      outputMessages = [
        {
          role: "assistant",
          content: (message.content as string | null | undefined) ?? null,
        },
      ];

      const rawToolCalls = message.tool_calls as Array<RecordLike> | undefined;
      if (rawToolCalls?.length) {
        toolCalls = rawToolCalls.map((toolCall) => {
          const fn = toolCall.function as RecordLike | undefined;
          return {
            id: (toolCall.id as string | undefined) ?? "unknown",
            name: (fn?.name as string | undefined) ?? "unknown",
            arguments: (fn?.arguments as string | undefined) ?? "{}",
          };
        });
      }
    }
  }

  emitOpenAISpan(context, {
    responseModel,
    inputTokens,
    outputTokens,
    totalTokens,
    outputMessages,
    toolCalls,
    status: "ok",
  });
}

function emitOpenAIErrorSpan(context: OpenAIContext, err: unknown): void {
  const error = err as Error;

  emitOpenAISpan(context, {
    responseModel: context.model,
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
    status: "error",
    errorType: error?.constructor?.name ?? "Error",
    errorMessage: error?.message ?? String(err),
  });
}

function emitOpenAISpan(
  context: OpenAIContext,
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
    name: `chat ${data.responseModel}`,
    operationName: "chat",
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
    temperature: context.params.temperature as number | undefined,
    maxTokens: (context.params.max_tokens ??
      context.params.max_completion_tokens) as number | undefined,
    topP: context.params.top_p as number | undefined,
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

function createOpenAIStreamProxy(
  stream: unknown,
  context: OpenAIContext
): unknown {
  const state: OpenAIStreamState = {
    responseModel: context.model,
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
    textParts: [],
    toolCalls: new Map(),
  };

  let finalized = false;

  const finalizeSuccess = () => {
    if (finalized) {
      return;
    }
    finalized = true;

    emitOpenAISpan(context, {
      responseModel: state.responseModel,
      inputTokens: state.inputTokens,
      outputTokens: state.outputTokens,
      totalTokens: state.totalTokens || state.inputTokens + state.outputTokens,
      outputMessages: buildOpenAIStreamOutputMessages(state),
      toolCalls: buildOpenAIStreamToolCalls(state),
      status: "ok",
    });
  };

  const finalizeError = (err: unknown) => {
    if (finalized) {
      return;
    }
    finalized = true;

    const error = err as Error;
    emitOpenAISpan(context, {
      responseModel: state.responseModel,
      inputTokens: state.inputTokens,
      outputTokens: state.outputTokens,
      totalTokens: state.totalTokens || state.inputTokens + state.outputTokens,
      outputMessages: buildOpenAIStreamOutputMessages(state),
      toolCalls: buildOpenAIStreamToolCalls(state),
      status: "error",
      errorType: error?.constructor?.name ?? "Error",
      errorMessage: error?.message ?? String(err),
    });
  };

  return new Proxy(stream as object, {
    get(target, prop, receiver) {
      if (prop === Symbol.asyncIterator) {
        return () =>
          createInstrumentedAsyncIterator(
            (target as AsyncIterable<unknown>)[Symbol.asyncIterator](),
            (chunk) => consumeOpenAIChunk(state, chunk),
            finalizeSuccess,
            finalizeError
          );
      }

      const value = Reflect.get(target, prop, receiver);
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
}

function consumeOpenAIChunk(
  state: OpenAIStreamState,
  chunkValue: unknown
): void {
  const chunk = chunkValue as RecordLike;
  state.responseModel = (chunk.model as string | undefined) ?? state.responseModel;

  const usage = chunk.usage as RecordLike | undefined;
  if (usage) {
    state.inputTokens = (usage.prompt_tokens as number | undefined) ?? state.inputTokens;
    state.outputTokens =
      (usage.completion_tokens as number | undefined) ?? state.outputTokens;
    state.totalTokens =
      (usage.total_tokens as number | undefined) ??
      state.inputTokens + state.outputTokens;
  }

  const choices = chunk.choices as Array<RecordLike> | undefined;
  for (const choice of choices ?? []) {
    if (((choice.index as number | undefined) ?? 0) !== 0) {
      continue;
    }

    const delta = choice.delta as RecordLike | undefined;
    const content = delta?.content;
    if (typeof content === "string") {
      state.textParts.push(content);
    } else if (content != null) {
      state.textParts.push(JSON.stringify(content));
    }

    const rawToolCalls = delta?.tool_calls as Array<RecordLike> | undefined;
    for (const rawToolCall of rawToolCalls ?? []) {
      const id =
        (rawToolCall.id as string | undefined) ??
        String((rawToolCall.index as number | undefined) ?? state.toolCalls.size);
      const existing = state.toolCalls.get(id) ?? {
        id,
        name: "unknown",
        arguments: "",
      };
      const fn = rawToolCall.function as RecordLike | undefined;

      state.toolCalls.set(id, {
        id,
        name: (fn?.name as string | undefined) ?? existing.name,
        arguments: `${existing.arguments}${(fn?.arguments as string | undefined) ?? ""}`,
      });
    }
  }
}

function buildOpenAIStreamOutputMessages(
  state: OpenAIStreamState
): Message[] | undefined {
  const config = getGlobalConfig();
  if (!config.captureContent || state.textParts.length === 0) {
    return undefined;
  }

  return [
    {
      role: "assistant",
      content: state.textParts.join(""),
    },
  ];
}

function buildOpenAIStreamToolCalls(
  state: OpenAIStreamState
): ToolCall[] | undefined {
  if (state.toolCalls.size === 0) {
    return undefined;
  }

  return Array.from(state.toolCalls.values());
}

function createInstrumentedAsyncIterator<T>(
  iterator: AsyncIterator<T>,
  onValue: (value: T) => void,
  onComplete: () => void,
  onError: (err: unknown) => void
): AsyncIterableIterator<T> {
  return {
    async next(value?: unknown) {
      try {
        const result = await iterator.next(value as never);
        if (result.done) {
          onComplete();
        } else {
          onValue(result.value);
        }
        return result;
      } catch (err) {
        onError(err);
        throw err;
      }
    },
    async return(value?: unknown) {
      try {
        const result = iterator.return
          ? await iterator.return(value as never)
          : ({ done: true, value } as IteratorResult<T>);
        onComplete();
        return result;
      } catch (err) {
        onError(err);
        throw err;
      }
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
}

function isStreamRequest(params: RecordLike): boolean {
  return params.stream === true;
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
