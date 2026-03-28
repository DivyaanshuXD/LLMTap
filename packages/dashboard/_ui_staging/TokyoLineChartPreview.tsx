"use client";

import { GlowingLineChart } from "../src/components/charts/line-chart.tsx";

const SAMPLE_DATA = [
  { timestamp: Date.now() - 300000, cost: 0.0012 },
  { timestamp: Date.now() - 240000, cost: 0.0018 },
  { timestamp: Date.now() - 180000, cost: 0.0027 },
  { timestamp: Date.now() - 120000, cost: 0.0021 },
  { timestamp: Date.now() - 60000, cost: 0.0034 },
  { timestamp: Date.now(), cost: 0.0029 },
];

export default function TokyoLineChartPreview() {
  return (
    <div className="mx-auto max-w-5xl rounded-[28px] border border-white/8 bg-[linear-gradient(180deg,rgba(13,17,31,0.98),rgba(7,10,22,0.98))] p-6">
      <div className="mb-5">
        <div className="hud-label">staging</div>
        <h2 className="mt-2 text-2xl font-semibold text-white">
          Tokyo line chart preview
        </h2>
      </div>
      <GlowingLineChart
        data={SAMPLE_DATA}
        xDataKey="timestamp"
        primaryDataKey="cost"
      />
    </div>
  );
}

