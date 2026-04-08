import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils.ts";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg-base)] disabled:pointer-events-none disabled:opacity-50 cursor-pointer [&_svg]:pointer-events-none [&_svg]:h-4 [&_svg]:w-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--color-accent)] text-[var(--color-bg-base)] shadow-[0_0_20px_rgba(var(--ch-accent), 0.22)] hover:bg-[var(--color-accent-2)]",
        destructive:
          "bg-[var(--color-text-primary)]/16 text-[var(--color-text-primary)] border border-[var(--color-text-primary)]/20 hover:bg-[var(--color-text-primary)]/24",
        outline:
          "border border-[var(--border-dim)] bg-[rgba(var(--ch-text-primary),0.04)] text-[var(--color-text-secondary)] hover:border-[var(--border-default)] hover:bg-[rgba(var(--ch-text-primary),0.07)] hover:text-[var(--color-text-primary)]",
        secondary:
          "bg-[rgba(var(--ch-text-primary),0.05)] text-[var(--color-text-secondary)] border border-[var(--border-dim)] hover:border-[var(--border-default)] hover:bg-[rgba(var(--ch-text-primary),0.08)]",
        ghost:
          "text-[var(--color-text-tertiary)] hover:bg-[rgba(var(--ch-text-primary),0.05)] hover:text-[var(--color-text-secondary)]",
        link: "text-[var(--color-accent)] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-8 rounded-xl px-3.5 text-xs",
        lg: "h-12 rounded-2xl px-8 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
