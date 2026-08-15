import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-[#5A8A6E]/10 text-[#5A8A6E]",
        secondary: "border-transparent bg-[#F0F4F1] text-[#8A9A8E]",
        destructive: "border-transparent bg-[#D97B6C]/10 text-[#D97B6C]",
        warning: "border-transparent bg-[#D4A853]/10 text-[#D4A853]",
        outline: "border-[#E8EDE9] text-[#2D3B35]",
        success: "border-transparent bg-[#5A8A6E]/10 text-[#5A8A6E]",
        info: "border-transparent bg-blue-50 text-blue-600",
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
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
