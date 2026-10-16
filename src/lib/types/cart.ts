/**
 * Cart types shared by client (Redux) and server (quote/recalculation).
 * The client cart is the source of intent; the server quote is the source of
 * truth for prices, availability and totals.
 */

export type CartOption = {
  groupKey: string;
  groupName: string;
  optionKey: string;
  optionName: string;
  priceDelta: number;
};

export type CartLine = {
  /** Stable per-line identity (product + options + note combination). */
  lineId: string;
  productId: string;
  slug: string;
  name: string;
  image?: string;
  /** Menu price at the time of adding (display only). */
  basePrice: number;
  options: CartOption[];
  /** basePrice + sum(option priceDelta). Display only; server re-derives. */
  unitPrice: number;
  quantity: number;
  note?: string;
};

/** Minimal payload sent to the server for an authoritative quote. */
export type CartQuoteRequestLine = {
  productId: string;
  optionKeys: string[];
  quantity: number;
  note?: string;
};

export type CartQuoteLine = {
  productId: string;
  name: string;
  slug: string;
  image?: string;
  available: boolean;
  /** Internal quote metadata; only finite stock quantities are reserved. */
  stockLimited?: boolean;
  reason?: string;
  basePrice: number;
  options: CartOption[];
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  note?: string;
};

export type CartQuote = {
  lines: CartQuoteLine[];
  subtotal: number;
  itemCount: number;
  currency: string;
  hasIssues: boolean;
  currencyNote: string;
  discount?: number;
  promotionCode?: string;
  promotionTitle?: string;
  promotionError?: string;
};
