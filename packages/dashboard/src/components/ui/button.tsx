import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils.ts";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#66fcf1]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0c10] disabled:pointer-events-none disabled:opacity-50 cursor-pointer [&_svg]:pointer-events-none [&_svg]:h-4 [&_svg]:w-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-[#66fcf1] text-[#0b0c10] shadow-[0_0_20px_rgba(102,252,241,0.22)] hover:bg-[#7cfdf4]",
        destructive:
          "bg-[#C5C6C7]/16 text-[#C5C6C7] border border-[#C5C6C7]/20 hover:bg-[#C5C6C7]/24",
        outline:
          "border border-white/10 bg-white/4 text-slate-200 hover:bg-white/8 hover:border-white/15",
        secondary:
          "bg-white/6 text-slate-200 border border-white/8 hover:bg-white/10",
        ghost:
          "text-slate-400 hover:bg-white/6 hover:text-slate-200",
        link: "text-[#66fcf1] underline-offset-4 hover:underline",
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
