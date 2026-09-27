"use server";

import { revalidatePath } from "next/cache";
import { ErrorCode, type OrderStatus } from "@kirana/shared";

import { ApiError } from "@/lib/api";
import { apiRequest } from "@/lib/api-server";

export type ActionResult = { ok: true } | { ok: false; code: string; message: string };

async function run(request: () => Promise<unknown>, paths: string[]): Promise<ActionResult> {
  try {
    await request();
    for (const path of paths) revalidatePath(path, "layout");
    return { ok: true };
  } catch (error) {
    if (error instanceof ApiError) {
      return { ok: false, code: error.code, message: error.message };
    }
    console.error("Order action failed", error);
    return {
      ok: false,
      code: ErrorCode.INTERNAL_ERROR,
      message: "Something went wrong. Please try again.",
    };
  }
}

export async function cancelOrder(orderNumber: string): Promise<ActionResult> {
  return run(
    () => apiRequest(`/orders/${encodeURIComponent(orderNumber)}/cancel`, { method: "POST" }),
    // The order page, the history list and — because cancelling returns stock —
    // the catalogue. Forgetting the last one leaves a sold-out badge on an item
    // that is back on the shelf.
    ["/orders", "/products"],
  );
}

export async function setOrderStatus(
  orderNumber: string,
  status: OrderStatus,
  note?: string,
): Promise<ActionResult> {
  return run(
    () =>
      apiRequest(`/admin/orders/${encodeURIComponent(orderNumber)}/status`, {
        method: "PATCH",
        body: { status, ...(note ? { note } : {}) },
      }),
    ["/admin", "/orders", "/products"],
  );
}

export async function updateVariant(
  id: string,
  changes: { stock?: number; pricePaise?: number; isActive?: boolean },
): Promise<ActionResult> {
  return run(
    () => apiRequest(`/admin/variants/${encodeURIComponent(id)}`, { method: "PATCH", body: changes }),
    ["/admin", "/products"],
  );
}
