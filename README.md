<p align="center">
  <h1 align="center">LLMTap</h1>
</p>

<h3 align="center">DevTools for AI Agents</h3>

<p align="center">
  See every LLM call. Trace agent workflows. Track costs.<br/>
  Local-first. Zero-config. Two lines of code.
</p>

<p align="center">
  <a href="#quick-start">Quick Start</a> &middot;
  <a href="#features">Features</a> &middot;
  <a href="#supported-providers">Providers</a> &middot;
  <a href="#api-reference">API</a> &middot;
  <a href="#architecture">Architecture</a>
</p>

---

Most LLM observability tools start by asking you to change infrastructure. LLMTap starts by showing you what your app is already doing.

Run one local command, wrap your LLM client once, and every call starts showing up in a live dashboard with traces, token counts, latency, and spend. No sign-ups. No proxy. No platform account required.

If your app can already talk to OpenAI, Anthropic, Gemini, or an OpenAI-compatible provider, LLMTap is meant to be the fastest way to see what is actually happening.

<!-- hero-screenshot -->

---

## Related Docs

- `PROJECT_STRUCTURE.md` — monorepo and package-level structure
- `UI_FILES.md` — dashboard UI file inventory and ownership map
- `UI_PLAN.md` — UI roadmap and implementation status

## Quick Start

You should be able to go from zero to the first visible trace in under a minute.

**1. Start LLMTap locally**

```bash
npx llmtap
```

This starts the local collector on `http://localhost:4781` and opens the dashboard.

**2. Wrap the client your app already uses**

```typescript
import OpenAI from "openai";
import { wrap } from "@llmtap/sdk";

const client = wrap(new OpenAI());
```

**3. Make one normal model call**

```typescript
await client.chat.completions.create({
  model: "gpt-4o",
  messages: [{ role: "user", content: "Hello, world" }],
});
```

**4. Confirm the result**

Open `http://localhost:4781` and you should see:

- a new trace in the queue
- token and cost metrics update
- the full request/response visible in trace detail

That is the entire basic loop.

---

## Features

**Transparent instrumentation** -- `wrap()` returns an ES Proxy. Your client behaves identically. No code changes beyond the wrap call. Streaming, tool calls, and multi-turn conversations all work.

**Real-time dashboard** -- Traces stream to the browser via SSE. See every LLM call as it happens with token counts, costs, latency, and full message content.

<!-- dashboard-screenshot -->

**Cost tracking** -- Built-in pricing for 50+ models across all major providers. Input and output costs calculated per-call. Override pricing for custom or fine-tuned models at runtime.

**Trace grouping** -- Group multiple LLM calls into a single trace with `startTrace()`. See total cost and token usage for multi-step agent pipelines.

```typescript
import { wrap, startTrace } from "@llmtap/sdk";

await startTrace("research-agent", async () => {
  const plan  = await client.chat.completions.create({ model: "gpt-4o", messages: [...] });
  const draft = await client.chat.completions.create({ model: "gpt-4o-mini", messages: [...] });
});
// Both calls grouped under "research-agent" in the dashboard
```

**Streaming support** -- Full support for streaming responses across all providers. Token counts and costs are captured after the stream completes. Your application sees the exact same stream.

**OpenTelemetry export** -- Export traces in OTLP format following GenAI Semantic Conventions. Forward to Datadog, Grafana, Jaeger, or any OTLP-compatible backend.

```bash
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318 npx llmtap
```

**Privacy by default** -- Everything runs locally. No data is sent anywhere unless you explicitly configure OTLP forwarding. Content capture can be disabled entirely.

---

## Supported Providers

LLMTap works with any provider that uses the OpenAI, Anthropic, or Google Gemini SDK format.

| Provider | SDK | Detection |
|----------|-----|-----------|
| **OpenAI** | `openai` | Automatic |
| **Anthropic** | `@anthropic-ai/sdk` | Automatic |
| **Google Gemini** | `@google/generative-ai` | Automatic |
| **DeepSeek** | `openai` (compatible) | Auto via base URL |
| **Groq** | `openai` (compatible) | Auto via base URL |
| **Together** | `openai` (compatible) | Auto via base URL |
| **Fireworks** | `openai` (compatible) | Auto via base URL |
| **OpenRouter** | `openai` (compatible) | Auto via base URL |
| **xAI (Grok)** | `openai` (compatible) | Auto via base URL |
| **Ollama** | `openai` (compatible) | Auto via base URL |
| **Vercel AI SDK** | `ai` | Via `wrapVercelAI()` |
| **Any OpenAI-compatible** | `openai` | Manual or auto |

```typescript
// OpenAI
const openai = wrap(new OpenAI());

// Anthropic
import Anthropic from "@anthropic-ai/sdk";
const claude = wrap(new Anthropic());

// Google Gemini
import { GoogleGenerativeAI } from "@google/generative-ai";
const gemini = wrap(new GoogleGenerativeAI(process.env.GOOGLE_API_KEY));

// DeepSeek, Groq, or any OpenAI-compatible provider
const deepseek = wrap(new OpenAI({
  baseURL: "https://api.deepseek.com",
  apiKey: process.env.DEEPSEEK_API_KEY,
}));
```

---

## API Reference

### `wrap(client, options?)`

Wraps an LLM client to trace all API calls. Returns a proxy -- the client works identically.

```typescript
const client = wrap(new OpenAI());
const client = wrap(new OpenAI(), { provider: "deepseek", tags: { env: "staging" } });
```

| Option | Type | Description |
|--------|------|-------------|
| `provider` | `string` | Override auto-detected provider name |
| `tags` | `Record<string, string>` | Custom tags attached to every span |

### `startTrace(name, fn, options?)`

Groups multiple LLM calls under a single trace.

