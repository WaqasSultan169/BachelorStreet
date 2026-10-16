import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/container";
import { Badge } from "@/components/ui/badge";
import { requireRole } from "@/server/middleware/require-auth";
import { getOrderDetail } from "@/server/services/admin.service";
import { ORDER_STATUS_LABELS } from "@/lib/constants";
import { formatPkr } from "@/lib/utils";
import { isAppError } from "@/lib/errors";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Order details",
  description: "Order fulfillment and audit details.",
};

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const actor = await requireRole(["admin", "delivery_boy"]);
  const { orderId } = await params;
  let order;
  try {
    order = await getOrderDetail(orderId, { id: actor.id, role: actor.role });
  } catch (error) {
    if (isAppError(error) && (error.code === "NOT_FOUND" || error.code === "FORBIDDEN")) {
      notFound();
    }
    throw error;
  }

  return (
    <Container className="max-w-4xl py-10 sm:py-14">
      <Link href={actor.role === "delivery_boy" ? "/delivery" : "/admin/orders"} className="text-sm font-semibold text-tomato-600">
        ← Back to orders
      </Link>
      <header className="mt-5 flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-charcoal-200/70 bg-white p-5">
        <div>
          <p className="text-xs uppercase tracking-wide text-charcoal-400">Order</p>
          <h1 className="mt-1 font-display text-2xl font-semibold text-charcoal-900">{order.orderNumber}</h1>
          <p className="mt-1 text-sm text-charcoal-500">{new Date(order.placedAt).toLocaleString("en-PK", { timeZone: "Asia/Karachi" })}</p>
        </div>
        <div className="text-right">
          <Badge variant={order.status === "delivered" ? "success" : order.status === "cancelled" ? "neutral" : "gold"}>{ORDER_STATUS_LABELS[order.status]}</Badge>
          <p className="mt-2 font-semibold text-charcoal-900">{formatPkr(order.total)}</p>
          <p className="text-xs text-charcoal-500">Payment {order.paymentStatus}</p>
        </div>
      </header>

      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <section className="rounded-2xl border border-charcoal-200/70 bg-white p-5">
          <h2 className="font-semibold text-charcoal-900">Customer</h2>
          <p className="mt-3 text-sm font-medium">{order.contact.name}</p>
          <p className="mt-1 text-sm text-charcoal-600"><a href={`tel:${order.contact.phone}`}>{order.contact.phone}</a></p>
          <p className="mt-1 text-sm text-charcoal-600"><a href={`mailto:${order.contact.email}`}>{order.contact.email}</a></p>
          {order.customerNote ? <p className="mt-3 text-sm text-charcoal-600">Order note: {order.customerNote}</p> : null}
        </section>
        <section className="rounded-2xl border border-charcoal-200/70 bg-white p-5">
          <h2 className="font-semibold text-charcoal-900">Fulfillment</h2>
          <p className="mt-3 text-sm capitalize">{order.fulfillment.type} · {order.fulfillment.branchName ?? "Branch not recorded"}</p>
          {order.fulfillment.branchAddress ? <p className="mt-1 text-sm text-charcoal-600">{order.fulfillment.branchAddress}</p> : null}
          {order.fulfillment.address ? (
            <address className="mt-3 not-italic text-sm text-charcoal-700">
              {order.fulfillment.address.label}<br />
              {[order.fulfillment.address.street, order.fulfillment.address.area, order.fulfillment.address.city].filter(Boolean).join(", ")}
              {order.fulfillment.address.instructions ? <><br />Directions: {order.fulfillment.address.instructions}</> : null}
            </address>
          ) : null}
          {order.fulfillment.deliveryBoyName ? <p className="mt-3 text-sm text-charcoal-600">Assigned to {order.fulfillment.deliveryBoyName}</p> : null}
        </section>
      </div>

      <section className="mt-5 rounded-2xl border border-charcoal-200/70 bg-white p-5">
        <h2 className="font-semibold text-charcoal-900">Items and totals</h2>
        <ul className="mt-3 divide-y divide-charcoal-100">
          {order.items.map((item, index) => (
            <li key={`${item.slug}-${index}`} className="py-3 text-sm">
              <div className="flex justify-between gap-4"><span>{item.quantity} × {item.name}</span><span>{formatPkr(item.lineTotal)}</span></div>
              {item.options.length ? <p className="mt-1 text-xs text-charcoal-500">{item.options.map((option) => `${option.groupName}: ${option.optionName}`).join(" · ")}</p> : null}
              {item.note ? <p className="mt-1 text-xs text-charcoal-500">Item note: {item.note}</p> : null}
            </li>
          ))}
        </ul>
        <dl className="mt-3 border-t border-charcoal-100 pt-3 text-sm">
          <div className="flex justify-between py-1"><dt>Subtotal</dt><dd>{formatPkr(order.subtotal)}</dd></div>
          <div className="flex justify-between py-1"><dt>Discount</dt><dd>−{formatPkr(order.discount)}</dd></div>
          <div className="flex justify-between py-1"><dt>Delivery</dt><dd>{formatPkr(order.deliveryFee)}</dd></div>
          <div className="flex justify-between pt-2 font-semibold"><dt>Total</dt><dd>{formatPkr(order.total)}</dd></div>
        </dl>
      </section>

      <section className="mt-5 grid gap-5 md:grid-cols-2">
        <div className="rounded-2xl border border-charcoal-200/70 bg-white p-5">
          <h2 className="font-semibold text-charcoal-900">Status history</h2>
          <ol className="mt-3 space-y-3">
            {[...order.statusHistory].reverse().map((entry, index) => (
              <li key={entry.eventId ?? `${entry.status}-${entry.at}-${index}`} className="text-sm">
                <p className="font-medium">{entry.statusLabel}</p>
                <p className="text-xs text-charcoal-500">{new Date(entry.at).toLocaleString("en-PK", { timeZone: "Asia/Karachi" })}{entry.note ? ` · ${entry.note}` : ""}</p>
              </li>
            ))}
          </ol>
        </div>
        <div className="rounded-2xl border border-charcoal-200/70 bg-white p-5">
          <h2 className="font-semibold text-charcoal-900">Assignment history</h2>
          <ol className="mt-3 space-y-3">
            {[...order.fulfillmentHistory].reverse().map((entry) => (
              <li key={entry.eventId} className="text-sm">
                <p className="font-medium">{entry.type === "assigned" ? `Assigned to ${entry.deliveryBoyName ?? entry.deliveryBoyId ?? "a delivery worker"}` : "Delivery location updated"}</p>
                <p className="text-xs text-charcoal-500">{new Date(entry.at).toLocaleString("en-PK", { timeZone: "Asia/Karachi" })}</p>
              </li>
            ))}
            {order.fulfillmentHistory.length === 0 ? <li className="text-sm text-charcoal-500">No assignment events recorded.</li> : null}
          </ol>
        </div>
      </section>
    </Container>
  );
}
