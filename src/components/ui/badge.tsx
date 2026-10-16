import { cn } from "@/lib/utils";

const variants = {
  neutral: "bg-charcoal-900/5 text-charcoal-700",
  tomato: "bg-tomato-100 text-tomato-600",
  gold: "bg-gold-400/20 text-gold-600",
  success: "bg-emerald-100 text-emerald-700",
  outline: "border border-charcoal-300 text-charcoal-700",
} as const;

export type BadgeVariant = keyof typeof variants;

export function Badge({
  className,
  variant = "neutral",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}