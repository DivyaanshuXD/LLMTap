import type { ReactNode } from "react";
import { StarsBackground } from "@/components/backgrounds/GravityStarsBackground.tsx";
import { cn } from "@/lib/utils.ts";

export interface SectionBannerProps {
  context: string;
  title: string;
  description: string;
  tags?: string[];
  rightSlot?: ReactNode;
  className?: string;
}

/** Shared top-of-page hero banner for dashboard sections. */
export function SectionBanner({
  context,
  title,
  description,
  tags = [],
  rightSlot,
  className,
}: SectionBannerProps) {
  return (
    <section
      className={cn(
        "hero-panel relative overflow-hidden rounded-[calc(var(--radius-panel)+10px)] border px-6 py-6 sm:px-8 sm:py-7",
        className
      )}
      style={{
        borderColor: "var(--border-dim)",
      }}
    >
      <div className="pointer-events-none absolute inset-0 opacity-[0.04] [background-image:linear-gradient(rgba(var(--ch-accent),0.8)_1px,transparent_1px),linear-gradient(90deg,rgba(var(--ch-accent),0.8)_1px,transparent_1px)] [background-size:84px_84px]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.92] [mask-image:radial-gradient(circle_at_center,black,transparent_84%)]">
        <StarsBackground
          className="h-full w-full"
          speed={110}
          factor={0.008}
          starColor="rgba(var(--rgb-text-frost), 0.2)"
          pointerEvents={false}
          transparent
          blendMode="normal"
          fieldOpacity={0.82}
          layers={[
            { count: 240, size: 1, durationMultiplier: 1 },
            { count: 92, size: 2, durationMultiplier: 1.8 },
            { count: 36, size: 3, durationMultiplier: 2.6 },
          ]}
        />
      </div>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-0 w-[46%]"
        style={{
          background:
            "radial-gradient(circle at 0% 40%, rgba(var(--ch-accent), 0.12), transparent 72%)",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-12 top-[-20px] h-44 w-44 rounded-full"
        style={{ background: "var(--bloom-purple)" }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 left-10 right-10 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent, var(--border-bright), transparent)",
        }}
      />

      <div
        className={cn(
          "relative min-h-[248px]",
          rightSlot && "grid gap-6 lg:min-h-[360px] lg:grid-cols-[minmax(0,1.1fr)_minmax(400px,430px)] lg:items-start lg:gap-8"
        )}
      >
        <div className="flex max-w-5xl flex-col justify-between gap-8">
          <div className="space-y-5">
            <div className="inline-flex items-center gap-3 rounded-[var(--radius-badge)] border border-[var(--border-default)] bg-[rgba(var(--ch-accent),0.04)] px-4 py-2">
              <span
                aria-hidden="true"
                className="h-px w-7"
                style={{
                  background: "var(--color-accent)",
                  boxShadow: "0 0 12px rgba(var(--ch-accent), 0.35)",
                }}
              />
              <span className="mono-label text-[var(--color-accent-max)]">{context}</span>
              <span className="live-dot" style={{ display: "inline-block" }} />
            </div>

            <div className="space-y-4">
              <h1
                className="max-w-[9ch] text-[var(--color-text-primary)]"
                style={{
                  fontFamily: "var(--font-operator)",
                  fontSize: "clamp(42px, 5.2vw, 84px)",
                  fontWeight: 700,
                  lineHeight: "0.88",
                  letterSpacing: "-0.065em",
                  textShadow: "0 18px 60px rgba(0, 0, 0, 0.42)",
                }}
              >
                {title}
              </h1>
              <p className="page-section-copy">{description}</p>
            </div>
          </div>

          {tags.length > 0 ? (
            <div className="pill-strip">
              {tags.map((tag) => (
                <span key={tag} className="pill-item">
                  {tag}
                </span>
              ))}
            </div>
          ) : null}
        </div>

        {rightSlot ? (
          <div className="min-w-0 lg:w-full lg:max-w-[430px] lg:justify-self-end">
            {rightSlot}
          </div>
        ) : null}
      </div>

      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-5 right-6 select-none text-right uppercase leading-none"
        style={{
          fontFamily: "var(--font-operator)",
          fontSize: "clamp(52px, 9vw, 116px)",
          color: "rgba(var(--ch-text-primary), 0.034)",
          fontWeight: 700,
          letterSpacing: "-0.06em",
        }}
      >
        {context}
      </div>
    </section>
  );
}
