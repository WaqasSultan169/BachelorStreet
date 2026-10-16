"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
} from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { Hero } from "@/components/home/hero";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type PublicHeroSlide = {
  id: string;
  title: string;
  subtitle?: string;
  desktopImage: string;
  mobileImage?: string;
  ctaLabel?: string;
  ctaUrl?: string;
};

/** Milliseconds each slide stays on screen before the carousel advances. */
const ROTATE_MS = 5000;
/** Image crossfade duration, in seconds (must match the CSS transition). */
const CROSSFADE_S = 0.9;
/** Slow "Ken Burns" zoom applied to the active photograph, in seconds. */
const KEN_BURNS_S = 7;
/** Minimum horizontal drag, in pixels, before it counts as a swipe. */
const SWIPE_THRESHOLD = 40;

/** Hosts allowed by the `images.remotePatterns` block in `next.config.ts`. */
const OPTIMIZABLE_HOSTS = ["res.cloudinary.com", "images.unsplash.com", "source.unsplash.com"];

/**
 * Local paths and allow-listed hosts go through the Next image optimizer. Any
 * other external URL is rendered as-is (`unoptimized`), so an admin can paste a
 * URL from a host we do not proxy without breaking the page.
 */
function isOptimizableImage(src: string | undefined): boolean {
  if (!src) return false;
  if (src.startsWith("/")) return true;
  try {
    return OPTIMIZABLE_HOSTS.includes(new URL(src).hostname.toLowerCase());
  } catch {
    return false;
  }
}

/**
 * Indices to keep mounted: the active slide plus its immediate neighbours. The
 * next photograph is therefore decoded before the crossfade starts, the
 * previous one stays mounted long enough to fade out, and every other image is
 * deferred so the hero does not download the whole set up front.
 */
function mountedWindow(count: number, index: number): Set<number> {
  if (count <= 0) return new Set<number>();
  if (count <= 3) return new Set(Array.from({ length: count }, (_, i) => i));
  return new Set([(index - 1 + count) % count, index, (index + 1) % count]);
}

/**
 * Tab-visibility store. Reading it through `useSyncExternalStore` keeps the
 * subscription out of an effect body (where a synchronous `setState` is a lint
 * error) and stays correct during SSR.
 */
function subscribeVisibility(onChange: () => void): () => void {
  document.addEventListener("visibilitychange", onChange);
  return () => document.removeEventListener("visibilitychange", onChange);
}
const readDocumentHidden = () => document.hidden;
const readDocumentHiddenOnServer = () => false;

/**
 * Premium, automatically rotating hero. Renders database-driven slides only —
 * an empty set falls back to the static `Hero` so the page never looks broken.
 */
