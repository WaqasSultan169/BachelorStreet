"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  dismissToast,
  selectToasts,
  type Toast,
  type ToastVariant,
} from "@/store/slices/toastSlice";
import { cn } from "@/lib/utils";

const VARIANTS: Record<ToastVariant, { icon: typeof Info; classes: string }> = {
  success: { icon: CheckCircle2, classes: "text-emerald-600" },
  error: { icon: AlertTriangle, classes: "text-tomato-600" },
  warning: { icon: AlertTriangle, classes: "text-gold-600" },
  info: { icon: Info, classes: "text-charcoal-500" },
};

function ToastCard({ toast }: { toast: Toast }) {
  const dispatch = useAppDispatch();
  const { icon: Icon, classes } = VARIANTS[toast.variant];

  useEffect(() => {
    const timer = window.setTimeout(
      () => dispatch(dismissToast(toast.id)),
      toast.duration,
    );
    return () => window.clearTimeout(timer);
  }, [dispatch, toast.id, toast.duration]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.98 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border border-charcoal-200/70 bg-white p-4 shadow-[var(--shadow-lift)]"
      role={toast.variant === "error" || toast.variant === "warning" ? "alert" : "status"}
    >
      <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", classes)} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-charcoal-900">{toast.title}</p>
        {toast.description ? (
          <p className="mt-0.5 text-sm text-charcoal-500">{toast.description}</p>
        ) : null}
      </div>
      <button
        type="button"
        onClick={() => dispatch(dismissToast(toast.id))}
        aria-label="Dismiss notification"
        className="-mr-1 -mt-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-charcoal-400 transition-colors hover:bg-charcoal-900/5 hover:text-charcoal-700"
      >
        <X className="h-4 w-4" />
      </button>
    </motion.div>
  );
}

export function Toaster() {
  const toasts = useAppSelector(selectToasts);

  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[70] flex flex-col items-center gap-2 p-4 sm:items-end"
    >
      <AnimatePresence initial={false}>
        {toasts.map((toast) => (
          <ToastCard key={toast.id} toast={toast} />
        ))}
      </AnimatePresence>
    </div>
  );
}
