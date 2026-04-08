import { cn } from "@/lib/utils.ts";

export interface ProviderBadgeProps {
  provider: string;
  active?: boolean;
  size?: "sm" | "md";
  className?: string;
}

/** Provider identity badge that stays quiet until activated. */
export function ProviderBadge({
  provider,
  active = true,
  size = "md",
  className,
}: ProviderBadgeProps) {
  return (
    <span
      className={cn(
        "badge capitalize transition-[border-color,background-color,color,text-shadow] duration-[var(--duration-base)] ease-[var(--ease-out)] hover:border-[var(--border-default)]",
        size === "sm" ? "px-2.5 py-[2px] text-[10px]" : "px-3 py-[3px] text-[11px]",
        className
      )}
      style={
        active
          ? {
              background: "var(--color-accent-dim)",
              borderColor: "var(--border-default)",
              color: "var(--color-accent)",
              textShadow: "0 0 10px rgba(var(--ch-accent), 0.18)",
            }
          : {
              background: "transparent",
              borderColor: "var(--border-invisible)",
              color: "var(--color-text-tertiary)",
            }
      }
    >
      {provider}
    </span>
  );
}
