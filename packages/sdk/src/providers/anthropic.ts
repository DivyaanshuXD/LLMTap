import type { SpanInput, Message, ToolCall, WrapOptions } from "@llmtap/shared";
import { calculateCost } from "@llmtap/shared";
import { generateSpanId, generateTraceId } from "../ids.js";
import { getTraceContext, withParentSpanContext } from "../trace.js";
import { sendSpan } from "../transport.js";
import { getGlobalConfig } from "../config.js";

type RecordLike = Record<string, unknown>;

interface AnthropicContext {
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

interface AnthropicStreamState {
  responseModel: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  textParts: string[];
  toolCalls: Map<string, ToolCall>;
}

/**
 * Create a Proxy wrapper for an Anthropic client instance.
 * Intercepts messages.create() calls.
 */
export function wrapAnthropic<T extends object>(
  client: T,
  options?: WrapOptions
): T {
  return new Proxy(client, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);

      // Intercept client.messages
      if (prop === "messages" && typeof value === "object" && value !== null) {
        return new Proxy(value, {
          get(msgTarget, msgProp, msgReceiver) {
            const msgValue = Reflect.get(msgTarget, msgProp, msgReceiver);

            // Intercept client.messages.create()
            if (msgProp === "create" && typeof msgValue === "function") {
              return createAnthropicInterceptor(
                msgValue.bind(msgTarget),
                options
              );
            }

            if (msgProp === "stream" && typeof msgValue === "function") {
              return createAnthropicStreamInterceptor(
                msgValue.bind(msgTarget),
                options
              );
            }

            return msgValue;
          },
        });
      }

      return value;
    },
  });
}

function createAnthropicInterceptor(
  original: (...args: unknown[]) => unknown,
  options?: WrapOptions
) {
  return async function interceptedCreate(
    ...args: unknown[]
  ): Promise<unknown> {
    const config = getGlobalConfig();
    if (!config.enabled) return original(...args);

    const params = (args[0] ?? {}) as RecordLike;
    const context = createAnthropicContext(params, options);

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
      if (isStreamRequest(params)) {
        return instrumentAnthropicStreamResult(result, context);
      }

      emitAnthropicSuccessSpan(context, result as RecordLike);
      return result;
    } catch (err: unknown) {
      emitAnthropicErrorSpan(context, err);
      throw err;
    }
  };
}

function createAnthropicStreamInterceptor(
  original: (...args: unknown[]) => unknown,
  options?: WrapOptions
) {
  return async function interceptedStream(
    ...args: unknown[]
  ): Promise<unknown> {
    const config = getGlobalConfig();
    if (!config.enabled) return original(...args);

    const params = (args[0] ?? {}) as RecordLike;
    const context = createAnthropicContext(params, options);

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
      return instrumentAnthropicStreamResult(result, context);
    } catch (err: unknown) {
      emitAnthropicErrorSpan(context, err);
      throw err;
    }
  };
}

function createAnthropicContext(
  params: RecordLike,
  options?: WrapOptions
): AnthropicContext {
  const traceCtx = getTraceContext();

  return {
    spanId: generateSpanId(),
    traceId: traceCtx?.traceId ?? generateTraceId(),
    providerName: options?.provider ?? "anthropic",
    model: (params.model as string) ?? "unknown",
    startTime: Date.now(),
    inputMessages: buildAnthropicInputMessages(params),
    traceCtx,
    params,
    optionsTags: options?.tags,
  };
}

function buildAnthropicInputMessages(
  params: RecordLike
): Message[] | undefined {
  const config = getGlobalConfig();
  if (!config.captureContent) {
    return undefined;
  }

  const messages: Message[] = [];
  if (typeof params.system === "string") {
    messages.push({ role: "system", content: params.system });
  }

  if (Array.isArray(params.messages)) {
    for (const message of params.messages as Array<RecordLike>) {
      messages.push({
        role: message.role as Message["role"],
        content:
          typeof message.content === "string"
            ? message.content
            : JSON.stringify(message.content),
      });
    }
  }

  return messages.length > 0 ? messages : undefined;
}

