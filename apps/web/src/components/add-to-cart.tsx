"use client";

import { useState, useTransition } from "react";

import { addToCart } from "@/app/actions/cart";

/**
 * Optimistic enough to feel instant, honest enough to be trusted.
 *
 * `useTransition` gives a pending flag without the button ever being disabled
 * before the click has been handled — a disabled button that appears too early
 * swallows the tap, which on a phone reads as the app being broken.
 */
export function AddToCart({
  variantId,
  disabled = false,
}: {
  variantId: string;
  disabled?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState(false);

  const onClick = () => {
    setError(null);
    startTransition(async () => {
      const result = await addToCart(variantId, 1);
      if (result.ok) {
        setAdded(true);
        // Back to "Add" after a moment, so a second tap is obviously possible.
        setTimeout(() => setAdded(false), 2000);
      } else {
        setError(result.message);
      }
    });
  };

  return (
    <div>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled || pending}
        className="w-full rounded bg-green-700 px-4 py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
      >
        {disabled ? "Out of stock" : pending ? "Adding…" : added ? "Added ✓" : "Add to cart"}
      </button>

      {error && (
        <p role="alert" className="mt-2 text-sm text-red-700 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
