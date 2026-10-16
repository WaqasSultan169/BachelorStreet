"use client";

import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

type QuantityStepperProps = {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  label?: string;
  size?: "sm" | "md";
  className?: string;
};

export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max = 99,
  label = "Quantity",
  size = "md",
  className,
}: QuantityStepperProps) {
  const button =
    "inline-flex items-center justify-center rounded-full text-charcoal-700 transition-colors hover:bg-charcoal-900/5 disabled:pointer-events-none disabled:opacity-40";
  const dimension = size === "sm" ? "h-7 w-7" : "h-9 w-9";

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-charcoal-200 bg-white p-1",
        className,
      )}
      role="group"
      aria-label={label}
    >
      <button
        type="button"
        className={cn(button, dimension)}
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        aria-label="Decrease quantity"
      >
        <Minus className={size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4"} />
      </button>
      <span
        aria-live="polite"
        className={cn(
          "min-w-6 text-center font-semibold tabular-nums text-charcoal-900",
          size === "sm" ? "text-sm" : "text-base",
        )}
      >
        {value}
      </span>
      <button
        type="button"
        className={cn(button, dimension)}
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        aria-label="Increase quantity"
      >
        <Plus className={size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4"} />
      </button>
    </div>
  );
}
