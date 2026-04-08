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
            stroke="rgba(var(--ch-text-primary),0.12)"
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
          <div className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[var(--color-text-primary)]">
            {totalValue}
          </div>
          <div className="mt-1 text-xs text-[var(--color-text-tertiary)]">
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
              className="rounded-[var(--radius-panel)] border border-[var(--border-dim)] bg-[linear-gradient(180deg,rgba(var(--ch-bg-panel),0.72),rgba(var(--ch-bg-base),0.9))] p-4"
            >
              <div className="flex items-center gap-3">
                <span
                  className="h-3 w-3 rounded-full"
                  style={{
                    backgroundColor: segment.color,
                    boxShadow: `0 0 12px ${segment.color}50`,
                  }}
                />
                <span className="flex-1 text-sm font-medium capitalize text-[var(--color-text-primary)]">
                  {segment.label}
                </span>
                <span className="font-mono text-xs text-[var(--color-text-tertiary)]">
                  {share.toFixed(0)}%
                </span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-[rgba(var(--ch-bg-base),0.84)]">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.max(share, 6)}%`,
                    background: `linear-gradient(90deg, ${segment.color}, rgba(var(--ch-text-primary),0.72))`,
                  }}
                />
              </div>
              {segment.detail ? (
                <div className="mt-2 text-xs text-[var(--color-text-tertiary)]">{segment.detail}</div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
