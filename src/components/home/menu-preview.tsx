"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Search } from "lucide-react";
import { Container } from "@/components/ui/container";
import { MenuRow } from "@/components/menu/menu-row";
import { cn } from "@/lib/utils";
import type { MenuCategoryDto, ProductListItemDto } from "@/lib/types/menu";

type MenuPreviewProps = {
  products: ProductListItemDto[];
  categories: MenuCategoryDto[];
};

const PREVIEW_COUNT = 8;

export function MenuPreview({ products, categories }: MenuPreviewProps) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState("all");

  const chips = useMemo(
    () => [
      { slug: "all", name: "All" },
      ...categories.map((category) => ({
        slug: category.slug,
        name: category.name,
      })),
    ],
    [categories],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((product) => {
      const matchesCategory =
        active === "all" || product.categorySlug === active;
      const matchesQuery =
        !q ||
        product.name.toLowerCase().includes(q) ||
        (product.description ?? "").toLowerCase().includes(q);
      return matchesCategory && matchesQuery;
    });
  }, [products, query, active]);

  const shown = filtered.slice(0, PREVIEW_COUNT);

  return (
    <section id="all-menu" className="scroll-mt-24 overflow-x-clip py-12 sm:py-16">
      <Container>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-flame-600">
              Order in seconds
            </p>
            <h2 className="mt-2 font-display text-2xl font-black tracking-tight text-charcoal-900 sm:text-3xl">
              Straight from the kitchen
            </h2>
          </div>
          <Link
            href="/menu"
            className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-tomato-600 transition-colors hover:text-tomato-500"
          >
            View full menu
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-sm">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal-400" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search the kitchen…"
              aria-label="Search the menu"
              className="h-11 w-full rounded-full border border-charcoal-200 bg-white pl-11 pr-4 text-sm text-charcoal-900 shadow-[var(--shadow-card)] outline-none transition-colors placeholder:text-charcoal-400 focus:border-flame-500 focus:ring-2 focus:ring-flame-500/20"
            />
          </div>

          <div className="flex snap-x gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {chips.map((chip) => {
              const isActive = chip.slug === active;
              return (
                <button
                  key={chip.slug}
                  type="button"
                  onClick={() => setActive(chip.slug)}
                  aria-pressed={isActive}
                  className={cn(
                    "shrink-0 snap-start rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors",
                    isActive
                      ? "bg-charcoal-900 text-cream-50"
                      : "bg-charcoal-900/5 text-charcoal-700 hover:bg-charcoal-900/10",
                  )}
                >
                  {chip.name}
                </button>
              );
            })}
          </div>
        </div>

        {products.length === 0 ? (
          <p className="mt-6 rounded-2xl border border-dashed border-charcoal-300 bg-cream-100/50 px-6 py-12 text-center text-sm text-charcoal-500">
            The menu is being restocked — check back soon.
          </p>
        ) : filtered.length === 0 ? (
          <p className="mt-6 rounded-2xl border border-dashed border-charcoal-300 bg-cream-100/50 px-6 py-12 text-center text-sm text-charcoal-500">
            Nothing matches “{query}”. Try another dish or category.
          </p>
        ) : (
          <>
            <div className="mt-6 grid gap-3 lg:grid-cols-2">
              {shown.map((product) => (
                <MenuRow key={product.id} product={product} />
              ))}
            </div>

            <div className="mt-6 flex items-center justify-between gap-4">
              <p className="text-sm text-charcoal-500">
                Showing {shown.length} of {filtered.length}
              </p>
              <Link
                href="/menu"
                className="inline-flex h-11 items-center gap-2 rounded-full bg-charcoal-900 px-5 text-sm font-semibold text-cream-50 transition-colors hover:bg-charcoal-800"
              >
                View full menu
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </>
        )}
      </Container>
    </section>
  );
}
