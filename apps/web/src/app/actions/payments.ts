"use server";

import { revalidatePath } from "next/cache";
import { ErrorCode, type PaymentIntent } from "@kirana/shared";

import { ApiError } from "@/lib/api";
import { apiRequest } from "@/lib/api-server";

export type PayResult =
  | { ok: true; paid: boolean }
  | { ok: false; code: string; message: string };

/**
 * Hands the order to the gateway and asks it to settle.
 *
 * In a real integration the second half of this is the provider's checkout
 * widget in the browser, and what comes back to us is a **webhook**, not this.
 * The simulator endpoint exists so the loop can be exercised locally; it makes
 * the *server* send itself a signed event, exactly as a gateway would from its
 * own machines. The browser still cannot mark anything paid.
 */
export async function pay(orderNumber: string, succeed: boolean): Promise<PayResult> {
  try {
    const intent = await apiRequest<PaymentIntent>(
      `/payments/${encodeURIComponent(orderNumber)}/intent`,
      { method: "POST" },
    );

    await apiRequest("/payments/simulate", {
      method: "POST",
      body: {
        providerRef: intent.providerRef,
        orderNumber: intent.orderNumber,
        amountPaise: intent.amountPaise,
        succeed,
      },
    });

    revalidatePath("/orders", "layout");
    revalidatePath("/products", "layout");
    return { ok: true, paid: succeed };
  } catch (error) {
    if (error instanceof ApiError) {
      return { ok: false, code: error.code, message: error.message };
    }
    console.error("Payment failed", error);
    return {
      ok: false,
      code: ErrorCode.INTERNAL_ERROR,
      message: "Something went wrong. Please try again.",
    };
  }
}
