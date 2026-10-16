import Link from "next/link";
import { ArrowRight, UtensilsCrossed } from "lucide-react";
import { Container, SectionHeading } from "@/components/ui/container";
import { Reveal } from "@/components/motion/reveal";
import type { MenuCategoryDto } from "@/lib/types/menu";

export function CategoryGrid({ categories }: { categories: MenuCategoryDto[] }) {
  return (
    <section className="py-20">
      <Container>
        <SectionHeading
          eyebrow="Browse by category"
          title="Something for every craving"
          lead="Grouped with honest pricing, all available for delivery or pickup."
        />
        {categories.length === 0 ? (
          <p className="mx-auto max-w-md rounded-2xl border border-dashed border-charcoal-300 bg-cream-100/50 px-6 py-10 text-center text-sm text-charcoal-500">
            Categories appear here once the catalog is seeded.
          </p>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((category, index) => (
              <Reveal key={category.id} delay={index * 0.04}>
                <Link
                  href={{ pathname: "/menu", query: { category: category.slug } }}
                  className="group flex h-full flex-col gap-3 rounded-2xl border border-charcoal-200/70 bg-white p-6 shadow-[var(--shadow-card)] transition-all hover:-translate-y-1 hover:shadow-[var(--shadow-lift)]"
                >
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-tomato-100 text-tomato-600 transition-colors group-hover:bg-tomato-600 group-hover:text-white">
                    <UtensilsCrossed className="h-6 w-6" />
                  </span>
                  <span className="font-display text-lg font-semibold text-charcoal-900">
                    {category.name}
                  </span>
                  {category.description ? (
                    <span className="text-sm text-charcoal-500">
                      {category.description}
                    </span>
                  ) : null}
                  <span className="mt-auto inline-flex items-center gap-1 pt-3 text-sm font-semibold text-tomato-600">
                    {category.productCount}{" "}
                    {category.productCount === 1 ? "item" : "items"}
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </span>
                </Link>
              </Reveal>
            ))}
          </div>
        )}
      </Container>
    </section>
  );
}
