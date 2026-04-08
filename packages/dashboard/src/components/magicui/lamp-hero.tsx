import type { ReactNode } from "react";
import { cn } from "@/lib/utils.ts";

interface LampHeroProps {
  className?: string;
  children: ReactNode;
}

export function LampHero({ className, children }: LampHeroProps) {
  return (
    <div className={cn("relative overflow-hidden", className)}>
      <div className="pointer-events-none absolute left-1/2 top-0 h-56 w-[38rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(var(--ch-accent),0.28),rgba(var(--ch-accent-2),0.16)_36%,transparent_72%)] blur-3xl" />
      <div className="pointer-events-none absolute left-1/2 top-0 h-44 w-[14rem] -translate-x-1/2 bg-[linear-gradient(180deg,rgba(var(--ch-text-primary),0.22),rgba(var(--ch-accent),0.14)_26%,transparent_72%)] opacity-70 blur-2xl" />
      <div className="pointer-events-none absolute left-1/2 top-10 h-56 w-[30rem] -translate-x-1/2 bg-[conic-gradient(from_180deg_at_50%_0%,rgba(var(--ch-text-primary),0)_0deg,rgba(var(--ch-text-primary),0.12)_22deg,rgba(var(--ch-accent),0.14)_48deg,rgba(var(--ch-accent-2),0.12)_76deg,rgba(var(--ch-text-primary),0)_112deg)] opacity-90 blur-xl" />
      <div className="relative">{children}</div>
    </div>
  );
}
