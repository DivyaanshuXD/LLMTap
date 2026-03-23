import { cn } from "@/lib/utils.ts";

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-white/5 bg-[linear-gradient(90deg,rgba(15,23,42,0.9)_20%,rgba(30,41,59,0.65)_50%,rgba(15,23,42,0.9)_80%)] bg-[length:220%_100%] animate-[shimmer_1.4s_ease-in-out_infinite]",
        className
      )}
      {...props}
    />
  );
}

export { Skeleton };
