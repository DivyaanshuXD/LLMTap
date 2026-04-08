import { cn } from "@/lib/utils.ts";

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-[rgba(var(--ch-text-primary),0.05)] bg-[linear-gradient(90deg,rgba(var(--ch-bg-panel),0.92)_20%,rgba(var(--ch-bg-surface),0.72)_50%,rgba(var(--ch-bg-panel),0.92)_80%)] bg-[length:220%_100%] animate-[shimmer_1.4s_ease-in-out_infinite]",
        className
      )}
      {...props}
    />
  );
}

export { Skeleton };
