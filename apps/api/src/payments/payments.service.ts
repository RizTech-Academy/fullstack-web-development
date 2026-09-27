import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import {
  ErrorCode,
  PAYMENT_WINDOW_MINUTES,
  type PaymentIntent,
  type PaymentWebhookEvent,
} from "@kirana/shared";

import { AppException } from "../common/app-exception";
import { OrdersService } from "../orders/orders.service";
import { PrismaService } from "../prisma/prisma.service";
import { PaymentGateway } from "./gateway";

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: PaymentGateway,
    private readonly orders: OrdersService,
  ) {}

  /**
   * Opens a payment for an order the customer owns.
   *
   * The amount is read from the order, never taken from the request. A client
   * that can send an amount can send 1.
   */
  async createIntent(userId: string, orderNumber: string): Promise<PaymentIntent> {
    const order = await this.prisma.order.findFirst({
      where: { orderNumber, userId },
      select: { id: true, orderNumber: true, status: true, totalPaise: true },
    });

    if (!order) throw AppException.notFound("No such order.");

    if (order.status !== "PENDING_PAYMENT") {
      throw new AppException(
        ErrorCode.VALIDATION_FAILED,
        HttpStatus.CONFLICT,
        "That order is not waiting for payment.",
        { status: order.status },
      );
    }

    // Reuse an open attempt rather than opening a second one. Somebody who
    // refreshes the payment page twice must not end up with two live payments
    // against one order, either of which could succeed.
    const existing = await this.prisma.payment.findFirst({
      where: { orderId: order.id, status: "PENDING" },
      orderBy: { createdAt: "desc" },
    });

    if (existing) {
      return {
        orderNumber: order.orderNumber,
        providerRef: existing.providerRef as string,
        amountPaise: existing.amountPaise,
        publicKey: this.gateway.publicKey(),
      };
    }

    const providerRef = this.gateway.createIntent(order.orderNumber, order.totalPaise);

    await this.prisma.payment.create({
      data: {
        orderId: order.id,
        provider: "fake",
        providerRef,
        amountPaise: order.totalPaise,
        status: "PENDING",
      },
    });

    return {
      orderNumber: order.orderNumber,
      providerRef,
      amountPaise: order.totalPaise,
      publicKey: this.gateway.publicKey(),
    };
  }

  /**
   * The only thing that may mark an order paid.
   *
   * Never the browser. A success page is a redirect the customer's machine
   * performed, and anybody can perform a redirect — the module 14 lesson on
   * webhooks is about exactly this.
   */
  async handleWebhook(rawBody: string, signature: string | undefined): Promise<{ received: true }> {
    if (!signature || !this.gateway.verify(rawBody, signature)) {
      // 401, and no detail. A forged request should learn nothing about why it
      // was rejected.
      throw new AppException(
        ErrorCode.UNAUTHENTICATED,
        HttpStatus.UNAUTHORIZED,
        "Bad signature.",
      );
    }

    let event: PaymentWebhookEvent;
    try {
      event = JSON.parse(rawBody) as PaymentWebhookEvent;
    } catch {
      throw new AppException(
        ErrorCode.VALIDATION_FAILED,
        HttpStatus.BAD_REQUEST,
        "Body is not JSON.",
      );
    }

    const payment = await this.prisma.payment.findUnique({
      where: { providerRef: event.providerRef },
      include: { order: { select: { orderNumber: true, status: true, totalPaise: true } } },
    });

    // A webhook for something we have never heard of. 200, not 404: a gateway
    // that gets an error retries, and retrying will not make us recognise it.
    if (!payment) {
      this.logger.warn(`Webhook for unknown payment ${event.providerRef}`);
      return { received: true };
    }

    // Idempotency. Gateways deliver more than once — that is normal, documented
    // behaviour, not a fault — so the second delivery must change nothing.
    if (payment.status !== "PENDING") {
      this.logger.log(`Ignoring repeat webhook for ${event.providerRef}`);
      return { received: true };
    }

    // Never trust the amount in the event either. If it does not match what we
    // asked for, something is wrong and a human should look.
    if (event.amountPaise !== payment.amountPaise) {
      this.logger.error(
        `Amount mismatch on ${event.providerRef}: expected ${payment.amountPaise}, got ${event.amountPaise}`,
      );
      throw new AppException(
        ErrorCode.VALIDATION_FAILED,
        HttpStatus.BAD_REQUEST,
        "Amount does not match the order.",
      );
    }

    if (event.event === "payment.succeeded") {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: "SUCCEEDED", idempotencyKey: event.eventId },
      });

      // Through the state machine, so the notification and the audit trail
      // happen exactly as they do for every other status change.
      await this.orders.setStatus(payment.order.orderNumber, "PLACED", {
        note: "Payment received",
      });
    } else if (event.event === "payment.failed") {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: "FAILED", idempotencyKey: event.eventId },
      });
      // The order stays PENDING_PAYMENT so the customer can try again. It is
      // released by the sweep below if they never do.
      this.logger.log(`Payment failed for ${payment.order.orderNumber}`);
    }

    return { received: true };
  }

  /**
   * Cancels orders that were never paid for, putting their stock back.
   *
   * A PENDING_PAYMENT order holds stock it has not paid for. Without this, a
   * customer who opens the payment page and closes the tab quietly removes a
   * bag of atta from the shop's shelf forever.
   *
   * Called from a scheduled job in production. Exposed to the admin here so it
   * can be run and watched.
   */
  async expireStale(now = new Date()): Promise<{ cancelled: string[] }> {
    const cutoff = new Date(now.getTime() - PAYMENT_WINDOW_MINUTES * 60 * 1000);

    const stale = await this.prisma.order.findMany({
      where: { status: "PENDING_PAYMENT", createdAt: { lt: cutoff } },
      select: { orderNumber: true },
    });

    const cancelled: string[] = [];

    for (const order of stale) {
      try {
        // setStatus releases the stock and the slot, so this is three words
        // rather than a second copy of that logic.
        await this.orders.setStatus(order.orderNumber, "CANCELLED", {
          note: "Not paid within the payment window",
        });
        cancelled.push(order.orderNumber);
      } catch (error) {
        // One order that cannot be cancelled must not stop the sweep.
        this.logger.error(`Could not expire ${order.orderNumber}`, error);
      }
    }

    if (cancelled.length > 0) {
      this.logger.log(`Expired ${cancelled.length} unpaid orders`);
    }

    return { cancelled };
  }

  /** A refund against a succeeded payment. Admin only — see the controller. */
  async refund(orderNumber: string): Promise<{ refunded: number }> {
    const payment = await this.prisma.payment.findFirst({
      where: { order: { orderNumber }, status: "SUCCEEDED" },
      orderBy: { createdAt: "desc" },
    });

    if (!payment) {
      throw AppException.notFound("No successful payment to refund.");
    }

    const reference = await this.gateway.refund(
      payment.providerRef as string,
      payment.amountPaise,
    );

    await this.prisma.payment.update({
      where: { id: payment.id },
      // REFUNDED, not deleted. The money moved twice and both movements are
      // part of the record.
      data: { status: "REFUNDED", idempotencyKey: reference },
    });

    this.logger.log(`Refunded ${payment.amountPaise} paise for ${orderNumber}`);
    return { refunded: payment.amountPaise };
  }

  /** Used by the development-only simulator. Never reachable in production. */
  signForSimulator(rawBody: string): string {
    return this.gateway.sign(rawBody);
  }
}
