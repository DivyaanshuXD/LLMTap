import { cn } from "@/lib/utils.ts";

export interface LiveFeedIndicatorProps {
  status: "connected" | "reconnecting" | "disconnected";
  label?: string;
  className?: string;
}

/** Compact live-stream status pill for collector connectivity. */
export function LiveFeedIndicator({
  status,
  label = "Live feed connected",
  className,
}: LiveFeedIndicatorProps) {
  const meta =
    status === "connected"
      ? {
          text: "var(--color-accent)",
          dot: "var(--color-accent)",
          animation: "breathe 2.8s var(--ease-out) infinite",
          resolvedLabel: label,
        }
      : status === "reconnecting"
        ? {
            text: "var(--color-warning)",
            dot: "var(--color-warning)",
            animation: "breathe 1.2s var(--ease-out) infinite",
            resolvedLabel: "Reconnecting...",
          }
        : {
            text: "var(--color-error)",
            dot: "var(--color-error)",
            animation: "none",
            resolvedLabel: "Disconnected",
          };

  return (
    <span
      className={cn(
        "badge items-center gap-2 rounded-[var(--radius-pill)] px-3 py-1.5 transition-[color,border-color,background-color] duration-[var(--duration-base)] ease-[var(--ease-out)]",
        className
      )}
      style={{
        color: meta.text,
        borderColor:
          status === "connected"
            ? "var(--border-default)"
            : status === "reconnecting"
              ? "rgba(var(--ch-warning), 0.18)"
              : "rgba(var(--ch-error), 0.18)",
        background:
          status === "connected"
            ? "var(--color-accent-dim)"
            : status === "reconnecting"
              ? "rgba(var(--ch-warning), 0.08)"
              : "rgba(var(--ch-error), 0.08)",
      }}
    >
      <span
        aria-hidden="true"
        className="inline-block h-[6px] w-[6px] rounded-full"
        style={{
          background: meta.dot,
          animation: meta.animation,
          boxShadow:
            status === "connected"
              ? "var(--glow-dot)"
              : status === "reconnecting"
                ? "0 0 6px rgba(var(--ch-warning), 0.6), 0 0 14px rgba(var(--ch-warning), 0.22)"
                : "0 0 6px rgba(var(--ch-error), 0.4)",
        }}
      />
      <span>{meta.resolvedLabel}</span>
    </span>
  );
}
