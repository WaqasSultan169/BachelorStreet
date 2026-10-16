import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Container } from "@/components/ui/container";
import { ProductImage } from "@/components/ui/product-image";
import { Reveal } from "@/components/motion/reveal";
import { categoryImage } from "@/lib/food-images";
import type { MenuCategoryDto } from "@/lib/types/menu";

type Tile = {
  key: string;
  name: string;
  href: React.ComponentProps<typeof Link>["href"];
  image: string;
  count: number;
  isDeal?: boolean;
};

/**
 * Horizontally scrollable, image-led category rail. Categories come from
 * MongoDB; a "Deals" tile always closes the row and points at the offers.
 */
export function CategoryRail({ categories }: { categories: MenuCategoryDto[] }) {
  const tiles: Tile[] = [
    ...categories.map((category) => ({
      key: category.id,
      name: category.name,
      href: { pathname: "/menu", query: { category: category.slug } },
      image: category.image ?? categoryImage(category.name, category.slug),
      count: category.productCount,
    })),
    {
      key: "deals",
      name: "Deals",
      href: "/#deals",
      image: categoryImage("Deals", "deals"),
      count: 0,
      isDeal: true,
    },
  ];

  return (
    <section id="menu" className="scroll-mt-24 overflow-x-clip py-12 sm:py-14">
      <Container>
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-flame-600">
              Order by craving
            </p>
            <h2 className="mt-2 font-display text-2xl font-black tracking-tight text-charcoal-900 sm:text-3xl">
              What are you hungry for?
            </h2>
          </div>
          <Link
            href="/menu"
            className="hidden shrink-0 items-center gap-1 text-sm font-semibold text-tomato-600 transition-colors hover:text-tomato-500 sm:inline-flex"
          >
            Full menu
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-6 flex snap-x snap-mandatory gap-3.5 overflow-x-auto pb-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {tiles.map((tile, index) => (
            <Reveal key={tile.key} delay={index * 0.03} className="snap-start">
              <Link
                href={tile.href}
                className="group relative block h-44 w-36 shrink-0 overflow-hidden rounded-2xl ring-1 ring-charcoal-900/10 transition-shadow hover:ring-flame-500/40 hover:shadow-[var(--shadow-lift)] sm:h-52 sm:w-44"
              >
                <ProductImage
                  src={tile.image}
                  alt={tile.name}
                  sizes="180px"
                  className="transition-transform duration-500 motion-safe:group-hover:scale-110"
                />
                <div
                  aria-hidden
                  className="absolute inset-0 bg-linear-to-t from-ink-950/90 via-ink-950/25 to-transparent"
                />
                {tile.isDeal ? (
                  <span className="absolute right-3 top-3 rounded-full bg-flame-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                    Offers
                  </span>
                ) : null}
                <div className="absolute inset-x-0 bottom-0 p-3.5">
                  <span className="font-display text-base font-bold text-cream-50">
                    {tile.name}
                  </span>
                  {tile.count > 0 ? (
                    <span className="mt-0.5 block text-[11px] text-cream-100/70">
                      {tile.count} {tile.count === 1 ? "item" : "items"}
                    </span>
                  ) : null}
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
