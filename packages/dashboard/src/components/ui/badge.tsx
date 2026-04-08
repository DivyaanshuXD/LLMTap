import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils.ts";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default: "border-[var(--border-dim)] bg-[rgba(var(--ch-text-primary),0.05)] text-[var(--color-text-secondary)]",
        success: "border-[var(--color-accent)]/20 bg-[var(--color-accent)]/14 text-[var(--color-accent)]",
        warning: "border-[var(--color-accent-2)]/20 bg-[var(--color-accent-2)]/15 text-[var(--color-accent-2)]",
        error: "border-[var(--color-text-primary)]/20 bg-[var(--color-text-primary)]/15 text-[var(--color-text-primary)]",
        info: "border-[var(--color-accent-2)]/20 bg-[var(--color-accent-2)]/14 text-[var(--color-accent)]",
        purple: "border-[var(--color-accent-2)]/20 bg-[var(--color-accent-2)]/14 text-[var(--color-accent)]",
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
