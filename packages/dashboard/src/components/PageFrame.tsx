import type { ReactNode } from "react";

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
        <div className="pointer-events-none absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_top_right,rgba(14,165,233,0.22),transparent_45%),radial-gradient(circle_at_60%_70%,rgba(34,197,94,0.18),transparent_42%)]" />
        <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-4">
            <div className="hud-label">{eyebrow}</div>
            <div className="max-w-3xl space-y-3">
              <h1 className="text-3xl font-semibold leading-none tracking-[-0.04em] text-white sm:text-5xl">
                {title}
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
                {description}
              </p>
            </div>
          </div>
          {aside ? <div className="relative">{aside}</div> : null}
        </div>
      </section>

      {children}
    </div>
  );
}
