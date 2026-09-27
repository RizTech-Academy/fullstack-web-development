import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import {
  DELIVERY_PINCODES,
  ErrorCode,
  cartTotals,
  normalisePhone,
  parseIsoDate,
  type OrderDetail,
} from "@kirana/shared";

import { AppException } from "../common/app-exception";
import { PrismaService } from "../prisma/prisma.service";
import { toOrderDetail, ORDER_INCLUDE } from "./order.mapper";
import { generateOrderNumber } from "./order-number";
import type { CheckoutDto } from "./dto/checkout.dto";

@Injectable()
export class CheckoutService {
  private readonly logger = new Logger(CheckoutService.name);

  constructor(private readonly prisma: PrismaService) {}

  async placeOrder(userId: string, dto: CheckoutDto): Promise<OrderDetail> {
    const phone = normalisePhone(dto.phone);
    if (!phone) {
      throw new AppException(
        ErrorCode.VALIDATION_FAILED,
        HttpStatus.BAD_REQUEST,
        "We need a ten-digit Indian mobile number for the delivery.",
        { field: "phone" },
      );
    }

    if (!DELIVERY_PINCODES.includes(dto.pincode as (typeof DELIVERY_PINCODES)[number])) {
      throw AppException.outsideDeliveryArea(dto.pincode);
    }

    // UTC midnight, not local midnight. See parseIsoDate — the local version
    // stored every delivery one day early.
    const slotDate = parseIsoDate(dto.slotDate);

    /**
     * Everything below happens in one transaction, and the order of the steps
     * is the whole lesson.
     *
     * Stock first, because it is the step most likely to fail, and a failure
     * must roll back the order rather than leave a half-placed one. The slot is
     * claimed with the same conditional-update trick. Only then is the order
     * written and the cart emptied.
     */
    return this.prisma.$transaction(async (tx) => {
      const cart = await tx.cart.findFirst({
        where: { userId },
        include: { items: { include: { variant: { include: { product: true } } } } },
      });

      if (!cart || cart.items.length === 0) throw AppException.cartEmpty();

      const lines = cart.items.map((item) => ({
        variantId: item.variantId,
        productName: item.variant.product.name,
        variantLabel: item.variant.label,
        sku: item.variant.sku,
        unitPricePaise: item.variant.pricePaise,
        quantity: item.quantity,
        linePaise: item.variant.pricePaise * item.quantity,
      }));

      await this.claimStock(tx, cart.items);
      await this.claimSlot(tx, dto.slotId, slotDate);

      const totals = cartTotals(lines);

      const order = await tx.order.create({
        data: {
          orderNumber: generateOrderNumber(),
          userId,
          // Cash on delivery is placed immediately. An online order waits for
          // the gateway to confirm — module 14's subject — and until then it
          // holds its stock without being a real sale.
          status: dto.paymentMethod === "CASH_ON_DELIVERY" ? "PLACED" : "PENDING_PAYMENT",
          placedAt: dto.paymentMethod === "CASH_ON_DELIVERY" ? new Date() : null,
          paymentMethod: dto.paymentMethod,

          deliveryName: dto.name,
          deliveryPhone: phone,
          deliveryLine1: dto.line1,
          deliveryLine2: dto.line2 ?? null,
          deliveryLandmark: dto.landmark ?? null,
          deliveryCity: dto.city,
          deliveryPincode: dto.pincode,

          slotId: dto.slotId,
          slotDate,
          slotLabel: await this.slotLabel(tx, dto.slotId),

          subtotalPaise: totals.subtotalPaise,
          deliveryPaise: totals.deliveryPaise,
          totalPaise: totals.totalPaise,

          items: { create: lines },
        },
        include: ORDER_INCLUDE,
      });

      // The cart is emptied inside the transaction. Doing it afterwards means a
      // crash in between leaves the customer able to order the same basket
      // twice.
      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

      if (dto.saveAddressLabel) {
        await tx.address.create({
          data: {
            userId,
            label: dto.saveAddressLabel,
            line1: dto.line1,
            line2: dto.line2 ?? null,
            landmark: dto.landmark ?? null,
            city: dto.city,
            pincode: dto.pincode,
          },
        });
      }

      this.logger.log(`Order ${order.orderNumber} placed for user ${userId}`);
      return toOrderDetail(order);
    });
  }

  async findForUser(userId: string, orderNumber: string): Promise<OrderDetail> {
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

  /**
   * Decrements stock without ever reading it first.
   *
   * The obvious version — read the stock, check it is enough, then subtract —
   * is a race. Two customers buying the last bag of atta both read 1, both
   * decide it is fine, and both subtract, leaving stock at -1 and one customer
   * with an order the shop cannot fill.
   *
   * `updateMany` with the condition in the WHERE clause makes the database do
   * the check and the write in one statement, under its own row lock. If the
   * condition no longer holds, `count` is 0 and nothing was changed. That is
   * the signal, and it cannot be raced.
   */
  private async claimStock(
    tx: Prisma.TransactionClient,
    items: { variantId: string; quantity: number; variant: { label: string; product: { name: string } } }[],
  ): Promise<void> {
    for (const item of items) {
      const claimed = await tx.variant.updateMany({
        where: {
          id: item.variantId,
          isActive: true,
          stock: { gte: item.quantity },
        },
        data: { stock: { decrement: item.quantity } },
      });

      if (claimed.count === 0) {
        // Reading the real number here is safe: the throw rolls the whole
        // transaction back, so nothing has been taken from anybody.
        const current = await tx.variant.findUnique({
          where: { id: item.variantId },
          select: { stock: true },
        });

        throw AppException.insufficientStock({
          variantId: item.variantId,
          product: `${item.variant.product.name} (${item.variant.label})`,
          requested: item.quantity,
          available: current?.stock ?? 0,
        });
      }
    }
  }

  /**
   * Claims one place in a delivery slot, by the same trick.
   *
   * The booking row is created on first use rather than seeded for every slot
   * and every future date, which would be a lot of rows nobody reads.
   */
  private async claimSlot(
    tx: Prisma.TransactionClient,
    slotId: string,
    date: Date,
  ): Promise<void> {
    const slot = await tx.deliverySlot.findFirst({
      where: { id: slotId, isActive: true },
      select: { capacity: true },
    });

    if (!slot) throw AppException.notFound("That delivery slot does not exist.");

    // createMany with skipDuplicates rather than a findFirst-then-create, which
    // would race two first-orders-of-the-day against each other.
    await tx.slotBooking.createMany({
      data: [{ slotId, date, capacity: slot.capacity, booked: 0 }],
      skipDuplicates: true,
    });

    const claimed = await tx.slotBooking.updateMany({
      where: { slotId, date, booked: { lt: slot.capacity } },
      data: { booked: { increment: 1 } },
    });

    if (claimed.count === 0) throw AppException.slotFull();
  }

  private async slotLabel(
    tx: Prisma.TransactionClient,
    slotId: string,
  ): Promise<string> {
    const slot = await tx.deliverySlot.findUnique({
      where: { id: slotId },
      select: { label: true },
    });
    return slot?.label ?? "";
  }
}
