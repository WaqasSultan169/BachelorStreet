"use client";

import { useEffect, useOptimistic, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { io } from "socket.io-client";
import { AlertTriangle, MapPin, Radio } from "lucide-react";
import { z } from "zod";
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_TRANSITIONS,
} from "@/lib/constants";
import { getClientEnv } from "@/lib/client-env";
import {
  SOCKET_EVENTS,
  socketOrderEventSchema,
} from "@/lib/socket/events";
import type { OrderDto } from "@/server/services/order.service";
import {
  assignDeliveryWorkerAction,
  changeOrderStatusAction,
  updateDeliveryLocationAction,
  recordCashCollectedAction,
} from "@/server/actions/order";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatPkr } from "@/lib/utils";
import Link from "next/link";

type DeliveryWorker = { id: string; name: string };
type LiveConnection = "connecting" | "live" | "offline";

export function OrderManagementClient({
  initialOrders,
  workers,
  canAssign,
  canSubscribeWithoutOrder,
}: {
  initialOrders: OrderDto[];
  workers: DeliveryWorker[];
  canAssign: boolean;
  canSubscribeWithoutOrder: boolean;
}) {
  const router = useRouter();
  const [orders, setOrders] = useOptimistic(
    initialOrders,
    (current, updated: OrderDto) =>
      current.map((order) => order.id === updated.id ? updated : order),
  );
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string>();
  const [connection, setConnection] = useState<LiveConnection>("connecting");
  const trackingIdsKey = initialOrders.map((order) => order.trackingId).join(",");

  useEffect(() => {
    let socket: ReturnType<typeof io> | undefined;
    let disposed = false;
    const refresh = () => router.refresh();
    const start = async () => {
      const trackingIds = trackingIdsKey ? trackingIdsKey.split(",") : [];
      const firstTrackingId = trackingIds[0];
      if (!firstTrackingId && !canSubscribeWithoutOrder) {
        setConnection("offline");
        return;
      }
      try {
        const response = await fetch("/api/realtime/order-ticket", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(firstTrackingId ? { trackingId: firstTrackingId } : {}),
          cache: "no-store",
        });
        if (!response.ok || disposed) {
          setConnection("offline");
          return;
        }
        const parsed = z.object({
          success: z.literal(true),
          data: z.object({ ticket: z.string().min(1) }),
        }).safeParse(await response.json());
        const url = getClientEnv().socketUrl;
        if (!parsed.success || !url || disposed) {
          setConnection("offline");
          return;
        }
        socket = io(url, { auth: { ticket: parsed.data.data.ticket }, reconnection: true });
        socket.on("connect", () => {
          setConnection("live");
          if (trackingIds.length > 0) {
            socket?.emit(SOCKET_EVENTS.orderJoin, {
              trackingIds,
            });
          }
          refresh();
        });
        socket.on("disconnect", () => {
          setConnection("offline");
          refresh();
        });
        socket.on("connect_error", () => {
          setConnection("offline");
          refresh();
        });
        for (const eventName of [
          SOCKET_EVENTS.orderStatusChanged,
          SOCKET_EVENTS.orderAssigned,
          SOCKET_EVENTS.deliveryLocation,
          SOCKET_EVENTS.orderCreated,
        ]) {
          socket.on(eventName, (payload: unknown) => {
            const validated = socketOrderEventSchema.safeParse({
              ...(typeof payload === "object" && payload !== null ? payload : {}),
              type: eventName,
            });
            if (validated.success) refresh();
          });
        }
      } catch {
        setConnection("offline");
        setMessage("Live order updates are unavailable; refresh to check for changes.");
      }
    };
    void start();
    const interval = window.setInterval(refresh, 20_000);
    return () => {
      disposed = true;
      window.clearInterval(interval);
      socket?.removeAllListeners();
      socket?.disconnect();
    };
  }, [canSubscribeWithoutOrder, router, trackingIdsKey]);

  const runAction = (
    operation: () => Promise<{ ok: true; order: OrderDto } | { ok: false; error: string }>,
  ) => {
    setMessage(undefined);
    startTransition(async () => {
      const result = await operation();
      if (!result.ok) {
        setMessage(result.error);
        return;
      }
      setOrders(result.order);
      setMessage(`Updated ${result.order.orderNumber}.`);
      router.refresh();
    });
  };

  const updateLocation = (orderId: string) => {
    if (!navigator.geolocation) {
      setMessage("Location sharing is not supported by this browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) =>
        runAction(() =>
          updateDeliveryLocationAction({
            orderId,
            coordinates: { lat: coords.latitude, lng: coords.longitude },
          }),
        ),
      () => setMessage("Location permission was not granted."),
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 15_000 },
    );
  };

  return (
    <div>
      <div className="mb-5 flex items-center gap-2 text-xs text-charcoal-500">
        <Radio className={`h-4 w-4 ${connection === "live" ? "text-emerald-600" : "text-charcoal-400"}`} />
        {connection === "live"
          ? "Live order updates connected. Changes are saved to MongoDB before they are broadcast."
          : "Live updates reconnect automatically; the order list also refreshes periodically."}
      </div>
      {message ? (
        <p role="status" className="mb-4 rounded-xl bg-cream-100 px-4 py-3 text-sm text-charcoal-700">
          {message}
        </p>
      ) : null}
      {orders.length === 0 ? (
        <p className="rounded-2xl border border-charcoal-200 bg-white p-6 text-sm text-charcoal-500">
          No orders are available for your staff account yet.
        </p>
      ) : (
        <ul className="grid gap-4">
          {orders.map((order) => {
            const choices = ORDER_STATUS_TRANSITIONS[order.fulfillment.type][order.status]
              .filter((status) => canAssign || status === "delivered");
            const canChangeStatus =
              canAssign ||
              (order.fulfillment.type === "delivery" &&
                order.status === "out_for_delivery");
            return (
              <li key={order.id} className="rounded-2xl border border-charcoal-200/70 bg-white p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-display text-lg font-semibold text-charcoal-900">
                      {order.orderNumber}
                    </p>
                    <p className="mt-1 text-xs text-charcoal-500">
                      {order.contact.name} · {order.fulfillment.type === "delivery" ? "Delivery" : "Pickup"}
                      {order.fulfillment.branchName ? ` · ${order.fulfillment.branchName}` : ""}
                    </p>
                    <p className="mt-1 text-xs text-charcoal-400">
                      {order.items.map((item) => `${item.quantity}× ${item.name}`).join(", ")}
                    </p>
                    {!canAssign ? (
                      <div className="mt-2 space-y-1 text-xs text-charcoal-600">
                        <a className="block font-semibold text-tomato-700" href={`tel:${order.contact.phone}`}>Call customer: {order.contact.phone}</a>
                        {order.fulfillment.type === "delivery" && order.fulfillment.address ? (
                          <p>
                            Deliver to: {order.fulfillment.address.label},{" "}
                            {[order.fulfillment.address.street, order.fulfillment.address.area, order.fulfillment.address.city].filter(Boolean).join(", ")}
                            {order.fulfillment.address.instructions ? ` · Directions: ${order.fulfillment.address.instructions}` : ""}
                          </p>
                        ) : null}
                        {order.fulfillment.branchName ? <p>Pickup: {order.fulfillment.branchName}{order.fulfillment.branchAddress ? ` · ${order.fulfillment.branchAddress}` : ""}</p> : null}
                      </div>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={order.status === "delivered" ? "success" : order.status === "cancelled" ? "neutral" : "gold"}>
                      {order.statusLabel}
                    </Badge>
                    <span className="text-sm font-semibold text-charcoal-900">
                      {formatPkr(order.total)}
                    </span>
                  </div>
                  <Link href={`/admin/orders/${order.id}`} className="mt-3 inline-block text-xs font-semibold text-tomato-600">View order details and history</Link>
                </div>

                {order.fulfillment.type === "delivery" && canAssign ? (
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <label htmlFor={`worker-${order.id}`} className="text-xs font-semibold text-charcoal-600">
                      Delivery assignment
                    </label>
                    <select
                      id={`worker-${order.id}`}
                      value={order.fulfillment.deliveryBoyId ?? ""}
                      onChange={(event) => {
                        const deliveryBoyId = event.target.value;
                        if (deliveryBoyId) {
                          runAction(() => assignDeliveryWorkerAction({ orderId: order.id, deliveryBoyId }));
                        }
                      }}
                      disabled={pending}
                      className="rounded-lg border border-charcoal-200 bg-white px-3 py-2 text-sm"
                    >
                      <option value="" disabled>
                        {order.fulfillment.deliveryBoyName ?? "Choose delivery worker"}
                      </option>
                      {workers.map((worker) => (
                        <option key={worker.id} value={worker.id}>{worker.name}</option>
                      ))}
                    </select>
                    {order.fulfillment.deliveryBoyName ? (
                      <span className="text-xs text-charcoal-500">Assigned to {order.fulfillment.deliveryBoyName}</span>
                    ) : null}
                  </div>
                ) : null}

                {canChangeStatus && choices.length > 0 ? (
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold text-charcoal-600">Next status</span>
                    {choices.map((status) => (
                      <Button
                        key={status}
                        type="button"
                        size="sm"
                        variant={status === "cancelled" ? "outline" : "primary"}
                        disabled={pending}
                        onClick={() => {
                          const note = status === "cancelled"
                            ? window.prompt("Enter the reason for rejecting or cancelling this order.")
                            : undefined;
                          if (status === "cancelled" && !note?.trim()) {
                            setMessage("A cancellation reason is required.");
                            return;
                          }
                          runAction(() => changeOrderStatusAction({
                            orderId: order.id,
                            status,
                            note: note?.trim(),
                          }));
                        }}
                      >
                        {status === "cancelled"
                          ? order.status === "pending" ? "Reject order" : "Cancel order"
                          : ORDER_STATUS_LABELS[status]}
                      </Button>
                    ))}
                  </div>
                ) : null}

                {order.fulfillment.type === "delivery" &&
                order.status === "out_for_delivery" ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    loading={pending}
                    onClick={() => updateLocation(order.id)}
                  >
                    <MapPin className="h-4 w-4" />
                    Share current location
                  </Button>
                ) : null}

                {order.status === "delivered" &&
                order.paymentMethod === "cash_on_delivery" &&
                order.paymentStatus !== "paid" &&
                (canAssign || order.fulfillment.deliveryBoyId) ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    loading={pending}
                    onClick={() => runAction(() => recordCashCollectedAction({ orderId: order.id }))}
                  >
                    Record cash collected
                  </Button>
                ) : null}
                {order.status === "cancelled" ? (
                  <p className="mt-3 flex items-center gap-2 text-xs text-charcoal-500">
                    <AlertTriangle className="h-4 w-4" />
                    Cancelled orders cannot be reopened.
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
