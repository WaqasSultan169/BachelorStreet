"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

type DialogProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  describedBy?: string;
  children: React.ReactNode;
  className?: string;
};

/**
 * Accessible dialog built on the native <dialog> element, which gives us
 * showModal focus trapping, Escape handling and inert background for free.
 */
export function Dialog({
  open,
  onClose,
  title,
  describedBy,
  children,
  className,
}: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    else if (!open && el.open) el.close();
  }, [open]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const handleCancel = (event: Event) => {
      event.preventDefault();
      onClose();
    };
    el.addEventListener("cancel", handleCancel);
    return () => el.removeEventListener("cancel", handleCancel);
  }, [onClose]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={title ? "dialog-title" : undefined}
      aria-describedby={describedBy}
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
      className={cn(
        "m-auto max-h-[92dvh] w-[calc(100vw-2rem)] max-w-lg overflow-hidden rounded-3xl border border-charcoal-200/70 bg-white p-0 text-charcoal-900 shadow-[var(--shadow-lift)]",
        "backdrop:bg-charcoal-950/50 backdrop:backdrop-blur-sm",
        className,
      )}
    >
      <div className="flex max-h-[92dvh] flex-col">
        <div className="flex items-start justify-between gap-4 border-b border-charcoal-900/10 px-6 py-4">
          {title ? (
            <h2
              id="dialog-title"
              className="font-display text-lg font-semibold text-charcoal-900"
            >
              {title}
            </h2>
          ) : (
            <span />
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="-mr-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-charcoal-500 transition-colors hover:bg-charcoal-900/5 hover:text-charcoal-900"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </div>
    </dialog>
  );
}
