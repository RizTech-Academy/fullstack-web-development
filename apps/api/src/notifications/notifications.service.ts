import { Injectable, Logger } from "@nestjs/common";
import { ORDER_STATUS_LABELS, type OrderStatus } from "@kirana/shared";

export interface OrderNotification {
  orderNumber: string;
  status: OrderStatus;
  customerName: string;
  phone: string;
  slotLabel: string | null;
  slotDate: string | null;
}

/**
 * Where "we have told the customer" happens.
 *
 * It logs, and that is the honest state of it: an SMS gateway is an account,
 * a sender ID, a DLT registration in India, and a per-message cost. What
 * matters for the course is **where the call goes**, not which vendor makes it.
 *
 * Two rules this shape enforces:
 *
 * 1. **Never inside the transaction.** A transaction can be rolled back or
 *    retried; an SMS cannot be unsent. Callers send after the commit.
 * 2. **Never let it fail the operation.** The order is placed. If the message
 *    does not go out, that is a message problem, not an order problem — so
 *    every method here swallows its own errors and logs them.
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  async orderStatusChanged(notification: OrderNotification): Promise<void> {
    const text = this.messageFor(notification);
    if (!text) return;

    try {
      // A real gateway call goes here. Everything around it stays the same.
      this.logger.log(`SMS to ${this.maskPhone(notification.phone)}: ${text}`);
    } catch (error) {
      this.logger.error(`Could not notify about ${notification.orderNumber}`, error);
    }
  }

  /**
   * Not every status is worth a message.
   *
   * A shop that texts four times for one order of dal gets muted, and then the
   * one message that mattered — "we are outside" — is muted too.
   */
  private messageFor(n: OrderNotification): string | null {
    switch (n.status) {
      case "PLACED":
        return `Kirana Store: order ${n.orderNumber} confirmed. Delivery ${n.slotLabel ?? "soon"}${n.slotDate ? ` on ${n.slotDate}` : ""}.`;
      case "OUT_FOR_DELIVERY":
        return `Kirana Store: order ${n.orderNumber} is on its way.`;
      case "DELIVERED":
        return `Kirana Store: order ${n.orderNumber} delivered. Thank you.`;
      case "CANCELLED":
        return `Kirana Store: order ${n.orderNumber} has been cancelled.`;
      // PACKED and PENDING_PAYMENT are the shop's business, not news.
      default:
        return null;
    }
  }

  /** Logs are read by people and shipped to third parties. */
  private maskPhone(phone: string): string {
    return phone.length <= 4 ? "****" : `******${phone.slice(-4)}`;
  }
}
