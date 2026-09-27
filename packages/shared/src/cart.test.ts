import { describe, expect, it } from "vitest";

import { cartTotals, deliveryChargeFor } from "./cart";
import { DELIVERY_CHARGE_PAISE, FREE_DELIVERY_THRESHOLD_PAISE } from "./constants";

/**
 * These are the tests that pay for themselves.
 *
 * `cartTotals` is imported by both halves of the application: the front end
 * shows the number and the API charges it. It is pure, it takes two seconds to
 * test exhaustively, and getting it wrong means billing somebody an amount they
 * were never shown.
 */
describe("deliveryChargeFor", () => {
  it("charges delivery below the threshold", () => {
    expect(deliveryChargeFor(FREE_DELIVERY_THRESHOLD_PAISE - 1)).toBe(DELIVERY_CHARGE_PAISE);
  });

  it("is free exactly at the threshold", () => {
    // The boundary, not near it. "Over ₹500" and "₹500 or more" are different
    // promises, and this test is which one the shop made.
    expect(deliveryChargeFor(FREE_DELIVERY_THRESHOLD_PAISE)).toBe(0);
  });

  it("is free above the threshold", () => {
    expect(deliveryChargeFor(FREE_DELIVERY_THRESHOLD_PAISE + 1)).toBe(0);
  });

  it("charges nothing for an empty cart", () => {
    // Not the same as free delivery. Without this an empty cart shows "₹40
    // delivery", which looks like a bug because it is one.
    expect(deliveryChargeFor(0)).toBe(0);
  });
});

describe("cartTotals", () => {
  it("is empty for no lines", () => {
    expect(cartTotals([])).toEqual({
      subtotalPaise: 0,
      deliveryPaise: 0,
      totalPaise: 0,
      freeDeliveryShortfallPaise: null,
    });
  });

  it("adds the lines and the delivery charge", () => {
    const totals = cartTotals([{ linePaise: 9500 }, { linePaise: 9500 }]);

    expect(totals.subtotalPaise).toBe(19_000);
    expect(totals.deliveryPaise).toBe(DELIVERY_CHARGE_PAISE);
    expect(totals.totalPaise).toBe(19_000 + DELIVERY_CHARGE_PAISE);
  });

  it("reports how much more is needed for free delivery", () => {
    const totals = cartTotals([{ linePaise: 19_000 }]);
    expect(totals.freeDeliveryShortfallPaise).toBe(FREE_DELIVERY_THRESHOLD_PAISE - 19_000);
  });

  it("reports no shortfall once free delivery is reached", () => {
    const totals = cartTotals([{ linePaise: FREE_DELIVERY_THRESHOLD_PAISE }]);
    expect(totals.freeDeliveryShortfallPaise).toBeNull();
    expect(totals.totalPaise).toBe(FREE_DELIVERY_THRESHOLD_PAISE);
  });

  it("never reports a shortfall on an empty cart", () => {
    expect(cartTotals([]).freeDeliveryShortfallPaise).toBeNull();
  });

  it("stays exact across many lines", () => {
    // Integer paise, so a hundred lines of ₹95.17 is exactly ₹9,517 and not
    // 9516.999999999998. This is the test that fails the day somebody
    // "simplifies" the money representation to floats.
    const lines = Array.from({ length: 100 }, () => ({ linePaise: 9517 }));
    expect(cartTotals(lines).subtotalPaise).toBe(951_700);
  });
});
