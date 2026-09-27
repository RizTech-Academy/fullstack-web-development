import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createTestApp } from "./app.factory";

/**
 * Read-only, so it needs no fixtures of its own — it runs against the seed.
 *
 * That is a deliberate trade. A test that builds its own data is independent
 * and slow; one that leans on the seed is fast and couples the suite to it.
 * For a catalogue that the seed exists to populate, leaning on it is right.
 */
describe("catalogue", () => {
  let app: INestApplication;

  beforeAll(async () => {
    ({ app } = await createTestApp());
  });

  afterAll(async () => {
    await app.close();
  });

  it("lists products with a page of results", async () => {
    const response = await request(app.getHttpServer()).get("/api/products").expect(200);

    expect(response.body.items.length).toBeGreaterThan(0);
    expect(response.body).toMatchObject({ page: 1, hasPrevious: false });
  });

  it("never exposes the stock level", async () => {
    const response = await request(app.getHttpServer()).get("/api/products").expect(200);

    for (const product of response.body.items) {
      // A boolean, not a count. The level is commercial information.
      expect(typeof product.cheapestVariant.inStock).toBe("boolean");
      expect(product.cheapestVariant).not.toHaveProperty("stock");
    }
  });

  it("shows the cheapest variant first", async () => {
    const response = await request(app.getHttpServer())
      .get("/api/products/aashirvaad-select-atta")
      .expect(200);

    const prices = response.body.variants.map((v: { pricePaise: number }) => v.pricePaise);
    expect(prices).toEqual([...prices].sort((a, b) => a - b));
    expect(response.body.cheapestVariant.pricePaise).toBe(prices[0]);
  });

  it("searches across every term", async () => {
    // "toor dal" must find the product even though no single field contains
    // both words in that order.
    const response = await request(app.getHttpServer())
      .get("/api/products?q=toor%20dal")
      .expect(200);

    expect(response.body.items.length).toBeGreaterThan(0);
  });

  it("treats an empty q as no filter", async () => {
    const [all, empty] = await Promise.all([
      request(app.getHttpServer()).get("/api/products").expect(200),
      request(app.getHttpServer()).get("/api/products?q=").expect(200),
    ]);

    expect(empty.body.total).toBe(all.body.total);
  });

  it("clamps a page size above the maximum", async () => {
    await request(app.getHttpServer()).get("/api/products?limit=5000").expect(400);
  });

  it("rejects an unknown query parameter", async () => {
    // `forbidNonWhitelisted` — a typo in a filter name must not be ignored.
    await request(app.getHttpServer()).get("/api/products?categary=dairy").expect(400);
  });

  it("is a 404 for a product that does not exist", async () => {
    const response = await request(app.getHttpServer())
      .get("/api/products/not-a-real-product")
      .expect(404);

    expect(response.body.code).toBe("NOT_FOUND");
  });

  it("returns every error in one shape", async () => {
    const response = await request(app.getHttpServer()).get("/api/products/nope").expect(404);

    expect(response.body).toMatchObject({
      statusCode: 404,
      code: expect.any(String),
      message: expect.any(String),
    });
  });

  it("hides categories that would show nothing", async () => {
    const response = await request(app.getHttpServer()).get("/api/categories").expect(200);

    for (const category of response.body) {
      expect(category.productCount).toBeGreaterThan(0);
    }
  });
});
