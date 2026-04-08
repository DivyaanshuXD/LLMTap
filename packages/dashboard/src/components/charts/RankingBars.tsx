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
      "bg-[linear-gradient(90deg,rgba(var(--ch-accent-2), 0.95),rgba(var(--ch-accent), 0.92))]",
    value: (row: RankingRow) => row.totalCost,
    formatter: (value: number) => formatCost(value),
  },
  latency: {
    label: "Latency ranking",
    barClassName:
      "bg-[linear-gradient(90deg,rgba(var(--ch-text-primary), 0.9),rgba(var(--ch-accent), 0.78))]",
    value: (row: RankingRow) => row.avgDuration,
    formatter: (value: number) => formatDuration(value),
  },
  tokens: {
    label: "Token ranking",
    barClassName:
      "bg-[linear-gradient(90deg,rgba(var(--ch-accent), 0.96),rgba(var(--ch-accent-2), 0.86))]",
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
          className="border-[var(--color-accent)]/18 bg-[var(--color-accent)]/12 text-[var(--color-accent)]"
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
            className="rounded-[22px] border border-[var(--border-dim)] bg-[linear-gradient(180deg,rgba(var(--ch-bg-panel),0.78),rgba(var(--ch-bg-base),0.94))] p-4"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="rounded-full border border-[var(--border-dim)] bg-[rgba(var(--ch-text-primary),0.04)] px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-tertiary)]">
                    #{row.rank}
                  </span>
                  <div className="truncate text-sm font-semibold text-[var(--color-text-primary)]">
                    {row.label}
                  </div>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[var(--color-text-secondary)]">
                  <span className="rounded-full border border-[var(--border-dim)] bg-[rgba(var(--ch-text-primary),0.04)] px-2 py-0.5 uppercase tracking-[0.16em] text-[10px] text-[var(--color-text-secondary)]">
                    {row.provider}
                  </span>
                  <span>{row.spanCount} calls</span>
                  <span>{formatCompactNumber(row.totalTokens)} tokens</span>
                </div>
              </div>

              <div className="text-right">
                <div className="font-mono text-sm text-[var(--color-text-primary)]">
                  {METRIC_META[activeMetric].formatter(row.metricValue)}
                </div>
                <div className="mt-1 text-[11px] text-[var(--color-text-tertiary)]">
                  {activeMetric === "cost"
                    ? formatDuration(row.avgDuration)
                    : formatCost(row.totalCost)}
                </div>
              </div>
            </div>

            <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-[rgba(var(--ch-bg-base),0.82)]">
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
