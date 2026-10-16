"use client";

import { motion } from "motion/react";
import { Bike, CheckCircle2, ShoppingBag } from "lucide-react";
import { cn } from "@/lib/utils";
import type { OrderType } from "@/lib/constants";

const OPTIONS: {
  value: OrderType;
  label: string;
  hint: string;
  icon: typeof Bike;
}[] = [
  { value: "delivery", label: "Delivery", hint: "Straight to your address", icon: Bike },
  { value: "pickup", label: "Pickup", hint: "Collect from the branch", icon: ShoppingBag },
];

export function FulfillmentSwitch({
  value,
  onChange,
}: {
  value: OrderType;
  onChange: (value: OrderType) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Fulfilment method"
      className="grid grid-cols-2 gap-3"
    >
      {OPTIONS.map((option) => {
        const active = option.value === value;
        const Icon = option.icon;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "relative flex flex-col items-start gap-2 rounded-2xl border-2 p-4 text-left transition-all duration-200",
              active
                ? "border-flame-500 bg-flame-500/5 shadow-[var(--shadow-card)]"
                : "border-charcoal-200 bg-white hover:border-charcoal-300",
            )}
          >
            <span
              className={cn(
                "flex h-11 w-11 items-center justify-center rounded-xl transition-colors",
                active
                  ? "bg-linear-to-br from-tomato-600 to-flame-500 text-white"
                  : "bg-charcoal-900/5 text-charcoal-600",
              )}
            >
              <Icon className="h-5 w-5" />
            </span>
            <span className="font-display text-base font-bold text-charcoal-900">
              {option.label}
            </span>
            <span className="text-xs leading-snug text-charcoal-500">
              {option.hint}
            </span>
            {active ? (
              <motion.span
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 24 }}
                className="absolute right-3.5 top-3.5 text-flame-500"
              >
                <CheckCircle2 className="h-5 w-5" />
              </motion.span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
