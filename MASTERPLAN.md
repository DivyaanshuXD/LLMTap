# LLMTAP MASTERPLAN

> **From Prototype to World-Class LLM Observability Platform**
> Created: 2026-03-12 | Status: Strategic Blueprint

---

## EXECUTIVE SUMMARY

### Where LLMTap Stands Today

LLMTap is a **well-architected prototype** with beautiful UI, clean monorepo structure, and a genuinely good core idea: local-first, zero-config LLM observability. The SDK wrapping via ES Proxy is clever, the SQLite + Fastify collector is solid, and the React dashboard looks polished at first glance.

**But here's the brutal truth: nobody would pay for this today.**

Why? Because it is a demo. The dashboard shows seeded fake data. There is no streaming support (the #1 way people use LLMs). It tracks only 2 providers. There is no search, no filtering, no pagination. The "Live" indicator always says "live" even when the backend is dead. The pricing data is hardcoded and already stale. There is a prefix-matching bug that silently overcharges costs by 16x for certain models. The database grows forever with no cleanup. There is no auth.

### What The Competition Looks Like

| Tool | Approach | Providers | Key Strengths | Pricing |
|------|----------|-----------|---------------|---------|
| **LangSmith** | SDK-based | 10+ | Full lifecycle (trace, eval, deploy), massive ecosystem | $39/seat/mo |
| **Helicone** | Proxy gateway | 10+ | <1ms latency, gateway features (cache, fallback, rate limit) | $79/mo |
| **Langfuse** | SDK + OTel | 10+ | Fully open-source, self-hostable, OTel-native | Free (self-host) |
| **Braintrust** | SDK-based | Any | Trace-to-eval pipeline, custom database (Brainstore) | $249/mo |
| **Portkey** | Gateway | 250+ | Broadest model support, production resilience | Usage-based |
| **Traceloop** | OTel-native | 20+ | OpenTelemetry standard, CI/CD quality gates | Cloud pricing |

### LLMTap's Unique Position

None of these competitors occupy the exact same niche as LLMTap. Here's where you **can** win:

1. **Local-first, zero-config** -- No sign-ups, no cloud accounts, no API keys to manage the tool itself
2. **Privacy by default** -- Data never leaves the developer's machine
3. **`npx llmtap` simplicity** -- One command and you're running
4. **Developer-first DX** -- 2 lines of code to instrument
5. **Open-source with zero usage limits** -- No "you've exceeded 10k traces" paywalls

The mission should be: **"The developer tool every AI engineer installs on day one, before they even consider LangSmith."**

---

## THE PROBLEM: "WILL THIS WORK IF I ADD AN API KEY?"

### How LLMTap Actually Works (And How It Would Track Real Usage)

**Your question:** "If I add an API key, will this work? How will it track models like Gemini, Claude, Codex, DeepSeek?"

**Answer: Partially yes, but with critical gaps.**

#### What DOES Work Today

If you run the example with a real OpenAI API key:

```bash
export OPENAI_API_KEY="sk-..."
cd examples/openai-basic
node index.mjs
```

The SDK's Proxy intercepts `client.chat.completions.create()`, the real OpenAI API responds, the SDK extracts tokens/cost from the real response, and sends the span to the collector. The dashboard shows the real trace. **This genuinely works for non-streaming OpenAI and Anthropic calls.**

#### What BREAKS

1. **Streaming calls** (`stream: true`) -- The SDK intercepts the call but gets back a `Stream` object, not a `ChatCompletion`. It reads `undefined` for tokens, records cost as $0, captures no output. **The span is emitted before the stream is even consumed.** This is silent data loss.

2. **Google Gemini** -- No provider wrapper exists. `wrap(geminiClient)` would try to treat it as OpenAI via the fallback, which would fail silently.

3. **DeepSeek** -- DeepSeek uses OpenAI-compatible API format, so `wrap(new OpenAI({ baseURL: "https://api.deepseek.com" }))` *might* work for non-streaming calls, but the provider would be detected as "openai" and the pricing would be wrong (OpenAI pricing applied to DeepSeek usage).

4. **Claude (via Anthropic SDK)** -- Non-streaming works. But `messages.stream()` doesn't. Extended thinking tokens aren't tracked. Cache tokens aren't tracked.

5. **Codex / o3 / o4-mini** -- These use OpenAI's Responses API (`client.responses.create()`), which is NOT intercepted. Only `chat.completions.create()` is wrapped.

6. **Multiple providers simultaneously** -- Each SDK client must be individually wrapped. There's no unified tracking across providers. If you use OpenAI for one step and Claude for another in the same agent pipeline, both work individually, but there's no way to see the total cost of the pipeline unless you use `startTrace()` to group them.

---

## PHASE 1: MAKE IT ACTUALLY WORK (Critical Fixes)

> **Goal:** A developer can `wrap()` their real OpenAI/Anthropic client and get accurate, complete data. No more fake data dependency.
> **Priority:** MUST DO. Without this, nothing else matters.
> **Estimated scope:** ~15-20 files modified

### 1.1 Streaming Support (THE #1 Blocker)

**The Problem:** 90%+ of production LLM usage is streamed. LLMTap silently drops all data from streaming calls.

**What To Build:**

For OpenAI (`providers/openai.ts`):
- Detect `stream: true` in the request args
- When streaming is detected, wrap the returned `AsyncIterable<ChatCompletionChunk>` in a transparent proxy
- Accumulate chunks as they flow through (token counts from the final chunk's `usage` field, or count manually)
- Emit the span only AFTER the stream is fully consumed
- The user's code sees no difference -- the stream works exactly as before
- Handle `stream_options: { include_usage: true }` to get server-side token counts

For Anthropic (`providers/anthropic.ts`):
- Intercept both `messages.create({ stream: true })` and `messages.stream()`
- Wrap the `MessageStream` to accumulate `content_block_delta` events
- Extract final `message_delta` event for `output_tokens`
- Emit span after `message_stop` event

### 1.2 Fix Critical Pricing Bug

**The Problem:** `MODEL_PRICING.find(p => model.startsWith(p.model))` matches `gpt-4o-mini` against `gpt-4o` (the first match), giving 16.7x wrong output costs.

**The Fix:** Sort pricing table by model name length descending, so longer/more-specific model names match first. Or use exact match first, then prefix match as fallback.

### 1.3 Fix Provider Detection

**The Problem:** `client.constructor.name` breaks in minified builds.

**The Fix:**
- Check for known SDK shapes: does `client.chat?.completions?.create` exist? -> OpenAI. Does `client.messages?.create` exist? -> Anthropic.
- Add explicit `provider` option to `wrap()`: `wrap(client, { provider: "openai" })`
- Keep `constructor.name` as a last-resort fallback

### 1.4 Fix Process Exit Data Loss

**The Problem:** If a Node.js process exits, any buffered spans are lost forever.

**The Fix:** Add `process.on('beforeExit', flush)` handler. Add `sdk.shutdown()` method that returns a Promise resolving when all buffered spans are sent. Document this for serverless environments (Lambda, Vercel Functions).

### 1.5 Remove Seed Data Dependency

**The Problem:** The dashboard is designed to look good with seed data and looks empty/broken without it.

**The Fix:**
- Make seed data opt-in: `npx llmtap --demo` to seed, or `npx llmtap` for clean start
- Design compelling empty states that guide users to instrument their code
- Add an onboarding flow: "No traces yet. Here's how to get started..." with copy-paste code snippets
- Add a "Generate sample traces" button on the empty dashboard that seeds on-demand

### 1.6 Fix Pagination Total Count Bug

**The Problem:** The `total` field in the traces API returns `rows.length` (page size), not the actual total count.

**The Fix:** Add a `SELECT COUNT(DISTINCT traceId) FROM spans` query and return the real total.

---

## PHASE 2: MULTI-PROVIDER SUPPORT (Growth Foundation)

> **Goal:** Support every major LLM provider. A developer using Claude, GPT-4, Gemini, and DeepSeek in the same project can track everything.
> **Priority:** HIGH. This is the #1 feature gap vs. competitors.

### 2.1 Provider Architecture Refactor

Create a provider plugin system so new providers are easy to add:

```
packages/sdk/src/providers/
  ├── base.ts          # Abstract base with shared span creation logic
  ├── openai.ts        # OpenAI + OpenAI-compatible (DeepSeek, Groq, Together, etc.)
  ├── anthropic.ts     # Anthropic Claude
  ├── google.ts        # Google Gemini (via @google/generative-ai SDK)
  ├── vercel-ai.ts     # Vercel AI SDK (framework-level wrapping)
  └── generic-openai.ts # Any OpenAI-compatible endpoint (custom base URL)
```

### 2.2 New Provider Wrappers

**Google Gemini** (`@google/generative-ai` SDK):
- Intercept `model.generateContent()` and `model.generateContentStream()`
- Map Gemini's `usageMetadata` (promptTokenCount, candidatesTokenCount) to LLMTap's format
- Handle Gemini's unique features: grounding, safety ratings, function calling

**OpenAI-Compatible Providers** (DeepSeek, Groq, Together, Fireworks, OpenRouter):
- Extend the OpenAI wrapper to detect non-openai base URLs
- Auto-detect provider from the base URL (e.g., `api.deepseek.com` -> provider: "deepseek")
- Let users specify custom provider name: `wrap(client, { provider: "deepseek" })`
- Apply correct pricing based on provider + model combination

**Vercel AI SDK** (framework-level, covers ALL providers):
- Wrap `generateText()`, `streamText()`, `generateObject()`, `streamObject()`
- This single integration gives LLMTap access to 20+ providers through one SDK
- This is the highest-leverage integration to build

### 2.3 Dynamic Pricing System

Replace the hardcoded pricing table with a maintainable system:

```typescript
// packages/shared/src/pricing.ts

// 1. Ship with embedded defaults (updated per release)
const EMBEDDED_PRICING: ModelPricing[] = [ ... ];

// 2. Allow runtime overrides
export function setPricing(model: string, pricing: { input: number; output: number }): void;

// 3. Allow loading from external JSON (auto-updated)
export function loadPricingFromURL(url: string): Promise<void>;

// 4. Fix the prefix matching: sort by specificity
export function calculateCost(model: string, inputTokens: number, outputTokens: number): Cost;
```

Ship a `pricing.json` file that can be updated independently of the npm package. Users can also override pricing for custom/fine-tuned models.

Add missing models:
- OpenAI: gpt-4.5, o3, o3-mini, o4-mini, gpt-4o-audio, gpt-4o-realtime
- Anthropic: claude-opus-4, claude-sonnet-4, claude-haiku-4
- Google: gemini-2.5-pro, gemini-2.5-flash, gemini-2.0-flash-lite
- DeepSeek: deepseek-v3, deepseek-r1, deepseek-coder-v2
- Mistral: mistral-large, codestral, pixtral-large
- Cohere: command-r-plus, command-r
- Groq: llama-3.3-70b, mixtral-8x7b
- xAI: grok-2, grok-3

---

## PHASE 3: DASHBOARD - FROM DEMO TO DEVELOPER TOOL (Core Value)

> **Goal:** Transform the dashboard from a visual demo into a tool developers actually use every day.
> **Priority:** HIGH. The dashboard IS the product for most users.

### 3.1 Search, Filter, and Sort (THE Most Requested Feature)

The single most important dashboard feature that is completely missing:

- **Search bar** at the top: search by trace name, span content, model name, error message
- **Filter sidebar/chips**: provider, model, status (ok/error), time range, cost range, token range
- **Date range picker**: "Last 1h / 6h / 24h / 7d / 30d / Custom"
- **Column sorting**: click any column header to sort by that dimension
- **Filter persistence**: filters survive page navigation and browser refresh (URL params)

### 3.2 Pagination

- Add real pagination with page size selector (25/50/100)
- Show total count from the fixed API
- URL-based page state (`?page=3&limit=50`)
- Keyboard shortcuts: left/right arrow for page navigation

### 3.3 Hierarchical Trace View (Critical for Agent Debugging)

The current flat span list ignores `parentSpanId`. For multi-step agents, this is the most important visualization:

- **Tree/waterfall view**: indent child spans under parent spans
- **Flame chart**: horizontal timeline showing span nesting and parallelism
- **Collapsible groups**: expand/collapse span trees
- **Span relationships**: visual lines connecting parent -> child spans
- This is the feature that separates LLMTap from a simple log viewer

### 3.4 Real Connection Health

Fix the lying "Live" indicator:

- Track SSE connection state: `connecting`, `connected`, `disconnected`, `reconnecting`
- Show actual state in the UI: green dot for connected, yellow for reconnecting, red for disconnected
- Add automatic reconnection with exponential backoff
- Show a toast/banner when connection is lost and restored
- Debounce React Query invalidations (batch SSE events, flush every 500ms)

### 3.5 Proper Error Handling

- Add `<ErrorBoundary>` at page level with recovery UI
- Show error states on API failures (not just empty states)
- Add retry buttons on failed requests
- Show `fetch` errors from the API client (currently swallowed)
- Display the actual response body on HTTP errors

### 3.6 Essential New Pages

**Traces Explorer Page** (`/traces`):
- Full-screen table with advanced filtering
- Bulk select and export
- Side-by-side trace comparison
- Quick-preview panel (click trace -> see spans without navigating away)

**Models Page** (`/models`):
- Table of all models used, with per-model metrics
- Cost per model over time
- Token usage distribution per model
- Latency percentiles per model (p50, p90, p99)
- Model comparison charts

**Sessions Page** (`/sessions`):
- Group traces by `sessionId`
- Timeline view of a session
- Total cost per session
- Useful for multi-turn chatbot debugging

**Settings Page** (`/settings`):
- Custom pricing overrides
- Data retention configuration
- Export functionality
- Collector connection settings
- Theme preferences

### 3.7 Copy, Export, and Share

- Copy-to-clipboard on trace IDs, span IDs, messages, tool call arguments, JSON payloads
- "Copy as cURL" for replaying API calls
- Export current view as CSV/JSON
- Shareable trace links (even if just localhost URLs with state)
- "Copy trace as markdown" for pasting into issues/docs

### 3.8 Prompt/Response Viewer

- Syntax highlighting for code blocks in messages
- Collapsible message sections
- Message role badges (system/user/assistant/tool)
- Token count per message
- Image rendering for multi-modal content
- Diff view: compare two prompts/responses side by side

---

## PHASE 4: PRODUCTION HARDENING (Reliability)

> **Goal:** Make LLMTap reliable enough that developers trust it with real data.
> **Priority:** MEDIUM-HIGH. Required before any serious adoption.

### 4.1 Data Retention and Cleanup

- Add configurable TTL: `npx llmtap --retention 7d` (delete spans older than 7 days)
- Add automatic cleanup job on startup
- Add `VACUUM` after bulk deletion to reclaim disk space
- Add database size display in the settings page
- Add manual "delete all data older than X" in UI

### 4.2 Database Migrations

- Add a `migrations` table to track schema version
- Write forward-only migration scripts
- Run migrations on startup before seeding
- This enables schema changes without data loss in future versions

### 4.3 Request Validation Hardening

- Add max string length limits to Zod schemas (prevent 100MB error messages)
- Add query parameter validation on all GET routes
- Add rate limiting on ingest endpoint (prevent accidental DoS from runaway SDK)
- Add request body size limit in Fastify

### 4.4 Error Recovery in SDK

- Add `process.on('beforeExit')` handler for span flush
- Add `sdk.shutdown()` returning a Promise
- Add configurable error handler: `init({ onError: (err) => console.warn(err) })`
- Don't silently drop 4xx responses — log in debug mode
- Add retry-able queue for failed spans

### 4.5 Concurrent Write Safety

- Configure `busy_timeout` pragma for SQLite (e.g., 5000ms)
- Add connection pool or write serialization for high-throughput scenarios
- Monitor and log WAL size, checkpoint periodically

### 4.6 Self-Hosted Fonts

- Bundle Fira Sans and Fira Code fonts locally instead of loading from Google Fonts CDN
- Ensures the dashboard works in air-gapped environments (which align with the "local-first" promise)

---

## PHASE 5: DEVELOPER EXPERIENCE EXCELLENCE (Delight)

> **Goal:** Make LLMTap so pleasant to use that developers tell their friends.
> **Priority:** MEDIUM. This is what creates word-of-mouth growth.

### 5.1 CLI Improvements

```bash
npx llmtap                    # Start (clean, no seed data)
npx llmtap --demo             # Start with demo data
npx llmtap --port 8080        # Custom port
npx llmtap --retention 7d     # Auto-cleanup older than 7 days
npx llmtap --host 0.0.0.0     # Expose to network (with warning)
npx llmtap status             # Show collector status, db size, span count
npx llmtap export --format csv # Export as CSV
npx llmtap export --format otlp # Export as OpenTelemetry
npx llmtap tail               # Stream traces to terminal (like tail -f)
npx llmtap doctor             # Diagnose common setup issues
```

### 5.2 Better Onboarding

When the dashboard opens with no data:

1. Show a guided setup with copy-paste code snippets
2. Detect which LLM SDKs are installed in the user's `node_modules` and show the right snippet
3. Add a "Test connection" button that the SDK can ping
4. Add a "Generate sample trace" button that creates one demo trace
5. Link to docs for each supported provider

### 5.3 Environment Variable Config

Support zero-code configuration via env vars (industry standard):

```bash
LLMTAP_COLLECTOR_URL=http://localhost:4781   # Custom collector URL
LLMTAP_ENABLED=true                          # Toggle tracing
LLMTAP_CAPTURE_CONTENT=true                  # Capture message content
LLMTAP_SESSION_ID=my-session                 # Session grouping
LLMTAP_DEBUG=true                            # Debug logging
```

### 5.4 SDK Debug Mode

When `LLMTAP_DEBUG=true` or `init({ debug: true })`:
- Log every span to console with formatted summary
- Log transport failures with full error details
- Log pricing matches (which model matched, what cost was calculated)
- Log buffer state (pending spans, flush attempts)

### 5.5 Framework Integrations

Build thin integration packages for popular frameworks:

- `@llmtap/next` -- Auto-instrument Next.js API routes and AI SDK usage
- `@llmtap/langchain` -- Callback handler for LangChain.js
- `@llmtap/express` -- Express middleware for API route tracing

### 5.6 Dashboard Keyboard Shortcuts

- `Ctrl+K` or `/`: Open search
- `G then O`: Go to Overview
- `G then C`: Go to Costs
- `G then T`: Go to Traces
- `J/K`: Navigate trace list up/down
- `Enter`: Open selected trace
- `Esc`: Close panels, go back
- `?`: Show keyboard shortcuts

---

## PHASE 6: COMPETITIVE DIFFERENTIATORS (Stand Out)

> **Goal:** Features that no competitor does as well, making LLMTap the obvious choice.
> **Priority:** MEDIUM. These are what make people choose LLMTap over alternatives.

### 6.1 Zero-Config Provider Detection

When a user runs `wrap(client)`, LLMTap should automatically:
- Detect the provider from the client SDK shape
- Detect the model from the API response
- Apply correct pricing
- Label spans with the right provider name
- Handle OpenAI-compatible providers (detect from base URL)

No config needed. No `{ provider: "deepseek" }` argument. It just works.

### 6.2 Local AI-Powered Insights

Since LLMTap already runs alongside AI applications, add opt-in local analysis:

- **Cost anomaly detection**: "This trace cost 10x more than your average"
- **Error pattern detection**: "You're hitting rate limits every Tuesday at 3pm"
- **Token waste detection**: "Your system prompt uses 2000 tokens. Here's a compressed version"
- **Model recommendation**: "gpt-4o-mini handles 95% of your tasks — you could save $X/month by routing simple tasks there"

These can run locally using the user's own API key (opt-in) or with simple heuristics (no API needed).

### 6.3 Trace Replay

A unique feature no competitor offers well:

- Click "Replay" on any trace
- LLMTap sends the exact same prompts to the LLM again (using the user's API key)
- Side-by-side comparison of the original response vs. replay
- Useful for debugging non-deterministic behavior
- Shows token diff, latency diff, and response diff

### 6.4 Terminal UI Mode

For developers who live in the terminal:

```bash
npx llmtap tail --format pretty
# Streams traces in real-time with colors and formatting

npx llmtap tail --format json
# JSONL output for piping to jq

npx llmtap stats
# Quick terminal stats: total cost, top models, error rate
```

### 6.5 VS Code Extension

- Inline cost annotations in the editor (like CodeLens)
- "Trace this function" code action
- Trace viewer panel inside VS Code
- Click a trace to jump to the source code that made the call

---

## PHASE 7: OPENTELEMETRY COMPATIBILITY (Enterprise Path)

> **Goal:** Make LLMTap data exportable to any observability backend.
> **Priority:** LOW-MEDIUM for now, but important for enterprise adoption.

### 7.1 OTel Export

- Export LLMTap spans in OTLP format (protobuf and JSON)
- Map LLMTap's span attributes to the GenAI Semantic Conventions
- Support `OTEL_EXPORTER_OTLP_ENDPOINT` env var for sending to Datadog, Grafana, Jaeger, etc.

### 7.2 OTel Ingest

- Accept OTLP spans at `POST /v1/traces` (OTLP endpoint)
- This allows users who already use OpenLLMetry/Traceloop to point their data at LLMTap's dashboard
- Become a local visualization layer for any OTel-instrumented LLM app

---

## PHASE 8: FUTURE VISION (Long-term)

These are features for after LLMTap has solid adoption:

### 8.1 Team / Cloud Mode
- Optional cloud sync for team dashboards
- Multi-user access with API keys
- Shared trace annotations
- Cost budgets per team/project

### 8.2 Evaluation Framework
- Score traces (thumbs up/down, 1-5, custom rubrics)
- LLM-as-judge integration
- Regression testing: "did this prompt change make things better?"
- Dataset management for systematic eval

### 8.3 Prompt Management
- Version prompts with change tracking
- Link prompt versions to trace performance
- A/B testing prompt variants
- Prompt template library

### 8.4 AI Gateway Features
- Optional proxy mode (alternative to SDK wrapping)
- Caching (semantic and exact-match)
- Fallback routing (if OpenAI fails, try Anthropic)
- Rate limiting per model/user
- Request/response guardrails

---

## IMPLEMENTATION PRIORITY MATRIX

| Phase | Effort | Impact | Do When |
|-------|--------|--------|---------|
| **Phase 1: Make It Work** | Medium | Critical | **NOW. First.** |
| **Phase 2: Multi-Provider** | Medium | High | **Immediately after Phase 1** |
| **Phase 3: Dashboard** | Large | High | **Parallel with Phase 2** |
| **Phase 4: Production Hardening** | Medium | Medium-High | **After Phase 1-3 core is done** |
| **Phase 5: DX Excellence** | Medium | Medium | **Ongoing, alongside other phases** |
| **Phase 6: Differentiators** | Large | High | **After Phase 1-4 are solid** |
| **Phase 7: OTel** | Medium | Medium | **When enterprise users ask for it** |
| **Phase 8: Future** | Very Large | High | **After established adoption** |

---

## THE ANSWER TO "WILL ADDING AN API KEY WORK?"

### Today (v0.1.0)

| Scenario | Works? | Quality |
|----------|--------|---------|
| OpenAI, non-streaming | Yes | Accurate tokens + costs |
| OpenAI, streaming | NO | Silent data loss. $0 cost, 0 tokens |
| Anthropic, non-streaming | Yes | Accurate tokens + costs |
| Anthropic, streaming | NO | Silent data loss |
| Google Gemini | NO | No provider wrapper |
| DeepSeek (via OpenAI SDK) | Partial | Works but shows as "openai" with wrong pricing |
| Groq (via OpenAI SDK) | Partial | Same issue as DeepSeek |
| Codex / o3 (Responses API) | NO | Uses different API path, not intercepted |
| Multiple providers in one trace | Yes | If each is wrapped and `startTrace()` is used |

### After Phase 1+2 (Target)

| Scenario | Works? | Quality |
|----------|--------|---------|
| OpenAI, any mode | Yes | Full streaming + non-streaming |
| Anthropic, any mode | Yes | Full streaming + non-streaming |
| Google Gemini | Yes | Native provider wrapper |
| DeepSeek | Yes | Correct provider label + pricing |
| Groq/Together/Fireworks | Yes | OpenAI-compatible auto-detection |
| Vercel AI SDK (any provider) | Yes | Framework-level integration |
| Multiple providers | Yes | Unified dashboard with per-provider breakdown |

### How Multi-Provider Real-Time Tracking Would Work

```
Your App Process
├── wrap(openai)      -> ES Proxy intercepts chat.completions.create()
├── wrap(anthropic)   -> ES Proxy intercepts messages.create()
├── wrap(gemini)      -> ES Proxy intercepts generateContent()
│
│  (Each call extracts real tokens/costs from the provider's response)
│  (Each span includes provider name, model, timestamps, content)
│
├── Transport buffer (batched, debounced)
│   └── HTTP POST /v1/spans -> Collector
│
Collector (SQLite + Fastify)
├── Stores all spans with provider/model metadata
├── SSE pushes new spans to connected dashboards
│
Dashboard (React)
├── Real-time updates via SSE
├── Grouped by trace, filterable by provider/model
├── Cost breakdown across ALL providers
├── Unified timeline showing cross-provider agent workflows
```

**Key insight:** LLMTap doesn't need your API keys. It wraps your existing SDK clients and reads the responses AFTER they come back. The API key is between your app and the provider — LLMTap just observes what happened. This is a privacy advantage over proxy-based tools like Helicone/Portkey, where your actual API calls flow through their servers.

---

## WHAT MAKES LLMTAP WORLD-CLASS

After implementing Phase 1-6, LLMTap would be:

1. **The simplest LLM observability tool to start with** -- `npx llmtap` + 2 lines of code
2. **The most private** -- data never leaves your machine
3. **The most cost-effective** -- free, open-source, no usage limits
4. **The fastest to integrate** -- no sign-ups, no cloud accounts, no configs
5. **Developer-native** -- keyboard shortcuts, terminal mode, VS Code extension
6. **Production-capable** -- streaming, multi-provider, data retention, proper error handling
7. **Enterprise-compatible** -- OTel export to existing infrastructure

The vision: **Every AI engineer runs LLMTap locally during development. Some teams extend it to staging/production. The tool grows with the user from first prototype to production deployment.**

---

## WHAT TO BUILD FIRST (Next 2 Weeks)

If you're attaching this as context and building immediately, here's the exact order:

### Week 1: Make It Real
1. **Fix streaming support** (openai.ts + anthropic.ts) -- This is the single highest-impact change
2. **Fix pricing prefix bug** (pricing.ts) -- 30 minutes, prevents wrong cost data
3. **Fix provider detection** (index.ts) -- Use SDK shape detection, not constructor.name
4. **Make seed data opt-in** (server.ts + cli start.ts) -- `--demo` flag
5. **Add process exit flush** (transport.ts) -- Prevents data loss
6. **Fix pagination total** (traces.ts) -- Returns real count

### Week 2: Multi-Provider + Dashboard Core
7. **Add Google Gemini wrapper** (new file: providers/google.ts)
8. **Add OpenAI-compatible detection** (openai.ts) -- DeepSeek, Groq, Together auto-detection
9. **Update pricing table** (pricing.ts) -- Add all missing models/providers
10. **Add search and filtering** (Dashboard.tsx) -- The most requested dashboard feature
11. **Add date range picker** (Dashboard.tsx, stats.ts) -- Essential for any analytics
12. **Fix LivePulse to show real SSE state** (useLiveRefresh.ts, LivePulse.tsx)
13. **Add hierarchical trace view** (TraceDetail.tsx) -- Use parentSpanId for tree rendering
14. **Add pagination UI** (Dashboard.tsx) -- With page size selector

---

*This masterplan is a living document. Update it as features are completed and priorities shift.*
*Attach this file as context when you start building to maintain strategic alignment.*
