import type { ReactNode } from "react";
import { GravityStarsBackground } from "./backgrounds/GravityStarsBackground.tsx";
import { BorderBeam } from "./magicui/border-beam.tsx";
import { LampHero } from "./magicui/lamp-hero.tsx";
import { ShinyText } from "./magicui/shiny-text.tsx";

interface PageFrameProps {
  eyebrow: string;
  title: string;
  description: string;
  aside?: ReactNode;
  children: ReactNode;
}

export function PageFrame({
  eyebrow,
  title,
  description,
  aside,
  children,
}: PageFrameProps) {
  return (
    <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-8">
      <section className="hero-panel overflow-hidden rounded-[28px] border border-white/8 px-5 py-6 sm:px-7 sm:py-8">
        <BorderBeam size={250} duration={15} colorFrom="#66FCF1" colorTo="#45A29E" />
        <div className="absolute inset-0 opacity-80 [mask-image:radial-gradient(circle_at_center,black,transparent_86%)]">
          <GravityStarsBackground
            className="h-full w-full text-[#66FCF1]"
            starsCount={52}
            starsSize={1.8}
            starsOpacity={0.68}
            glowIntensity={10}
            movementSpeed={0.18}
            mouseInfluence={110}
            gravityStrength={58}
          />
        </div>
        <div className="pointer-events-none absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_top_right,rgba(102,252,241,0.18),transparent_45%),radial-gradient(circle_at_60%_70%,rgba(69,162,158,0.16),transparent_42%)]" />
        <div className="pointer-events-none absolute inset-x-8 bottom-0 h-px bg-[linear-gradient(90deg,transparent,rgba(148,163,184,0.4),transparent)]" />
        <LampHero className="relative">
          <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-4 pt-6 sm:pt-10">
              <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-3 py-2 backdrop-blur-xl">
                <ShinyText className="hud-label" shimmerWidth={80} speed={5}>
                  {eyebrow}
                </ShinyText>
                <span className="h-1.5 w-1.5 rounded-full bg-[#66FCF1] shadow-[0_0_18px_rgba(102,252,241,0.7)]" />
                <span className="text-[11px] font-medium uppercase tracking-[0.2em] text-slate-400">
                  Live operator surface
                </span>
              </div>
              <div className="max-w-4xl space-y-4">
                <h1 className="max-w-4xl text-4xl font-semibold leading-[0.95] tracking-[-0.06em] text-white sm:text-6xl">
                  {title}
                </h1>
                <p className="max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
                  {description}
                </p>
                <div className="flex flex-wrap gap-3 pt-1">
                  <span className="status-chip border-[#45A29E]/16 bg-[#45A29E]/12 text-[#66FCF1]">
                    Local-first telemetry
                  </span>
                  <span className="status-chip border-[#66FCF1]/16 bg-[#66FCF1]/10 text-[#66FCF1]">
                    Streaming traces
                  </span>
                  <span className="status-chip border-[#C5C6C7]/14 bg-[#C5C6C7]/8 text-[#C5C6C7]">
                    Cost intelligence
                  </span>
                </div>
              </div>
            </div>
            {aside ? <div className="relative lg:pt-8">{aside}</div> : null}
          </div>
        </LampHero>
      </section>

      {children}
    </div>
  );
}
