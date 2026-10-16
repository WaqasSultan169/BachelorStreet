"use client";

import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type ErrorStateProps = {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
};

export function ErrorState({
  title = "Something went wrong",
  description = "We couldn't load this content. Please try again.",
  action,
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-2xl border border-tomato-600/20 bg-tomato-100/40 px-6 py-16 text-center",
        className,
      )}
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-tomato-600 shadow-sm">
        <AlertTriangle className="h-6 w-6" />
      </div>
      <h3 className="font-display text-lg font-semibold text-charcoal-900">{title}</h3>
      <p className="max-w-md text-sm text-charcoal-500">{description}</p>
      {action ? (
        <div className="mt-2">
          {action ?? (
            <Button onClick={() => window.location.reload()}>Try again</Button>
          )}
        </div>
      ) : null}
    </div>
  );
}