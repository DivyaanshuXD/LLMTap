import { useQuery } from "@tanstack/react-query";
import { fetchStats } from "../api/client.ts";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
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
import type { ReactNode } from "react";
import { PageFrame } from "../components/PageFrame.tsx";
import { LivePulse } from "../components/LivePulse.tsx";
import {
  formatCompactNumber,
  formatCost,
  formatDuration,
} from "../lib/format.ts";

const colors = [
  "#34d399",
  "#38bdf8",
  "#818cf8",
  "#f59e0b",
  "#f97316",
  "#f472b6",
];

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

const tooltipStyle = {
  backgroundColor: "rgba(8, 15, 28, 0.96)",
  border: "1px solid rgba(148, 163, 184, 0.14)",
  borderRadius: "18px",
  fontSize: 12,
  boxShadow: "0 20px 60px rgba(0,0,0,0.45)",
  backdropFilter: "blur(12px)",
};

function CostCard({
  label,
  value,
  sub,
  icon,
  gradient,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: ReactNode;
  gradient: string;
}) {
  return (
    <motion.div variants={stagger.item} className="metric-card">
      <div className={`metric-orb ${gradient}`}>{icon}</div>
      <div>
        <div className="hud-label">{label}</div>
        <div className="mt-1 text-3xl font-semibold tracking-[-0.04em] text-white">
          {value}
        </div>
        {sub && <div className="mt-2 text-sm text-slate-400">{sub}</div>}
      </div>
    </motion.div>
  );
}