export function HeroCarousel({ slides }: { slides: PublicHeroSlide[] }) {
  const slideCount = slides.length;
  const [index, setIndex] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [failed, setFailed] = useState<Record<string, boolean>>({});
  const [announcement, setAnnouncement] = useState("");
  const swipeStart = useRef<number | null>(null);

  const documentHidden = useSyncExternalStore(
    subscribeVisibility,
    readDocumentHidden,
    readDocumentHiddenOnServer,
  );

  const active = slideCount > 0 ? ((index % slideCount) + slideCount) % slideCount : 0;
  const current = slideCount > 0 ? slides[active] : undefined;
  const nextIndex = slideCount > 0 ? (active + 1) % slideCount : 0;

  // Autoplay pauses while the pointer rests on the carousel (mouse only, so a
  // tap on a touch device cannot latch it off), while focus is inside the
  // region, and whenever the tab is hidden.
  const paused = hovered || focused || documentHidden;
  const rotating = slideCount > 1 && !paused;

  const layers = useMemo(() => mountedWindow(slideCount, active), [slideCount, active]);

  const markFailed = useCallback((src: string) => {
    setFailed((previous) => (previous[src] ? previous : { ...previous, [src]: true }));
  }, []);

  const goTo = useCallback(
    (target: number) => {
      if (slideCount === 0) return;
      const normalized = ((target % slideCount) + slideCount) % slideCount;
      setIndex(normalized);
      // Only user-initiated moves are announced; autoplay stays silent so a
      // screen reader is not interrupted every few seconds.
      setAnnouncement(
        `Slide ${normalized + 1} of ${slideCount}: ${slides[normalized]?.title ?? ""}`,
      );
    },
    [slideCount, slides],
  );

  const showNext = useCallback(() => goTo(active + 1), [active, goTo]);
  const showPrevious = useCallback(() => goTo(active - 1), [active, goTo]);

  // A single timeout that is re-armed whenever the slide, the pause state or
  // the tab visibility changes: manual navigation therefore restarts the
  // countdown, and Strict Mode's double-invoked effect cannot leave a stray
  // interval behind.
  useEffect(() => {
    if (!rotating) return;
    const handle = window.setTimeout(() => {
      setIndex((value) => (value + 1) % slideCount);
    }, ROTATE_MS);
    return () => window.clearTimeout(handle);
  }, [rotating, active, slideCount]);

  if (slideCount === 0 || !current) {
    return <Hero />;
  }

  // Staggered entrance for the copy. The keyed wrapper around the copy
  // re-mounts on every slide change, which restarts these CSS animations; the
  // global reduced-motion rule collapses them so the text simply appears.
  const rise = (delayMs: number) => ({ animationDelay: `${delayMs}ms` });

  const showPrimary = Boolean(current.ctaLabel && current.ctaUrl);
  // A secondary destination is only offered when the slide's own CTA points
  // somewhere other than the menu, so it never duplicates the primary link.
  const showSecondary = showPrimary && current.ctaUrl !== "/menu";

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      showPrevious();
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      showNext();
    }
  };

  return (
    <section
      role="region"
      aria-roledescription="carousel"
      aria-label="Featured offers"
      tabIndex={0}
      data-slide-index={active}
      data-slide-count={slideCount}
      data-paused={paused}
      data-rotating={rotating}
      onKeyDown={handleKeyDown}
      onPointerEnter={(event) => {
        if (event.pointerType === "mouse") setHovered(true);
      }}
      onPointerLeave={(event) => {
        if (event.pointerType === "mouse") setHovered(false);
      }}
      onFocus={(event) => {
        // Hold rotation for keyboard users only. A mouse click on a control
        // also moves focus, but must not pause the carousel for good.
        const target = event.target;
        if (target instanceof HTMLElement && target.matches(":focus-visible")) {
          setFocused(true);
        }
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setFocused(false);
        }
      }}
      onTouchStart={(event) => {
        swipeStart.current = event.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(event) => {
        const start = swipeStart.current;
        swipeStart.current = null;
        if (start === null) return;
        const delta = (event.changedTouches[0]?.clientX ?? start) - start;
        if (Math.abs(delta) < SWIPE_THRESHOLD) return;
        if (delta > 0) showPrevious();
        else showNext();
      }}
      className="relative isolate flex min-h-[30rem] flex-col overflow-hidden bg-ink-950 text-cream-50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-flame-400/70 focus-visible:outline-none sm:min-h-[34rem] lg:min-h-[42rem] xl:min-h-[46rem]"
    >
      {/* Always-on backdrop so there is never a flash of white before the
          photographs decode. */}
      <div
        aria-hidden
        className="absolute inset-0 -z-30 bg-linear-to-br from-charcoal-900 via-ink-950 to-ink-950"
      />

      {/* Decorative warmth that drifts gently as the slides change. */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-1/4 -z-20 h-[26rem] w-[26rem] rounded-full bg-flame-500/20 blur-[110px] transition-transform duration-1000 ease-out motion-reduce:transition-none"
        style={{ left: "-6rem", transform: `translate3d(${active * 22}%, 0, 0)` }}
      />

      {/* Layered photographs — only the active layer is visible, neighbours stay
          mounted for an instant crossfade, the rest are deferred. */}
      <div className="absolute inset-0 -z-10">
        {slides.map((slide, i) => {
          if (!layers.has(i)) return null;
          const isActive = i === active;
          const desktopBroken = failed[slide.desktopImage] === true;
          const mobileSrc =
            slide.mobileImage && !failed[slide.mobileImage] ? slide.mobileImage : undefined;
          const showDesktop = Boolean(slide.desktopImage) && !desktopBroken;
          // Nothing to paint for this layer (both images failed): let the
          // gradient backdrop show through instead of a broken-image icon.
          if (!showDesktop && !mobileSrc) return null;

          return (
            <div
              key={slide.id}
              data-slide-layer={slide.id}
              data-active={isActive}
              aria-hidden={isActive ? undefined : true}
              className="absolute inset-0 transition-opacity ease-out motion-reduce:transition-none"
              style={{
                opacity: isActive ? 1 : 0,
                zIndex: isActive ? 2 : 1,
                transitionDuration: `${CROSSFADE_S}s`,
              }}
            >
              {showDesktop ? (
                <Image
                  src={slide.desktopImage}
                  alt={isActive ? slide.title : ""}
                  fill
                  sizes="100vw"
                  preload={i === 0}
                  loading={i === 0 ? undefined : i === nextIndex || isActive ? "eager" : "lazy"}
                  unoptimized={!isOptimizableImage(slide.desktopImage)}
                  onError={() => markFailed(slide.desktopImage)}
                  className={cn(
                    "object-cover object-center transition-transform ease-out motion-reduce:scale-100 motion-reduce:transition-none",
                    isActive ? "scale-105" : "scale-100",
                    mobileSrc && "hidden lg:block",
                  )}
                  style={{ transitionDuration: `${KEN_BURNS_S}s` }}
                />
              ) : null}
              {mobileSrc ? (
                <Image
                  src={mobileSrc}
                  alt={isActive ? slide.title : ""}
                  fill
                  sizes="100vw"
                  loading={isActive ? "eager" : "lazy"}
                  unoptimized={!isOptimizableImage(mobileSrc)}
                  onError={() => markFailed(mobileSrc)}
                  className="object-cover object-center lg:hidden"
                />
              ) : null}
            </div>
          );
        })}
      </div>

      {/* Contrast scrims keep the copy readable over any photograph. */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-linear-to-t from-ink-950 via-ink-950/55 to-ink-950/5"
      />
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-linear-to-r from-ink-950/90 via-ink-950/40 to-transparent"
      />

      {/* Copy */}
      <div className="relative z-10 flex flex-1 items-center">
        <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <div key={current.id} className="max-w-3xl">
            <div aria-hidden className="hero-rise mb-5 flex items-center gap-3" style={rise(0)}>
              <span className="h-px w-12 bg-linear-to-r from-flame-400 to-transparent" />
              <span className="h-1.5 w-1.5 rounded-full bg-flame-500 shadow-[0_0_14px_3px_rgba(214,58,38,0.55)]" />
            </div>

            <h1
              className="hero-rise font-display text-[2.25rem] leading-[0.95] font-black tracking-[-0.02em] text-balance text-cream-50 drop-shadow-[0_2px_28px_rgba(0,0,0,0.5)] sm:text-5xl lg:text-6xl xl:text-7xl"
              style={rise(80)}
            >
              {current.title}
            </h1>

            {current.subtitle ? (
              <p
                className="hero-rise mt-5 max-w-xl text-base leading-relaxed text-pretty text-cream-100/85 sm:text-lg"
                style={rise(160)}
              >
                {current.subtitle}
              </p>
            ) : null}

            {showPrimary ? (
              <div className="hero-rise mt-9 flex flex-wrap items-center gap-3" style={rise(240)}>
                <Button
                  href={current.ctaUrl}
                  size="lg"
                  className="group gap-2 bg-linear-to-r from-tomato-600 to-flame-500 px-7 shadow-[0_20px_45px_-20px_rgba(214,58,38,0.85)] hover:from-tomato-500 hover:to-flame-400"
                >
                  {current.ctaLabel}
                  <ArrowRight
                    aria-hidden
                    className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1"
                  />
                </Button>
                {showSecondary ? (
                  <Link
                    href="/menu"
                    className="inline-flex h-13 items-center justify-center rounded-full border border-white/25 bg-white/5 px-7 text-sm font-semibold text-cream-50 backdrop-blur-sm transition-colors duration-200 hover:border-white/40 hover:bg-white/10 sm:text-base"
                  >
                    Explore menu
                  </Link>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Controls — only rendered when there is more than one slide to move
          between. */}
      {slideCount > 1 ? (
        <div className="relative z-10 mx-auto w-full max-w-7xl px-4 pb-7 sm:px-6 sm:pb-9 lg:px-8">
          <div className="flex items-center justify-between gap-4 border-t border-white/10 pt-5">
            <div role="group" aria-label="Choose slide" className="flex items-center gap-2.5">
              {slides.map((slide, i) => (
                <button
                  key={slide.id}
                  type="button"
                  onClick={() => goTo(i)}
                  aria-label={`Show slide ${i + 1}: ${slide.title}`}
                  aria-current={i === active ? "true" : undefined}
                  className={cn(
                    "h-2.5 rounded-full transition-all duration-300 focus-visible:ring-2 focus-visible:ring-flame-400 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-950 focus-visible:outline-none",
                    i === active
                      ? "w-9 bg-linear-to-r from-tomato-500 to-flame-400"
                      : "w-2.5 bg-white/35 hover:bg-white/60",
                  )}
                />
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={showPrevious}
                aria-label="Previous slide"
                className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/10 text-cream-50 backdrop-blur-md transition-all duration-200 hover:scale-105 hover:border-white/30 hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-flame-400 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-950 focus-visible:outline-none active:scale-95"
              >
                <ChevronLeft aria-hidden className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={showNext}
                aria-label="Next slide"
                className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/10 text-cream-50 backdrop-blur-md transition-all duration-200 hover:scale-105 hover:border-white/30 hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-flame-400 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-950 focus-visible:outline-none active:scale-95"
              >
                <ChevronRight aria-hidden className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Autoplay progress line: restarts with every slide and freezes when the
          carousel is paused. Hidden under reduced motion. */}
      {slideCount > 1 ? (
        <div aria-hidden className="absolute inset-x-0 bottom-0 z-20 h-[3px] bg-white/10">
          <div
            key={active}
            className="h-full origin-left bg-linear-to-r from-tomato-500 via-flame-500 to-gold-400 motion-reduce:hidden"
            style={{
              animation: `hero-progress ${ROTATE_MS}ms linear forwards`,
              animationPlayState: paused ? "paused" : "running",
            }}
          />
        </div>
      ) : null}

      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </p>
    </section>
  );
}
