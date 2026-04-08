import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils.ts";

export interface StatCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  trend?: { direction: "up" | "down" | "neutral"; value: string };
  icon?: ReactNode;
  glowing?: boolean;
  size?: "sm" | "md";
  className?: string;
}

/** Mission-control metric card for high-signal stats. */
export function StatCard({
  label,
  value,
  subtext,
  trend,
  icon,
  glowing = false,
  size = "md",
  className,
}: StatCardProps) {
  const [pop, setPop] = useState(false);

  useEffect(() => {
    setPop(true);
    const timer = window.setTimeout(() => setPop(false), 360);
    return () => window.clearTimeout(timer);
  }, [value]);

  const trendTone =
    trend?.direction === "up"
      ? {
          color: "var(--color-accent)",
          glow: "0 0 14px rgba(var(--ch-accent), 0.18)",
          rotation: "-45deg",
        }
      : trend?.direction === "down"
        ? {
            color: "var(--color-error)",
            glow: "0 0 14px rgba(var(--ch-error), 0.18)",
            rotation: "45deg",
          }
        : {
            color: "var(--color-text-secondary)",
            glow: "none",
            rotation: "0deg",
          };

  return (
    <div
      className={cn(
        "group card relative overflow-hidden px-4 py-3.5",
        size === "sm" ? "min-h-[96px]" : "min-h-[112px]",
        className
      )}
    >
      <div className="pointer-events-none absolute inset-0 opacity-[0.04] [background-image:linear-gradient(rgba(var(--ch-accent),0.9)_1px,transparent_1px),linear-gradient(90deg,rgba(var(--ch-accent),0.9)_1px,transparent_1px)] [background-size:36px_36px]" />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-6 top-0 h-px opacity-30 transition-opacity duration-[var(--duration-base)] ease-[var(--ease-out)] group-hover:opacity-60"
        style={{
          background:
            "linear-gradient(90deg, transparent, var(--color-accent), transparent)",
        }}
      />
      {glowing ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-7 -top-7 h-24 w-24 rounded-full"
          style={{ background: "var(--bloom-soft)" }}
        />
      ) : null}

      <div className="relative flex h-full flex-col justify-between gap-3">
        <div className="flex items-start justify-between gap-3">
          <span className="mono-label">{label}</span>
          <div className="flex items-center gap-2">
            {trend ? (
              <span
                className="inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-[0.12em]"
                style={{
                  color: trendTone.color,
                  textShadow: trendTone.glow,
                }}
              >
                <svg
                  viewBox="0 0 12 12"
                  aria-hidden="true"
                  className="h-3 w-3 shrink-0"
                  style={{ transform: `rotate(${trendTone.rotation})` }}
                >
                  <path
                    d="M6 1.5 10.5 6H7.4v4H4.6V6H1.5Z"
                    fill="currentColor"
                  />
                </svg>
                <span>{trend.value}</span>
              </span>
            ) : null}
            {icon ? (
              <span className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--border-dim)] bg-[rgba(var(--ch-text-primary),0.03)] text-[var(--color-text-secondary)]">
                {icon}
              </span>
            ) : null}
          </div>
        </div>

        <div className="space-y-1.5">
          <div
            className={cn(
              "display-num leading-none text-[34px]",
              size === "sm" && "text-[22px]",
              !glowing && "text-[var(--color-text-primary)] [text-shadow:none]",
              pop && "animate-[count-pop_var(--duration-slow)_var(--ease-spring)]"
            )}
          >
            {value}
          </div>
          {subtext ? (
            <div className="text-[12px] leading-5 text-[var(--color-text-secondary)]">
              {subtext}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
