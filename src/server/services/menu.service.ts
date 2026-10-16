import "server-only";
import { connectDb } from "@/server/db";
import { getCategoryModel, getProductModel } from "@/server/db/models";
import type {
  MenuCategoryDto,
  MenuCategoryWithProductsDto,
  MenuSortKey,
  ProductListItemDto,
  ProductListResult,
  PublicOptionGroupDto,
  PublicProductDto,
  StorefrontData,
} from "@/lib/types/menu";

type SortSpec = Record<string, 1 | -1>;

const SORT_MAP: Record<MenuSortKey, SortSpec> = {
  popular: { popularity: -1, name: 1 },
  "price-asc": { price: 1, name: 1 },
  "price-desc": { price: -1, name: 1 },
  name: { name: 1 },
  newest: { createdAt: -1, name: 1 },
};

type LeanProduct = {
  _id: { toString(): string };
  name: string;
  slug: string;
  description?: string | null;
  price: number;
  compareAtPrice?: number | null;
  category: { toString(): string };
  images?: string[] | null;
  tags?: string[] | null;
  optionGroups?: {
    key: string;
    name: string;
    type: "single" | "multi";
    required: boolean;
    max?: number | null;
    options?: {
      key: string;
      name: string;
      priceDelta: number;
      isDefault?: boolean | null;
    }[];
  }[];
  calories?: number | null;
  preparationMinutes?: number | null;
  isAvailable: boolean;
  isFeatured?: boolean | null;
  popularity?: number | null;
};

type LeanCategory = {
  _id: { toString(): string };
  name: string;
  slug: string;
  description?: string | null;
  image?: string | null;
};

function toOptionGroups(doc: LeanProduct): PublicOptionGroupDto[] {
  return (doc.optionGroups ?? []).map((group) => ({
    key: group.key,
    name: group.name,
    type: group.type,
    required: group.required,
    max: group.max ?? undefined,
    options: (group.options ?? []).map((option) => ({
      key: option.key,
      name: option.name,
      priceDelta: option.priceDelta,
      isDefault: option.isDefault ?? undefined,
    })),
  }));
}

function toProductDto(doc: LeanProduct): PublicProductDto {
  return {
    id: doc._id.toString(),
    name: doc.name,
    slug: doc.slug,
    description: doc.description ?? undefined,
    price: doc.price,
    compareAtPrice: doc.compareAtPrice ?? undefined,
    images: doc.images ?? [],
    tags: doc.tags ?? [],
    optionGroups: toOptionGroups(doc),
    calories: doc.calories ?? undefined,
    preparationMinutes: doc.preparationMinutes ?? undefined,
    isAvailable: doc.isAvailable,
    isFeatured: doc.isFeatured ?? false,
    popularity: doc.popularity ?? 0,
  };
}

function toListItem(
  doc: LeanProduct,
  category: { name: string; slug: string } | undefined,
): ProductListItemDto {
  return {
    ...toProductDto(doc),
    categoryId: doc.category.toString(),
    categoryName: category?.name ?? "Menu",
    categorySlug: category?.slug ?? "menu",
  };
}

/** Active categories with a count of currently available, active products. */
export async function getCategories(): Promise<MenuCategoryDto[]> {
  await connectDb();
  const Category = getCategoryModel();
  const Product = getProductModel();

  const [categories, counts] = await Promise.all([
    Category.find({ isActive: true }).sort({ sortOrder: 1, name: 1 }).lean<LeanCategory[]>(),
    Product.aggregate<{ _id: string; count: number }>([
      { $match: { isActive: true, isAvailable: true } },
      { $group: { _id: "$category", count: { $sum: 1 } } },
    ]),
  ]);

  // `$group` returns the raw ObjectId, so stringify both sides of the lookup.
  const countByCategory = new Map(
    counts.map((entry) => [String(entry._id), entry.count]),
  );

  return categories.map((category) => ({
    id: category._id.toString(),
    name: category.name,
    slug: category.slug,
    description: category.description ?? undefined,
    image: category.image ?? undefined,
    productCount: countByCategory.get(category._id.toString()) ?? 0,
  }));
}

