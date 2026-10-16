"use client";

import { Bike, ChevronDown, Store } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { openLocationModal } from "@/store/slices/uiSlice";
import {
  selectDeliveryAddress,
  selectFulfillmentComplete,
  selectFulfillmentType,
  selectSelectedBranch,
} from "@/store/slices/locationSlice";
import { cn } from "@/lib/utils";

/**
 * Header control showing the current fulfilment choice. Opening it re-opens the
 * fulfilment modal so the customer can change pickup/delivery or the address.
 */
export function LocationButton({
  className,
  onClick,
  tone = "light",
}: {
  className?: string;
  onClick?: () => void;
  tone?: "light" | "dark";
}) {
  const dispatch = useAppDispatch();
  const type = useAppSelector(selectFulfillmentType);
  const branch = useAppSelector(selectSelectedBranch);
  const address = useAppSelector(selectDeliveryAddress);
  const complete = useAppSelector(selectFulfillmentComplete);

  const Icon = type === "pickup" ? Store : Bike;
  const dark = tone === "dark";

  let stage: string;
  let value: string | null;
  if (type === "pickup" && branch) {
    stage = "Pickup";
    value = branch.name;
  } else if (type === "delivery" && address) {
    stage = "Delivery";
    value = address.label || address.area || "Saved address";
  } else if (type === "pickup") {
    stage = "Pickup";
    value = "Select a branch";
  } else if (type === "delivery") {
    stage = "Delivery";
    value = "Add an address";
  } else {
    stage = "Ordering";
    value = "Choose pickup or delivery";
  }

  return (
    <button
      type="button"
      onClick={() => {
        onClick?.();
        dispatch(openLocationModal());
      }}
      aria-haspopup="dialog"
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-left transition-colors",
        dark
          ? complete
            ? "border-white/15 bg-white/5 hover:bg-white/10"
            : "border-gold-400/40 bg-gold-400/10 hover:bg-gold-400/20"
          : complete
            ? "border-charcoal-200 bg-white hover:border-charcoal-300"
            : "border-gold-400/50 bg-gold-400/10 hover:bg-gold-400/20",
        className,
      )}
    >
      <Icon className={cn("h-4 w-4 shrink-0", dark ? "text-flame-400" : "text-tomato-600")} />
      <span className="flex min-w-0 flex-col leading-tight">
        <span className={cn("text-[10px] font-semibold uppercase tracking-wide", dark ? "text-cream-100/55" : "text-charcoal-400")}>
          {stage}
        </span>
        <span className={cn("max-w-36 truncate text-xs font-semibold", dark ? "text-cream-50" : "text-charcoal-900")}>
          {value}
        </span>
      </span>
      <ChevronDown className={cn("h-3.5 w-3.5 shrink-0", dark ? "text-cream-100/55" : "text-charcoal-400")} />
    </button>
  );
}
