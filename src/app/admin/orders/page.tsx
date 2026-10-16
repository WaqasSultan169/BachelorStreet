import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { requireRole } from "@/server/middleware/require-auth";
import {
  listDeliveryWorkers,
  listOrdersForStaff,
} from "@/server/services/order.service";
import { searchAdminOrders } from "@/server/services/admin.service";
import { OrderManagementClient } from "@/app/admin/orders/order-management-client";
import { ORDER_STATUSES, ORDER_STATUS_LABELS } from "@/lib/constants";
import { formatPkr } from "@/lib/utils";
import Link from "next/link";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Live order management",
  description: "Manage and track active café orders.",
};

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string | string[];
    status?: string | string[];
    fulfillment?: string | string[];
    page?: string | string[];
  }>;
}) {
  const actor = await requireRole(["admin", "delivery_boy"]);
  const query = await searchParams;
  const value = (item: string | string[] | undefined) =>
    Array.isArray(item) ? item[0] : item;
  const pageValue = Number(value(query.page) ?? "1");
  const page = Number.isInteger(pageValue) && pageValue > 0 ? pageValue : 1;
  const statusValue = value(query.status);
  const fulfillmentValue = value(query.fulfillment);
  const adminResults = actor.role === "admin"
    ? await searchAdminOrders({
        q: value(query.q)?.slice(0, 100),
        status: ORDER_STATUSES.includes(statusValue as (typeof ORDER_STATUSES)[number])
          ? statusValue
          : undefined,
        fulfillment: fulfillmentValue === "pickup" || fulfillmentValue === "delivery"
          ? fulfillmentValue
          : undefined,
        page,
        pageSize: 20,
      })
    : undefined;
  const orders = adminResults?.items ?? await listOrdersForStaff(
    { id: actor.id, role: actor.role },
    25,
  );
  const workers =
    actor.role === "admin" ? await listDeliveryWorkers() : [];

  return (
    <Container className="max-w-5xl py-10 sm:py-14">
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-tomato-600">
          Staff
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-charcoal-900">
          Live orders
        </h1>
        <p className="mt-2 text-sm text-charcoal-500">
          Status transitions and assignments are authorized server-side and saved before customers are notified.
        </p>
      </div>
      {adminResults ? (
        <section className="mb-8 rounded-2xl border border-charcoal-200/70 bg-white p-5">
          <h2 className="font-display text-lg font-semibold text-charcoal-900">Order search</h2>
          <form className="mt-4 grid gap-3 sm:grid-cols-4">
            <label className="text-xs font-semibold text-charcoal-600 sm:col-span-2">
              Search by order number, customer, email, or phone
              <input name="q" defaultValue={value(query.q)} className="mt-1 w-full rounded-lg border border-charcoal-200 px-3 py-2 text-sm font-normal" />
            </label>
            <label className="text-xs font-semibold text-charcoal-600">
              Status
              <select name="status" defaultValue={statusValue ?? ""} className="mt-1 w-full rounded-lg border border-charcoal-200 bg-white px-3 py-2 text-sm font-normal">
                <option value="">All statuses</option>
                {ORDER_STATUSES.map((status) => <option key={status} value={status}>{ORDER_STATUS_LABELS[status]}</option>)}
              </select>
            </label>
            <label className="text-xs font-semibold text-charcoal-600">
              Fulfillment
              <select name="fulfillment" defaultValue={fulfillmentValue ?? ""} className="mt-1 w-full rounded-lg border border-charcoal-200 bg-white px-3 py-2 text-sm font-normal">
                <option value="">All types</option>
                <option value="pickup">Pickup</option>
                <option value="delivery">Delivery</option>
              </select>
            </label>
            <div className="flex items-end gap-2 sm:col-span-4">
              <button className="rounded-lg bg-charcoal-900 px-4 py-2 text-sm font-semibold text-white">Filter orders</button>
              <span className="text-xs text-charcoal-500">{adminResults.total} orders · page {adminResults.page} of {adminResults.totalPages}</span>
            </div>
          </form>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead className="text-xs uppercase text-charcoal-400">
                <tr><th className="py-2">Order</th><th>Customer</th><th>Fulfillment</th><th>Status</th><th>Payment</th><th className="text-right">Total</th></tr>
              </thead>
              <tbody className="divide-y divide-charcoal-100">
                {adminResults.items.map((order) => (
                  <tr key={order.id}>
                    <td className="py-3"><Link href={`/admin/orders/${order.id}`} className="font-semibold text-tomato-700">{order.orderNumber}</Link></td>
                    <td>{order.contact.name}<span className="block text-xs text-charcoal-400">{order.contact.phone}</span></td>
                    <td>{order.fulfillment.type}</td>
                    <td>{ORDER_STATUS_LABELS[order.status]}</td>
                    <td>{order.paymentStatus === "paid" ? "Paid" : "Unpaid"}</td>
                    <td className="text-right">{formatPkr(order.total)}</td>
                  </tr>
                ))}
                {adminResults.items.length === 0 ? <tr><td colSpan={6} className="py-5 text-center text-charcoal-500">No matching orders.</td></tr> : null}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex justify-between">
            {adminResults.page > 1 ? (
              <Link className="text-sm font-semibold text-tomato-600" href={orderPageHref(query, adminResults.page - 1)}>Previous page</Link>
            ) : <span />}
            {adminResults.page < adminResults.totalPages ? (
              <Link className="text-sm font-semibold text-tomato-600" href={orderPageHref(query, adminResults.page + 1)}>Next page</Link>
            ) : null}
          </div>
        </section>
      ) : null}
      <OrderManagementClient
        initialOrders={orders}
        workers={workers}
        canAssign={actor.role === "admin"}
        canSubscribeWithoutOrder
      />
    </Container>
  );
}

function orderPageHref(
  query: { q?: string | string[]; status?: string | string[]; fulfillment?: string | string[] },
  page: number,
): string {
  const params = new URLSearchParams();
  const get = (value: string | string[] | undefined) =>
    Array.isArray(value) ? value[0] : value;
  for (const key of ["q", "status", "fulfillment"] as const) {
    const value = get(query[key]);
    if (value) params.set(key, value);
  }
  params.set("page", String(page));
  return `/admin/orders?${params.toString()}`;
}
