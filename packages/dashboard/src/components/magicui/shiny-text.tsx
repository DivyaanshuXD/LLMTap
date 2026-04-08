import { cn } from "@/lib/utils.ts";

interface ShinyTextProps {
  children: React.ReactNode;
  className?: string;
  shimmerWidth?: number;
  speed?: number;
}

export function ShinyText({
  children,
  className,
  shimmerWidth = 100,
  speed = 3,
}: ShinyTextProps) {
  return (
    <span
      className={cn(
        "inline-flex animate-[shiny-text_var(--shiny-speed)_ease-in-out_infinite] bg-clip-text",
        className
      )}
      style={
        {
          "--shiny-width": `${shimmerWidth}px`,
          "--shiny-speed": `${speed}s`,
          backgroundSize: `${shimmerWidth}px 100%`,
          backgroundRepeat: "no-repeat",
          backgroundPosition: "0 0",
          backgroundImage:
            "linear-gradient(120deg, rgba(var(--ch-text-primary),0) 40%, rgba(var(--ch-text-primary),0.8) 50%, rgba(var(--ch-text-primary),0) 60%)",
          WebkitBackgroundClip: "text",
        } as React.CSSProperties
      }
    >
      {children}
    </span>
  );
}
