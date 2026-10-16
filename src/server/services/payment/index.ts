import "server-only";
import { PAYMENT_METHOD_INFO, type PaymentMethod } from "@/lib/constants";
import type { PaymentProvider } from "@/server/services/payment/types";

/**
 * Cash on Delivery — the only active method for the demo. There is nothing to
 * initialize and no provider events; the payment stays `pending` until staff
 * collect the cash (a separate, staff-only status transition).
 */
const cashOnDelivery: PaymentProvider = {
  method: "cash_on_delivery",
  provider: "cod",
  available: true,
  async initialize() {
    return { kind: "none" };
  },
  async verifyEvent() {
    return null;
  },
};

/**
 * Online payment placeholder. No provider is integrated, so it is unavailable
 * and cannot verify any event — an online payment can never be reported paid
 * until a real, signature-verified integration replaces this.
 */
const onlineStub: PaymentProvider = {
  method: "online",
  provider: "online-stub",
  available: false,
  async initialize() {
    return {
      kind: "unavailable",
      reason: "Online payment is coming soon — please choose Cash on Delivery.",
    };
  },
  async verifyEvent() {
    return null;
  },
};

const cardOnDelivery: PaymentProvider = {
  method: "card_on_delivery",
  provider: "cod-card",
  available: false,
  async initialize() {
    return {
      kind: "unavailable",
      reason: "Card on delivery isn't available yet.",
    };
  },
  async verifyEvent() {
    return null;
  },
};

const PROVIDERS: Record<PaymentMethod, PaymentProvider> = {
  cash_on_delivery: cashOnDelivery,
  card_on_delivery: cardOnDelivery,
  online: onlineStub,
};

export function getPaymentProvider(method: PaymentMethod): PaymentProvider {
  return PROVIDERS[method];
}

export function isPaymentMethodAvailable(method: PaymentMethod): boolean {
  return PROVIDERS[method].available;
}

/** Serializable list for the checkout UI (labels from shared constants). */
export function listCheckoutPaymentMethods(): {
  method: PaymentMethod;
  label: string;
  description: string;
  available: boolean;
  comingSoon: boolean;
}[] {
  return (Object.keys(PROVIDERS) as PaymentMethod[]).map((method) => ({
    method,
    ...PAYMENT_METHOD_INFO[method],
  }));
}

export type { PaymentProvider } from "@/server/services/payment/types";
