import { useQuery } from "@tanstack/react-query";
import { fetchStats } from "../api/client.ts";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Clock,
  Coins,
  Cpu,
  Gauge,
  Layers,
  Zap,
} from "lucide-react";
import { motion } from "framer-motion";
import { PageFrame } from "../components/PageFrame.tsx";
import { LivePulse } from "../components/LivePulse.tsx";
import {
  formatCompactNumber,
  formatCost,
  formatDuration,
} from "../lib/format.ts";

const tooltipStyle = {
  backgroundColor: "rgba(8, 15, 28, 0.96)",
  border: "1px solid rgba(148, 163, 184, 0.14)",
  borderRadius: "18px",
  fontSize: 12,
  boxShadow: "0 20px 60px rgba(0,0,0,0.45)",
  backdropFilter: "blur(12px)",
};

const providerColors: Record<string, string> = {
  openai: "bg-emerald-400",
  anthropic: "bg-amber-300",
  google: "bg-sky-400",
  deepseek: "bg-cyan-400",
  groq: "bg-fuchsia-400",
  xai: "bg-rose-400",
};

export default function Models() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["stats", 168],
    queryFn: () => fetchStats(168),
  });

  const byModel = stats?.byModel ?? [];

  const latencyData = byModel.map((m) => ({
    name: m.model.length > 20 ? `${m.model.slice(0, 18)}...` : m.model,
    p50: m.avgDuration,
  }));

  const tokenData = byModel.map((m) => ({
    name: m.model.length > 20 ? `${m.model.slice(0, 18)}...` : m.model,
    tokens: m.totalTokens,
  }));

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
                {byModel.length}
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
            <div className="overflow-x-auto">
              <table className="w-full border-separate border-spacing-y-2 text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-[0.18em] text-slate-500">
                    <th className="px-4 py-2">Model</th>
                    <th className="px-4 py-2">Provider</th>
                    <th className="px-4 py-2 text-right">Calls</th>
                    <th className="px-4 py-2 text-right">Tokens</th>
                    <th className="px-4 py-2 text-right">Cost</th>
                    <th className="px-4 py-2 text-right">Avg Latency</th>
                    <th className="px-4 py-2 text-right">Cost/Call</th>
                  </tr>
                </thead>
                <tbody>
                  {byModel.map((model, index) => (
                    <motion.tr
                      key={`${model.provider}-${model.model}`}
                      className="rounded-2xl border border-white/6 bg-white/4"
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.03 * index, duration: 0.3 }}
                    >
                      <td className="rounded-l-2xl px-4 py-4">
                        <div className="font-mono text-xs font-semibold text-slate-100">
                          {model.model}
                        </div>
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
                        {formatCompactNumber(model.totalTokens)}
                      </td>
                      <td className="px-4 py-4 text-right font-mono text-xs font-semibold text-white">
                        {formatCost(model.totalCost)}
                      </td>
                      <td className="px-4 py-4 text-right font-mono text-xs text-slate-400">
                        {model.avgDuration ? formatDuration(model.avgDuration) : "-"}
                      </td>
                      <td className="rounded-r-2xl px-4 py-4 text-right font-mono text-xs text-slate-500">
                        {model.spanCount > 0
                          ? formatCost(model.totalCost / model.spanCount)
                          : "-"}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
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
              <ResponsiveContainer
                width="100%"
                height={Math.max(280, latencyData.length * 52)}
              >
                <BarChart data={latencyData} layout="vertical">
                  <CartesianGrid stroke="rgba(148,163,184,0.08)" horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v: number) => formatDuration(v)}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 11, fill: "#cbd5e1" }}
                    axisLine={false}
                    tickLine={false}
                    width={150}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(v: number) => [formatDuration(v), "Avg latency"]}
                  />
                  <Bar dataKey="p50" fill="#38bdf8" radius={[0, 10, 10, 0]} />
                </BarChart>
              </ResponsiveContainer>
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
              <ResponsiveContainer
                width="100%"
                height={Math.max(280, tokenData.length * 52)}
              >
                <BarChart data={tokenData} layout="vertical">
                  <CartesianGrid stroke="rgba(148,163,184,0.08)" horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v: number) => formatCompactNumber(v)}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 11, fill: "#cbd5e1" }}
                    axisLine={false}
                    tickLine={false}
                    width={150}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(v: number) => [v.toLocaleString(), "Tokens"]}
                  />
                  <Bar dataKey="tokens" fill="#34d399" radius={[0, 10, 10, 0]} />
                </BarChart>
              </ResponsiveContainer>
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
