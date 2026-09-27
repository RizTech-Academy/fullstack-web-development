import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { PrismaService } from "../src/prisma/prisma.service";
import { cookiesFrom, createTestApp } from "./app.factory";

/**
 * The tests that are worth their cost.
 *
 * Everything here is behaviour that only exists when the pieces are joined: a
 * cookie minted by one request and read by another, a transaction that has to
 * roll back as a whole, a conditional UPDATE against a real row lock. None of
 * it can be unit tested without mocking the very thing being tested.
 */
describe("cart and checkout", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let variantId: string;
  let slot: { id: string; date: string };

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());

    const variant = await prisma.variant.findFirstOrThrow({ where: { sku: "DAL-TOOR-500" } });
    variantId = variant.id;

    const days = await request(app.getHttpServer()).get("/api/delivery-slots").expect(200);
    const day = days.body.find((d: { slots: unknown[] }) => d.slots.length > 0);
    slot = { id: day.slots[0].id, date: day.date };
  });

  afterAll(async () => {
    await app.close();
  });

  const address = () => ({
    name: "Asha Kulkarni",
    phone: "9876543210",
    line1: "Flat 402, Sai Residency, Lane 5",
    city: "Pune",
    pincode: "412207",
    slotId: slot.id,
    slotDate: slot.date,
    paymentMethod: "CASH_ON_DELIVERY" as const,
  });

  async function signIn(): Promise<string> {
    const response = await request(app.getHttpServer())
      .post("/api/auth/login")
      .send({ email: "asha@example.com", password: "kirana-dev-password" })
      .expect(200);

    return cookiesFrom(response);
  }

  it("does not create a cart for a read", async () => {
    const before = await prisma.cart.count();

    await request(app.getHttpServer()).get("/api/cart").expect(200);
    await request(app.getHttpServer()).get("/api/cart").expect(200);

    // Every crawler that touches the storefront would otherwise leave a row.
    expect(await prisma.cart.count()).toBe(before);
  });

  it("mints a cart cookie on the first write", async () => {
    const response = await request(app.getHttpServer())
      .post("/api/cart/items")
      .send({ variantId, quantity: 1 })
      .expect(201);

    const setCookie = response.headers["set-cookie"];
    expect(String(setCookie)).toContain("kirana_cart");
    // It is a bearer credential, so JavaScript must not be able to read it.
    expect(String(setCookie)).toContain("HttpOnly");
  });

  it("increases the line rather than duplicating it", async () => {
    const first = await request(app.getHttpServer())
      .post("/api/cart/items")
      .send({ variantId, quantity: 2 })
      .expect(201);

    const cookie = cookiesFrom(first);

    const second = await request(app.getHttpServer())
      .post("/api/cart/items")
      .set("Cookie", cookie)
      .send({ variantId, quantity: 3 })
      .expect(201);

    expect(second.body.lines).toHaveLength(1);
    expect(second.body.lines[0].quantity).toBe(5);
  });

  it("carries the cart through a sign-in", async () => {
    const added = await request(app.getHttpServer())
      .post("/api/cart/items")
      .send({ variantId, quantity: 2 })
      .expect(201);

    const anonymous = cookiesFrom(added);

    const login = await request(app.getHttpServer())
      .post("/api/auth/login")
      .set("Cookie", anonymous)
      .send({ email: "asha@example.com", password: "kirana-dev-password" })
      .expect(200);

    const cart = await request(app.getHttpServer())
      .get("/api/cart")
      .set("Cookie", cookiesFrom(login))
      .expect(200);

    // Losing this is a lost sale: somebody fills a basket, is asked to sign in
    // at the till, and comes back to nothing.
    expect(cart.body.lines.length).toBeGreaterThan(0);
  });

  it("refuses checkout without a sign-in", async () => {
    const response = await request(app.getHttpServer())
      .post("/api/checkout")
      .send(address())
      .expect(401);

    expect(response.body.code).toBe("UNAUTHENTICATED");
  });

  it("places an order, takes the stock and empties the cart", async () => {
    const cookie = await signIn();

    await request(app.getHttpServer())
      .delete("/api/cart")
      .set("Cookie", cookie)
      .expect(200);

    const before = await prisma.variant.findFirstOrThrow({ where: { id: variantId } });

    await request(app.getHttpServer())
      .post("/api/cart/items")
      .set("Cookie", cookie)
      .send({ variantId, quantity: 2 })
      .expect(201);

    const order = await request(app.getHttpServer())
      .post("/api/checkout")
      .set("Cookie", cookie)
      .send(address())
      .expect(201);

    expect(order.body.status).toBe("PLACED");

    const after = await prisma.variant.findFirstOrThrow({ where: { id: variantId } });
    expect(after.stock).toBe(before.stock - 2);

    const cart = await request(app.getHttpServer())
      .get("/api/cart")
      .set("Cookie", cookie)
      .expect(200);
    expect(cart.body.lines).toHaveLength(0);
  });

  it("snapshots the product name onto the order", async () => {
    const cookie = await signIn();

    await request(app.getHttpServer())
      .post("/api/cart/items")
      .set("Cookie", cookie)
      .send({ variantId, quantity: 1 })
      .expect(201);

    const order = await request(app.getHttpServer())
      .post("/api/checkout")
      .set("Cookie", cookie)
      .send(address())
      .expect(201);

    const original = order.body.lines[0].productName;

    await prisma.product.update({
      where: { slug: "toor-dal" },
      data: { name: "Toor Dal Renamed By A Test" },
    });

    try {
      const reread = await request(app.getHttpServer())
        .get(`/api/orders/${order.body.orderNumber}`)
        .set("Cookie", cookie)
        .expect(200);

      // An order is a record of what was agreed. A live join would let it
      // change after the fact.
      expect(reread.body.lines[0].productName).toBe(original);
    } finally {
      await prisma.product.update({
        where: { slug: "toor-dal" },
        data: { name: original },
      });
    }
  });

  it("rolls the whole order back when stock runs out", async () => {
    const cookie = await signIn();

    const plenty = await prisma.variant.findFirstOrThrow({ where: { sku: "VEG-TOM-500" } });
    const scarce = await prisma.variant.findFirstOrThrow({ where: { sku: "VEG-ONI-1000" } });

    await request(app.getHttpServer()).delete("/api/cart").set("Cookie", cookie).expect(200);

    await request(app.getHttpServer())
      .post("/api/cart/items")
      .set("Cookie", cookie)
      .send({ variantId: plenty.id, quantity: 1 })
      .expect(201);

    await request(app.getHttpServer())
      .post("/api/cart/items")
      .set("Cookie", cookie)
      .send({ variantId: scarce.id, quantity: 1 })
      .expect(201);

    // Empty the scarce one behind the cart's back, the way another customer
    // buying the last of it would.
    const originalStock = scarce.stock;
    await prisma.variant.update({ where: { id: scarce.id }, data: { stock: 0 } });

    try {
      const ordersBefore = await prisma.order.count();
      const plentyBefore = await prisma.variant.findFirstOrThrow({ where: { id: plenty.id } });

      const response = await request(app.getHttpServer())
        .post("/api/checkout")
        .set("Cookie", cookie)
        .send(address())
        .expect(409);

      expect(response.body.code).toBe("INSUFFICIENT_STOCK");

      // The in-stock item must not have been taken, and no order must exist.
      const plentyAfter = await prisma.variant.findFirstOrThrow({ where: { id: plenty.id } });
      expect(plentyAfter.stock).toBe(plentyBefore.stock);
      expect(await prisma.order.count()).toBe(ordersBefore);
    } finally {
      await prisma.variant.update({ where: { id: scarce.id }, data: { stock: originalStock } });
    }
  });

  it("refuses a pincode the shop does not deliver to", async () => {
    const cookie = await signIn();

    await request(app.getHttpServer()).delete("/api/cart").set("Cookie", cookie).expect(200);
    await request(app.getHttpServer())
      .post("/api/cart/items")
      .set("Cookie", cookie)
      .send({ variantId, quantity: 1 })
      .expect(201);

    const response = await request(app.getHttpServer())
      .post("/api/checkout")
      .set("Cookie", cookie)
      .send({ ...address(), pincode: "560001" })
      .expect(400);

    expect(response.body.code).toBe("OUTSIDE_DELIVERY_AREA");
  });

  it("stores the delivery date as the day that was chosen", async () => {
    const cookie = await signIn();

    await request(app.getHttpServer()).delete("/api/cart").set("Cookie", cookie).expect(200);
    await request(app.getHttpServer())
      .post("/api/cart/items")
      .set("Cookie", cookie)
      .send({ variantId, quantity: 1 })
      .expect(201);

    const order = await request(app.getHttpServer())
      .post("/api/checkout")
      .set("Cookie", cookie)
      .send(address())
      .expect(201);

    // Checked against the database, not against what the API echoed back. The
    // day-early bug returned 201 and echoed the right date while storing the
    // wrong one — see the module 12 lesson.
    const row = await prisma.order.findFirstOrThrow({
      where: { orderNumber: order.body.orderNumber },
    });

    expect(row.slotDate?.toISOString().slice(0, 10)).toBe(slot.date);
  });
});
