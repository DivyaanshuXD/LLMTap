import type { Message, ToolCall, WrapOptions } from "@llmtap/shared";
import {
  createSpanContext,
  emitSuccessSpan,
  emitErrorSpan,
  isTracingEnabled,
  shouldCaptureContent,
} from "./base.js";

type RecordLike = Record<string, unknown>;

/**
 * Wrap a Vercel AI SDK module or object to trace generateText / streamText /
 * generateObject / streamObject calls.
 *
 * Usage:
 *   import * as ai from "ai";
 *   import { wrapVercelAI } from "@llmtap/sdk";
 *   const traced = wrapVercelAI(ai);
 *   const result = await traced.generateText({ model: openai("gpt-4o"), prompt: "Hello" });
 *
 * The wrapper intercepts the four main Vercel AI SDK functions and emits spans
 * with token usage, cost, duration, and captured content.
 */
export function wrapVercelAI<T extends object>(
  aiModule: T,
  options?: WrapOptions
): T {
  return new Proxy(aiModule, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);

      if (prop === "generateText" && typeof value === "function") {
        return createGenerateTextInterceptor(value.bind(target), options);
      }

      if (prop === "streamText" && typeof value === "function") {
        return createStreamTextInterceptor(value.bind(target), options);
      }

      if (prop === "generateObject" && typeof value === "function") {
        return createGenerateObjectInterceptor(value.bind(target), options);
      }

      if (prop === "streamObject" && typeof value === "function") {
        return createStreamObjectInterceptor(value.bind(target), options);
      }

      return value;
    },
  });
}

function resolveProviderAndModel(params: RecordLike): {
  provider: string;
  model: string;
} {
  const modelObj = params.model as RecordLike | string | undefined;
  if (typeof modelObj === "string") {
    return { provider: "unknown", model: modelObj };
  }

  if (modelObj && typeof modelObj === "object") {
    const modelId =
      (modelObj.modelId as string) ??
      (modelObj.id as string) ??
      "unknown";
    const providerId =
      (modelObj.provider as string) ??
      (modelObj.providerId as string) ??
      extractProviderFromModelId(modelId);
    return { provider: providerId, model: modelId };
  }

  return { provider: "unknown", model: "unknown" };
}

function extractProviderFromModelId(modelId: string): string {
  if (modelId.includes("gpt") || modelId.includes("o1") || modelId.includes("o3") || modelId.includes("o4")) return "openai";
  if (modelId.includes("claude")) return "anthropic";
  if (modelId.includes("gemini")) return "google";
  if (modelId.includes("deepseek")) return "deepseek";
  if (modelId.includes("grok")) return "xai";
  if (modelId.includes("llama") || modelId.includes("mixtral")) return "groq";
  return "unknown";
}

function extractInputMessages(params: RecordLike): Message[] | undefined {
  if (!shouldCaptureContent()) return undefined;

  const messages: Message[] = [];

  if (typeof params.system === "string") {
    messages.push({ role: "system", content: params.system });
  }

  if (typeof params.prompt === "string") {
    messages.push({ role: "user", content: params.prompt });
  }

  if (Array.isArray(params.messages)) {
    for (const msg of params.messages as RecordLike[]) {
      messages.push({
        role: (msg.role as Message["role"]) ?? "user",
        content: typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content),
      });
    }
  }

  return messages.length > 0 ? messages : undefined;
}

function createGenerateTextInterceptor(
  original: (...args: unknown[]) => unknown,
  options?: WrapOptions
) {
  return async function interceptedGenerateText(
    ...args: unknown[]
  ): Promise<unknown> {
    if (!isTracingEnabled()) return original(...args);

    const params = (args[0] ?? {}) as RecordLike;
    const { provider, model } = resolveProviderAndModel(params);
    const resolvedProvider = options?.provider ?? provider;

    const context = createSpanContext(
      params,
      resolvedProvider,
      "chat",
      model,
      options
    );
    context.inputMessages = extractInputMessages(params);

    try {
      const result = (await original(...args)) as RecordLike;

      const usage = result.usage as RecordLike | undefined;
      const outputMessages: Message[] | undefined = shouldCaptureContent()
        ? [{ role: "assistant" as const, content: (result.text as string) ?? null }]
        : undefined;

      const toolCalls = extractVercelToolCalls(result);

      emitSuccessSpan(context, {
        responseModel: (result.responseModel as string) ?? model,
        inputTokens: (usage?.promptTokens as number) ?? 0,
        outputTokens: (usage?.completionTokens as number) ?? 0,
        totalTokens: (usage?.totalTokens as number) ?? 0,
        outputMessages,
        toolCalls,
      });

      return result;
    } catch (err) {
      emitErrorSpan(context, err);
      throw err;
    }
  };
}

