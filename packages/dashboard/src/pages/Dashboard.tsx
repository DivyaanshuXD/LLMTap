import { useDeferredValue, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { fetchStats, fetchTraces, fetchInsights } from "../api/client.ts";
import type { Trace, Insight } from "../api/client.ts";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  Cpu,
  Gauge,
  Lightbulb,
  Orbit,
  Radar,
  Search,
  ShieldAlert,
  Sparkles,
  TrendingUp,
  X,
} from "lucide-react";
import { motion } from "framer-motion";
import { LivePulse } from "../components/LivePulse.tsx";
import { PageFrame } from "../components/PageFrame.tsx";
import {
  formatClockTime,
  formatCompactNumber,
  formatCost,
  formatDuration,
  formatTimeAgo,
} from "../lib/format.ts";

const PAGE_SIZE_OPTIONS = [12, 25, 50, 100] as const;
const PERIOD_OPTIONS = [
  { value: 1, label: "1h" },
  { value: 6, label: "6h" },
  { value: 24, label: "24h" },
  { value: 168, label: "7d" },
  { value: 720, label: "30d" },
] as const;

const tooltipStyle = {
  backgroundColor: "rgba(8, 15, 28, 0.96)",
  border: "1px solid rgba(148, 163, 184, 0.14)",
  borderRadius: "18px",
  fontSize: 12,
  boxShadow: "0 20px 60px rgba(0,0,0,0.45)",
  backdropFilter: "blur(12px)",
};

function MetricCard({
  label,
  value,
  detail,
  accent,
  icon,
}: {
  label: string;
  value: string;
  detail: string;
  accent: string;
  icon: ReactNode;
}) {
  return (
    <div className="metric-card">
      <div className={`metric-orb ${accent}`}>{icon}</div>
      <div>
        <div className="hud-label">{label}</div>
        <div className="mt-1 text-3xl font-semibold tracking-[-0.04em] text-white">
          {value}
        </div>
        <div className="mt-1 text-sm text-slate-400">{detail}</div>
      </div>
    </div>
  );
}

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

