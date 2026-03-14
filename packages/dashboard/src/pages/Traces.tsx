import { useDeferredValue, useMemo, useState, useCallback, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { fetchTraces, fetchTraceSpans } from "../api/client.ts";
import type { Trace, Span } from "../api/client.ts";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  ArrowUpDown,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  Clock,
  Columns2,
  Cpu,
  DollarSign,
  Layers,
  MessageSquare,
  Search,
  Square,
  X,
  XCircle,
  Zap,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { PageFrame } from "../components/PageFrame.tsx";
import {
  formatCompactNumber,
  formatCost,
  formatDuration,
  formatTimeAgo,
} from "../lib/format.ts";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const PAGE_SIZE_OPTIONS = [25, 50, 100, 200] as const;
const PERIOD_OPTIONS = [
  { value: 1, label: "1h" },
  { value: 6, label: "6h" },
  { value: 24, label: "24h" },
  { value: 168, label: "7d" },
  { value: 720, label: "30d" },
] as const;

type SortKey = "spanCount" | "totalTokens" | "totalCost" | "startTime";

/* ------------------------------------------------------------------ */
/*  StatusDot                                                          */
/* ------------------------------------------------------------------ */

function StatusDot({ status }: { status: string }) {
  const isError = status === "error";
  return (
    <span className="relative flex h-3.5 w-3.5 items-center justify-center">
      <span
        className={`absolute inset-0 rounded-full ${
          isError ? "bg-rose-400/25" : "bg-emerald-400/25"
        }`}
      />
      <span
        className={`relative h-2 w-2 rounded-full ${
          isError ? "bg-rose-400" : "bg-emerald-300"
        }`}
      />
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Preview Panel                                                      */
/* ------------------------------------------------------------------ */

function PreviewPanel({
  trace,
  onClose,
}: {
  trace: Trace;
  onClose: () => void;
}) {
  const duration = trace.totalDuration ?? (trace.endTime ? trace.endTime - trace.startTime : 0);

  return (
    <motion.aside
      initial={{ x: "100%", opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: "100%", opacity: 0 }}
      transition={{ type: "spring", bounce: 0.12, duration: 0.45 }}
      className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-white/8 bg-[rgba(6,10,22,0.97)] shadow-[−40px_0_80px_rgba(0,0,0,0.5)] backdrop-blur-xl"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/6 px-5 py-4">
        <div className="min-w-0">
          <div className="hud-label">Quick preview</div>
          <h3 className="mt-1 truncate text-lg font-semibold tracking-[-0.04em] text-white">
            {trace.name}
          </h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/8 bg-white/4 text-slate-400 transition-colors hover:bg-white/8 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-5 py-5">
        <div className="space-y-4">
          {/* Trace ID */}
          <div className="rounded-2xl border border-white/6 bg-white/4 p-4">
            <div className="hud-label">Trace ID</div>
            <div className="mt-1 break-all font-mono text-sm text-slate-300">
              {trace.traceId}
            </div>
          </div>

          {/* Status & Duration */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-white/6 bg-white/4 p-4">
              <div className="hud-label">Status</div>
              <div className="mt-2 flex items-center gap-2">
                <StatusDot status={trace.status} />
                <span
                  className={`text-sm font-medium ${
                    trace.status === "error"
                      ? "text-rose-300"
                      : "text-emerald-300"
                  }`}
                >
                  {trace.status === "error" ? "Error" : "Healthy"}
                </span>
              </div>
            </div>
            <div className="rounded-2xl border border-white/6 bg-white/4 p-4">
              <div className="hud-label">Duration</div>
              <div className="mt-2 flex items-center gap-2">
                <Clock className="h-4 w-4 text-sky-300" />
                <span className="text-sm font-medium text-white">
                  {duration > 0 ? formatDuration(duration) : "N/A"}
                </span>
              </div>
            </div>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-2xl border border-white/6 bg-white/4 p-4 text-center">
              <div className="hud-label">Spans</div>
              <div className="mt-2 text-xl font-semibold text-white">
                {trace.spanCount}
              </div>
              <Layers className="mx-auto mt-1 h-4 w-4 text-emerald-300/60" />
            </div>
            <div className="rounded-2xl border border-white/6 bg-white/4 p-4 text-center">
              <div className="hud-label">Tokens</div>
              <div className="mt-2 text-xl font-semibold text-white">
                {formatCompactNumber(trace.totalTokens)}
              </div>
              <Cpu className="mx-auto mt-1 h-4 w-4 text-sky-300/60" />
            </div>
            <div className="rounded-2xl border border-white/6 bg-white/4 p-4 text-center">
              <div className="hud-label">Cost</div>
              <div className="mt-2 text-xl font-semibold text-white">
                {formatCost(trace.totalCost)}
              </div>
              <DollarSign className="mx-auto mt-1 h-4 w-4 text-amber-300/60" />
            </div>
          </div>

          {/* Timing */}
          <div className="rounded-2xl border border-white/6 bg-white/4 p-4">
            <div className="hud-label">Started</div>
            <div className="mt-1 text-sm text-slate-300">
              {new Date(trace.startTime).toLocaleString()} ({formatTimeAgo(trace.startTime)})
            </div>
            {trace.endTime && (
              <>
                <div className="hud-label mt-3">Ended</div>
                <div className="mt-1 text-sm text-slate-300">
                  {new Date(trace.endTime).toLocaleString()}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Full detail link */}
        <Link
          to={`/trace/${trace.traceId}`}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl border border-emerald-400/20 bg-[linear-gradient(135deg,rgba(16,185,129,0.12),rgba(14,165,233,0.08))] px-5 py-3 text-sm font-medium text-emerald-300 transition-colors hover:bg-[linear-gradient(135deg,rgba(16,185,129,0.22),rgba(14,165,233,0.14))]"
        >
          Open full trace detail
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </motion.aside>
  );
}

/* ------------------------------------------------------------------ */
/*  Comparison Panel                                                   */
/* ------------------------------------------------------------------ */

function getTextContent(content: string | unknown[] | null): string {
  if (!content) return "";
  if (typeof content === "string") return content;
  // Array of content parts (multi-modal)
  return (content as Array<{ type?: string; text?: string }>)
    .filter((p) => p.type === "text" && p.text)
    .map((p) => p.text!)
    .join("\n");
}

function ResponseDiffPanel({
  traceA,
  traceB,
}: {
  traceA: Trace;
  traceB: Trace;
}) {
  const [spansA, setSpansA] = useState<Span[]>([]);
  const [spansB, setSpansB] = useState<Span[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      fetchTraceSpans(traceA.traceId),
      fetchTraceSpans(traceB.traceId),
    ]).then(([a, b]) => {
      if (cancelled) return;
      setSpansA(a.spans);
      setSpansB(b.spans);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [traceA.traceId, traceB.traceId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 text-sm text-slate-500">
        Loading responses...
      </div>
    );
  }

  // Gather assistant/output messages from all spans
  const getResponses = (spans: Span[]) =>
    spans.flatMap((s) =>
      (s.outputMessages ?? [])
        .filter((m) => m.role === "assistant")
        .map((m) => ({
          spanName: s.name,
          model: s.responseModel ?? s.requestModel,
          content: getTextContent(m.content),
        }))
    );

  const responsesA = getResponses(spansA);
  const responsesB = getResponses(spansB);
  const maxLen = Math.max(responsesA.length, responsesB.length);

  if (maxLen === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-sm text-slate-500">
        No assistant responses found in either trace.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {Array.from({ length: maxLen }, (_, i) => {
        const a = responsesA[i];
        const b = responsesB[i];
        return (
          <div key={i} className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-emerald-400/10 bg-white/3 p-3">
              {a ? (
                <>
                  <div className="mb-1.5 flex items-center gap-2">
                    <span className="rounded-full border border-emerald-400/16 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-200">
                      assistant
                    </span>
                    <span className="font-mono text-[10px] text-slate-500">{a.model}</span>
                  </div>
                  <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-slate-200">
                    {a.content || <span className="text-slate-600 italic">empty response</span>}
                  </pre>
                </>
              ) : (
                <div className="text-xs italic text-slate-600">No response</div>
              )}
            </div>
            <div className="rounded-2xl border border-sky-400/10 bg-white/3 p-3">
              {b ? (
                <>
                  <div className="mb-1.5 flex items-center gap-2">
                    <span className="rounded-full border border-sky-400/16 bg-sky-400/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-sky-200">
                      assistant
                    </span>
                    <span className="font-mono text-[10px] text-slate-500">{b.model}</span>
                  </div>
                  <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-slate-200">
                    {b.content || <span className="text-slate-600 italic">empty response</span>}
                  </pre>
                </>
              ) : (
                <div className="text-xs italic text-slate-600">No response</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ComparisonPanel({
  traceA,
  traceB,
  onClose,
}: {
  traceA: Trace;
  traceB: Trace;
  onClose: () => void;
}) {
  const [activeTab, setActiveTab] = useState<"metrics" | "responses">("metrics");
  const durA = traceA.totalDuration ?? (traceA.endTime ? traceA.endTime - traceA.startTime : 0);
  const durB = traceB.totalDuration ?? (traceB.endTime ? traceB.endTime - traceB.startTime : 0);

  const rows: {
    label: string;
    a: string;
    b: string;
    diff?: string;
    better?: "a" | "b" | "tie";
  }[] = [
    {
      label: "Status",
      a: traceA.status,
      b: traceB.status,
      better:
        traceA.status === traceB.status
          ? "tie"
          : traceA.status === "ok"
            ? "a"
            : "b",
    },
    {
      label: "Spans",
      a: String(traceA.spanCount),
      b: String(traceB.spanCount),
    },
    {
      label: "Tokens",
      a: traceA.totalTokens.toLocaleString(),
      b: traceB.totalTokens.toLocaleString(),
      diff:
        traceA.totalTokens !== traceB.totalTokens
          ? `${traceB.totalTokens - traceA.totalTokens > 0 ? "+" : ""}${(traceB.totalTokens - traceA.totalTokens).toLocaleString()}`
          : "same",
      better:
        traceA.totalTokens === traceB.totalTokens
          ? "tie"
          : traceA.totalTokens < traceB.totalTokens
            ? "a"
            : "b",
    },
    {
      label: "Cost",
      a: formatCost(traceA.totalCost),
      b: formatCost(traceB.totalCost),
      diff:
        traceA.totalCost !== traceB.totalCost
          ? `${traceB.totalCost - traceA.totalCost > 0 ? "+" : ""}${formatCost(Math.abs(traceB.totalCost - traceA.totalCost))}`
          : "same",
      better:
        traceA.totalCost === traceB.totalCost
          ? "tie"
          : traceA.totalCost < traceB.totalCost
            ? "a"
            : "b",
    },
    {
      label: "Duration",
      a: durA > 0 ? formatDuration(durA) : "N/A",
      b: durB > 0 ? formatDuration(durB) : "N/A",
      diff:
        durA > 0 && durB > 0 && durA !== durB
          ? `${durB - durA > 0 ? "+" : ""}${formatDuration(Math.abs(durB - durA))}`
          : durA === durB
            ? "same"
            : undefined,
      better:
        durA === durB ? "tie" : durA > 0 && durB > 0 && durA < durB ? "a" : "b",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 24 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="dashboard-shell rounded-[26px] px-5 py-5 sm:px-6"
    >
      <div className="mb-5 flex items-center justify-between">
        <div>
          <div className="hud-label">Comparison mode</div>
          <h2 className="mt-1 text-xl font-semibold tracking-[-0.04em] text-white">
            Side-by-side analysis
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="status-chip transition-colors hover:border-white/16 hover:bg-white/8"
        >
          <X className="h-3.5 w-3.5" />
          <span>Close comparison</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="mb-4 flex gap-2">
        <button
          type="button"
          onClick={() => setActiveTab("metrics")}
          className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
            activeTab === "metrics"
              ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-200"
              : "border-white/8 bg-white/4 text-slate-400 hover:text-white"
          }`}
        >
          <Columns2 className="h-3 w-3" />
          Metrics
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("responses")}
          className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
            activeTab === "responses"
              ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-200"
              : "border-white/8 bg-white/4 text-slate-400 hover:text-white"
          }`}
        >
          <MessageSquare className="h-3 w-3" />
          Response diff
        </button>
      </div>

      {activeTab === "metrics" ? (
      <>
      {/* Trace headers */}
      <div className="mb-4 grid grid-cols-[140px_1fr_1fr_120px] gap-3">
        <div />
        <div className="rounded-2xl border border-emerald-400/15 bg-emerald-400/5 p-3">
          <div className="hud-label">Trace A</div>
          <div className="mt-1 truncate text-sm font-medium text-white">
            {traceA.name}
          </div>
          <div className="mt-0.5 font-mono text-[10px] text-slate-500">
            {traceA.traceId.slice(0, 16)}
          </div>
        </div>
        <div className="rounded-2xl border border-sky-400/15 bg-sky-400/5 p-3">
          <div className="hud-label">Trace B</div>
          <div className="mt-1 truncate text-sm font-medium text-white">
            {traceB.name}
          </div>
          <div className="mt-0.5 font-mono text-[10px] text-slate-500">
            {traceB.traceId.slice(0, 16)}
          </div>
        </div>
        <div className="flex items-center justify-center text-[11px] uppercase tracking-[0.18em] text-slate-500">
          Delta
        </div>
      </div>

      {/* Comparison rows */}
      <div className="space-y-2">
        {rows.map((row) => (
          <div
            key={row.label}
            className="grid grid-cols-[140px_1fr_1fr_120px] items-center gap-3 rounded-2xl border border-white/6 bg-white/4 px-4 py-3"
          >
            <div className="text-xs font-medium uppercase tracking-wider text-slate-400">
              {row.label}
            </div>
            <div
              className={`text-sm font-mono ${
                row.better === "a"
                  ? "text-emerald-300"
                  : row.better === "tie"
                    ? "text-slate-300"
                    : "text-slate-300"
              }`}
            >
              {row.label === "Status" ? (
                <span className="inline-flex items-center gap-1.5">
                  <StatusDot status={traceA.status} />
                  {row.a}
                </span>
              ) : (
                row.a
              )}
            </div>
            <div
              className={`text-sm font-mono ${
                row.better === "b"
                  ? "text-emerald-300"
                  : row.better === "tie"
                    ? "text-slate-300"
                    : "text-slate-300"
              }`}
            >
              {row.label === "Status" ? (
                <span className="inline-flex items-center gap-1.5">
                  <StatusDot status={traceB.status} />
                  {row.b}
                </span>
              ) : (
                row.b
              )}
            </div>
            <div className="text-center text-xs font-mono text-slate-500">
              {row.diff ?? "--"}
            </div>
          </div>
        ))}
      </div>
      </>
      ) : (
        <ResponseDiffPanel traceA={traceA} traceB={traceB} />
      )}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Traces page                                                   */
/* ------------------------------------------------------------------ */

export default function Traces() {
  /* ---- URL-synced filter state ---- */
  const [searchParams, setSearchParams] = useSearchParams();
  const searchTerm = searchParams.get("q") ?? "";
  const deferredSearch = useDeferredValue(searchTerm);
  const status = searchParams.get("status");
  const validStatus = status === "ok" || status === "error" ? status : "";
  const periodHours = Number(searchParams.get("periodHours") ?? "24");
  const pageSize = Number(searchParams.get("pageSize") ?? "50");
  const effectivePageSize = (PAGE_SIZE_OPTIONS as readonly number[]).includes(
    pageSize
  )
    ? pageSize
    : 50;
  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
  const offset = (page - 1) * effectivePageSize;

  /* ---- Local UI state ---- */
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [previewTrace, setPreviewTrace] = useState<Trace | null>(null);
  const [showComparison, setShowComparison] = useState(false);

  /* ---- Query ---- */
  const traceQuery = useMemo(
    () => ({
      limit: effectivePageSize,
      offset,
      q: deferredSearch.trim() || undefined,
      status: (validStatus || undefined) as "ok" | "error" | undefined,
      periodHours: PERIOD_OPTIONS.some((o) => o.value === periodHours)
        ? periodHours
        : 24,
    }),
    [deferredSearch, effectivePageSize, offset, periodHours, validStatus]
  );

  const { data: tracesData, isLoading } = useQuery({
    queryKey: ["traces", traceQuery],
    queryFn: () => fetchTraces(traceQuery),
  });

  const rawTraces = tracesData?.traces ?? [];
  const totalMatches = tracesData?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalMatches / effectivePageSize));

  /* ---- Sorting ---- */
  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  const traces = useMemo(() => {
    if (!sortKey) return rawTraces;
    return [...rawTraces].sort((a, b) => {
      const av = a[sortKey] ?? 0;
      const bv = b[sortKey] ?? 0;
      return sortDir === "asc"
        ? (av as number) - (bv as number)
        : (bv as number) - (av as number);
    });
  }, [rawTraces, sortKey, sortDir]);

  /* ---- Selection helpers ---- */
  const allOnPageSelected =
    traces.length > 0 && traces.every((t) => selectedIds.has(t.traceId));

  const toggleSelectAll = useCallback(() => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) {
        for (const t of traces) next.delete(t.traceId);
      } else {
        for (const t of traces) next.add(t.traceId);
      }
      return next;
    });
  }, [allOnPageSelected, traces]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    setShowComparison(false);
  }, []);

  /* ---- Comparison helpers ---- */
  const selectedTraces = useMemo(
    () => traces.filter((t) => selectedIds.has(t.traceId)),
    [traces, selectedIds]
  );
  const canCompare = selectedIds.size === 2;

  /* ---- URL param helper ---- */
  const hasActiveFilters =
    searchTerm.length > 0 ||
    validStatus.length > 0 ||
    traceQuery.periodHours !== 24;

  function updateParams(
    updates: Record<string, string | number | undefined>,
    resetPage = true
  ) {
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        for (const [key, value] of Object.entries(updates)) {
          if (value === undefined || value === "") next.delete(key);
          else next.set(key, String(value));
        }
        if (resetPage) next.delete("page");
        return next;
      },
      { replace: true }
    );
  }

  /* ---- Render ---- */
  return (
    <>
      <PageFrame
        eyebrow="Trace Explorer"
        title="Deep-dive into every trace flowing through the system."
        description="Explore, compare, and inspect individual traces with full visibility into span counts, token usage, cost, and execution timing."
        aside={
          <div className="insight-panel">
            <div className="grid gap-3">
              <div className="rounded-2xl border border-white/8 bg-white/4 p-4">
                <div className="hud-label">Total traces</div>
                <div className="mt-2 flex items-center justify-between">
                  <div className="text-lg font-medium text-white">
                    {formatCompactNumber(totalMatches)}
                  </div>
                  <Activity className="h-4 w-4 text-emerald-300" />
                </div>
                <div className="mt-1 text-sm text-slate-400">
                  Matching current filters
                </div>
              </div>
              {selectedIds.size > 0 && (
                <div className="rounded-2xl border border-sky-400/15 bg-sky-400/5 p-4">
                  <div className="hud-label">Selected</div>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="text-lg font-medium text-white">
                      {selectedIds.size} trace{selectedIds.size !== 1 && "s"}
                    </div>
                    <Columns2 className="h-4 w-4 text-sky-300" />
                  </div>
                  <div className="mt-1 text-sm text-slate-400">
                    {canCompare
                      ? "Ready to compare"
                      : "Select exactly 2 to compare"}
                  </div>
                </div>
              )}
            </div>
          </div>
        }
      >
        {/* Selection toolbar */}
        <AnimatePresence>
          {selectedIds.size > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="dashboard-shell flex items-center justify-between gap-4 rounded-[24px] px-5 py-3">
                <div className="flex items-center gap-3">
                  <span className="status-chip">
                    <CheckSquare className="h-3.5 w-3.5 text-emerald-300" />
                    <span>
                      {selectedIds.size} selected
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={clearSelection}
                    className="status-chip transition-colors hover:border-white/16 hover:bg-white/8"
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    <span>Clear</span>
                  </button>
                </div>
                <button
                  type="button"
                  disabled={!canCompare}
                  onClick={() => setShowComparison(true)}
                  className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-medium transition-all ${
                    canCompare
                      ? "border-emerald-400/20 bg-[linear-gradient(135deg,rgba(16,185,129,0.14),rgba(14,165,233,0.08))] text-emerald-300 hover:bg-[linear-gradient(135deg,rgba(16,185,129,0.24),rgba(14,165,233,0.14))]"
                      : "cursor-not-allowed border-white/6 bg-white/4 text-slate-500"
                  }`}
                >
                  <Columns2 className="h-4 w-4" />
                  Compare traces
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Comparison panel */}
        <AnimatePresence>
          {showComparison && selectedTraces.length === 2 && (
            <ComparisonPanel
              traceA={selectedTraces[0]}
              traceB={selectedTraces[1]}
              onClose={() => setShowComparison(false)}
            />
          )}
        </AnimatePresence>

        {/* Main trace table */}
        <section className="dashboard-shell rounded-[26px] px-4 py-4 sm:px-5 sm:py-5">
          {/* Search / filter bar */}
          <div className="mb-4 rounded-[24px] border border-white/8 bg-[linear-gradient(180deg,rgba(7,14,26,0.95),rgba(4,8,18,0.98))] p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="hud-label">Search console</div>
                <h2 className="mt-1 text-xl font-semibold tracking-[-0.04em] text-white">
                  Trace explorer
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <span className="status-chip">
                  <Zap className="h-3.5 w-3.5 text-amber-300" />
                  <span>{totalMatches} traces</span>
                </span>
                <button
                  type="button"
                  onClick={() =>
                    updateParams({
                      q: undefined,
                      status: undefined,
                      periodHours: undefined,
                    })
                  }
                  disabled={!hasActiveFilters}
                  className="status-chip transition-colors hover:border-white/16 hover:bg-white/8 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <X className="h-3.5 w-3.5" />
                  <span>Clear</span>
                </button>
              </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1.8fr)_minmax(0,0.6fr)_minmax(0,0.6fr)]">
              <label className="relative block">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  value={searchTerm}
                  onChange={(e) =>
                    updateParams({ q: e.target.value || undefined })
                  }
                  placeholder="Search by trace name, ID, or keyword..."
                  className="w-full rounded-2xl border border-white/8 bg-white/4 py-3 pl-10 pr-4 text-sm text-white placeholder:text-slate-500 focus:border-emerald-400/30 focus:bg-white/6 focus:outline-none"
                />
              </label>
              <select
                value={validStatus}
                onChange={(e) =>
                  updateParams({ status: e.target.value || undefined })
                }
                className="w-full rounded-2xl border border-white/8 bg-white/4 px-4 py-3 text-sm text-white focus:border-emerald-400/30 focus:bg-white/6 focus:outline-none"
              >
                <option value="">All states</option>
                <option value="ok">Healthy only</option>
                <option value="error">Errors only</option>
              </select>
              <select
                value={String(traceQuery.periodHours ?? 24)}
                onChange={(e) =>
                  updateParams({
                    periodHours:
                      Number(e.target.value) === 24
                        ? undefined
                        : Number(e.target.value),
                  })
                }
                className="w-full rounded-2xl border border-white/8 bg-white/4 px-4 py-3 text-sm text-white focus:border-amber-400/30 focus:bg-white/6 focus:outline-none"
              >
                {PERIOD_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="empty-state h-[400px] text-slate-500">
              Loading traces...
            </div>
          ) : traces.length === 0 ? (
            <div className="empty-state h-[400px]">
              <Activity className="h-8 w-8 text-slate-500" />
              <div className="text-base font-medium text-white">
                {hasActiveFilters
                  ? "No traces match these filters"
                  : "No traces recorded yet"}
              </div>
              <div className="mt-1 text-sm text-slate-500">
                {hasActiveFilters
                  ? "Try adjusting the search or time window"
                  : "Start sending spans to populate the explorer"}
              </div>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full border-separate border-spacing-y-1.5 text-sm">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-[0.18em] text-slate-500">
                      <th className="px-3 py-2 text-center">
                        <button
                          type="button"
                          onClick={toggleSelectAll}
                          className="inline-flex items-center justify-center transition-colors hover:text-slate-300"
                          title={
                            allOnPageSelected ? "Deselect all" : "Select all"
                          }
                        >
                          {allOnPageSelected ? (
                            <CheckSquare className="h-4 w-4 text-emerald-300" />
                          ) : (
                            <Square className="h-4 w-4" />
                          )}
                        </button>
                      </th>
                      <th className="px-3 py-2 w-10">State</th>
                      <th className="px-3 py-2">Trace</th>
                      <th className="px-3 py-2">ID</th>
                      {(
                        [
                          ["spanCount", "Spans"],
                          ["totalTokens", "Tokens"],
                          ["totalCost", "Cost"],
                          ["startTime", "When"],
                        ] as const
                      ).map(([key, label]) => (
                        <th key={key} className="px-3 py-2 text-right">
                          <button
                            type="button"
                            onClick={() => toggleSort(key)}
                            className="inline-flex items-center gap-1 transition-colors hover:text-slate-300"
                          >
                            {label}
                            {sortKey === key ? (
                              sortDir === "asc" ? (
                                <ChevronUp className="h-3 w-3" />
                              ) : (
                                <ChevronDown className="h-3 w-3" />
                              )
                            ) : (
                              <ArrowUpDown className="h-3 w-3 opacity-30" />
                            )}
                          </button>
                        </th>
                      ))}
                      <th className="px-3 py-2 text-right">Duration</th>
                    </tr>
                  </thead>
                  <tbody>
                    {traces.map((trace) => {
                      const isSelected = selectedIds.has(trace.traceId);
                      const duration =
                        trace.totalDuration ??
                        (trace.endTime
                          ? trace.endTime - trace.startTime
                          : 0);
                      return (
                        <tr
                          key={trace.traceId}
                          onClick={() => setPreviewTrace(trace)}
                          className={`cursor-pointer rounded-2xl border transition-colors ${
                            isSelected
                              ? "border-emerald-400/20 bg-emerald-400/5"
                              : "border-white/6 bg-white/4 hover:bg-white/6"
                          }`}
                        >
                          <td
                            className="rounded-l-2xl px-3 py-3 text-center"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={() => toggleSelect(trace.traceId)}
                              className="inline-flex items-center justify-center transition-colors hover:text-emerald-300"
                            >
                              {isSelected ? (
                                <CheckSquare className="h-4 w-4 text-emerald-300" />
                              ) : (
                                <Square className="h-4 w-4 text-slate-500" />
                              )}
                            </button>
                          </td>
                          <td className="px-3 py-3">
                            <StatusDot status={trace.status} />
                          </td>
                          <td className="px-3 py-3">
                            <span className="inline-flex max-w-[280px] items-center gap-2 text-sm font-medium text-white">
                              <span className="truncate">{trace.name}</span>
                            </span>
                          </td>
                          <td className="px-3 py-3">
                            <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-slate-500">
                              {trace.traceId.slice(0, 12)}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-right font-mono text-xs text-slate-300">
                            {trace.spanCount}
                          </td>
                          <td className="px-3 py-3 text-right font-mono text-xs text-slate-300">
                            {trace.totalTokens.toLocaleString()}
                          </td>
                          <td className="px-3 py-3 text-right font-mono text-xs text-slate-300">
                            {formatCost(trace.totalCost)}
                          </td>
                          <td className="px-3 py-3 text-right text-xs text-slate-500">
                            {formatTimeAgo(trace.startTime)}
                          </td>
                          <td className="rounded-r-2xl px-3 py-3 text-right font-mono text-xs text-slate-400">
                            {duration > 0 ? formatDuration(duration) : "--"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="mt-4 flex items-center justify-between gap-3 px-1">
                <div className="flex items-center gap-3">
                  <div className="text-xs text-slate-500">
                    {totalMatches > 0
                      ? `Showing ${offset + 1}-${Math.min(offset + traces.length, totalMatches)} of ${totalMatches}`
                      : "Awaiting traces"}
                  </div>
                  <select
                    value={String(effectivePageSize)}
                    onChange={(e) =>
                      updateParams({
                        pageSize:
                          Number(e.target.value) === 50
                            ? undefined
                            : Number(e.target.value),
                      })
                    }
                    className="rounded-xl border border-white/8 bg-white/4 px-2 py-1.5 text-xs text-slate-300 focus:border-emerald-400/30 focus:outline-none"
                  >
                    {PAGE_SIZE_OPTIONS.map((size) => (
                      <option key={size} value={size}>
                        {size} / page
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      updateParams(
                        { page: page > 2 ? page - 1 : undefined },
                        false
                      )
                    }
                    disabled={page <= 1}
                    className="status-chip transition-colors hover:border-white/16 hover:bg-white/8 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    <span>Previous</span>
                  </button>
                  <span className="text-xs text-slate-500">
                    {page} / {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => updateParams({ page: page + 1 }, false)}
                    disabled={page >= totalPages}
                    className="status-chip transition-colors hover:border-white/16 hover:bg-white/8 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <span>Next</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      </PageFrame>

      {/* Slide-out preview panel */}
      <AnimatePresence>
        {previewTrace && (
          <>
            <motion.div
              key="overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPreviewTrace(null)}
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            />
            <PreviewPanel
              key={previewTrace.traceId}
              trace={previewTrace}
              onClose={() => setPreviewTrace(null)}
            />
          </>
        )}
      </AnimatePresence>
    </>
  );
}
