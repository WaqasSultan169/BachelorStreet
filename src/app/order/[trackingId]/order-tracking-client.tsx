"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { io, type Socket } from "socket.io-client";
import { Bike, CheckCircle2, Clock3, MapPin, Radio, Store } from "lucide-react";
import { motion } from "motion/react";
import { z } from "zod";
import {
  ORDER_STATUS_DESCRIPTIONS,
  ORDER_STATUS_LABELS,
  ORDER_STATUSES,
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
  type OrderStatus,
} from "@/lib/constants";
import { getClientEnv } from "@/lib/client-env";
import { SOCKET_EVENTS, socketOrderEventSchema } from "@/lib/socket/events";
import type { OrderTrackingDto } from "@/server/services/order.service";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { formatPkr } from "@/lib/utils";

const statusSchema = z.enum(ORDER_STATUSES);
const trackingSnapshotSchema = z.object({
  success: z.literal(true),
  data: z.object({
    id: z.string(),
    trackingId: z.string(),
    orderNumber: z.string(),
    status: statusSchema,
    statusLabel: z.string(),
    statusDescription: z.string(),
    version: z.number().int().nonnegative(),
    updatedAt: z.string(),
    paymentMethod: z.enum(PAYMENT_METHODS),
    paymentStatus: z.enum(PAYMENT_STATUSES),
    fulfillment: z.object({
      type: z.enum(["pickup", "delivery"]),
      branchName: z.string().optional(),
      branchAddress: z.string().optional(),
      zoneName: z.string().optional(),
      etaMinutes: z.number().positive().optional(),
      deliveryBoyName: z.string().optional(),
      deliveryBoyId: z.string().optional(),
      assignedAt: z.string().optional(),
      lastLocation: z.object({
        coordinates: z.object({ lat: z.number(), lng: z.number() }),
        updatedAt: z.string(),
      }).optional(),
      address: z.object({
        label: z.string(),
        street: z.string().optional(),
        area: z.string().optional(),
        city: z.string().optional(),
        instructions: z.string().optional(),
        coordinates: z.object({ lat: z.number(), lng: z.number() }).optional(),
      }).optional(),
    }),
    items: z.array(z.object({
      name: z.string(),
      slug: z.string(),
      image: z.string().optional(),
      unitPrice: z.number(),
      quantity: z.number(),
      lineTotal: z.number(),
      note: z.string().optional(),
      options: z.array(z.object({
        groupName: z.string(),
        optionName: z.string(),
        priceDelta: z.number(),
      })),
    })),
    subtotal: z.number(),
    deliveryFee: z.number(),
    discount: z.number(),
    total: z.number(),
    currency: z.string(),
    placedAt: z.string(),
    statusHistory: z.array(z.object({
      eventId: z.string().optional(),
      status: statusSchema,
      statusLabel: z.string(),
      at: z.string(),
      note: z.string().optional(),
    })),
  }),
});

const STATUS_VARIANT: Record<OrderStatus, BadgeVariant> = {
  pending: "gold",
  confirmed: "gold",
  preparing: "gold",
  ready_for_pickup: "tomato",
  out_for_delivery: "tomato",
  delivered: "success",
  cancelled: "neutral",
};

const timeFormatter = new Intl.DateTimeFormat("en-PK", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Karachi",
});

type ConnectionState = "connecting" | "live" | "recovering" | "offline";

