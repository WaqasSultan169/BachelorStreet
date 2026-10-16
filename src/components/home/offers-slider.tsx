"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowRight, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Badge } from "@/components/ui/badge";
import { ProductImage } from "@/components/ui/product-image";
import { cn } from "@/lib/utils";

export type OfferSlide = {
  id: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  href: string;
  ctaLabel: string;
  badge?: string;
  image?: string;
};

const TONES = [
  "from-charcoal-950 via-charcoal-900 to-tomato-900",
  "from-tomato-700 via-tomato-600 to-gold-500",
  "from-charcoal-900 via-charcoal-950 to-emerald-900",
  "from-gold-600 via-tomato-600 to-charcoal-950",
];

const AUTOPLAY_MS = 6000;

export function OffersSlider({ slides }: { slides: OfferSlide[] }) {
  const reduceMotion = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const count = slides.length;

  const go = useCallback(
    (delta: number) => {
      setIndex((current) => (current + delta + count) % count);
    },
    [count],
  );

  useEffect(() => {
    if (paused || reduceMotion || count <= 1) return;
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % count);
    }, AUTOPLAY_MS);
    return () => window.clearInterval(timer);
  }, [paused, reduceMotion, count]);

  if (count === 0) return null;

  const slide = slides[index];

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Offers and highlights"
      className="relative pt-6 sm:pt-8"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <Container>
        <div
          className={cn(
            "relative overflow-hidden rounded-3xl bg-linear-to-br text-cream-50 shadow-[var(--shadow-lift)]",
            TONES[index % TONES.length],
          )}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/10 blur-3xl"
          />

          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={slide.id}
              initial={reduceMotion ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? undefined : { opacity: 0, y: -16 }}
              transition={{ duration: 0.45, ease: "easeOut" }}
              className="grid items-center gap-8 p-7 sm:p-10 lg:grid-cols-[1.15fr_1fr] lg:gap-12 lg:p-12"
            >
              <div className="relative z-10">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="gold">
                    <Sparkles className="h-3.5 w-3.5" />
                    {slide.eyebrow}
                  </Badge>
                  {slide.badge ? (
                    <Badge variant="tomato" className="bg-white/15 text-cream-50">
                      {slide.badge}
                    </Badge>
                  ) : null}
                </div>
                <h1 className="mt-5 font-display text-3xl font-semibold leading-[1.08] tracking-tight text-cream-50 sm:text-4xl lg:text-5xl">
                  {slide.title}
                </h1>
                <p className="mt-5 max-w-xl text-base leading-relaxed text-cream-100/80 sm:text-lg">
                  {slide.subtitle}
                </p>
                <div className="mt-8 flex flex-wrap items-center gap-3">
                  <Link
                    href={slide.href}
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-cream-50 px-7 text-base font-semibold text-charcoal-950 transition-colors hover:bg-white"
                  >
                    {slide.ctaLabel}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    href="/menu"
                    className="inline-flex h-12 items-center justify-center rounded-full border border-cream-100/30 px-7 text-base font-semibold text-cream-50 transition-colors hover:bg-white/10"
                  >
                    View full menu
                  </Link>
                </div>
              </div>

              <div className="relative mx-auto aspect-4/3 w-full max-w-md overflow-hidden rounded-2xl shadow-lg ring-1 ring-white/15 lg:aspect-square">
                <ProductImage
                  src={slide.image}
                  alt={slide.title}
                  priority
                  sizes="(max-width: 1024px) 100vw, 40vw"
                />
              </div>
            </motion.div>
          </AnimatePresence>

          {count > 1 ? (
            <>
              <div className="pointer-events-none absolute inset-y-0 left-0 hidden items-center px-3 sm:flex">
                <button
                  type="button"
                  onClick={() => go(-1)}
                  aria-label="Previous offer"
                  className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full bg-charcoal-950/40 text-cream-50 backdrop-blur transition-colors hover:bg-charcoal-950/70"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
              </div>
              <div className="pointer-events-none absolute inset-y-0 right-0 hidden items-center px-3 sm:flex">
                <button
                  type="button"
                  onClick={() => go(1)}
                  aria-label="Next offer"
                  className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full bg-charcoal-950/40 text-cream-50 backdrop-blur transition-colors hover:bg-charcoal-950/70"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>

              <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 sm:bottom-5">
                {slides.map((item, dotIndex) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setIndex(dotIndex)}
                    aria-label={`Go to slide ${dotIndex + 1}`}
                    aria-current={dotIndex === index}
                    className={cn(
                      "h-2 rounded-full transition-all",
                      dotIndex === index
                        ? "w-6 bg-cream-50"
                        : "w-2 bg-cream-50/40 hover:bg-cream-50/70",
                    )}
                  />
                ))}
              </div>
            </>
          ) : null}
        </div>
      </Container>
    </section>
  );
}
