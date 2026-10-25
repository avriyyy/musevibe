import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E6BFF] focus-visible:ring-offset-2 focus-visible:ring-offset-[#05060A] disabled:pointer-events-none disabled:opacity-50 select-none cursor-pointer",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-r from-[#1E6BFF] via-[#7C3AED] to-[#F472B6] text-white shadow-md shadow-[#1E6BFF]/20 hover:opacity-95 active:scale-[0.98] border-0",
        primary:
          "bg-gradient-to-r from-[#1E6BFF] via-[#7C3AED] to-[#F472B6] text-white shadow-md shadow-[#1E6BFF]/20 hover:opacity-95 active:scale-[0.98] border-0",
        secondary:
          "bg-[#0E1017] text-white hover:bg-[#151822] active:scale-[0.98] border border-white/10",
        outline:
          "border border-white/20 bg-white/5 text-slate-200 hover:bg-white/10 hover:border-white/30 hover:text-white active:scale-[0.98]",
        ghost:
          "text-slate-300 hover:text-white hover:bg-white/10 active:scale-[0.98]",
        subtle:
          "bg-[#1E6BFF]/10 text-[#60a5fa] hover:bg-[#1E6BFF]/20 active:scale-[0.98] border border-[#1E6BFF]/20",
        dark:
          "bg-[#0E1017] text-white hover:bg-[#161924] active:scale-[0.98] border border-white/10",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-11 sm:h-12 rounded-xl px-6 text-sm sm:text-base font-medium",
        icon: "h-9 w-9",
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
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
