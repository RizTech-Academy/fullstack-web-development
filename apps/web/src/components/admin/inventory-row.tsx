"use client";

import { useState, useTransition } from "react";
import { LOW_STOCK_THRESHOLD, formatPaise, type AdminVariantRow } from "@kirana/shared";

import { updateVariant } from "@/app/actions/orders";

export function InventoryRow({ row }: { row: AdminVariantRow }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  // Rupees in the box, paise on the wire. Nobody types 28500 for ₹285.
  const [rupees, setRupees] = useState((row.pricePaise / 100).toFixed(2));
  const [stock, setStock] = useState(String(row.stock));

  const save = (changes: { stock?: number; pricePaise?: number; isActive?: boolean }) => {
    setError(null);
    startTransition(async () => {
      const result = await updateVariant(row.id, changes);
      if (!result.ok) setError(result.message);
    });
  };

  const tone =
    row.stock === 0
      ? "text-red-700 dark:text-red-400"
      : row.stock <= LOW_STOCK_THRESHOLD
        ? "text-amber-700 dark:text-amber-400"
        : "text-gray-500";

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <p className="font-medium">
            {row.productName}{" "}
            <span className="text-sm text-gray-500">{row.variantLabel}</span>
          </p>
          <p className="text-xs text-gray-500">
            {row.sku} · now {formatPaise(row.pricePaise)}
            {!row.isActive && " · not for sale"}
          </p>
        </div>
        <p className={`text-sm ${tone}`}>
          {row.stock === 0 ? "Out of stock" : `${row.stock} in stock`}
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label className="text-xs">
          <span className="block text-gray-500">Stock</span>
          <input
            type="number"
            min={0}
            value={stock}
            onChange={(event) => setStock(event.target.value)}
            onBlur={() => {
              const next = Number(stock);
              // Only send a change. A blur with nothing edited would otherwise
              // fire a request every time the shopkeeper tabs past a field.
              if (Number.isInteger(next) && next >= 0 && next !== row.stock) {
                save({ stock: next });
              }
            }}
            className="mt-0.5 w-24 rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-900"
          />
        </label>

        <label className="text-xs">
          <span className="block text-gray-500">Price (₹)</span>
          <input
            type="number"
            min={1}
            step="0.01"
            value={rupees}
            onChange={(event) => setRupees(event.target.value)}
            onBlur={() => {
              // Math.round, never Math.floor: 285.15 in a float is
              // 285.14999999999998, and floor would charge a paisa less.
              const paise = Math.round(Number(rupees) * 100);
              if (Number.isFinite(paise) && paise > 0 && paise !== row.pricePaise) {
                save({ pricePaise: paise });
              }
            }}
            className="mt-0.5 w-28 rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-900"
          />
        </label>

        <button
          type="button"
          disabled={pending}
          onClick={() => save({ isActive: !row.isActive })}
          className="rounded border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-50 dark:border-gray-700"
        >
          {row.isActive ? "Take off sale" : "Put back on sale"}
        </button>

        {pending && <span className="text-xs text-gray-500">Saving…</span>}
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-700 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
