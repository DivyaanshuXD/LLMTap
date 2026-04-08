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
import { toast } from "sonner";
import { fetchTraceSpans, replaySpan } from "../api/client.ts";
import type { Span, Message, ContentPart, ReplayResult } from "../api/client.ts";
import { LivePulse } from "../components/LivePulse.tsx";
import { PageFrame } from "../components/PageFrame.tsx";
import { EmptyState } from "../components/system/EmptyState.tsx";
import { formatCost, formatDuration } from "../lib/format.ts";
import { getTextContent } from "../lib/content.ts";
import { ProviderBadge } from "../components/ProviderBadge.tsx";
import { StatusDot } from "../components/StatusDot.tsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../components/ui/dialog.tsx";

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
    toast.success("Copied to clipboard", {
      description: `${label} copied successfully.`,
    });
    setTimeout(() => setCopied(null), 2000);
  }
  return { copied, copy };
}

function CopyButton({ text, label, copied, onCopy }: { text: string; label: string; copied: string | null; onCopy: (text: string, label: string) => void }) {
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onCopy(text, label); }}
      className="rounded-lg border border-[var(--border-dim)] bg-[rgba(var(--ch-text-primary),0.035)] p-1.5 text-[var(--color-text-tertiary)] transition-colors hover:border-[var(--border-default)] hover:text-[var(--color-text-primary)]"
      title="Copy to clipboard"
    >
      {copied === label ? <Check className="h-3 w-3 text-[var(--color-accent)]" /> : <Copy className="h-3 w-3" />}
    </button>
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
    <div className="deck-card h-full rounded-[calc(var(--radius-panel)+4px)] p-4">
      <div className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-text-tertiary)]">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <div
        className="text-[var(--color-text-primary)]"
        style={{
          fontFamily: "var(--font-operator)",
          fontSize: "28px",
          fontWeight: 700,
          lineHeight: "0.92",
          letterSpacing: "-0.04em",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function InlineMetric({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "success" | "danger";
}) {
  const toneClass =
    tone === "success"
      ? "border-[var(--color-accent)]/16 bg-[var(--color-accent)]/8 text-[var(--color-text-primary)]"
      : tone === "danger"
        ? "border-[var(--color-text-primary)]/16 bg-[var(--color-text-primary)]/8 text-[var(--color-text-primary)]"
        : "border-[var(--border-dim)] bg-[rgba(var(--ch-text-primary),0.035)] text-[var(--color-text-primary)]";

  return (
    <div className={`rounded-2xl border px-3 py-2 ${toneClass}`}>
      <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-text-tertiary)]">{label}</div>
      <div className="mt-1 font-mono text-xs font-semibold">{value}</div>
    </div>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  count,
  collapsed,
  onToggle,
}: {
  icon: typeof MessageSquare;
  title: string;
  count?: number;
  collapsed?: boolean;
  onToggle?: () => void;
}) {
  const content = (
    <>
      {onToggle ? (
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${collapsed ? "-rotate-90" : ""}`} />
      ) : null}
      <Icon className="h-3.5 w-3.5" />
      <span>{title}</span>
      {typeof count === "number" ? (
        <span className="rounded-full border border-[var(--border-dim)] bg-[rgba(var(--ch-text-primary),0.04)] px-2 py-0.5 font-mono text-[10px] text-[var(--color-text-secondary)]">
          {count}
        </span>
      ) : null}
    </>
  );

  if (onToggle) {
    return (
      <button
        type="button"
        onClick={onToggle}
        className="mb-3 flex w-full items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--color-text-tertiary)] transition-colors hover:text-[var(--color-text-secondary)]"
      >
        {content}
      </button>
    );
  }

  return (
    <div className="mb-3 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--color-text-tertiary)]">
      {content}
    </div>
  );
}

function RoleBadge({ role, type }: { role: string; type: "input" | "output" }) {
  const roleStyles: Record<string, string> = {
    system: "bg-[var(--color-panel)]/90 text-[var(--color-text-primary)] border-[var(--color-accent-2)]/16",
    user: "bg-[var(--color-accent)]/10 text-[var(--color-text-primary)] border-[var(--color-accent)]/16",
    assistant: "bg-[var(--color-accent-2)]/10 text-[var(--color-accent)] border-[var(--color-accent-2)]/16",
    tool: "bg-[var(--color-text-primary)]/10 text-[var(--color-text-primary)] border-[var(--color-text-primary)]/16",
    function: "bg-[var(--color-text-primary)]/10 text-[var(--color-text-primary)] border-[var(--color-text-primary)]/16",
  };

  const fallback =
    type === "input"
      ? "bg-[var(--color-accent)]/10 text-[var(--color-text-primary)] border-[var(--color-accent)]/16"
      : "bg-[var(--color-accent-2)]/10 text-[var(--color-accent)] border-[var(--color-accent-2)]/16";

  return (
    <span
      className={`rounded-full border px-2.5 py-1 text-[10px] font-bold capitalize tracking-[0.16em] ${roleStyles[role] ?? fallback}`}
    >
      {role}
    </span>
  );
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
    type === "input" ? "border-[var(--border-dim)]" : "border-[var(--color-accent)]/12";
  const copyId = `msg-${type}-${message.role}-${text.slice(0, 20)}`;

  return (
    <div className={`rounded-2xl border ${borderClass} bg-[linear-gradient(180deg,rgba(var(--ch-bg-panel),0.68),rgba(var(--ch-bg-base),0.9))] p-4`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <RoleBadge role={message.role} type={type} />
          {message.name && (
            <span className="font-mono text-[10px] text-[var(--color-text-tertiary)]">{message.name}</span>
          )}
          {images.length > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full border border-[var(--color-accent-2)]/16 bg-[var(--color-panel)]/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--color-text-primary)]">
              <ImageIcon className="h-2.5 w-2.5" />
              {images.length} image{images.length > 1 ? "s" : ""}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] text-[var(--color-text-disabled)]">
            ~{estimateTokens(rawContent)} tok
          </span>
          {text && (
            <CopyButton text={text} label={copyId} copied={copied} onCopy={onCopy} />
          )}
        </div>
      </div>
      {text && (
        <pre className="mt-2.5 whitespace-pre-wrap font-mono text-xs leading-relaxed text-[var(--color-text-secondary)]">
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
              className="group relative overflow-hidden rounded-lg border border-[var(--border-dim)] bg-[rgba(var(--ch-bg-base),0.72)] transition-colors hover:border-[var(--border-default)]"
            >
              <img
                src={url}
                alt={`Image ${i + 1}`}
                className="max-h-48 max-w-64 object-contain"
                loading="lazy"
              />
              <span className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-primary)]">Open</span>
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
      initial={{ opacity: 0, gridTemplateRows: "0fr" }}
      animate={{ opacity: 1, gridTemplateRows: "1fr" }}
      exit={{ opacity: 0, gridTemplateRows: "0fr" }}
      transition={{ duration: 0.2 }}
      style={{ display: "grid" }}
    >
      <div className="overflow-hidden">
        <div className="mx-4 mb-4 rounded-[24px] border border-[var(--border-dim)] bg-[linear-gradient(180deg,rgba(var(--ch-bg-panel),0.92),rgba(var(--ch-bg-deep),0.97),rgba(var(--ch-bg-base),0.99))] p-5 text-sm shadow-[inset_0_1px_0_rgba(var(--ch-text-primary),0.04),0_26px_60px_rgba(0,0,0,0.22)]">
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-5">
              <div className="grid flex-1 grid-cols-2 gap-3 md:grid-cols-4">
                <MetaCard icon={Hash} label="Model" value={span.responseModel ?? span.requestModel ?? "-"} />
                <MetaCard icon={Layers} label="Tokens" value={`${span.inputTokens} in / ${span.outputTokens} out`} />
                <MetaCard icon={Coins} label="Cost" value={formatCost(span.totalCost)} />
                <MetaCard icon={Clock} label="Duration" value={span.duration ? formatDuration(span.duration) : "-"} />
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <InlineMetric label="Input msgs" value={String(inputCount)} />
                <InlineMetric label="Output msgs" value={String(outputCount)} />
                <InlineMetric label="Tool calls" value={String(span.toolCalls?.length ?? 0)} />
                <InlineMetric
                  label="Status"
                  value={span.status === "error" ? "Error" : "OK"}
                  tone={span.status === "error" ? "danger" : "success"}
                />
              </div>

              {span.status === "error" && (
                <div className="rounded-2xl border border-[var(--color-text-primary)]/18 bg-[var(--color-text-primary)]/6 p-4">
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.16em] text-[var(--color-text-primary)]">
                      <CircleX className="h-4 w-4" />
                      {span.errorType ?? "error"}
                    </div>
                    {span.errorMessage && (
                      <CopyButton text={span.errorMessage} label="error" copied={copied} onCopy={onCopy} />
                    )}
                  </div>
                  <div className="font-mono text-xs leading-relaxed text-[var(--color-text-primary)]/70">
                    {span.errorMessage}
                  </div>
                </div>
              )}

              {span.inputMessages && span.inputMessages.length > 0 && (
                <div>
                  <SectionHeader
                    icon={MessageSquare}
                    title="Input messages"
                    count={span.inputMessages.length}
                    collapsed={inputCollapsed}
                    onToggle={() => setInputCollapsed((value) => !value)}
                  />
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
                  <SectionHeader
                    icon={MessageSquare}
                    title="Output messages"
                    count={span.outputMessages.length}
                    collapsed={outputCollapsed}
                    onToggle={() => setOutputCollapsed((value) => !value)}
                  />
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
                  <SectionHeader icon={Wrench} title="Tool calls" count={span.toolCalls.length} />
                  <div className="space-y-2">
                    {span.toolCalls.map((toolCall) => (
                      <div key={toolCall.id} className="rounded-2xl border border-[var(--color-accent-2)]/10 bg-[linear-gradient(180deg,rgba(var(--ch-bg-panel),0.7),rgba(var(--ch-bg-base),0.86))] p-4">
                        <div className="flex items-center justify-between gap-2">
                          <span className="rounded-full border border-[var(--color-accent-2)]/16 bg-[var(--color-accent-2)]/10 px-2.5 py-1 text-[10px] font-bold tracking-[0.16em] text-[var(--color-accent)]">
                            {toolCall.name}
                          </span>
                          <CopyButton
                            text={toolCall.arguments}
                            label={`tool-${toolCall.id}`}
                            copied={copied}
                            onCopy={onCopy}
                          />
                        </div>
                        <pre className="mt-2.5 overflow-x-auto font-mono text-xs leading-relaxed text-[var(--color-text-secondary)]">
                          {formatJSON(toolCall.arguments)}
                        </pre>
                        {toolCall.result && (
                          <>
                            <div className="my-2 border-t border-[var(--border-dim)]" />
                            <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--color-text-disabled)]">
                              Result
                            </div>
                            <pre className="overflow-x-auto font-mono text-xs leading-relaxed text-[var(--color-text-secondary)]">
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

            <div className="space-y-4 xl:sticky xl:top-6 xl:self-start">
              <div className="rounded-2xl border border-[var(--border-dim)] bg-[linear-gradient(180deg,rgba(var(--ch-bg-panel),0.74),rgba(var(--ch-bg-base),0.9))] p-4">
                <div className="mb-3 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--color-text-tertiary)]">
                  <Orbit className="h-3.5 w-3.5" />
                  Span identity
                </div>
                <div className="space-y-3">
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-text-disabled)]">Span ID</div>
                    <div className="mt-1 flex items-center gap-2">
                      <code className="min-w-0 flex-1 truncate font-mono text-xs text-[var(--color-text-secondary)]">{span.spanId}</code>
                      <CopyButton text={span.spanId} label="spanId" copied={copied} onCopy={onCopy} />
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-text-disabled)]">Operation</div>
                    <div className="mt-1 text-sm text-[var(--color-text-secondary)]">{span.operationName}</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-text-disabled)]">Provider</div>
                    <div className="mt-1">
                      <ProviderBadge provider={span.providerName} />
                    </div>
                  </div>
                  {span.parentSpanId && (
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-text-disabled)]">Parent span</div>
                      <div className="mt-1 font-mono text-xs text-[var(--color-text-secondary)]">{span.parentSpanId}</div>
                    </div>
                  )}
                  {span.sessionId && (
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-text-disabled)]">Session</div>
                      <div className="mt-1 font-mono text-xs text-[var(--color-text-secondary)]">{span.sessionId}</div>
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-[var(--border-dim)] bg-[linear-gradient(180deg,rgba(var(--ch-bg-panel),0.74),rgba(var(--ch-bg-base),0.9))] p-4">
                <div className="mb-3 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--color-text-tertiary)]">
                  <Code className="h-3.5 w-3.5" />
                  Request config
                </div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                  <InlineMetric label="Request model" value={span.requestModel} />
                  <InlineMetric label="Response model" value={span.responseModel ?? span.requestModel ?? "-"} />
                  <InlineMetric label="Temperature" value={span.temperature !== undefined ? String(span.temperature) : "-"} />
                  <InlineMetric label="Top P" value={span.topP !== undefined ? String(span.topP) : "-"} />
                  <InlineMetric label="Max tokens" value={span.maxTokens !== undefined ? String(span.maxTokens) : "-"} />
                  <InlineMetric label="Started" value={new Date(span.startTime).toLocaleTimeString()} />
                </div>
              </div>
            </div>
          </div>
        </div>
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
      <span key={key++} className="my-1.5 block rounded-lg border border-[var(--border-dim)] bg-[rgba(var(--ch-bg-base),0.78)] px-3 py-2">
        {lang && (
          <span className="mb-1 flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--color-text-tertiary)]">
            <Code className="h-3 w-3" />
            {lang}
          </span>
        )}
        <span className="block font-mono text-[11px] leading-relaxed text-[var(--color-accent)]/80">
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
    toast.success("Trace exported", {
      description: "The full trace payload was downloaded as JSON.",
    });
  }

  async function handleReplay() {
    if (!replaySpanId || !replayApiKey.trim()) return;
    setReplayLoading(true);
    setReplayError(null);
    setReplayResult(null);
    try {
      const result = await replaySpan(replaySpanId, replayApiKey.trim());
      setReplayResult(result);
      toast.success("Replay complete", {
        description: `Received a fresh response from ${result.provider}.`,
      });
    } catch (err) {
      setReplayError(err instanceof Error ? err.message : String(err));
      toast.error("Replay failed", {
        description: err instanceof Error ? err.message : String(err),
      });
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
        <div className="border-t border-[var(--border-dim)] first:border-t-0">
          <div
            role="button"
            tabIndex={0}
            onClick={() => setSelectedSpanId(isSelected ? null : node.span.spanId)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                setSelectedSpanId(isSelected ? null : node.span.spanId);
              }
            }}
            className={`grid w-full gap-3 px-4 py-3 text-left transition-colors sm:grid-cols-[minmax(0,380px)_minmax(0,1fr)_110px] sm:items-center sm:px-5 ${
              isSelected ? "bg-[rgba(var(--ch-accent),0.06)]" : "hover:bg-[rgba(var(--ch-text-primary),0.03)]"
            }`}
          >
            <div className="min-w-0">
              <div
                className="flex min-w-0 items-start gap-3"
                style={{ paddingLeft: `${depth * 22}px` }}
              >
                {hasChildren ? (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setCollapsed((current) => ({
                        ...current,
                        [node.span.spanId]: !current[node.span.spanId],
                      }));
                    }}
                    className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[var(--border-dim)] bg-[rgba(var(--ch-text-primary),0.035)] text-[var(--color-text-tertiary)] transition-colors hover:border-[var(--border-default)] hover:text-[var(--color-text-primary)]"
                  >
                    <ChevronRight className={`h-4 w-4 transition-transform ${isCollapsed ? "" : "rotate-90"}`} />
                  </button>
                ) : (
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[var(--border-dim)] bg-[rgba(var(--ch-text-primary),0.03)] text-[var(--color-text-tertiary)]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-text-tertiary)]" />
                  </span>
                )}

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-3">
                    <StatusDot status={node.span.status} />
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-[var(--color-text-primary)]">{node.span.name}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-2.5">
                        <ProviderBadge provider={node.span.providerName} />
                        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--color-text-tertiary)]">
                          {node.span.operationName}
                        </span>
                        {hasChildren ? (
                          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--color-text-tertiary)]">
                            {countDescendants(node)} child
                            {countDescendants(node) === 1 ? "" : "ren"}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="min-w-0">
              <div className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-[0.16em] text-[var(--color-text-tertiary)]">
                <span>{Math.round(node.span.startTime - minTime)}ms</span>
                <span>{node.span.duration ? formatDuration(node.span.duration) : "instant"}</span>
              </div>
              <div className="relative h-8 overflow-hidden rounded-full bg-[rgba(var(--ch-bg-base),0.88)]">
                <motion.div
                  className={`absolute bottom-1 top-1 origin-left rounded-full ${
                    node.span.status === "error"
                      ? "bg-[linear-gradient(90deg,var(--color-text-primary),var(--color-accent-2))]"
                      : "bg-[linear-gradient(90deg,var(--color-accent-2),var(--color-accent))]"
                  }`}
                  style={{ left: `${left}%`, width: `${Math.max(width, 0.5)}%` }}
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                />
              </div>
            </div>

            <div className="text-right font-mono text-[11px] text-[var(--color-text-tertiary)]">
              <div className="text-[var(--color-text-secondary)]">{formatCost(node.span.totalCost)}</div>
              <div>{node.span.totalTokens.toLocaleString()} tok</div>
            </div>
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
      <div className="mx-auto max-w-[1760px] space-y-6">
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
            <div className="deck-card deck-card--accent">
              <div className="hud-label">Current status</div>
              <div className="mt-2 flex items-center gap-2 text-base font-medium text-[var(--color-text-primary)]">
                {hasError ? (
                  <>
                    <CircleX className="h-4 w-4 text-[var(--color-text-primary)]" />
                    Error state
                  </>
                ) : (
                  <>
                    <CircleCheck className="h-4 w-4 text-[var(--color-accent)]" />
                    Stable
                  </>
                )}
              </div>
            </div>
            <div className="deck-card">
              <div className="hud-label">Hierarchy</div>
              <div className="mt-2 text-lg font-medium text-[var(--color-text-primary)]">{tree.length} root spans</div>
              <div className="mt-2 text-sm text-[var(--color-text-secondary)]">
                {formatDuration(totalRange)} elapsed from first to last event
              </div>
            </div>
          </div>
        </div>
      }
    >
      <div className="pill-strip w-fit max-w-full overflow-x-auto">
        <span className="pill-item">
          trace <strong>{traceId?.slice(0, 10) ?? "unknown"}</strong>
        </span>
        <span className="pill-item">
          spans <strong>{spans.length}</strong>
        </span>
        <span className="pill-item">
          tokens <strong>{totalTokens}</strong>
        </span>
        <span className="pill-item">
          status <strong>{hasError ? "error" : "stable"}</strong>
        </span>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <Link to="/" className="status-chip transition-colors hover:border-[var(--border-default)] hover:bg-[rgba(var(--ch-accent),0.06)] hover:text-[var(--color-text-primary)]">
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to overview</span>
          </Link>
          <span className="truncate rounded-full border border-[var(--border-dim)] bg-[rgba(var(--ch-text-primary),0.04)] px-2.5 py-1 font-mono text-xs text-[var(--color-text-tertiary)]">{traceId}</span>
          <CopyButton text={traceId ?? ""} label="traceId" copied={copied} onCopy={copy} />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {spans.length > 0 && (
            <button
              type="button"
              onClick={() => {
                const primarySpan = spans[0];
                copy(generateCurlCommand(primarySpan), "curl");
              }}
              className="terminal-action"
            >
              {copied === "curl" ? <Check className="h-3.5 w-3.5 text-[var(--color-accent)]" /> : <Terminal className="h-3.5 w-3.5" />}
              <span>{copied === "curl" ? "Copied!" : "Copy as cURL"}</span>
            </button>
          )}
          {spans.length > 0 && (
            <button
              type="button"
              onClick={() => {
                copy(generateTraceMarkdown(traceId ?? "", spans, totalTokens, totalCost, totalRange, hasError), "markdown");
              }}
              className="terminal-action"
            >
              {copied === "markdown" ? <Check className="h-3.5 w-3.5 text-[var(--color-accent)]" /> : <FileText className="h-3.5 w-3.5" />}
              <span>{copied === "markdown" ? "Copied!" : "Copy as Markdown"}</span>
            </button>
          )}
          <button
            type="button"
            onClick={handleExportTrace}
            className="terminal-action"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export JSON</span>
          </button>
          {spans.length > 0 && (
            <button
              type="button"
              onClick={() => openReplay(spans[0].spanId)}
              className="terminal-action"
            >
              <Play className="h-3.5 w-3.5 text-[var(--color-accent)]" />
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
        <div className="flex flex-wrap items-center gap-3 border-b border-[var(--border-dim)] px-5 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl border border-[var(--color-accent)]/16 bg-[var(--color-accent)]/10">
            <Clock className="h-4 w-4 text-[var(--color-accent)]" />
          </div>
          <div>
            <div className="hud-label">Execution tree</div>
            <h2 className="page-section-title mt-1">
              Trace hierarchy
            </h2>
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-[var(--border-dim)] bg-[rgba(var(--ch-text-primary),0.04)] px-2.5 py-1 text-xs font-mono tracking-[0.16em] text-[var(--color-text-tertiary)]">
              {formatDuration(totalRange)} total
            </span>
            <span className="rounded-full border border-[var(--border-dim)] bg-[rgba(var(--ch-text-primary),0.04)] px-2.5 py-1 text-xs font-mono tracking-[0.16em] text-[var(--color-text-tertiary)]">
              {spans.length} spans
            </span>
          </div>
        </div>

        {tree.length > 0 ? (
          <div className="py-2">
            <div className="grid gap-3 border-b border-[var(--border-dim)] px-4 py-3 text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-tertiary)] sm:grid-cols-[minmax(0,380px)_minmax(0,1fr)_110px] sm:px-5">
              <span>Span</span>
              <span>Timeline</span>
              <span className="text-right">Spend / Tokens</span>
            </div>
            {tree.map((node) => renderNode(node))}
          </div>
        ) : (
          <EmptyState
            title="No spans found for this trace"
            description="This trace exists, but there are no captured span events to render in the execution tree yet."
            className="h-[280px]"
          />
        )}
      </div>

      <Dialog open={replayOpen} onOpenChange={(v) => !v && setReplayOpen(false)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[var(--color-accent)]/20 bg-[var(--color-accent)]/10">
                <Play className="h-4.5 w-4.5 text-[var(--color-accent)]" />
              </div>
              <div>
                <DialogTitle>Trace Replay</DialogTitle>
                <DialogDescription>Re-send the same prompts and compare responses</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {!replayResult && !replayLoading && (
            <div className="space-y-4">
              <div className="rounded-xl border border-[var(--color-accent-2)]/20 bg-[var(--color-accent-2)]/8 p-3 text-xs text-[var(--color-text-primary)]/80">
                Your API key is sent directly to the provider and is never stored by LLMTap.
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-tertiary)]">Provider API Key</label>
                <input
                  type="password"
                  value={replayApiKey}
                  onChange={(e) => setReplayApiKey(e.target.value)}
                  placeholder="sk-... or anthropic key"
                  className="w-full rounded-xl border border-[var(--border-dim)] bg-[rgba(var(--ch-text-primary),0.03)] px-4 py-3 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-disabled)] focus:border-[var(--color-accent)]/30 focus:outline-none"
                />
              </div>
              {replayError && (
                <div className="rounded-xl border border-[var(--color-text-primary)]/20 bg-[var(--color-text-primary)]/8 p-3 text-sm text-[var(--color-text-primary)]">
                  {replayError}
                </div>
              )}
              <button
                type="button"
                disabled={!replayApiKey.trim()}
                onClick={handleReplay}
                className="w-full rounded-xl bg-[var(--color-accent)] px-4 py-3 text-sm font-semibold text-[var(--color-bg-base)] transition-colors hover:bg-[var(--color-accent-2)] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Send Replay Request
              </button>
            </div>
          )}

          {replayLoading && (
            <div className="flex flex-col items-center gap-3 py-12">
              <Loader2 className="h-8 w-8 animate-spin text-[var(--color-accent)]" />
              <p className="text-sm text-[var(--color-text-tertiary)]">Replaying against {spans[0]?.providerName} API...</p>
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
                  <div className="rounded-xl border border-[var(--border-dim)] bg-[rgba(var(--ch-text-primary),0.03)] p-3">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-text-tertiary)]">Tokens</div>
                    <div className="mt-1 font-mono text-sm text-[var(--color-text-primary)]">
                      {originalSpan.totalTokens} <span className="text-[var(--color-text-tertiary)]">vs</span> {replayResult.totalTokens}
                    </div>
                  </div>
                  <div className="rounded-xl border border-[var(--border-dim)] bg-[rgba(var(--ch-text-primary),0.03)] p-3">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-text-tertiary)]">Duration</div>
                    <div className="mt-1 font-mono text-sm text-[var(--color-text-primary)]">
                      {formatDuration(originalSpan.duration ?? 0)} <span className="text-[var(--color-text-tertiary)]">vs</span> {formatDuration(replayResult.duration)}
                    </div>
                  </div>
                  <div className="rounded-xl border border-[var(--border-dim)] bg-[rgba(var(--ch-text-primary),0.03)] p-3">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-text-tertiary)]">Model</div>
                    <div className="mt-1 truncate font-mono text-xs text-[var(--color-text-primary)]">{replayResult.responseModel}</div>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-text-tertiary)]">Original Response</div>
                    <div className="max-h-[300px] overflow-y-auto rounded-xl border border-[var(--border-dim)] bg-[rgba(var(--ch-text-primary),0.03)] p-3 text-sm leading-6 text-[var(--color-text-secondary)]">
                      {originalOutput || <span className="text-[var(--color-text-disabled)]">No content captured</span>}
                    </div>
                  </div>
                  <div>
                    <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-accent)]/80">Replay Response</div>
                    <div className="max-h-[300px] overflow-y-auto rounded-xl border border-[var(--color-accent)]/12 bg-[var(--color-accent)]/6 p-3 text-sm leading-6 text-[var(--color-text-secondary)]">
                      {replayResult.content || <span className="text-[var(--color-text-disabled)]">Empty response</span>}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => { setReplayResult(null); setReplayError(null); }}
                    className="flex-1 rounded-xl border border-[var(--border-dim)] bg-[rgba(var(--ch-text-primary),0.03)] px-4 py-2.5 text-sm text-[var(--color-text-secondary)] transition-colors hover:bg-[rgba(var(--ch-text-primary),0.06)]"
                  >
                    Replay Again
                  </button>
                  <button
                    type="button"
                    onClick={() => setReplayOpen(false)}
                    className="flex-1 rounded-xl bg-[var(--color-accent)] px-4 py-2.5 text-sm font-semibold text-[var(--color-bg-base)] transition-colors hover:bg-[var(--color-accent-2)]"
                  >
                    Done
                  </button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </PageFrame>
  );
}
