import type { Metadata } from "next";
import Link from "next/link";
import { ORDER_STATUS_FLOW, formatPaise, type OrderStatus } from "@kirana/shared";

import { AdvanceOrder } from "@/components/admin/advance-order";
import { OrderStatusBadge } from "@/components/order-status";
import { fetchAdminOrders, fetchAdminStats } from "@/lib/orders";
import { readPage, readString, type RawSearchParams } from "@/lib/search-params";

export const metadata: Metadata = {
  title: "Orders",
  robots: { index: false, follow: false },
};

const FILTERS: { label: string; status?: OrderStatus }[] = [
  { label: "All" },
  { label: "Placed", status: "PLACED" },
  { label: "Packed", status: "PACKED" },
  { label: "Out for delivery", status: "OUT_FOR_DELIVERY" },
  { label: "Delivered", status: "DELIVERED" },
  { label: "Cancelled", status: "CANCELLED" },
];

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const params = await searchParams;
  const status = readString(params, "status");

  const [stats, orders] = await Promise.all([
    fetchAdminStats(),
    fetchAdminOrders(status, readPage(params)),
  ]);

  return (
    <div className="space-y-6">
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Stat label="Open orders" value={String(stats.openOrders)} />
        <Stat label="Today" value={String(stats.ordersToday)} />
        <Stat label="Revenue today" value={formatPaise(stats.revenueTodayPaise)} />
        <Stat label="Low stock" value={String(stats.lowStock)} tone={stats.lowStock > 0} />
        <Stat label="Out of stock" value={String(stats.outOfStock)} tone={stats.outOfStock > 0} />
      </dl>

      <nav className="flex flex-wrap gap-2">
        {FILTERS.map((filter) => {
          const active = filter.status === status || (!filter.status && !status);
          return (
            <Link
              key={filter.label}
              href={filter.status ? `/admin?status=${filter.status}` : "/admin"}
              aria-current={active ? "page" : undefined}
              className={`rounded-full border px-3 py-1 text-sm ${
                active
                  ? "border-gray-900 bg-gray-900 text-white dark:border-white dark:bg-white dark:text-gray-900"
                  : "border-gray-300 dark:border-gray-700"
              }`}
            >
              {filter.label}
            </Link>
          );
        })}
      </nav>

      {orders.items.length === 0 ? (
        <p className="rounded border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500 dark:border-gray-700">
          Nothing here.
        </p>
      ) : (
        <ul className="divide-y divide-gray-200 dark:divide-gray-800">
          {orders.items.map((order) => (
            <li key={order.orderNumber} className="space-y-2 py-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium">{order.orderNumber}</span>
                <OrderStatusBadge status={order.status} />
              </div>

              <p className="text-sm text-gray-600 dark:text-gray-400">
                {order.customerName} · {order.customerPhone} · {order.pincode}
              </p>
              <p className="text-sm text-gray-500">
                {order.itemCount} {order.itemCount === 1 ? "item" : "items"} ·{" "}
                {formatPaise(order.totalPaise)} ·{" "}
                {order.paymentMethod === "CASH_ON_DELIVERY" ? "Cash on delivery" : "Paid online"}
                {order.slotLabel && <> · {order.slotLabel}</>}
              </p>

              {/* The buttons come from the state machine, so the interface
                  cannot offer a move the API would refuse. */}
              <AdvanceOrder
                orderNumber={order.orderNumber}
                next={[...ORDER_STATUS_FLOW[order.status]]}
              />
            </li>
          ))}
        </ul>
      )}

      {orders.totalPages > 1 && (
        <p className="text-sm text-gray-500">
          Page {orders.page} of {orders.totalPages} · {orders.total} orders
        </p>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  tone = false,
}: {
  label: string;
  value: string;
  tone?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border p-3 ${
        tone
          ? "border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950"
          : "border-gray-200 dark:border-gray-800"
      }`}
    >
      <dt className="text-xs text-gray-500">{label}</dt>
      <dd className="text-lg font-semibold">{value}</dd>
    </div>
  );
}
