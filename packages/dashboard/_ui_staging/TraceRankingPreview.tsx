"use client";

import RankingBars from "../src/components/charts/RankingBars.tsx";

const SAMPLE_ROWS = [
  {
    label: "gpt-4o-mini",
    provider: "openai",
    totalCost: 1.28,
    totalTokens: 182000,
    avgDuration: 1400,
    spanCount: 84,
  },
  {
    label: "claude-3-5-sonnet",
    provider: "anthropic",
    totalCost: 2.13,
    totalTokens: 154000,
    avgDuration: 1800,
    spanCount: 53,
  },
  {
    label: "gemini-2.0-flash",
    provider: "google",
    totalCost: 0.84,
    totalTokens: 121000,
    avgDuration: 920,
    spanCount: 91,
  },
];

export default function TraceRankingPreview() {
  return (
    <div className="mx-auto max-w-4xl rounded-[28px] border border-white/8 bg-[linear-gradient(180deg,rgba(13,17,31,0.98),rgba(7,10,22,0.98))] p-6">
      <div className="mb-5">
        <div className="hud-label">staging</div>
        <h2 className="mt-2 text-2xl font-semibold text-white">
          Ranking surface preview
        </h2>
      </div>
      <RankingBars rows={SAMPLE_ROWS} />
    </div>
  );
}
