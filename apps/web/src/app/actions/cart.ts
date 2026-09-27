"use server";

import { revalidatePath } from "next/cache";
import { ErrorCode } from "@kirana/shared";

import { ApiError } from "@/lib/api";
import { apiRequest } from "@/lib/api-server";

export type ActionResult = { ok: true } | { ok: false; code: string; message: string };

/**
 * Server actions, not a fetch from the browser.
 *
 * The cart mutation runs on the Next server, which already holds the visitor's
 * cookies and can set new ones. That keeps the session httpOnly, keeps the API
 * off the public internet if you want it there, and means the cart still works
 * with JavaScript disabled, because a `<form action={…}>` posts normally.
 */
async function run(request: () => Promise<unknown>): Promise<ActionResult> {
  try {
    await request();
    // The header's basket count and the cart page both read the cart, so every
    // mutation has to invalidate both. "/" covers the layout they share.
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    if (error instanceof ApiError) {
      return { ok: false, code: error.code, message: error.message };
    }
    // An unexpected error is a bug here, not something to show a customer.
    console.error("Cart action failed", error);
    return {
      ok: false,
      code: ErrorCode.INTERNAL_ERROR,
      message: "Something went wrong. Please try again.",
    };
  }
}

// Every export in a "use server" file must be declared `async`, even one that
// already returns a promise. TypeScript is happy either way; the build is not.
export async function addToCart(
  variantId: string,
  quantity = 1,
): Promise<ActionResult> {
  return run(() =>
    apiRequest("/cart/items", { method: "POST", body: { variantId, quantity } }),
  );
}

export async function setCartQuantity(
  variantId: string,
  quantity: number,
): Promise<ActionResult> {
  return run(() =>
    apiRequest(`/cart/items/${encodeURIComponent(variantId)}`, {
      method: "PATCH",
      body: { quantity },
    }),
  );
}

export async function removeFromCart(variantId: string): Promise<ActionResult> {
  return run(() =>
    apiRequest(`/cart/items/${encodeURIComponent(variantId)}`, { method: "DELETE" }),
  );
}
