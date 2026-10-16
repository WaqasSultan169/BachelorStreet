import type { CartLine, CartOption } from "@/lib/types/cart";

/** Deterministic identity for a cart line: product + options + note. */
export function lineSignature(
  productId: string,
  options: CartOption[],
  note?: string,
): string {
  const optionKeys = options
    .map((option) => option.optionKey)
    .sort()
    .join(",");
  return `${productId}::${optionKeys}::${(note ?? "").trim()}`;
}

export function optionsDelta(options: CartOption[]): number {
  return options.reduce((sum, option) => sum + option.priceDelta, 0);
}

export type BuildCartLineInput = {
  productId: string;
  slug: string;
  name: string;
  image?: string;
  basePrice: number;
  options: CartOption[];
  quantity: number;
  note?: string;
};

/** Build a normalized cart line with derived unit price and identity. */
export function buildCartLine(input: BuildCartLineInput): CartLine {
  const options = [...input.options].sort((a, b) =>
    a.optionKey.localeCompare(b.optionKey),
  );
  const note = input.note?.trim() ? input.note.trim() : undefined;
  return {
    lineId: lineSignature(input.productId, options, note),
    productId: input.productId,
    slug: input.slug,
    name: input.name,
    image: input.image,
    basePrice: input.basePrice,
    options,
    unitPrice: input.basePrice + optionsDelta(options),
    quantity: Math.max(1, Math.floor(input.quantity)),
    note,
  };
}

/** The minimal payload the server needs to recompute an authoritative quote. */
export function toQuoteInput(lines: CartLine[]) {
  return {
    lines: lines.map((line) => ({
      productId: line.productId,
      optionKeys: line.options.map((option) => option.optionKey),
      quantity: line.quantity,
      note: line.note,
    })),
  };
}
