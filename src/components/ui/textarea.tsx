import * as React from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[80px] w-full rounded-lg border border-[#E8EDE9] bg-white px-3 py-2 text-sm text-[#2D3B35] shadow-sm transition-all duration-200 placeholder:text-[#8A9A8E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5A8A6E] focus-visible:border-transparent disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";

export { Textarea };