function emitAnthropicSuccessSpan(
  context: AnthropicContext,
  response: RecordLike
): void {
  const usage = response.usage as RecordLike | undefined;
  const inputTokens = (usage?.input_tokens as number | undefined) ?? 0;
  const outputTokens = (usage?.output_tokens as number | undefined) ?? 0;
  const totalTokens = inputTokens + outputTokens;
  const responseModel = (response.model as string | undefined) ?? context.model;

  let outputMessages: Message[] | undefined;
  let toolCalls: ToolCall[] | undefined;
  const config = getGlobalConfig();
  const content = response.content as Array<RecordLike> | undefined;
  if (content?.length && config.captureContent) {
    const textParts: string[] = [];
    const tools: ToolCall[] = [];

    for (const block of content) {
      if (block.type === "text") {
        textParts.push((block.text as string | undefined) ?? "");
      } else if (block.type === "tool_use") {
        tools.push({
          id: (block.id as string | undefined) ?? "unknown",
          name: (block.name as string | undefined) ?? "unknown",
          arguments: JSON.stringify(block.input ?? {}),
        });
      }
    }

    if (textParts.length) {
      outputMessages = [{ role: "assistant", content: textParts.join("\n") }];
    }
    if (tools.length) {
      toolCalls = tools;
    }
  }

  emitAnthropicSpan(context, {
    responseModel,
    inputTokens,
    outputTokens,
    totalTokens,
    outputMessages,
    toolCalls,
    status: "ok",
  });
}

function emitAnthropicErrorSpan(
  context: AnthropicContext,
  err: unknown
): void {
  const error = err as Error;

  emitAnthropicSpan(context, {
    responseModel: context.model,
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
    status: "error",
    errorType: error?.constructor?.name ?? "Error",
    errorMessage: error?.message ?? String(err),
  });
}

