import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Container } from "@/components/ui/container";
import { requireRole } from "@/server/middleware/require-auth";
import { getDeliveryDashboardData } from "@/server/services/order.service";
import { OrderManagementClient } from "@/app/admin/orders/order-management-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Delivery dashboard",
  description: "Your assigned deliveries and completion workflow.",
};

export default async function DeliveryDashboardPage() {
  const actor = await requireRole(["delivery_boy"]);
  if (actor.role !== "delivery_boy") redirect("/admin");
  const { orders, completedToday } = await getDeliveryDashboardData(actor.id);

  return (
    <Container className="max-w-5xl py-10 sm:py-14">
      <header className="mb-7">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-tomato-600">Delivery team</p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-charcoal-900">My deliveries</h1>
        <p className="mt-2 text-sm text-charcoal-500">Only orders assigned to your account are shown. Mark a delivery complete only after handoff to the customer.</p>
      </header>
      <div className="mb-5 rounded-xl border border-charcoal-200/70 bg-white px-4 py-3 text-sm text-charcoal-700">
        Completed deliveries today: <strong>{completedToday}</strong>
        <span className="ml-2 text-xs text-charcoal-400">No per-delivery earnings are configured.</span>
      </div>
      <OrderManagementClient
        initialOrders={orders}
        workers={[]}
        canAssign={false}
        canSubscribeWithoutOrder
      />
    </Container>
  );
}
