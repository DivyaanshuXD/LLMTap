import { useState } from "react";
import {
  Check,
  Copy,
  FolderCode,
  Play,
  SearchCheck,
  Terminal,
} from "lucide-react";

interface GettingStartedPanelProps {
  compact?: boolean;
}

type ProviderKey = "openai" | "anthropic" | "gemini";

const providerSteps: Record<
  ProviderKey,
  {
    label: string;
    wrapCode: string;
    requestCode: string;
  }
> = {
  openai: {
    label: "OpenAI",
    wrapCode: `import OpenAI from "openai";
import { wrap } from "@llmtap/sdk";

const client = wrap(new OpenAI());`,
    requestCode: `await client.chat.completions.create({
  model: "gpt-4o-mini",
  messages: [{ role: "user", content: "Hello!" }],
});`,
  },
  anthropic: {
    label: "Anthropic",
    wrapCode: `import Anthropic from "@anthropic-ai/sdk";
import { wrap } from "@llmtap/sdk";

const client = wrap(new Anthropic());`,
    requestCode: `await client.messages.create({
  model: "claude-sonnet-4-20250514",
  max_tokens: 256,
  messages: [{ role: "user", content: "Hello!" }],
});`,
  },
  gemini: {
    label: "Gemini",
    wrapCode: `import { GoogleGenerativeAI } from "@google/generative-ai";
import { wrap } from "@llmtap/sdk";

const genAI = wrap(new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!));
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });`,
    requestCode: `await model.generateContent("Hello!");`,
  },
};

