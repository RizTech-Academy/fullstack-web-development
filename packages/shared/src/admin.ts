import type { Paise } from "./money";
import type { OrderStatus, PaymentMethod } from "./order";

export interface AdminOrderSummary {
  orderNumber: string;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  customerName: string;
  customerPhone: string;
  pincode: string;
  totalPaise: Paise;
  itemCount: number;
  slotDate: string | null;
  slotLabel: string | null;
  createdAt: string;
}

export interface AdminStats {
  /** Orders the shop still has to do something about. */
  openOrders: number;
  ordersToday: number;
  revenueTodayPaise: Paise;
  /** Variants at or below the low-stock line. The reason to open this page. */
  lowStock: number;
  outOfStock: number;
}

export interface AdminVariantRow {
  id: string;
  sku: string;
  productName: string;
  productSlug: string;
  variantLabel: string;
  pricePaise: Paise;
  mrpPaise: Paise | null;
  stock: number;
  isActive: boolean;
  productIsActive: boolean;
}

/**
 * Below this, the shop is told to reorder.
 *
 * A constant and not a per-product setting, deliberately: one shop, and a
 * number somebody can argue about is better than a settings screen nobody
 * fills in. Make it per-product the day the shop asks.
 */
export const LOW_STOCK_THRESHOLD = 5;
