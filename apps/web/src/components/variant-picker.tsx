"use client";

import { useState } from "react";
import type { VariantSummary } from "@kirana/shared";

import { AddToCart } from "./add-to-cart";
import { Price } from "./price";

/**
 * A client component, because which pack size is selected is state that lives
 * only in this browser. The product data around it is still rendered on the
 * server — the boundary is drawn as tightly as it can be.
 */
export function VariantPicker({ variants }: { variants: VariantSummary[] }) {
  // Default to the first in-stock size, so the page does not open on a size
  // that cannot be bought.
  const [selectedId, setSelectedId] = useState(
    () => (variants.find((v) => v.inStock) ?? variants[0])?.id,
  );

  const selected = variants.find((v) => v.id === selectedId) ?? variants[0];
  if (!selected) return null;

  return (
    <div className="space-y-4">
      {variants.length > 1 && (
        <fieldset>
          <legend className="mb-2 text-sm font-medium">Pack size</legend>
          <div className="flex flex-wrap gap-2">
            {variants.map((variant) => (
              <label
                key={variant.id}
                className={`cursor-pointer rounded border px-3 py-2 text-sm ${
                  variant.id === selected.id
                    ? "border-gray-900 dark:border-white"
                    : "border-gray-300 dark:border-gray-700"
                } ${variant.inStock ? "" : "opacity-50"}`}
              >
                <input
                  type="radio"
                  name="variant"
                  value={variant.id}
                  checked={variant.id === selected.id}
                  onChange={() => setSelectedId(variant.id)}
                  className="sr-only"
                />
                {variant.label}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <Price variant={selected} />

      {selected.inStock ? (
        <p className="text-sm text-green-700 dark:text-green-400">In stock</p>
      ) : (
        <p className="text-sm text-gray-500">
          Out of stock. The shop restocks most mornings.
        </p>
      )}

      {/* Keyed on the variant, so switching pack size clears the "Added ✓"
          state rather than claiming the new size is already in the cart. */}
      <AddToCart key={selected.id} variantId={selected.id} disabled={!selected.inStock} />
    </div>
  );
}
