import { forwardRef } from "react";
import { cn } from "@/lib/utils";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  invalid?: boolean;
};

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea({ className, invalid, ...props }, ref) {
    return (
      <textarea
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(
          "min-h-24 w-full rounded-xl border bg-white px-4 py-3 text-sm text-charcoal-900 shadow-sm transition-colors",
          "placeholder:text-charcoal-400 focus:outline-none focus:ring-2 focus:ring-tomato-500/40 focus:border-tomato-500",
          invalid
            ? "border-tomato-500 focus:border-tomato-500"
            : "border-charcoal-200 hover:border-charcoal-300",
          className,
        )}
        {...props}
      />
    );
  },
);