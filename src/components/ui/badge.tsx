import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-[#1E6BFF] focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-[#1E6BFF] text-white shadow",
        secondary:
          "border-white/10 bg-white/10 text-slate-300 hover:bg-white/15",
        destructive:
          "border-transparent bg-rose-500/20 text-rose-300 border-rose-500/30",
        outline: "text-slate-300 border-white/15 bg-transparent",
        meta: "border-white/10 bg-[#131620] text-slate-300 font-medium",
        gradient:
          "border-0 bg-gradient-to-r from-[#1E6BFF] via-[#7C3AED] to-[#F472B6] text-white font-medium",
        success:
          "border-emerald-500/30 bg-emerald-950/50 text-emerald-400 font-medium",
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
