import type { LLMTapConfig } from "@llmtap/shared";

// Use a type without onError for the Required<> since onError is truly optional
type ResolvedConfig = Required<Omit<LLMTapConfig, "onError">> & Pick<LLMTapConfig, "onError">;

function readEnvConfig(): Partial<LLMTapConfig> {
  if (typeof process === "undefined" || !process.env) return {};

  const env: Partial<LLMTapConfig> = {};

  if (process.env.LLMTAP_COLLECTOR_URL) {
    env.collectorUrl = process.env.LLMTAP_COLLECTOR_URL;
  }
  if (process.env.LLMTAP_ENABLED !== undefined) {
    env.enabled = process.env.LLMTAP_ENABLED !== "false" && process.env.LLMTAP_ENABLED !== "0";
  }
  if (process.env.LLMTAP_CAPTURE_CONTENT !== undefined) {
    env.captureContent = process.env.LLMTAP_CAPTURE_CONTENT !== "false" && process.env.LLMTAP_CAPTURE_CONTENT !== "0";
  }
  if (process.env.LLMTAP_SESSION_ID) {
    env.sessionId = process.env.LLMTAP_SESSION_ID;
  }
  if (process.env.LLMTAP_DEBUG !== undefined) {
    env.debug = process.env.LLMTAP_DEBUG === "true" || process.env.LLMTAP_DEBUG === "1";
  }

  return env;
}

const envConfig = readEnvConfig();

const globalConfig: ResolvedConfig = {
  collectorUrl: envConfig.collectorUrl ?? "http://localhost:4781",
  captureContent: envConfig.captureContent ?? true,
  maxBufferSize: 1000,
  defaultTags: {},
  sessionId: envConfig.sessionId ?? "",
  enabled: envConfig.enabled ?? true,
  debug: envConfig.debug ?? false,
  onError: undefined,
};

/** Configure the LLMTap SDK globally */
export function configure(opts: LLMTapConfig): void {
  Object.assign(globalConfig, opts);
}

/** Get the current global config */
export function getGlobalConfig(): ResolvedConfig {
  return globalConfig;
}
