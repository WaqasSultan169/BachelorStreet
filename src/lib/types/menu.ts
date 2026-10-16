/**
 * Public menu DTOs. These are safe to import from client components — they are
 * plain types with no server-only dependencies. The server services in
 * `@/server/services/menu.service` produce these shapes.
 */

export type PublicOptionDto = {
  key: string;
  name: string;
  priceDelta: number;
  isDefault?: boolean;
};

export type PublicOptionGroupDto = {
  key: string;
  name: string;
  type: "single" | "multi";
  required: boolean;
  /** For multi-select groups: maximum selectable options. */
  max?: number;
  options: PublicOptionDto[];
};

export type PublicProductDto = {
  id: string;
  name: string;
  slug: string;
  description?: string;
  price: number;
  compareAtPrice?: number;
  images: string[];
  tags: string[];
  calories?: number;
  preparationMinutes?: number;
  isAvailable: boolean;
  isFeatured: boolean;
  popularity: number;
  optionGroups: PublicOptionGroupDto[];
};

export type MenuCategoryDto = {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  productCount: number;
};

export type MenuCategoryWithProductsDto = MenuCategoryDto & {
  products: PublicProductDto[];
};

export type ProductListItemDto = PublicProductDto & {
  categoryId: string;
  categoryName: string;
  categorySlug: string;
};

export type ProductListResult = {
  items: ProductListItemDto[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type MenuSortKey =
  | "popular"
  | "price-asc"
  | "price-desc"
  | "name"
  | "newest";

export const MENU_SORT_OPTIONS: { value: MenuSortKey; label: string }[] = [
  { value: "popular", label: "Most popular" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "name", label: "Name (A–Z)" },
  { value: "newest", label: "Newest" },
];

export type StorefrontData = {
  categories: MenuCategoryDto[];
  featured: PublicProductDto[];
  bestsellers: PublicProductDto[];
  deals: PublicProductDto[];
  heroPicks: PublicProductDto[];
};
