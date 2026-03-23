interface AreaPoint {
  label: string;
  value: number;
}

interface AreaTimelineProps {
  points: AreaPoint[];
  valueFormatter: (value: number) => string;
}

export function AreaTimeline({ points, valueFormatter }: AreaTimelineProps) {
  const width = 720;
  const height = 260;
  const paddingX = 22;
  const paddingTop = 20;
  const paddingBottom = 44;
  const chartHeight = height - paddingTop - paddingBottom;
  const maxValue = Math.max(...points.map((point) => point.value), 1);
  const gridValues = [1, 0.66, 0.33, 0].map((ratio) => maxValue * ratio);

  const coordinates = points.map((point, index) => {
    const x =
      points.length === 1
        ? width / 2
        : paddingX + (index * (width - paddingX * 2)) / (points.length - 1);
    const y =
      paddingTop + chartHeight - (point.value / maxValue) * chartHeight;
    return { ...point, x, y };
  });

  const linePath = coordinates
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");

  const areaPath = coordinates.length
    ? `${linePath} L ${coordinates.at(-1)?.x ?? width - paddingX} ${
        height - paddingBottom
      } L ${coordinates[0]?.x ?? paddingX} ${height - paddingBottom} Z`
    : "";

  const latestValue = points.at(-1)?.value ?? 0;
  const previousValue = points.at(-2)?.value ?? latestValue;
  const delta = latestValue - previousValue;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="surface-muted rounded-2xl p-4">
          <div className="hud-label">Latest</div>
          <div className="mt-2 text-lg font-semibold text-white">
            {valueFormatter(latestValue)}
          </div>
        </div>
        <div className="surface-muted rounded-2xl p-4">
          <div className="hud-label">Peak</div>
          <div className="mt-2 text-lg font-semibold text-white">
            {valueFormatter(maxValue)}
          </div>
        </div>
        <div className="surface-muted rounded-2xl p-4">
          <div className="hud-label">Change</div>
          <div
            className={`mt-2 text-lg font-semibold ${
              delta >= 0 ? "text-emerald-200" : "text-rose-200"
            }`}
          >
            {delta >= 0 ? "+" : "-"}
            {valueFormatter(Math.abs(delta))}
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-[24px] border border-white/8 bg-[linear-gradient(180deg,rgba(6,12,22,0.98),rgba(4,8,17,0.98))] p-4">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-[260px] w-full"
          role="img"
          aria-label="Cost trend over time"
        >
          <defs>
            <linearGradient id="llmtap-area-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="rgba(52,211,153,0.38)" />
              <stop offset="100%" stopColor="rgba(14,165,233,0.02)" />
            </linearGradient>
            <linearGradient id="llmtap-area-line" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%" stopColor="#34d399" />
              <stop offset="100%" stopColor="#38bdf8" />
            </linearGradient>
          </defs>

          {gridValues.map((value, index) => {
            const y = paddingTop + (chartHeight * index) / (gridValues.length - 1);
            return (
              <g key={value}>
                <line
                  x1={paddingX}
                  x2={width - paddingX}
                  y1={y}
                  y2={y}
                  stroke="rgba(148,163,184,0.12)"
                  strokeDasharray="5 8"
                />
                <text
                  x={paddingX}
                  y={Math.max(y - 8, 12)}
                  fill="rgba(148,163,184,0.72)"
                  fontSize="10"
                  fontFamily="var(--font-mono)"
                >
                  {valueFormatter(value)}
                </text>
              </g>
            );
          })}

          {areaPath ? <path d={areaPath} fill="url(#llmtap-area-fill)" /> : null}
          {linePath ? (
            <path
              d={linePath}
              fill="none"
              stroke="url(#llmtap-area-line)"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : null}

          {coordinates.map((point, index) => {
            const isLatest = index === coordinates.length - 1;
            return (
              <g key={`${point.label}-${index}`}>
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={isLatest ? 6 : 4}
                  fill={isLatest ? "#f8fafc" : "#34d399"}
                  stroke={isLatest ? "#34d399" : "rgba(4,8,17,0.95)"}
                  strokeWidth={isLatest ? 3 : 2}
                />
                <text
                  x={point.x}
                  y={height - 12}
                  textAnchor={index === 0 ? "start" : index === coordinates.length - 1 ? "end" : "middle"}
                  fill="rgba(148,163,184,0.68)"
                  fontSize="10"
                  fontFamily="var(--font-mono)"
                >
                  {point.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
