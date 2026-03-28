"use client";

import { TrendingUp } from "lucide-react";
import { useId, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge.tsx";

export interface GlowingLineChartProps {
  data: Array<Record<string, string | number>>;
  xDataKey: string;
  primaryDataKey: string;
  secondaryDataKey?: string;
}

const CHART_WIDTH = 720;
const CHART_HEIGHT = 320;
const CHART_PADDING = { top: 24, right: 16, bottom: 42, left: 16 };

interface LinePoint {
  index: number;
  x: number;
  yPrimary: number;
  ySecondary?: number;
  label: string;
  primaryValue: number;
  secondaryValue?: number;
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

  return String(value);
}

function getNumericValue(value: string | number | undefined) {
  if (typeof value === "number") return value;
  if (!value) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function buildSmoothPath(points: Array<{ x: number; y: number }>) {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  let path = `M ${points[0].x} ${points[0].y}`;

  for (let index = 0; index < points.length - 1; index += 1) {
    const current = points[index];
    const next = points[index + 1];

    if (!(current && next)) continue;

    const controlX = (current.x + next.x) / 2;
    path += ` C ${controlX} ${current.y}, ${controlX} ${next.y}, ${next.x} ${next.y}`;
  }

  return path;
}

function buildAreaPath(
  points: Array<{ x: number; y: number }>,
  baselineY: number
) {
  if (points.length === 0) return "";
  const linePath = buildSmoothPath(points);
  const last = points[points.length - 1];
  const first = points[0];

  if (!(last && first)) return "";

  return `${linePath} L ${last.x} ${baselineY} L ${first.x} ${baselineY} Z`;
}

export function GlowingLineChart({
  data,
  xDataKey,
  primaryDataKey,
  secondaryDataKey,
}: GlowingLineChartProps) {
  const chartId = useId().replace(/:/g, "");
  const [activeIndex, setActiveIndex] = useState(
    Math.max(0, data.length - 1)
  );

  const geometry = useMemo(() => {
    const chartInnerWidth =
      CHART_WIDTH - CHART_PADDING.left - CHART_PADDING.right;
    const chartInnerHeight =
      CHART_HEIGHT - CHART_PADDING.top - CHART_PADDING.bottom;
    const baselineY = CHART_PADDING.top + chartInnerHeight;
    const count = Math.max(data.length - 1, 1);

    const primaryValues = data.map((item) =>
      getNumericValue(item[primaryDataKey] as string | number | undefined)
    );
    const secondaryValues = secondaryDataKey
      ? data.map((item) =>
          getNumericValue(item[secondaryDataKey] as string | number | undefined)
        )
      : [];

    const maxValue = Math.max(
      ...primaryValues,
      ...(secondaryValues.length > 0 ? secondaryValues : [0]),
      1
    );

    const points: LinePoint[] = data.map((item, index) => {
      const x = CHART_PADDING.left + (chartInnerWidth * index) / count;
      const primaryValue = primaryValues[index] ?? 0;
      const secondaryValue =
        secondaryValues.length > 0 ? secondaryValues[index] ?? 0 : undefined;
      const scaleValue = (value: number) =>
        baselineY - (value / maxValue) * chartInnerHeight;

      return {
        index,
        x,
        yPrimary: scaleValue(primaryValue),
        ySecondary:
          secondaryValue === undefined ? undefined : scaleValue(secondaryValue),
        label: formatAxisLabel(item[xDataKey] as string | number),
        primaryValue,
        secondaryValue,
      };
    });

    const primaryPath = buildSmoothPath(
      points.map((point) => ({ x: point.x, y: point.yPrimary }))
    );
    const primaryArea = buildAreaPath(
      points.map((point) => ({ x: point.x, y: point.yPrimary })),
      baselineY
    );
    const secondaryPath =
      secondaryDataKey && points.some((point) => point.ySecondary !== undefined)
        ? buildSmoothPath(
            points.map((point) => ({
              x: point.x,
              y: point.ySecondary ?? baselineY,
            }))
          )
        : "";

    const tickStep = Math.max(1, Math.floor(points.length / 5));
    const ticks = points.filter(
      (point, index) =>
        index === 0 ||
        index === points.length - 1 ||
        index % tickStep === 0
    );

    return {
      chartInnerWidth,
      chartInnerHeight,
      baselineY,
      maxValue,
      points,
      primaryPath,
      primaryArea,
      secondaryPath,
      ticks,
      gridLines: [0.25, 0.5, 0.75].map(
        (ratio) => CHART_PADDING.top + chartInnerHeight * ratio
      ),
    };
  }, [data, primaryDataKey, secondaryDataKey, xDataKey]);

  const activePoint =
    geometry.points[Math.min(activeIndex, geometry.points.length - 1)];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Badge
          variant="info"
          className="border-[#66FCF1]/18 bg-[#66FCF1]/12 text-[#66FCF1]"
        >
          <TrendingUp className="h-3.5 w-3.5" />
          <span>live trend</span>
        </Badge>

        {activePoint ? (
          <div className="flex flex-wrap items-center gap-2">
            <div className="rounded-full border border-white/8 bg-white/6 px-3 py-1.5 text-xs font-medium text-slate-300">
              {activePoint.label}
            </div>
            <div className="rounded-full border border-[#45A29E]/20 bg-[#45A29E]/12 px-3 py-1.5 font-mono text-xs text-[#C5C6C7]">
              {activePoint.primaryValue.toLocaleString(undefined, {
                maximumFractionDigits: 4,
              })}
            </div>
            {secondaryDataKey && activePoint.secondaryValue !== undefined && (
              <div className="rounded-full border border-[#66FCF1]/18 bg-[#66FCF1]/10 px-3 py-1.5 font-mono text-xs text-[#C5C6C7]">
                {activePoint.secondaryValue.toLocaleString(undefined, {
                  maximumFractionDigits: 4,
                })}
              </div>
            )}
          </div>
        ) : null}
      </div>

      <div className="relative overflow-hidden rounded-[24px] border border-white/7 bg-[linear-gradient(180deg,rgba(15,23,42,0.62),rgba(9,13,28,0.92))] p-3">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle_at_top,rgba(102,252,241,0.16),transparent_60%)]" />
        <svg
          aria-hidden="true"
          className="h-[320px] w-full"
          viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        >
          <defs>
            <linearGradient
              id={`line-fill-${chartId}`}
              x1="0"
              x2="0"
              y1="0"
              y2="1"
            >
              <stop offset="0%" stopColor="#45A29E" stopOpacity="0.38" />
              <stop offset="100%" stopColor="#45A29E" stopOpacity="0" />
            </linearGradient>
            <linearGradient
              id={`line-stroke-${chartId}`}
              x1="0"
              x2="1"
              y1="0"
              y2="0"
            >
              <stop offset="0%" stopColor="#45A29E" />
              <stop offset="100%" stopColor="#66FCF1" />
            </linearGradient>
            <filter
              id={`line-glow-${chartId}`}
              x="-30%"
              y="-30%"
              width="160%"
              height="160%"
            >
              <feGaussianBlur stdDeviation="9" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {geometry.gridLines.map((lineY) => (
            <line
              key={lineY}
              x1={CHART_PADDING.left}
              x2={CHART_WIDTH - CHART_PADDING.right}
              y1={lineY}
              y2={lineY}
              stroke="rgba(148,163,184,0.16)"
              strokeDasharray="4 8"
            />
          ))}

          <line
            x1={CHART_PADDING.left}
            x2={CHART_WIDTH - CHART_PADDING.right}
            y1={geometry.baselineY}
            y2={geometry.baselineY}
            stroke="rgba(148,163,184,0.2)"
          />

          {geometry.primaryArea ? (
            <path
              d={geometry.primaryArea}
              fill={`url(#line-fill-${chartId})`}
              opacity="0.95"
            />
          ) : null}

          {geometry.secondaryPath ? (
            <path
              d={geometry.secondaryPath}
              fill="none"
              stroke="#C5C6C7"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeOpacity="0.55"
              strokeWidth="2"
            />
          ) : null}

          {geometry.primaryPath ? (
            <>
              <path
                d={geometry.primaryPath}
                fill="none"
                filter={`url(#line-glow-${chartId})`}
                stroke="url(#line-stroke-${chartId})"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.75"
              />
              <path
                d={geometry.primaryPath}
                fill="none"
                stroke="rgba(255,255,255,0.16)"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1"
              />
            </>
          ) : null}

          {activePoint ? (
            <>
              <line
                x1={activePoint.x}
                x2={activePoint.x}
                y1={CHART_PADDING.top}
                y2={geometry.baselineY}
                stroke="rgba(102,252,241,0.24)"
                strokeDasharray="4 6"
              />
              <circle
                cx={activePoint.x}
                cy={activePoint.yPrimary}
                fill="#C5C6C7"
                r="5"
                stroke="#66FCF1"
                strokeWidth="3"
              />
            </>
          ) : null}

          {geometry.ticks.map((tick) => (
            <text
              key={`${tick.index}-${tick.label}`}
              x={tick.x}
              y={CHART_HEIGHT - 12}
              fill="rgba(148,163,184,0.74)"
              fontSize="11"
              textAnchor="middle"
            >
              {tick.label}
            </text>
          ))}

          {geometry.points.map((point, index) => {
            const previous = geometry.points[index - 1];
            const next = geometry.points[index + 1];
            const startX = previous ? (previous.x + point.x) / 2 : CHART_PADDING.left;
            const endX = next
              ? (next.x + point.x) / 2
              : CHART_WIDTH - CHART_PADDING.right;

            return (
              <rect
                key={point.index}
                x={startX}
                y={CHART_PADDING.top}
                width={Math.max(endX - startX, 8)}
                height={geometry.chartInnerHeight}
                fill="transparent"
                onFocus={() => setActiveIndex(point.index)}
                onMouseEnter={() => setActiveIndex(point.index)}
              />
            );
          })}
        </svg>

        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <MetricPill
            label="Peak"
            value={geometry.maxValue.toLocaleString(undefined, {
              maximumFractionDigits: 4,
            })}
          />
          <MetricPill
            label="Samples"
            value={geometry.points.length.toLocaleString()}
          />
          <MetricPill
            label="Current"
            value={(activePoint?.primaryValue ?? 0).toLocaleString(undefined, {
              maximumFractionDigits: 4,
            })}
          />
        </div>
      </div>
    </div>
  );
}

function MetricPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/7 bg-white/5 px-4 py-3">
      <div className="hud-label">{label}</div>
      <div className="mt-2 font-mono text-sm text-slate-200">{value}</div>
    </div>
  );
}

export default GlowingLineChart;
