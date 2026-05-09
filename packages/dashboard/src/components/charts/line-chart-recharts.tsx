"use client";

import { TrendingDown, TrendingUp } from "lucide-react";
import { useId, useMemo } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipProps,
} from "recharts";
import { Badge } from "@/components/ui/badge.tsx";

export interface GlowingLineChartProps {
  data: Array<Record<string, string | number>>;
  xDataKey: string;
  primaryDataKey: string;
  secondaryDataKey?: string;
}

function formatAxisLabel(value: string | number) {
  if (typeof value === "number") {
    return new Date(value).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const maybeDate = Number(value);
  if (!Number.isNaN(maybeDate) && String(value).length >= 10) {
    return new Date(maybeDate).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return String(value).slice(0, 12);
}

function getNumericValue(value: string | number | undefined) {
  if (typeof value === "number") return value;
  if (!value) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatMetric(value: number) {
  return value.toLocaleString(undefined, {
    maximumFractionDigits: value < 1 ? 4 : 2,
  });
}

function GlowTooltip({
  active,
  label,
  payload,
}: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;

  const primary = payload[0];

  return (
    <div className="rounded-[var(--radius-panel)] border border-[var(--border-default)] bg-[rgba(var(--rgb-panel),0.96)] px-3 py-2 shadow-[var(--shadow-card)] backdrop-blur-xl">
      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-tertiary)]">
        {formatAxisLabel(label as string | number)}
      </div>
      <div className="mt-1 font-mono text-sm text-[var(--color-text-primary)]">
        {formatMetric(Number(primary.value ?? 0))}
      </div>
    </div>
  );
}

/** Recharts glow-gradient line chart tuned for LLMTap economic telemetry. */
export function GlowingLineChart({
  data,
  xDataKey,
  primaryDataKey,
}: GlowingLineChartProps) {
  const chartId = useId().replace(/:/g, "");

  const chartRows = useMemo(
    () =>
      data.map((item) => ({
        ...item,
        __label: formatAxisLabel(item[xDataKey] as string | number),
        __value: getNumericValue(item[primaryDataKey] as string | number | undefined),
      })),
    [data, primaryDataKey, xDataKey]
  );

  const renderRows = useMemo(() => {
    if (chartRows.length !== 1) return chartRows;

    const only = chartRows[0];
    const rawX = (only as Record<string, string | number>)[xDataKey];
    const timestamp =
      typeof rawX === "number"
        ? rawX
        : Number.isFinite(Number(rawX))
          ? Number(rawX)
          : Date.now();

    return [
      {
        ...only,
        [xDataKey]: timestamp - 5 * 60 * 1000,
        __label: formatAxisLabel(timestamp - 5 * 60 * 1000),
        __value: 0,
      },
      only,
    ];
  }, [chartRows, xDataKey]);

  const stats = useMemo(() => {
    const values = chartRows.map((item) => item.__value);
    const latest = values.at(-1) ?? 0;
    const previous = values.at(-2) ?? latest;
    const change = latest - previous;

    return {
      change,
      latest,
      max: Math.max(...values, 0),
      samples: values.length,
      trendDown: change < 0,
    };
  }, [chartRows]);

  const yDomain = useMemo<[number, (dataMax: number) => number]>(
    () => [
      0,
      (dataMax: number) => {
        if (!Number.isFinite(dataMax) || dataMax <= 0) return 1;
        const padding = dataMax < 0.01 ? 0.0001 : dataMax * 0.08;
        return dataMax + padding;
      },
    ],
    []
  );

  const gradientId = `rainbow-line-${chartId}`;
  const glowId = `rainbow-line-glow-${chartId}`;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Badge
          variant="info"
          className="border-[var(--border-default)] bg-[rgba(var(--rgb-accent),0.1)] text-[var(--color-accent-max)]"
        >
          {stats.trendDown ? (
            <TrendingDown className="h-3.5 w-3.5" />
          ) : (
            <TrendingUp className="h-3.5 w-3.5" />
          )}
          <span>{stats.trendDown ? "cooling" : "live gradient"}</span>
        </Badge>

        <div className="flex flex-wrap items-center gap-2">
          <div className="rounded-full border border-[var(--border-dim)] bg-[rgba(var(--rgb-surface),0.72)] px-3 py-1.5 font-mono text-xs text-[var(--color-text-secondary)]">
            {stats.samples.toLocaleString()} samples
          </div>
          <div className="rounded-full border border-[var(--border-default)] bg-[rgba(var(--rgb-accent),0.08)] px-3 py-1.5 font-mono text-xs text-[var(--color-text-primary)]">
            peak {formatMetric(stats.max)}
          </div>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-[var(--radius-panel)] border border-[var(--border-dim)] bg-[linear-gradient(180deg,rgba(var(--rgb-surface),0.78),rgba(var(--rgb-ink),0.96))] p-3">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-[radial-gradient(circle_at_top,rgba(var(--rgb-violet),0.16),transparent_62%)]" />
        <div className="h-[320px] w-full">
          <ResponsiveContainer height="100%" width="100%">
            <LineChart
              accessibilityLayer
              data={renderRows}
              margin={{
                bottom: 12,
                left: 8,
                right: 12,
                top: 16,
              }}
            >
              <CartesianGrid
                stroke="rgba(var(--rgb-text-primary),0.12)"
                strokeDasharray="4 8"
                vertical={false}
              />
              <XAxis
                axisLine={false}
                dataKey="__label"
                interval="preserveStartEnd"
                minTickGap={22}
                tick={{
                  fill: "var(--color-text-tertiary)",
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                }}
                tickLine={false}
                tickMargin={10}
              />
              <YAxis hide domain={yDomain} />
              <Tooltip
                content={<GlowTooltip />}
                cursor={{
                  stroke: "rgba(var(--rgb-accent),0.28)",
                  strokeDasharray: "4 6",
                }}
              />
              <defs>
                <linearGradient id={gradientId} x1="0" x2="1" y1="0" y2="0">
                  <stop offset="0%" stopColor="var(--color-accent-3)" stopOpacity={0.85} />
                  <stop offset="18%" stopColor="var(--color-accent-2)" stopOpacity={0.88} />
                  <stop offset="38%" stopColor="var(--color-accent-max)" stopOpacity={0.95} />
                  <stop offset="62%" stopColor="var(--color-violet)" stopOpacity={0.86} />
                  <stop offset="82%" stopColor="var(--color-violet-max)" stopOpacity={0.8} />
                  <stop offset="100%" stopColor="var(--color-warning)" stopOpacity={0.74} />
                </linearGradient>
                <filter
                  id={glowId}
                  height="160%"
                  width="160%"
                  x="-30%"
                  y="-30%"
                >
                  <feGaussianBlur stdDeviation="6" result="blur" />
                  <feColorMatrix
                    in="blur"
                    result="glow"
                    type="matrix"
                    values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.72 0"
                  />
                  <feMerge>
                    <feMergeNode in="glow" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              <Line
                dataKey="__value"
                dot={
                  chartRows.length <= 2
                    ? {
                        fill: "var(--color-accent-max)",
                        r: 4,
                        stroke: "var(--color-bg-base)",
                        strokeWidth: 2,
                      }
                    : false
                }
                filter={`url(#${glowId})`}
                isAnimationActive
                stroke={`url(#${gradientId})`}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={3}
                type="monotone"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <MetricPill label="Peak" value={formatMetric(stats.max)} />
          <MetricPill label="Samples" value={stats.samples.toLocaleString()} />
          <MetricPill label="Current" value={formatMetric(stats.latest)} />
        </div>
      </div>
    </div>
  );
}

function MetricPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--radius-panel)] border border-[var(--border-dim)] bg-[rgba(var(--rgb-surface),0.72)] px-4 py-3">
      <div className="hud-label">{label}</div>
      <div className="mt-2 font-mono text-sm text-[var(--color-text-primary)]">{value}</div>
    </div>
  );
}

export default GlowingLineChart;
