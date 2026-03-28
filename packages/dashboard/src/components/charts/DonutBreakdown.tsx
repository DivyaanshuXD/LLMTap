interface DonutSegment {
  label: string;
  value: number;
  color: string;
  detail?: string;
}

interface DonutBreakdownProps {
  segments: DonutSegment[];
  totalLabel: string;
  totalValue: string;
}

export function DonutBreakdown({
  segments,
  totalLabel,
  totalValue,
}: DonutBreakdownProps) {
  const radius = 66;
  const circumference = 2 * Math.PI * radius;
  const total = Math.max(
    segments.reduce((sum, segment) => sum + segment.value, 0),
    1
  );

  let offset = 0;

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)] lg:items-center">
      <div className="relative mx-auto h-[220px] w-[220px]">
        <svg
          viewBox="0 0 180 180"
          className="h-full w-full -rotate-90"
          role="img"
          aria-label="Provider budget distribution"
        >
          <circle
            cx="90"
            cy="90"
            r={radius}
            fill="none"
            stroke="rgba(148,163,184,0.12)"
            strokeWidth="18"
          />
          {segments.map((segment) => {
            const slice = (segment.value / total) * circumference;
            const dashOffset = -offset;
            offset += slice;
            return (
              <circle
                key={segment.label}
                cx="90"
                cy="90"
                r={radius}
                fill="none"
                stroke={segment.color}
                strokeWidth="18"
                strokeLinecap="round"
                strokeDasharray={`${slice} ${circumference - slice}`}
                strokeDashoffset={dashOffset}
                style={{ filter: `drop-shadow(0 0 10px ${segment.color}40)` }}
              />
            );
          })}
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center rounded-full">
          <div className="hud-label">{totalLabel}</div>
          <div className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-white">
            {totalValue}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            {segments.length} providers active
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {segments.map((segment) => {
          const share = (segment.value / total) * 100;
          return (
            <div
              key={segment.label}
              className="rounded-[var(--radius-panel)] border border-white/6 bg-white/4 p-4"
            >
              <div className="flex items-center gap-3">
                <span
                  className="h-3 w-3 rounded-full"
                  style={{
                    backgroundColor: segment.color,
                    boxShadow: `0 0 12px ${segment.color}50`,
                  }}
                />
                <span className="flex-1 text-sm font-medium capitalize text-white">
                  {segment.label}
                </span>
                <span className="font-mono text-xs text-slate-400">
                  {share.toFixed(0)}%
                </span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-950/85">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.max(share, 6)}%`,
                    background: `linear-gradient(90deg, ${segment.color}, rgba(248,250,252,0.72))`,
                  }}
                />
              </div>
              {segment.detail ? (
                <div className="mt-2 text-xs text-slate-500">{segment.detail}</div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
