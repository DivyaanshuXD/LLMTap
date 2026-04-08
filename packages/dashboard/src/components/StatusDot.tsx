import { cn } from "@/lib/utils.ts";

export function StatusDot({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const tone =
    status === "error"
      ? {
          halo: "rgba(var(--ch-error), 0.16)",
          fill: "var(--color-error)",
          shadow: "0 0 8px rgba(var(--ch-error), 0.38)",
        }
      : status === "warning"
        ? {
            halo: "rgba(var(--ch-warning), 0.16)",
            fill: "var(--color-warning)",
            shadow: "0 0 8px rgba(var(--ch-warning), 0.34)",
          }
        : status === "active"
          ? {
              halo: "rgba(var(--ch-accent), 0.18)",
              fill: "var(--color-accent)",
              shadow: "var(--glow-dot)",
            }
          : {
              halo: "rgba(var(--ch-accent-2), 0.16)",
              fill: "var(--color-accent-2)",
              shadow: "0 0 8px rgba(var(--ch-accent-2), 0.28)",
            };
  return (
    <span
      className={cn(
        "relative flex h-3.5 w-3.5 items-center justify-center",
        className
      )}
    >
      <span
        className="absolute inset-0 rounded-full"
        style={{ background: tone.halo }}
      />
      <span
        className="relative h-2 w-2 rounded-full"
        style={{
          background: tone.fill,
          boxShadow: tone.shadow,
        }}
      />
    </span>
  );
}
