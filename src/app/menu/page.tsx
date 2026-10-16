import type { Metadata } from "next";
import { Container, SectionHeading } from "@/components/ui/container";
import { MenuBrowser } from "@/components/menu/menu-browser";
import { getCategories, listProducts } from "@/server/services/menu.service";
import { MENU_SORT_OPTIONS, type MenuSortKey } from "@/lib/types/menu";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Menu | Bachelor's Street",
  description:
    "Browse the Bachelor's Street menu - burgers, crispy chicken, fries, pizza, drinks and desserts. Prices in PKR.",
  alternates: { canonical: "/menu" },
};

const SORT_KEYS = new Set<string>(MENU_SORT_OPTIONS.map((option) => option.value));

function parseSort(value: string | undefined): MenuSortKey {
  return value && SORT_KEYS.has(value) ? (value as MenuSortKey) : "popular";
}

type MenuSearchParams = {
  q?: string;
  category?: string;
  sort?: string;
  available?: string;
  page?: string;
};

export default async function MenuPage({
  searchParams,
}: {
  searchParams: Promise<MenuSearchParams>;
}) {
  const params = await searchParams;
  const page = Number.parseInt(params.page ?? "1", 10);
  const filters = {
    q: params.q ?? "",
    category: params.category ?? "",
    sort: parseSort(params.sort),
    available: params.available === "true",
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };

  const [categories, result] = await Promise.all([
    getCategories(),
    listProducts({
      q: filters.q,
      categorySlug: filters.category || undefined,
      sort: filters.sort,
      availableOnly: filters.available,
      page: filters.page,
      pageSize: 12,
    }),
  ]);

  return (
    <div className="pb-24 pt-12">
      <Container>
        <SectionHeading
          align="left"
          eyebrow="Order online"
          title="Our menu"
          lead="Prices are in Pakistani Rupees. Use the filters to find your next favourite."
        />
        <MenuBrowser
          initialData={result}
          categories={categories}
          initialFilters={filters}
        />
      </Container>
    </div>
  );
}
