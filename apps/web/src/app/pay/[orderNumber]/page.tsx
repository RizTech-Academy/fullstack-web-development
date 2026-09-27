import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PAYMENT_WINDOW_MINUTES, formatPaise } from "@kirana/shared";

import { PayForm } from "@/components/pay-form";
import { ApiError } from "@/lib/api";
import { fetchOrder } from "@/lib/orders";

export const metadata: Metadata = {
  title: "Pay for your order",
  robots: { index: false, follow: false },
};

type Params = Promise<{ orderNumber: string }>;

export default async function PayPage({ params }: { params: Params }) {
  const { orderNumber } = await params;

  let order;
  try {
    order = await fetchOrder(orderNumber);
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 401)) {
      notFound();
    }
    throw error;
  }

  // Already dealt with. Sending them to the order rather than showing a
  // payment form for something that is paid, or cancelled.
  if (order.status !== "PENDING_PAYMENT") redirect(`/orders/${orderNumber}`);

  return (
    <div className="mx-auto max-w-md space-y-6 py-6">
      <div>
        <h1 className="text-xl font-semibold">Pay for {order.orderNumber}</h1>
        <p className="mt-1 text-sm text-gray-500">
          {order.itemCount} {order.itemCount === 1 ? "item" : "items"} ·{" "}
          {order.slotLabel ?? "delivery"}
        </p>
      </div>

      <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-800">
        <dl className="space-y-1 text-sm">
          <div className="flex justify-between">
            <dt className="text-gray-500">Subtotal</dt>
            <dd>{formatPaise(order.subtotalPaise)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">Delivery</dt>
            <dd>{order.deliveryPaise === 0 ? "Free" : formatPaise(order.deliveryPaise)}</dd>
          </div>
          <div className="flex justify-between border-t border-gray-200 pt-2 text-base font-semibold dark:border-gray-800">
            <dt>To pay</dt>
            <dd>{formatPaise(order.totalPaise)}</dd>
          </div>
        </dl>
      </div>

      <PayForm orderNumber={order.orderNumber} />

      <p className="text-xs text-gray-500">
        Your items are held for {PAYMENT_WINDOW_MINUTES} minutes. After that the
        order is cancelled and they go back on the shelf — nothing is charged.
      </p>

      <Link href={`/orders/${order.orderNumber}`} className="block text-sm underline">
        View the order instead
      </Link>
    </div>
  );
}
