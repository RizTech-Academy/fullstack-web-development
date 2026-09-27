"use client";

import { useState, useTransition } from "react";
import { ORDER_STATUS_LABELS, type OrderStatus } from "@kirana/shared";

import { setOrderStatus } from "@/app/actions/orders";

/**
 * One button per move the order is actually allowed to make.
 *
 * `next` comes from `ORDER_STATUS_FLOW` in the shared package — the same table
 * the API validates against. A dropdown listing all six statuses would let the
 * shop try things the API refuses, and the refusal would look like a bug.
 */
export function AdvanceOrder({
  orderNumber,
  next,
}: {
  orderNumber: string;
  next: OrderStatus[];
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (next.length === 0) {
    return <p className="text-xs text-gray-400">Nothing left to do.</p>;
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {next.map((status) => (
          <button
            key={status}
            type="button"
            disabled={pending}
            onClick={() => {
              setError(null);
              startTransition(async () => {
                const result = await setOrderStatus(orderNumber, status);
                if (!result.ok) setError(result.message);
              });
            }}
            className={`rounded px-3 py-1.5 text-sm font-medium disabled:opacity-50 ${
              status === "CANCELLED"
                ? "border border-red-300 text-red-700 dark:border-red-900 dark:text-red-400"
                : "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
            }`}
          >
            {status === "CANCELLED" ? "Cancel" : `Mark ${ORDER_STATUS_LABELS[status].toLowerCase()}`}
          </button>
        ))}
      </div>
      {error && (
        <p role="alert" className="mt-1 text-sm text-red-700 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
