"use client";

import { useState } from "react";
import { Plus, Settings2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
import { cn, formatPkr } from "@/lib/utils";
import { hasConfigurableOptions, productBadges } from "@/lib/menu-ui";
import { resolveFoodImage } from "@/lib/food-images";
import type { PublicProductDto } from "@/lib/types/menu";

export function ProductCard({
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
        description: formatPkr(product.price),
        variant: "success",
      }),
    );
  };

  return (
    <article
      className={cn(
        "group flex h-full flex-col overflow-hidden rounded-2xl border border-charcoal-200/70 bg-white shadow-[var(--shadow-card)] transition-all duration-200 motion-safe:hover:-translate-y-1 hover:shadow-[var(--shadow-lift)]",
        !product.isAvailable && "opacity-80",
      )}
    >
      <div className="relative aspect-4/3 w-full overflow-hidden">
        <ProductImage
          src={image}
          alt={product.name}
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="transition-transform duration-500 motion-safe:group-hover:scale-105"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-linear-to-t from-ink-950/35 via-transparent to-transparent"
        />
        {badges.length > 0 ? (
          <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
            {badges.map((badge) => (
              <Badge key={badge.label} variant={badge.variant}>
                {badge.label}
              </Badge>
            ))}
          </div>
        ) : null}
        {!product.isAvailable ? (
          <div className="absolute inset-0 flex items-center justify-center bg-ink-950/60">
            <span className="rounded-full bg-cream-50 px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-charcoal-900">
              Sold out
            </span>
          </div>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {product.categoryName ? (
              <p className="text-[11px] font-bold uppercase tracking-wide text-flame-600">
                {product.categoryName}
              </p>
            ) : null}
            <h3 className="mt-0.5 font-display text-base font-bold leading-tight text-charcoal-900 sm:text-lg">
              {product.name}
            </h3>
          </div>
          <Price
            amount={product.price}
            compareAtPrice={product.compareAtPrice}
            className="shrink-0"
          />
        </div>

        {product.description ? (
          <p className="mt-1.5 line-clamp-2 text-sm text-charcoal-500">
            {product.description}
          </p>
        ) : null}

        <div className="mt-auto pt-4">
          {!product.isAvailable ? (
            <Button variant="outline" className="w-full" disabled>
              Unavailable
            </Button>
          ) : configurable ? (
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => setDialogOpen(true)}
            >
              <Settings2 className="h-4 w-4" />
              {inCart > 0 ? `In cart (${inCart}) · Customize` : "Customize"}
            </Button>
          ) : inCart > 0 ? (
            <div className="flex items-center justify-between gap-3">
              <QuantityStepper
                size="sm"
                value={inCart}
                onChange={(quantity) =>
                  dispatch(setQuantity({ lineId: simpleLineId, quantity }))
                }
                label={`Quantity for ${product.name}`}
              />
              <span className="text-xs font-medium text-charcoal-500">
                In cart
              </span>
            </div>
          ) : (
            <Button
              className="w-full bg-linear-to-r from-tomato-600 to-flame-500 hover:from-tomato-500 hover:to-flame-400"
              onClick={quickAdd}
            >
              <Plus className="h-4 w-4" />
              Add to cart
            </Button>
          )}
        </div>
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
