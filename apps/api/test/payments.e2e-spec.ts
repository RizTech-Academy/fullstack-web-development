import { createHmac } from "node:crypto";
import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { PrismaService } from "../src/prisma/prisma.service";
import { cookiesFrom, createTestApp } from "./app.factory";

describe("payments", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let cookie: string;
  let orderNumber: string;
  let providerRef: string;
  let amountPaise: number;

  const sign = (body: string) =>
    createHmac("sha256", process.env.PAYMENT_WEBHOOK_SECRET as string)
      .update(body)
      .digest("hex");

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());

    const login = await request(app.getHttpServer())
      .post("/api/auth/login")
      .send({ email: "asha@example.com", password: "kirana-dev-password" })
      .expect(200);
    cookie = cookiesFrom(login);

    const variant = await prisma.variant.findFirstOrThrow({ where: { sku: "EGG-6" } });
    const days = await request(app.getHttpServer()).get("/api/delivery-slots").expect(200);
    const day = days.body.find((d: { slots: unknown[] }) => d.slots.length > 0);

    await request(app.getHttpServer()).delete("/api/cart").set("Cookie", cookie).expect(200);
    await request(app.getHttpServer())
      .post("/api/cart/items")
      .set("Cookie", cookie)
      .send({ variantId: variant.id, quantity: 1 })
      .expect(201);

    const order = await request(app.getHttpServer())
      .post("/api/checkout")
      .set("Cookie", cookie)
      .send({
        name: "Asha Kulkarni",
        phone: "9876543210",
        line1: "Flat 402, Sai Residency",
        city: "Pune",
        pincode: "412207",
        slotId: day.slots[0].id,
        slotDate: day.date,
        paymentMethod: "ONLINE",
      })
      .expect(201);

    orderNumber = order.body.orderNumber;

    const intent = await request(app.getHttpServer())
      .post(`/api/payments/${orderNumber}/intent`)
      .set("Cookie", cookie)
      .expect(200);

    providerRef = intent.body.providerRef;
    amountPaise = intent.body.amountPaise;
  });

  afterAll(async () => {
    await app.close();
  });

  const event = (overrides: Record<string, unknown> = {}) =>
    JSON.stringify({
      event: "payment.succeeded",
      providerRef,
      orderNumber,
      amountPaise,
      eventId: "evt_e2e_1",
      ...overrides,
    });

  it("creates an online order waiting for payment", () => {
    expect(orderNumber).toBeTruthy();
  });

  it("reuses an open attempt rather than opening a second", async () => {
    const again = await request(app.getHttpServer())
      .post(`/api/payments/${orderNumber}/intent`)
      .set("Cookie", cookie)
      .expect(200);

    // Two live payments against one order could both succeed.
    expect(again.body.providerRef).toBe(providerRef);
  });

  it("rejects a webhook with no signature", async () => {
    await request(app.getHttpServer())
      .post("/api/payments/webhook")
      .set("Content-Type", "application/json")
      .send(event())
      .expect(401);
  });

  it("rejects a webhook signed with the wrong key", async () => {
    const body = event();
    const wrong = createHmac("sha256", "not-the-secret").update(body).digest("hex");

    await request(app.getHttpServer())
      .post("/api/payments/webhook")
      .set("Content-Type", "application/json")
      .set("x-kirana-signature", wrong)
      .send(body)
      .expect(401);
  });

  it("rejects a body changed after signing", async () => {
    const original = event();
    const tampered = event({ amountPaise: 100 });

    await request(app.getHttpServer())
      .post("/api/payments/webhook")
      .set("Content-Type", "application/json")
      .set("x-kirana-signature", sign(original))
      .send(tampered)
      .expect(401);
  });

  it("refuses a correctly signed event whose amount does not match", async () => {
    const body = event({ amountPaise: amountPaise + 1 });

    await request(app.getHttpServer())
      .post("/api/payments/webhook")
      .set("Content-Type", "application/json")
      .set("x-kirana-signature", sign(body))
      .send(body)
      .expect(400);
  });

  it("acknowledges an unknown payment so the gateway stops retrying", async () => {
    const body = event({ providerRef: "pay_nosuchthing" });

    await request(app.getHttpServer())
      .post("/api/payments/webhook")
      .set("Content-Type", "application/json")
      .set("x-kirana-signature", sign(body))
      .send(body)
      .expect(200);
  });

  it("places the order on a valid success", async () => {
    const body = event();

    await request(app.getHttpServer())
      .post("/api/payments/webhook")
      .set("Content-Type", "application/json")
      .set("x-kirana-signature", sign(body))
      .send(body)
      .expect(200);

    const order = await request(app.getHttpServer())
      .get(`/api/orders/${orderNumber}`)
      .set("Cookie", cookie)
      .expect(200);

    expect(order.body.status).toBe("PLACED");
    expect(order.body.events.some((e: { note: string }) => e.note === "Payment received")).toBe(true);
  });

  it("changes nothing when the same webhook arrives again", async () => {
    const before = await request(app.getHttpServer())
      .get(`/api/orders/${orderNumber}`)
      .set("Cookie", cookie)
      .expect(200);

    const body = event();
    await request(app.getHttpServer())
      .post("/api/payments/webhook")
      .set("Content-Type", "application/json")
      .set("x-kirana-signature", sign(body))
      .send(body)
      .expect(200);

    const after = await request(app.getHttpServer())
      .get(`/api/orders/${orderNumber}`)
      .set("Cookie", cookie)
      .expect(200);

    // Gateways retry by design, so duplicates are certain rather than
    // unlikely — and they arrive when you are busiest.
    expect(after.body.events).toHaveLength(before.body.events.length);
    expect(after.body.status).toBe("PLACED");
  });
});
