import type {
  AdminOrderSummary,
  AdminStats,
  AdminVariantRow,
  OrderDetail,
  OrderSummary,
  Paginated,
} from "@kirana/shared";

import { apiRequest } from "./api-server";

export function fetchOrders(page = 1): Promise<Paginated<OrderSummary>> {
  return apiRequest(`/orders${page > 1 ? `?page=${page}` : ""}`);
}

export function fetchOrder(orderNumber: string): Promise<OrderDetail> {
  return apiRequest(`/orders/${encodeURIComponent(orderNumber)}`);
}

export function fetchAdminStats(): Promise<AdminStats> {
  return apiRequest("/admin/stats");
}

export function fetchAdminOrders(
  status?: string,
  page = 1,
): Promise<Paginated<AdminOrderSummary>> {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return apiRequest(`/admin/orders${query ? `?${query}` : ""}`);
}

export function fetchInventory(): Promise<AdminVariantRow[]> {
  return apiRequest("/admin/inventory");
}
