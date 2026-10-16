"use client";

import { forwardRef } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "soft";
type ButtonSize = "sm" | "md" | "lg" | "icon";

export type ButtonProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  /** When present, renders an <a> styled as a button (for real links only). */
  href?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>;

const baseClasses =
  "inline-flex items-center justify-center gap-2 rounded-full font-semibold tracking-tight transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tomato-500 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-50 disabled:pointer-events-none disabled:opacity-60 active:scale-[0.98]";

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-tomato-600 text-white shadow-sm hover:bg-tomato-500 hover:shadow-md",
  secondary:
    "bg-charcoal-900 text-cream-50 hover:bg-charcoal-800 shadow-sm",
  outline:
    "border border-charcoal-300 text-charcoal-900 bg-transparent hover:bg-cream-100",
  ghost: "text-charcoal-900 hover:bg-charcoal-900/5",
  soft: "bg-gold-400/20 text-gold-600 hover:bg-gold-400/30",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-9 px-4 text-sm",
  md: "h-11 px-6 text-sm",
  lg: "h-13 px-8 text-base py-3",
  icon: "h-10 w-10",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    { className, variant = "primary", size = "md", loading, href, children, disabled, ...props },
    ref,
  ) {
    const classes = cn(
      baseClasses,
      variantClasses[variant],
      sizeClasses[size],
      className,
    );

    if (href) {
      return (
        <a
          href={href}
          className={classes}
          aria-disabled={disabled}
          onClick={
            props.onClick as unknown as React.MouseEventHandler<HTMLAnchorElement>
          }
        >
          {children}
        </a>
      );
    }

    return (
      <button
        ref={ref}
        className={classes}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {children}
      </button>
    );
  },
);