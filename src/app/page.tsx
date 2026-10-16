import type { Metadata } from "next";
import { Info } from "lucide-react";
import { Container } from "@/components/ui/container";
import { HeroCarousel, type PublicHeroSlide } from "@/components/home/hero-carousel";
import { CategoryRail } from "@/components/home/category-rail";
import { ProductRail } from "@/components/home/product-rail";
import { DealsSection } from "@/components/home/deals-section";
import { MenuPreview } from "@/components/home/menu-preview";
import { getStorefront, listProducts } from "@/server/services/menu.service";
import { getActiveHeroSlides } from "@/server/services/heroSlide.service";
import type { ProductListItemDto, StorefrontData } from "@/lib/types/menu";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Bachelor's Street | Fast Food & Online Ordering",
  description:
    "Explore burgers, crispy chicken, fries, pizza and meal deals at Bachelor's Street in H-13, Islamabad. Choose pickup or delivery and order your favourites.",
  alternates: { canonical: "/" },
};

const EMPTY_STOREFRONT: StorefrontData = {
  categories: [],
  featured: [],
  bestsellers: [],
  deals: [],
  heroPicks: [],
};

function CatalogNotice() {
  return (
    <Container className="pt-6">
      <div className="flex items-start gap-3 rounded-2xl border border-gold-400/40 bg-gold-400/10 px-5 py-4 text-sm text-charcoal-700">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-gold-600" />
        <p>
          The live catalog isn&apos;t available right now, so the menu sections
          below may be empty. Set <code className="font-mono">MONGODB_URI</code>{" "}
          and run <code className="font-mono">npm run seed</code> to load the demo
          menu.
        </p>
      </div>
    </Container>
  );
}

export default async function HomePage() {
  let storefront = EMPTY_STOREFRONT;
  let previewProducts: ProductListItemDto[] = [];
  let catalogError = false;
  let heroSlides: PublicHeroSlide[] = [];

  try {
    const [data, menu, slides] = await Promise.all([
      getStorefront(),
      listProducts({ pageSize: 60, sort: "popular", availableOnly: true }),
      getActiveHeroSlides(),
    ]);
    storefront = data;
    previewProducts = menu.items;
    heroSlides = slides;
  } catch {
    catalogError = true;
    try {
      heroSlides = await getActiveHeroSlides();
    } catch {
      heroSlides = [];
    }
  }

  return (
    <>
      <HeroCarousel slides={heroSlides} />

      {catalogError ? <CatalogNotice /> : null}

      <CategoryRail categories={storefront.categories} />

      <ProductRail
        id="bestsellers"
        eyebrow="Most loved"
        title="Bestsellers"
        lead="The dishes our regulars keep coming back for."
        products={storefront.bestsellers}
        emptyMessage="Bestsellers will appear here once the catalog is seeded."
      />

      <DealsSection products={storefront.deals} />

      <MenuPreview
        products={previewProducts}
        categories={storefront.categories}
      />
    </>
  );
}
