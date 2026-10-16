"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertTriangle,
  Bike,
  CheckCircle2,
  ExternalLink,
  Info,
  MapPin,
  Pencil,
  ShoppingBag,
  Store,
} from "lucide-react";
import {
  PAYMENT_METHOD_INFO,
  type PaymentMethod,
  type OrderType,
} from "@/lib/constants";
import {
  checkoutFormSchema,
  placeOrderSchema,
  type CheckoutFormInput,
} from "@/server/validation/order";
import { placeOrderAction } from "@/server/actions/order";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { clearCart } from "@/store/slices/cartSlice";
import { openLocationModal } from "@/store/slices/uiSlice";
import {
  selectDeliveryAddress,
  selectFulfillmentComplete,
  selectFulfillmentType,
  selectSelectedBranch,
  setCoverage,
} from "@/store/slices/locationSlice";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Input } from "@/components/ui/input";
import { Label, FieldError } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { toQuoteInput } from "@/lib/cart";
import { formatPkr } from "@/lib/utils";
import type { CartQuote } from "@/lib/types/cart";
import type { CoverageResult, DeliveryAddress } from "@/lib/types/location";

const IDEMPOTENCY_STORAGE_KEY = "bsc-checkout-idempotency";
const CHECKOUT_PAYMENT_METHODS = ["cash_on_delivery", "online"] as const;

const FORM_FIELD_MAP: Record<string, keyof CheckoutFormInput> = {
  "contact.name": "name",
  "contact.email": "email",
  "contact.phone": "phone",
  paymentMethod: "paymentMethod",
  promotionCode: "promotionCode",
  customerNote: "customerNote",
  acceptTerms: "acceptTerms",
};

function getOrCreateIdempotencyKey(): string {
  if (typeof window === "undefined") return crypto.randomUUID();
  try {
    const existing = window.sessionStorage.getItem(IDEMPOTENCY_STORAGE_KEY);
    if (existing) return existing;
    const created = crypto.randomUUID();
    window.sessionStorage.setItem(IDEMPOTENCY_STORAGE_KEY, created);
    return created;
  } catch {
    return crypto.randomUUID();
  }
}

function clearIdempotencyKey(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(IDEMPOTENCY_STORAGE_KEY);
  } catch {
    // ignore storage failures
  }
}

type QuoteResult =
  | { key: ""; status: "idle"; quote: null }
  | { key: string; status: "ready"; quote: CartQuote }
  | { key: string; status: "error"; quote: null };

export function CheckoutClient({
  contact,
  signedIn,
}: {
  contact: { name: string; email: string };
  signedIn: boolean;
}) {
  const dispatch = useAppDispatch();
  const lines = useAppSelector((state) => state.cart.lines);
  const fulfillmentComplete = useAppSelector(selectFulfillmentComplete);

  if (lines.length === 0) {
    return (
      <EmptyState
        icon={<ShoppingBag className="h-6 w-6" />}
        title="Your cart is empty"
        description="Add a few items from the menu and your order summary will appear here."
        action={<Button href="/menu">Browse the menu</Button>}
      />
    );
  }

  if (!fulfillmentComplete) {
    return (
      <EmptyState
        icon={<MapPin className="h-6 w-6" />}
        title="Choose delivery or pickup"
        description="Tell us how you'd like to receive your order. Delivery is available within our local zone; pickup is available at any open branch."
        action={
          <Button onClick={() => dispatch(openLocationModal())}>
            Choose pickup or delivery
          </Button>
        }
      />
    );
  }

  return <CheckoutForm contact={contact} signedIn={signedIn} />;
}

