import type { ReactNode } from "react";
import { cn } from "@/lib/utils.ts";

interface LampHeroProps {
  className?: string;
  children: ReactNode;
}

export function LampHero({ className, children }: LampHeroProps) {
  return (
    <div className={cn("relative overflow-hidden", className)}>
      <div className="pointer-events-none absolute left-1/2 top-0 h-56 w-[38rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(125,211,252,0.28),rgba(34,197,94,0.14)_36%,transparent_72%)] blur-3xl" />
      <div className="pointer-events-none absolute left-1/2 top-0 h-44 w-[14rem] -translate-x-1/2 bg-[linear-gradient(180deg,rgba(255,255,255,0.36),rgba(125,211,252,0.14)_26%,transparent_72%)] opacity-70 blur-2xl" />
      <div className="pointer-events-none absolute left-1/2 top-10 h-56 w-[30rem] -translate-x-1/2 bg-[conic-gradient(from_180deg_at_50%_0%,rgba(255,255,255,0)_0deg,rgba(255,255,255,0.16)_22deg,rgba(56,189,248,0.16)_48deg,rgba(16,185,129,0.12)_76deg,rgba(255,255,255,0)_112deg)] opacity-90 blur-xl" />
      <div className="relative">{children}</div>
    </div>
  );
}
