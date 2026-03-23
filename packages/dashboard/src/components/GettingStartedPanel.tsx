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
      className="rounded-lg border border-white/8 bg-white/4 p-1.5 text-slate-400 transition-colors hover:text-white"
      title={`Copy ${label}`}
    >
      {copied === label ? (
        <Check className="h-3.5 w-3.5 text-emerald-300" />
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
    <div className="surface-strong rounded-[26px] p-5 sm:p-6">
      <div className="max-w-3xl">
        <div className="hud-label">First successful trace</div>
        <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-white">
          LLMTap is already running locally. The remaining change happens in your app.
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          Running <code className="rounded bg-white/6 px-1.5 py-0.5 font-mono text-slate-300">npx llmtap</code> starts the
          collector and opens this dashboard automatically. You do not edit LLMTap itself from here. You edit the
          codebase that is already making LLM calls.
        </p>
      </div>

      <div className="mt-4 rounded-2xl border border-emerald-400/14 bg-emerald-400/8 p-4 text-sm text-emerald-100">
        Put the wrap code in the same file where your app currently does{" "}
        <code className="rounded bg-black/20 px-1.5 py-0.5 font-mono text-emerald-50">new OpenAI()</code>,{" "}
        <code className="rounded bg-black/20 px-1.5 py-0.5 font-mono text-emerald-50">new Anthropic()</code>, or{" "}
        <code className="rounded bg-black/20 px-1.5 py-0.5 font-mono text-emerald-50">new GoogleGenerativeAI()</code>.
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {(Object.entries(providerSteps) as [ProviderKey, (typeof providerSteps)[ProviderKey]][]).map(
          ([key, step]) => (
            <button
              key={key}
              type="button"
              onClick={() => setProvider(key)}
              className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                provider === key
                  ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-200"
                  : "border-white/8 bg-white/4 text-slate-400 hover:text-white"
              }`}
            >
              {step.label}
            </button>
          )
        )}
      </div>

      <div className={`mt-5 grid gap-4 ${compact ? "xl:grid-cols-3" : "lg:grid-cols-3"}`}>
        <div className="surface-muted rounded-2xl p-4">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-400/12 text-[11px] font-bold text-emerald-200">
              1
            </span>
            <div className="text-sm font-semibold text-white">Collector is already up</div>
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-400">
            This command started the local collector and opened the dashboard in your browser.
          </p>
          <div className="mt-3 flex items-start justify-between gap-3 rounded-2xl border border-white/6 bg-black/35 p-3">
            <pre className="overflow-x-auto text-xs leading-relaxed text-emerald-200">npx llmtap</pre>
            <CopyCodeButton label="start" text="npx llmtap" copied={copied} onCopy={copy} />
          </div>
        </div>

        <div className="surface-muted rounded-2xl p-4">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-400/12 text-[11px] font-bold text-emerald-200">
              2
            </span>
            <div className="text-sm font-semibold text-white">Wrap your existing client</div>
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-400">
            Change the file in your app where the provider client is created. After wrapping, you keep using the SDK
            the same way.
          </p>
          <div className="mt-3 flex items-start justify-between gap-3 rounded-2xl border border-white/6 bg-black/35 p-3">
            <pre className="overflow-x-auto text-xs leading-relaxed text-emerald-200">{current.wrapCode}</pre>
            <CopyCodeButton label="wrap" text={current.wrapCode} copied={copied} onCopy={copy} />
          </div>
        </div>

        <div className="surface-muted rounded-2xl p-4">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-400/12 text-[11px] font-bold text-emerald-200">
              3
            </span>
            <div className="text-sm font-semibold text-white">Run one real request</div>
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-400">
            Trigger any normal model call in that same app. LLMTap captures it automatically and the first trace should
            appear here in a few seconds.
          </p>
          <div className="mt-3 flex items-start justify-between gap-3 rounded-2xl border border-white/6 bg-black/35 p-3">
            <pre className="overflow-x-auto text-xs leading-relaxed text-emerald-200">{current.requestCode}</pre>
            <CopyCodeButton label="request" text={current.requestCode} copied={copied} onCopy={copy} />
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <div className="surface-muted rounded-2xl p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
            <FolderCode className="h-4 w-4 text-sky-300" />
            Where this code usually goes
          </div>
          <div className="grid gap-2 text-sm text-slate-400 sm:grid-cols-2">
            <div className="rounded-xl border border-white/6 bg-white/4 px-3 py-2">
              Next.js route or server action
            </div>
            <div className="rounded-xl border border-white/6 bg-white/4 px-3 py-2">
              Express / Fastify backend file
            </div>
            <div className="rounded-xl border border-white/6 bg-white/4 px-3 py-2">
              Agent runner or worker script
            </div>
            <div className="rounded-xl border border-white/6 bg-white/4 px-3 py-2">
              CLI script already calling the provider
            </div>
          </div>
        </div>

        <div className="surface-muted rounded-2xl p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
            <SearchCheck className="h-4 w-4 text-emerald-300" />
            How to know it worked
          </div>
          <div className="space-y-2 text-sm text-slate-400">
            <div className="rounded-xl border border-white/6 bg-white/4 px-3 py-2">
              A new trace appears in the Overview or Traces page.
            </div>
            <div className="rounded-xl border border-white/6 bg-white/4 px-3 py-2">
              Token, cost, and latency numbers start changing.
            </div>
            <div className="rounded-xl border border-white/6 bg-white/4 px-3 py-2">
              If nothing appears, run <code className="rounded bg-white/6 px-1.5 py-0.5 font-mono text-slate-300">npx llmtap doctor</code>.
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-400">
        <span className="status-chip border-emerald-400/12 bg-emerald-400/8 text-emerald-100">
          <Terminal className="h-3.5 w-3.5" />
          Collector + dashboard start automatically
        </span>
        <span className="status-chip border-sky-400/12 bg-sky-400/8 text-sky-100">
          <Play className="h-3.5 w-3.5" />
          One real request is enough to validate the setup
        </span>
      </div>
    </div>
  );
}
