import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatPaise } from "@kirana/shared";

import { ApiError } from "@/lib/api";
import { fetchOrder } from "@/lib/cart";

export const metadata: Metadata = {
  title: "Your order",
  robots: { index: false, follow: false },
};

type Params = Promise<{ orderNumber: string }>;

export default async function OrderPage({ params }: { params: Params }) {
  const { orderNumber } = await params;

  let order;
  try {
    order = await fetchOrder(orderNumber);
  } catch (error) {
    // 404 covers both "no such order" and "not yours" — the API deliberately
    // does not distinguish them, and neither does this page.
    if (error instanceof ApiError && (error.status === 404 || error.status === 401)) {
      notFound();
    }
    throw error;
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="rounded-lg border border-green-300 bg-green-50 p-6 dark:border-green-800 dark:bg-green-950">
        <h1 className="text-xl font-semibold">Order placed.</h1>
        <p className="mt-1 text-sm">
          Order <strong>{order.orderNumber}</strong>. The shop will pack it and
          deliver {order.slotLabel ? `${order.slotLabel}` : "soon"}
          {order.slotDate ? ` on ${formatDay(order.slotDate)}` : ""}.
        </p>
      </div>

      <section>
        <h2 className="mb-2 text-sm font-medium uppercase tracking-wide text-gray-500">
          Items
        </h2>
        <ul className="divide-y divide-gray-200 dark:divide-gray-800">
          {order.lines.map((line) => (
            <li key={line.sku} className="flex justify-between gap-4 py-3 text-sm">
              <div>
                {/* The snapshot, not a live lookup. If the shop renames the
                    product tomorrow, this order still says what was bought. */}
                <p className="font-medium">{line.productName}</p>
                <p className="text-gray-500">
                  {line.variantLabel} × {line.quantity} at{" "}
                  {formatPaise(line.unitPricePaise)}
                </p>
              </div>
              <p className="shrink-0 font-medium">{formatPaise(line.linePaise)}</p>
            </li>
          ))}
        </ul>
      </section>

      <dl className="space-y-1 border-t border-gray-200 pt-4 text-sm dark:border-gray-800">
        <div className="flex justify-between">
          <dt className="text-gray-500">Subtotal</dt>
          <dd>{formatPaise(order.subtotalPaise)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-gray-500">Delivery</dt>
          <dd>
            {order.deliveryPaise === 0 ? "Free" : formatPaise(order.deliveryPaise)}
          </dd>
        </div>
        <div className="flex justify-between border-t border-gray-200 pt-2 text-base font-semibold dark:border-gray-800">
          <dt>
            {order.paymentMethod === "CASH_ON_DELIVERY" ? "Pay on delivery" : "Paid"}
          </dt>
          <dd>{formatPaise(order.totalPaise)}</dd>
        </div>
      </dl>

      <section className="text-sm">
        <h2 className="mb-1 font-medium uppercase tracking-wide text-gray-500">
          Delivering to
        </h2>
        <address className="not-italic text-gray-600 dark:text-gray-400">
          {order.delivery.name}
          <br />
          {order.delivery.line1}
          {order.delivery.line2 && <>, {order.delivery.line2}</>}
          <br />
          {order.delivery.landmark && (
            <>
              {order.delivery.landmark}
              <br />
            </>
          )}
          {order.delivery.city} {order.delivery.pincode}
          <br />
          {order.delivery.phone}
        </address>
      </section>

      <Link href="/products" className="inline-block text-sm underline">
        Back to the shop
      </Link>
    </div>
  );
}

function formatDay(iso: string): string {
  // The date arrives as a calendar date. Appending a time and a Z keeps it from
  // being read as local and shifted by a day.
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });
}
