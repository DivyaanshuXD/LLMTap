import { useDeferredValue, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { fetchStats, fetchTraces, fetchInsights } from "../api/client.ts";
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
import { GettingStartedPanel } from "../components/GettingStartedPanel.tsx";
import { LivePulse } from "../components/LivePulse.tsx";
import { PageFrame } from "../components/PageFrame.tsx";
import { StatusDot } from "../components/StatusDot.tsx";
import { GlowingLineChart } from "../components/charts/line-chart.tsx";
import {
  StatisticsWithStatusGrid,
} from "../components/shadcn-studio/blocks/statistics-with-status-grid.tsx";
import type { StatisticsCardProps } from "../components/shadcn-studio/blocks/statistics-with-status.tsx";
import { Button } from "../components/ui/button.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select.tsx";
import { PERIOD_OPTIONS } from "../lib/constants.ts";
import {
  formatCompactNumber,
  formatCost,
  formatDuration,
  formatTimeAgo,
} from "../lib/format.ts";

const PAGE_SIZE_OPTIONS = [12, 25, 50, 100] as const;

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
      timestamp: point.timestamp,
      cost: point.cost,
    })) ?? [];
  const avgCost = stats && stats.totalSpans > 0 ? stats.totalCost / stats.totalSpans : 0;
  const errorRatePercent = Math.round((stats?.errorRate ?? 0) * 100);
  const dashboardStatsCards: StatisticsCardProps[] = [
    {
      title: "Trace Volume",
      value: formatCompactNumber(stats?.totalTraces ?? 0),
      status: (stats?.totalTraces ?? 0) > 0 ? "within" : "unknown",
      range: `${stats?.totalSpans ?? 0} spans in window`,
      icon: <Radar className="h-4 w-4" />,
    },
    {
      title: "Token Throughput",
      value: formatCompactNumber(stats?.totalTokens ?? 0),
      status: (stats?.totalTokens ?? 0) > 0 ? "within" : "unknown",
      range: "Token load across active filter window",
      icon: <Cpu className="h-4 w-4" />,
    },
    {
      title: "Spend Velocity",
      value: formatCost(stats?.totalCost ?? 0),
      status: avgCost > 0 ? "observe" : "unknown",
      range: `${formatCost(avgCost)} avg per call`,
      icon: <TrendingUp className="h-4 w-4" />,
    },
    {
      title: "Risk Surface",
      value: `${errorRatePercent}%`,
      status: errorRatePercent >= 8 ? "exceed" : errorRatePercent >= 3 ? "observe" : "within",
      range: `${stats?.errorCount ?? 0} failing calls`,
      icon: <ShieldAlert className="h-4 w-4" />,
    },
  ];
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
      description="LLMTap should feel like a live operator console, not a half-finished devtool. This view keeps spend movement, provider pressure, queue state, and the latest traces readable in one sweep."
      aside={
        <div className="insight-panel">
          <LivePulse />
          <div className="mt-4 grid gap-3">
            <div className="surface-strong rounded-2xl p-4">
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
            <div className="surface-strong rounded-2xl p-4">
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
      <StatisticsWithStatusGrid
        cards={dashboardStatsCards}
        className="max-w-none px-0 sm:px-0 lg:px-0"
      />

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
            <div className="overflow-hidden rounded-[24px] border border-white/8 bg-[linear-gradient(180deg,rgba(6,12,22,0.98),rgba(4,8,17,0.98))] p-4">
              <GlowingLineChart
                data={chartData}
                xDataKey="timestamp"
                primaryDataKey="cost"
              />
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="surface-muted rounded-2xl p-4">
                  <div className="hud-label">Latest</div>
                  <div className="mt-2 text-lg font-semibold text-white">
                    {formatCost(chartData.at(-1)?.cost ?? 0)}
                  </div>
                </div>
                <div className="surface-muted rounded-2xl p-4">
                  <div className="hud-label">Peak</div>
                  <div className="mt-2 text-lg font-semibold text-white">
                    {formatCost(
                      Math.max(...chartData.map((point) => point.cost), 0)
                    )}
                  </div>
                </div>
                <div className="surface-muted rounded-2xl p-4">
                  <div className="hud-label">Change</div>
                  <div
                    className={`mt-2 text-lg font-semibold ${
                      (chartData.at(-1)?.cost ?? 0) -
                        (chartData.at(-2)?.cost ?? chartData.at(-1)?.cost ?? 0) >=
                      0
                        ? "text-emerald-200"
                        : "text-rose-200"
                    }`}
                  >
                    {(chartData.at(-1)?.cost ?? 0) -
                      (chartData.at(-2)?.cost ?? chartData.at(-1)?.cost ?? 0) >=
                    0
                      ? "+"
                      : "-"}
                    {formatCost(
                      Math.abs(
                        (chartData.at(-1)?.cost ?? 0) -
                          (chartData.at(-2)?.cost ??
                            chartData.at(-1)?.cost ??
                            0)
                      )
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="empty-state h-[320px]">
              <TrendingUp className="h-8 w-8 text-slate-500" />
              <div className="text-base font-medium text-white">No cost movement yet</div>
              <div className="max-w-sm text-center text-sm text-slate-500">
                This turns into a live spend curve as soon as the collector receives traced calls.
              </div>
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
                <div key={providerEntry.provider} className="surface-muted rounded-2xl p-4">
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
                      className="h-full w-full origin-left rounded-full bg-[linear-gradient(90deg,#34d399,#38bdf8)]"
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: Math.max(ratio, 4) / 100 }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
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
          <div className="surface-strong mb-4 rounded-[24px] p-4">
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
              <label className="field-surface relative block rounded-2xl">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  value={searchTerm}
                  onChange={(event) => updateParams({ q: event.target.value || undefined })}
                  placeholder="Search traces, models, providers, errors"
                  className="w-full rounded-2xl bg-transparent py-3 pl-10 pr-4 text-sm text-white placeholder:text-slate-500 focus:outline-none"
                />
              </label>
              <Select
                value={provider || "__all__"}
                onValueChange={(val) => updateParams({ provider: val === "__all__" ? undefined : val })}
              >
                <SelectTrigger className="w-full rounded-2xl py-3">
                  <SelectValue placeholder="All providers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All providers</SelectItem>
                  {providerOptions.map((providerOption) => (
                    <SelectItem key={providerOption} value={providerOption}>
                      {providerOption}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={validStatus || "__all__"}
                onValueChange={(val) => updateParams({ status: val === "__all__" ? undefined : val })}
              >
                <SelectTrigger className="w-full rounded-2xl py-3">
                  <SelectValue placeholder="All states" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All states</SelectItem>
                  <SelectItem value="ok">Healthy only</SelectItem>
                  <SelectItem value="error">Errors only</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={String(traceQuery.periodHours ?? 24)}
                onValueChange={(val) =>
                  updateParams({
                    periodHours: Number(val) === 24 ? undefined : Number(val),
                  })
                }
              >
                <SelectTrigger className="w-full rounded-2xl py-3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PERIOD_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={String(option.value)}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {tracesLoading ? (
            <div className="empty-state h-[280px] text-slate-500">Loading trace queue...</div>
          ) : traces.length === 0 && !hasActiveFilters ? (
            <GettingStartedPanel />
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
                      <tr key={trace.traceId} className="table-row-surface rounded-2xl">
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
                  <Select
                    value={String(effectivePageSize)}
                    onValueChange={(val) => updateParams({ pageSize: Number(val) === 12 ? undefined : Number(val) })}
                  >
                    <SelectTrigger className="w-auto rounded-xl px-2 py-1.5 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAGE_SIZE_OPTIONS.map((size) => (
                        <SelectItem key={size} value={String(size)}>{size} / page</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updateParams({ page: page > 2 ? page - 1 : undefined }, false)}
                    disabled={page <= 1}
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    <span>Previous</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updateParams({ page: page + 1 }, false)}
                    disabled={page >= totalPages}
                  >
                    <span>Next</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
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
                <div className="surface-muted rounded-2xl p-4">
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
                <div className="surface-muted rounded-2xl p-4">
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
                <div className="surface-muted rounded-2xl p-4">
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