function CopyCodeButton({
  label,
  text,
  copied,
  onCopy,
}: {
  label: string;
  text: string;
  copied: string | null;
  onCopy: (label: string, text: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onCopy(label, text)}
      className="rounded-2xl border border-[var(--border-dim)] bg-[rgba(var(--ch-bg-surface),0.72)] p-1.5 text-[var(--color-text-secondary)] transition-colors hover:border-[var(--border-default)] hover:text-[var(--color-text-primary)]"
      title={`Copy ${label}`}
    >
      {copied === label ? (
        <Check className="h-3.5 w-3.5 text-[var(--color-accent)]" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
    </button>
  );
}

export function GettingStartedPanel({
  compact = false,
}: GettingStartedPanelProps) {
  const [provider, setProvider] = useState<ProviderKey>("openai");
  const [copied, setCopied] = useState<string | null>(null);
  const current = providerSteps[provider];

  function copy(label: string, text: string) {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(label);
    window.setTimeout(() => setCopied(null), 1800);
  }

  return (
    <div className="surface-strong rounded-[var(--radius-card)] p-5 sm:p-6">
      <div className="max-w-3xl">
        <div className="hud-label">First successful trace</div>
        <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[var(--color-text-primary)]">
          LLMTap is already running locally. The remaining change happens in your app.
        </h2>
        <p className="mt-3 text-sm leading-6 text-[var(--color-text-secondary)]">
          Running <code className="rounded bg-[rgba(var(--ch-bg-surface),0.82)] px-1.5 py-0.5 font-mono text-[var(--color-text-primary)]">npx llmtap</code> starts the
          collector and opens this dashboard automatically. You do not edit LLMTap itself from here. You edit the
          codebase that is already making LLM calls.
        </p>
      </div>

      <div className="mt-5 rounded-[var(--radius-panel)] border border-[var(--color-accent-2)]/18 bg-[var(--color-accent-2)]/10 p-4 text-sm text-[var(--color-text-primary)]">
        Put the wrap code in the same file where your app currently does{" "}
        <code className="rounded bg-[rgba(var(--ch-bg-base),0.35)] px-1.5 py-0.5 font-mono text-[var(--color-accent)]">new OpenAI()</code>,{" "}
        <code className="rounded bg-[rgba(var(--ch-bg-base),0.35)] px-1.5 py-0.5 font-mono text-[var(--color-accent)]">new Anthropic()</code>, or{" "}
        <code className="rounded bg-[rgba(var(--ch-bg-base),0.35)] px-1.5 py-0.5 font-mono text-[var(--color-accent)]">new GoogleGenerativeAI()</code>.
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {(Object.entries(providerSteps) as [ProviderKey, (typeof providerSteps)[ProviderKey]][]).map(
          ([key, step]) => (
            <button
              key={key}
              type="button"
              onClick={() => setProvider(key)}
              className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors ${
                provider === key
                  ? "border-[var(--color-accent-2)]/20 bg-[var(--color-accent-2)]/12 text-[var(--color-accent)]"
                  : "border-[var(--border-dim)] bg-[rgba(var(--ch-bg-surface),0.72)] text-[var(--color-text-secondary)] hover:border-[var(--border-default)] hover:text-[var(--color-text-primary)]"
              }`}
            >
              {step.label}
            </button>
          )
        )}
      </div>

      <div className={`mt-5 grid gap-5 ${compact ? "xl:grid-cols-3" : "lg:grid-cols-3"}`}>
        <div className="surface-muted rounded-[var(--radius-panel)] p-5">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-accent-2)]/15 text-xs font-bold text-[var(--color-accent)]">
              1
            </span>
            <div className="text-sm font-semibold text-[var(--color-text-primary)]">Collector is already up</div>
          </div>
          <p className="mt-3 text-sm leading-6 text-[var(--color-text-secondary)]">
            This command started the local collector and opened the dashboard in your browser.
          </p>
          <div className="mt-3 flex items-start justify-between gap-3 rounded-[var(--radius-panel)] border border-[var(--border-dim)] bg-[rgba(var(--ch-bg-base),0.4)] p-3">
            <pre className="overflow-x-auto text-sm leading-relaxed text-[var(--color-accent)]">npx llmtap</pre>
            <CopyCodeButton label="start" text="npx llmtap" copied={copied} onCopy={copy} />
          </div>
        </div>

        <div className="surface-muted rounded-[var(--radius-panel)] p-5">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-accent-2)]/15 text-xs font-bold text-[var(--color-accent)]">
              2
            </span>
            <div className="text-sm font-semibold text-[var(--color-text-primary)]">Wrap your existing client</div>
          </div>
          <p className="mt-3 text-sm leading-6 text-[var(--color-text-secondary)]">
            Change the file in your app where the provider client is created. After wrapping, you keep using the SDK
            the same way.
          </p>
          <div className="mt-3 flex items-start justify-between gap-3 rounded-[var(--radius-panel)] border border-[var(--border-dim)] bg-[rgba(var(--ch-bg-base),0.4)] p-3">
            <pre className="overflow-x-auto text-sm leading-relaxed text-[var(--color-accent)]">{current.wrapCode}</pre>
            <CopyCodeButton label="wrap" text={current.wrapCode} copied={copied} onCopy={copy} />
          </div>
        </div>

        <div className="surface-muted rounded-[var(--radius-panel)] p-5">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-accent-2)]/15 text-xs font-bold text-[var(--color-accent)]">
              3
            </span>
            <div className="text-sm font-semibold text-[var(--color-text-primary)]">Run one real request</div>
          </div>
          <p className="mt-3 text-sm leading-6 text-[var(--color-text-secondary)]">
            Trigger any normal model call in that same app. LLMTap captures it automatically and the first trace should
            appear here in a few seconds.
          </p>
          <div className="mt-3 flex items-start justify-between gap-3 rounded-[var(--radius-panel)] border border-[var(--border-dim)] bg-[rgba(var(--ch-bg-base),0.4)] p-3">
            <pre className="overflow-x-auto text-sm leading-relaxed text-[var(--color-accent)]">{current.requestCode}</pre>
            <CopyCodeButton label="request" text={current.requestCode} copied={copied} onCopy={copy} />
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <div className="surface-muted rounded-[var(--radius-panel)] p-5">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-[var(--color-text-primary)]">
            <FolderCode className="h-4 w-4 text-[var(--color-accent)]" />
            Where this code usually goes
          </div>
          <div className="grid gap-3 text-sm text-[var(--color-text-secondary)] sm:grid-cols-2">
            <div className="rounded-[var(--radius-panel)] border border-[var(--border-dim)] bg-[rgba(var(--ch-bg-surface),0.72)] px-4 py-3">
              Next.js route or server action
            </div>
            <div className="rounded-[var(--radius-panel)] border border-[var(--border-dim)] bg-[rgba(var(--ch-bg-surface),0.72)] px-4 py-3">
              Express / Fastify backend file
            </div>
            <div className="rounded-[var(--radius-panel)] border border-[var(--border-dim)] bg-[rgba(var(--ch-bg-surface),0.72)] px-4 py-3">
              Agent runner or worker script
            </div>
            <div className="rounded-[var(--radius-panel)] border border-[var(--border-dim)] bg-[rgba(var(--ch-bg-surface),0.72)] px-4 py-3">
              CLI script already calling the provider
            </div>
          </div>
        </div>

        <div className="surface-muted rounded-[var(--radius-panel)] p-5">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-[var(--color-text-primary)]">
            <SearchCheck className="h-4 w-4 text-[var(--color-accent-2)]" />
            How to know it worked
          </div>
          <div className="space-y-3 text-sm text-[var(--color-text-secondary)]">
            <div className="rounded-[var(--radius-panel)] border border-[var(--border-dim)] bg-[rgba(var(--ch-bg-surface),0.72)] px-4 py-3">
              A new trace appears in the Overview or Traces page.
            </div>
            <div className="rounded-[var(--radius-panel)] border border-[var(--border-dim)] bg-[rgba(var(--ch-bg-surface),0.72)] px-4 py-3">
              Token, cost, and latency numbers start changing.
            </div>
            <div className="rounded-[var(--radius-panel)] border border-[var(--border-dim)] bg-[rgba(var(--ch-bg-surface),0.72)] px-4 py-3">
              If nothing appears, run <code className="rounded bg-[rgba(var(--ch-bg-surface),0.82)] px-1.5 py-0.5 font-mono text-[var(--color-text-primary)]">npx llmtap doctor</code>.
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-3 text-sm text-[var(--color-text-secondary)]">
        <span className="status-chip border-[var(--color-accent-2)]/16 bg-[var(--color-accent-2)]/12 text-[var(--color-accent)]">
          <Terminal className="h-3.5 w-3.5" />
          Collector + dashboard start automatically
        </span>
        <span className="status-chip border-[var(--color-accent)]/16 bg-[var(--color-accent)]/10 text-[var(--color-accent)]">
          <Play className="h-3.5 w-3.5" />
          One real request is enough to validate the setup
        </span>
      </div>
    </div>
  );
}
