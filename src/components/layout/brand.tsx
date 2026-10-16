import Link from "next/link";
import { cn } from "@/lib/utils";
import { LogoMark } from "@/components/layout/logo";

type BrandProps = {
  className?: string;
  /** `light` = cream text for dark backgrounds, `dark` = charcoal text for light. */
  tone?: "light" | "dark";
  /** Hide the location suffix on very tight layouts. */
  showSuffix?: boolean;
};

/**
 * Bachelor's Street text logo: a flame-gradient mark plus a two-line wordmark.
 */
export function Brand({
  className,
  tone = "dark",
  showSuffix = true,
}: BrandProps) {
  const light = tone === "light";
  return (
    <Link
      href="/"
      className={cn("group inline-flex items-center gap-2.5", className)}
      aria-label="Bachelor's Street — home"
    >
      <LogoMark className="h-10 w-10 transition-transform duration-200 group-hover:-rotate-3 group-hover:scale-105" />
      <span className="leading-none">
        <span
          className={cn(
            "block font-display text-[17px] font-black tracking-[-0.01em]",
            light ? "text-cream-50" : "text-charcoal-900",
          )}
        >
          Bachelor&apos;s Street
        </span>
        {showSuffix ? (
          <span
            className={cn(
              "mt-1 block text-[10px] font-bold uppercase tracking-[0.3em]",
              light ? "text-flame-400" : "text-flame-600",
            )}
          >
            H-13 · Islamabad
          </span>
        ) : null}
      </span>
    </Link>
  );
}
