"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, ShoppingBag } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { QuantityStepper } from "@/components/ui/quantity-stepper";
import { ProductImage } from "@/components/ui/product-image";
import { Price } from "@/components/ui/price";
import { Badge } from "@/components/ui/badge";
import { OptionGroup } from "@/components/menu/option-group";
import { useAppDispatch } from "@/store/hooks";
import { addItem } from "@/store/slices/cartSlice";
import { pushToast } from "@/store/slices/toastSlice";
import { buildCartLine } from "@/lib/cart";
import { formatPkr } from "@/lib/utils";
import { productBadges } from "@/lib/menu-ui";
import type { CartOption } from "@/lib/types/cart";
import type { PublicProductDto } from "@/lib/types/menu";

function initialSelection(product: PublicProductDto): Record<string, string[]> {
  const selection: Record<string, string[]> = {};
  for (const group of product.optionGroups) {
    if (group.type === "multi") {
      selection[group.key] = group.options
        .filter((option) => option.isDefault)
        .map((option) => option.key);
    } else {
      const preferred =
        group.options.find((option) => option.isDefault) ??
        (group.required ? group.options[0] : undefined);
      selection[group.key] = preferred ? [preferred.key] : [];
    }
  }
  return selection;
}

export function ProductDialog({
  product,
  open,
  onClose,
}: {
  product: PublicProductDto;
  open: boolean;
  onClose: () => void;
}) {
  const dispatch = useAppDispatch();
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState("");
  const [selection, setSelection] = useState<Record<string, string[]>>(() =>
    initialSelection(product),
  );

  const badges = useMemo(() => productBadges(product), [product]);

  const selectedOptions: CartOption[] = useMemo(() => {
    const result: CartOption[] = [];
    for (const group of product.optionGroups) {
      const chosen = selection[group.key] ?? [];
      for (const option of group.options) {
        if (chosen.includes(option.key)) {
          result.push({
            groupKey: group.key,
            groupName: group.name,
            optionKey: option.key,
            optionName: option.name,
            priceDelta: option.priceDelta,
          });
        }
      }
    }
    return result;
  }, [product.optionGroups, selection]);

  const unitPrice =
    product.price +
    selectedOptions.reduce((sum, option) => sum + option.priceDelta, 0);

  const missingRequired = product.optionGroups.some(
    (group) => group.required && (selection[group.key] ?? []).length === 0,
  );

  const toggle = (groupKey: string, type: "single" | "multi", max: number | undefined, optionKey: string) => {
    setSelection((current) => {
      const currentGroup = current[groupKey] ?? [];
      if (type === "single") {
        return { ...current, [groupKey]: [optionKey] };
      }
      if (currentGroup.includes(optionKey)) {
        return {
          ...current,
          [groupKey]: currentGroup.filter((key) => key !== optionKey),
        };
      }
      if (max && currentGroup.length >= max) {
        return current;
      }
      return { ...current, [groupKey]: [...currentGroup, optionKey] };
    });
  };

  const handleAdd = () => {
    if (missingRequired || !product.isAvailable) return;
    dispatch(
      addItem(
        buildCartLine({
          productId: product.id,
          slug: product.slug,
          name: product.name,
          image: product.images[0],
          basePrice: product.price,
          options: selectedOptions,
          quantity,
          note,
        }),
      ),
    );
    dispatch(
      pushToast({
        title: `${product.name} added`,
        description: `${quantity} × ${formatPkr(unitPrice)}`,
        variant: "success",
      }),
    );
    onClose();
    setQuantity(1);
    setNote("");
    setSelection(initialSelection(product));
  };

  return (
    <Dialog open={open} onClose={onClose} title={product.name} describedBy="product-dialog-desc">
      <div className="relative h-48 w-full overflow-hidden bg-cream-100">
        <ProductImage
          src={product.images[0]}
          alt={product.name}
          sizes="(max-width: 640px) 100vw, 512px"
        />
      </div>

      <div className="space-y-5 px-6 py-5">
        <div>
          {badges.length > 0 ? (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {badges.map((badge) => (
                <Badge key={badge.label} variant={badge.variant}>
                  {badge.label}
                </Badge>
              ))}
            </div>
          ) : null}
          <Price
            amount={product.price}
            compareAtPrice={product.compareAtPrice}
            size="lg"
          />
          {product.description ? (
            <p id="product-dialog-desc" className="mt-2 text-sm leading-relaxed text-charcoal-600">
              {product.description}
            </p>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-3 text-xs text-charcoal-500">
            {product.preparationMinutes ? (
              <span>{product.preparationMinutes} min prep</span>
            ) : null}
            {product.calories ? <span>{product.calories} kcal</span> : null}
            {product.isAvailable ? (
              <span className="font-medium text-emerald-600">Available now</span>
            ) : (
              <span className="inline-flex items-center gap-1 font-medium text-tomato-600">
                <AlertTriangle className="h-3.5 w-3.5" /> Sold out
              </span>
            )}
          </div>
        </div>

        {product.optionGroups.map((group) => (
          <OptionGroup
            key={group.key}
            group={group}
            selected={selection[group.key] ?? []}
            onToggle={(optionKey) =>
              toggle(group.key, group.type, group.max, optionKey)
            }
          />
        ))}

        <div>
          <label
            htmlFor="product-note"
            className="text-sm font-semibold text-charcoal-900"
          >
            Special instructions
            <span className="ml-1 text-xs font-normal text-charcoal-400">
              optional
            </span>
          </label>
          <textarea
            id="product-note"
            rows={2}
            maxLength={200}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="E.g. no onions, extra sauce on the side…"
            className="mt-2 w-full rounded-xl border border-charcoal-200 bg-white px-3 py-2 text-sm text-charcoal-900 placeholder:text-charcoal-400 focus:border-tomato-500 focus:outline-none focus:ring-2 focus:ring-tomato-500/40"
          />
        </div>
      </div>

      <div className="sticky bottom-0 flex items-center justify-between gap-4 border-t border-charcoal-900/10 bg-white px-6 py-4">
        <QuantityStepper
          value={quantity}
          onChange={setQuantity}
          label={`Quantity for ${product.name}`}
        />
        <Button
          size="lg"
          className="flex-1"
          disabled={!product.isAvailable || missingRequired}
          onClick={handleAdd}
        >
          <ShoppingBag className="h-4 w-4" />
          {product.isAvailable ? `Add · ${formatPkr(unitPrice * quantity)}` : "Sold out"}
        </Button>
      </div>
    </Dialog>
  );
}
