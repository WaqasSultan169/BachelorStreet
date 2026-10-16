"use client";

import { useSyncExternalStore } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatPkr } from "@/lib/utils";

export type RevenueTrendPoint = {
  date: string;
  orders: number;
  paidOrders: number;
  unpaidOrders: number;
  revenue: number;
};

export type CustomerGrowthPoint = { date: string; count: number };

export type StatusDistributionPoint = { status: string; label: string; count: number };

export type TopItemPoint = { id: string; name: string; quantity: number; revenue: number };

const REVENUE_COLORS = {
  revenue: "#c22a1b",
  orders: "#1f1a16",
  paid: "#f97316",
  unpaid: "#8f8171",
};

const STATUS_COLORS = [
  "#f97316",
  "#c49a45",
  "#c22a1b",
  "#22a06b",
  "#3b82f6",
  "#6f6153",
  "#8f8171",
];

function shortDate(value: string): string {
  const [, month, day] = value.split("-");
  return `${day}/${month}`;
}

/** Recharts needs a browser; defer rendering and reserve the same height. */
function useMounted(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

function ChartFrame({
  title,
  description,
  badge,
  empty,
  height = 288,
  children,
}: {
  title: string;
  description?: string;
  badge?: string;
  empty: boolean;
  height?: number;
  children: React.ReactNode;
}) {
  const mounted = useMounted();
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-charcoal-200/70">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-bold text-charcoal-900">{title}</h2>
          {description ? <p className="mt-1 text-sm text-charcoal-500">{description}</p> : null}
        </div>
        {badge ? (
          <span className="rounded-full bg-flame-100 px-3 py-1 text-xs font-bold text-flame-700">
            {badge}
          </span>
        ) : null}
      </div>
      {empty ? (
        <div className="mt-4 flex h-52 items-center justify-center rounded-xl border border-dashed border-charcoal-300 px-6 text-center text-sm text-charcoal-500">
          No data available for this period yet.
        </div>
      ) : (
        <div className="mt-4 w-full" style={{ height }}>
          {mounted ? (
            <ResponsiveContainer width="100%" height="100%">
              {children as React.ReactElement}
            </ResponsiveContainer>
          ) : (
            <div className="h-full w-full animate-pulse rounded-xl bg-cream-100" aria-hidden />
          )}
        </div>
      )}
    </div>
  );
}

export function RevenueOrdersChart({ data }: { data: RevenueTrendPoint[] }) {
  const totalRevenue = data.reduce((sum, point) => sum + point.revenue, 0);
  const hasData = data.some((point) => point.orders > 0);
  return (
    <ChartFrame
      title="Revenue & order volume"
      description="Paid revenue versus paid and unpaid COD order counts."
      badge={formatPkr(totalRevenue)}
      empty={!hasData}
    >
      <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5ded4" vertical={false} />
        <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fontSize: 11 }} minTickGap={24} />
        <YAxis yAxisId="revenue" tick={{ fontSize: 11 }} width={48} />
        <YAxis yAxisId="orders" orientation="right" tick={{ fontSize: 11 }} width={32} allowDecimals={false} />
        <Tooltip
          formatter={(value, name) => {
            if (name === "revenue") return [formatPkr(Number(value)), "Paid revenue"];
            if (name === "paidOrders") return [`${value}`, "Paid orders"];
            if (name === "unpaidOrders") return [`${value}`, "Unpaid COD orders"];
            return [value as string, String(name)];
          }}
          labelFormatter={(label) => `Date: ${label}`}
          contentStyle={{ borderRadius: 12, border: "1px solid #e5ded4", fontSize: 12 }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Area
          yAxisId="revenue"
          type="monotone"
          dataKey="revenue"
          name="Paid revenue"
          stroke={REVENUE_COLORS.revenue}
          fill={REVENUE_COLORS.revenue}
          fillOpacity={0.12}
          strokeWidth={2}
        />
        <Bar yAxisId="orders" dataKey="paidOrders" name="Paid orders" fill={REVENUE_COLORS.paid} radius={[3, 3, 0, 0]} maxBarSize={18} />
        <Line
          yAxisId="orders"
          type="monotone"
          dataKey="unpaidOrders"
          name="Unpaid COD"
          stroke={REVENUE_COLORS.unpaid}
          strokeWidth={2}
          dot={false}
          strokeDasharray="4 3"
        />
      </ComposedChart>
    </ChartFrame>
  );
}

export function StatusDistributionChart({ data }: { data: StatusDistributionPoint[] }) {
  const total = data.reduce((sum, point) => sum + point.count, 0);
  return (
    <ChartFrame
      title="Order status distribution"
      description="Orders received in the selected range by current status."
      badge={`${total} orders`}
      empty={total === 0}
      height={272}
    >
      <PieChart>
        <Pie
          data={data.filter((point) => point.count > 0)}
          dataKey="count"
          nameKey="label"
          innerRadius={56}
          outerRadius={92}
          paddingAngle={2}
        >
          {data
            .filter((point) => point.count > 0)
            .map((point, index) => (
              <Cell key={point.status} fill={STATUS_COLORS[index % STATUS_COLORS.length]} />
            ))}
        </Pie>
        <Tooltip
          formatter={(value, name) => [`${value} orders`, name as string]}
          contentStyle={{ borderRadius: 12, border: "1px solid #e5ded4", fontSize: 12 }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ChartFrame>
  );
}

export function TopProductsChart({ data }: { data: TopItemPoint[] }) {
  const chartData = data.map((item) => ({ ...item, shortName: item.name.length > 22 ? `${item.name.slice(0, 22)}…` : item.name }));
  return (
    <ChartFrame
      title="Top-selling products"
      description="Units sold from non-cancelled orders (item name snapshots)."
      empty={chartData.length === 0}
    >
      <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 16, bottom: 0, left: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5ded4" horizontal={false} />
        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
        <YAxis type="category" dataKey="shortName" width={120} tick={{ fontSize: 11 }} />
        <Tooltip
          formatter={(value, name, entry) =>
            name === "quantity"
              ? [`${value} sold`, entry?.payload?.name ?? "Units"]
              : [`${value}`, "Quantity"]
          }
          contentStyle={{ borderRadius: 12, border: "1px solid #e5ded4", fontSize: 12 }}
        />
        <Bar dataKey="quantity" name="Units sold" fill="#f97316" radius={[0, 4, 4, 0]} maxBarSize={22} />
      </BarChart>
    </ChartFrame>
  );
}

export function CustomerGrowthChart({ data }: { data: CustomerGrowthPoint[] }) {
  const totalNew = data.reduce((sum, point) => sum + point.count, 0);
  return (
    <ChartFrame
      title="Customer registrations"
      description="New accounts created using the storefront sign-up."
      badge={`+${totalNew}`}
      empty={totalNew === 0}
      height={240}
    >
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5ded4" vertical={false} />
        <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fontSize: 11 }} minTickGap={24} />
        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={32} />
        <Tooltip
          formatter={(value) => [`${value} new`, "Customers"]}
          labelFormatter={(label) => `Date: ${label}`}
          contentStyle={{ borderRadius: 12, border: "1px solid #e5ded4", fontSize: 12 }}
        />
        <Area
          type="monotone"
          dataKey="count"
          name="New customers"
          stroke="#c49a45"
          fill="#c49a45"
          fillOpacity={0.18}
          strokeWidth={2}
        />
      </AreaChart>
    </ChartFrame>
  );
}
