"use client";

import { useState, useTransition } from "react";

import { removeFromCart, setCartQuantity } from "@/app/actions/cart";

export function QuantityStepper({
  variantId,
  quantity,
  max,
}: {
  variantId: string;
  quantity: number;
  max: number;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const change = (next: number) => {
    setError(null);
    startTransition(async () => {
      // Zero means remove, and the API accepts it on PATCH. Sending DELETE from
      // here instead would be a second code path for the same intent.
      const result =
        next <= 0
          ? await removeFromCart(variantId)
          : await setCartQuantity(variantId, next);

      if (!result.ok) setError(result.message);
    });
  };

  const button =
    "h-9 w-9 rounded border border-gray-300 text-lg leading-none disabled:opacity-40 dark:border-gray-700";

  return (
    <div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => change(quantity - 1)}
          disabled={pending}
          className={button}
          aria-label={quantity === 1 ? "Remove from cart" : "Reduce quantity"}
        >
          −
        </button>

        <span className="w-8 text-center text-sm" aria-live="polite">
          {quantity}
        </span>

        <button
          type="button"
          onClick={() => change(quantity + 1)}
          // Capped at what the shop actually has, so the obvious next tap
          // cannot produce an error the customer could not have predicted.
          disabled={pending || quantity >= max}
          className={button}
          aria-label="Increase quantity"
        >
          +
        </button>

        <button
          type="button"
          onClick={() => change(0)}
          disabled={pending}
          className="ml-2 text-sm text-gray-500 underline disabled:opacity-40"
        >
          Remove
        </button>
      </div>

      {error && (
        <p role="alert" className="mt-1 text-sm text-red-700 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
