"use client";

import { useState, useTransition } from "react";

import { cancelOrder } from "@/app/actions/orders";

/**
 * Two taps, not one.
 *
 * Cancelling is not reversible — the order goes to a terminal status and the
 * stock goes back on the shelf. A single mis-tap on a phone should not do that,
 * and a browser `confirm()` cannot be styled, cannot be tested easily, and is
 * blocked outright in some contexts.
 */
export function CancelOrder({ orderNumber }: { orderNumber: string }) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!confirming) {
    return (
      <div>
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="text-sm text-red-700 underline dark:text-red-400"
        >
          Cancel this order
        </button>
        {error && (
          <p role="alert" className="mt-1 text-sm text-red-700 dark:text-red-400">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="rounded border border-red-300 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950">
      <p className="text-sm">Cancel this order? The items go back on the shelf.</p>
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await cancelOrder(orderNumber);
              if (!result.ok) {
                setError(result.message);
                setConfirming(false);
              }
            })
          }
          className="rounded bg-red-700 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {pending ? "Cancelling…" : "Yes, cancel it"}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="rounded border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-700"
        >
          Keep it
        </button>
      </div>
    </div>
  );
}
