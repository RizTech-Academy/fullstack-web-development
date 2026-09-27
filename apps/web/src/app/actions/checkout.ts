"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ErrorCode, type OrderDetail } from "@kirana/shared";

import { ApiError } from "@/lib/api";
import { apiRequest } from "@/lib/api-server";

export type CheckoutState = { error: string | null; code: string | null };

export async function placeOrder(
  _previous: CheckoutState,
  formData: FormData,
): Promise<CheckoutState> {
  const slot = String(formData.get("slot") ?? "");
  // One radio carries both values, because a slot id without its date means
  // nothing and two fields could disagree.
  const [slotId, slotDate] = slot.split("|");

  if (!slotId || !slotDate) {
    return { error: "Please choose a delivery slot.", code: ErrorCode.VALIDATION_FAILED };
  }

  let order: OrderDetail;

  try {
    order = await apiRequest<OrderDetail>("/checkout", {
      method: "POST",
      body: {
        name: formData.get("name"),
        phone: formData.get("phone"),
        line1: formData.get("line1"),
        line2: formData.get("line2") || undefined,
        landmark: formData.get("landmark") || undefined,
        city: formData.get("city"),
        pincode: formData.get("pincode"),
        slotId,
        slotDate,
        paymentMethod: formData.get("paymentMethod"),
      },
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return { error: error.message, code: error.code };
    }
    throw error;
  }

  revalidatePath("/", "layout");
  redirect(`/orders/${order.orderNumber}`);
}
