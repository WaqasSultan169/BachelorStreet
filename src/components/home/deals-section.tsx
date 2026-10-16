import Link from "next/link";
import { ArrowRight, BadgePercent } from "lucide-react";
import { Container } from "@/components/ui/container";
import { ProductImage } from "@/components/ui/product-image";
import { Price } from "@/components/ui/price";
import { Reveal } from "@/components/motion/reveal";
import { resolveFoodImage } from "@/lib/food-images";
import type { PublicProductDto } from "@/lib/types/menu";

function savePercent(product: PublicProductDto): number | undefined {
  if (
    product.compareAtPrice &&
    product.compareAtPrice > product.price &&
    product.price > 0
  ) {
    return Math.round((1 - product.price / product.compareAtPrice) * 100);
  }
  return undefined;
}

/**
 * Dark deals band. Deliberately a horizontal rail of wide cards so it reads
 * differently from the vertical product grid above it.
 */
export function DealsSection({ products }: { products: PublicProductDto[] }) {
  return (
    <section
      id="deals"
      className="scroll-mt-24 overflow-x-clip bg-ink-950 py-12 text-cream-100 sm:py-16"
    >
      <Container>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.24em] text-flame-400">
              <BadgePercent className="h-4 w-4" />
              Deals that sell
            </p>
            <h2 className="mt-2 font-display text-3xl font-black tracking-tight text-cream-50 sm:text-4xl">
              Bigger bites, smaller bills
            </h2>
          </div>
          <Link
            href="/menu"
            className="hidden shrink-0 items-center gap-1 text-sm font-semibold text-flame-400 transition-colors hover:text-flame-300 sm:inline-flex"
          >
            View the menu
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {products.length === 0 ? (
          <div className="mt-7 rounded-2xl border border-dashed border-white/15 bg-white/5 px-6 py-12 text-center">
            <p className="font-display text-xl font-bold text-cream-50">
              No live deals right now
            </p>
            <p className="mx-auto mt-2 max-w-md text-sm text-cream-100/60">
              Check the full menu for today&apos;s prices.
            </p>
            <Link
              href="/menu"
              className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-flame-400 hover:text-flame-300"
            >
              Browse the menu
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <div className="mt-7 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {products.map((product, index) => {
              const percent = savePercent(product);
              return (
                <Reveal
                  key={product.id}
                  delay={index * 0.04}
                  className="snap-start"
                >
                  <article className="group flex h-full w-[16.5rem] flex-col overflow-hidden rounded-2xl bg-white/5 ring-1 ring-white/10 transition-colors hover:bg-white/[0.08] sm:w-[19rem]">
                    <div className="relative aspect-[16/10] w-full overflow-hidden">
                      <ProductImage
                        src={resolveFoodImage({
                          slug: product.slug,
                          name: product.name,
                          images: product.images,
                        })}
                        alt={product.name}
                        sizes="(max-width: 640px) 80vw, 320px"
                        className="transition-transform duration-500 motion-safe:group-hover:scale-105"
                      />
                      {percent ? (
                        <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-flame-500 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white shadow-[var(--shadow-glow)]">
                          <BadgePercent className="h-3.5 w-3.5" />
                          Save {percent}%
                        </span>
                      ) : null}
                    </div>

                    <div className="flex flex-1 flex-col p-4">
                      <h3 className="font-display text-lg font-bold text-cream-50">
                        {product.name}
                      </h3>
                      {product.description ? (
                        <p className="mt-1 line-clamp-2 text-sm text-cream-100/60">
                          {product.description}
                        </p>
                      ) : null}

                      <div className="mt-auto flex items-center justify-between gap-3 pt-4">
                        <Price
                          amount={product.price}
                          compareAtPrice={product.compareAtPrice}
                          tone="light"
                        />
                        <Link
                          href={{ pathname: "/menu", query: { q: product.name } }}
                          className="inline-flex h-9 items-center gap-1.5 rounded-full bg-linear-to-r from-tomato-600 to-flame-500 px-3.5 text-sm font-semibold text-white transition-colors hover:from-tomato-500 hover:to-flame-400"
                        >
                          Order
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    </div>
                  </article>
                </Reveal>
              );
            })}
          </div>
        )}

        <p className="mt-5 text-xs text-cream-100/40">
          Sample offers built from the live menu — real catalogue prices, never
          invented discounts.
        </p>
      </Container>
    </section>
  );
}
