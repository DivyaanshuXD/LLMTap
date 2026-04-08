import { useQuery } from "@tanstack/react-query";
import { fetchStats } from "../api/client.ts";
import {
  Clock,
  Coins,
  Cpu,
  Gauge,
  Layers,
  Zap,
} from "lucide-react";
import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import type { ColumnDef, SortingState } from "@tanstack/react-table";
import { DataTable } from "../components/DataTable.tsx";
import { PageFrame } from "../components/PageFrame.tsx";
import { LivePulse } from "../components/LivePulse.tsx";
import { EmptyState } from "../components/system/EmptyState.tsx";
import { NumberTicker } from "../components/magicui/number-ticker.tsx";
import {
  formatCompactNumber,
  formatCost,
  formatDuration,
} from "../lib/format.ts";
import { providerColors } from "../lib/provider-colors.ts";

/* ── Shared surface classes (DRY) ────────────────────────── */
const sectionShell = "dashboard-shell rounded-[var(--radius-card)]";

function HorizontalMetricChart({
  rows,
  valueFormatter,
  barClassName,
}: {
  rows: { name: string; value: number; tone?: string }[];
  valueFormatter: (value: number) => string;
  barClassName: string;
}) {
  const max = Math.max(...rows.map((row) => row.value), 1);

  return (
    <div className="space-y-4">
      {rows.map((row) => (
        <div
          key={row.name}
          className="rounded-[var(--radius-panel)] border border-[var(--border-dim)] bg-[linear-gradient(180deg,rgba(var(--ch-bg-panel),0.78),rgba(var(--ch-bg-base),0.94))] p-4"
        >
          <div className="flex items-center justify-between gap-4">
            <span className="truncate text-sm font-medium text-[var(--color-text-primary)]">
              {row.name}
            </span>
            <span className="font-mono text-sm text-[var(--color-text-secondary)]">
              {valueFormatter(row.value)}
            </span>
          </div>
          <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-[rgba(var(--ch-bg-base),0.82)]">
            <motion.div
              className={`h-full rounded-full ${barClassName}`}
              initial={{ width: 0 }}
              animate={{ width: `${Math.max((row.value / max) * 100, 6)}%` }}
              transition={{ duration: 0.45, ease: "easeOut" }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Models() {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "totalCost", desc: true },
  ]);
  const { data: stats, isLoading } = useQuery({
    queryKey: ["stats", 168],
    queryFn: () => fetchStats(168),
  });

  const byModel = stats?.byModel ?? [];

  const latencyData = byModel
    .map((m) => ({
      name: m.model.length > 20 ? `${m.model.slice(0, 18)}...` : m.model,
      value: m.avgDuration,
    }))
    .filter((m) => m.value > 0)
    .slice(0, 8);

  const tokenData = byModel
    .map((m) => ({
      name: m.model.length > 20 ? `${m.model.slice(0, 18)}...` : m.model,
      value: m.totalTokens,
    }))
    .filter((m) => m.value > 0)
    .slice(0, 8);
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
              {row.original.avgDuration ? formatDuration(row.original.avgDuration) : "No latency yet"} average latency
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
            {formatCompactNumber(row.original.totalTokens)}
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
        header: "Avg Latency",
        cell: ({ row }) => (
          <span className="font-mono text-sm text-[var(--color-text-tertiary)]">
            {row.original.avgDuration ? formatDuration(row.original.avgDuration) : "-"}
          </span>
        ),
        meta: { className: "text-right", cellClassName: "text-right" },
      },
      {
        id: "costPerCall",
        header: "Cost/Call",
        accessorFn: (row) => (row.spanCount > 0 ? row.totalCost / row.spanCount : 0),
        cell: ({ row }) => (
          <span className="font-mono text-sm text-[var(--color-text-tertiary)]">
            {row.original.spanCount > 0
              ? formatCost(row.original.totalCost / row.original.spanCount)
              : "-"}
          </span>
        ),
        meta: { className: "text-right", cellClassName: "text-right" },
      },
    ],
    []
  );

  if (isLoading) {
    return (
      <div className="mx-auto max-w-[1760px] space-y-8">
        <div className="skeleton-panel h-44 rounded-[28px]" />
        <div className="skeleton-panel h-80 rounded-[24px]" />
      </div>
    );
  }

  return (
    <PageFrame
      eyebrow="Model Intelligence"
      title="Every model. Every metric. One surface."
      description="Compare cost, token volume, latency, and call frequency across all models in your rotation. Identify the models consuming the most budget and the ones delivering the best performance."
      aside={
        <div className="insight-panel">
          <LivePulse />
          <div className="mt-5 space-y-4">
            <div className="deck-card deck-card--accent">
              <div className="hud-label">Models active</div>
              <div className="mt-2 text-lg font-medium text-[var(--color-text-primary)]">
                <NumberTicker value={byModel.length} />
              </div>
              <div className="mt-2 text-sm text-[var(--color-text-secondary)]">
                Across {new Set(byModel.map((m) => m.provider)).size} providers
              </div>
            </div>
            <div className="deck-card">
              <div className="hud-label">Highest cost model</div>
              <div className="mt-2 text-lg font-medium text-[var(--color-text-primary)]">
                {byModel[0]?.model ?? "No data"}
              </div>
              <div className="mt-2 text-sm text-[var(--color-text-secondary)]">
                {byModel[0] ? formatCost(byModel[0].totalCost) : "-"}
              </div>
            </div>
          </div>
        </div>
      }
    >
      <div className="pill-strip w-fit max-w-full overflow-x-auto">
        <span className="pill-item">
          window <strong>168h</strong>
        </span>
        <span className="pill-item">
          models <strong>{byModel.length}</strong>
        </span>
        <span className="pill-item">
          providers <strong>{new Set(byModel.map((m) => m.provider)).size}</strong>
        </span>
        <span className="pill-item">
          tokens <strong>{formatCompactNumber(stats?.totalTokens ?? 0)}</strong>
        </span>
      </div>

      {byModel.length > 0 ? (
        <>
          <motion.div
            className={`${sectionShell} overflow-hidden p-5`}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
          >
            <div className="mb-4 flex items-center justify-between gap-3 px-1">
            <div>
              <div className="hud-label">Model roster</div>
              <h2 className="page-section-title mt-1">
                Performance by model
              </h2>
            </div>
              <span className="status-chip">
                <Layers className="h-3.5 w-3.5 text-[var(--color-accent)]" />
                <span>{byModel.length} models</span>
              </span>
            </div>
            <DataTable columns={modelColumns} data={byModel} sorting={sorting} onSortingChange={setSorting} />
          </motion.div>

          <div className="grid gap-5 xl:grid-cols-2">
            <motion.div
              className={`${sectionShell} p-5`}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.35 }}
            >
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <div className="hud-label">Latency profile</div>
                  <h2 className="page-section-title mt-1">
                    Average latency by model
                  </h2>
                </div>
                <Clock className="h-4 w-4 text-[var(--color-accent)]" />
              </div>
              {latencyData.length > 0 ? (
                <HorizontalMetricChart
                  rows={latencyData}
                  valueFormatter={formatDuration}
                  barClassName="bg-[linear-gradient(90deg,rgba(var(--ch-accent-2),0.95),rgba(var(--ch-accent),0.78))]"
                />
              ) : (
                <EmptyState
                  title="No latency data available yet"
                  description="Latency lanes appear once calls have enough timing data to compare across models."
                  className="h-[280px]"
                />
              )}
            </motion.div>

            <motion.div
              className={`${sectionShell} p-5`}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.35 }}
            >
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <div className="hud-label">Token distribution</div>
                  <h2 className="page-section-title mt-1">
                    Token volume by model
                  </h2>
                </div>
                <Cpu className="h-4 w-4 text-[var(--color-accent-2)]" />
              </div>
              {tokenData.length > 0 ? (
                <HorizontalMetricChart
                  rows={tokenData}
                  valueFormatter={formatCompactNumber}
                  barClassName="bg-[linear-gradient(90deg,rgba(var(--ch-accent),0.95),rgba(var(--ch-accent-2),0.78))]"
                />
              ) : (
                <EmptyState
                  title="No token distribution data available yet"
                  description="Token lanes appear once captured model traffic reaches the collector."
                  className="h-[280px]"
                />
              )}
            </motion.div>
          </div>
        </>
      ) : (
        <div className={`${sectionShell} p-16`}>
          <EmptyState
            title="No models tracked yet"
            description="Start sending traced API calls and model metrics will populate automatically."
          />
        </div>
      )}
    </PageFrame>
  );
}
