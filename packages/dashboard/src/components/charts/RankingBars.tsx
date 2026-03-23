import { TrendingUp } from "lucide-react";
import { useMemo, useState, type SVGProps } from "react";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { Badge } from "../ui/badge.tsx";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "../ui/chart.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select.tsx";
import { formatCompactNumber, formatCost, formatDuration } from "../../lib/format.ts";

interface RankingRow {
  label: string;
  provider: string;
  totalCost: number;
  totalTokens: number;
  avgDuration: number;
  spanCount: number;
}

type ActiveMetric = "all" | "cost" | "latency" | "tokens";

interface RankingBarsProps {
  rows: RankingRow[];
}

const chartConfig = {
  cost: {
    label: "Cost",
    color: "var(--chart-2)",
  },
  latency: {
    label: "Latency",
    color: "var(--chart-3)",
  },
  tokens: {
    label: "Tokens",
    color: "var(--chart-5)",
  },
} satisfies ChartConfig;

export function RankingBars({ rows }: RankingBarsProps) {
  const [activeMetric, setActiveMetric] = useState<ActiveMetric>("all");

  const chartData = useMemo(() => {
    const maxCost = Math.max(...rows.map((row) => row.totalCost), 1);
    const maxLatency = Math.max(...rows.map((row) => row.avgDuration), 1);
    const maxTokens = Math.max(...rows.map((row) => row.totalTokens), 1);

    const normalized = rows.map((row) => ({
      ...row,
      cost: (row.totalCost / maxCost) * 100,
      latency: (row.avgDuration / maxLatency) * 100,
      tokens: (row.totalTokens / maxTokens) * 100,
      displayValue:
        activeMetric === "cost"
          ? formatCost(row.totalCost)
          : activeMetric === "latency"
            ? formatDuration(row.avgDuration)
            : activeMetric === "tokens"
              ? formatCompactNumber(row.totalTokens)
              : formatCost(row.totalCost),
    }));

    const sortValue = (item: (typeof normalized)[number]) => {
      if (activeMetric === "latency") return item.avgDuration;
      if (activeMetric === "tokens") return item.totalTokens;
      return item.totalCost;
    };

    return normalized.sort((a, b) => sortValue(b) - sortValue(a));
  }, [rows, activeMetric]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Badge variant="success" className="border-none bg-emerald-500/10 text-emerald-300">
          <TrendingUp className="h-3.5 w-3.5" />
          Ranking live
        </Badge>
        <Select value={activeMetric} onValueChange={(value: ActiveMetric) => setActiveMetric(value)}>
          <SelectTrigger className="h-7 w-[150px] px-2 text-xs">
            <SelectValue placeholder="Select metric" />
          </SelectTrigger>
          <SelectContent align="end">
            <SelectItem value="all">All Metrics</SelectItem>
            <SelectItem value="cost">Cost Ranking</SelectItem>
            <SelectItem value="latency">Latency Ranking</SelectItem>
            <SelectItem value="tokens">Token Ranking</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <ChartContainer config={chartConfig} className="h-[360px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart accessibilityLayer data={chartData} layout="vertical" margin={{ left: 8, right: 8 }}>
            <XAxis type="number" hide domain={[0, 100]} />
            <YAxis
              dataKey="label"
              type="category"
              width={150}
              tickLine={false}
              axisLine={false}
              tick={{ fill: "#cbd5e1", fontSize: 11 }}
              tickFormatter={(value) => String(value).slice(0, 20)}
            />

            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  formatter={(_, name, item) => {
                    const payload = item.payload as RankingRow;
                    if (name === "cost") return `${formatCost(payload.totalCost)} cost`;
                    if (name === "latency") return `${formatDuration(payload.avgDuration)} latency`;
                    if (name === "tokens") return `${formatCompactNumber(payload.totalTokens)} tokens`;
                    return "";
                  }}
                />
              }
            />

            <Bar
              stackId="ranking"
              barSize={10}
              dataKey="cost"
              fill="var(--color-cost)"
              radius={4}
              shape={<CustomGradientBar activeMetric={activeMetric} />}
              background={{ fill: "rgba(15, 23, 42, 0.65)", radius: 4 }}
            />
            <Bar
              stackId="ranking"
              barSize={10}
              dataKey="latency"
              fill="var(--color-latency)"
              radius={4}
              shape={<CustomGradientBar activeMetric={activeMetric} />}
            />
            <Bar
              stackId="ranking"
              barSize={10}
              dataKey="tokens"
              fill="var(--color-tokens)"
              radius={4}
              shape={<CustomGradientBar activeMetric={activeMetric} />}
            />
          </BarChart>
        </ResponsiveContainer>
      </ChartContainer>

      <div className="grid gap-2">
        {chartData.slice(0, 3).map((row, index) => (
          <div
            key={`${row.label}-${row.provider}`}
            className="flex items-center justify-between rounded-xl border border-white/8 bg-white/4 px-3 py-2"
          >
            <div className="min-w-0">
              <div className="truncate text-sm font-medium text-white">#{index + 1} {row.label}</div>
              <div className="text-xs text-slate-500">
                {row.provider} · {row.spanCount} calls
              </div>
            </div>
            <div className="text-xs font-mono text-slate-300">{row.displayValue}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

const CustomGradientBar = (
  props: SVGProps<SVGRectElement> & {
    dataKey?: string;
    activeMetric?: ActiveMetric;
  }
) => {
  const { fill, x, y, width, height, dataKey, activeMetric, radius } = props;
  const isActive = activeMetric === "all" ? true : activeMetric === dataKey;

  return (
    <>
      <rect
        x={x}
        y={y}
        rx={Number(radius) || 4}
        width={width}
        height={height}
        stroke="none"
        fill={fill}
        opacity={isActive ? 0.95 : 0.12}
        filter={isActive && activeMetric !== "all" ? `url(#glow-ranking-${dataKey})` : undefined}
      />
      <defs>
        <filter id={`glow-ranking-${dataKey}`} x="-200%" y="-200%" width="600%" height="600%">
          <feGaussianBlur stdDeviation="9" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>
    </>
  );
};
