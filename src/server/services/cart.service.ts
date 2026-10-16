import "server-only";
import { connectDb } from "@/server/db";
import { getProductModel } from "@/server/db/models";
import { validate } from "@/server/validation/common";
import { cartQuoteSchema, type CartQuoteInput } from "@/server/validation/cart";
import { ORDER } from "@/lib/constants";
import { calculatePromotionDiscount } from "@/server/services/promotion.service";
import { isAppError } from "@/lib/errors";
import type { CartOption, CartQuote, CartQuoteLine } from "@/lib/types/cart";

type LeanProduct = {
  _id: { toString(): string };
  name: string;
  slug: string;
  price: number;
  images?: string[] | null;
  isAvailable: boolean;
  isActive: boolean;
  stockQuantity?: number | null;
  optionGroups?: {
    key: string;
    name: string;
    type: "single" | "multi";
    required: boolean;
    max?: number;
    options?: { key: string; name: string; priceDelta: number }[];
  }[];
};

function unavailableLine(
  productId: string,
  reason: string,
  note?: string,
): CartQuoteLine {
  return {
    productId,
    name: "Unavailable item",
    slug: "",
    available: false,
    reason,
    basePrice: 0,
    options: [],
    unitPrice: 0,
    quantity: 1,
    lineTotal: 0,
    note,
  };
}

function resolveLine(
  productId: string,
  optionKeys: string[],
  quantity: number,
  doc: LeanProduct | undefined,
  note?: string,
  stockSufficient = true,
): CartQuoteLine {
  if (!doc || !doc.isActive) {
    return unavailableLine(productId, "This item is no longer on the menu.", note);
  }

  const selectedKeys = new Set(optionKeys);
  if (selectedKeys.size !== optionKeys.length) {
    return unavailableLine(productId, "Remove duplicate customization choices and try again.", note);
  }

  const options: CartOption[] = [];
  let delta = 0;

  for (const group of doc.optionGroups ?? []) {
    const chosen = (group.options ?? []).filter((option) =>
      selectedKeys.has(option.key),
    );
    const maxChoices = group.type === "single" ? 1 : group.max ?? Infinity;
    if (chosen.length > maxChoices) {
      return unavailableLine(productId, `Choose fewer ${group.name} options.`, note);
    }
    if (group.required && chosen.length === 0) {
      return unavailableLine(productId, `Please choose a ${group.name}.`, note);
    }
    for (const option of chosen) {
      selectedKeys.delete(option.key);
      options.push({
        groupKey: group.key,
        groupName: group.name,
        optionKey: option.key,
        optionName: option.name,
        priceDelta: option.priceDelta,
      });
      delta += option.priceDelta;
    }
  }

  if (selectedKeys.size > 0) {
    return unavailableLine(productId, "One or more customization choices are no longer available.", note);
  }

  const unitPrice = doc.price + delta;
  if (!Number.isFinite(unitPrice) || unitPrice < 0) {
    return unavailableLine(productId, "This item has an invalid price. Please contact us.", note);
  }
  const safeQuantity = Math.min(
    ORDER.maxLineQuantity,
    Math.max(1, Math.floor(quantity)),
  );
  const available = doc.isAvailable && stockSufficient &&
    (doc.stockQuantity == null || doc.stockQuantity >= safeQuantity);

  return {
    productId,
    name: doc.name,
    slug: doc.slug,
    image: doc.images?.[0],
    available,
    reason: available
      ? undefined
      : !stockSufficient || (doc.stockQuantity != null && doc.stockQuantity < safeQuantity)
        ? "There is not enough stock for this quantity."
        : "This item is sold out right now.",
    stockLimited: doc.stockQuantity != null,
    basePrice: doc.price,
    options,
    unitPrice,
    quantity: safeQuantity,
    lineTotal: available ? unitPrice * safeQuantity : 0,
    note,
  };
}

/**
 * Authoritative cart quote. Never trusts client prices: it re-reads each
 * product from the database, re-validates the selected options, and recomputes
 * every unit price and the subtotal.
 */
export async function quoteCart(input: CartQuoteInput): Promise<CartQuote> {
  const { lines, promotionCode } = validate(cartQuoteSchema, input, "cart");

  await connectDb();
  const Product = getProductModel();

  const ids = [...new Set(lines.map((line) => line.productId))];
  const docs = await Product.find({ _id: { $in: ids } }).lean<LeanProduct[]>();
  const byId = new Map(docs.map((doc) => [doc._id.toString(), doc]));
  const quantities = new Map<string, number>();
  for (const line of lines) {
    quantities.set(line.productId, (quantities.get(line.productId) ?? 0) + line.quantity);
  }

  const quoted = lines.map((line) =>
    resolveLine(
      line.productId,
      line.optionKeys,
      line.quantity,
      byId.get(line.productId),
      line.note?.trim() ? line.note.trim() : undefined,
      byId.get(line.productId)?.stockQuantity == null ||
        (byId.get(line.productId)?.stockQuantity ?? 0) >= (quantities.get(line.productId) ?? 0),
    ),
  );

  const subtotal = quoted
    .filter((line) => line.available)
    .reduce((sum, line) => sum + line.lineTotal, 0);
  const itemCount = quoted
    .filter((line) => line.available)
    .reduce((sum, line) => sum + line.quantity, 0);

  let promotion: { code?: string; discount: number; title?: string } = { discount: 0 };
  let promotionError: string | undefined;
  try {
    promotion = await calculatePromotionDiscount(promotionCode, subtotal);
  } catch (error) {
    if (!isAppError(error) || error.code !== "BAD_REQUEST") throw error;
    promotionError = error.message;
  }
  return {
    lines: quoted,
    subtotal,
    itemCount,
    currency: "PKR",
    hasIssues: quoted.some((line) => !line.available) || Boolean(promotionError),
    currencyNote: "Prices verified against the live menu.",
    discount: promotion.discount,
    promotionCode: promotion.code,
    promotionTitle: promotion.title,
    promotionError,
  };
}