function createStreamTextInterceptor(
  original: (...args: unknown[]) => unknown,
  options?: WrapOptions
) {
  return async function interceptedStreamText(
    ...args: unknown[]
  ): Promise<unknown> {
    if (!isTracingEnabled()) return original(...args);

    const params = (args[0] ?? {}) as RecordLike;
    const { provider, model } = resolveProviderAndModel(params);
    const resolvedProvider = options?.provider ?? provider;

    const context = createSpanContext(
      params,
      resolvedProvider,
      "chat",
      model,
      options
    );
    context.inputMessages = extractInputMessages(params);

    try {
      const result = (await original(...args)) as RecordLike;

      // The Vercel AI SDK streamText result has a `.usage` promise that
      // resolves when the stream fully completes.
      if (result.usage && typeof (result.usage as Promise<unknown>).then === "function") {
        (result.usage as Promise<RecordLike>).then((usage) => {
          const textPromise = result.text as Promise<string> | string | undefined;
          const resolveText = typeof textPromise === "string" ? textPromise : undefined;

          const outputMessages: Message[] | undefined = shouldCaptureContent() && resolveText
            ? [{ role: "assistant", content: resolveText }]
            : undefined;

          emitSuccessSpan(context, {
            responseModel: model,
            inputTokens: (usage?.promptTokens as number) ?? 0,
            outputTokens: (usage?.completionTokens as number) ?? 0,
            totalTokens: (usage?.totalTokens as number) ?? 0,
            outputMessages,
          });
        }).catch((err: unknown) => {
          emitErrorSpan(context, err);
        });
      }

      return result;
    } catch (err) {
      emitErrorSpan(context, err);
      throw err;
    }
  };
}

function createGenerateObjectInterceptor(
  original: (...args: unknown[]) => unknown,
  options?: WrapOptions
) {
  return async function interceptedGenerateObject(
    ...args: unknown[]
  ): Promise<unknown> {
    if (!isTracingEnabled()) return original(...args);

    const params = (args[0] ?? {}) as RecordLike;
    const { provider, model } = resolveProviderAndModel(params);
    const resolvedProvider = options?.provider ?? provider;

    const context = createSpanContext(
      params,
      resolvedProvider,
      "structured_output",
      model,
      options
    );
    context.inputMessages = extractInputMessages(params);

    try {
      const result = (await original(...args)) as RecordLike;

      const usage = result.usage as RecordLike | undefined;
      const outputMessages: Message[] | undefined = shouldCaptureContent()
        ? [{ role: "assistant", content: JSON.stringify(result.object ?? null) }]
        : undefined;

      emitSuccessSpan(context, {
        responseModel: model,
        inputTokens: (usage?.promptTokens as number) ?? 0,
        outputTokens: (usage?.completionTokens as number) ?? 0,
        totalTokens: (usage?.totalTokens as number) ?? 0,
        outputMessages,
      });

      return result;
    } catch (err) {
      emitErrorSpan(context, err);
      throw err;
    }
  };
}

function createStreamObjectInterceptor(
  original: (...args: unknown[]) => unknown,
  options?: WrapOptions
) {
  return async function interceptedStreamObject(
    ...args: unknown[]
  ): Promise<unknown> {
    if (!isTracingEnabled()) return original(...args);

    const params = (args[0] ?? {}) as RecordLike;
    const { provider, model } = resolveProviderAndModel(params);
    const resolvedProvider = options?.provider ?? provider;

    const context = createSpanContext(
      params,
      resolvedProvider,
      "structured_output",
      model,
      options
    );
    context.inputMessages = extractInputMessages(params);

    try {
      const result = (await original(...args)) as RecordLike;

      if (result.usage && typeof (result.usage as Promise<unknown>).then === "function") {
        (result.usage as Promise<RecordLike>).then((usage) => {
          emitSuccessSpan(context, {
            responseModel: model,
            inputTokens: (usage?.promptTokens as number) ?? 0,
            outputTokens: (usage?.completionTokens as number) ?? 0,
            totalTokens: (usage?.totalTokens as number) ?? 0,
          });
        }).catch((err: unknown) => {
          emitErrorSpan(context, err);
        });
      }

      return result;
    } catch (err) {
      emitErrorSpan(context, err);
      throw err;
    }
  };
}

function extractVercelToolCalls(result: RecordLike): ToolCall[] | undefined {
  const rawCalls = result.toolCalls as RecordLike[] | undefined;
  if (!rawCalls?.length || !shouldCaptureContent()) return undefined;

  return rawCalls.map((tc) => ({
    id: (tc.toolCallId as string) ?? "unknown",
    name: (tc.toolName as string) ?? "unknown",
    arguments: typeof tc.args === "string" ? tc.args : JSON.stringify(tc.args ?? {}),
  }));
}
