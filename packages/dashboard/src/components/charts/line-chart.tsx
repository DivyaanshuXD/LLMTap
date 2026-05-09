"use client";

import { lazy, Suspense } from "react";

export interface GlowingLineChartProps {
  data: Array<Record<string, string | number>>;
  xDataKey: string;
  primaryDataKey: string;
  secondaryDataKey?: string;
}

const RechartsGlowingLineChart = lazy(() =>
  import("./line-chart-recharts.tsx").then((module) => ({
    default: module.GlowingLineChart,
  }))
);

/** Lazy boundary for the heavier Recharts glow-gradient implementation. */
export function GlowingLineChart(props: GlowingLineChartProps) {
  return (
    <Suspense fallback={<LineChartSkeleton />}>
      <RechartsGlowingLineChart {...props} />
    </Suspense>
  );
}

function LineChartSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="skeleton-panel h-8 w-36 rounded-[var(--radius-pill)]" />
        <div className="flex gap-2">
          <div className="skeleton-panel h-8 w-24 rounded-[var(--radius-pill)]" />
          <div className="skeleton-panel h-8 w-24 rounded-[var(--radius-pill)]" />
        </div>
      </div>
      <div className="skeleton-panel h-[388px] rounded-[var(--radius-panel)]" />
    </div>
  );
}

export default GlowingLineChart;
