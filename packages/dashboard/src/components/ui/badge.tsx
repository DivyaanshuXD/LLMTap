import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils.ts";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default: "border-white/10 bg-white/6 text-slate-300",
        success: "border-emerald-400/20 bg-emerald-500/15 text-emerald-300",
        warning: "border-amber-400/20 bg-amber-500/15 text-amber-300",
        error: "border-rose-400/20 bg-rose-500/15 text-rose-300",
        info: "border-sky-400/20 bg-sky-500/15 text-sky-300",
        purple: "border-purple-400/20 bg-purple-500/15 text-purple-300",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
