type RecordLike = Record<string, unknown>;

const HOST_PROVIDER_MAP = [
  { match: "api.deepseek.com", provider: "deepseek" },
  { match: "api.groq.com", provider: "groq" },
  { match: "api.together.xyz", provider: "together" },
  { match: "api.fireworks.ai", provider: "fireworks" },
  { match: "openrouter.ai", provider: "openrouter" },
  { match: "api.x.ai", provider: "xai" },
] as const;

export function isOpenAICompatibleProviderName(provider: string): boolean {
  return [
    "openai",
    "deepseek",
    "groq",
    "together",
    "fireworks",
    "openrouter",
    "xai",
  ].includes(provider.toLowerCase());
}

export function detectOpenAICompatibleProvider(client: object): string {
  const baseUrl = getClientBaseUrl(client);
  if (!baseUrl) {
    return "openai";
  }

  try {
    const hostname = new URL(baseUrl).hostname.toLowerCase();
    const matched = HOST_PROVIDER_MAP.find(({ match }) => hostname.includes(match));
    return matched?.provider ?? "openai";
  } catch {
    return "openai";
  }
}

function getClientBaseUrl(client: object): string | undefined {
  const direct = findStringValue(client as RecordLike, [
    "baseURL",
    "baseUrl",
    "url",
  ]);
  if (direct) {
    return direct;
  }

  const nestedKeys = ["_options", "options", "_client", "client", "_opts"];
  for (const key of nestedKeys) {
    const candidate = (client as RecordLike)[key];
    if (typeof candidate === "object" && candidate !== null) {
      const value = findStringValue(candidate as RecordLike, [
        "baseURL",
        "baseUrl",
        "url",
      ]);
      if (value) {
        return value;
      }
    }
  }

  return undefined;
}

function findStringValue(
  record: RecordLike,
  keys: string[]
): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.length > 0) {
      return value;
    }
  }

  return undefined;
}
