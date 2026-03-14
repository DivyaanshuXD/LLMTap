import { Fragment, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronRight,
  CircleCheck,
  CircleX,
  Clock,
  Code,
  Coins,
  Copy,
  Download,
  FileText,
  Hash,
  Image as ImageIcon,
  Layers,
  Loader2,
  MessageSquare,
  Orbit,
  Play,
  Terminal,
  Wrench,
  Zap,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { fetchTraceSpans, replaySpan } from "../api/client.ts";
import type { Span, Message, ContentPart, ReplayResult } from "../api/client.ts";
import { LivePulse } from "../components/LivePulse.tsx";
import { PageFrame } from "../components/PageFrame.tsx";
import { formatCost, formatDuration } from "../lib/format.ts";

interface SpanNode {
  span: Span;
  children: SpanNode[];
}

function buildSpanTree(spans: Span[]): SpanNode[] {
  const nodes = new Map<string, SpanNode>();
  const roots: SpanNode[] = [];

  for (const span of spans) {
    nodes.set(span.spanId, { span, children: [] });
  }

  for (const span of spans) {
    const node = nodes.get(span.spanId);
    if (!node) continue;
    if (span.parentSpanId && nodes.has(span.parentSpanId)) {
      nodes.get(span.parentSpanId)?.children.push(node);
    } else {
      roots.push(node);
    }
  }

  const sortNodes = (items: SpanNode[]) => {
    items.sort((left, right) => left.span.startTime - right.span.startTime);
    for (const item of items) sortNodes(item.children);
  };

  sortNodes(roots);
  return roots;
}

function countDescendants(node: SpanNode): number {
  return node.children.reduce((sum, child) => sum + 1 + countDescendants(child), 0);
}

function useCopy() {
  const [copied, setCopied] = useState<string | null>(null);
  function copy(text: string, label: string) {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  }
  return { copied, copy };
}

function CopyButton({ text, label, copied, onCopy }: { text: string; label: string; copied: string | null; onCopy: (text: string, label: string) => void }) {
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onCopy(text, label); }}
      className="rounded-lg border border-white/8 bg-white/4 p-1.5 text-slate-500 transition-colors hover:text-white"
      title="Copy to clipboard"
    >
      {copied === label ? <Check className="h-3 w-3 text-emerald-300" /> : <Copy className="h-3 w-3" />}
    </button>
  );
}