export type ListProductsParams = {
  q?: string;
  categorySlug?: string;
  sort?: MenuSortKey;
  page?: number;
  pageSize?: number;
  availableOnly?: boolean;
};

/** Filtered, sorted, paginated product list for the menu page and API. */
export async function listProducts(
  params: ListProductsParams = {},
): Promise<ProductListResult> {
  await connectDb();
  const Category = getCategoryModel();
  const Product = getProductModel();

  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(60, Math.max(1, params.pageSize ?? 12));
  const sort = SORT_MAP[params.sort ?? "popular"] ?? SORT_MAP.popular;

  const filter: Record<string, unknown> = { isActive: true };
  if (params.availableOnly) filter.isAvailable = true;

  if (params.q && params.q.trim()) {
    const safe = params.q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const rx = new RegExp(safe, "i");
    filter.$or = [{ name: rx }, { description: rx }, { tags: rx }];
  }

  if (params.categorySlug) {
    const category = await Category.findOne({
      slug: params.categorySlug,
      isActive: true,
    })
      .select("_id")
      .lean<{ _id: { toString(): string } } | null>();
    filter.category = category ? category._id : { $in: [] };
  }

  const [docs, total] = await Promise.all([
    Product.find(filter)
      .sort(sort)
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean<LeanProduct[]>(),
    Product.countDocuments(filter),
  ]);

  const categoryIds = [...new Set(docs.map((doc) => doc.category.toString()))];
  const relatedCategories = await Category.find({ _id: { $in: categoryIds } })
    .select("name slug")
    .lean<LeanCategory[]>();
  const categoryMap = new Map(
    relatedCategories.map((category) => [
      category._id.toString(),
      { name: category.name, slug: category.slug },
    ]),
  );

  return {
    items: docs.map((doc) =>
      toListItem(doc, categoryMap.get(doc.category.toString())),
    ),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

async function findProducts(
  filter: Record<string, unknown>,
  sort: SortSpec,
  limit: number,
): Promise<PublicProductDto[]> {
  const Product = getProductModel();
  const docs = await Product.find(filter)
    .sort(sort)
    .limit(limit)
    .lean<LeanProduct[]>();
  return docs.map(toProductDto);
}

/** Everything the home page needs, in one round-trip. */
export async function getStorefront(): Promise<StorefrontData> {
  await connectDb();
  const base = { isActive: true };

  const [categories, featured, bestsellers, deals, heroPicks] = await Promise.all([
    getCategories(),
    findProducts({ ...base, isFeatured: true }, { popularity: -1, name: 1 }, 6),
    findProducts(
      { ...base, tags: "bestseller" },
      { popularity: -1, name: 1 },
      6,
    ),
    findProducts(
      { ...base, $expr: { $gt: ["$compareAtPrice", "$price"] } },
      { popularity: -1 },
      6,
    ),
    findProducts(base, { popularity: -1, name: 1 }, 3),
  ]);

  return { categories, featured, bestsellers, deals, heroPicks };
}

/** The full published menu: active categories → products (incl. sold out). */
export async function getMenu(): Promise<MenuCategoryWithProductsDto[]> {
  await connectDb();
  const Category = getCategoryModel();
  const Product = getProductModel();

  const [categories, products] = await Promise.all([
    Category.find({ isActive: true }).sort({ sortOrder: 1, name: 1 }).lean<LeanCategory[]>(),
    Product.find({ isActive: true })
      .sort({ popularity: -1, name: 1 })
      .lean<LeanProduct[]>(),
  ]);

  return categories.map((category) => {
    const categoryProducts = products
      .filter((product) => product.category.toString() === category._id.toString())
      .map(toProductDto);
    return {
      id: category._id.toString(),
      name: category.name,
      slug: category.slug,
      description: category.description ?? undefined,
      image: category.image ?? undefined,
      productCount: categoryProducts.length,
      products: categoryProducts,
    };
  });
}

export async function getProductBySlug(
  slug: string,
): Promise<PublicProductDto | null> {
  await connectDb();
  const Product = getProductModel();
  const product = await Product.findOne({ slug, isActive: true }).lean<LeanProduct | null>();
  return product ? toProductDto(product) : null;
}
