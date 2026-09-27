import {
  EMPTY_CART,
  type AuthUser,
  type CartView,
  type DeliveryDay,
  type OrderDetail,
} from "@kirana/shared";

import { ApiError } from "./api";
import { apiRequest } from "./api-server";

export async function fetchCart(): Promise<CartView> {
  try {
    return await apiRequest<CartView>("/cart");
  } catch (error) {
    // The basket count in the header must never take the whole page down. A
    // cart that cannot be read is shown as empty, and the page still renders.
    if (error instanceof ApiError) return EMPTY_CART;
    throw error;
  }
}

export async function fetchCurrentUser(): Promise<AuthUser | null> {
  try {
    const { user } = await apiRequest<{ user: AuthUser }>("/auth/me");
    return user;
  } catch (error) {
    // 401 is the normal case for a visitor who is not signed in, not a failure.
    if (error instanceof ApiError && error.status === 401) return null;
    throw error;
  }
}

export function fetchDeliveryDays(): Promise<DeliveryDay[]> {
  return apiRequest<DeliveryDay[]>("/delivery-slots");
}

export function fetchOrder(orderNumber: string): Promise<OrderDetail> {
  return apiRequest<OrderDetail>(`/orders/${encodeURIComponent(orderNumber)}`);
}
