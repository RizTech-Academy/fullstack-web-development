import { describe, expect, it } from "vitest";
import { ConfigService } from "@nestjs/config";

import { PaymentGateway } from "./gateway";

const config = (values: Record<string, string | undefined>) =>
  ({ get: (key: string) => values[key] }) as ConfigService;

describe("PaymentGateway", () => {
  const secret = "a-secret-long-enough-to-be-accepted";

  describe("configuration", () => {
    it("refuses to start without a secret", () => {
      // A fallback default here would mean every forged webhook is accepted,
      // silently, in production. Failing at startup is the whole point.
      expect(() => new PaymentGateway(config({}))).toThrow(/PAYMENT_WEBHOOK_SECRET/);
    });

    it("refuses a short secret", () => {
      expect(() => new PaymentGateway(config({ PAYMENT_WEBHOOK_SECRET: "tooshort" }))).toThrow();
    });
  });

  describe("signature verification", () => {
    const gateway = new PaymentGateway(config({ PAYMENT_WEBHOOK_SECRET: secret }));
    const body = JSON.stringify({ event: "payment.succeeded", amountPaise: 23_000 });

    it("accepts a signature it produced", () => {
      expect(gateway.verify(body, gateway.sign(body))).toBe(true);
    });

    it("rejects a wrong signature", () => {
      expect(gateway.verify(body, "0".repeat(64))).toBe(false);
    });

    it("rejects a signature of the wrong length", () => {
      // timingSafeEqual throws on a length mismatch, so this asserts the guard
      // in front of it exists.
      expect(gateway.verify(body, "abc")).toBe(false);
    });

    it("rejects a tampered body", () => {
      const signature = gateway.sign(body);
      const tampered = JSON.stringify({ event: "payment.succeeded", amountPaise: 1 });
      expect(gateway.verify(tampered, signature)).toBe(false);
    });

    it("notices a single changed character", () => {
      const signature = gateway.sign(body);
      expect(gateway.verify(body + " ", signature)).toBe(false);
    });

    it("rejects a signature made with a different secret", () => {
      const other = new PaymentGateway(config({ PAYMENT_WEBHOOK_SECRET: "a-different-secret-entirely" }));
      expect(gateway.verify(body, other.sign(body))).toBe(false);
    });
  });

  describe("references", () => {
    const gateway = new PaymentGateway(config({ PAYMENT_WEBHOOK_SECRET: secret }));

    it("mints a distinct reference each time", () => {
      const refs = new Set(Array.from({ length: 50 }, () => gateway.createIntent("KS-1", 100)));
      expect(refs.size).toBe(50);
    });
  });
});
