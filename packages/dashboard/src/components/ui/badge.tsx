import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils.ts";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default: "border-white/10 bg-white/6 text-slate-300",
        success: "border-[#66fcf1]/20 bg-[#66fcf1]/14 text-[#66fcf1]",
        warning: "border-[#45a29e]/20 bg-[#45a29e]/15 text-[#45a29e]",
        error: "border-[#c5c6c7]/20 bg-[#c5c6c7]/15 text-[#c5c6c7]",
        info: "border-[#45a29e]/20 bg-[#45a29e]/14 text-[#66fcf1]",
        purple: "border-[#45a29e]/20 bg-[#45a29e]/14 text-[#66fcf1]",
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
