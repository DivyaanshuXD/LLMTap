import { useQuery } from "@tanstack/react-query";
import { fetchStats } from "../api/client.ts";
import {
  BarChart3,
  Coins,
  Layers,
  Orbit,
  ReceiptText,
  TimerReset,
  WalletCards,
  Zap,
} from "lucide-react";
import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import type { ColumnDef, SortingState } from "@tanstack/react-table";
import { DonutBreakdown } from "../components/charts/DonutBreakdown.tsx";
import { RankingBars } from "../components/charts/RankingBars.tsx";
import { PageFrame } from "../components/PageFrame.tsx";
import { DataTable } from "../components/DataTable.tsx";
import { LivePulse } from "../components/LivePulse.tsx";
import { EmptyState } from "../components/system/EmptyState.tsx";
import { StatisticsWithStatusGrid } from "../components/shadcn-studio/blocks/statistics-with-status-grid.tsx";
import type { StatisticsCardProps } from "../components/shadcn-studio/blocks/statistics-with-status.tsx";
import {
  formatCompactNumber,
  formatCost,
  formatDuration,
} from "../lib/format.ts";
import { providerColors } from "../lib/provider-colors.ts";

/* ── Shared surface classes (DRY) ────────────────────────── */
const sectionShell = "dashboard-shell rounded-[var(--radius-card)]";

const stagger = {
  container: { transition: { staggerChildren: 0.08 } },
  item: {
    hidden: { opacity: 0, y: 20, scale: 0.97 },
    show: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const },
    },
  },
};

