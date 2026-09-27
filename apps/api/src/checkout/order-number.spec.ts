import { describe, expect, it } from "vitest";

import { generateOrderNumber } from "./order-number";

describe("generateOrderNumber", () => {
  it("carries the date so the shop can find it", () => {
    const number = generateOrderNumber(new Date(2026, 8, 27, 11, 0));
    expect(number.startsWith("KS-20260927-")).toBe(true);
  });

  it("avoids characters people misread down a phone line", () => {
    const suffixes = Array.from({ length: 200 }, () => generateOrderNumber().split("-")[2] ?? "");
    for (const suffix of suffixes) {
      expect(suffix).not.toMatch(/[IO01]/);
    }
  });

  it("does not repeat", () => {
    // Not sequential, deliberately: a counter is either a race or a lock, and
    // it leaks how much business the shop did between two orders.
    const numbers = new Set(Array.from({ length: 2000 }, () => generateOrderNumber()));
    expect(numbers.size).toBe(2000);
  });
});
