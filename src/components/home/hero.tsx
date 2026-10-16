"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { ArrowRight, MapPin } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { ProductImage } from "@/components/ui/product-image";
import { FOOD_IMAGE } from "@/lib/food-images";
import { APP } from "@/lib/constants";

/**
 * Dramatic, food-first hero. The dish owns the composition; copy is kept to a
 * headline, one line and two actions. The two floating chips carry the social
 * proof that a generic stats row would otherwise repeat.
 */
export function Hero() {
  const reduce = useReducedMotion();
  const rise = (delay: number) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 24 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.6, ease: "easeOut" as const, delay },
        };

  return (
    <section className="relative isolate overflow-hidden bg-ink-950 text-cream-50">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_82%_22%,rgba(249,115,22,0.32),transparent_48%),radial-gradient(circle_at_4%_92%,rgba(194,42,27,0.28),transparent_44%)]"
      />

      <Container className="relative grid items-center gap-8 py-10 sm:py-14 lg:min-h-136 lg:grid-cols-[0.92fr_1.08fr] lg:gap-8 lg:py-0">
        <div className="order-2 lg:order-1">
          <motion.span
            {...rise(0)}
            className="inline-flex items-center gap-2 rounded-full border border-flame-400/30 bg-flame-500/10 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.24em] text-flame-300"
          >
            Fresh · hot · delicious
          </motion.span>

          <motion.h1
            {...rise(0.08)}
            className="mt-4 font-display text-[2.9rem] font-black uppercase leading-[0.9] tracking-[-0.035em] text-cream-50 sm:text-6xl lg:text-[4.6rem]"
          >
            Big flavour.
            <span className="block text-gold-400">No boring bites.</span>
          </motion.h1>

          <motion.p
            {...rise(0.16)}
            className="mt-5 max-w-md text-base leading-relaxed text-cream-100/75 sm:text-lg"
          >
            Your cravings. Your favourites. Delivered fresh.
          </motion.p>

          <motion.div
            {...rise(0.24)}
            className="mt-8 flex flex-wrap items-center gap-3"
          >
            <Button
              href="/menu"
              size="lg"
              className="bg-linear-to-r from-tomato-600 to-flame-500 px-7 shadow-(--shadow-glow) hover:from-tomato-500 hover:to-flame-400"
            >
              Order now
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Link
              href="/menu"
              className="inline-flex h-12 items-center justify-center rounded-full border border-white/20 bg-white/5 px-7 text-sm font-semibold text-cream-50 transition-colors hover:bg-white/10 sm:text-base"
            >
              Explore menu
            </Link>
          </motion.div>
          <Link
            href={APP.mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-cream-100/65 transition-colors hover:text-cream-50"
          >
            <MapPin className="h-4 w-4 text-tomato-400" aria-hidden />
            H-13, Islamabad
            <span className="text-cream-100/35">·</span>
            Get directions
          </Link>
        </div>

        <motion.div
          initial={reduce ? false : { opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, ease: "easeOut", delay: 0.08 }}
          className="relative order-1 mx-auto w-full max-w-xl overflow-hidden lg:order-2 lg:max-w-none lg:self-stretch"
        >
          <div
            aria-hidden
            className="absolute inset-0 -z-10 rounded-[3rem] bg-flame-500/20 blur-3xl"
          />
          <div className="relative aspect-5/4 w-full overflow-hidden rounded-4xl ring-1 ring-white/10 sm:aspect-16/11 lg:aspect-auto lg:h-full lg:min-h-136">
            <ProductImage
              src={FOOD_IMAGE.heroBurger}
              alt="A stacked Bachelor's Street burger with melted cheese"
              priority
              sizes="(max-width: 1024px) 100vw, 55vw"
              className="object-cover"
            />
            <div
              aria-hidden
              className="absolute inset-0 bg-linear-to-t from-ink-950/70 via-ink-950/5 to-transparent"
            />

            <div className="absolute bottom-4 left-4 rounded-full bg-ink-950/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-cream-50 ring-1 ring-white/15 backdrop-blur-md sm:bottom-5 sm:left-5">
              Burgers · chicken · more
            </div>
          </div>
        </motion.div>
      </Container>
    </section>
  );
}
