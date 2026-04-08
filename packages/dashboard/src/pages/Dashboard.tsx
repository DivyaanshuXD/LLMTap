import { useDeferredValue, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
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
  Accordion,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
} from "../components/animate-ui/components/base/accordion.tsx";
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
import {
  CommandBar,
  CostTag,
  EmptyState,
  ProviderBadge,
  TraceRow,
} from "../components/system/index.ts";

/* ── Shared surface classes (DRY) ────────────────────────── */
const sectionShell = "dashboard-shell rounded-[var(--radius-card)]";

const PAGE_SIZE_OPTIONS = [12, 25, 50, 100] as const;

export default function Dashboard() {
  const navigate = useNavigate();
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
            <div className="deck-card deck-card--accent">
              <div className="hud-label">Dominant provider</div>
              <div className="mt-2 flex items-center justify-between">
                <div
                  className="capitalize text-[var(--color-text-primary)]"
                  style={{
                    fontFamily: "var(--font-operator)",
                    fontSize: "30px",
                    fontWeight: 700,
                    lineHeight: "0.92",
                    letterSpacing: "-0.04em",
                  }}
                >
                  {topProvider?.provider ?? "Awaiting traffic"}
                </div>
                <Orbit className="h-4 w-4 text-[var(--color-accent)]" />
              </div>
              <div className="mt-2 text-sm text-[var(--color-text-secondary)]">
                {topProvider
                  ? `${topProvider.spanCount} calls, ${formatCost(topProvider.totalCost)} spend`
                  : "No provider activity yet"}
              </div>
            </div>
            <div className="deck-card">
              <div className="hud-label">Latest trace</div>
              <div className="mt-2 text-lg font-medium text-[var(--color-text-primary)]">
                {latestTrace?.name ?? "No recent traces"}
              </div>
              <div className="mt-2 text-sm text-[var(--color-text-secondary)]">
                {latestTrace
                  ? `${formatTimeAgo(latestTrace.startTime)} / ${latestTrace.spanCount} spans`
                  : "Start sending spans to populate the deck"}
              </div>
            </div>
          </div>
        </div>
      }
    >
      <div className="pill-strip w-fit max-w-full overflow-x-auto">
        <span className="pill-item">
          window <strong>{traceQuery.periodHours}h</strong>
        </span>
        <span className="pill-item">
          providers <strong>{providerOptions.length || 0}</strong>
        </span>
        <span className="pill-item">
          traces <strong>{totalMatches}</strong>
        </span>
        <span className="pill-item">
          status <strong>{stats?.errorCount ? "watching" : "stable"}</strong>
        </span>
      </div>

      <StatisticsWithStatusGrid
        cards={dashboardStatsCards}
        className="max-w-none px-0 sm:px-0 lg:px-0"
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.95fr)]">
        {/* ── Cost gradient ── */}
        <section className={`${sectionShell} p-5 sm:p-6`}>
          <div className="mb-5 flex items-center justify-between">
            <div>
              <div className="hud-label">Economic pulse</div>
              <h2 className="page-section-title mt-1">
                Cost gradient
              </h2>
            </div>
            <div className="status-chip">
              <Gauge className="h-3.5 w-3.5 text-[var(--color-accent)]" />
              <span>{traceQuery.periodHours}h window</span>
            </div>
          </div>
          {chartData.length > 0 ? (
            <div className="surface-strong overflow-hidden rounded-[var(--radius-card)] p-4">
              <GlowingLineChart
                data={chartData}
                xDataKey="timestamp"
                primaryDataKey="cost"
              />
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="surface-muted rounded-[var(--radius-panel)] p-4">
                  <div className="hud-label">Latest</div>
                  <div className="mt-2 text-lg font-semibold text-[var(--color-text-primary)]">
                    {formatCost(chartData.at(-1)?.cost ?? 0)}
                  </div>
                </div>
                <div className="surface-muted rounded-[var(--radius-panel)] p-4">
                  <div className="hud-label">Peak</div>
                  <div className="mt-2 text-lg font-semibold text-[var(--color-text-primary)]">
                    {formatCost(
                      Math.max(...chartData.map((point) => point.cost), 0)
                    )}
                  </div>
                </div>
                <div className="surface-muted rounded-[var(--radius-panel)] p-4">
                  <div className="hud-label">Change</div>
                  <div
                    className={`mt-2 text-lg font-semibold ${
                      (chartData.at(-1)?.cost ?? 0) -
                        (chartData.at(-2)?.cost ?? chartData.at(-1)?.cost ?? 0) >=
                      0
                        ? "text-[var(--color-accent)]"
                        : "text-[var(--color-text-primary)]"
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
            <EmptyState
              title="No cost movement yet"
              description="This turns into a live spend curve as soon as the collector receives traced calls."
              className="min-h-[320px]"
            />
          )}
        </section>

        {/* ── Provider allocation ── */}
        <section className={`${sectionShell} p-5 sm:p-6`}>
          <div className="mb-5">
            <div className="hud-label">Provider pressure</div>
            <h2 className="page-section-title mt-1">
              Allocation by provider
            </h2>
          </div>
          <div className="space-y-4">
            {(stats?.byProvider ?? []).length > 0 ? (stats?.byProvider ?? []).map((providerEntry) => {
              const ratio =
                (stats?.totalCost ?? 0) > 0
                  ? (providerEntry.totalCost / (stats?.totalCost ?? 1)) * 100
                  : 0;
              return (
                <div key={providerEntry.provider} className="surface-muted rounded-[var(--radius-panel)] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <ProviderBadge provider={providerEntry.provider} />
                      <div className="text-[length:var(--text-caption)] text-[var(--color-text-secondary)]">
                        {providerEntry.spanCount} calls / {formatCompactNumber(providerEntry.totalTokens)} tokens
                      </div>
                    </div>
                    <div className="text-right">
                      <CostTag value={providerEntry.totalCost} size="sm" />
                      <div className="text-[length:var(--text-caption)] text-[var(--color-text-tertiary)]">{formatDuration(providerEntry.avgDuration)}</div>
                    </div>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-[rgba(var(--ch-bg-base),0.84)]">
                    <motion.div
                      className="h-full w-full origin-left rounded-full bg-[linear-gradient(90deg,var(--color-accent-2),var(--color-accent))]"
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: Math.max(ratio, 4) / 100 }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                    />
                  </div>
                </div>
              );
            }) : (
              <EmptyState
                title="No provider activity yet"
                description="Allocation bands appear here once the collector receives instrumented traffic."
                className="min-h-[320px]"
              />
            )}
          </div>
        </section>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.85fr)]">
        {/* ── Trace dispatch queue ── */}
        <section className={`${sectionShell} p-4 sm:p-5`}>
          <div className="surface-strong mb-4 rounded-[var(--radius-card)] p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="hud-label">Search console</div>
                <h2 className="page-section-title mt-1">
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
                  className="status-chip transition-all duration-[--duration-normal] hover:border-[var(--border-default)] hover:bg-[rgba(var(--ch-accent),0.06)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <X className="h-3.5 w-3.5" />
                  <span>Clear</span>
                </button>
              </div>
            </div>

            <div className="mt-4 grid gap-3 xl:grid-cols-[minmax(0,1.7fr)_repeat(3,minmax(0,0.7fr))]">
              <CommandBar
                value={searchTerm}
                onChange={(value) => updateParams({ q: value || undefined })}
                placeholder="Search traces, models, providers, errors"
              />
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
            <EmptyState
              title="Loading trace queue"
              description="The latest calls are being assembled into the dispatch surface."
              className="min-h-[280px]"
            />
          ) : traces.length === 0 && !hasActiveFilters ? (
            <GettingStartedPanel />
          ) : traces.length === 0 ? (
            <EmptyState
              title="No traces match these filters"
              description="Try adjusting the search term, provider filter, or time window."
              className="min-h-[280px]"
            />
          ) : (
            <>
              <div className="space-y-2.5">
                <div className="grid grid-cols-[auto_auto_minmax(0,1.5fr)_minmax(0,0.8fr)_minmax(72px,0.5fr)_minmax(80px,0.7fr)_minmax(94px,0.6fr)_minmax(86px,0.6fr)_minmax(96px,0.7fr)] gap-3 px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-[var(--color-text-tertiary)]">
                  <span />
                  <span>State</span>
                  <span>Trace</span>
                  <span>ID</span>
                  <button type="button" onClick={() => toggleSort("spanCount")} className="justify-self-end">
                    Spans
                  </button>
                  <button type="button" onClick={() => toggleSort("totalTokens")} className="justify-self-end">
                    Tokens
                  </button>
                  <button type="button" onClick={() => toggleSort("totalCost")} className="justify-self-end">
                    Cost
                  </button>
                  <span className="justify-self-end">Duration</span>
                  <button type="button" onClick={() => toggleSort("startTime")} className="justify-self-end">
                    When
                  </button>
                </div>
                {traces.map((trace, index) => (
                  <TraceRow
                    key={trace.traceId}
                    index={index}
                    trace={{
                      id: trace.traceId,
                      name: trace.name,
                      status: trace.status === "ok" ? "complete" : "error",
                      spans: trace.spanCount,
                      tokens: trace.totalTokens,
                      cost: trace.totalCost,
                      duration: trace.totalDuration ?? 0,
                      when: formatTimeAgo(trace.startTime),
                    }}
                    href={`/trace/${trace.traceId}`}
                    onClick={(id) => navigate(`/trace/${id}`)}
                  />
                ))}
              </div>

              <div className="mt-4 flex items-center justify-between gap-3 px-1">
                <div className="flex items-center gap-3">
                  <div className="text-[length:var(--text-caption)] text-[var(--color-text-tertiary)]">
                    {totalMatches > 0 ? `Showing ${offset + 1}-${Math.min(offset + traces.length, totalMatches)} of ${totalMatches}` : "Awaiting traces"}
                  </div>
                  <Select
                    value={String(effectivePageSize)}
                    onValueChange={(val) => updateParams({ pageSize: Number(val) === 12 ? undefined : Number(val) })}
                  >
                    <SelectTrigger className="w-auto rounded-xl px-2 py-1.5 text-[length:var(--text-caption)]">
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

        {/* ── Insights ── */}
        <section className={`${sectionShell} p-5`}>
          <div className="mb-5">
            <div className="hud-label">Intelligence layer</div>
            <h2 className="page-section-title mt-1">
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
                      ? "border-[var(--color-text-primary)]/18 bg-[var(--color-text-primary)]/8"
                      : insight.severity === "warning"
                        ? "border-[var(--color-accent-2)]/18 bg-[var(--color-accent-2)]/8"
                        : "border-[var(--border-dim)] bg-[rgba(var(--ch-text-primary),0.03)]"
                  }`}
                >
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-[var(--color-text-primary)]">
                      {insight.type === "cost_anomaly" && <AlertTriangle className="h-4 w-4 text-[var(--color-accent-2)]" />}
                      {insight.type === "error_pattern" && <ShieldAlert className="h-4 w-4 text-[var(--color-text-primary)]" />}
                      {insight.type === "model_recommendation" && <Lightbulb className="h-4 w-4 text-[var(--color-accent)]" />}
                      {insight.type === "token_waste" && <TrendingUp className="h-4 w-4 text-[var(--color-accent-2)]" />}
                      {insight.title}
                    </div>
                    {insight.metric && (
                      <span className="shrink-0 rounded-full border border-[var(--border-dim)] bg-[rgba(var(--ch-text-primary),0.04)] px-2 py-0.5 font-mono text-[length:var(--text-hud)] text-[var(--color-text-tertiary)]">
                        {insight.metric}
                      </span>
                    )}
                  </div>
                  <p className="text-sm leading-6 text-[var(--color-text-secondary)]">
                    {insight.description}
                  </p>
                </div>
              ))
            ) : (
              <>
                <div className="surface-muted rounded-2xl p-4">
                  <div className="mb-2 flex items-center gap-2 text-sm font-medium text-[var(--color-text-primary)]">
                    <Sparkles className="h-4 w-4 text-[var(--color-accent)]" />
                    Health read
                  </div>
                  <p className="text-sm leading-6 text-[var(--color-text-secondary)]">
                    {(stats?.errorRate ?? 0) > 0.05
                      ? "Error rate is elevated. Start with the most recent failed trace and inspect provider or tool payloads."
                      : "Error pressure is currently low. Use this window to compare provider cost drift and latency patterns."}
                  </p>
                </div>
                <div className="surface-muted rounded-2xl p-4">
                  <div className="mb-2 flex items-center gap-2 text-sm font-medium text-[var(--color-text-primary)]">
                    <TrendingUp className="h-4 w-4 text-[var(--color-accent-2)]" />
                    Spend insight
                  </div>
                  <p className="text-sm leading-6 text-[var(--color-text-secondary)]">
                    {topProvider
                      ? `${topProvider.provider} currently leads cost share. If that is unexpected, inspect the filtered queue for bursty workflows.`
                      : "Provider concentration will appear here once traces land."}
                  </p>
                </div>
                <div className="surface-muted rounded-2xl p-4">
                  <div className="mb-2 flex items-center gap-2 text-sm font-medium text-[var(--color-text-primary)]">
                    <AlertTriangle className="h-4 w-4 text-[var(--color-text-primary)]" />
                    Queue focus
                  </div>
                  <p className="text-sm leading-6 text-[var(--color-text-secondary)]">
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

      <section className={`${sectionShell} p-5 sm:p-6`}>
        <div className="mb-5">
          <div className="hud-label">Operator Briefing</div>
          <h2 className="page-section-title mt-1">
            What this surface is telling you
          </h2>
        </div>
        <Accordion defaultValue={["queue-health"]} multiple>
          <AccordionItem value="queue-health" className="border-[var(--border-dim)]">
            <AccordionTrigger className="text-base text-[var(--color-text-primary)] hover:no-underline">
              What should I check first when I open LLMTap?
            </AccordionTrigger>
            <AccordionPanel className="leading-6 text-[var(--color-text-secondary)]">
              Start with the economic pulse, dominant provider, and latest trace. That combination tells you whether
              traffic is flowing, whether one provider is dominating spend, and which trace should be inspected first.
            </AccordionPanel>
          </AccordionItem>
          <AccordionItem value="traces-vs-economics" className="border-[var(--border-dim)]">
            <AccordionTrigger className="text-base text-[var(--color-text-primary)] hover:no-underline">
              When do I move from Overview to Traces or Economics?
            </AccordionTrigger>
            <AccordionPanel className="leading-6 text-[var(--color-text-secondary)]">
              Use Traces when something looks operationally wrong and you need the exact request timeline. Use Economics
              when behavior is healthy but budget concentration or model mix looks suspicious.
            </AccordionPanel>
          </AccordionItem>
          <AccordionItem value="healthy-window" className="border-[var(--border-dim)]">
            <AccordionTrigger className="text-base text-[var(--color-text-primary)] hover:no-underline">
              What does a healthy window look like?
            </AccordionTrigger>
            <AccordionPanel className="leading-6 text-[var(--color-text-secondary)]">
              Healthy windows show steady cost movement, low risk surface, no sudden provider concentration shifts, and
              a queue of recent traces that stays readable instead of spiking with failures.
            </AccordionPanel>
          </AccordionItem>
        </Accordion>
      </section>
    </PageFrame>
  );
}
