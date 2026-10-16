import { Container, SectionHeading } from "@/components/ui/container";
import { ProductCard } from "@/components/menu/product-card";
import { Reveal } from "@/components/motion/reveal";
import type { PublicProductDto } from "@/lib/types/menu";

type ProductRailProps = {
  id?: string;
  eyebrow?: string;
  title: string;
  lead?: string;
  products: PublicProductDto[];
  columns?: 3 | 4;
  emptyMessage?: string;
};

export function ProductRail({
  id,
  eyebrow,
  title,
  lead,
  products,
  columns = 3,
  emptyMessage = "No items to show yet.",
}: ProductRailProps) {
  return (
    <section id={id} className="scroll-mt-24 py-12 sm:py-16">
      <Container>
        <SectionHeading eyebrow={eyebrow} title={title} lead={lead} align="left" />
        {products.length === 0 ? (
          <p className="max-w-md rounded-2xl border border-dashed border-charcoal-300 bg-cream-100/50 px-6 py-10 text-center text-sm text-charcoal-500">
            {emptyMessage}
          </p>
        ) : (
          <div
            className={
              columns === 3
                ? "grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
                : "grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            }
          >
            {products.map((product, index) => (
              <Reveal key={product.id} delay={index * 0.04}>
                <ProductCard product={product} />
              </Reveal>
            ))}
          </div>
        )}
      </Container>
    </section>
  );
}