function emitAnthropicSpan(
  context: AnthropicContext,
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
    maxTokens: context.params.max_tokens as number | undefined,
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

function instrumentAnthropicStreamResult(
  result: unknown,
  context: AnthropicContext
): unknown {
  if (hasOnMethod(result)) {
    return createAnthropicMessageStreamProxy(result as RecordLike, context);
  }

  if (isAsyncIterable(result)) {
    return createAnthropicEventStreamProxy(result, context);
  }

  return result;
}

function createAnthropicEventStreamProxy(
  stream: AsyncIterable<unknown>,
  context: AnthropicContext
): unknown {
  const state = createAnthropicStreamState(context.model);
  let finalized = false;

  const finalizeSuccess = () => {
    if (finalized) {
      return;
    }
    finalized = true;
    emitAnthropicStreamSpan(context, state, "ok");
  };

  const finalizeError = (err: unknown) => {
    if (finalized) {
      return;
    }
    finalized = true;
    emitAnthropicStreamSpan(context, state, "error", err);
  };

  return new Proxy(stream as object, {
    get(target, prop, receiver) {
      if (prop === Symbol.asyncIterator) {
        return () =>
          createInstrumentedAsyncIterator(
            (target as AsyncIterable<unknown>)[Symbol.asyncIterator](),
            (event) => consumeAnthropicStreamEvent(state, event),
            finalizeSuccess,
            finalizeError
          );
      }

      const value = Reflect.get(target, prop, receiver);
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
}

function createAnthropicMessageStreamProxy(
  stream: RecordLike,
  context: AnthropicContext
): unknown {
  const state = createAnthropicStreamState(context.model);
  let finalized = false;

  const finalizeSuccess = () => {
    if (finalized) {
      return;
    }
    finalized = true;
    emitAnthropicStreamSpan(context, state, "ok");
  };

  const finalizeError = (err: unknown) => {
    if (finalized) {
      return;
    }
    finalized = true;
    emitAnthropicStreamSpan(context, state, "error", err);
  };

  attachAnthropicStreamListeners(stream, state, finalizeSuccess, finalizeError);

  return new Proxy(stream as object, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
}

function createAnthropicStreamState(model: string): AnthropicStreamState {
  return {
    responseModel: model,
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
    textParts: [],
    toolCalls: new Map(),
  };
}

function attachAnthropicStreamListeners(
  stream: RecordLike,
  state: AnthropicStreamState,
  onComplete: () => void,
  onError: (err: unknown) => void
): void {
  const on = stream.on as
    | ((event: string, listener: (...args: unknown[]) => void) => unknown)
    | undefined;
  if (!on) {
    return;
  }

  on.call(stream, "streamEvent", (event: unknown) => {
    consumeAnthropicStreamEvent(state, event);
  });
  on.call(stream, "message", (message: unknown) => {
    consumeAnthropicFinalMessage(state, message);
  });
  on.call(stream, "error", (err: unknown) => {
    onError(err);
  });
  on.call(stream, "abort", () => {
    onComplete();
  });
  const finalMessage = stream.finalMessage as (() => Promise<unknown>) | undefined;
  if (typeof finalMessage === "function") {
    void Promise.resolve(finalMessage.call(stream))
      .then((message) => {
        consumeAnthropicFinalMessage(state, message);
        onComplete();
      })
      .catch((err) => {
        onError(err);
      });
    return;
  }

  on.call(stream, "end", () => {
    onComplete();
  });
}

function consumeAnthropicStreamEvent(
  state: AnthropicStreamState,
  eventValue: unknown
): void {
  const event = eventValue as RecordLike;
  const type = event.type as string | undefined;

  if (type === "message_start") {
    consumeAnthropicFinalMessage(state, event.message);
    return;
  }

  if (type === "message_delta") {
    const usage = (event.usage as RecordLike | undefined) ??
      (event.delta as RecordLike | undefined)?.usage;
    if (usage) {
      state.outputTokens =
        (usage.output_tokens as number | undefined) ?? state.outputTokens;
      state.totalTokens = state.inputTokens + state.outputTokens;
    }
    return;
  }

  if (type === "content_block_start") {
    const block = event.content_block as RecordLike | undefined;
    const index = (event.index as number | undefined) ?? state.toolCalls.size;
    if (block?.type === "text" && typeof block.text === "string") {
      state.textParts.push(block.text);
    }
    if (block?.type === "tool_use") {
      const id = (block.id as string | undefined) ?? String(index);
      state.toolCalls.set(id, {
        id,
        name: (block.name as string | undefined) ?? "unknown",
        arguments: "",
        _blockIndex: index,
      });
    }
    return;
  }

  if (type === "content_block_delta") {
    const delta = event.delta as RecordLike | undefined;
    const blockIndex = (event.index as number | undefined) ?? 0;
    if (delta?.type === "text_delta" && typeof delta.text === "string") {
      state.textParts.push(delta.text);
    }
    if (
      delta?.type === "input_json_delta" &&
      typeof delta.partial_json === "string"
    ) {
      // Find tool call by its content block index, not array position
      const toolCall = Array.from(state.toolCalls.values()).find(
        (tc) => (tc as RecordLike)._blockIndex === blockIndex
      );
      if (toolCall) {
        state.toolCalls.set(toolCall.id, {
          ...toolCall,
          arguments: `${toolCall.arguments}${delta.partial_json}`,
        });
      }
    }
  }
}

function consumeAnthropicFinalMessage(
  state: AnthropicStreamState,
  messageValue: unknown
): void {
  const message = messageValue as RecordLike | undefined;
  if (!message) {
    return;
  }

  state.responseModel =
    (message.model as string | undefined) ?? state.responseModel;
  const usage = message.usage as RecordLike | undefined;
  state.inputTokens =
    (usage?.input_tokens as number | undefined) ?? state.inputTokens;
  state.outputTokens =
    (usage?.output_tokens as number | undefined) ?? state.outputTokens;
  state.totalTokens =
    (usage?.input_tokens as number | undefined) != null ||
    (usage?.output_tokens as number | undefined) != null
      ? state.inputTokens + state.outputTokens
      : state.totalTokens;

  const content = message.content as Array<RecordLike> | undefined;
  if (state.textParts.length === 0 && state.toolCalls.size === 0) {
    for (const block of content ?? []) {
      if (block.type === "text" && typeof block.text === "string") {
        state.textParts.push(block.text);
      }
      if (block.type === "tool_use") {
        const id =
          (block.id as string | undefined) ?? String(state.toolCalls.size);
        state.toolCalls.set(id, {
          id,
          name: (block.name as string | undefined) ?? "unknown",
          arguments: JSON.stringify(block.input ?? {}),
        });
      }
    }
  }
}

function emitAnthropicStreamSpan(
  context: AnthropicContext,
  state: AnthropicStreamState,
  status: "ok" | "error",
  err?: unknown
): void {
  const error = err as Error | undefined;
  emitAnthropicSpan(context, {
    responseModel: state.responseModel,
    inputTokens: state.inputTokens,
    outputTokens: state.outputTokens,
    totalTokens: state.totalTokens || state.inputTokens + state.outputTokens,
    outputMessages:
      getGlobalConfig().captureContent && state.textParts.length > 0
        ? [{ role: "assistant", content: state.textParts.join("") }]
        : undefined,
    toolCalls:
      state.toolCalls.size > 0 ? Array.from(state.toolCalls.values()) : undefined,
    status,
    errorType: error?.constructor?.name,
    errorMessage: error?.message,
  });
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

function hasOnMethod(value: unknown): value is RecordLike & { on: Function } {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as RecordLike).on === "function"
  );
}
