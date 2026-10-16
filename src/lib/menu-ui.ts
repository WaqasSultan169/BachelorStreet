import type { BadgeVariant } from "@/components/ui/badge";
import type { PublicProductDto } from "@/lib/types/menu";

export const TAG_BADGES: Record<string, { label: string; variant: BadgeVariant }> = {
  bestseller: { label: "Bestseller", variant: "tomato" },
  new: { label: "New", variant: "gold" },
  deal: { label: "Deal", variant: "success" },
  combo: { label: "Combo", variant: "gold" },
  spicy: { label: "Spicy", variant: "neutral" },
  vegetarian: { label: "Veg", variant: "success" },
};

export type ProductBadge = { label: string; variant: BadgeVariant };

export function productBadges(product: PublicProductDto): ProductBadge[] {
  const badges: ProductBadge[] = [];
  if (
    product.compareAtPrice != null &&
    product.compareAtPrice > product.price
  ) {
    const percent = Math.round(
      ((product.compareAtPrice - product.price) / product.compareAtPrice) * 100,
    );
    badges.push({ label: `${percent}% off`, variant: "tomato" });
  }
  for (const tag of product.tags) {
    const mapped = TAG_BADGES[tag];
    if (mapped && !badges.some((badge) => badge.label === mapped.label)) {
      badges.push(mapped);
    }
  }
  return badges.slice(0, 3);
}

export function hasConfigurableOptions(product: PublicProductDto): boolean {
  return product.optionGroups.some((group) => group.options.length > 0);
}