```typescript
const result = await startTrace("my-pipeline", async () => {
  const step1 = await client.chat.completions.create({ ... });
  const step2 = await client.chat.completions.create({ ... });
  return step2;
}, { sessionId: "user-123", tags: { workflow: "summarize" } });
```

| Option | Type | Description |
|--------|------|-------------|
| `sessionId` | `string` | Group traces into a session |
| `tags` | `Record<string, string>` | Custom tags on the trace |

### `init(config)`

Configure the SDK globally. All options can also be set via environment variables.

```typescript
import { init } from "@llmtap/sdk";

init({
  collectorUrl: "http://localhost:4781",
  captureContent: true,
  enabled: true,
  debug: false,
  sessionId: "my-session",
  onError: (err, ctx) => console.warn("LLMTap:", err.message),
});
```

| Config | Env Var | Default | Description |
|--------|---------|---------|-------------|
| `collectorUrl` | `LLMTAP_COLLECTOR_URL` | `http://localhost:4781` | Collector endpoint |
| `captureContent` | `LLMTAP_CAPTURE_CONTENT` | `true` | Capture message content |
| `enabled` | `LLMTAP_ENABLED` | `true` | Enable/disable tracing |
| `debug` | `LLMTAP_DEBUG` | `false` | Debug logging |
| `sessionId` | `LLMTAP_SESSION_ID` | -- | Session grouping |

### `wrapVercelAI(ai)`

Wraps the Vercel AI SDK for framework-level tracing across any underlying provider.

### `shutdown()`

Flushes all buffered spans and shuts down the SDK. Call before process exit in serverless environments.

```typescript
import { shutdown } from "@llmtap/sdk";
await shutdown();
```

---

## Architecture

```
Your Application
  |
  |  wrap(client) -- ES Proxy intercepts LLM calls
  |
  v
@llmtap/sdk ───────────> @llmtap/collector ───────────> @llmtap/dashboard
  Proxy-based               Fastify + SQLite               React + Vite
  instrumentation            REST API + SSE                 Real-time UI
  |                          |
  |  Batched HTTP POST       |  SSE push on new spans       Connects via SSE
  |  to /v1/spans            |  GET /v1/traces, /v1/stats   and REST API
  v                          v
                      ┌─────────────┐
                      │  SQLite DB  │       Optional: OTLP export to
                      │  (WAL mode) │ ───>  Datadog, Grafana, Jaeger
                      └─────────────┘
```

| Package | Description |
|---------|-------------|
| `llmtap` | CLI entry point -- `npx llmtap` starts collector + dashboard |
| `@llmtap/sdk` | ES Proxy-based instrumentation for LLM clients |
| `@llmtap/collector` | Fastify server, SQLite storage, SSE, REST API |
| `@llmtap/dashboard` | React + Vite + Tailwind SPA with real-time updates |
| `@llmtap/shared` | Types, constants, pricing data, OTLP converter |

---

## CLI

```bash
npx llmtap                     # Start collector + dashboard
npx llmtap --demo              # Start with sample data
npx llmtap --port 8080         # Custom port
npx llmtap --retention 7d      # Auto-delete old data
npx llmtap --host 0.0.0.0      # Expose to network
npx llmtap status              # Check stored spans and DB location
npx llmtap doctor              # Diagnose setup and empty-state issues
npx llmtap backup              # Create a portable SQLite backup
npx llmtap export -f json      # Export traces as JSON
npx llmtap import traces.json  # Re-import exported traces
npx llmtap restore backup.db   # Restore from a backup (collector must be stopped)
```

## Troubleshooting

### The dashboard is open but nothing shows up

Run:

```bash
npx llmtap doctor
```

Most empty states come down to one of these:

- the collector is not running
- `@llmtap/sdk` is not installed in the app you are running
- the client was not wrapped with `wrap()`
- your app has not made a model call yet

The fastest sanity check is:

```typescript
import OpenAI from "openai";
import { wrap } from "@llmtap/sdk";

const client = wrap(new OpenAI());
await client.chat.completions.create({
  model: "gpt-4o-mini",
  messages: [{ role: "user", content: "ping" }],
});
```

### Back up or move your local data

LLMTap stores everything in a local SQLite database. You can make a portable backup at any time:

```bash
npx llmtap backup
```

If you exported traces as JSON and want them back in LLMTap later:

```bash
npx llmtap import llmtap-export.json
```

If you want to fully restore from a database backup, stop the running collector first:

```bash
npx llmtap restore llmtap-backup.db
```

---

## Comparison

| | LLMTap | LangSmith | Helicone | Langfuse |
|---|---|---|---|---|
| **Setup** | `npx` + 2 lines | SDK + cloud account | Proxy + cloud | SDK + self-host or cloud |
| **Data location** | Your machine | Their cloud | Their cloud | Your infra or theirs |
| **Pricing** | Free, no limits | $39/seat/mo | $79/mo | Free (self-host) |
| **Instrumentation** | `wrap(client)` | Framework-specific | Proxy gateway | SDK callbacks |

LLMTap is a developer tool -- fast to start, private by default, zero friction. Use it during development and prototyping. When you need production infrastructure, export your traces via OTLP to the platform of your choice.

---

## Development

```bash
git clone https://github.com/DivyaanshuXD/LLMTap.git
cd llmtap
pnpm install
pnpm build        # Build all packages
pnpm test         # Run all tests (Vitest)
```

TypeScript monorepo with pnpm workspaces and Turborepo. Packages build with tsup, the dashboard builds with Vite.

## Contributing

Contributions are welcome.

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes and add tests
4. Run `pnpm build && pnpm test` to verify
5. Open a pull request

Please open an issue first for large changes so we can discuss the approach.

## License

MIT
