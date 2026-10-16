import type { PaymentMethod } from "@/lib/constants";

/**
 * Result of preparing a payment. `none` means no customer action is required
 * (e.g. Cash on Delivery); `redirect` would hand off to a hosted checkout once
 * a real provider is wired; `unavailable` means the method cannot be used yet.
 *
 * Initializing a payment NEVER marks it paid — that only happens from a
 * verified provider event.
 */
export type PaymentInitResult =
  | { kind: "none" }
  | { kind: "redirect"; url: string }
  | { kind: "unavailable"; reason: string };

/**
 * A payment event whose authenticity has been verified by the provider
 * implementation (signature/secret check). Unverified events must be dropped.
 */
export type VerifiedPaymentEvent = {
  provider: string;
  /** Provider-side event id, used for idempotent processing. */
  reference: string;
  transactionId?: string;
  status: "paid" | "failed";
};

export type PaymentInitializeInput = {
  orderNumber: string;
  amount: number;
  currency: string;
  customerEmail: string;
};

/**
 * Clean boundary for payment integrations. Swap the online provider for a real
 * Stripe/other implementation behind this same interface when integrating.
 */
export interface PaymentProvider {
  readonly method: PaymentMethod;
  readonly provider: string;
  /** Whether a customer may actually select this method at checkout. */
  readonly available: boolean;

  /** Prepare payment for an order. Must not change payment status. */
  initialize(input: PaymentInitializeInput): Promise<PaymentInitResult>;

  /**
   * Authenticate a raw webhook/callback payload. Returns null when the event
   * cannot be verified — callers MUST ignore null and never mark a payment paid.
   */
  verifyEvent(
    raw: unknown,
    headers: Headers,
  ): Promise<VerifiedPaymentEvent | null>;
}
