import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

/**
 * Stands in for Razorpay, Stripe, PayU or whoever the shop signs up with.
 *
 * It is a fake, and it is a *faithful* fake: the signature it produces is a
 * real HMAC-SHA256 over the raw body, checked the way a real one must be. The
 * part that is pretend is only who sends it.
 *
 * That matters because signature verification is the piece people get wrong,
 * and it is the piece a sandbox account would not teach you any better. Swap
 * this class for a provider's SDK and every caller stays the same — that is the
 * whole reason it is behind an interface.
 */
@Injectable()
export class PaymentGateway {
  private readonly logger = new Logger(PaymentGateway.name);
  private readonly secret: string;

  constructor(private readonly config: ConfigService) {
    const secret = this.config.get<string>("PAYMENT_WEBHOOK_SECRET");

    // Fail at startup, not on the first webhook. A missing secret with a
    // fallback default means every forged request is accepted.
    if (!secret || secret.length < 16) {
      throw new Error(
        "PAYMENT_WEBHOOK_SECRET must be set and at least 16 characters. Generate one with: openssl rand -base64 32",
      );
    }

    this.secret = secret;
  }

  /** The key the browser may see. Identifies the shop; authorises nothing. */
  publicKey(): string {
    return this.config.get<string>("PAYMENT_PUBLIC_KEY") ?? "kirana_test_key";
  }

  /**
   * Opens a payment with the provider and returns their reference.
   *
   * A real call posts the **amount from your database** to the provider. The
   * browser is told what to display; it never says what to charge.
   */
  createIntent(orderNumber: string, amountPaise: number): string {
    this.logger.log(`Opening payment for ${orderNumber}: ${amountPaise} paise`);
    return `pay_${randomBytes(12).toString("hex")}`;
  }

  sign(rawBody: string): string {
    return createHmac("sha256", this.secret).update(rawBody).digest("hex");
  }

  /**
   * Verifies a webhook signature over the **raw** body.
   *
   * Two things here are non-negotiable.
   *
   * The raw bytes, not the parsed object re-serialised. `JSON.stringify` of a
   * parsed body reorders nothing in practice but changes whitespace, and the
   * signature is over exactly what was sent. Re-serialising gives a signature
   * that never matches, and the usual "fix" is to stop checking.
   *
   * `timingSafeEqual`, not `===`. String comparison returns as soon as two
   * bytes differ, so how long it takes leaks how much of the signature was
   * right — enough, over many attempts, to guess one.
   */
  verify(rawBody: string, signature: string): boolean {
    const expected = Buffer.from(this.sign(rawBody), "utf8");
    const provided = Buffer.from(signature, "utf8");

    // timingSafeEqual throws on a length mismatch, which is itself a leak, so
    // the length is checked first and the comparison still runs in constant
    // time for anything of the right shape.
    if (expected.length !== provided.length) return false;

    return timingSafeEqual(expected, provided);
  }

  async refund(providerRef: string, amountPaise: number): Promise<string> {
    this.logger.log(`Refunding ${amountPaise} paise against ${providerRef}`);
    return `rfnd_${randomBytes(12).toString("hex")}`;
  }
}
