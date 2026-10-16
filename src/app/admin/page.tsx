import type { Metadata } from "next";
import Link from "next/link";
import {
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock,
  Info,
  TrendingUp,
  Users,
  UtensilsCrossed,
  Wallet,
} from "lucide-react";
import { requireRole } from "@/server/middleware/require-auth";
import { getAdminOverview, type AdminRange } from "@/server/services/admin.service";
import { formatPkr } from "@/lib/utils";
import { ORDER_STATUS_LABELS } from "@/lib/constants";
import {
  CustomerGrowthChart,
  RevenueOrdersChart,
  StatusDistributionChart,
  TopProductsChart,
} from "@/components/admin/dashboard-charts";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Administration dashboard",
  description: "Operations, orders, products, promotions and hero campaigns.",
};

type AdminOverview = Awaited<ReturnType<typeof getAdminOverview>>;

const QUICK_LINKS = [
  { title: "All orders", href: "/admin/orders", copy: "Search, track and manage customer orders." },
  { title: "Add a product", href: "/admin/catalog", copy: "Products, categories and availability." },
  { title: "Create a deal", href: "/admin/promotions", copy: "Discount codes and promotional offers." },
  { title: "Manage hero slides", href: "/admin/hero", copy: "Homepage campaign posters and CTAs." },
  { title: "Delivery personnel", href: "/admin/staff", copy: "Riders, roles and notification consent." },
  { title: "Customers", href: "/admin/customers", copy: "Customer accounts and access." },
] as const;

function isRange(value: string | undefined): value is AdminRange {
  return value === "7d" || value === "30d" || value === "90d";
}

const STATUS_BADGE: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  confirmed: "bg-blue-100 text-blue-800",
  preparing: "bg-flame-100 text-flame-700",
  ready_for_pickup: "bg-indigo-100 text-indigo-800",
  out_for_delivery: "bg-violet-100 text-violet-800",
  delivered: "bg-emerald-100 text-emerald-800",
  cancelled: "bg-tomato-100 text-tomato-700",
};

function formatOrderDate(value: string): string {
  return new Intl.DateTimeFormat("en-PK", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "UTC",
  }).format(new Date(value));
}

type Delta = { value: number; label: string };

function KpiCard({
  label,
  value,
  helper,
  href,
  icon: Icon,
  delta,
}: {
  label: string;
  value: string | number;
  helper: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  delta?: Delta;
}) {
  const positive = delta ? delta.value >= 0 : false;
  return (
    <Link
      href={href}
      className="group rounded-2xl bg-white p-5 shadow-sm ring-1 ring-charcoal-200/70 transition-all hover:-translate-y-0.5 hover:shadow-(--shadow-card) hover:ring-flame-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tomato-500"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-charcoal-500">{label}</p>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-flame-500/10 text-flame-600 transition-colors group-hover:bg-flame-500/15">
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-3 font-display text-3xl font-black tracking-tight text-charcoal-900">
        {value}
      </p>
      <div className="mt-1 flex flex-wrap items-center gap-2">
        <p className="text-xs text-charcoal-500">{helper}</p>
        {delta ? (
          <span
            className={
              positive
                ? "rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-700"
                : "rounded-full bg-tomato-100 px-2 py-0.5 text-[11px] font-bold text-tomato-700"
            }
          >
            {positive ? "▲" : "▼"} {Math.abs(delta.value)}% {delta.label}
          </span>
        ) : null}
      </div>
    </Link>
  );
}

