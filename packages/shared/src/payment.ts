import type { Paise } from "./money";

export type PaymentStatus = "PENDING" | "SUCCEEDED" | "FAILED" | "REFUNDED";

/**
 * What the front end needs to hand the customer to the gateway.
 *
 * Deliberately not the whole Payment row: the amount and a reference, and
 * nothing the browser could usefully tamper with. The amount is here to be
 * *displayed*; what is charged is whatever the API told the gateway.
 */
export interface PaymentIntent {
  orderNumber: string;
  providerRef: string;
  amountPaise: Paise;
  /** Public by design — a gateway key that identifies the shop, not a secret. */
  publicKey: string;
}

export interface PaymentView {
  providerRef: string;
  status: PaymentStatus;
  amountPaise: Paise;
  createdAt: string;
}

/** What a gateway sends us. Named here so both halves agree on the shape. */
export interface PaymentWebhookEvent {
  event: "payment.succeeded" | "payment.failed" | "refund.processed";
  providerRef: string;
  orderNumber: string;
  amountPaise: Paise;
  /** The gateway's own id for this delivery, used for idempotency. */
  eventId: string;
}

export const PAYMENT_WINDOW_MINUTES = 15;
