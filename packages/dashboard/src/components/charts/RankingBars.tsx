import { TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "../ui/badge.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select.tsx";
import {
  formatCompactNumber,
  formatCost,
  formatDuration,
} from "../../lib/format.ts";

interface RankingRow {
  label: string;
  provider: string;
  totalCost: number;
  totalTokens: number;
  avgDuration: number;
  spanCount: number;
}

type ActiveMetric = "cost" | "latency" | "tokens";

interface RankingBarsProps {
  rows: RankingRow[];
}

const METRIC_META = {
  cost: {
    label: "Cost ranking",
    barClassName:
      "bg-[linear-gradient(90deg,rgba(69,162,158,0.95),rgba(102,252,241,0.92))]",
    value: (row: RankingRow) => row.totalCost,
    formatter: (value: number) => formatCost(value),
  },
  latency: {
    label: "Latency ranking",
    barClassName:
      "bg-[linear-gradient(90deg,rgba(197,198,199,0.9),rgba(102,252,241,0.78))]",
    value: (row: RankingRow) => row.avgDuration,
    formatter: (value: number) => formatDuration(value),
  },
  tokens: {
    label: "Token ranking",
    barClassName:
      "bg-[linear-gradient(90deg,rgba(102,252,241,0.96),rgba(69,162,158,0.86))]",
    value: (row: RankingRow) => row.totalTokens,
    formatter: (value: number) => formatCompactNumber(value),
  },
} as const;

export function RankingBars({ rows }: RankingBarsProps) {
  const [activeMetric, setActiveMetric] = useState<ActiveMetric>("cost");

  const rankedRows = useMemo(() => {
    const getMetricValue = METRIC_META[activeMetric].value;
    return [...rows]
      .sort((a, b) => getMetricValue(b) - getMetricValue(a))
      .map((row, index, list) => {
        const maxValue = Math.max(getMetricValue(list[0] ?? row), 1);
        const metricValue = getMetricValue(row);
        return {
          ...row,
          rank: index + 1,
          metricValue,
          progress: Math.max((metricValue / maxValue) * 100, 6),
        };
      });
  }, [activeMetric, rows]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Badge
          variant="info"
          className="border-[#66FCF1]/18 bg-[#66FCF1]/12 text-[#66FCF1]"
        >
          <TrendingUp className="h-3.5 w-3.5" />
          <span>ranking live</span>
        </Badge>

        <Select
          value={activeMetric}
          onValueChange={(value: ActiveMetric) => setActiveMetric(value)}
        >
          <SelectTrigger className="h-8 w-[170px] text-xs">
            <SelectValue placeholder="Select metric" />
          </SelectTrigger>
          <SelectContent align="end">
            <SelectItem value="cost">Cost ranking</SelectItem>
            <SelectItem value="latency">Latency ranking</SelectItem>
            <SelectItem value="tokens">Token ranking</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        {rankedRows.map((row) => (
          <div
            key={`${row.provider}-${row.label}`}
            className="rounded-[22px] border border-white/8 bg-[linear-gradient(180deg,rgba(14,19,34,0.9),rgba(7,11,24,0.96))] p-4"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="rounded-full border border-white/10 bg-white/6 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-400">
                    #{row.rank}
                  </span>
                  <div className="truncate text-sm font-semibold text-slate-100">
                    {row.label}
                  </div>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                  <span className="rounded-full border border-white/8 bg-white/5 px-2 py-0.5 uppercase tracking-[0.16em] text-[10px] text-slate-300">
                    {row.provider}
                  </span>
                  <span>{row.spanCount} calls</span>
                  <span>{formatCompactNumber(row.totalTokens)} tokens</span>
                </div>
              </div>

              <div className="text-right">
                <div className="font-mono text-sm text-white">
                  {METRIC_META[activeMetric].formatter(row.metricValue)}
                </div>
                <div className="mt-1 text-[11px] text-slate-500">
                  {activeMetric === "cost"
                    ? formatDuration(row.avgDuration)
                    : formatCost(row.totalCost)}
                </div>
              </div>
            </div>

            <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-950/80">
              <div
                className={`h-full rounded-full ${METRIC_META[activeMetric].barClassName}`}
                style={{ width: `${row.progress}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default RankingBars;
