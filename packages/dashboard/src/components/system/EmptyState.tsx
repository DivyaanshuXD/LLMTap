import { Button } from "@/components/ui/button.tsx";
import { cn } from "@/lib/utils.ts";

export interface EmptyStateProps {
  label?: string;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
  className?: string;
}

/** Ambient empty-state shell for any dashboard surface without data yet. */
export function EmptyState({
  label = "AWAITING DATA",
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex min-h-[220px] flex-col items-center justify-center rounded-[var(--radius-panel)] border border-dashed px-6 py-10 text-center",
        className
      )}
      style={{
        borderColor: "var(--border-dim)",
        animation: "empty-state-border 3s var(--ease-out) infinite alternate",
        background:
          "linear-gradient(180deg, rgba(var(--ch-text-primary), 0.015), rgba(var(--ch-accent), 0.02))",
      }}
    >
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full border border-[var(--border-default)] bg-[var(--color-accent-dim)]">
        <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
          <circle
            cx="11"
            cy="11"
            r="8"
            fill="none"
            stroke="var(--color-accent)"
            strokeOpacity="0.45"
            strokeWidth="1.5"
            style={{ animation: "breathe 2.8s var(--ease-out) infinite" }}
          />
          <circle
            cx="11"
            cy="11"
            r="2.5"
            fill="var(--color-accent)"
            style={{ filter: "drop-shadow(var(--glow-dot))" }}
          />
        </svg>
      </div>
      {label ? <div className="mono-label">{label}</div> : null}
      <div className="mt-2 text-[16px] font-medium text-[var(--color-text-primary)]">{title}</div>
      {description ? (
        <div className="mt-2 max-w-[34rem] text-[13px] leading-6 text-[var(--color-text-secondary)]">
          {description}
        </div>
      ) : null}
      {action ? (
        <Button
          type="button"
          variant="outline"
          onClick={action.onClick}
          className="mt-5 rounded-[var(--radius-panel)] border-[var(--border-default)] bg-transparent text-[var(--color-text-primary)] transition-colors duration-[var(--duration-base)] ease-[var(--ease-out)] hover:border-[var(--border-bright)] hover:bg-[var(--color-accent-dim)]"
        >
          {action.label}
        </Button>
      ) : null}
    </div>
  );
}
