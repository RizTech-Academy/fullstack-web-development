import type { Prisma } from "@prisma/client";
import {
  customerCanCancel,
  utcIsoDate,
  type OrderDetail,
  type OrderSummary,
} from "@kirana/shared";

export const ORDER_INCLUDE = {
  items: true,
  events: { orderBy: { createdAt: "asc" } },
} as const satisfies Prisma.OrderInclude;

export type OrderRow = Prisma.OrderGetPayload<{ include: typeof ORDER_INCLUDE }>;

export function toOrderSummary(row: OrderRow): OrderSummary {
  return {
    orderNumber: row.orderNumber,
    status: row.status,
    paymentMethod: row.paymentMethod,
    subtotalPaise: row.subtotalPaise,
    deliveryPaise: row.deliveryPaise,
    totalPaise: row.totalPaise,
    // ISO strings, not Date objects. JSON has no date type, so a Date becomes a
    // UTC string anyway — being explicit stops the shape being a surprise.
    placedAt: row.placedAt?.toISOString() ?? null,
    slotDate: row.slotDate ? utcIsoDate(row.slotDate) : null,
    slotLabel: row.slotLabel,
    itemCount: row.items.length,
  };
}

export function toOrderDetail(row: OrderRow): OrderDetail {
  return {
    ...toOrderSummary(row),
    lines: row.items.map((item) => ({
      productName: item.productName,
      variantLabel: item.variantLabel,
      sku: item.sku,
      unitPricePaise: item.unitPricePaise,
      quantity: item.quantity,
      linePaise: item.linePaise,
    })),
    delivery: {
      name: row.deliveryName,
      phone: row.deliveryPhone,
      line1: row.deliveryLine1,
      line2: row.deliveryLine2,
      landmark: row.deliveryLandmark,
      city: row.deliveryCity,
      pincode: row.deliveryPincode,
    },
    events: row.events.map((event) => ({
      status: event.status,
      at: event.createdAt.toISOString(),
      note: event.note,
    })),
    // Computed here, from the status, so the button in the interface cannot
    // offer something the API will refuse.
    canCancel: customerCanCancel(row.status),
  };
}