export function OrderTrackingClient({
  initialOrder,
}: {
  initialOrder: OrderTrackingDto;
}) {
  const [order, setOrder] = useState(initialOrder);
  const [connection, setConnection] = useState<ConnectionState>("connecting");
  const [liveError, setLiveError] = useState<string>();

  const applySnapshot = useCallback((next: OrderTrackingDto) => {
    setOrder((current) => {
      if (next.version <= current.version) return current;
      return next;
    });
  }, []);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/orders/${encodeURIComponent(initialOrder.trackingId)}`,
        { cache: "no-store" },
      );
      if (!response.ok) throw new Error("Could not refresh order state.");
      const parsed = trackingSnapshotSchema.safeParse(await response.json());
      if (!parsed.success) throw new Error("Received an invalid order snapshot.");
      applySnapshot(parsed.data.data);
    } catch {
      setConnection("recovering");
      setLiveError("Live status is temporarily unavailable. Retrying…");
    }
  }, [applySnapshot, initialOrder.trackingId]);

  useEffect(() => {
    let socket: Socket | undefined;
    let disposed = false;

    const onStatus = (payload: unknown) => {
      const parsed = socketOrderEventSchema.safeParse({
        ...(typeof payload === "object" && payload !== null ? payload : {}),
        type: SOCKET_EVENTS.orderStatusChanged,
      });
      if (!parsed.success || parsed.data.type !== SOCKET_EVENTS.orderStatusChanged) return;
      const event = parsed.data;
      setOrder((current) => {
        if (event.version <= current.version || event.trackingId !== current.trackingId) return current;
        const next: OrderTrackingDto = {
          ...current,
          status: event.status,
          statusLabel: event.statusLabel,
          statusDescription: ORDER_STATUS_DESCRIPTIONS[event.status],
          version: event.version,
          updatedAt: event.updatedAt,
          statusHistory: [
            ...current.statusHistory,
            {
              eventId: event.eventId,
              status: event.status,
              statusLabel: event.statusLabel,
              at: event.changedAt,
              note: event.note,
            },
          ],
        };
        return next;
      });
    };
    const onAssigned = (payload: unknown) => {
      const parsed = socketOrderEventSchema.safeParse({
        ...(typeof payload === "object" && payload !== null ? payload : {}),
        type: SOCKET_EVENTS.orderAssigned,
      });
      if (!parsed.success || parsed.data.type !== SOCKET_EVENTS.orderAssigned) return;
      const event = parsed.data;
      setOrder((current) => {
        if (event.version <= current.version || event.trackingId !== current.trackingId) return current;
        const next = {
          ...current,
          version: event.version,
          updatedAt: event.updatedAt,
          fulfillment: {
            ...current.fulfillment,
            deliveryBoyName: event.deliveryBoyName,
            assignedAt: event.assignedAt,
          },
        };
        return next;
      });
    };
    const onLocation = (payload: unknown) => {
      const parsed = socketOrderEventSchema.safeParse({
        ...(typeof payload === "object" && payload !== null ? payload : {}),
        type: SOCKET_EVENTS.deliveryLocation,
      });
      if (!parsed.success || parsed.data.type !== SOCKET_EVENTS.deliveryLocation) return;
      const event = parsed.data;
      setOrder((current) => {
        if (event.version <= current.version || event.trackingId !== current.trackingId) return current;
        const next = {
          ...current,
          version: event.version,
          updatedAt: event.updatedAt,
          fulfillment: {
            ...current.fulfillment,
            lastLocation: {
              coordinates: event.coordinates,
              updatedAt: event.updatedAt,
            },
          },
        };
        return next;
      });
    };

    const connect = async () => {
      try {
        const response = await fetch("/api/realtime/order-ticket", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ trackingId: initialOrder.trackingId }),
          cache: "no-store",
        });
        if (!response.ok) {
          setConnection("offline");
          return;
        }
        const body: unknown = await response.json();
        const ticket = z.object({
          success: z.literal(true),
          data: z.object({ ticket: z.string().min(1) }),
        }).safeParse(body);
        if (!ticket.success || disposed) {
          setConnection("offline");
          return;
        }

        const socketUrl = getClientEnv().socketUrl;
        if (!socketUrl) {
          setConnection("offline");
          return;
        }
        socket = io(socketUrl, {
          auth: { ticket: ticket.data.data.ticket },
          withCredentials: true,
          reconnection: true,
          reconnectionDelayMax: 10_000,
        });
        socket.on("connect", () => {
          setConnection("live");
          setLiveError(undefined);
          socket?.emit(SOCKET_EVENTS.orderJoin, {
            trackingId: initialOrder.trackingId,
          });
          void refresh();
        });
        socket.on("disconnect", () => {
          setConnection("recovering");
          void refresh();
        });
        socket.on("connect_error", () => {
          setConnection("recovering");
          void refresh();
        });
        socket.on(SOCKET_EVENTS.orderStatusChanged, onStatus);
        socket.on(SOCKET_EVENTS.orderAssigned, onAssigned);
        socket.on(SOCKET_EVENTS.deliveryLocation, onLocation);
        socket.on(SOCKET_EVENTS.orderError, () => {
          setLiveError("Live tracking is unavailable; checking the latest order state.");
          void refresh();
        });
      } catch {
        setConnection("offline");
      }
    };

    const initialRefresh = window.setTimeout(() => void refresh(), 0);
    void connect();
    const poll = window.setInterval(() => {
      if (!socket?.connected || document.visibilityState === "visible") {
        void refresh();
      }
    }, 15_000);
    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);

    return () => {
      disposed = true;
      window.clearTimeout(initialRefresh);
      window.clearInterval(poll);
      window.removeEventListener("focus", onFocus);
      socket?.removeAllListeners();
      socket?.disconnect();
    };
  }, [initialOrder.trackingId, refresh]);

  const isDelivery = order.fulfillment.type === "delivery";
  const path: OrderStatus[] = isDelivery
    ? ["pending", "confirmed", "preparing", "out_for_delivery", "delivered"]
    : ["pending", "confirmed", "preparing", "ready_for_pickup", "delivered"];
  const currentStep = path.indexOf(order.status);
  const statusHistory = [...order.statusHistory].reverse();
  const liveLabel: Record<ConnectionState, string> = {
    connecting: "Connecting to live updates",
    live: "Live updates connected",
    recovering: "Reconnecting · checking latest status",
    offline: "Live updates unavailable · status refreshes automatically",
  };

  return (
    <div className="mx-auto max-w-3xl">
      <div className="rounded-2xl border border-charcoal-200/70 bg-white p-5 shadow-[var(--shadow-card)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-charcoal-400">
              Order number
            </p>
            <h1 className="mt-1 font-display text-2xl font-semibold text-charcoal-900">
              {order.orderNumber}
            </h1>
            <p className="mt-1 text-sm text-charcoal-500">
              Placed {timeFormatter.format(new Date(order.placedAt))}
            </p>
          </div>
          <Badge variant={STATUS_VARIANT[order.status]}>{order.statusLabel}</Badge>
        </div>
        <p className="mt-4 text-sm leading-relaxed text-charcoal-600">
          {order.statusDescription}
        </p>
        <div
          className="mt-4 flex items-center gap-2 text-xs text-charcoal-500"
          aria-live="polite"
          aria-label={liveLabel[connection]}
        >
          <Radio
            className={`h-4 w-4 ${
              connection === "live" ? "text-emerald-600" : "text-charcoal-400"
            }`}
          />
          {liveLabel[connection]}
        </div>
        {liveError ? (
          <p role="status" className="mt-2 text-xs text-charcoal-500">
            {liveError}
          </p>
        ) : null}
        <p className="mt-2 text-xs text-charcoal-400">
          Last updated {timeFormatter.format(new Date(order.updatedAt))}
        </p>
      </div>

      {order.status === "cancelled" ? (
        <div className="mt-5 rounded-2xl border border-charcoal-200 bg-cream-100 p-5">
          <h2 className="font-semibold text-charcoal-900">Order cancelled</h2>
          <p className="mt-1 text-sm text-charcoal-600">
            If you have a question about this cancellation, please{" "}
            <Link className="font-semibold text-tomato-600" href="/contact">
              contact our team
            </Link>
            .
          </p>
        </div>
      ) : (
        <section className="mt-5 rounded-2xl border border-charcoal-200/70 bg-white p-5">
          <h2 className="font-display text-base font-semibold text-charcoal-900">
            Order progress
          </h2>
          <ol className="mt-5 grid gap-3 sm:grid-cols-5">
            {path.map((step, index) => {
              const completed = currentStep >= index;
              return (
                <li key={step} className="relative min-w-0">
                  {index > 0 ? (
                    <motion.span
                      initial={false}
                      animate={{ scaleX: completed ? 1 : 0 }}
                      transition={{ duration: 0.35 }}
                      className="absolute -left-3 top-3 hidden h-0.5 w-3 origin-left bg-tomato-500 sm:block"
                    />
                  ) : null}
                  <div className="flex items-center gap-2 sm:flex-col sm:items-start">
                    <motion.span
                      initial={false}
                      animate={{ scale: completed ? 1 : 0.85 }}
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                        completed
                          ? "bg-tomato-600 text-white"
                          : "bg-charcoal-100 text-charcoal-400"
                      }`}
                    >
                      {completed ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
                    </motion.span>
                    <span
                      className={`text-xs ${
                        step === order.status
                          ? "font-semibold text-charcoal-900"
                          : "text-charcoal-500"
                      }`}
                    >
                      {ORDER_STATUS_LABELS[step]}
                    </span>
                  </div>
                </li>
              );
            })}
          </ol>
          <ol className="mt-6 space-y-3 border-t border-charcoal-900/10 pt-4">
            {statusHistory.map((entry, index) => (
              <li key={entry.eventId ?? `${entry.status}-${entry.at}`} className="flex gap-3">
                <span
                  className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${
                    index === 0 ? "bg-tomato-600" : "bg-charcoal-300"
                  }`}
                />
                <div>
                  <p className="text-sm font-medium text-charcoal-900">
                    {entry.statusLabel}
                  </p>
                  <p className="text-xs text-charcoal-400">
                    {timeFormatter.format(new Date(entry.at))}
                    {entry.note ? ` · ${entry.note}` : ""}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}

      {isDelivery && order.fulfillment.etaMinutes ? (
        <p className="mt-5 flex items-center gap-2 rounded-xl bg-cream-100 px-4 py-3 text-sm text-charcoal-600">
          <Clock3 className="h-4 w-4 text-tomato-600" />
          Estimated delivery in about {order.fulfillment.etaMinutes} minutes.
        </p>
      ) : null}

      <section className="mt-5 rounded-2xl border border-charcoal-200/70 bg-white p-5">
        <h2 className="flex items-center gap-2 font-display text-base font-semibold text-charcoal-900">
          {isDelivery ? (
            <Bike className="h-4 w-4 text-tomato-600" />
          ) : (
            <Store className="h-4 w-4 text-tomato-600" />
          )}
          {isDelivery ? "Delivery details" : "Pickup details"}
        </h2>
        {isDelivery && order.fulfillment.address ? (
          <p className="mt-3 flex items-start gap-2 text-sm text-charcoal-600">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-charcoal-400" />
            <span>
              {[
                order.fulfillment.address.label,
                order.fulfillment.address.street,
                order.fulfillment.address.area,
                order.fulfillment.address.city,
              ].filter(Boolean).join(", ")}
              {order.fulfillment.address.instructions ? (
                <span className="mt-1 block text-xs text-charcoal-400">
                  Note: {order.fulfillment.address.instructions}
                </span>
              ) : null}
            </span>
          </p>
        ) : null}
        {order.fulfillment.branchName ? (
          <p className="mt-2 text-sm text-charcoal-600">
            Fulfilled by {order.fulfillment.branchName}
            {order.fulfillment.branchAddress
              ? ` · ${order.fulfillment.branchAddress}`
              : ""}
          </p>
        ) : null}
        {isDelivery && order.fulfillment.deliveryBoyName ? (
          <p className="mt-3 text-sm text-charcoal-600">
            Delivery assigned to{" "}
            <span className="font-semibold text-charcoal-900">
              {order.fulfillment.deliveryBoyName}
            </span>
          </p>
        ) : null}
        {isDelivery && order.fulfillment.lastLocation ? (
          <p className="mt-2 text-xs text-charcoal-500">
            Last shared delivery location:{" "}
            <a
              className="font-semibold text-tomato-600 underline"
              href={`https://www.google.com/maps?q=${order.fulfillment.lastLocation.coordinates.lat},${order.fulfillment.lastLocation.coordinates.lng}`}
              target="_blank"
              rel="noreferrer"
            >
              View on map
            </a>{" "}
            · {timeFormatter.format(new Date(order.fulfillment.lastLocation.updatedAt))}
          </p>
        ) : null}
      </section>

      <section className="mt-5 rounded-2xl border border-charcoal-200/70 bg-white p-5">
        <h2 className="font-display text-base font-semibold text-charcoal-900">
          Your items
        </h2>
        <ul className="mt-4 divide-y divide-charcoal-900/10">
          {order.items.map((item, index) => (
            <li
              key={`${item.slug}-${index}`}
              className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-charcoal-900">
                  <span className="text-charcoal-500">{item.quantity}×</span>{" "}
                  {item.name}
                </p>
                {item.options.length > 0 ? (
                  <ul className="mt-1 text-xs text-charcoal-500">
                    {item.options.map((option, optionIndex) => (
                      <li key={`${option.optionName}-${optionIndex}`}>
                        {option.groupName}: {option.optionName}
                        {option.priceDelta > 0
                          ? ` (+${formatPkr(option.priceDelta)})`
                          : ""}
                      </li>
                    ))}
                  </ul>
                ) : null}
                {item.note ? (
                  <p className="mt-1 text-xs text-charcoal-400">Note: {item.note}</p>
                ) : null}
              </div>
              <p className="shrink-0 text-sm font-semibold text-charcoal-900">
                {formatPkr(item.lineTotal)}
              </p>
            </li>
          ))}
        </ul>
        <dl className="mt-4 space-y-2 border-t border-charcoal-900/10 pt-4 text-sm">
          <div className="flex justify-between">
            <dt className="text-charcoal-500">Subtotal</dt>
            <dd>{formatPkr(order.subtotal)}</dd>
          </div>
          {order.fulfillment.type === "delivery" ? (
            <div className="flex justify-between">
              <dt className="text-charcoal-500">Delivery fee</dt>
              <dd>{formatPkr(order.deliveryFee)}</dd>
            </div>
          ) : null}
          {order.discount > 0 ? (
            <div className="flex justify-between">
              <dt className="text-charcoal-500">Discount</dt>
              <dd className="text-emerald-600">−{formatPkr(order.discount)}</dd>
            </div>
          ) : null}
          <div className="flex justify-between border-t border-charcoal-900/10 pt-2 font-semibold">
            <dt>Total</dt>
            <dd>{formatPkr(order.total)}</dd>
          </div>
        </dl>
      </section>

      {order.status !== "cancelled" &&
      ["pending", "confirmed"].includes(order.status) ? (
        <p className="mt-5 rounded-xl bg-cream-100 px-4 py-3 text-sm text-charcoal-600">
          Need to cancel? Contact us before preparation starts via{" "}
          <Link href="/contact" className="font-semibold text-tomato-600">
            our contact page
          </Link>
          .
        </p>
      ) : null}

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/menu"
          className="inline-flex h-11 items-center rounded-xl bg-tomato-600 px-5 text-sm font-semibold text-white hover:bg-tomato-500"
        >
          Order again
        </Link>
        <Link
          href="/"
          className="inline-flex h-11 items-center rounded-xl border border-charcoal-200 px-5 text-sm font-semibold text-charcoal-700 hover:border-charcoal-300"
        >
          Back home
        </Link>
      </div>
    </div>
  );
}
