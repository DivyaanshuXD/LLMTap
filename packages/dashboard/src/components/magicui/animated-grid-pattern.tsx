import { cn } from "@/lib/utils.ts";

interface AnimatedGridPatternProps {
  className?: string;
}

export function AnimatedGridPattern({
  className,
}: AnimatedGridPatternProps) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden",
        className
      )}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.12),transparent_32%),radial-gradient(circle_at_20%_20%,rgba(16,185,129,0.14),transparent_24%),radial-gradient(circle_at_80%_10%,rgba(251,191,36,0.12),transparent_22%)]" />
      <div className="grid-scan absolute inset-[-20%] opacity-70" />
      <div className="grid-haze absolute inset-x-0 top-0 h-40" />
    </div>
  );
}
