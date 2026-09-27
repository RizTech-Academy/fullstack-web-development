"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { pay } from "@/app/actions/payments";

/**
 * Stands in for the gateway's checkout widget.
 *
 * A real integration opens the provider's own iframe or redirects to their
 * page, and the card details never touch this application — which is most of
 * what PCI compliance means in practice. The two buttons here exist because a
 * course needs the failure path to be reachable on demand.
 */
export function PayForm({ orderNumber }: { orderNumber: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const attempt = (succeed: boolean) => {
    setError(null);
    startTransition(async () => {
      const result = await pay(orderNumber, succeed);

      if (!result.ok) {
        setError(result.message);
        return;
      }

      if (result.paid) {
        router.push(`/orders/${orderNumber}`);
      } else {
        // The order is still PENDING_PAYMENT, so they can try again. Saying so
        // matters: a failed payment that looks final sends people to their bank.
        setError("The payment did not go through. Nothing has been charged — you can try again.");
      }
    });
  };

  return (
    <div className="space-y-3">
      {error && (
        <p
          role="alert"
          className="rounded border border-red-300 bg-red-50 p-3 text-sm dark:border-red-900 dark:bg-red-950"
        >
          {error}
        </p>
      )}

      <button
        type="button"
        disabled={pending}
        onClick={() => attempt(true)}
        className="w-full rounded bg-green-700 px-4 py-3 font-medium text-white disabled:opacity-50"
      >
        {pending ? "Talking to the bank…" : "Pay now"}
      </button>

      <button
        type="button"
        disabled={pending}
        onClick={() => attempt(false)}
        className="w-full rounded border border-gray-300 px-4 py-2.5 text-sm disabled:opacity-50 dark:border-gray-700"
      >
        Simulate a failed payment
      </button>
    </div>
  );
}
