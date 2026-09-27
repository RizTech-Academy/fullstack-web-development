import type { Paise } from "./money";

export type OrderStatus =
  | "PENDING_PAYMENT"
  | "PLACED"
  | "PACKED"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "CANCELLED";

export type PaymentMethod = "ONLINE" | "CASH_ON_DELIVERY";

export interface OrderLine {
  /** Snapshotted at checkout. Renaming the product later does not change it. */
  productName: string;
  variantLabel: string;
  sku: string;
  unitPricePaise: Paise;
  quantity: number;
  linePaise: Paise;
}

export interface OrderSummary {
  orderNumber: string;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  subtotalPaise: Paise;
  deliveryPaise: Paise;
  totalPaise: Paise;
  placedAt: string | null;
  slotDate: string | null;
  slotLabel: string | null;
  itemCount: number;
}

export interface OrderDetail extends OrderSummary {
  lines: OrderLine[];
  delivery: {
    name: string;
    phone: string;
    line1: string;
    line2: string | null;
    landmark: string | null;
    city: string;
    pincode: string;
  };
}
