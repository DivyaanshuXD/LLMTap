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
import { NumberTicker } from "../components/magicui/number-ticker.tsx";
import {
  formatCompactNumber,
  formatCost,
  formatDuration,
} from "../lib/format.ts";
import { providerColors } from "../lib/provider-colors.ts";

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
    <div className="space-y-3">
      {rows.map((row) => (
        <div
          key={row.name}
          className="rounded-2xl border border-white/6 bg-[linear-gradient(180deg,rgba(10,16,28,0.9),rgba(5,10,20,0.94))] p-4"
        >
          <div className="flex items-center justify-between gap-4">
            <span className="truncate text-sm font-medium text-slate-200">
              {row.name}
            </span>
            <span className="font-mono text-xs text-slate-400">
              {valueFormatter(row.value)}
            </span>
          </div>
          <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-950/80">
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
            <div className="truncate font-mono text-xs font-semibold text-slate-100">
              {row.original.model}
            </div>
            <div className="mt-1 text-[11px] text-slate-500">
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
                backgroundColor: providerColors[row.original.provider] ?? "#a855f6",
                boxShadow: `0 0 10px ${providerColors[row.original.provider] ?? "#a855f6"}`,
              }}
            />
            <span className="rounded-full border border-white/8 bg-white/4 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-300">
              {row.original.provider}
            </span>
          </div>
        ),
      },
      {
        accessorKey: "spanCount",
        header: "Calls",
        cell: ({ row }) => (
          <span className="inline-flex items-center justify-center rounded-full border border-white/8 bg-white/4 px-2.5 py-0.5 font-mono text-[11px] text-slate-300">
            {row.original.spanCount}
          </span>
        ),
        meta: { className: "text-right", cellClassName: "text-right" },
      },
      {
        accessorKey: "totalTokens",
        header: "Tokens",
        cell: ({ row }) => (
          <span className="font-mono text-xs text-slate-300">
            {formatCompactNumber(row.original.totalTokens)}
          </span>
        ),
        meta: { className: "text-right", cellClassName: "text-right" },
      },
      {
        accessorKey: "totalCost",
        header: "Cost",
        cell: ({ row }) => (
          <span className="font-mono text-xs font-semibold text-white">
            {formatCost(row.original.totalCost)}
          </span>
        ),
        meta: { className: "text-right", cellClassName: "text-right" },
      },
      {
        accessorKey: "avgDuration",
        header: "Avg Latency",
        cell: ({ row }) => (
          <span className="font-mono text-xs text-slate-400">
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
          <span className="font-mono text-xs text-slate-500">
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
      <div className="mx-auto max-w-[1500px] space-y-8">
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
          <div className="mt-4 space-y-3">
            <div className="rounded-2xl border border-white/8 bg-white/4 p-4">
              <div className="hud-label">Models active</div>
              <div className="mt-2 text-lg font-medium text-white">
                <NumberTicker value={byModel.length} />
              </div>
              <div className="mt-1 text-sm text-slate-400">
                Across {new Set(byModel.map((m) => m.provider)).size} providers
              </div>
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/4 p-4">
              <div className="hud-label">Highest cost model</div>
              <div className="mt-2 text-base font-medium text-white">
                {byModel[0]?.model ?? "No data"}
              </div>
              <div className="mt-1 text-sm text-slate-400">
                {byModel[0] ? formatCost(byModel[0].totalCost) : "-"}
              </div>
            </div>
          </div>
        </div>
      }
    >
      {byModel.length > 0 ? (
        <>
          <motion.div
            className="dashboard-shell overflow-hidden rounded-[26px] px-4 py-4 sm:px-5"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
          >
            <div className="mb-3 flex items-center justify-between gap-3 px-1">
              <div>
                <div className="hud-label">Model roster</div>
                <h2 className="mt-1 text-xl font-semibold tracking-[-0.04em] text-white">
                  Performance by model
                </h2>
              </div>
              <span className="status-chip">
                <Layers className="h-3.5 w-3.5 text-sky-300" />
                <span>{byModel.length} models</span>
              </span>
            </div>
            <DataTable columns={modelColumns} data={byModel} sorting={sorting} onSortingChange={setSorting} />
          </motion.div>

          <div className="grid gap-5 xl:grid-cols-2">
            <motion.div
              className="dashboard-shell rounded-[26px] px-5 py-5"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.35 }}
            >
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <div className="hud-label">Latency profile</div>
                  <h2 className="mt-1 text-xl font-semibold tracking-[-0.04em] text-white">
                    Average latency by model
                  </h2>
                </div>
                <Clock className="h-4 w-4 text-sky-300" />
              </div>
              {latencyData.length > 0 ? (
                <HorizontalMetricChart
                  rows={latencyData}
                  valueFormatter={formatDuration}
                  barClassName="bg-[linear-gradient(90deg,rgba(56,189,248,0.95),rgba(34,211,238,0.78))]"
                />
              ) : (
                <div className="empty-state h-[280px] text-slate-500">
                  No latency data available yet.
                </div>
              )}
            </motion.div>

            <motion.div
              className="dashboard-shell rounded-[26px] px-5 py-5"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.35 }}
            >
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <div className="hud-label">Token distribution</div>
                  <h2 className="mt-1 text-xl font-semibold tracking-[-0.04em] text-white">
                    Token volume by model
                  </h2>
                </div>
                <Cpu className="h-4 w-4 text-emerald-300" />
              </div>
              {tokenData.length > 0 ? (
                <HorizontalMetricChart
                  rows={tokenData}
                  valueFormatter={formatCompactNumber}
                  barClassName="bg-[linear-gradient(90deg,rgba(52,211,153,0.95),rgba(14,165,233,0.78))]"
                />
              ) : (
                <div className="empty-state h-[280px] text-slate-500">
                  No token distribution data available yet.
                </div>
              )}
            </motion.div>
          </div>
        </>
      ) : (
        <div className="dashboard-shell rounded-[26px] p-16">
          <div className="empty-state">
            <Gauge className="h-8 w-8 text-slate-500" />
            <div className="text-base font-medium text-white">No models tracked yet</div>
            <div className="max-w-sm text-center text-sm text-slate-400">
              Start sending traced API calls and model metrics will populate automatically.
            </div>
          </div>
        </div>
      )}
    </PageFrame>
  );
}
