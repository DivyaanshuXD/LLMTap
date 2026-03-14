import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { getDb } from "../db.js";

const ReplaySchema = z.object({
  spanId: z.string().min(1).max(256),
  apiKey: z.string().min(1).max(512),
});

interface SpanRow {
  providerName: string;
  requestModel: string;
  inputMessages: string | null;
  temperature: number | null;
  maxTokens: number | null;
  topP: number | null;
}

export async function registerReplayRoute(
  app: FastifyInstance
): Promise<void> {
  app.post("/v1/replay", async (request, reply) => {
    const parsed = ReplaySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: "Validation failed",
        details: parsed.error.issues,
      });
    }
    const { spanId, apiKey } = parsed.data;

    const db = getDb();
    const span = db
      .prepare(
        `SELECT providerName, requestModel, inputMessages, temperature, maxTokens, topP
         FROM spans WHERE spanId = ?`
      )
      .get(spanId) as SpanRow | undefined;

    if (!span) {
      return reply.status(404).send({ error: "Span not found" });
    }

    if (!span.inputMessages) {
      return reply.status(400).send({
        error: "Span has no input messages to replay",
      });
    }

    let messages: unknown[];
    try {
      messages = JSON.parse(span.inputMessages);
    } catch {
      return reply.status(400).send({ error: "Failed to parse input messages" });
    }

    const startTime = Date.now();

    try {
      if (span.providerName === "anthropic") {
        const result = await replayAnthropic(
          apiKey,
          span.requestModel,
          messages,
          span.temperature,
          span.maxTokens
        );
        return reply.send({
          ...result,
          duration: Date.now() - startTime,
          provider: "anthropic",
          model: span.requestModel,
        });
      }

      // Default to OpenAI-compatible format
      const result = await replayOpenAI(
        apiKey,
        span.requestModel,
        messages,
        span.temperature,
        span.maxTokens,
        span.topP,
        span.providerName
      );
      return reply.send({
        ...result,
        duration: Date.now() - startTime,
        provider: span.providerName,
        model: span.requestModel,
      });
    } catch (err) {
      return reply.status(502).send({
        error: "Replay failed",
        message: err instanceof Error ? err.message : String(err),
        duration: Date.now() - startTime,
      });
    }
  });
}

async function replayOpenAI(
  apiKey: string,
  model: string,
  messages: unknown[],
  temperature: number | null,
  maxTokens: number | null,
  topP: number | null,
  provider: string
): Promise<{
  content: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  responseModel: string;
}> {
  const baseUrls: Record<string, string> = {
    openai: "https://api.openai.com/v1",
    deepseek: "https://api.deepseek.com/v1",
    groq: "https://api.groq.com/openai/v1",
    together: "https://api.together.xyz/v1",
    fireworks: "https://api.fireworks.ai/inference/v1",
    openrouter: "https://openrouter.ai/api/v1",
    xai: "https://api.x.ai/v1",
  };

  const baseUrl = baseUrls[provider] ?? baseUrls.openai;

  const reqBody: Record<string, unknown> = { model, messages };
  if (temperature !== null) reqBody.temperature = temperature;
  if (maxTokens !== null) reqBody.max_tokens = maxTokens;
  if (topP !== null) reqBody.top_p = topP;

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(reqBody),
    signal: AbortSignal.timeout(60_000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API returned HTTP ${res.status}: ${text.slice(0, 500)}`);
  }

  const data = (await res.json()) as {
    choices: { message: { content: string } }[];
    usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
    model: string;
  };

  const choice = data.choices?.[0];
  return {
    content: choice?.message?.content ?? "",
    inputTokens: data.usage?.prompt_tokens ?? 0,
    outputTokens: data.usage?.completion_tokens ?? 0,
    totalTokens: data.usage?.total_tokens ?? 0,
    responseModel: data.model ?? model,
  };
}

async function replayAnthropic(
  apiKey: string,
  model: string,
  rawMessages: unknown[],
  temperature: number | null,
  maxTokens: number | null
): Promise<{
  content: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  responseModel: string;
}> {
  // Anthropic requires system messages to be separate
  const messages = rawMessages as { role: string; content: unknown }[];
  const systemMsg = messages.find((m) => m.role === "system");
  const nonSystemMessages = messages.filter((m) => m.role !== "system");

  const reqBody: Record<string, unknown> = {
    model,
    messages: nonSystemMessages,
    max_tokens: maxTokens ?? 4096,
  };
  if (systemMsg) reqBody.system = systemMsg.content;
  if (temperature !== null) reqBody.temperature = temperature;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(reqBody),
    signal: AbortSignal.timeout(60_000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API returned HTTP ${res.status}: ${text.slice(0, 500)}`);
  }

  const data = (await res.json()) as {
    content: { type: string; text: string }[];
    usage: { input_tokens: number; output_tokens: number };
    model: string;
  };

  const textContent = data.content
    ?.filter((c) => c.type === "text")
    .map((c) => c.text)
    .join("") ?? "";

  const inputTokens = data.usage?.input_tokens ?? 0;
  const outputTokens = data.usage?.output_tokens ?? 0;

  return {
    content: textContent,
    inputTokens,
    outputTokens,
    totalTokens: inputTokens + outputTokens,
    responseModel: data.model ?? model,
  };
}