function ProviderBadge({ provider }: { provider: string }) {
  const styles: Record<string, string> = {
    openai: "bg-emerald-400/12 text-emerald-200 border-emerald-400/20",
    anthropic: "bg-amber-300/12 text-amber-200 border-amber-300/20",
    google: "bg-sky-400/12 text-sky-200 border-sky-400/20",
    deepseek: "bg-cyan-400/12 text-cyan-200 border-cyan-400/20",
    groq: "bg-fuchsia-400/12 text-fuchsia-200 border-fuchsia-400/20",
  };

  return (
    <span
      className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${
        styles[provider] ?? "border-white/10 bg-white/8 text-slate-300"
      }`}
    >
      {provider}
    </span>
  );
}

function MetaCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Clock;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/4 p-4">
      <div className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <div className="font-mono text-sm font-semibold text-slate-100">{value}</div>
    </div>
  );
}

function RoleBadge({ role, type }: { role: string; type: "input" | "output" }) {
  const roleStyles: Record<string, string> = {
    system: "bg-purple-400/10 text-purple-200 border-purple-400/16",
    user: "bg-sky-400/10 text-sky-200 border-sky-400/16",
    assistant: "bg-emerald-400/10 text-emerald-200 border-emerald-400/16",
    tool: "bg-amber-300/10 text-amber-200 border-amber-300/16",
    function: "bg-amber-300/10 text-amber-200 border-amber-300/16",
  };

  const fallback =
    type === "input"
      ? "bg-sky-400/10 text-sky-200 border-sky-400/16"
      : "bg-emerald-400/10 text-emerald-200 border-emerald-400/16";

  return (
    <span
      className={`rounded-full border px-2.5 py-1 text-[10px] font-bold capitalize tracking-[0.16em] ${roleStyles[role] ?? fallback}`}
    >
      {role}
    </span>
  );
}

function getTextContent(content: string | ContentPart[] | null): string {
  if (!content) return "";
  if (typeof content === "string") return content;
  return content
    .filter((p): p is ContentPart & { text: string } => p.type === "text" && !!p.text)
    .map((p) => p.text)
    .join("\n");
}

function hasImages(content: string | ContentPart[] | null): boolean {
  if (!content || typeof content === "string") return false;
  return content.some((p) => p.type === "image_url" || p.type === "image");
}

function getImageUrls(content: ContentPart[]): string[] {
  return content
    .map((p) => {
      if (p.type === "image_url" && p.image_url?.url) return p.image_url.url;
      if (p.type === "image" && p.source?.data) {
        return `data:${p.source.media_type || "image/png"};base64,${p.source.data}`;
      }
      return null;
    })
    .filter((u): u is string => {
      if (!u) return false;
      // Only allow safe URL protocols
      if (u.startsWith("data:image/")) return true;
      try {
        const parsed = new URL(u);
        return parsed.protocol === "http:" || parsed.protocol === "https:";
      } catch {
        return false;
      }
    });
}

function estimateTokens(content: string | ContentPart[] | null): number {
  const text = getTextContent(content);
  let tokens = text ? Math.ceil(text.length / 4) : 0;
  if (content && typeof content !== "string") {
    const imageCount = content.filter((p) => p.type === "image_url" || p.type === "image").length;
    tokens += imageCount * 85; // ~85 tokens per image (low-detail estimate)
  }
  return tokens;
}

function MessageBlock({ message, type, copied, onCopy }: { message: Message; type: "input" | "output"; copied: string | null; onCopy: (text: string, label: string) => void }) {
  const rawContent = message.content;
  const text = getTextContent(rawContent);
  const images = rawContent && typeof rawContent !== "string" ? getImageUrls(rawContent) : [];
  const borderClass =
    type === "input" ? "border-white/8" : "border-emerald-400/10";
  const copyId = `msg-${type}-${message.role}-${text.slice(0, 20)}`;

  return (
    <div className={`rounded-2xl border ${borderClass} bg-white/4 p-4`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <RoleBadge role={message.role} type={type} />
          {message.name && (
            <span className="font-mono text-[10px] text-slate-500">{message.name}</span>
          )}
          {images.length > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full border border-purple-400/16 bg-purple-400/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-purple-200">
              <ImageIcon className="h-2.5 w-2.5" />
              {images.length} image{images.length > 1 ? "s" : ""}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] text-slate-600">
            ~{estimateTokens(rawContent)} tok
          </span>
          {text && (
            <CopyButton text={text} label={copyId} copied={copied} onCopy={onCopy} />
          )}
        </div>
      </div>
      {text && (
        <pre className="mt-2.5 whitespace-pre-wrap font-mono text-xs leading-relaxed text-slate-200">
          {renderContentWithCodeBlocks(text)}
        </pre>
      )}
      {images.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-2">
          {images.map((url, i) => (
            <a
              key={i}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative overflow-hidden rounded-lg border border-white/10 bg-slate-950/60 transition-colors hover:border-white/20"
            >
              <img
                src={url}
                alt={`Image ${i + 1}`}
                className="max-h-48 max-w-64 object-contain"
                loading="lazy"
              />
              <span className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                <span className="text-[10px] font-bold uppercase tracking-widest text-white">Open</span>
              </span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

function SpanDetailPanel({ span, copied, onCopy }: { span: Span; copied: string | null; onCopy: (text: string, label: string) => void }) {
  const inputCount = span.inputMessages?.length ?? 0;
  const outputCount = span.outputMessages?.length ?? 0;
  const [inputCollapsed, setInputCollapsed] = useState(inputCount > 3);
  const [outputCollapsed, setOutputCollapsed] = useState(outputCount > 3);

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2 }}
      className="overflow-hidden"
    >
      <div className="mx-4 mb-4 space-y-5 rounded-[24px] border border-white/8 bg-[linear-gradient(180deg,rgba(8,15,28,0.96),rgba(4,8,18,0.98))] p-5 text-sm">
        <div className="flex items-center justify-between gap-2">
          <div className="grid flex-1 grid-cols-2 gap-3 md:grid-cols-4">
            <MetaCard icon={Hash} label="Model" value={span.responseModel ?? span.requestModel ?? "-"} />
            <MetaCard icon={Layers} label="Tokens" value={`${span.inputTokens} in / ${span.outputTokens} out`} />
            <MetaCard icon={Coins} label="Cost" value={formatCost(span.totalCost)} />
            <MetaCard icon={Clock} label="Duration" value={span.duration ? formatDuration(span.duration) : "-"} />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <CopyButton text={span.spanId} label="spanId" copied={copied} onCopy={onCopy} />
          <span className="font-mono text-[10px] text-slate-500">span: {span.spanId.slice(0, 12)}...</span>
          {span.sessionId && (
            <>
              <span className="text-slate-600">|</span>
              <span className="font-mono text-[10px] text-slate-500">session: {span.sessionId}</span>
            </>
          )}
          {span.temperature !== undefined && (
            <>
              <span className="text-slate-600">|</span>
              <span className="font-mono text-[10px] text-slate-500">temp: {span.temperature}</span>
            </>
          )}
          {span.topP !== undefined && (
            <>
              <span className="text-slate-600">|</span>
              <span className="font-mono text-[10px] text-slate-500">top_p: {span.topP}</span>
            </>
          )}
          {span.maxTokens !== undefined && (
            <>
              <span className="text-slate-600">|</span>
              <span className="font-mono text-[10px] text-slate-500">max_tokens: {span.maxTokens}</span>
            </>
          )}
        </div>

        {span.status === "error" && (
          <div className="rounded-2xl border border-rose-400/18 bg-rose-400/6 p-4">
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.16em] text-rose-300">
                <CircleX className="h-4 w-4" />
                {span.errorType ?? "error"}
              </div>
              {span.errorMessage && (
                <CopyButton text={span.errorMessage} label="error" copied={copied} onCopy={onCopy} />
              )}
            </div>
            <div className="font-mono text-xs leading-relaxed text-rose-200/70">
              {span.errorMessage}
            </div>
          </div>
        )}

        {span.inputMessages && span.inputMessages.length > 0 && (
          <div>
            <button
              type="button"
              onClick={() => setInputCollapsed((v) => !v)}
              className="mb-3 flex w-full items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500 transition-colors hover:text-slate-300"
            >
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${inputCollapsed ? "-rotate-90" : ""}`} />
              <MessageSquare className="h-3.5 w-3.5" />
              Input messages ({span.inputMessages.length})
            </button>
            {!inputCollapsed && (
              <div className="space-y-2">
                {span.inputMessages.map((message, index) => (
                  <MessageBlock
                    key={`in-${message.role}-${index}`}
                    message={message}
                    type="input"
                    copied={copied}
                    onCopy={onCopy}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {span.outputMessages && span.outputMessages.length > 0 && (
          <div>
            <button
              type="button"
              onClick={() => setOutputCollapsed((v) => !v)}
              className="mb-3 flex w-full items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500 transition-colors hover:text-slate-300"
            >
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${outputCollapsed ? "-rotate-90" : ""}`} />
              <MessageSquare className="h-3.5 w-3.5" />
              Output messages ({span.outputMessages.length})
            </button>
            {!outputCollapsed && (
              <div className="space-y-2">
                {span.outputMessages.map((message, index) => (
                  <MessageBlock
                    key={`out-${message.role}-${index}`}
                    message={message}
                    type="output"
                    copied={copied}
                    onCopy={onCopy}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {span.toolCalls && span.toolCalls.length > 0 && (
          <div>
            <div className="mb-3 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
              <Wrench className="h-3.5 w-3.5" />
              Tool calls ({span.toolCalls.length})
            </div>
            <div className="space-y-2">
              {span.toolCalls.map((toolCall) => (
                <div key={toolCall.id} className="rounded-2xl border border-amber-300/10 bg-white/4 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded-full border border-amber-300/16 bg-amber-300/10 px-2.5 py-1 text-[10px] font-bold tracking-[0.16em] text-amber-200">
                      {toolCall.name}
                    </span>
                    <CopyButton
                      text={toolCall.arguments}
                      label={`tool-${toolCall.id}`}
                      copied={copied}
                      onCopy={onCopy}
                    />
                  </div>
                  <pre className="mt-2.5 overflow-x-auto font-mono text-xs leading-relaxed text-slate-200">
                    {formatJSON(toolCall.arguments)}
                  </pre>
                  {toolCall.result && (
                    <>
                      <div className="my-2 border-t border-white/6" />
                      <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-600">
                        Result
                      </div>
                      <pre className="overflow-x-auto font-mono text-xs leading-relaxed text-slate-300">
                        {toolCall.result}
                      </pre>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function formatJSON(str: string): string {
  try {
    return JSON.stringify(JSON.parse(str), null, 2);
  } catch {
    return str;
  }
}

function generateCurlCommand(span: Span): string {
  const provider = span.providerName?.toLowerCase() ?? "";
  const model = span.requestModel ?? span.responseModel ?? "unknown";
  const messages = (span.inputMessages ?? []).map((m) => ({
    role: m.role,
    content: typeof m.content === "string" ? m.content : (m.content ?? ""),
  }));

  const payload = JSON.stringify({ model, messages });
  const escaped = payload.replace(/'/g, "'\\''");

  if (provider === "openai") {
    return `curl https://api.openai.com/v1/chat/completions \\\n  -H "Authorization: Bearer $OPENAI_API_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '${escaped}'`;
  }

  if (provider === "anthropic") {
    const anthropicPayload = JSON.stringify({
      model,
      max_tokens: span.maxTokens ?? 1024,
      messages: messages.filter((m) => m.role !== "system"),
      ...(messages.find((m) => m.role === "system")
        ? { system: messages.find((m) => m.role === "system")!.content }
        : {}),
    });
    const anthropicEscaped = anthropicPayload.replace(/'/g, "'\\''");
    return `curl https://api.anthropic.com/v1/messages \\\n  -H "x-api-key: $ANTHROPIC_API_KEY" \\\n  -H "anthropic-version: 2023-06-01" \\\n  -H "Content-Type: application/json" \\\n  -d '${anthropicEscaped}'`;
  }

  if (provider === "google") {
    return `curl "https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=$GOOGLE_API_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '${escaped}'`;
  }

  return `curl https://api.example.com/v1/chat/completions \\\n  -H "Authorization: Bearer $API_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '${escaped}'`;
}

function generateTraceMarkdown(traceId: string, spans: Span[], totalTokens: number, totalCost: number, totalRange: number, hasError: boolean): string {
  const lines: string[] = [];
  lines.push(`# Trace Report`);
  lines.push("");
  lines.push(`**Trace ID:** \`${traceId}\``);
  lines.push(`**Status:** ${hasError ? "Error" : "Stable"}`);
  lines.push(`**Total Spans:** ${spans.length}`);
  lines.push(`**Total Tokens:** ${totalTokens.toLocaleString()}`);
  lines.push(`**Total Cost:** ${formatCost(totalCost)}`);
  lines.push(`**Duration:** ${formatDuration(totalRange)}`);
  lines.push("");
  lines.push("---");
  lines.push("");

  for (const span of spans) {
    lines.push(`## Span: ${span.name}`);
    lines.push("");
    lines.push(`| Field | Value |`);
    lines.push(`|-------|-------|`);
    lines.push(`| Span ID | \`${span.spanId}\` |`);
    lines.push(`| Provider | ${span.providerName} |`);
    lines.push(`| Model | ${span.responseModel ?? span.requestModel ?? "-"} |`);
    lines.push(`| Operation | ${span.operationName} |`);
    lines.push(`| Tokens | ${span.inputTokens} in / ${span.outputTokens} out |`);
    lines.push(`| Cost | ${formatCost(span.totalCost)} |`);
    lines.push(`| Duration | ${span.duration ? formatDuration(span.duration) : "-"} |`);
    lines.push(`| Status | ${span.status} |`);
    lines.push("");

    if (span.inputMessages && span.inputMessages.length > 0) {
      lines.push(`### Input Messages`);
      lines.push("");
      for (const msg of span.inputMessages) {
        lines.push(`**[${msg.role}]${msg.name ? ` (${msg.name})` : ""}**`);
        lines.push("");
        lines.push(getTextContent(msg.content) || "_empty_");
        if (hasImages(msg.content)) lines.push(`\n_[${getImageUrls(msg.content as ContentPart[]).length} image(s) attached]_`);
        lines.push("");
      }
    }

    if (span.outputMessages && span.outputMessages.length > 0) {
      lines.push(`### Output Messages`);
      lines.push("");
      for (const msg of span.outputMessages) {
        lines.push(`**[${msg.role}]${msg.name ? ` (${msg.name})` : ""}**`);
        lines.push("");
        lines.push(getTextContent(msg.content) || "_empty_");
        if (hasImages(msg.content)) lines.push(`\n_[${getImageUrls(msg.content as ContentPart[]).length} image(s) attached]_`);
        lines.push("");
      }
    }

    if (span.toolCalls && span.toolCalls.length > 0) {
      lines.push(`### Tool Calls`);
      lines.push("");
      for (const tc of span.toolCalls) {
        lines.push(`**${tc.name}** (\`${tc.id}\`)`);
        lines.push("");
        lines.push("```json");
        lines.push(formatJSON(tc.arguments));
        lines.push("```");
        if (tc.result) {
          lines.push("");
          lines.push("Result:");
          lines.push("```");
          lines.push(tc.result);
          lines.push("```");
        }
        lines.push("");
      }
    }

    lines.push("---");
    lines.push("");
  }

  return lines.join("\n");
}

function renderContentWithCodeBlocks(content: string): ReactNode {
  const codeBlockRegex = /```(\w*)\n?([\s\S]*?)```/g;
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push(
        <span key={key++}>{content.slice(lastIndex, match.index)}</span>
      );
    }

    const lang = match[1] || "";
    const code = match[2];

    parts.push(
      <span key={key++} className="my-1.5 block rounded-lg border border-white/8 bg-slate-950/80 px-3 py-2">
        {lang && (
          <span className="mb-1 flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
            <Code className="h-3 w-3" />
            {lang}
          </span>
        )}
        <span className="block font-mono text-[11px] leading-relaxed text-emerald-200/80">
          {code}
        </span>
      </span>
    );

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    parts.push(<span key={key++}>{content.slice(lastIndex)}</span>);
  }

  if (parts.length === 0) return content;
  return parts;
}

export default function TraceDetail() {
  const { traceId } = useParams<{ traceId: string }>();
  const [selectedSpanId, setSelectedSpanId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const { copied, copy } = useCopy();
  const [replayOpen, setReplayOpen] = useState(false);
  const [replayApiKey, setReplayApiKey] = useState("");
  const [replayLoading, setReplayLoading] = useState(false);
  const [replayResult, setReplayResult] = useState<ReplayResult | null>(null);
  const [replayError, setReplayError] = useState<string | null>(null);
  const [replaySpanId, setReplaySpanId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["trace", traceId],
    queryFn: () => fetchTraceSpans(traceId!),
    enabled: !!traceId,
  });

  const spans = data?.spans ?? [];
  const tree = useMemo(() => buildSpanTree(spans), [spans]);
  const minTime = spans.length > 0 ? Math.min(...spans.map((span) => span.startTime)) : 0;
  const maxTime =
    spans.length > 0 ? Math.max(...spans.map((span) => span.endTime ?? span.startTime)) : 0;
  const totalRange = maxTime - minTime || 1;
  const totalTokens = spans.reduce((sum, span) => sum + span.totalTokens, 0);
  const totalCost = spans.reduce((sum, span) => sum + span.totalCost, 0);
  const hasError = spans.some((span) => span.status === "error");

  function handleExportTrace() {
    const blob = new Blob([JSON.stringify(spans, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `trace-${traceId?.slice(0, 12)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function handleReplay() {
    if (!replaySpanId || !replayApiKey.trim()) return;
    setReplayLoading(true);
    setReplayError(null);
    setReplayResult(null);
    try {
      const result = await replaySpan(replaySpanId, replayApiKey.trim());
      setReplayResult(result);
    } catch (err) {
      setReplayError(err instanceof Error ? err.message : String(err));
    } finally {
      setReplayLoading(false);
    }
  }

  function openReplay(spanId: string) {
    setReplaySpanId(spanId);
    setReplayOpen(true);
    setReplayResult(null);
    setReplayError(null);
  }

  const renderNode = (node: SpanNode, depth = 0): ReactNode => {
    const isSelected = node.span.spanId === selectedSpanId;
    const hasChildren = node.children.length > 0;
    const isCollapsed = collapsed[node.span.spanId] ?? false;
    const left = ((node.span.startTime - minTime) / totalRange) * 100;
    const width = Math.max(
      (((node.span.endTime ?? node.span.startTime) - node.span.startTime) / totalRange) * 100,
      1
    );

    return (
      <Fragment key={node.span.spanId}>
        <div className="border-t border-white/6 first:border-t-0">
          <div className="flex items-start gap-2 px-4 py-3 sm:px-5">
            <div className="flex items-center" style={{ paddingLeft: `${depth * 22}px` }}>
              {hasChildren ? (
                <button
                  type="button"
                  onClick={() =>
                    setCollapsed((current) => ({
                      ...current,
                      [node.span.spanId]: !current[node.span.spanId],
                    }))
                  }
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-white/8 bg-white/4 text-slate-400 transition-colors hover:text-white"
                >
                  <ChevronRight className={`h-4 w-4 transition-transform ${isCollapsed ? "" : "rotate-90"}`} />
                </button>
              ) : (
                <span className="flex h-8 w-8 items-center justify-center rounded-full border border-white/8 bg-white/4 text-slate-500">
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-500" />
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={() => setSelectedSpanId(isSelected ? null : node.span.spanId)}
              className={`grid min-w-0 flex-1 gap-3 rounded-[22px] px-3 py-3 text-left transition-colors sm:grid-cols-[minmax(0,320px)_minmax(0,1fr)_88px] sm:items-center ${
                isSelected ? "bg-white/8" : "hover:bg-white/4"
              }`}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  <span className="relative flex h-3.5 w-3.5 items-center justify-center">
                    <span
                      className={`absolute inset-0 rounded-full ${
                        node.span.status === "error" ? "bg-rose-400/25" : "bg-emerald-400/25"
                      }`}
                    />
                    <span
                      className={`relative h-2 w-2 rounded-full ${
                        node.span.status === "error" ? "bg-rose-400" : "bg-emerald-300"
                      }`}
                    />
                  </span>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-white">{node.span.name}</div>
                    <div className="mt-1 flex flex-wrap items-center gap-2.5">
                      <ProviderBadge provider={node.span.providerName} />
                      <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-slate-500">
                        {node.span.operationName}
                      </span>
                      {hasChildren ? (
                        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-slate-500">
                          {countDescendants(node)} child
                          {countDescendants(node) === 1 ? "" : "ren"}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>

              <div className="min-w-0">
                <div className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-[0.16em] text-slate-500">
                  <span>{Math.round(node.span.startTime - minTime)}ms</span>
                  <span>{node.span.duration ? formatDuration(node.span.duration) : "instant"}</span>
                </div>
                <div className="relative h-8 overflow-hidden rounded-full bg-slate-950/90">
                  <motion.div
                    className={`absolute bottom-1 top-1 rounded-full ${
                      node.span.status === "error"
                        ? "bg-[linear-gradient(90deg,#fb7185,#f97316)]"
                        : "bg-[linear-gradient(90deg,#34d399,#38bdf8)]"
                    }`}
                    style={{ left: `${left}%`, minWidth: "6px" }}
                    initial={{ width: 0 }}
                    animate={{ width: `${width}%` }}
                  />
                </div>
              </div>

              <div className="text-right font-mono text-[11px] text-slate-400">
                <div className="text-slate-200">{formatCost(node.span.totalCost)}</div>
                <div>{node.span.totalTokens.toLocaleString()} tok</div>
              </div>
            </button>
          </div>
        </div>

        <AnimatePresence>
          {isSelected ? <SpanDetailPanel span={node.span} copied={copied} onCopy={copy} /> : null}
        </AnimatePresence>
        {!isCollapsed && node.children.map((child) => renderNode(child, depth + 1))}
      </Fragment>
    );
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-[1500px] space-y-6">
        <div className="skeleton-panel h-44 rounded-[28px]" />
        <div className="skeleton-panel h-28 rounded-[24px]" />
        <div className="skeleton-panel h-72 rounded-[24px]" />
      </div>
    );
  }

  return (
    <PageFrame
      eyebrow="Trace Console"
      title={traceId ? `Trace ${traceId.slice(0, 12)}...` : "Trace detail"}
      description="Inspect the nested execution tree, timing offsets, token pressure, and payloads for a single trace without losing the operator surface."
      aside={
        <div className="insight-panel">
          <LivePulse />
          <div className="mt-4 space-y-3">
            <div className="rounded-2xl border border-white/8 bg-white/4 p-4">
              <div className="hud-label">Current status</div>
              <div className="mt-2 flex items-center gap-2 text-base font-medium text-white">
                {hasError ? (
                  <>
                    <CircleX className="h-4 w-4 text-rose-300" />
                    Error state
                  </>
                ) : (
                  <>
                    <CircleCheck className="h-4 w-4 text-emerald-300" />
                    Stable
                  </>
                )}
              </div>
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/4 p-4">
              <div className="hud-label">Hierarchy</div>
              <div className="mt-2 text-base font-medium text-white">{tree.length} root spans</div>
              <div className="mt-1 text-sm text-slate-400">
                {formatDuration(totalRange)} elapsed from first to last event
              </div>
            </div>
          </div>
        </div>
      }
    >
      <div className="flex items-center justify-between gap-2 text-sm">
        <div className="flex items-center gap-2">
          <Link to="/" className="status-chip transition-colors hover:text-white">
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to overview</span>
          </Link>
          <span className="truncate font-mono text-xs text-slate-500">{traceId}</span>
          <CopyButton text={traceId ?? ""} label="traceId" copied={copied} onCopy={copy} />
        </div>
        <div className="flex items-center gap-2">
          {spans.length > 0 && (
            <button
              type="button"
              onClick={() => {
                const primarySpan = spans[0];
                copy(generateCurlCommand(primarySpan), "curl");
              }}
              className="status-chip transition-colors hover:border-white/16 hover:bg-white/8"
            >
              {copied === "curl" ? <Check className="h-3.5 w-3.5 text-emerald-300" /> : <Terminal className="h-3.5 w-3.5" />}
              <span>{copied === "curl" ? "Copied!" : "Copy as cURL"}</span>
            </button>
          )}
          {spans.length > 0 && (
            <button
              type="button"
              onClick={() => {
                copy(generateTraceMarkdown(traceId ?? "", spans, totalTokens, totalCost, totalRange, hasError), "markdown");
              }}
              className="status-chip transition-colors hover:border-white/16 hover:bg-white/8"
            >
              {copied === "markdown" ? <Check className="h-3.5 w-3.5 text-emerald-300" /> : <FileText className="h-3.5 w-3.5" />}
              <span>{copied === "markdown" ? "Copied!" : "Copy as Markdown"}</span>
            </button>
          )}
          <button
            type="button"
            onClick={handleExportTrace}
            className="status-chip transition-colors hover:border-white/16 hover:bg-white/8"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export JSON</span>
          </button>
          {spans.length > 0 && (
            <button
              type="button"
              onClick={() => openReplay(spans[0].spanId)}
              className="status-chip border-emerald-400/20 bg-emerald-400/8 transition-colors hover:border-emerald-400/30 hover:bg-emerald-400/14"
            >
              <Play className="h-3.5 w-3.5 text-emerald-300" />
              <span>Replay</span>
            </button>
          )}
        </div>
      </div>

      <div className="dashboard-shell rounded-[26px] px-5 py-5">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
          <MetaCard icon={Layers} label="Spans" value={String(spans.length)} />
          <MetaCard icon={Zap} label="Tokens" value={totalTokens.toLocaleString()} />
          <MetaCard icon={Coins} label="Cost" value={formatCost(totalCost)} />
          <MetaCard icon={Clock} label="Duration" value={spans.length > 0 ? formatDuration(totalRange) : "-"} />
          <MetaCard icon={Orbit} label="Status" value={hasError ? "Error" : "Stable"} />
        </div>
      </div>

      <div className="dashboard-shell overflow-hidden rounded-[26px]">
        <div className="flex items-center gap-2.5 border-b border-white/6 px-5 py-4">
          <Clock className="h-4 w-4 text-sky-300" />
          <h2 className="text-xl font-semibold tracking-[-0.04em] text-white">
            Trace hierarchy
          </h2>
          <span className="ml-auto text-xs font-mono tracking-[0.18em] text-slate-500">
            {formatDuration(totalRange)} total
          </span>
        </div>

        {tree.length > 0 ? (
          <div className="py-2">{tree.map((node) => renderNode(node))}</div>
        ) : (
          <div className="empty-state h-[280px]">
            <Layers className="h-8 w-8 text-slate-500" />
            <div className="text-base font-medium text-white">No spans found for this trace</div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {replayOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
              onClick={() => setReplayOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", bounce: 0.15, duration: 0.4 }}
              className="fixed left-1/2 top-1/2 z-50 w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(12,18,32,0.98),rgba(4,8,18,0.99))] p-6 shadow-[0_40px_100px_rgba(0,0,0,0.5)]"
            >
              <div className="mb-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-400/8">
                    <Play className="h-4.5 w-4.5 text-emerald-300" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">Trace Replay</h3>
                    <p className="text-xs text-slate-500">Re-send the same prompts and compare responses</p>
                  </div>
                </div>
                <button
                  onClick={() => setReplayOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/8 bg-white/5 text-slate-400 transition-colors hover:text-white"
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
              </div>

              {!replayResult && !replayLoading && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-amber-400/20 bg-amber-500/8 p-3 text-xs text-amber-200/80">
                    Your API key is sent directly to the provider and is never stored by LLMTap.
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-400">Provider API Key</label>
                    <input
                      type="password"
                      value={replayApiKey}
                      onChange={(e) => setReplayApiKey(e.target.value)}
                      placeholder="sk-... or anthropic key"
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:border-emerald-400/30 focus:outline-none"
                    />
                  </div>
                  {replayError && (
                    <div className="rounded-xl border border-rose-400/20 bg-rose-500/8 p-3 text-sm text-rose-200">
                      {replayError}
                    </div>
                  )}
                  <button
                    type="button"
                    disabled={!replayApiKey.trim()}
                    onClick={handleReplay}
                    className="w-full rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Send Replay Request
                  </button>
                </div>
              )}

              {replayLoading && (
                <div className="flex flex-col items-center gap-3 py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-emerald-300" />
                  <p className="text-sm text-slate-400">Replaying against {spans[0]?.providerName} API...</p>
                </div>
              )}

              {replayResult && (() => {
                const originalSpan = spans.find((s) => s.spanId === replaySpanId) ?? spans[0];
                const originalOutput = originalSpan?.outputMessages
                  ?.map((m) => getTextContent(m.content))
                  .join("\n") ?? "";
                return (
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div className="rounded-xl border border-white/8 bg-white/4 p-3">
                        <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Tokens</div>
                        <div className="mt-1 font-mono text-sm text-white">
                          {originalSpan.totalTokens} <span className="text-slate-500">vs</span> {replayResult.totalTokens}
                        </div>
                      </div>
                      <div className="rounded-xl border border-white/8 bg-white/4 p-3">
                        <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Duration</div>
                        <div className="mt-1 font-mono text-sm text-white">
                          {formatDuration(originalSpan.duration ?? 0)} <span className="text-slate-500">vs</span> {formatDuration(replayResult.duration)}
                        </div>
                      </div>
                      <div className="rounded-xl border border-white/8 bg-white/4 p-3">
                        <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Model</div>
                        <div className="mt-1 truncate font-mono text-xs text-white">{replayResult.responseModel}</div>
                      </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      <div>
                        <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Original Response</div>
                        <div className="max-h-[300px] overflow-y-auto rounded-xl border border-white/8 bg-white/4 p-3 text-sm leading-6 text-slate-300">
                          {originalOutput || <span className="text-slate-600">No content captured</span>}
                        </div>
                      </div>
                      <div>
                        <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-400/80">Replay Response</div>
                        <div className="max-h-[300px] overflow-y-auto rounded-xl border border-emerald-400/12 bg-emerald-400/4 p-3 text-sm leading-6 text-slate-300">
                          {replayResult.content || <span className="text-slate-600">Empty response</span>}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => { setReplayResult(null); setReplayError(null); }}
                        className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-slate-300 transition-colors hover:bg-white/10"
                      >
                        Replay Again
                      </button>
                      <button
                        type="button"
                        onClick={() => setReplayOpen(false)}
                        className="flex-1 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-400"
                      >
                        Done
                      </button>
                    </div>
                  </div>
                );
              })()}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </PageFrame>
  );
}
