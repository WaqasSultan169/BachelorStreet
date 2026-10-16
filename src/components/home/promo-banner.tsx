import Link from "next/link";
import Image from "next/image";
import { Bike, Ticket, Timer } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/motion/reveal";
import { listActivePromotionBanners } from "@/server/services/promotion.service";

/**
 * Promotional strip. The copy is illustrative demo content (clearly labelled)
 * and the CTA points at the real, live menu.
 */
export async function PromoBanner() {
  const promotions = await listActivePromotionBanners();
  if (promotions.length > 0) {
    return (
      <section className="py-6">
        <Container className="grid gap-4">
          {promotions.map((promotion) => (
            <Reveal key={`${promotion.title}-${promotion.code ?? ""}`}>
              <div className="relative overflow-hidden rounded-3xl bg-charcoal-950 px-8 py-10 text-cream-100 sm:px-12">
                {promotion.imageUrl ? (
                  <Image src={promotion.imageUrl} alt="" fill unoptimized className="object-cover opacity-25" />
                ) : null}
                <div className="relative">
                  <Badge variant="gold" className="mb-4">
                    <Ticket className="h-3.5 w-3.5" />
                    {promotion.discountPercent ? `${promotion.discountPercent}% off` : "Promotion"}
                  </Badge>
                  <h2 className="font-display text-3xl font-semibold text-cream-50 sm:text-4xl">{promotion.title}</h2>
                  {promotion.description ? <p className="mt-3 max-w-xl text-sm leading-relaxed text-cream-100/75">{promotion.description}</p> : null}
                  {promotion.code ? <p className="mt-3 text-sm font-semibold">Use code {promotion.code} at checkout.</p> : null}
                  <Button href="/menu" size="lg" className="mt-6">Order now</Button>
                </div>
              </div>
            </Reveal>
          ))}
        </Container>
      </section>
    );
  }
  return (
    <section className="py-6">
      <Container>
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl bg-charcoal-950 px-8 py-10 text-cream-100 sm:px-12">
            <div
              aria-hidden
              className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-tomato-600/30 blur-3xl"
            />
            <div className="relative flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-center">
              <div>
                <Badge variant="gold" className="mb-4">
                  <Ticket className="h-3.5 w-3.5" />
                  Demo offer
                </Badge>
                <h2 className="font-display text-3xl font-semibold text-cream-50 sm:text-4xl">
                  Free delivery over Rs 1,500
                </h2>
                <p className="mt-3 max-w-xl text-sm leading-relaxed text-cream-100/75">
                  Order within your delivery zone and we&apos;ll waive the fee once
                  your subtotal crosses the threshold. Offer shown for
                  demonstration only.
                </p>
                <div className="mt-6 flex flex-wrap gap-6 text-sm text-cream-100/80">
                  <span className="inline-flex items-center gap-2">
                    <Bike className="h-4 w-4 text-gold-400" />
                    Delivery &amp; pickup
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <Timer className="h-4 w-4 text-gold-400" />
                    15–25 min average
                  </span>
                </div>
              </div>
              <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
                <Button href="/menu" size="lg">
                  Order now
                </Button>
                <Link
                  href="/contact"
                  className="inline-flex h-13 items-center justify-center rounded-full border border-cream-100/30 px-8 text-base font-semibold text-cream-50 transition-colors hover:bg-white/10"
                >
                  Find a branch
                </Link>
              </div>
            </div>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
