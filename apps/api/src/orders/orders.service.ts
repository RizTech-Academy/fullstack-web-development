import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import {
  DEFAULT_PAGE_SIZE,
  ErrorCode,
  MAX_PAGE_SIZE,
  canTransition,
  customerCanCancel,
  utcIsoDate,
  type OrderDetail,
  type OrderStatus,
  type OrderSummary,
  type Paginated,
} from "@kirana/shared";

import { AppException } from "../common/app-exception";
import { NotificationsService } from "../notifications/notifications.service";
import { PrismaService } from "../prisma/prisma.service";
import { ORDER_INCLUDE, toOrderDetail, toOrderSummary, type OrderRow } from "./order.mapper";

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async findForUser(
    userId: string,
    page = 1,
    limit = DEFAULT_PAGE_SIZE,
  ): Promise<Paginated<OrderSummary>> {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(MAX_PAGE_SIZE, Math.max(1, limit));
    const where = { userId };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
        include: ORDER_INCLUDE,
        // Newest first, with a unique tiebreaker: two orders placed in the same
        // millisecond have no defined order without it, and can repeat across
        // pages.
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: (safePage - 1) * safeLimit,
        take: safeLimit,
      }),
      this.prisma.order.count({ where }),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / safeLimit));

    return {
      items: rows.map(toOrderSummary),
      page: safePage,
      limit: safeLimit,
      total,
      totalPages,
      hasNext: safePage < totalPages,
      hasPrevious: safePage > 1,
    };
  }

  async findOneForUser(userId: string, orderNumber: string): Promise<OrderDetail> {
    const order = await this.prisma.order.findFirst({
      // Both conditions, always. `findUnique({ orderNumber })` followed by an
      // ownership check in an `if` is the same query with one more chance to
      // forget the check.
      where: { orderNumber, userId },
      include: ORDER_INCLUDE,
    });

    // The same 404 whether the order does not exist or belongs to somebody
    // else. A 403 here would confirm that the number is real.
    if (!order) throw AppException.notFound("No such order.");

    return toOrderDetail(order);
  }

  /** The customer cancelling their own order. */
  async cancelForUser(userId: string, orderNumber: string): Promise<OrderDetail> {
    const existing = await this.prisma.order.findFirst({
      where: { orderNumber, userId },
      select: { status: true },
    });

    if (!existing) throw AppException.notFound("No such order.");

    if (!customerCanCancel(existing.status)) {
      throw new AppException(
        ErrorCode.ORDER_NOT_CANCELLABLE,
        HttpStatus.CONFLICT,
        existing.status === "CANCELLED"
          ? "That order is already cancelled."
          : "This order has left the shop. Please ring us on 020 1234 5678.",
        { status: existing.status },
      );
    }

    return this.setStatus(orderNumber, "CANCELLED", {
      note: "Cancelled by the customer",
    });
  }

  /**
   * The one place an order's status changes, for customers and for the shop.
   *
   * Two things happen here that must not happen anywhere else: the transition
   * is checked against the state machine, and cancelling gives the stock back.
   */
  async setStatus(
    orderNumber: string,
    to: OrderStatus,
    options: { note?: string; byUserId?: string } = {},
  ): Promise<OrderDetail> {
    const updated = await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { orderNumber },
        include: { items: true },
      });

      if (!order) throw AppException.notFound("No such order.");

      if (order.status === to) {
        throw new AppException(
          ErrorCode.VALIDATION_FAILED,
          HttpStatus.CONFLICT,
          `That order is already ${to.toLowerCase().replace(/_/g, " ")}.`,
          { status: order.status },
        );
      }

      if (!canTransition(order.status, to)) {
        throw new AppException(
          ErrorCode.VALIDATION_FAILED,
          HttpStatus.CONFLICT,
          `An order that is ${order.status} cannot become ${to}.`,
          { from: order.status, to },
        );
      }

      if (to === "CANCELLED") {
        await this.releaseStock(tx, order.items);
        await this.releaseSlot(tx, order.slotId, order.slotDate);
      }

      const timestamps: Prisma.OrderUpdateInput = {};
      if (to === "PLACED") timestamps.placedAt = new Date();
      if (to === "PACKED") timestamps.packedAt = new Date();
      if (to === "DELIVERED") timestamps.deliveredAt = new Date();
      if (to === "CANCELLED") timestamps.cancelledAt = new Date();

      return tx.order.update({
        where: { orderNumber },
        data: {
          status: to,
          ...timestamps,
          // Appended in the same transaction as the change it records, so the
          // trail cannot disagree with the status.
          events: {
            create: {
              status: to,
              note: options.note ?? null,
              byUserId: options.byUserId ?? null,
            },
          },
        },
        include: ORDER_INCLUDE,
      });
    });

    // After the commit, never inside it. A transaction can be rolled back; an
    // SMS cannot be unsent.
    await this.notifications.orderStatusChanged({
      orderNumber: updated.orderNumber,
      status: updated.status,
      customerName: updated.deliveryName,
      phone: updated.deliveryPhone,
      slotLabel: updated.slotLabel,
      slotDate: updated.slotDate ? utcIsoDate(updated.slotDate) : null,
    });

    return toOrderDetail(updated as OrderRow);
  }

  /**
   * Cancelling puts the stock back.
   *
   * An increment, not a write of a computed number: `stock = stock + n` is
   * arithmetic the database does on the current value, so two cancellations at
   * once cannot lose one of them. The same reasoning as claiming it — see
   * decision 0013 — running the other way.
   */
  private async releaseStock(
    tx: Prisma.TransactionClient,
    items: { variantId: string | null; quantity: number }[],
  ): Promise<void> {
    for (const item of items) {
      // Null when the variant was deleted outright, which should not happen
      // (decision 0006) but must not crash a cancellation if it ever does.
      if (!item.variantId) continue;

      await tx.variant.updateMany({
        where: { id: item.variantId },
        data: { stock: { increment: item.quantity } },
      });
    }
  }

  /** And frees the delivery place, so somebody else can have it. */
  private async releaseSlot(
    tx: Prisma.TransactionClient,
    slotId: string | null,
    date: Date | null,
  ): Promise<void> {
    if (!slotId || !date) return;

    // `booked: { gt: 0 }` so a double cancellation cannot drive the counter
    // negative and quietly create capacity the shop does not have.
    await tx.slotBooking.updateMany({
      where: { slotId, date, booked: { gt: 0 } },
      data: { booked: { decrement: 1 } },
    });
  }
}
