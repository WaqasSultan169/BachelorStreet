import { cn, formatPkr } from "@/lib/utils";

type PriceProps = {
  amount: number;
  compareAtPrice?: number;
  className?: string;
  size?: "sm" | "md" | "lg";
  /** `light` renders for dark backgrounds (cream text). */
  tone?: "dark" | "light";
};

const sizes = {
  sm: "text-sm",
  md: "text-lg",
  lg: "text-2xl",
} as const;

export function Price({
  amount,
  compareAtPrice,
  className,
  size = "md",
  tone = "dark",
}: PriceProps) {
  const hasDiscount = compareAtPrice != null && compareAtPrice > amount;
  const light = tone === "light";
  return (
    <span className={cn("inline-flex items-baseline gap-2", className)}>
      <span
        className={cn(
          "font-semibold tracking-tight",
          light ? "text-cream-50" : "text-charcoal-900",
          sizes[size],
        )}
      >
        {formatPkr(amount)}
      </span>
      {hasDiscount ? (
        <span
          className={cn(
            "text-sm line-through",
            light ? "text-cream-100/50" : "text-charcoal-400",
          )}
        >
          {formatPkr(compareAtPrice as number)}
        </span>
      ) : null}
    </span>
  );
}