export default function Costs() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["stats"],
    queryFn: () => fetchStats(24),
  });

  const byModel = stats?.byModel ?? [];
  const byProvider = stats?.byProvider ?? [];

  const modelChartData = byModel.map((model) => ({
    name: model.model.length > 22 ? `${model.model.slice(0, 20)}...` : model.model,
    cost: Number(model.totalCost.toFixed(6)),
    tokens: model.totalTokens,
    calls: model.spanCount,
  }));

  const providerPieData = byProvider.map((provider) => ({
    name: provider.provider,
    value: Number(provider.totalCost.toFixed(6)),
  }));

  if (isLoading) {
    return (
      <div className="mx-auto max-w-[1500px] space-y-8">
        <div className="skeleton-panel h-44 rounded-[28px]" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="metric-card">
              <div className="skeleton-panel h-12 w-12 rounded-2xl" />
              <div className="space-y-2">
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
      description="The economics view is now built like a cost cockpit. It surfaces burn concentration, provider mix, and the models that are consuming budget fastest."
      aside={
        <div className="insight-panel">
          <LivePulse />
          <div className="mt-4 space-y-3">
            <div className="rounded-2xl border border-white/8 bg-white/4 p-4">
              <div className="hud-label">Highest model spend</div>
              <div className="mt-2 text-base font-medium text-white">
                {byModel[0]?.model ?? "Awaiting traffic"}
              </div>
              <div className="mt-1 text-sm text-slate-400">
                {byModel[0]
                  ? `${formatCost(byModel[0].totalCost)} across ${byModel[0].spanCount} calls`
                  : "No model cost data yet"}
              </div>
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/4 p-4">
              <div className="hud-label">Provider spread</div>
              <div className="mt-2 text-base font-medium text-white">
                {byProvider.length} active providers
              </div>
              <div className="mt-1 text-sm text-slate-400">
                Cost dominance becomes obvious here before it becomes expensive.
              </div>
            </div>
          </div>
        </div>
      }
    >
      <motion.div
        className="grid grid-cols-1 gap-4 md:grid-cols-3"
        variants={stagger.container}
        initial="hidden"
        animate="show"
      >
        <CostCard
          icon={<Coins className="h-5 w-5" />}
          label="Total Cost"
          value={formatCost(stats?.totalCost ?? 0)}
          sub="Accumulated over the last 24 hours"
          gradient="bg-[linear-gradient(135deg,rgba(250,204,21,0.18),rgba(249,115,22,0.18))] text-amber-200"
        />
        <CostCard
          icon={<Zap className="h-5 w-5" />}
          label="Token Volume"
          value={formatCompactNumber(stats?.totalTokens ?? 0)}
          sub={`${stats?.totalSpans ?? 0} model calls observed`}
          gradient="bg-[linear-gradient(135deg,rgba(56,189,248,0.18),rgba(168,85,247,0.18))] text-sky-200"
        />
        <CostCard
          icon={<WalletCards className="h-5 w-5" />}
          label="Models in Rotation"
          value={String(byModel.length)}
          sub={`${byProvider.length} providers contributing to spend`}
          gradient="bg-[linear-gradient(135deg,rgba(52,211,153,0.18),rgba(14,165,233,0.18))] text-emerald-200"
        />
      </motion.div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
        <motion.div
          className="dashboard-shell rounded-[26px] px-5 py-5"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.35 }}
        >
          <div className="mb-5 flex items-center justify-between">
            <div>
              <div className="hud-label">Model ranking</div>
              <h2 className="mt-1 text-xl font-semibold tracking-[-0.04em] text-white">
                Cost by model
              </h2>
            </div>
            <span className="status-chip">
              <ReceiptText className="h-3.5 w-3.5 text-sky-300" />
              <span>Spend concentration</span>
            </span>
          </div>

          {modelChartData.length > 0 ? (
            <div className="relative min-h-[320px]">
              <ResponsiveContainer width="100%" height={Math.max(320, modelChartData.length * 58)}>
                <BarChart data={modelChartData} layout="vertical">
                  <CartesianGrid stroke="rgba(148,163,184,0.08)" horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(value: number) => formatCost(value)}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 11, fill: "#cbd5e1" }}
                    axisLine={false}
                    tickLine={false}
                    width={160}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value: number) => [formatCost(value), "Cost"]}
                  />
                  <Bar dataKey="cost" fill="#34d399" radius={[0, 10, 10, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="empty-state h-[320px]">
              <BarChart3 className="h-8 w-8 text-slate-500" />
              <div className="text-base font-medium text-white">No cost data yet</div>
              <div className="text-center text-sm text-slate-400">
                Model spend will stack up here as soon as traffic hits the collector.
              </div>
            </div>
          )}
        </motion.div>

        <motion.div
          className="dashboard-shell rounded-[26px] px-5 py-5"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.35 }}
        >
          <div className="mb-5 flex items-center justify-between">
            <div>
              <div className="hud-label">Provider mix</div>
              <h2 className="mt-1 text-xl font-semibold tracking-[-0.04em] text-white">
                Who is taking the budget
              </h2>
            </div>
            <Orbit className="h-4 w-4 text-sky-300" />
          </div>

          {providerPieData.length > 0 ? (
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
              <ResponsiveContainer width="100%" height={260} className="lg:max-w-[260px]">
                <PieChart>
                  <Pie
                    data={providerPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={62}
                    outerRadius={96}
                    paddingAngle={3}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {providerPieData.map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value: number) => [formatCost(value), "Cost"]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-3">
                {providerPieData.map((provider, index) => (
                  <div
                    key={provider.name}
                    className="rounded-2xl border border-white/6 bg-white/4 p-3.5"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="h-3 w-3 shrink-0 rounded-sm"
                        style={{
                          backgroundColor: colors[index % colors.length],
                          boxShadow: `0 0 10px ${colors[index % colors.length]}50`,
                        }}
                      />
                      <span className="flex-1 text-sm font-medium capitalize text-white">
                        {provider.name}
                      </span>
                      <span className="font-mono text-xs text-slate-400">
                        {formatCost(provider.value)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="empty-state h-[260px]">
              <Layers className="h-8 w-8 text-slate-500" />
              <div className="text-base font-medium text-white">No providers yet</div>
              <div className="text-center text-sm text-slate-400">
                Provider allocation appears here as soon as at least one model call is captured.
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {byModel.length > 0 ? (
        <motion.div
          className="dashboard-shell overflow-hidden rounded-[26px] px-4 py-4 sm:px-5"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.35 }}
        >
          <div className="mb-3 flex items-center justify-between gap-3 px-1">
            <div>
              <div className="hud-label">Detailed ledger</div>
              <h2 className="mt-1 text-xl font-semibold tracking-[-0.04em] text-white">
                Breakdown by model
              </h2>
            </div>
            <span className="status-chip">
              <TimerReset className="h-3.5 w-3.5 text-sky-300" />
              <span>{byModel.length} models</span>
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-separate border-spacing-y-2 text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-[0.18em] text-slate-500">
                  <th className="px-4 py-2">Model</th>
                  <th className="px-4 py-2">Provider</th>
                  <th className="px-4 py-2 text-right">Calls</th>
                  <th className="px-4 py-2 text-right">Tokens</th>
                  <th className="px-4 py-2 text-right">Cost</th>
                  <th className="px-4 py-2 text-right">Avg Duration</th>
                </tr>
              </thead>
              <tbody>
                {byModel.map((model, index) => {
                  const providerColors: Record<string, string> = {
                    openai: "bg-emerald-400",
                    anthropic: "bg-amber-300",
                    google: "bg-sky-400",
                  };

                  return (
                    <motion.tr
                      key={`${model.provider}-${model.model}`}
                      className="rounded-2xl border border-white/6 bg-white/4"
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.03 * index, duration: 0.3 }}
                    >
                      <td className="rounded-l-2xl px-4 py-4 font-mono text-xs font-semibold text-slate-100">
                        {model.model}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`h-2.5 w-2.5 rounded-full ${providerColors[model.provider] ?? "bg-purple-400"}`}
                            style={{ boxShadow: "0 0 10px currentColor" }}
                          />
                          <span className="text-xs font-medium capitalize text-slate-200">
                            {model.provider}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <span className="inline-flex items-center justify-center rounded-md border border-white/8 bg-slate-950/70 px-2 py-0.5 font-mono text-xs text-slate-400">
                          {model.spanCount}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right font-mono text-xs text-slate-300">
                        {model.totalTokens.toLocaleString()}
                      </td>
                      <td className="px-4 py-4 text-right font-mono text-xs font-semibold text-white">
                        {formatCost(model.totalCost)}
                      </td>
                      <td className="rounded-r-2xl px-4 py-4 text-right font-mono text-xs text-slate-500">
                        {model.avgDuration ? formatDuration(model.avgDuration) : "-"}
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </motion.div>
      ) : (
        <motion.div
          className="dashboard-shell rounded-[26px] p-16"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="empty-state">
            <BarChart3 className="h-8 w-8 text-slate-500" />
            <div className="text-base font-medium text-white">No cost data yet</div>
            <div className="max-w-sm text-center text-sm text-slate-400">
              Start making traced model calls and the economic layer will fill in automatically.
            </div>
          </div>
        </motion.div>
      )}
    </PageFrame>
  );
}