export default function Dashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const searchTerm = searchParams.get("q") ?? "";
  const deferredSearch = useDeferredValue(searchTerm);
  const provider = searchParams.get("provider") ?? "";
  const status = searchParams.get("status");
  const validStatus = status === "ok" || status === "error" ? status : "";
  const periodHours = Number(searchParams.get("periodHours") ?? "24");
  const pageSize = Number(searchParams.get("pageSize") ?? "12");
  const effectivePageSize = (PAGE_SIZE_OPTIONS as readonly number[]).includes(pageSize) ? pageSize : 12;
  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
  const offset = (page - 1) * effectivePageSize;

  const traceQuery = useMemo(
    () => ({
      limit: effectivePageSize,
      offset,
      q: deferredSearch.trim() || undefined,
      provider: provider || undefined,
      status: (validStatus || undefined) as "ok" | "error" | undefined,
      periodHours:
        PERIOD_OPTIONS.some((option) => option.value === periodHours) ? periodHours : 24,
    }),
    [deferredSearch, effectivePageSize, offset, periodHours, provider, validStatus]
  );

  const { data: stats } = useQuery({
    queryKey: ["stats", traceQuery.periodHours],
    queryFn: () => fetchStats(traceQuery.periodHours ?? 24),
  });

  const { data: tracesData, isLoading: tracesLoading } = useQuery({
    queryKey: ["traces", traceQuery],
    queryFn: () => fetchTraces(traceQuery),
  });

  const { data: insightsData } = useQuery({
    queryKey: ["insights"],
    queryFn: fetchInsights,
    refetchInterval: 60_000,
  });
  const insights = insightsData?.insights ?? [];

  const rawTraces = tracesData?.traces ?? [];
  const totalMatches = tracesData?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalMatches / effectivePageSize));

  type SortKey = "spanCount" | "totalTokens" | "totalCost" | "startTime";
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

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
      return sortDir === "asc" ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });
  }, [rawTraces, sortKey, sortDir]);

  const topProvider = stats?.byProvider[0];
  const latestTrace = traces[0];
  const providerOptions = [...new Set(stats?.byProvider.map((item) => item.provider) ?? [])];
  const chartData =
    stats?.costOverTime.map((point) => ({
      time: formatClockTime(point.timestamp),
      cost: point.cost,
    })) ?? [];
  const avgCost = stats && stats.totalSpans > 0 ? stats.totalCost / stats.totalSpans : 0;
  const hasActiveFilters =
    searchTerm.length > 0 || provider.length > 0 || validStatus.length > 0 || traceQuery.periodHours !== 24;

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

  return (
    <PageFrame
      eyebrow="Flight Deck"
      title="Read the behavior of every model call like a live system."
      description="The dashboard should act like an operator console. This version adds a real trace search surface, URL-synced filters, and paginated queue control."
      aside={
        <div className="insight-panel">
          <LivePulse />
          <div className="mt-4 grid gap-3">
            <div className="rounded-2xl border border-white/8 bg-white/4 p-4">
              <div className="hud-label">Dominant provider</div>
              <div className="mt-2 flex items-center justify-between">
                <div className="text-lg font-medium capitalize text-white">
                  {topProvider?.provider ?? "Awaiting traffic"}
                </div>
                <Orbit className="h-4 w-4 text-sky-300" />
              </div>
              <div className="mt-1 text-sm text-slate-400">
                {topProvider
                  ? `${topProvider.spanCount} calls, ${formatCost(topProvider.totalCost)} spend`
                  : "No provider activity yet"}
              </div>
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/4 p-4">
              <div className="hud-label">Latest trace</div>
              <div className="mt-2 text-base font-medium text-white">
                {latestTrace?.name ?? "No recent traces"}
              </div>
              <div className="mt-1 text-sm text-slate-400">
                {latestTrace
                  ? `${formatTimeAgo(latestTrace.startTime)} / ${latestTrace.spanCount} spans`
                  : "Start sending spans to populate the deck"}
              </div>
            </div>
          </div>
        </div>
      }
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Trace Volume"
          value={formatCompactNumber(stats?.totalTraces ?? 0)}
          detail={`${stats?.totalSpans ?? 0} spans in window`}
          icon={<Radar className="h-5 w-5" />}
          accent="bg-[linear-gradient(135deg,rgba(52,211,153,0.18),rgba(14,165,233,0.18))] text-emerald-200"
        />
        <MetricCard
          label="Token Throughput"
          value={formatCompactNumber(stats?.totalTokens ?? 0)}
          detail="Token load across the active filter window"
          icon={<Cpu className="h-5 w-5" />}
          accent="bg-[linear-gradient(135deg,rgba(56,189,248,0.18),rgba(168,85,247,0.18))] text-sky-200"
        />
        <MetricCard
          label="Spend Velocity"
          value={formatCost(stats?.totalCost ?? 0)}
          detail={`${formatCost(avgCost)} average cost per call`}
          icon={<TrendingUp className="h-5 w-5" />}
          accent="bg-[linear-gradient(135deg,rgba(251,191,36,0.18),rgba(249,115,22,0.18))] text-amber-200"
        />
        <MetricCard
          label="Risk Surface"
          value={`${Math.round((stats?.errorRate ?? 0) * 100)}%`}
          detail={`${stats?.errorCount ?? 0} failing calls`}
          icon={<ShieldAlert className="h-5 w-5" />}
          accent="bg-[linear-gradient(135deg,rgba(244,63,94,0.18),rgba(168,85,247,0.18))] text-rose-200"
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.95fr)]">
        <section className="dashboard-shell rounded-[26px] px-5 py-5 sm:px-6">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <div className="hud-label">Economic pulse</div>
              <h2 className="mt-1 text-xl font-semibold tracking-[-0.04em] text-white">
                Cost gradient
              </h2>
            </div>
            <div className="status-chip">
              <Gauge className="h-3.5 w-3.5 text-sky-300" />
              <span>{traceQuery.periodHours}h window</span>
            </div>
          </div>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="dashboardCostFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#34d399" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#38bdf8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(148,163,184,0.08)" vertical={false} />
                <XAxis dataKey="time" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={54} />
                <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [formatCost(value), "Cost"]} />
                <Area type="monotone" dataKey="cost" stroke="#34d399" fill="url(#dashboardCostFill)" strokeWidth={2.6} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state h-[320px]">
              <TrendingUp className="h-8 w-8 text-slate-500" />
              <div className="text-base font-medium text-white">No cost movement yet</div>
            </div>
          )}
        </section>

        <section className="dashboard-shell rounded-[26px] px-5 py-5 sm:px-6">
          <div className="mb-5">
            <div className="hud-label">Provider pressure</div>
            <h2 className="mt-1 text-xl font-semibold tracking-[-0.04em] text-white">
              Allocation by provider
            </h2>
          </div>
          <div className="space-y-4">
            {(stats?.byProvider ?? []).map((providerEntry) => {
              const ratio =
                (stats?.totalCost ?? 0) > 0
                  ? (providerEntry.totalCost / (stats?.totalCost ?? 1)) * 100
                  : 0;
              return (
                <div key={providerEntry.provider} className="rounded-2xl border border-white/6 bg-white/4 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium capitalize text-white">{providerEntry.provider}</div>
                      <div className="text-xs text-slate-400">
                        {providerEntry.spanCount} calls / {formatCompactNumber(providerEntry.totalTokens)} tokens
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-white">{formatCost(providerEntry.totalCost)}</div>
                      <div className="text-xs text-slate-500">{formatDuration(providerEntry.avgDuration)}</div>
                    </div>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-900/80">
                    <motion.div
                      className="h-full rounded-full bg-[linear-gradient(90deg,#34d399,#38bdf8)]"
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.max(ratio, 4)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.85fr)]">
        <section className="dashboard-shell rounded-[26px] px-4 py-4 sm:px-5 sm:py-5">
          <div className="mb-4 rounded-[24px] border border-white/8 bg-[linear-gradient(180deg,rgba(7,14,26,0.95),rgba(4,8,18,0.98))] p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="hud-label">Search console</div>
                <h2 className="mt-1 text-xl font-semibold tracking-[-0.04em] text-white">
                  Trace dispatch queue
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <span className="status-chip">{totalMatches} matches</span>
                <button
                  type="button"
                  onClick={() =>
                    updateParams({ q: undefined, provider: undefined, status: undefined, periodHours: undefined })
                  }
                  disabled={!hasActiveFilters}
                  className="status-chip transition-colors hover:border-white/16 hover:bg-white/8 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <X className="h-3.5 w-3.5" />
                  <span>Clear</span>
                </button>
              </div>
            </div>

            <div className="mt-4 grid gap-3 xl:grid-cols-[minmax(0,1.7fr)_repeat(3,minmax(0,0.7fr))]">
              <label className="relative block">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  value={searchTerm}
                  onChange={(event) => updateParams({ q: event.target.value || undefined })}
                  placeholder="Search traces, models, providers, errors"
                  className="w-full rounded-2xl border border-white/8 bg-white/4 py-3 pl-10 pr-4 text-sm text-white placeholder:text-slate-500 focus:border-emerald-400/30 focus:bg-white/6 focus:outline-none"
                />
              </label>
              <select
                value={provider}
                onChange={(event) => updateParams({ provider: event.target.value || undefined })}
                className="w-full rounded-2xl border border-white/8 bg-white/4 px-4 py-3 text-sm text-white focus:border-sky-400/30 focus:bg-white/6 focus:outline-none"
              >
                <option value="">All providers</option>
                {providerOptions.map((providerOption) => (
                  <option key={providerOption} value={providerOption}>
                    {providerOption}
                  </option>
                ))}
              </select>
              <select
                value={validStatus}
                onChange={(event) => updateParams({ status: event.target.value || undefined })}
                className="w-full rounded-2xl border border-white/8 bg-white/4 px-4 py-3 text-sm text-white focus:border-emerald-400/30 focus:bg-white/6 focus:outline-none"
              >
                <option value="">All states</option>
                <option value="ok">Healthy only</option>
                <option value="error">Errors only</option>
              </select>
              <select
                value={String(traceQuery.periodHours ?? 24)}
                onChange={(event) =>
                  updateParams({
                    periodHours:
                      Number(event.target.value) === 24 ? undefined : Number(event.target.value),
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

          {tracesLoading ? (
            <div className="empty-state h-[280px] text-slate-500">Loading trace queue...</div>
          ) : traces.length === 0 && !hasActiveFilters ? (
            <div className="rounded-2xl border border-white/8 bg-white/4 p-6 sm:p-8">
              <div className="flex flex-col items-center gap-3 text-center">
                <Activity className="h-10 w-10 text-amber-400/60" />
                <div>
                  <div className="text-lg font-semibold text-white">No traces recorded yet</div>
                  <p className="mt-1 text-sm text-slate-400">Get started in 3 steps — takes under a minute.</p>
                </div>
              </div>

              <div className="mx-auto mt-6 flex max-w-3xl flex-col gap-4">
                <div className="rounded-xl border border-white/6 bg-white/3 p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-400/20 text-[10px] font-bold text-amber-400">1</span>
                    <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">Install the SDK</span>
                  </div>
                  <pre className="overflow-x-auto rounded-lg bg-black/40 p-3 text-sm leading-relaxed text-green-400 select-all">npm install @llmtap/sdk</pre>
                </div>

                <div className="rounded-xl border border-white/6 bg-white/3 p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-400/20 text-[10px] font-bold text-amber-400">2</span>
                    <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">Wrap your client &amp; use normally</span>
                  </div>
                  <pre className="overflow-x-auto rounded-lg bg-black/40 p-3 text-sm leading-relaxed text-green-400 select-all whitespace-pre">{`import { wrap } from "@llmtap/sdk";
import OpenAI from "openai";

const client = wrap(new OpenAI());

const res = await client.chat.completions.create({
  model: "gpt-4o-mini",
  messages: [{ role: "user", content: "Hello!" }],
});`}</pre>
                </div>

                <div className="rounded-xl border border-white/6 bg-white/3 p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-400/20 text-[10px] font-bold text-amber-400">3</span>
                    <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">Start the collector</span>
                  </div>
                  <pre className="overflow-x-auto rounded-lg bg-black/40 p-3 text-sm leading-relaxed text-green-400 select-all">npx llmtap</pre>
                  <p className="mt-2 text-xs text-slate-500">Run your app and traces will appear here automatically.</p>
                </div>
              </div>

              <div className="mx-auto mt-4 max-w-3xl rounded-lg border border-white/4 bg-white/2 px-4 py-2.5">
                <p className="text-center text-xs text-slate-500">
                  Works with <span className="text-slate-400">OpenAI</span>, <span className="text-slate-400">Anthropic</span>, <span className="text-slate-400">Google Gemini</span>, <span className="text-slate-400">DeepSeek</span>, <span className="text-slate-400">Groq</span>, <span className="text-slate-400">Together</span>, <span className="text-slate-400">Fireworks</span>, <span className="text-slate-400">OpenRouter</span>, and any OpenAI-compatible provider.
                </p>
              </div>
            </div>
          ) : traces.length === 0 ? (
            <div className="empty-state h-[280px]">
              <Activity className="h-8 w-8 text-slate-500" />
              <div className="text-base font-medium text-white">No traces match these filters</div>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full border-separate border-spacing-y-2 text-sm">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-[0.18em] text-slate-500">
                      <th className="px-4 py-2">State</th>
                      <th className="px-4 py-2">Trace</th>
                      {([["spanCount", "Spans"], ["totalTokens", "Tokens"], ["totalCost", "Cost"], ["startTime", "When"]] as const).map(([key, label]) => (
                        <th key={key} className="px-4 py-2 text-right">
                          <button
                            type="button"
                            onClick={() => toggleSort(key)}
                            className="inline-flex items-center gap-1 transition-colors hover:text-slate-300"
                          >
                            {label}
                            {sortKey === key ? (
                              sortDir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                            ) : (
                              <ArrowUpDown className="h-3 w-3 opacity-30" />
                            )}
                          </button>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {traces.map((trace) => (
                      <tr key={trace.traceId} className="rounded-2xl border border-white/6 bg-white/4">
                        <td className="rounded-l-2xl px-4 py-4">
                          <StatusDot status={trace.status} />
                        </td>
                        <td className="px-4 py-4">
                          <Link
                            to={`/trace/${trace.traceId}`}
                            className="group inline-flex max-w-[380px] flex-col gap-1 text-sm font-medium text-white transition-colors hover:text-emerald-300"
                          >
                            <span className="inline-flex items-center gap-2">
                              <span className="truncate">{trace.name}</span>
                              <ArrowRight className="h-3.5 w-3.5 opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" />
                            </span>
                            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-slate-500">
                              {trace.traceId.slice(0, 12)}
                              {trace.totalDuration ? ` / ${formatDuration(trace.totalDuration)}` : ""}
                            </span>
                          </Link>
                        </td>
                        <td className="px-4 py-4 text-right font-mono text-xs text-slate-300">{trace.spanCount}</td>
                        <td className="px-4 py-4 text-right font-mono text-xs text-slate-300">{trace.totalTokens.toLocaleString()}</td>
                        <td className="px-4 py-4 text-right font-mono text-xs text-slate-300">{formatCost(trace.totalCost)}</td>
                        <td className="rounded-r-2xl px-4 py-4 text-right text-xs text-slate-500">{formatTimeAgo(trace.startTime)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 flex items-center justify-between gap-3 px-1">
                <div className="flex items-center gap-3">
                  <div className="text-xs text-slate-500">
                    {totalMatches > 0 ? `Showing ${offset + 1}-${Math.min(offset + traces.length, totalMatches)} of ${totalMatches}` : "Awaiting traces"}
                  </div>
                  <select
                    value={String(effectivePageSize)}
                    onChange={(event) => updateParams({ pageSize: Number(event.target.value) === 12 ? undefined : Number(event.target.value) })}
                    className="rounded-xl border border-white/8 bg-white/4 px-2 py-1.5 text-xs text-slate-300 focus:border-emerald-400/30 focus:outline-none"
                  >
                    {PAGE_SIZE_OPTIONS.map((size) => (
                      <option key={size} value={size}>{size} / page</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => updateParams({ page: page > 2 ? page - 1 : undefined }, false)}
                    disabled={page <= 1}
                    className="status-chip transition-colors hover:border-white/16 hover:bg-white/8 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    <span>Previous</span>
                  </button>
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

        <section className="dashboard-shell rounded-[26px] px-5 py-5">
          <div className="mb-5">
            <div className="hud-label">Intelligence layer</div>
            <h2 className="mt-1 text-xl font-semibold tracking-[-0.04em] text-white">
              Insights
            </h2>
          </div>
          <div className="space-y-4">
            {insights.length > 0 ? (
              insights.map((insight) => (
                <div
                  key={insight.id}
                  className={`rounded-2xl border p-4 ${
                    insight.severity === "critical"
                      ? "border-rose-400/20 bg-rose-500/8"
                      : insight.severity === "warning"
                        ? "border-amber-400/20 bg-amber-500/8"
                        : "border-white/6 bg-white/4"
                  }`}
                >
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-white">
                      {insight.type === "cost_anomaly" && <AlertTriangle className="h-4 w-4 text-amber-300" />}
                      {insight.type === "error_pattern" && <ShieldAlert className="h-4 w-4 text-rose-300" />}
                      {insight.type === "model_recommendation" && <Lightbulb className="h-4 w-4 text-sky-300" />}
                      {insight.type === "token_waste" && <TrendingUp className="h-4 w-4 text-purple-300" />}
                      {insight.title}
                    </div>
                    {insight.metric && (
                      <span className="shrink-0 rounded-full border border-white/10 bg-white/6 px-2 py-0.5 text-[10px] font-mono text-slate-400">
                        {insight.metric}
                      </span>
                    )}
                  </div>
                  <p className="text-sm leading-6 text-slate-400">
                    {insight.description}
                  </p>
                </div>
              ))
            ) : (
              <>
                <div className="rounded-2xl border border-white/6 bg-white/4 p-4">
                  <div className="mb-2 flex items-center gap-2 text-sm font-medium text-white">
                    <Sparkles className="h-4 w-4 text-sky-300" />
                    Health read
                  </div>
                  <p className="text-sm leading-6 text-slate-400">
                    {(stats?.errorRate ?? 0) > 0.05
                      ? "Error rate is elevated. Start with the most recent failed trace and inspect provider or tool payloads."
                      : "Error pressure is currently low. Use this window to compare provider cost drift and latency patterns."}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/6 bg-white/4 p-4">
                  <div className="mb-2 flex items-center gap-2 text-sm font-medium text-white">
                    <TrendingUp className="h-4 w-4 text-emerald-300" />
                    Spend insight
                  </div>
                  <p className="text-sm leading-6 text-slate-400">
                    {topProvider
                      ? `${topProvider.provider} currently leads cost share. If that is unexpected, inspect the filtered queue for bursty workflows.`
                      : "Provider concentration will appear here once traces land."}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/6 bg-white/4 p-4">
                  <div className="mb-2 flex items-center gap-2 text-sm font-medium text-white">
                    <AlertTriangle className="h-4 w-4 text-amber-300" />
                    Queue focus
                  </div>
                  <p className="text-sm leading-6 text-slate-400">
                    {latestTrace
                      ? `Latest traffic is "${latestTrace.name}". Open it to inspect hierarchy, timing, and payload shape.`
                      : "No active traces yet. Generate a request through an instrumented client to validate the pipeline."}
                  </p>
                </div>
              </>
            )}
          </div>
        </section>
      </div>
    </PageFrame>
  );
}
