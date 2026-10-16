"use client";

import { useState } from "react";
import { Plus, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Price } from "@/components/ui/price";
import { ProductImage } from "@/components/ui/product-image";
import { QuantityStepper } from "@/components/ui/quantity-stepper";
import { ProductDialog } from "@/components/menu/product-dialog";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  addItem,
  selectQuantityForProduct,
  setQuantity,
} from "@/store/slices/cartSlice";
import { pushToast } from "@/store/slices/toastSlice";
import { buildCartLine, lineSignature } from "@/lib/cart";
import { cn } from "@/lib/utils";
import { hasConfigurableOptions, productBadges } from "@/lib/menu-ui";
import { resolveFoodImage } from "@/lib/food-images";
import type { PublicProductDto } from "@/lib/types/menu";

/**
 * Slim, scannable menu row used by the home-page preview. Keeps the same cart
 * behaviour as the full product card (quick add, quantity, option dialog) but
 * in a list format so it does not repeat the card grid.
 */
export function MenuRow({
  product,
}: {
  product: PublicProductDto & { categoryName?: string };
}) {
  const dispatch = useAppDispatch();
  const [dialogOpen, setDialogOpen] = useState(false);
  const inCart = useAppSelector((state) =>
    selectQuantityForProduct(state, product.id),
  );

  const badges = productBadges(product);
  const configurable = hasConfigurableOptions(product);
  const simpleLineId = lineSignature(product.id, [], undefined);
  const image = resolveFoodImage({
    slug: product.slug,
    name: product.name,
    images: product.images,
  });

  const quickAdd = () => {
    dispatch(
      addItem(
        buildCartLine({
          productId: product.id,
          slug: product.slug,
          name: product.name,
          image,
          basePrice: product.price,
          options: [],
          quantity: 1,
        }),
      ),
    );
    dispatch(
      pushToast({
        title: `${product.name} added`,
        description: "Added to your bag",
        variant: "success",
      }),
    );
  };

  return (
    <article
      className={cn(
        "group flex items-center gap-3.5 rounded-2xl border border-charcoal-200/70 bg-white p-3 transition-colors hover:border-charcoal-300 sm:gap-4",
        !product.isAvailable && "opacity-75",
      )}
    >
      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-cream-100 sm:h-20 sm:w-20">
        <ProductImage
          src={image}
          alt={product.name}
          sizes="80px"
          className="transition-transform duration-500 motion-safe:group-hover:scale-110"
        />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {product.categoryName ? (
            <p className="truncate text-[11px] font-bold uppercase tracking-wide text-flame-600">
              {product.categoryName}
            </p>
          ) : null}
          {badges[0] ? (
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                badges[0].variant === "tomato" && "bg-tomato-100 text-tomato-600",
                badges[0].variant === "gold" && "bg-gold-400/20 text-gold-700",
                badges[0].variant === "success" &&
                  "bg-emerald-100 text-emerald-700",
                badges[0].variant === "neutral" &&
                  "bg-charcoal-900/5 text-charcoal-700",
                badges[0].variant === "outline" &&
                  "border border-charcoal-300 text-charcoal-700",
              )}
            >
              {badges[0].label}
            </span>
          ) : null}
        </div>
        <h3 className="mt-0.5 truncate font-display text-base font-bold text-charcoal-900">
          {product.name}
        </h3>
        {product.description ? (
          <p className="mt-0.5 line-clamp-1 text-xs text-charcoal-500">
            {product.description}
          </p>
        ) : null}
      </div>

      <div className="flex shrink-0 flex-col items-end gap-2">
        <Price
          amount={product.price}
          compareAtPrice={product.compareAtPrice}
          size="sm"
        />
        {!product.isAvailable ? (
          <span className="text-xs font-semibold uppercase tracking-wide text-charcoal-400">
            Sold out
          </span>
        ) : configurable ? (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setDialogOpen(true)}
          >
            <Settings2 className="h-3.5 w-3.5" />
            {inCart > 0 ? "In cart" : "Options"}
          </Button>
        ) : inCart > 0 ? (
          <QuantityStepper
            size="sm"
            value={inCart}
            onChange={(quantity) =>
              dispatch(setQuantity({ lineId: simpleLineId, quantity }))
            }
            label={`Quantity for ${product.name}`}
          />
        ) : (
          <Button
            size="icon"
            aria-label={`Add ${product.name} to cart`}
            onClick={quickAdd}
            className="h-9 w-9 bg-linear-to-r from-tomato-600 to-flame-500 hover:from-tomato-500 hover:to-flame-400"
          >
            <Plus className="h-4 w-4" />
          </Button>
        )}
      </div>

      {configurable ? (
        <ProductDialog
          product={product}
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
        />
      ) : null}
    </article>
  );
}
