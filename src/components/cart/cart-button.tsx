"use client";

import { ShoppingBag } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { openCart } from "@/store/slices/uiSlice";
import { selectItemCount } from "@/store/slices/cartSlice";
import { cn } from "@/lib/utils";

export function CartButton({ className }: { className?: string }) {
  const dispatch = useAppDispatch();
  const count = useAppSelector(selectItemCount);

  return (
    <button
      type="button"
      onClick={() => dispatch(openCart())}
      aria-label={count > 0 ? `Open cart, ${count} items` : "Open cart"}
      className={cn(
        "relative inline-flex h-10 w-10 items-center justify-center rounded-full text-charcoal-900 transition-colors hover:bg-charcoal-900/5",
        className,
      )}
    >
      <ShoppingBag className="h-5 w-5" />
      {count > 0 ? (
        <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-tomato-600 px-1 text-[11px] font-bold text-white">
          {count > 99 ? "99+" : count}
        </span>
      ) : null}
    </button>
  );
}