export default function Costs() {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "totalCost", desc: true },
  ]);
  const { data: stats, isLoading } = useQuery({
    queryKey: ["stats"],
    queryFn: () => fetchStats(24),
  });

  const byModel = stats?.byModel ?? [];
  const byProvider = stats?.byProvider ?? [];

  const modelRanking = byModel.slice(0, 8).map((model) => ({
    label: model.model,
    provider: model.provider,
    totalCost: model.totalCost,
    totalTokens: model.totalTokens,
    avgDuration: model.avgDuration ?? 0,
    spanCount: model.spanCount,
  }));

  const providerDistribution = byProvider.map((provider) => ({
    label: provider.provider,
    value: provider.totalCost,
    color: providerColors[provider.provider] ?? "var(--color-accent)",
    detail: `${provider.spanCount} calls · ${formatCompactNumber(provider.totalTokens)} tokens`,
  }));
  const costStatCards: StatisticsCardProps[] = [
    {
      title: "Total Cost",
      value: formatCost(stats?.totalCost ?? 0),
      status: (stats?.totalCost ?? 0) > 0 ? "observe" : "unknown",
      range: "Accumulated over the last 24 hours",
      icon: <Coins className="h-4 w-4" />,
    },
    {
      title: "Token Volume",
      value: formatCompactNumber(stats?.totalTokens ?? 0),
      status: (stats?.totalTokens ?? 0) > 0 ? "within" : "unknown",
      range: `${stats?.totalSpans ?? 0} model calls observed`,
      icon: <Zap className="h-4 w-4" />,
    },
    {
      title: "Models in Rotation",
      value: String(byModel.length),
      status: byModel.length > 0 ? "within" : "unknown",
      range: `${byProvider.length} providers contributing to spend`,
      icon: <WalletCards className="h-4 w-4" />,
    },
  ];
  const modelColumns = useMemo<ColumnDef<(typeof byModel)[number]>[]>(
    () => [
      {
        accessorKey: "model",
        header: "Model",
        cell: ({ row }) => (
          <div className="min-w-0">
            <div className="truncate font-mono text-sm font-semibold text-[var(--color-text-primary)]">
              {row.original.model}
            </div>
            <div className="mt-1 text-xs text-[var(--color-text-secondary)]">
              {row.original.spanCount} calls in the current window
            </div>
          </div>
        ),
      },
      {
        accessorKey: "provider",
        header: "Provider",
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{
                backgroundColor: providerColors[row.original.provider] ?? "var(--color-accent)",
                boxShadow: `0 0 10px ${providerColors[row.original.provider] ?? "var(--color-accent)"}`,
              }}
            />
            <span className="rounded-full border border-[var(--border-dim)] bg-[rgba(var(--ch-text-primary),0.04)] px-2 py-0.5 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
              {row.original.provider}
            </span>
          </div>
        ),
      },
      {
        accessorKey: "spanCount",
        header: "Calls",
        cell: ({ row }) => (
          <span className="inline-flex items-center justify-center rounded-full border border-[var(--border-dim)] bg-[rgba(var(--ch-text-primary),0.04)] px-2.5 py-0.5 font-mono text-xs text-[var(--color-text-secondary)]">
            {row.original.spanCount}
          </span>
        ),
        meta: { className: "text-right", cellClassName: "text-right" },
      },
      {
        accessorKey: "totalTokens",
        header: "Tokens",
        cell: ({ row }) => (
          <span className="font-mono text-sm text-[var(--color-text-secondary)]">
            {row.original.totalTokens.toLocaleString()}
          </span>
        ),
        meta: { className: "text-right", cellClassName: "text-right" },
      },
      {
        accessorKey: "totalCost",
        header: "Cost",
        cell: ({ row }) => (
          <span className="font-mono text-sm font-semibold text-[var(--color-text-primary)]">
            {formatCost(row.original.totalCost)}
          </span>
        ),
        meta: { className: "text-right", cellClassName: "text-right" },
      },
      {
        accessorKey: "avgDuration",
        header: "Avg Duration",
        cell: ({ row }) => (
          <span className="font-mono text-sm text-[var(--color-text-tertiary)]">
            {row.original.avgDuration ? formatDuration(row.original.avgDuration) : "-"}
          </span>
        ),
        meta: { className: "text-right", cellClassName: "text-right" },
      },
    ],
    [byModel]
  );

  if (isLoading) {
    return (
      <div className="mx-auto max-w-[1760px] space-y-8">
        <div className="skeleton-panel h-44 rounded-[28px]" />
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="metric-card">
              <div className="skeleton-panel h-12 w-12 rounded-2xl" />
              <div className="space-y-3">
                <div className="skeleton-panel h-3 w-20 rounded-full" />
                <div className="skeleton-panel h-8 w-28 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <PageFrame
      eyebrow="Economic Layer"
      title="Understand where every token is converting into spend."
      description="This surface should answer two questions immediately: which models are burning budget, and which providers are quietly dominating the bill."
      aside={
        <div className="insight-panel">
          <LivePulse />
          <div className="mt-5 space-y-4">
            <div className="deck-card deck-card--accent">
              <div className="hud-label">Highest model spend</div>
              <div className="mt-2 text-lg font-medium text-[var(--color-text-primary)]">
                {byModel[0]?.model ?? "Awaiting traffic"}
              </div>
              <div className="mt-2 text-sm text-[var(--color-text-secondary)]">
                {byModel[0]
                  ? `${formatCost(byModel[0].totalCost)} across ${byModel[0].spanCount} calls`
                  : "No model cost data yet"}
              </div>
            </div>
            <div className="deck-card">
              <div className="hud-label">Provider spread</div>
              <div className="mt-2 text-lg font-medium text-[var(--color-text-primary)]">
                {byProvider.length} active providers
              </div>
              <div className="mt-2 text-sm text-[var(--color-text-secondary)]">
                Cost dominance becomes obvious here before it becomes expensive.
              </div>
            </div>
          </div>
        </div>
      }
    >
      <div className="pill-strip w-fit max-w-full overflow-x-auto">
        <span className="pill-item">
          window <strong>24h</strong>
        </span>
        <span className="pill-item">
          models <strong>{byModel.length}</strong>
        </span>
        <span className="pill-item">
          providers <strong>{byProvider.length}</strong>
        </span>
        <span className="pill-item">
          spend <strong>{formatCost(stats?.totalCost ?? 0)}</strong>
        </span>
      </div>

      <motion.div
        variants={stagger.item}
        initial="hidden"
        animate="show"
      >
        <StatisticsWithStatusGrid
          cards={costStatCards}
          className="max-w-none px-0 sm:px-0 lg:px-0 md:grid-cols-3 xl:grid-cols-3"
        />
      </motion.div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
        <motion.div
          className={`${sectionShell} p-5`}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.35 }}
        >
          <div className="mb-5 flex items-center justify-between">
            <div>
              <div className="hud-label">Model ranking</div>
              <h2 className="page-section-title mt-1">
                Cost by model
              </h2>
            </div>
            <span className="status-chip">
              <ReceiptText className="h-3.5 w-3.5 text-[var(--color-accent)]" />
              <span>Spend concentration</span>
            </span>
          </div>

          {modelRanking.length > 0 ? (
            <RankingBars rows={modelRanking} />
          ) : (
            <EmptyState
              title="No cost data yet"
              description="Model spend will stack up here as soon as traffic hits the collector."
              className="h-[320px]"
            />
          )}
        </motion.div>

        <motion.div
          className={`${sectionShell} p-5`}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.35 }}
        >
          <div className="mb-5 flex items-center justify-between">
            <div>
              <div className="hud-label">Provider mix</div>
              <h2 className="page-section-title mt-1">
                Who is taking the budget
              </h2>
            </div>
            <Orbit className="h-4 w-4 text-[var(--color-accent)]" />
          </div>

          {providerDistribution.length > 0 ? (
            <DonutBreakdown
              segments={providerDistribution}
              totalLabel="24h spend"
              totalValue={formatCost(stats?.totalCost ?? 0)}
            />
          ) : (
            <EmptyState
              title="No providers yet"
              description="Provider allocation appears here as soon as at least one model call is captured."
              className="h-[260px]"
            />
          )}
        </motion.div>
      </div>

      {byModel.length > 0 ? (
        <motion.div
          className={`${sectionShell} overflow-hidden p-5`}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.35 }}
        >
          <div className="mb-4 flex items-center justify-between gap-3 px-1">
            <div>
              <div className="hud-label">Detailed ledger</div>
              <h2 className="page-section-title mt-1">
                Breakdown by model
              </h2>
            </div>
            <span className="status-chip">
              <TimerReset className="h-3.5 w-3.5 text-[var(--color-accent)]" />
              <span>{byModel.length} models</span>
            </span>
          </div>
          <DataTable columns={modelColumns} data={byModel} sorting={sorting} onSortingChange={setSorting} />
        </motion.div>
      ) : (
        <motion.div
          className={`${sectionShell} p-16`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <EmptyState
            title="No cost data yet"
            description="Start making traced model calls and the economic layer will fill in automatically."
          />
        </motion.div>
      )}
    </PageFrame>
  );
}
