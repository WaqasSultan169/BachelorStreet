"use client";

import { useEffect } from "react";

/** Locks body scroll while `active` is true (drawers, modals). */
export function useLockBodyScroll(active: boolean): void {
  useEffect(() => {
    if (!active) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [active]);
}
