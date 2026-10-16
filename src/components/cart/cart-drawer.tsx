"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, ShoppingBag, Trash2, X } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { closeCart, openLocationModal } from "@/store/slices/uiSlice";
import {
  clearCart,
  selectItemCount,
  selectSubtotal,
} from "@/store/slices/cartSlice";
import { selectFulfillmentComplete } from "@/store/slices/locationSlice";
import { CartLineItem } from "@/components/cart/cart-line-item";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { useLockBodyScroll } from "@/hooks/use-lock-body-scroll";
import { formatPkr } from "@/lib/utils";

export function CartDrawer() {
  const dispatch = useAppDispatch();
  const open = useAppSelector((state) => state.ui.cartOpen);
  const lines = useAppSelector((state) => state.cart.lines);
  const itemCount = useAppSelector(selectItemCount);
  const subtotal = useAppSelector(selectSubtotal);
  const fulfillmentComplete = useAppSelector(selectFulfillmentComplete);
  const closeRef = useRef<HTMLButtonElement>(null);

  useLockBodyScroll(open);

  useEffect(() => {
    if (!open) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") dispatch(closeCart());
    };
    document.addEventListener("keydown", handleKey);
    const focusTimer = window.setTimeout(() => closeRef.current?.focus(), 40);
    return () => {
      document.removeEventListener("keydown", handleKey);
      window.clearTimeout(focusTimer);
    };
  }, [open, dispatch]);

  return (
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-[80]">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-charcoal-950/50 backdrop-blur-sm"
            onClick={() => dispatch(closeCart())}
            aria-hidden
          />
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label="Shopping cart"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "tween", duration: 0.28, ease: "easeOut" }}
            className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-cream-50 shadow-[var(--shadow-lift)]"
          >
            <header className="flex items-center justify-between border-b border-charcoal-900/10 px-5 py-4">
              <div className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-tomato-600" />
                <h2 className="font-display text-lg font-semibold text-charcoal-900">
                  Your cart
                  {itemCount > 0 ? (
                    <span className="ml-2 text-sm font-medium text-charcoal-500">
                      ({itemCount})
                    </span>
                  ) : null}
                </h2>
              </div>
              <button
                ref={closeRef}
                type="button"
                onClick={() => dispatch(closeCart())}
                aria-label="Close cart"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full text-charcoal-500 transition-colors hover:bg-charcoal-900/5 hover:text-charcoal-900"
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto px-5">
              {lines.length === 0 ? (
                <div className="py-10">
                  <EmptyState
                    icon={<ShoppingBag className="h-6 w-6" />}
                    title="Your cart is empty"
                    description="Add something delicious from the menu to get started."
                    action={
                      <Button href="/menu" onClick={() => dispatch(closeCart())}>
                        Browse the menu
                      </Button>
                    }
                  />
                </div>
              ) : (
                <ul className="divide-y divide-charcoal-900/10">
                  {lines.map((line) => (
                    <CartLineItem key={line.lineId} line={line} />
                  ))}
                </ul>
              )}
            </div>

            {lines.length > 0 ? (
              <footer className="border-t border-charcoal-900/10 bg-white px-5 py-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-charcoal-500">Subtotal</span>
                  <span className="font-display text-xl font-semibold text-charcoal-900">
                    {formatPkr(subtotal)}
                  </span>
                </div>
                <p className="mt-1 text-xs text-charcoal-400">
                  Delivery and taxes are calculated and re-verified on the server
                  at checkout.
                </p>
                <div className="mt-4 flex flex-col gap-2">
                  <Button
                    href="/checkout"
                    size="lg"
                    className="w-full"
                    onClick={(event) => {
                      if (!fulfillmentComplete) {
                        event.preventDefault();
                        dispatch(closeCart());
                        dispatch(openLocationModal());
                        return;
                      }
                      dispatch(closeCart());
                    }}
                  >
                    {fulfillmentComplete ? (
                      <>
                        Go to checkout
                        <ArrowRight className="h-4 w-4" />
                      </>
                    ) : (
                      "Choose pickup or delivery"
                    )}
                  </Button>
                  {!fulfillmentComplete ? (
                    <p className="text-center text-xs text-charcoal-400">
                      Choose pickup or delivery before checking out.
                    </p>
                  ) : null}
                  <div className="flex items-center justify-between">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => dispatch(closeCart())}
                    >
                      Continue shopping
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-tomato-600 hover:bg-tomato-100"
                      onClick={() => dispatch(clearCart())}
                    >
                      <Trash2 className="h-4 w-4" />
                      Clear cart
                    </Button>
                  </div>
                </div>
              </footer>
            ) : null}
          </motion.aside>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
