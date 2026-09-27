import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { formatPaise } from "@kirana/shared";

import { OrderStatusBadge } from "@/components/order-status";
import { fetchCurrentUser } from "@/lib/cart";
import { fetchOrders } from "@/lib/orders";
import { readPage, type RawSearchParams } from "@/lib/search-params";

export const metadata: Metadata = {
  title: "Your orders",
  // Nothing personal should ever be indexed.
  robots: { index: false, follow: false },
};

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const [params, user] = await Promise.all([searchParams, fetchCurrentUser()]);
  if (!user) redirect("/account/login?next=%2Forders");

  const orders = await fetchOrders(readPage(params));

  if (orders.total === 0) {
    return (
      <div className="py-12 text-center">
        <h1 className="text-xl font-semibold">No orders yet.</h1>
        <Link href="/products" className="mt-4 inline-block text-sm underline">
          Start shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Your orders</h1>

      <ul className="divide-y divide-gray-200 dark:divide-gray-800">
        {orders.items.map((order) => (
          <li key={order.orderNumber} className="py-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Link
                href={`/orders/${order.orderNumber}`}
                className="font-medium hover:underline"
              >
                {order.orderNumber}
              </Link>
              <OrderStatusBadge status={order.status} />
            </div>
            <p className="mt-1 text-sm text-gray-500">
              {order.itemCount} {order.itemCount === 1 ? "item" : "items"} ·{" "}
              {formatPaise(order.totalPaise)}
              {order.slotLabel && order.slotDate && (
                <> · {order.slotLabel} on {formatDay(order.slotDate)}</>
              )}
            </p>
          </li>
        ))}
      </ul>

      {orders.totalPages > 1 && (
        <nav aria-label="Pagination" className="flex items-center justify-between">
          {orders.hasPrevious ? (
            <Link href={`/orders?page=${orders.page - 1}`} className="text-sm underline" rel="prev">
              Newer
            </Link>
          ) : (
            <span />
          )}
          <span className="text-sm text-gray-500">
            Page {orders.page} of {orders.totalPages}
          </span>
          {orders.hasNext ? (
            <Link href={`/orders?page=${orders.page + 1}`} className="text-sm underline" rel="next">
              Older
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </div>
  );
}

/**
 * The date arrives as a calendar date. Appending a time and a Z, and formatting
 * in UTC, keeps it from being read as local and shifted by a day — see the
 * module 12 lesson on dates.
 */
function formatDay(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}
