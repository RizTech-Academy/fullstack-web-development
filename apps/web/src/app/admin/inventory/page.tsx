import type { Metadata } from "next";
import { LOW_STOCK_THRESHOLD, formatPaise } from "@kirana/shared";

import { InventoryRow } from "@/components/admin/inventory-row";
import { fetchInventory } from "@/lib/orders";

export const metadata: Metadata = {
  title: "Inventory",
  robots: { index: false, follow: false },
};

export default async function InventoryPage() {
  const rows = await fetchInventory();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Inventory</h1>
        <p className="text-sm text-gray-500">
          Sorted by stock, so whatever needs reordering is at the top. Anything
          at or below {LOW_STOCK_THRESHOLD} counts as low.
        </p>
      </div>

      <ul className="divide-y divide-gray-200 dark:divide-gray-800">
        {rows.map((row) => (
          <li key={row.id} className="py-3">
            <InventoryRow row={row} />
          </li>
        ))}
      </ul>

      <p className="text-xs text-gray-500">
        Setting a stock level writes the number you type. It is the shopkeeper
        counting the shelf, which is the truth — selling is what adds and
        subtracts. Total value on the shelf:{" "}
        {formatPaise(rows.reduce((sum, row) => sum + row.pricePaise * row.stock, 0))}.
      </p>
    </div>
  );
}
