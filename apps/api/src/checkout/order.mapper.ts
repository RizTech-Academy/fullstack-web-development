import type { Prisma } from "@prisma/client";
import { utcIsoDate, type OrderDetail } from "@kirana/shared";

export const ORDER_INCLUDE = { items: true } as const;

export type OrderRow = Prisma.OrderGetPayload<{ include: typeof ORDER_INCLUDE }>;

export function toOrderDetail(row: OrderRow): OrderDetail {
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
  };
}
