import type { ModelPricing } from "./types.js";

// Runtime pricing overrides set by the user.
const pricingOverrides: ModelPricing[] = [];

/**
 * Set pricing for a single model. Overrides built-in pricing.
 */
export function setPricing(
  provider: string,
  model: string,
  inputCostPer1M: number,
  outputCostPer1M: number
): void {
  const existing = pricingOverrides.findIndex(
    (p) => p.provider === provider.toLowerCase() && p.model === model.toLowerCase()
  );
  const entry: ModelPricing = {
    provider: provider.toLowerCase(),
    model: model.toLowerCase(),
    inputCostPer1M,
    outputCostPer1M,
  };
  if (existing >= 0) {
    pricingOverrides[existing] = entry;
  } else {
    pricingOverrides.push(entry);
  }
}

/**
 * Set pricing for multiple models at once.
 */
export function setPricingBulk(entries: ModelPricing[]): void {
  for (const entry of entries) {
    setPricing(entry.provider, entry.model, entry.inputCostPer1M, entry.outputCostPer1M);
  }
}

/**
 * Load pricing from a remote JSON URL.
 * Expects an array of ModelPricing objects.
 * Pass a fetch-compatible function (globalThis.fetch or node-fetch).
 */
export async function loadPricingFromURL(
  url: string,
  fetchFn: (url: string) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>
): Promise<void> {
  const res = await fetchFn(url);
  if (!res.ok) throw new Error(`Failed to load pricing from ${url}: HTTP ${res.status}`);
  const data = (await res.json()) as ModelPricing[];
  setPricingBulk(data);
}

/**
 * Remove all runtime pricing overrides.
 */
export function clearPricingOverrides(): void {
  pricingOverrides.length = 0;
}

/**
 * Get all pricing entries (overrides merged on top of built-in).
 */
export function getAllPricing(): ModelPricing[] {
  const merged = new Map<string, ModelPricing>();
  for (const entry of MODEL_PRICING) {
    merged.set(`${entry.provider}::${entry.model}`, entry);
  }
  for (const entry of pricingOverrides) {
    merged.set(`${entry.provider}::${entry.model}`, entry);
  }
  return [...merged.values()];
}

/**
 * Pricing data for popular LLM models.
 * Costs are per 1 million tokens in USD.
 * Last updated: 2025-01
 */