function DashboardError({ range }: { range: AdminRange }) {
  return (
    <div className="rounded-2xl border border-tomato-300 bg-tomato-100/50 p-6">
      <h2 className="font-display text-lg font-bold text-tomato-700">
        We could not load dashboard metrics
      </h2>
      <p className="mt-2 text-sm text-charcoal-600">
        The analytics query failed. Data shown elsewhere in the admin area is unaffected. Try again
        with a different range or reload the page.
      </p>
      <form className="mt-4 flex flex-wrap items-center gap-2">
        <label htmlFor="range" className="text-sm font-medium text-charcoal-600">
          Date range
        </label>
        <select
          id="range"
          name="range"
          defaultValue={range}
          className="rounded-lg border border-charcoal-200 bg-white px-3 py-2 text-sm"
        >
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="90d">Last 90 days</option>
        </select>
        <button className="rounded-lg bg-tomato-600 px-4 py-2 text-sm font-semibold text-white hover:bg-tomato-700">
          Retry
        </button>
      </form>
    </div>
  );
}

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  await requireRole(["admin"]);
  const query = await searchParams;
  const range = isRange(query.range) ? query.range : "30d";

  let data: AdminOverview | null = null;
  try {
    data = await getAdminOverview(range);
  } catch {
    data = null;
  }

  const header = (
    <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-tomato-600">Operations</p>
        <h1 className="mt-2 font-display text-3xl font-black tracking-tight text-charcoal-900">
          Dashboard overview
        </h1>
        {/* <p className="mt-2 max-w-3xl text-sm text-charcoal-500">
          Live metrics from MongoDB. Paid revenue is separated from unpaid cash-on-delivery orders.
        </p> */}
      </div>
      <form className="flex flex-wrap items-center gap-2 rounded-2xl bg-white p-2 shadow-sm ring-1 ring-charcoal-200/70">
        <label htmlFor="range" className="px-2 text-sm font-medium text-charcoal-600">
          Date range
        </label>
        <select
          id="range"
          name="range"
          defaultValue={range}
          className="rounded-lg border border-charcoal-200 bg-cream-50 px-3 py-2 text-sm text-charcoal-800"
        >
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="90d">Last 90 days</option>
        </select>
        <button className="rounded-lg bg-charcoal-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-charcoal-800">
          Apply
        </button>
      </form>
    </header>
  );

  if (!data) {
    return (
      <div className="space-y-6">
        {header}
        <DashboardError range={range} />
      </div>
    );
  }

  const today = data.trend.at(-1);
  const yesterday = data.trend.at(-2);
  const todayOrders = today?.orders ?? 0;
  const averageOrderValue = data.paidOrders > 0 ? data.revenue / data.paidOrders : 0;
  const deliveryStats = data.deliveryStats;

  /**
   * Percentage change is only shown when there is a real, comparable previous
   * period (yesterday) with a non-zero base. Otherwise no delta is rendered.
   */
  function deltaPercent(current?: number, previous?: number): Delta | undefined {
    if (current === undefined || previous === undefined || previous <= 0) return undefined;
    return {
      value: Math.round(((current - previous) / previous) * 100),
      label: "vs yesterday",
    };
  }

  const kpis = [
    {
      label: "Total revenue",
      value: formatPkr(data.revenue),
      helper: "Paid orders in range",
      href: "/admin/orders",
      icon: Wallet,
    },
    {
      label: "Today's revenue",
      value: formatPkr(today?.revenue ?? 0),
      helper: "Paid today (UTC)",
      href: "/admin/orders",
      icon: TrendingUp,
      delta: deltaPercent(today?.revenue, yesterday?.revenue),
    },
    {
      label: "Total orders",
      value: data.rangeOrders,
      helper: "Orders in range",
      href: "/admin/orders",
      icon: ClipboardList,
    },
    {
      label: "Today's orders",
      value: todayOrders,
      helper: "Placed today (UTC)",
      href: "/admin/orders",
      icon: CalendarDays,
      delta: deltaPercent(today?.orders, yesterday?.orders),
    },
    {
      label: "Pending orders",
      value: data.live.pending,
      helper: "Awaiting confirmation",
      href: "/admin/orders?status=pending",
      icon: Clock,
    },
    {
      label: "Completed orders",
      value: data.counts.completed,
      helper: "Delivered in range",
      href: "/admin/orders?status=delivered",
      icon: CheckCircle2,
    },
    {
      label: "Total customers",
      value: data.totalCustomers,
      helper: "Registered accounts",
      href: "/admin/customers",
      icon: Users,
    },
    {
      label: "Active menu items",
      value: data.activeProducts,
      helper: "Available on the menu",
      href: "/admin/catalog",
      icon: UtensilsCrossed,
    },
  ];

  const statusDistribution = data.statusDistribution.map((entry) => ({
    ...entry,
    label: ORDER_STATUS_LABELS[entry.status],
  }));

  const topItems = data.topItems.map((item) => ({
    id: String(item._id),
    name: item.name,
    quantity: item.quantity,
    revenue: item.revenue,
  }));

  const deliveryRows = [
    { label: "Assigned", value: deliveryStats.assigned, tone: "bg-blue-500" },
    { label: "Active", value: deliveryStats.active, tone: "bg-flame-500" },
    { label: "Completed", value: deliveryStats.completed, tone: "bg-emerald-500" },
    { label: "Unassigned", value: deliveryStats.unassigned, tone: "bg-charcoal-400" },
  ];
  const deliveryTotal = Math.max(1, deliveryRows.reduce((sum, row) => sum + row.value, 0));

  return (
    <div className="space-y-6">
      {header}

      {/* {data.demo.orders > 0 || data.demo.customers > 0 ? (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <p>
            This environment contains <strong>{data.demo.orders} demo orders</strong> and{" "}
            <strong>{data.demo.customers} demo customers</strong> created by the development seeder.
            They are labelled <span className="font-semibold">Demo</span> and are separate from real
            records.
          </p>
        </div>
      ) : null} */}

      <section aria-label="Key metrics" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <KpiCard key={kpi.label} {...kpi} />
        ))}
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-charcoal-200/70">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-charcoal-500">
            Paid revenue
          </p>
          <p className="mt-2 font-display text-2xl font-black text-charcoal-900">
            {formatPkr(data.revenue)}
          </p>
          <p className="mt-1 text-xs text-charcoal-500">{data.paidOrders} paid orders</p>
        </div>
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-charcoal-200/70">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-charcoal-500">
            Unpaid COD orders
          </p>
          <p className="mt-2 font-display text-2xl font-black text-charcoal-900">
            {data.unpaidOrderCount}
          </p>
          <p className="mt-1 text-xs text-charcoal-500">Not counted as revenue</p>
        </div>
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-charcoal-200/70">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-charcoal-500">
            Average paid order
          </p>
          <p className="mt-2 font-display text-2xl font-black text-charcoal-900">
            {formatPkr(averageOrderValue)}
          </p>
          <p className="mt-1 text-xs text-charcoal-500">Across paid orders in range</p>
        </div>
      </section>

      <RevenueOrdersChart data={data.trend} />

      <section className="grid gap-6 xl:grid-cols-2">
        <StatusDistributionChart data={statusDistribution} />
        <CustomerGrowthChart data={data.customerGrowth} />
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <TopProductsChart data={topItems} />

        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-charcoal-200/70">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-bold text-charcoal-900">
                Delivery performance
              </h2>
              <p className="mt-1 text-sm text-charcoal-500">
                Delivery-type orders from the selected range.
              </p>
            </div>
            <span className="rounded-full bg-charcoal-100 px-3 py-1 text-xs font-bold text-charcoal-700">
              {deliveryStats.averageCompletionMinutes !== null
                ? `~${deliveryStats.averageCompletionMinutes} min avg completion`
                : "Avg completion unavailable"}
            </span>
          </div>
          <div className="mt-6 space-y-4">
            {deliveryRows.map((row) => (
              <div key={row.label}>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-charcoal-700">{row.label}</span>
                  <span className="font-bold text-charcoal-900">{row.value}</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-charcoal-100">
                  <div
                    className={`h-full rounded-full ${row.tone}`}
                    style={{ width: `${Math.min(100, (row.value / deliveryTotal) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,.6fr)]">
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-charcoal-200/70">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-xl font-bold text-charcoal-900">Recent orders</h2>
            <Link href="/admin/orders" className="text-sm font-semibold text-tomato-600 hover:text-tomato-700">
              View all
            </Link>
          </div>
          {data.recentOrders.length === 0 ? (
            <p className="mt-4 rounded-xl border border-dashed border-charcoal-300 px-4 py-8 text-center text-sm text-charcoal-500">
              No orders in this range.
            </p>
          ) : (
            <div className="mt-4 -mx-5 overflow-x-auto px-5">
              <table className="w-full min-w-180 text-left text-sm">
                <thead>
                  <tr className="border-b border-charcoal-200 text-xs uppercase tracking-[0.12em] text-charcoal-500">
                    <th className="py-2 pr-4 font-bold">Order</th>
                    <th className="py-2 pr-4 font-bold">Customer</th>
                    <th className="py-2 pr-4 font-bold">Placed</th>
                    <th className="py-2 pr-4 font-bold">Status</th>
                    <th className="py-2 pr-4 font-bold">Payment</th>
                    <th className="py-2 text-right font-bold">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentOrders.map((order) => (
                    <tr
                      key={order.id}
                      className="border-b border-charcoal-100 transition-colors last:border-0 hover:bg-cream-100/70"
                    >
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/admin/orders/${order.id}`}
                            className="font-semibold text-charcoal-900 hover:text-tomato-600"
                          >
                            {order.orderNumber}
                          </Link>
                          {order.isDemo ? (
                            <span className="rounded-full bg-charcoal-900 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-cream-50">
                              Demo
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-0.5 text-xs capitalize text-charcoal-400">
                          {order.fulfillment.type}
                        </p>
                      </td>
                      <td className="py-3 pr-4">
                        <p className="font-medium text-charcoal-800">{order.contact.name}</p>
                        <p className="mt-0.5 text-xs text-charcoal-400">
                          {order.fulfillment.type === "delivery" ? "Delivery" : "Pickup"}
                        </p>
                      </td>
                      <td className="py-3 pr-4 whitespace-nowrap text-charcoal-600">
                        {formatOrderDate(order.placedAt)}
                      </td>
                      <td className="py-3 pr-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                            STATUS_BADGE[order.status] ?? "bg-charcoal-100 text-charcoal-700"
                          }`}
                        >
                          {ORDER_STATUS_LABELS[order.status]}
                        </span>
                      </td>
                      <td className="py-3 pr-4">
                        <span
                          className={
                            order.paymentStatus === "paid"
                              ? "rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700"
                              : "rounded-full bg-charcoal-100 px-2.5 py-1 text-xs font-semibold text-charcoal-600"
                          }
                        >
                          {order.paymentStatus === "paid" ? "Paid" : "Unpaid"}
                        </span>
                      </td>
                      <td className="py-3 text-right font-semibold text-charcoal-900">
                        {formatPkr(order.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-charcoal-200/70">
          <h2 className="font-display text-xl font-bold text-charcoal-900">Quick actions</h2>
          <div className="mt-4 grid gap-2">
            {QUICK_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="group flex items-center justify-between rounded-xl border border-charcoal-200/70 px-4 py-3 transition-colors hover:border-flame-300 hover:bg-cream-100"
              >
                <div className="min-w-0">
                  <p className="text-sm font-bold text-charcoal-900">{link.title}</p>
                  <p className="truncate text-xs text-charcoal-500">{link.copy}</p>
                </div>
                <span className="shrink-0 text-sm text-tomato-600 transition-transform motion-safe:group-hover:translate-x-1">
                  →
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}





