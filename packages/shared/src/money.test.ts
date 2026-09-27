import { describe, expect, it } from "vitest";

import { formatPaise, rupeesToPaise } from "./money";
import { pricePerUnit } from "./catalogue";

describe("rupeesToPaise", () => {
  it("converts whole rupees", () => {
    expect(rupeesToPaise(285)).toBe(28_500);
  });

  it("rounds rather than truncating", () => {
    // 285.15 * 100 is 285.14999999999998 in a float. Math.floor would lose a
    // paisa on every sale, which is trivial until it is an audit question.
    expect(rupeesToPaise(285.15)).toBe(28_515);
    expect(rupeesToPaise(0.1 + 0.2)).toBe(30);
  });
});

describe("formatPaise", () => {
  it("uses Indian digit grouping", () => {
    // 12,34,567.89 — not 1,234,567.89. The one thing an Indian shop will
    // notice immediately if it is wrong.
    expect(formatPaise(123_456_789)).toContain("12,34,567.89");
  });

  it("always shows two decimal places", () => {
    expect(formatPaise(28_500)).toContain("285.00");
  });
});

describe("pricePerUnit", () => {
  it("scales grams to a kilogram", () => {
    expect(pricePerUnit({ pricePaise: 9500, quantity: 500, unit: "GRAM" }))
      .toEqual({ paise: 19_000, unit: "kg" });
  });

  it("scales millilitres to a litre", () => {
    expect(pricePerUnit({ pricePaise: 7500, quantity: 1000, unit: "MILLILITRE" }))
      .toEqual({ paise: 7500, unit: "L" });
  });

  it("returns null for a unit that cannot be compared", () => {
    expect(pricePerUnit({ pricePaise: 100, quantity: 1, unit: "PACKET" })).toBeNull();
  });

  it("returns null rather than dividing by zero", () => {
    expect(pricePerUnit({ pricePaise: 100, quantity: 0, unit: "GRAM" })).toBeNull();
  });
});
