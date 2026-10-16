import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Receipt } from "lucide-react";
import { auth } from "@/auth";
import { Container } from "@/components/ui/container";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { listOrdersForUser } from "@/server/services/order.service";
import { ORDER_STATUS_LABELS, type OrderStatus } from "@/lib/constants";
import { formatPkr } from "@/lib/utils";

export const metadata: Metadata = {
  title: "My orders",
  description: "Your previous Bachelor's Street orders.",
};

export const dynamic = "force-dynamic";

const STATUS_VARIANT: Record<OrderStatus, BadgeVariant> = {
  pending: "gold",
  confirmed: "gold",
  preparing: "gold",
  ready_for_pickup: "tomato",
  out_for_delivery: "tomato",
  delivered: "success",
  cancelled: "neutral",
};

const dateFormatter = new Intl.DateTimeFormat("en-PK", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Karachi",
});

export default async function OrdersPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/account/orders");
  }

  const orders = await listOrdersForUser(session.user.id);

  return (
    <Container className="max-w-3xl py-12">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-charcoal-900">My orders</h1>
          <p className="mt-1 text-sm text-charcoal-500">
            Track current orders and revisit past ones.
          </p>
        </div>
        <Link
          href="/account"
          className="text-sm font-semibold text-tomato-600 hover:text-tomato-700"
        >
          Back to account
        </Link>
      </div>

      {orders.length === 0 ? (
        <EmptyState
          icon={<Receipt className="h-6 w-6" />}
          title="No orders yet"
          description="When you place an order while signed in, it will appear here."
          action={<Button href="/menu">Browse the menu</Button>}
        />
      ) : (
        <ul className="divide-y divide-charcoal-900/10 overflow-hidden rounded-2xl border border-charcoal-200/70 bg-white">
          {orders.map((order) => (
            <li key={order.id}>
              <Link
                href={`/order/${order.trackingId}`}
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 transition-colors hover:bg-cream-100/60"
              >
                <div>
                  <p className="text-sm font-semibold text-charcoal-900">
                    {order.orderNumber}
                  </p>
                  <p className="mt-0.5 text-xs text-charcoal-400">
                    {dateFormatter.format(new Date(order.placedAt))} ·{" "}
                    {order.fulfillment.type === "delivery"
                      ? "Delivery"
                      : "Pickup"}
                    {` · ${order.items.length} item${order.items.length === 1 ? "" : "s"}`}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={STATUS_VARIANT[order.status]}>
                    {ORDER_STATUS_LABELS[order.status]}
                  </Badge>
                  <span className="text-sm font-semibold text-charcoal-900">
                    {formatPkr(order.total)}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Container>
  );
}
