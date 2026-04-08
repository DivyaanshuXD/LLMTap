import { cn } from "@/lib/utils.ts";

export interface CostTagProps {
  value: number;
  size?: "sm" | "md";
  className?: string;
}

function resolveCostTone(value: number) {
  if (value < 0.01) {
    return {
      color: "var(--color-accent)",
      background: "var(--color-accent-soft)",
      border: "var(--border-default)",
      shadow: "0 0 18px rgba(var(--ch-accent), 0.14)",
    };
  }

  if (value < 0.1) {
    return {
      color: "var(--color-text-primary)",
      background: "rgba(var(--ch-text-primary), 0.05)",
      border: "var(--border-dim)",
      shadow: "none",
    };
  }

  if (value <= 1) {
    return {
      color: "var(--color-warning)",
      background: "rgba(var(--ch-warning), 0.08)",
      border: "rgba(var(--ch-warning), 0.24)",
      shadow: "0 0 18px rgba(var(--ch-warning), 0.14)",
    };
  }

  return {
    color: "var(--color-error)",
    background: "rgba(var(--ch-error), 0.08)",
    border: "rgba(var(--ch-error), 0.24)",
    shadow: "0 0 18px rgba(var(--ch-error), 0.16)",
  };
}

/** Compact cost badge with severity-aware emphasis. */
export function CostTag({ value, size = "md", className }: CostTagProps) {
  const tone = resolveCostTone(value);

  return (
    <span
      className={cn(
        "badge justify-center",
        size === "sm" ? "px-2.5 py-[2px] text-[10px]" : "px-3 py-[3px] text-[11px]",
        className
      )}
      style={{
        color: tone.color,
        background: tone.background,
        borderColor: tone.border,
        boxShadow: tone.shadow,
      }}
    >
      ${value.toFixed(4)}
    </span>
  );
}
