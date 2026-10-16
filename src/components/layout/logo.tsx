import { cn } from "@/lib/utils";

/**
 * Bachelor's Street logo.
 *
 * The mark is a bespoke two-tone flame inside a gradient squircle — one
 * recognisable silhouette that still reads at 24px in a browser tab and on a
 * dark header. The flame is pure SVG (no raster), so it stays crisp at any
 * size and never needs a network request.
 */

/** Original flame-and-B monogram that remains legible at favicon scale. */
export function FlameGlyph({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M5 40c5-5 8-11 10-19 2 5 1 10-1 14 4-2 7-6 10-10-1 8-5 14-11 17-3 1-6 0-8-2Z"
        fill="#ffd166"
      />
      <path
        d="M17 5h11c8 0 12 4 12 11 0 4-2 7-6 9 5 1 8 5 8 10 0 8-6 12-16 12H9l3-42h5Zm6 8-1 8h6c3 0 4-1 4-4s-1-4-4-4h-5Zm-2 15-1 10h8c3 0 5-1 5-5 0-3-2-5-5-5h-7Z"
        fill="currentColor"
        fillRule="evenodd"
      />
    </svg>
  );
}

/** The gradient badge + flame. Accepts a size via `className` (e.g. `h-11 w-11`). */
export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-[30%] bg-linear-to-br from-flame-400 via-flame-500 to-tomato-600 text-white shadow-[var(--shadow-glow)]",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-linear-to-b from-white/30 to-transparent"
      />
      <FlameGlyph className="relative h-[60%] w-[62%]" />
    </span>
  );
}