function CheckoutForm({
  contact,
  signedIn,
}: {
  contact: { name: string; email: string };
  signedIn: boolean;
}) {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const lines = useAppSelector((state) => state.cart.lines);
  const type = useAppSelector(selectFulfillmentType);
  const branch = useAppSelector(selectSelectedBranch);
  const address = useAppSelector(selectDeliveryAddress);
  const savedCoverage = useAppSelector((state) => state.location.coverage);

  const [formError, setFormError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const [idempotencyKey] = useState(getOrCreateIdempotencyKey);

  const {
    register,
    handleSubmit,
    setError,
    control,
    formState: { errors },
  } = useForm<CheckoutFormInput>({
    resolver: zodResolver(checkoutFormSchema),
    defaultValues: {
      name: contact.name,
      email: contact.email,
      phone: address?.phone ?? "",
      paymentMethod: "cash_on_delivery",
      instructions: address?.instructions ?? "",
      customerNote: "",
      promotionCode: "",
      acceptTerms: false,
    },
  });

  const promotionCode = useWatch({ control, name: "promotionCode" }) ?? "";
  const requestBody = JSON.stringify({
    ...toQuoteInput(lines),
    ...(promotionCode.trim() ? { promotionCode: promotionCode.trim().toUpperCase() } : {}),
  });

  const [quoteResult, setQuoteResult] = useState<QuoteResult>(() => ({
    key: "",
    status: "idle",
    quote: null,
  }));

  const [revalidation, setRevalidation] = useState<{
    key: string;
    status: "ready" | "error";
    coverage: CoverageResult | null;
  }>(() => ({ key: "", status: "ready", coverage: savedCoverage }));

  // Re-quote the cart against the live menu.
  useEffect(() => {
    const controller = new AbortController();
    const key = requestBody;
    fetch("/api/cart/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: requestBody,
      signal: controller.signal,
    })
      .then(async (response) => {
        const json = (await response.json()) as
          | { success: true; data: CartQuote }
          | { success: false };
        if (!json.success) throw new Error("quote");
        return json.data;
      })
      .then((quote) => setQuoteResult({ key, status: "ready", quote }))
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setQuoteResult({ key, status: "error", quote: null });
      });
    return () => controller.abort();
  }, [requestBody]);

  // Re-validate delivery coverage on the server whenever the address changes.
  useEffect(() => {
    if (type !== "delivery" || !address) return;
    const controller = new AbortController();
    const key = address.coordinates
      ? `${address.coordinates.lat},${address.coordinates.lng}`
      : address.area?.trim() && address.city?.trim()
        ? `area:${address.area.trim().toLocaleLowerCase("en")}|${(address.city ?? "").trim().toLocaleLowerCase("en")}`
        : "";
    if (!key) return;
    const keyedAddress = `${key}|${branch?.id ?? "auto"}`;
    const body = {
      ...(address.coordinates
        ? { coordinates: address.coordinates }
        : { area: address.area, city: address.city }),
      branchId: branch?.id,
    };
    fetch("/api/delivery/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
      .then(async (response) => {
        const json = (await response.json()) as
          | { success: true; data: CoverageResult }
          | { success: false };
        if (!json.success) throw new Error("coverage");
        return json.data;
      })
      .then((coverage) => {
        setRevalidation({ key: keyedAddress, status: "ready", coverage });
        dispatch(setCoverage(coverage));
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setRevalidation({ key: keyedAddress, status: "error", coverage: null });
      });
    return () => controller.abort();
  }, [type, address, branch?.id, dispatch]);

  const current = quoteResult.key === requestBody ? quoteResult : null;
  const quoteLoading = !current;
  const quoteError = current?.status === "error";
  const quote = current?.status === "ready" ? current.quote : null;

  const coverageKeyCurrent = address
    ? address.coordinates
      ? `${address.coordinates.lat},${address.coordinates.lng}`
      : address.area?.trim() && address.city?.trim()
        ? `area:${address.area.trim().toLocaleLowerCase("en")}|${(address.city ?? "").trim().toLocaleLowerCase("en")}`
        : ""
    : "";
  const currentCoverageKey = `${coverageKeyCurrent}|${branch?.id ?? "auto"}`;
  const coverageCurrent =
    revalidation.key === currentCoverageKey ? revalidation.coverage : null;
  const coverageChecking =
    type === "delivery" &&
    Boolean(coverageKeyCurrent) &&
    revalidation.key !== currentCoverageKey;
  const coverageInZone =
    type !== "delivery" ? true : coverageCurrent?.deliverable === true;
  const deliveryFee = coverageInZone ? (coverageCurrent?.deliveryFee ?? 0) : 0;
  const subtotal = quote?.subtotal ?? 0;
  const discount = quote?.discount ?? 0;
  const total = subtotal - discount + deliveryFee;

  const blocked =
    pending ||
    quoteLoading ||
    !quote ||
    quote.hasIssues ||
    (type === "delivery" && !coverageInZone);

  const onSubmit = (values: CheckoutFormInput) => {
    if (!quote || quote.hasIssues) return;
    if (type === "delivery" && !coverageInZone) return;
    setFormError(undefined);

    const fulfillment =
      type === "pickup" && branch
        ? { type: "pickup" as const, branchId: branch.id }
        : type === "delivery" && address
          ? {
              type: "delivery" as const,
              branchId: branch?.id,
              address: {
                label: address.label,
                street: address.street,
                area: address.area,
                city: address.city,
                instructions: values.instructions,
                coordinates: address.coordinates,
              },
            }
          : null;

    if (!fulfillment) {
      setFormError("Please choose a valid pickup branch or delivery address.");
      return;
    }

    const validated = placeOrderSchema.safeParse({
      idempotencyKey,
      contact: { name: values.name, email: values.email, phone: values.phone },
      fulfillment,
      paymentMethod: values.paymentMethod,
      promotionCode: values.promotionCode?.trim().toUpperCase() || undefined,
      items: quote.lines.map((line) => ({
        productId: line.productId,
        optionKeys: line.options.map((option) => option.optionKey),
        quantity: line.quantity,
        note: line.note,
      })),
      customerNote: values.customerNote,
      acceptTerms: values.acceptTerms,
    });
    if (!validated.success) {
      for (const issue of validated.error.issues) {
        const field = FORM_FIELD_MAP[issue.path.map(String).join(".")];
        if (field) setError(field, { message: issue.message });
      }
      setFormError("Please check your details and try again.");
      return;
    }

    startTransition(async () => {
      const result = await placeOrderAction(validated.data);

      if (!result.ok) {
        const extras: string[] = [];
        if (result.fieldErrors) {
          for (const [key, message] of Object.entries(result.fieldErrors)) {
            const field = FORM_FIELD_MAP[key];
            if (field) setError(field, { message });
            else extras.push(message);
          }
        }
        setFormError(
          extras.length > 0 ? extras.join(" ") : result.error,
        );
        return;
      }

      clearIdempotencyKey();
      dispatch(clearCart());
      router.push(`/order/${result.trackingId}`);
    });
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="grid gap-8 lg:grid-cols-[1.6fr_1fr] lg:items-start"
      noValidate
    >
      <div className="grid gap-6">
        {!signedIn ? (
          <p className="rounded-2xl border border-gold-400/40 bg-gold-400/10 px-4 py-3 text-sm text-charcoal-700">
            Ordering as a guest.{" "}
            <Link
              href="/login?callbackUrl=%2Fcheckout"
              className="font-semibold text-tomato-600 hover:text-tomato-700"
            >
              Sign in
            </Link>{" "}
            to save this order to your account.
          </p>
        ) : null}

        <section className="rounded-2xl border border-charcoal-200/70 bg-white p-5">
          <h3 className="font-display text-base font-semibold text-charcoal-900">
            Contact details
          </h3>
          <p className="mt-1 text-xs text-charcoal-500">
            {contact.email
              ? "Prefilled from your account. You can change these for this order."
              : "Used for your order confirmation and delivery updates."}
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="checkout-name">Full name</Label>
              <Input
                id="checkout-name"
                autoComplete="name"
                placeholder="Your name"
                invalid={Boolean(errors.name)}
                aria-describedby={errors.name ? "checkout-name-error" : undefined}
                {...register("name")}
              />
              <FieldError id="checkout-name-error" message={errors.name?.message} />
            </div>
            <div>
              <Label htmlFor="checkout-email">Email</Label>
              <Input
                id="checkout-email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                invalid={Boolean(errors.email)}
                aria-describedby={errors.email ? "checkout-email-error" : undefined}
                {...register("email")}
              />
              <FieldError id="checkout-email-error" message={errors.email?.message} />
            </div>
            <div>
              <Label htmlFor="checkout-phone">Phone</Label>
              <Input
                id="checkout-phone"
                type="tel"
                autoComplete="tel"
                placeholder="0300 1234567"
                invalid={Boolean(errors.phone)}
                aria-describedby={errors.phone ? "checkout-phone-error" : undefined}
                {...register("phone")}
              />
              <FieldError id="checkout-phone-error" message={errors.phone?.message} />
            </div>
          </div>
        </section>

        <FulfillmentSummary
          type={type}
          branchName={branch?.name ?? coverageCurrent?.branchName ?? null}
          branchAddress={branch?.address ?? null}
          mapsUrl={branch?.mapsUrl ?? null}
          address={type === "delivery" ? address : null}
          onEdit={() => dispatch(openLocationModal())}
          coverage={coverageCurrent}
          coverageChecking={coverageChecking}
          coverageInZone={coverageInZone}
        />

        {type === "delivery" ? (
          <section className="rounded-2xl border border-charcoal-200/70 bg-white p-5">
            <Label htmlFor="checkout-instructions">
              Delivery instructions (optional)
            </Label>
            <Input
              id="checkout-instructions"
              placeholder="Gate code, landmark, call on arrival…"
              invalid={Boolean(errors.instructions)}
              {...register("instructions")}
            />
            <FieldError
              id="checkout-instructions-error"
              message={errors.instructions?.message}
            />
          </section>
        ) : null}

        <section className="rounded-2xl border border-charcoal-200/70 bg-white p-5">
          <h3 className="font-display text-base font-semibold text-charcoal-900">
            Payment method
          </h3>
          <div className="mt-4 grid gap-3">
            {CHECKOUT_PAYMENT_METHODS.map((method) => (
              <PaymentOption key={method} method={method} register={register} />
            ))}
          </div>
          <FieldError
            id="checkout-payment-error"
            message={errors.paymentMethod?.message}
          />
        </section>

        <div>
          <div className="mb-3 flex items-center gap-2 text-sm text-charcoal-500">
            {quoteLoading ? (
              <>
                <Spinner className="h-4 w-4" />
                Verifying prices against the live menu…
              </>
            ) : quote?.hasIssues ? (
              <span className="inline-flex items-center gap-2 font-medium text-tomato-600">
                <AlertTriangle className="h-4 w-4" />
                Review the cart or promotion code before you can order.
              </span>
            ) : (
              <span className="inline-flex items-center gap-2 font-medium text-emerald-600">
                <CheckCircle2 className="h-4 w-4" />
                Prices verified against the live menu.
              </span>
            )}
          </div>

          {quoteError ? (
            <ErrorState description="We couldn't verify your cart. Please try again." />
          ) : (
            <ul className="divide-y divide-charcoal-900/10 overflow-hidden rounded-2xl border border-charcoal-200/70 bg-white">
              {(quote?.lines ?? []).map((line) => (
                <li
                  key={`${line.productId}-${line.options
                    .map((option) => option.optionKey)
                    .join("-")}`}
                  className="flex items-start justify-between gap-4 px-5 py-4"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-charcoal-900">
                      {line.quantity}× {line.name}
                    </p>
                    {line.options.length > 0 ? (
                      <ul className="mt-1 text-xs text-charcoal-500">
                        {line.options.map((option) => (
                          <li key={option.optionKey}>
                            {option.groupName}: {option.optionName}
                            {option.priceDelta > 0
                              ? ` (+${formatPkr(option.priceDelta)})`
                              : ""}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    {line.note ? (
                      <p className="mt-1 text-xs italic text-charcoal-500">
                        “{line.note}”
                      </p>
                    ) : null}
                    {!line.available && line.reason ? (
                      <p className="mt-1 text-xs font-medium text-tomato-600">
                        {line.reason}
                      </p>
                    ) : null}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold text-charcoal-900">
                      {quote ? formatPkr(line.lineTotal) : "—"}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <section className="rounded-2xl border border-charcoal-200/70 bg-white p-5">
          <Label htmlFor="checkout-note">Order note (optional)</Label>
          <Textarea
            id="checkout-note"
            rows={2}
            placeholder="Anything else we should know about this order?"
            invalid={Boolean(errors.customerNote)}
            {...register("customerNote")}
          />
          <FieldError
            id="checkout-note-error"
            message={errors.customerNote?.message}
          />
        </section>
      </div>

      <aside className="rounded-2xl border border-charcoal-200/70 bg-white p-6 shadow-[var(--shadow-card)] lg:sticky lg:top-24">
        <h2 className="font-display text-lg font-semibold text-charcoal-900">
          Order summary
        </h2>
        <div className="mt-4">
          <Label htmlFor="checkout-promotion">Promotion code (optional)</Label>
          <Input
            id="checkout-promotion"
            autoComplete="off"
            placeholder="Enter discount code"
            invalid={Boolean(quote?.promotionError)}
            {...register("promotionCode")}
          />
          {quote?.promotionError ? (
            <p role="alert" className="mt-1 text-xs text-tomato-600">{quote.promotionError}</p>
          ) : quote?.promotionCode ? (
            <p role="status" className="mt-1 text-xs text-emerald-700">Code {quote.promotionCode} applied.</p>
          ) : null}
        </div>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <dt className="text-charcoal-500">Subtotal</dt>
            <dd className="font-semibold text-charcoal-900">
              {quote ? formatPkr(subtotal) : "—"}
            </dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-charcoal-500">Discount</dt>
            <dd className="font-semibold text-charcoal-900">
              {discount > 0 ? `−${formatPkr(discount)}` : formatPkr(0)}
            </dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-charcoal-500">
              {type === "delivery" ? "Delivery fee" : "Pickup"}
            </dt>
            <dd className="font-semibold text-charcoal-900">
              {type === "delivery"
                ? quote && coverageInZone
                  ? formatPkr(deliveryFee)
                  : "—"
                : "Free"}
            </dd>
          </div>
          <div className="flex items-center justify-between border-t border-charcoal-900/10 pt-2">
            <dt className="text-charcoal-500">Total</dt>
            <dd className="font-display text-lg font-semibold text-charcoal-900">
              {quote && coverageInZone ? formatPkr(total) : "—"}
            </dd>
          </div>
        </dl>

        <p className="mt-3 flex items-start gap-2 rounded-xl bg-cream-100 px-3 py-2.5 text-xs text-charcoal-500">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Prices and totals are re-verified on our server when you place your order.
        </p>

        <label
          htmlFor="checkout-terms"
          className="mt-4 flex items-start gap-2 text-xs text-charcoal-600"
        >
          <input
            id="checkout-terms"
            type="checkbox"
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-charcoal-300 text-tomato-600 focus:ring-tomato-500/40"
            aria-describedby={errors.acceptTerms ? "checkout-terms-error" : undefined}
            {...register("acceptTerms")}
          />
          <span>
            I agree to the{" "}
            <Link href="/terms" className="font-semibold text-tomato-600 hover:text-tomato-700">
              Terms
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="font-semibold text-tomato-600 hover:text-tomato-700">
              Privacy Policy
            </Link>
            .
          </span>
        </label>
        <FieldError id="checkout-terms-error" message={errors.acceptTerms?.message} />

        {formError ? (
          <p
            role="alert"
            className="mt-4 rounded-xl bg-tomato-100 px-4 py-3 text-sm font-medium text-tomato-700"
          >
            {formError}
          </p>
        ) : null}

        <Button type="submit" className="mt-4 w-full" loading={pending} disabled={blocked}>
          {quoteLoading ? "Verifying…" : "Place order"}
        </Button>

        <div className="mt-3 flex flex-col items-center gap-1">
          <p className="text-center text-xs text-charcoal-400">
            Need something else?{" "}
            <Link href="/menu" className="font-semibold text-tomato-600">
              Back to menu
            </Link>
          </p>
          <button
            type="button"
            className="text-xs font-medium text-charcoal-400 underline-offset-2 hover:text-tomato-600 hover:underline"
            onClick={() => dispatch(clearCart())}
          >
            Clear cart
          </button>
        </div>
      </aside>
    </form>
  );
}

function PaymentOption({
  method,
  register,
}: {
  method: PaymentMethod;
  register: ReturnType<typeof useForm<CheckoutFormInput>>["register"];
}) {
  const info = PAYMENT_METHOD_INFO[method];
  const disabled = !info.available;

  return (
    <label
      className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${
        disabled
          ? "cursor-not-allowed border-charcoal-200/70 bg-cream-100/60 opacity-70"
          : "cursor-pointer border-charcoal-200 hover:border-tomato-400"
      }`}
    >
      <input
        type="radio"
        value={method}
        disabled={disabled}
        className="mt-0.5 h-4 w-4 border-charcoal-300 text-tomato-600 focus:ring-tomato-500/40"
        {...register("paymentMethod")}
      />
      <span className="min-w-0">
        <span className="flex items-center gap-2">
          <span className="font-semibold text-charcoal-900">{info.label}</span>
          {info.comingSoon ? <Badge variant="gold">Coming soon</Badge> : null}
        </span>
        <span className="mt-0.5 block text-xs text-charcoal-500">
          {info.description}
        </span>
      </span>
    </label>
  );
}

function FulfillmentSummary({
  type,
  branchName,
  branchAddress,
  mapsUrl,
  address,
  onEdit,
  coverage,
  coverageChecking,
  coverageInZone,
}: {
  type: OrderType | null;
  branchName: string | null;
  branchAddress: string | null;
  mapsUrl: string | null;
  address: DeliveryAddress | null;
  onEdit: () => void;
  coverage: CoverageResult | null;
  coverageChecking: boolean;
  coverageInZone: boolean;
}) {
  const isDelivery = type === "delivery";
  const Icon = isDelivery ? Bike : Store;

  return (
    <section className="rounded-2xl border border-charcoal-200/70 bg-white p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-tomato-100 text-tomato-600">
            <Icon className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-display text-base font-semibold text-charcoal-900">
                {isDelivery ? "Delivery" : "Pickup"}
              </h3>
              <Badge variant={coverageInZone ? "success" : "tomato"}>
                {isDelivery
                  ? coverageChecking
                    ? "Checking…"
                    : coverageInZone
                      ? "In zone"
                      : "Needs attention"
                  : "Ready for pickup"}
              </Badge>
            </div>

            {isDelivery && address ? (
              <p className="mt-1 text-sm break-words text-charcoal-600">
                {[address.label, address.street, address.area, address.city]
                  .filter(Boolean)
                  .join(", ")}
              </p>
            ) : null}

            {!isDelivery ? (
              <p className="mt-1 text-sm text-charcoal-500">
                {branchName ?? "Selected branch"}
                {branchAddress ? ` · ${branchAddress}` : ""}
              </p>
            ) : null}

            {branchName && isDelivery ? (
              <p className="mt-1 text-xs text-charcoal-400">
                Fulfilled by {branchName}
              </p>
            ) : null}
          </div>
        </div>
        <Button variant="ghost" size="sm" type="button" onClick={onEdit}>
          <Pencil className="h-3.5 w-3.5" />
          Edit
        </Button>
      </div>

      {isDelivery ? (
        <div className="mt-4 rounded-xl bg-cream-100 px-3 py-2.5 text-xs">
          {coverageChecking ? (
            <span className="flex items-center gap-2 text-charcoal-500">
              <Spinner className="h-3.5 w-3.5" />
              Re-checking delivery coverage…
            </span>
          ) : coverageInZone ? (
            <span className="flex items-center gap-2 text-emerald-700">
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
              {coverage?.message ?? "Address verified for delivery."}
            </span>
          ) : (
            <span className="flex items-start gap-2 text-tomato-700">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {coverage?.message ??
                "This address is outside our delivery zone. Switch to pickup or choose another address."}
            </span>
          )}
        </div>
      ) : null}

      {!isDelivery && mapsUrl ? (
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-tomato-600 hover:text-tomato-500"
        >
          Get directions
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      ) : null}
    </section>
  );
}