export const MODEL_PRICING: ModelPricing[] = [
  // OpenAI
  { provider: "openai", model: "gpt-4o", inputCostPer1M: 2.5, outputCostPer1M: 10.0 },
  { provider: "openai", model: "gpt-4o-2024-11-20", inputCostPer1M: 2.5, outputCostPer1M: 10.0 },
  { provider: "openai", model: "gpt-4o-2024-08-06", inputCostPer1M: 2.5, outputCostPer1M: 10.0 },
  { provider: "openai", model: "gpt-4o-mini", inputCostPer1M: 0.15, outputCostPer1M: 0.6 },
  { provider: "openai", model: "gpt-4o-mini-2024-07-18", inputCostPer1M: 0.15, outputCostPer1M: 0.6 },
  { provider: "openai", model: "gpt-4-turbo", inputCostPer1M: 10.0, outputCostPer1M: 30.0 },
  { provider: "openai", model: "gpt-4", inputCostPer1M: 30.0, outputCostPer1M: 60.0 },
  { provider: "openai", model: "gpt-3.5-turbo", inputCostPer1M: 0.5, outputCostPer1M: 1.5 },
  { provider: "openai", model: "o1", inputCostPer1M: 15.0, outputCostPer1M: 60.0 },
  { provider: "openai", model: "o1-mini", inputCostPer1M: 3.0, outputCostPer1M: 12.0 },
  { provider: "openai", model: "o1-preview", inputCostPer1M: 15.0, outputCostPer1M: 60.0 },
  { provider: "openai", model: "o3-mini", inputCostPer1M: 1.1, outputCostPer1M: 4.4 },
  { provider: "openai", model: "o3", inputCostPer1M: 10.0, outputCostPer1M: 40.0 },
  { provider: "openai", model: "o4-mini", inputCostPer1M: 1.1, outputCostPer1M: 4.4 },

  // Anthropic
  { provider: "anthropic", model: "claude-sonnet-4-20250514", inputCostPer1M: 3.0, outputCostPer1M: 15.0 },
  { provider: "anthropic", model: "claude-3-5-sonnet-20241022", inputCostPer1M: 3.0, outputCostPer1M: 15.0 },
  { provider: "anthropic", model: "claude-3-5-sonnet-20240620", inputCostPer1M: 3.0, outputCostPer1M: 15.0 },
  { provider: "anthropic", model: "claude-3-5-haiku-20241022", inputCostPer1M: 0.8, outputCostPer1M: 4.0 },
  { provider: "anthropic", model: "claude-3-opus-20240229", inputCostPer1M: 15.0, outputCostPer1M: 75.0 },
  { provider: "anthropic", model: "claude-3-haiku-20240307", inputCostPer1M: 0.25, outputCostPer1M: 1.25 },
  { provider: "anthropic", model: "claude-opus-4", inputCostPer1M: 15.0, outputCostPer1M: 75.0 },
  { provider: "anthropic", model: "claude-sonnet-4", inputCostPer1M: 3.0, outputCostPer1M: 15.0 },

  // Google
  { provider: "google", model: "gemini-2.0-flash", inputCostPer1M: 0.1, outputCostPer1M: 0.4 },
  { provider: "google", model: "gemini-2.0-flash-lite", inputCostPer1M: 0.075, outputCostPer1M: 0.3 },
  { provider: "google", model: "gemini-1.5-pro", inputCostPer1M: 1.25, outputCostPer1M: 5.0 },
  { provider: "google", model: "gemini-1.5-flash", inputCostPer1M: 0.075, outputCostPer1M: 0.3 },
  { provider: "google", model: "gemini-2.5-pro", inputCostPer1M: 1.25, outputCostPer1M: 10.0 },
  { provider: "google", model: "gemini-2.5-flash", inputCostPer1M: 0.3, outputCostPer1M: 2.5 },

  // OpenAI-compatible providers
  { provider: "deepseek", model: "deepseek-chat", inputCostPer1M: 0.27, outputCostPer1M: 1.1 },
  { provider: "deepseek", model: "deepseek-v3", inputCostPer1M: 0.27, outputCostPer1M: 1.1 },
  { provider: "deepseek", model: "deepseek-reasoner", inputCostPer1M: 0.55, outputCostPer1M: 2.19 },
  { provider: "deepseek", model: "deepseek-r1", inputCostPer1M: 0.55, outputCostPer1M: 2.19 },
  { provider: "deepseek", model: "deepseek-coder-v2", inputCostPer1M: 0.14, outputCostPer1M: 0.28 },
  { provider: "groq", model: "llama-3.3-70b-versatile", inputCostPer1M: 0.59, outputCostPer1M: 0.79 },
  { provider: "groq", model: "llama-3.1-8b-instant", inputCostPer1M: 0.05, outputCostPer1M: 0.08 },
  { provider: "groq", model: "llama-3.1-70b-versatile", inputCostPer1M: 0.59, outputCostPer1M: 0.79 },
  { provider: "groq", model: "llama-3-8b-8192", inputCostPer1M: 0.05, outputCostPer1M: 0.08 },
  { provider: "groq", model: "llama-3-70b-8192", inputCostPer1M: 0.59, outputCostPer1M: 0.79 },
  { provider: "groq", model: "gemma2-9b-it", inputCostPer1M: 0.20, outputCostPer1M: 0.20 },
  { provider: "groq", model: "mixtral-8x7b-32768", inputCostPer1M: 0.24, outputCostPer1M: 0.24 },
  { provider: "xai", model: "grok-2", inputCostPer1M: 2.0, outputCostPer1M: 10.0 },
  { provider: "xai", model: "grok-3", inputCostPer1M: 3.0, outputCostPer1M: 15.0 },

  // Ollama / local models (free)
  { provider: "ollama", model: "llama3", inputCostPer1M: 0, outputCostPer1M: 0 },
  { provider: "ollama", model: "llama3.1", inputCostPer1M: 0, outputCostPer1M: 0 },
  { provider: "ollama", model: "mistral", inputCostPer1M: 0, outputCostPer1M: 0 },
  { provider: "ollama", model: "codellama", inputCostPer1M: 0, outputCostPer1M: 0 },
  { provider: "ollama", model: "deepseek-r1", inputCostPer1M: 0, outputCostPer1M: 0 },
];

/**
 * Look up pricing for a model. Returns null if model is not found.
 * Tries exact match first, then prefix match for versioned models.
 */
export function getModelPricing(
  provider: string,
  model: string
): ModelPricing | null {
  const normalized = model.toLowerCase();
  const providerNorm = provider.toLowerCase();

  // Check runtime overrides first (exact match only).
  const override = pricingOverrides.find(
    (p) => p.provider === providerNorm && p.model === normalized
  );
  if (override) return override;

  const providerPricing = MODEL_PRICING.filter(
    (pricing) => pricing.provider === providerNorm
  );

  // Exact match
  const exact = providerPricing.find((pricing) => pricing.model === normalized);
  if (exact) return exact;

  // Prefix match should prefer the most-specific model name first.
  const prefix = providerPricing
    .filter((pricing) => normalized.startsWith(pricing.model))
    .sort((left, right) => right.model.length - left.model.length)[0];
  if (prefix) return prefix;

  return null;
}

/**
 * Calculate cost for a given number of tokens
 */
export function calculateCost(
  provider: string,
  model: string,
  inputTokens: number,
  outputTokens: number
): { inputCost: number; outputCost: number; totalCost: number } {
  const pricing = getModelPricing(provider, model);
  if (!pricing) {
    return { inputCost: 0, outputCost: 0, totalCost: 0 };
  }

  const inputCost = (inputTokens / 1_000_000) * pricing.inputCostPer1M;
  const outputCost = (outputTokens / 1_000_000) * pricing.outputCostPer1M;

  return {
    inputCost,
    outputCost,
    totalCost: inputCost + outputCost,
  };
}
