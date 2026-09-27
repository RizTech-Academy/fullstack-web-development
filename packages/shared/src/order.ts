import type { Paise } from "./money";

export type OrderStatus =
  | "PENDING_PAYMENT"
  | "PLACED"
  | "PACKED"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "CANCELLED";

export type PaymentMethod = "ONLINE" | "CASH_ON_DELIVERY";

/**
 * Every move an order is allowed to make.
 *
 * Written down once, here, rather than as `if` statements scattered through a
 * service. A status field with no rules beside it drifts within a month: some
 * endpoint sets DELIVERED on an order that was cancelled, and nothing stops it.
 *
 * Terminal statuses map to an empty list, which is the whole of "you cannot
 * un-deliver an order".
 */
export const ORDER_STATUS_FLOW: Record<OrderStatus, readonly OrderStatus[]> = {
  PENDING_PAYMENT: ["PLACED", "CANCELLED"],
  PLACED: ["PACKED", "CANCELLED"],
  PACKED: ["OUT_FOR_DELIVERY", "CANCELLED"],
  OUT_FOR_DELIVERY: ["DELIVERED", "CANCELLED"],
  DELIVERED: [],
  CANCELLED: [],
} as const;

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ORDER_STATUS_FLOW[from].includes(to);
}

/**
 * What a **customer** may cancel, which is narrower than what the shop may.
 *
 * Once it is on a scooter it is a phone call, not a button: the shop needs to
 * turn the delivery person around, and nobody should be able to do that
 * silently from an app.
 */
const CUSTOMER_CANCELLABLE: readonly OrderStatus[] = ["PENDING_PAYMENT", "PLACED"];

export function customerCanCancel(status: OrderStatus): boolean {
  return CUSTOMER_CANCELLABLE.includes(status);
}

/** What a status is called in front of a customer. */
export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "Waiting for payment",
  PLACED: "Order placed",
  PACKED: "Packed and ready",
  OUT_FOR_DELIVERY: "Out for delivery",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

/** The happy path, in order, for a progress indicator. */
export const ORDER_PROGRESS: readonly OrderStatus[] = [
  "PLACED",
  "PACKED",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
];

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
  /** Each status change, oldest first. The shop's audit trail. */
  events: OrderEvent[];
  /** Computed by the API from the status, so the button cannot lie. */
  canCancel: boolean;
}

export interface OrderEvent {
  status: OrderStatus;
  at: string;
  note: string | null;
}
